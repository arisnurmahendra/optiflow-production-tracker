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
      return '00000000-0000-4000-8000-000000000001';
    },
  },
  PropertiesService: {
    getScriptProperties() {
      return {
        getProperty() {
          return '';
        },
      };
    },
  },
  SpreadsheetApp: {
    getActiveSpreadsheet() {
      return spreadsheet;
    },
    openById() {
      throw new Error('openById should not be called in this test.');
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
  'gas/health.gs',
  'Code.js',
];

for (const file of files) {
  vm.runInNewContext(await readFile(file, 'utf8'), context, { filename: file });
}

const bootstrap = vm.runInNewContext('bootstrapSheets()', context);

if (!bootstrap.ok) {
  throw new Error('Expected bootstrap response to be ok.');
}

if (bootstrap.data.created_sheets.length !== context.OPTIFLOW_REQUIRED_SHEETS.length) {
  throw new Error('Expected bootstrap to create every required sheet.');
}

if (!bootstrap.data.schema_health.valid) {
  throw new Error('Expected schema health to be valid after bootstrap.');
}

const defectCategories = spreadsheet.getSheetByName('DEFECT_CATEGORIES');
if (defectCategories.getLastRow() < 2) {
  throw new Error('Expected bootstrap to seed default defect categories.');
}

let rejected = false;
try {
  vm.runInNewContext('bootstrapSheets()', context);
} catch (error) {
  rejected = error.message.includes('Invalid AUTH_MODE configuration');
}

if (!rejected) {
  throw new Error('Expected bootstrapSheets to require auth after foundational sheets exist.');
}

const rawLogs = spreadsheet.getSheetByName('RAW_LOGS');
rawLogs.rows[0] = rawLogs.rows[0].filter((header) => header !== 'status');

const unhealthy = vm.runInNewContext('OptiflowSheets.healthCheck()', context);
const rawLogReport = unhealthy.data.sheets.find((sheet) => sheet.sheet === 'RAW_LOGS');

if (unhealthy.data.valid) {
  throw new Error('Expected schema health to fail after removing RAW_LOGS.status.');
}

if (!rawLogReport.missing_columns.includes('status')) {
  throw new Error('Expected missing RAW_LOGS.status to be reported.');
}

console.log('gas sheets test ok');
