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

  clearContent() {
    for (let rowIndex = this.row; rowIndex < this.row + this.numRows; rowIndex += 1) {
      for (let columnIndex = this.column; columnIndex < this.column + this.numColumns; columnIndex += 1) {
        this.sheet.setCell(rowIndex, columnIndex, '');
      }
    }
    this.sheet.trimEmptyRows();
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

  trimEmptyRows() {
    while (this.rows.length > 1 && this.rows[this.rows.length - 1].every((value) => value === '' || value === undefined)) {
      this.rows.pop();
    }
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
      return { getEmail: () => 'mandor@example.com' };
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
  'gas/dailyClosing.gs',
  'gas/adjustments.gs',
  'gas/quarantine.gs',
  'gas/productionLogs.gs',
  'gas/recap.gs',
  'gas/dashboard.gs',
  'Code.js',
];

for (const file of files) {
  vm.runInNewContext(await readFile(file, 'utf8'), context, { filename: file });
}

vm.runInNewContext('OptiflowSheets.bootstrap()', context);

appendPermission('Operator', 'production_report', 'create', true);
appendPermission('Mandor', 'production_report', 'create', true);
appendPermission('Mandor', 'quarantine', 'read', true);
appendPermission('Mandor', 'quarantine', 'approve', true);
appendPermission('Mandor', 'quarantine', 'reject', true);
appendPermission('Mandor', 'quarantine', 'request_correction', true);
appendPermission('Mandor', 'daily_closing', 'create', true);
appendPermission('Mandor', 'daily_closing', 'reopen', true);
appendPermission('Mandor', 'adjustment', 'create', true);
appendPermission('Mandor', 'adjustment', 'approve', true);
appendPermission('Mandor', 'adjustment', 'reject', true);
appendPermission('Mandor', 'dashboard', 'read', true);
appendPermission('Management', 'dashboard', 'read', true);

const baseRequest = {
  session: { simulated_role: 'Operator' },
  metadata: {
    transaction_id: '550e8400-e29b-41d4-a716-446655440010',
    device_timestamp: '2026-09-02T01:00:00.000Z',
    sync_type: 'LIVE',
    operator_email: 'operator@example.com',
    client_version: 'v0.1.0',
  },
  payload: {
    line_id: 'SMT-02',
    shift_id: 'SHIFT-1',
    machine_id: 'SLD-14',
    target_harian: 1200,
    tandon: 80,
    perolehan_ok: 1160,
    perolehan_reject: 30,
    defect_category_id: 'DEF-SOLDER-THIN',
    defect_notes: 'Sampling akhir',
  },
};

const accepted = vm.runInNewContext(`submitProductionReport(${JSON.stringify(baseRequest)})`, context);
if (accepted.data.status !== 'ACCEPTED') {
  throw new Error('Expected first report accepted.');
}

const conflictRequest = structuredClone(baseRequest);
conflictRequest.metadata.transaction_id = '550e8400-e29b-41d4-a716-446655440011';
conflictRequest.metadata.operator_email = 'other@example.com';
conflictRequest.metadata.device_timestamp = '2026-09-02T01:04:00.000Z';
conflictRequest.payload.perolehan_ok = 900;
conflictRequest.payload.perolehan_reject = 20;

const conflict = vm.runInNewContext(`submitProductionReport(${JSON.stringify(conflictRequest)})`, context);
if (conflict.data.status !== 'CONFLICT_PENDING' || !conflict.data.quarantine_id) {
  throw new Error('Expected conflict report to enter quarantine.');
}

let rejected = false;
try {
  vm.runInNewContext(`closeDailyClosing(${JSON.stringify({
    session: { simulated_role: 'Mandor' },
    factory_date: '2026-09-02',
    line_id: 'SMT-02',
    shift_id: 'SHIFT-1',
    notes: 'Blocked close check',
  })})`, context);
} catch {
  rejected = true;
}

if (!rejected) {
  throw new Error('Expected closing to be blocked by pending quarantine.');
}

const approved = vm.runInNewContext(`approveQuarantine(${JSON.stringify({
  session: { simulated_role: 'Mandor' },
  quarantine_id: conflict.data.quarantine_id,
  notes: 'Valid conflict data approved.',
})})`, context);
if (approved.data.status !== 'APPROVED') {
  throw new Error('Expected quarantine approval.');
}

const closed = vm.runInNewContext(`closeDailyClosing(${JSON.stringify({
  session: { simulated_role: 'Mandor' },
  factory_date: '2026-09-02',
  line_id: 'SMT-02',
  shift_id: 'SHIFT-1',
  notes: 'Daily check complete',
})})`, context);
if (closed.data.status !== 'CLOSED') {
  throw new Error('Expected daily closing status CLOSED.');
}

rejected = false;
const lateRequest = structuredClone(baseRequest);
lateRequest.metadata.transaction_id = '550e8400-e29b-41d4-a716-446655440012';
try {
  vm.runInNewContext(`submitProductionReport(${JSON.stringify(lateRequest)})`, context);
} catch {
  rejected = true;
}

if (!rejected) {
  throw new Error('Expected submit after closing to be rejected.');
}

const adjustment = vm.runInNewContext(`createAdjustment(${JSON.stringify({
  session: { simulated_role: 'Mandor' },
  source_transaction_id: baseRequest.metadata.transaction_id,
  adjustment_type: 'POST_CLOSING_ADJUSTMENT',
  delta: { perolehan_ok: 5, perolehan_reject: 0 },
  reason: 'Post closing recount',
})})`, context);
if (adjustment.data.status !== 'PENDING') {
  throw new Error('Expected adjustment PENDING.');
}

const approvedAdjustment = vm.runInNewContext(`approveAdjustment(${JSON.stringify({
  session: { simulated_role: 'Mandor' },
  adjustment_id: adjustment.data.adjustment_id,
  notes: 'Approved recount',
})})`, context);
if (approvedAdjustment.data.status !== 'APPROVED') {
  throw new Error('Expected adjustment APPROVED.');
}

const recapRequest = {
  session: { simulated_role: 'Management' },
  filter: { factory_date: '2026-09-02', line_id: 'SMT-02', shift_id: 'SHIFT-1' },
  page: 1,
  page_size: 10,
};
const recap = vm.runInNewContext(`runMasterRecap(${JSON.stringify(recapRequest)})`, context);
const recapAgain = vm.runInNewContext(`runMasterRecap(${JSON.stringify(recapRequest)})`, context);
if (recap.data.rows_written !== 2 || recapAgain.data.rows_written !== 2) {
  throw new Error('Expected idempotent recap to write two grouped rows.');
}

const dashboard = vm.runInNewContext(`getManagementDashboard(${JSON.stringify(recapRequest)})`, context);
if (dashboard.data.summary.ok_total !== 2065 || dashboard.data.summary.reject_total !== 50 || dashboard.data.rows.total !== 2) {
  throw new Error('Expected management dashboard to read clean MASTER_RECAP totals only.');
}

const supervisor = vm.runInNewContext(`getSupervisorControlCenter(${JSON.stringify({
  session: { simulated_role: 'Mandor' },
  filter: { factory_date: '2026-09-02', line_id: 'SMT-02', shift_id: 'SHIFT-1' },
  page: 1,
  page_size: 10,
})})`, context);
if (supervisor.data.summary.closed_scopes !== 1 || supervisor.data.summary.pending_adjustments !== 0) {
  throw new Error('Expected supervisor control center summary to include closing and adjustment state.');
}

console.log('gas M5 workflows test ok');

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
