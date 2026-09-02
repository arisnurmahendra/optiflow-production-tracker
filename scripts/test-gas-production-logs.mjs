import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

class MockRange {
  constructor(sheet, row, column, numRows, numColumns) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.numRows = numRows;
    this.numColumns = numColumns;
  }

  setValues(rows) {
    rows.forEach((rowValues, rowIndex) => {
      rowValues.forEach((value, columnIndex) => {
        this.sheet.setCell(this.row + rowIndex, this.column + columnIndex, value);
      });
    });
  }

  getValues() {
    return Array.from({ length: this.numRows }, (_, rowIndex) =>
      Array.from({ length: this.numColumns }, (_, columnIndex) =>
        this.sheet.getCell(this.row + rowIndex, this.column + columnIndex),
      ),
    );
  }
}

class MockSheet {
  constructor() {
    this.rows = [];
    this.formulas = [];
  }

  getLastRow() {
    return this.rows.length;
  }

  getLastColumn() {
    return this.rows.reduce((max, row) => Math.max(max, row.length), 0);
  }

  getRange(row, column, numRows, numColumns) {
    return new MockRange(this, row, column, numRows, numColumns);
  }

  getDataRange() {
    return {
      getFormulas: () => this.formulas,
    };
  }

  setFrozenRows() {}

  appendRow(row) {
    this.rows.push(row);
  }

  setCell(row, column, value) {
    while (this.rows.length < row) {
      this.rows.push([]);
    }
    this.rows[row - 1][column - 1] = value;
  }

  getCell(row, column) {
    return this.rows[row - 1]?.[column - 1] || '';
  }
}

class MockSpreadsheet {
  constructor() {
    this.id = 'mock-spreadsheet-id';
    this.sheets = new Map();
  }

  getId() {
    return this.id;
  }

  getSheetByName(name) {
    return this.sheets.get(name) || null;
  }

  insertSheet(name) {
    const sheet = new MockSheet();
    this.sheets.set(name, sheet);
    return sheet;
  }
}

const properties = { AUTH_MODE: 'OFF' };
const spreadsheet = new MockSpreadsheet();
let uuidCounter = 0;
const context = {
  console,
  Date,
  JSON,
  Math,
  Number,
  Object,
  String,
  Array,
  isFinite,
  isNaN,
  Utilities: {
    getUuid() {
      uuidCounter += 1;
      return `00000000-0000-4000-8000-${String(uuidCounter).padStart(12, '0')}`;
    },
    formatDate(date) {
      return date.toISOString().slice(0, 10);
    },
  },
  PropertiesService: {
    getScriptProperties() {
      return {
        getProperty(key) {
          return properties[key] || '';
        },
      };
    },
  },
  Session: {
    getActiveUser() {
      return {
        getEmail() {
          return 'operator@example.com';
        },
      };
    },
  },
  SpreadsheetApp: {
    getActiveSpreadsheet() {
      return spreadsheet;
    },
    openById() {
      return spreadsheet;
    },
  },
};

const files = [
  'gas/config.gs',
  'gas/response.gs',
  'gas/validation.gs',
  'gas/sheets.gs',
  'gas/audit.gs',
  'gas/permissions.gs',
  'gas/auth.gs',
  'gas/productionLogs.gs',
  'Code.js',
];

for (const file of files) {
  vm.runInNewContext(await readFile(file, 'utf8'), context, { filename: file });
}

vm.runInNewContext('OptiflowSheets.bootstrap()', context);

appendPermission('Operator', 'production_report', 'create', true);

const baseRequest = {
  session: { simulated_role: 'Operator' },
  metadata: {
    transaction_id: '550e8400-e29b-41d4-a716-446655440000',
    device_timestamp: '2026-08-29T22:42:48.000Z',
    sync_type: 'OFFLINE_QUEUE',
    operator_email: 'operator@example.com',
    client_version: 'v0.1.0',
  },
  payload: {
    line_id: 'SMT-02',
    shift_id: 'SHIFT-1',
    machine_id: 'SLD-14',
    target_harian: 1200,
    tandon: 80,
    perolehan_ok: 1164,
    perolehan_reject: 36,
    defect_category_id: 'DEF-SOLDER-THIN',
    defect_notes: 'Sampling akhir',
  },
};

const first = vm.runInNewContext(`submitProductionReport(${JSON.stringify(baseRequest)})`, context);

if (!first.ok || first.data.status !== 'ACCEPTED' || !first.data.appended) {
  throw new Error('Expected first production report to append as ACCEPTED.');
}

const rawLogs = spreadsheet.getSheetByName('RAW_LOGS');
if (rawLogs.getLastRow() !== 2) {
  throw new Error('Expected exactly one RAW_LOGS data row after first submit.');
}

const duplicate = vm.runInNewContext(`submitProductionReport(${JSON.stringify(baseRequest)})`, context);
if (!duplicate.data.duplicate || duplicate.data.appended) {
  throw new Error('Expected duplicate transaction_id to return idempotent response without append.');
}

if (rawLogs.getLastRow() !== 2) {
  throw new Error('Expected duplicate submit not to append another RAW_LOGS row.');
}

const conflictRequest = structuredClone(baseRequest);
conflictRequest.metadata.transaction_id = '550e8400-e29b-41d4-a716-446655440001';
conflictRequest.metadata.operator_email = 'other.operator@example.com';
conflictRequest.metadata.device_timestamp = '2026-08-29T22:47:48.000Z';

const conflict = vm.runInNewContext(`submitProductionReport(${JSON.stringify(conflictRequest)})`, context);
if (!conflict.ok || conflict.data.status !== 'CONFLICT_PENDING' || !conflict.data.quarantine_id) {
  throw new Error('Expected nearby machine/operator collision to become CONFLICT_PENDING.');
}

const quarantine = spreadsheet.getSheetByName('QUARANTINE');
if (quarantine.getLastRow() !== 2) {
  throw new Error('Expected conflict to create one QUARANTINE row.');
}

let rejected = false;
const invalidRequest = structuredClone(baseRequest);
invalidRequest.metadata.transaction_id = 'not-a-uuid';
try {
  vm.runInNewContext(`submitProductionReport(${JSON.stringify(invalidRequest)})`, context);
} catch {
  rejected = true;
}

if (!rejected) {
  throw new Error('Expected invalid transaction_id to be rejected before business logic.');
}

const auditLogs = spreadsheet.getSheetByName('AUDIT_LOGS');
const auditHeader = context.OPTIFLOW_SHEET_SCHEMAS.AUDIT_LOGS;
const actionIndex = auditHeader.indexOf('action');
const auditActions = auditLogs.rows.slice(1).map((row) => row[actionIndex]);

if (!auditActions.includes('PRODUCTION_REPORT_ACCEPTED')
  || !auditActions.includes('PRODUCTION_REPORT_DUPLICATE')
  || !auditActions.includes('PRODUCTION_REPORT_CONFLICT_PENDING')) {
  throw new Error('Expected accepted, duplicate, and conflict production audit events.');
}

console.log('gas production logs test ok');

function appendPermission(role, resource, action, isAllowed) {
  const permissions = spreadsheet.getSheetByName('ROLE_PERMISSIONS');
  const headers = context.OPTIFLOW_SHEET_SCHEMAS.ROLE_PERMISSIONS;
  permissions.appendRow(headers.map((header) => ({
    permission_id: `${role}-${resource}-${action}`,
    role,
    resource,
    action,
    is_allowed: isAllowed,
    updated_at: '2026-09-02T00:00:00.000Z',
  }[header] ?? '')));
}
