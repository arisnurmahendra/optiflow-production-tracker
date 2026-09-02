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

  clearContent() {}
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
    return { getFormulas: () => this.formulas };
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

const properties = {
  AUTH_MODE: 'OFF',
  APP_ACTIVE_UNTIL: '2099-12-31',
  ENCRYPTION_SALT: 'super-secret-salt',
};
const spreadsheet = new MockSpreadsheet();
let uuidCounter = 0;
const context = {
  console,
  Date,
  JSON,
  Math,
  Number,
  Object,
  RegExp,
  String,
  Array,
  isFinite,
  isNaN,
  globalThis: null,
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
      return { getEmail: () => 'superadmin@example.com' };
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
context.globalThis = context;

const files = [
  'gas/config.gs',
  'gas/response.gs',
  'gas/validation.gs',
  'gas/sheets.gs',
  'gas/audit.gs',
  'gas/permissions.gs',
  'gas/auth.gs',
  'gas/accessGate.gs',
  'gas/scriptProperties.gs',
  'gas/dailyClosing.gs',
  'gas/adjustments.gs',
  'gas/quarantine.gs',
  'gas/productionLogs.gs',
  'gas/recap.gs',
  'gas/dashboard.gs',
  'gas/test_runner.gs',
  'Code.js',
];

for (const file of files) {
  vm.runInNewContext(await readFile(file, 'utf8'), context, { filename: file });
}

vm.runInNewContext('OptiflowSheets.bootstrap()', context);

appendPermission('SuperAdmin', 'test_runner', 'run', true);

const result = vm.runInNewContext(
  "runGasTestRunner({ session: { simulated_role: 'SuperAdmin' }, mode: 'SMOKE' })",
  context,
);

if (!result.ok || result.data.status !== 'PASS' || result.data.summary.failed !== 0) {
  throw new Error('Expected GAS test runner to return PASS.');
}

if (JSON.stringify(result).includes('super-secret-salt')) {
  throw new Error('Test runner response must not expose secret values.');
}

let rejected = false;
try {
  vm.runInNewContext(
    "runGasTestRunner({ session: { simulated_role: 'Operator' }, mode: 'SMOKE' })",
    context,
  );
} catch {
  rejected = true;
}

if (!rejected) {
  throw new Error('Expected unauthorized test runner access to be rejected.');
}

rejected = false;
try {
  vm.runInNewContext(
    "runGasTestRunner({ session: { simulated_role: 'SuperAdmin' }, mode: 'FULL' })",
    context,
  );
} catch {
  rejected = true;
}

if (!rejected) {
  throw new Error('Expected unsupported test runner mode to be rejected.');
}

const auditLogs = spreadsheet.getSheetByName('AUDIT_LOGS').rows;
const auditHeader = context.OPTIFLOW_SHEET_SCHEMAS.AUDIT_LOGS;
const actionIndex = auditHeader.indexOf('action');
const auditActions = auditLogs.slice(1).map((row) => row[actionIndex]);

if (!auditActions.includes('TEST_RUNNER_EXECUTED')) {
  throw new Error('Expected TEST_RUNNER_EXECUTED audit event.');
}

console.log('gas test runner test ok');

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
