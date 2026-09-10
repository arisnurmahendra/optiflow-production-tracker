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
const dialogs = [];
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
  showModalDialog(html, title) {
    dialogs.push({ html, title });
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
  HtmlService: {
    createHtmlOutput(content) {
      return {
        content,
        width: 0,
        height: 0,
        setWidth(width) {
          this.width = width;
          return this;
        },
        setHeight(height) {
          this.height = height;
          return this;
        },
      };
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
  'gas/defectCategories.gs',
  'gas/hrd.gs',
  'gas/referenceData.gs',
  'gas/targetMaster.gs',
  'gas/spreadsheetMenu.gs',
  'gas/test_runner.gs',
  'Code.js',
];

for (const file of files) {
  vm.runInNewContext(await readFile(file, 'utf8'), context, { filename: file });
}

vm.runInNewContext('onOpen({})', context);
if (menuCalls.length !== 1 || menuCalls[0].name !== '⚙️ OPTIFLOW Admin') {
  throw new Error('Expected OPTIFLOW Admin spreadsheet menu.');
}
if (!menuCalls[0].items.some((item) => item.functionName === 'menuOpenProjectLinks')) {
  throw new Error('Expected project links menu item.');
}
if (!menuCalls[0].items.some((item) => item.functionName === 'menuSeedDefectCategories')) {
  throw new Error('Expected defect category seed menu item.');
}

vm.runInNewContext('menuBootstrapSheets()', context);
if (spreadsheet.sheets.size !== context.OPTIFLOW_REQUIRED_SHEETS.length) {
  throw new Error('Expected menu bootstrap to create required sheets.');
}
if (context.OptiflowSheets.getRows('USER_ROLES').length === 0
  || context.OptiflowSheets.getRows('ROLE_PERMISSIONS').length === 0
  || context.OptiflowSheets.getRows('LINE_MASTER').length === 0
  || context.OptiflowSheets.getRows('SHIFT_MASTER').length === 0
  || context.OptiflowSheets.getRows('TARGET_MASTER').length === 0) {
  throw new Error('Expected menu bootstrap to seed missing dummy master data when AUTH_MODE is not ON.');
}

vm.runInNewContext('menuSetDefaultScriptProperties()', context);
if (properties.AUTH_MODE !== 'OFF'
  || properties.REQUIRE_REGISTERED_EMAIL_LOGIN !== 'FALSE'
  || properties.SPREADSHEET_ID !== spreadsheet.id
  || !properties.ENCRYPTION_SALT) {
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
const hrdUser = userRows.find((row) => row.email === 'hrd@example.com');
if (!hrdUser
  || hrdUser.username !== 'hrd.demo'
  || !hrdUser.nama_lengkap_encrypted
  || !hrdUser.alamat_encrypted
  || !hrdUser.nomor_telepon_encrypted
  || !hrdUser.phone_blind_index
  || !String(hrdUser.profile_base64 || '').startsWith('data:image/svg+xml;base64,')) {
  throw new Error('Expected complete HRD dummy user seed with encrypted placeholders and profile base64.');
}
if (!permissionRows.some((row) => row.permission_id === 'SuperAdmin.test_runner.run')) {
  throw new Error('Expected dummy test_runner permission.');
}
if (!permissionRows.some((row) => row.permission_id === 'Operator.defect_category.read')) {
  throw new Error('Expected Operator defect category read permission.');
}
if (!permissionRows.some((row) => row.permission_id === 'Operator.reference_data.read')) {
  throw new Error('Expected Operator reference_data read permission.');
}
if (!permissionRows.some((row) => row.permission_id === 'HRD.user_role.read')
  || !permissionRows.some((row) => row.permission_id === 'HRD.audit_log.read')) {
  throw new Error('Expected HRD read-only user role and audit log permissions.');
}
if (!permissionRows.some((row) => row.permission_id === 'Operator.production_target.read')
  || !permissionRows.some((row) => row.permission_id === 'Mandor.production_target.bulk_update')
  || !permissionRows.some((row) => row.permission_id === 'Management.production_target.read')) {
  throw new Error('Expected role permissions for production target master.');
}

const shiftOptionsResponse = vm.runInNewContext("getShiftOptions({ session: { simulated_role: 'Operator' } })", context);
if (!shiftOptionsResponse.ok
  || !shiftOptionsResponse.data.shifts.some((shift) => shift.value === 'SHIFT-1' && shift.label === 'Shift 1')) {
  throw new Error('Expected getShiftOptions to return active SHIFT_MASTER options.');
}

const operatorReferencesResponse = vm.runInNewContext("getOperatorReferenceData({ session: { simulated_role: 'Operator' } })", context);
if (!operatorReferencesResponse.ok
  || !operatorReferencesResponse.data.lines.some((line) => line.value === 'SMT-02')
  || !operatorReferencesResponse.data.machines.some((machine) => machine.value === 'SLD-14')
  || !operatorReferencesResponse.data.operators.some((operator) => operator.value === 'operator@example.com')) {
  throw new Error('Expected getOperatorReferenceData to return line, machine, and operator options.');
}

const targetResponse = vm.runInNewContext(`getProductionTarget(${JSON.stringify({
  session: { simulated_role: 'Operator' },
  filter: {
    factory_date: '2026-09-03',
    line_id: 'SMT-02',
    shift_id: 'SHIFT-1',
    machine_id: 'SLD-14',
    operator_email: 'operator@example.com',
  },
})})`, context);
if (!targetResponse.ok || !targetResponse.data.active_target || targetResponse.data.active_target.target_harian !== 1200) {
  throw new Error('Expected seeded TARGET_MASTER row to resolve for Operator.');
}

const defectSheet = spreadsheet.getSheetByName('DEFECT_CATEGORIES');
defectSheet.rows = [defectSheet.rows[0]];
vm.runInNewContext('menuSeedDefectCategories()', context);
const defectRows = context.OptiflowSheets.getRows('DEFECT_CATEGORIES');
if (!defectRows.some((row) => row.defect_category_id === 'DEF-COLD-SOLDER')) {
  throw new Error('Expected defect category seed menu to insert default categories.');
}

const hrdDashboard = vm.runInNewContext("getHrdAccessDashboard({ session: { simulated_role: 'HRD' }, page: 1, page_size: 10 })", context);
if (!hrdDashboard.ok || hrdDashboard.data.summary.active_users <= 0) {
  throw new Error('Expected HRD access dashboard response.');
}
if (JSON.stringify(hrdDashboard.data).includes('operator@example.com')
  || JSON.stringify(hrdDashboard.data).includes('phone_blind_index')
  || JSON.stringify(hrdDashboard.data).includes('profile_base64')
  || JSON.stringify(hrdDashboard.data).includes('alamat_encrypted')) {
  throw new Error('Expected HRD dashboard to avoid raw PII fields.');
}

vm.runInNewContext('menuRunGasSmokeTest()', context);
if (!alerts.some((alert) => alert.title === 'GAS Smoke Test' && alert.message.includes('Status: PASS'))) {
  throw new Error('Expected menu smoke test PASS alert.');
}
if (JSON.stringify(alerts).includes(originalSalt)) {
  throw new Error('Spreadsheet menu alerts must not expose secret values.');
}

const linksResponse = vm.runInNewContext('menuOpenProjectLinks()', context);
if (!linksResponse.ok || linksResponse.data.link_count !== 4 || dialogs.length !== 1) {
  throw new Error('Expected project links dialog response.');
}
if (!dialogs[0].html.content.includes('Apps Script Editor')
  || !dialogs[0].html.content.includes('/dev')
  || !dialogs[0].html.content.includes('/exec')
  || !dialogs[0].html.content.includes('drive.google.com')) {
  throw new Error('Expected allowlisted project links in dialog HTML.');
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
