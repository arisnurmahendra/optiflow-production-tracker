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
    this.id = 'mock-spreadsheet-id-1234567890';
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

const properties = {};
const spreadsheet = new MockSpreadsheet();
let uuidCounter = 0;
const menuCalls = [];
const alerts = [];
const ui = {
  ButtonSet: { OK: 'OK' },
  createMenu(name) {
    const menu = {
      name,
      items: [],
      addItem(label, functionName) {
        this.items.push({ label, functionName });
        return this;
      },
      addSeparator() {
        this.items.push({ separator: true });
        return this;
      },
      addToUi() {
        menuCalls.push(this);
      },
    };
    return menu;
  },
  alert(title, message) {
    alerts.push({ title, message });
  },
};
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
        setProperty(key, value) {
          properties[key] = value;
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
    getUi() {
      return ui;
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
  'gas/spreadsheetMenu.gs',
  'gas/test_runner.gs',
  'Code.js',
];

for (const file of files) {
  vm.runInNewContext(await readFile(file, 'utf8'), context, { filename: file });
}

vm.runInNewContext('onOpen({})', context);
if (menuCalls.length !== 1 || menuCalls[0].name !== 'OPTIFLOW Admin') {
  throw new Error('Expected OPTIFLOW Admin spreadsheet menu.');
}

vm.runInNewContext('menuBootstrapSheets()', context);
if (spreadsheet.sheets.size !== context.OPTIFLOW_REQUIRED_SHEETS.length) {
  throw new Error('Expected menu bootstrap to create required sheets.');
}

vm.runInNewContext('menuSetDefaultScriptProperties()', context);
if (properties.AUTH_MODE !== 'OFF' || properties.SPREADSHEET_ID !== spreadsheet.id || !properties.ENCRYPTION_SALT) {
  throw new Error('Expected default Script Properties to be set when empty.');
}
const originalSalt = properties.ENCRYPTION_SALT;
vm.runInNewContext('menuSetDefaultScriptProperties()', context);
if (properties.ENCRYPTION_SALT !== originalSalt) {
  throw new Error('Expected default Script Properties to keep existing secrets.');
}

vm.runInNewContext('menuSeedDummyMasterData()', context);
const userRows = context.OptiflowSheets.getRows('USER_ROLES');
const permissionRows = context.OptiflowSheets.getRows('ROLE_PERMISSIONS');
if (!userRows.some((row) => row.email === 'superadmin@example.com')) {
  throw new Error('Expected dummy SuperAdmin user.');
}
if (!permissionRows.some((row) => row.permission_id === 'SuperAdmin.test_runner.run')) {
  throw new Error('Expected dummy test_runner permission.');
}

vm.runInNewContext('menuRunGasSmokeTest()', context);
if (!alerts.some((alert) => alert.title === 'GAS Smoke Test' && alert.message.includes('Status: PASS'))) {
  throw new Error('Expected menu smoke test PASS alert.');
}
if (JSON.stringify(alerts).includes(originalSalt)) {
  throw new Error('Spreadsheet menu alerts must not expose secret values.');
}

properties.AUTH_MODE = 'ON';
let rejected = false;
try {
  vm.runInNewContext('menuSeedDummyMasterData()', context);
} catch {
  rejected = true;
}
if (!rejected) {
  throw new Error('Expected dummy seed to be rejected when AUTH_MODE=ON.');
}

console.log('gas spreadsheet menu test ok');
