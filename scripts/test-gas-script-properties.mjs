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

const properties = {
  AUTH_MODE: 'OFF',
  SPREADSHEET_ID: '1abcDEFghiJKLmnopQRSTuvWXyz_12345',
  ENCRYPTION_SALT: 'super-secret-salt',
};
const spreadsheet = new MockSpreadsheet();
let uuidCounter = 0;

const context = {
  console,
  Date,
  JSON,
  Object,
  RegExp,
  String,
  Array,
  Utilities: {
    getUuid() {
      uuidCounter += 1;
      return `mock-uuid-${uuidCounter}`;
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
        deleteProperty(key) {
          delete properties[key];
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
  'gas/scriptProperties.gs',
  'Code.js',
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

['read_status', 'update', 'delete', 'rotate_secret'].forEach((action) => {
  appendPermission('SuperAdmin', 'script_property', action, true);
});
appendPermission('Operator', 'script_property', 'read_status', false);

const superAdminSession = { simulated_role: 'SuperAdmin' };

const status = vm.runInNewContext(
  'getScriptPropertiesStatus({ session: superAdminSession })',
  { ...context, superAdminSession },
);

const saltStatus = status.data.properties.find((property) => property.key === 'ENCRYPTION_SALT');
if (!saltStatus || saltStatus.status !== 'SET' || saltStatus.value_preview !== '') {
  throw new Error('Expected ENCRYPTION_SALT to be status-only and never returned raw.');
}

const authModeStatus = status.data.properties.find((property) => property.key === 'AUTH_MODE');
if (!authModeStatus || authModeStatus.value_preview !== 'OFF') {
  throw new Error('Expected AUTH_MODE to be readable as a non-secret config value.');
}

vm.runInNewContext(
  "setScriptProperty({ session: superAdminSession, key: 'AUTH_MODE', value: 'ON' })",
  { ...context, superAdminSession },
);
if (properties.AUTH_MODE !== 'ON') {
  throw new Error('Expected AUTH_MODE update to be accepted.');
}
properties.AUTH_MODE = 'OFF';

let rejected = false;
try {
  vm.runInNewContext(
    "setScriptProperty({ session: superAdminSession, key: 'ENCRYPTION_SALT', value: 'leak' })",
    { ...context, superAdminSession },
  );
} catch {
  rejected = true;
}
if (!rejected) {
  throw new Error('Expected direct ENCRYPTION_SALT update to be rejected.');
}

rejected = false;
try {
  vm.runInNewContext(
    "setScriptProperty({ session: superAdminSession, key: 'AUTH_MODE', value: 'MAYBE' })",
    { ...context, superAdminSession },
  );
} catch {
  rejected = true;
}
if (!rejected) {
  throw new Error('Expected invalid AUTH_MODE enum to be rejected.');
}

const rotation = vm.runInNewContext(
  "rotateSecretProperty({ session: superAdminSession, key: 'ENCRYPTION_SALT' })",
  { ...context, superAdminSession },
);
if (rotation.data.property.value_preview !== '' || !properties.ENCRYPTION_SALT.includes('mock-uuid')) {
  throw new Error('Expected secret rotation to return status only and write a new secret.');
}

vm.runInNewContext(
  "deleteScriptProperty({ session: superAdminSession, key: 'SPREADSHEET_ID' })",
  { ...context, superAdminSession },
);
if (properties.SPREADSHEET_ID) {
  throw new Error('Expected SPREADSHEET_ID delete to be allowed.');
}

rejected = false;
try {
  vm.runInNewContext(
    "deleteScriptProperty({ session: superAdminSession, key: 'AUTH_MODE' })",
    { ...context, superAdminSession },
  );
} catch {
  rejected = true;
}
if (!rejected) {
  throw new Error('Expected AUTH_MODE delete to be rejected.');
}

rejected = false;
try {
  vm.runInNewContext(
    "getScriptPropertiesStatus({ session: { simulated_role: 'Operator' } })",
    context,
  );
} catch {
  rejected = true;
}
if (!rejected) {
  throw new Error('Expected Operator to be denied by ROLE_PERMISSIONS.');
}

const auditLogs = spreadsheet.getSheetByName('AUDIT_LOGS').rows;
const auditHeader = context.OPTIFLOW_SHEET_SCHEMAS.AUDIT_LOGS;
const actionIndex = auditHeader.indexOf('action');
const auditActions = auditLogs.slice(1).map((row) => row[actionIndex]);
const expectedActions = [
  'SCRIPT_PROPERTY_STATUS_READ',
  'SCRIPT_PROPERTY_UPDATED',
  'SCRIPT_PROPERTY_SECRET_ROTATED',
  'SCRIPT_PROPERTY_DELETED',
];

for (const action of expectedActions) {
  if (!auditActions.includes(action)) {
    throw new Error(`Expected audit event ${action}.`);
  }
}

console.log('gas script properties test ok');
