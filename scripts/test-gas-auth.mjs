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
  constructor(name) {
    this.name = name;
    this.rows = [];
    this.formulas = [];
    this.frozenRows = 0;
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

  setFrozenRows(count) {
    this.frozenRows = count;
  }

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
    const sheet = new MockSheet(name);
    this.sheets.set(name, sheet);
    return sheet;
  }
}

const properties = { AUTH_MODE: 'OFF' };
let activeEmail = 'operator@example.com';
const spreadsheet = new MockSpreadsheet();

const context = {
  console,
  Date,
  JSON,
  Object,
  String,
  Array,
  Utilities: {
    getUuid() {
      return 'mock-uuid';
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
          return activeEmail;
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
  'gas/auth.gs',
  'gas/health.gs',
];

for (const file of files) {
  vm.runInNewContext(await readFile(file, 'utf8'), context, { filename: file });
}

vm.runInNewContext('OptiflowSheets.bootstrap()', context);

let response = vm.runInNewContext('OptiflowAuth.getSessionContext({})', context);

if (!response.data.requires_role_selection) {
  throw new Error('Expected AUTH_MODE=OFF without simulated_role to require role selection.');
}

response = vm.runInNewContext("OptiflowAuth.getSessionContext({ simulated_role: 'Mandor' })", context);

if (response.data.role !== 'Mandor' || !response.data.is_simulated) {
  throw new Error('Expected AUTH_MODE=OFF to return the simulated Mandor session.');
}

let rejected = false;
try {
  vm.runInNewContext("OptiflowValidation.validateSessionContextRequest([{ simulated_role: 'Owner' }], { simulated_role: 'Owner' })", context);
} catch {
  rejected = true;
}

if (!rejected) {
  throw new Error('Expected invalid simulated_role to be rejected.');
}

const userRoles = spreadsheet.getSheetByName('USER_ROLES');
const headers = context.OPTIFLOW_SHEET_SCHEMAS.USER_ROLES;
userRoles.appendRow(headers.map((header) => ({
  user_id: 'USR-001',
  email: 'operator@example.com',
  role: 'Operator',
  status_aktif: true,
  is_deleted: false,
  created_at: '2026-08-30T00:00:00.000Z',
  updated_at: '2026-08-30T00:00:00.000Z',
}[header] ?? '')));

properties.AUTH_MODE = 'ON';
response = vm.runInNewContext("OptiflowAuth.getSessionContext({ simulated_role: 'SuperAdmin' })", context);

if (response.data.role !== 'Operator' || response.data.is_simulated) {
  throw new Error('Expected AUTH_MODE=ON to ignore simulated_role and use USER_ROLES.');
}

activeEmail = 'inactive@example.com';
rejected = false;
try {
  vm.runInNewContext('OptiflowAuth.getSessionContext({})', context);
} catch {
  rejected = true;
}

if (!rejected) {
  throw new Error('Expected unregistered active Google user to be rejected.');
}

const auditLogs = spreadsheet.getSheetByName('AUDIT_LOGS');

if (auditLogs.getLastRow() < 2) {
  throw new Error('Expected session events to be written to AUDIT_LOGS.');
}

console.log('gas auth test ok');
