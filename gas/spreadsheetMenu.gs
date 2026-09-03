var OptiflowSpreadsheetMenu = (function () {
  var MENU_NAME = 'OPTIFLOW Admin';
  var PROJECT_LINKS = Object.freeze([
    Object.freeze({
      label: 'Apps Script Editor',
      url: 'https://script.google.com/u/0/home/projects/1tv9YkWU-SWTiw3KzPUOVqjK1L68W9ob0A1gvYYXkWcQC17R8L4XWwa7l/edit',
    }),
    Object.freeze({
      label: 'Web App Dev',
      url: 'https://script.google.com/macros/s/AKfycbyq5h4KBnxYJGxO6F9UUti4acnFpqtU-MtMBGaka1vb/dev',
    }),
    Object.freeze({
      label: 'Web App Production',
      url: 'https://script.google.com/macros/s/AKfycbwk-VdN6Gjxq0CMtT54dOgCCH332JSJphUOxPv8e_BbSrIJKjnOF6iqHbVR1wTIgLqWNw/exec',
    }),
    Object.freeze({
      label: 'Project Drive Folder',
      url: 'https://drive.google.com/drive/folders/1goa87UE15QYwC4pkeAeTsc33EjQdnF6N',
    }),
  ]);

  function create() {
    try {
      SpreadsheetApp.getUi()
        .createMenu(MENU_NAME)
        .addItem('Bootstrap Sheets', 'menuBootstrapSheets')
        .addItem('Set Default Script Properties', 'menuSetDefaultScriptProperties')
        .addSeparator()
        .addItem('Seed Dummy Master Data (Dev Only)', 'menuSeedDummyMasterData')
        .addSeparator()
        .addItem('Show Schema Health', 'menuShowSchemaHealth')
        .addItem('Run GAS Smoke Test', 'menuRunGasSmokeTest')
        .addSeparator()
        .addItem('Open Project Links', 'menuOpenProjectLinks')
        .addToUi();
    } catch (error) {
      console.warn('OPTIFLOW menu creation failed: ' + sanitizeMessage(error));
    }
  }

  function bootstrapSheetsFromMenu() {
    var response = OptiflowSheets.bootstrap();
    showAlert('Bootstrap Sheets', [
      'Status: OK',
      'Created sheets: ' + response.data.created_sheets.length,
      'Initialized headers: ' + response.data.initialized_headers.length,
      'Schema valid: ' + String(response.data.schema_health.valid).toUpperCase(),
    ].join('\n'));
    return response;
  }

  function setDefaultScriptPropertiesFromMenu() {
    var properties = PropertiesService.getScriptProperties();
    var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var defaults = {
      AUTH_MODE: 'OFF',
      APP_ACTIVE_UNTIL: buildDefaultActiveUntil(),
      ENCRYPTION_SALT: Utilities.getUuid() + '-' + Utilities.getUuid(),
    };
    var changed = [];
    var kept = [];

    if (activeSpreadsheet) {
      defaults.SPREADSHEET_ID = activeSpreadsheet.getId();
    }

    Object.keys(defaults).forEach(function (key) {
      if (properties.getProperty(key)) {
        kept.push(key);
        return;
      }

      properties.setProperty(key, defaults[key]);
      changed.push(key);
    });

    showAlert('Default Script Properties', [
      'Updated empty keys: ' + (changed.length ? changed.join(', ') : 'none'),
      'Kept existing keys: ' + (kept.length ? kept.join(', ') : 'none'),
      'Secrets were not displayed.',
    ].join('\n'));

    return OptiflowResponse.success({
      updated_keys: changed,
      kept_existing_keys: kept,
    });
  }

  function seedDummyMasterDataFromMenu() {
    var authMode = String(PropertiesService.getScriptProperties().getProperty('AUTH_MODE') || '').trim().toUpperCase();

    if (authMode === OPTIFLOW_AUTH_MODES.ON) {
      showAlert('Seed Dummy Master Data', 'Ditolak: AUTH_MODE=ON. Dummy data hanya untuk development/staging.');
      throw new Error('Dummy master data is not allowed when AUTH_MODE=ON.');
    }

    OptiflowSheets.bootstrap();

    var inserted = []
      .concat(seedUserRoles())
      .concat(seedRolePermissions())
      .concat(seedLineMaster())
      .concat(seedShiftMaster());

    showAlert('Seed Dummy Master Data', [
      'Inserted rows: ' + inserted.length,
      inserted.length ? inserted.join('\n') : 'All dummy master data already exists.',
    ].join('\n'));

    return OptiflowResponse.success({
      inserted: inserted,
    });
  }

  function showSchemaHealthFromMenu() {
    var response = OptiflowSheets.healthCheck();
    var health = response.data;

    showAlert('Schema Health', [
      'Valid: ' + String(health.valid).toUpperCase(),
      'Missing sheets: ' + (health.missing_sheets.length ? health.missing_sheets.join(', ') : 'none'),
      'Invalid sheets: ' + (health.invalid_sheets.length ? health.invalid_sheets.join(', ') : 'none'),
      'RAW_LOGS formula count: ' + health.raw_logs_formula_count,
    ].join('\n'));

    return response;
  }

  function runGasSmokeTestFromMenu() {
    var session = {
      auth_mode: 'MENU',
      email: Session.getActiveUser().getEmail() || 'menu.user@optiflow.local',
      role: 'SuperAdmin',
      user_id: 'MENU-SUPERADMIN',
      is_simulated: false,
      requires_role_selection: false,
    };
    var response = OptiflowTestRunner.run({ mode: 'SMOKE' }, session);
    var summary = response.data.summary;

    showAlert('GAS Smoke Test', [
      'Status: ' + response.data.status,
      'Passed: ' + summary.passed + '/' + summary.total,
      'Failed: ' + summary.failed,
      'Secrets were not displayed.',
    ].join('\n'));

    return response;
  }

  function openProjectLinksFromMenu() {
    var html = HtmlService
      .createHtmlOutput(buildProjectLinksHtml())
      .setWidth(420)
      .setHeight(360);

    SpreadsheetApp.getUi().showModalDialog(html, 'OPTIFLOW Project Links');

    return OptiflowResponse.success({
      link_count: PROJECT_LINKS.length,
    });
  }

  function seedUserRoles() {
    return appendMissingRecords('USER_ROLES', 'email', [
      {
        user_id: 'DEV-Operator',
        email: 'operator@example.com',
        role: 'Operator',
        nama_lengkap_encrypted: '',
        nomor_telepon_encrypted: '',
        phone_blind_index: '',
        status_aktif: true,
        is_deleted: false,
        deleted_at: '',
        last_login: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        user_id: 'DEV-Mandor',
        email: 'mandor@example.com',
        role: 'Mandor',
        nama_lengkap_encrypted: '',
        nomor_telepon_encrypted: '',
        phone_blind_index: '',
        status_aktif: true,
        is_deleted: false,
        deleted_at: '',
        last_login: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        user_id: 'DEV-Management',
        email: 'management@example.com',
        role: 'Management',
        nama_lengkap_encrypted: '',
        nomor_telepon_encrypted: '',
        phone_blind_index: '',
        status_aktif: true,
        is_deleted: false,
        deleted_at: '',
        last_login: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        user_id: 'DEV-SuperAdmin',
        email: 'superadmin@example.com',
        role: 'SuperAdmin',
        nama_lengkap_encrypted: '',
        nomor_telepon_encrypted: '',
        phone_blind_index: '',
        status_aktif: true,
        is_deleted: false,
        deleted_at: '',
        last_login: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
  }

  function seedRolePermissions() {
    var records = [];
    var rolePermissions = {
      Operator: {
        production_report: ['create'],
      },
      Mandor: {
        production_report: ['create', 'read'],
        quarantine: ['read', 'approve', 'reject', 'request_correction'],
        daily_closing: ['create', 'read', 'reopen'],
        adjustment: ['create', 'read', 'approve', 'reject'],
        dashboard: ['read'],
      },
      Management: {
        dashboard: ['read'],
      },
      SuperAdmin: OPTIFLOW_PERMISSION_CATALOG,
    };

    Object.keys(rolePermissions).forEach(function (role) {
      Object.keys(rolePermissions[role]).forEach(function (resource) {
        rolePermissions[role][resource].forEach(function (action) {
          records.push({
            permission_id: role + '.' + resource + '.' + action,
            role: role,
            resource: resource,
            action: action,
            is_allowed: true,
            updated_at: new Date().toISOString(),
          });
        });
      });
    });

    return appendMissingRecords('ROLE_PERMISSIONS', 'permission_id', records);
  }

  function seedLineMaster() {
    return appendMissingRecords('LINE_MASTER', 'line_id', [
      {
        line_id: 'SMT-02',
        line_name: 'SMT Line 02',
        area: 'Production',
        mandor_email: 'mandor@example.com',
        status_aktif: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
  }

  function seedShiftMaster() {
    return appendMissingRecords('SHIFT_MASTER', 'shift_id', [
      {
        shift_id: 'SHIFT-1',
        shift_name: 'Shift 1',
        start_time: '07:00',
        end_time: '15:00',
        timezone: OPTIFLOW_APP.timezone,
        status_aktif: true,
        updated_at: new Date().toISOString(),
      },
    ]);
  }

  function appendMissingRecords(sheetName, keyField, records) {
    var existingKeys = OptiflowSheets.getRows(sheetName).reduce(function (index, row) {
      index[String(row[keyField] || '').toLowerCase()] = true;
      return index;
    }, {});
    var inserted = [];

    records.forEach(function (record) {
      var key = String(record[keyField] || '').toLowerCase();
      if (existingKeys[key]) {
        return;
      }

      OptiflowSheets.appendRecord(sheetName, record);
      inserted.push(sheetName + ':' + record[keyField]);
      existingKeys[key] = true;
    });

    return inserted;
  }

  function buildDefaultActiveUntil() {
    var date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return Utilities.formatDate(date, OPTIFLOW_APP.timezone, 'yyyy-MM-dd');
  }

  function showAlert(title, message) {
    SpreadsheetApp.getUi().alert(title, message, SpreadsheetApp.getUi().ButtonSet.OK);
  }

  function buildProjectLinksHtml() {
    var links = PROJECT_LINKS.map(function (link) {
      return '<a class="link" href="' + escapeAttribute(link.url) + '" target="_blank" rel="noopener noreferrer">'
        + escapeHtml(link.label)
        + '</a>';
    }).join('');

    return '<!doctype html><html><head><base target="_blank"><style>'
      + 'body{font-family:Arial,sans-serif;margin:0;padding:18px;background:#f6f8fb;color:#18202f;}'
      + 'h1{font-size:18px;margin:0 0 12px;}'
      + 'p{font-size:12px;line-height:1.5;color:#5f6b7a;margin:0 0 14px;}'
      + '.link{display:block;margin:10px 0;padding:12px 14px;border-radius:8px;background:#fff;color:#0b5cad;text-decoration:none;border:1px solid #d9e2ec;font-weight:700;}'
      + '.link:hover{background:#eef6ff;}'
      + '</style></head><body>'
      + '<h1>OPTIFLOW Project Links</h1>'
      + '<p>Shortcut allowlisted untuk admin proyek. Link terbuka di tab baru.</p>'
      + links
      + '</body></html>';
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  function sanitizeMessage(error) {
    return String(error && error.message ? error.message : 'Unknown error')
      .replace(/[^\s]+@[^\s]+/g, '[masked-email]')
      .slice(0, 160);
  }

  return Object.freeze({
    bootstrapSheetsFromMenu: bootstrapSheetsFromMenu,
    create: create,
    openProjectLinksFromMenu: openProjectLinksFromMenu,
    runGasSmokeTestFromMenu: runGasSmokeTestFromMenu,
    seedDummyMasterDataFromMenu: seedDummyMasterDataFromMenu,
    setDefaultScriptPropertiesFromMenu: setDefaultScriptPropertiesFromMenu,
    showSchemaHealthFromMenu: showSchemaHealthFromMenu,
  });
})();
