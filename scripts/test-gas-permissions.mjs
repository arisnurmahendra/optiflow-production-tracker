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
    const sheet = new MockSheet(name);
    this.sheets.set(name, sheet);
    return sheet;
  }
}

const properties = { AUTH_MODE: 'OFF' };
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
          return 'superadmin@example.com';
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
  'gas/health.gs',
];

for (const file of files) {
  vm.runInNewContext(await readFile(file, 'utf8'), context, { filename: file });
}

vm.runInNewContext('OptiflowSheets.bootstrap()', context);

function appendPermission(role, resource, action, isAllowed) {
  const permissions = spreadsheet.getSheetByName('ROLE_PERMISSIONS');
  const headers = context.OPTIFLOW_SHEET_SCHEMAS.ROLE_PERMISSIONS;
  permissions.appendRow(headers.map((header) => ({
    permission_id: `${role}-${resource}-${action}`,
    role,
    resource,
    action,
    is_allowed: isAllowed,
    updated_at: '2026-08-30T00:00:00.000Z',
  }[header] ?? '')));
}

let denied = false;
try {
  vm.runInNewContext(
    "OptiflowAuth.requireSession({ simulated_role: 'SuperAdmin' }, { resource: 'schema', action: 'bootstrap' })",
    context,
  );
} catch {
  denied = true;
}

if (!denied) {
  throw new Error('Expected missing SuperAdmin permission to be denied.');
}

appendPermission('SuperAdmin', 'schema', 'bootstrap', true);
appendPermission('Operator', 'schema', 'bootstrap', false);

const session = vm.runInNewContext(
  "OptiflowAuth.requireSession({ simulated_role: 'SuperAdmin' }, { resource: 'schema', action: 'bootstrap' })",
  context,
);

if (session.role !== 'SuperAdmin') {
  throw new Error('Expected explicit SuperAdmin permission to allow the session.');
}

const operatorAllowed = vm.runInNewContext(
  "OptiflowPermissions.hasPermission({ role: 'Operator' }, 'schema', 'bootstrap')",
  context,
);

if (operatorAllowed) {
  throw new Error('Expected explicit is_allowed=false to deny Operator permission.');
}

denied = false;
try {
  vm.runInNewContext(
    "OptiflowValidation.assertKnownPermission('unknown_resource', 'read')",
    context,
  );
} catch {
  denied = true;
}

if (!denied) {
  throw new Error('Expected unknown permission resource to be rejected.');
}

const auditLogs = spreadsheet.getSheetByName('AUDIT_LOGS').rows;
const auditHeader = context.OPTIFLOW_SHEET_SCHEMAS.AUDIT_LOGS;
const actionIndex = auditHeader.indexOf('action');
const auditActions = auditLogs.slice(1).map((row) => row[actionIndex]);

if (!auditActions.includes('RBAC_DENIED') || !auditActions.includes('RBAC_ALLOWED')) {
  throw new Error('Expected RBAC_DENIED and RBAC_ALLOWED audit events.');
}

console.log('gas permissions test ok');
