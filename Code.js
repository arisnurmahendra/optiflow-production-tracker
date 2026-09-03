/**
 * GAS entrypoint for OPTIFLOW.
 * Keep this file thin; business logic belongs in gas/*.gs modules.
 */

function doGet() {
  // Input Validation & Sanitization
  OptiflowValidation.assertDoGetEvent(arguments, 'doGet');

  var accessStatus = OptiflowAccessGate.isApplicationActive();

  if (!accessStatus.active) {
    return HtmlService.createHtmlOutput(OptiflowAccessGate.buildAccessDeniedHtml(accessStatus))
      .setTitle(OPTIFLOW_APP.name + ' - Akses Ditolak')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(OPTIFLOW_APP.name)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function onOpen(e) {
  // Input Validation & Sanitization
  OptiflowValidation.assertDoGetEvent(arguments, 'onOpen');

  return OptiflowSpreadsheetMenu.create();
}

function menuBootstrapSheets() {
  // Input Validation & Sanitization
  OptiflowValidation.assertNoInput(arguments, 'menuBootstrapSheets');

  return OptiflowSpreadsheetMenu.bootstrapSheetsFromMenu();
}

function menuSetDefaultScriptProperties() {
  // Input Validation & Sanitization
  OptiflowValidation.assertNoInput(arguments, 'menuSetDefaultScriptProperties');

  return OptiflowSpreadsheetMenu.setDefaultScriptPropertiesFromMenu();
}

function menuSeedDummyMasterData() {
  // Input Validation & Sanitization
  OptiflowValidation.assertNoInput(arguments, 'menuSeedDummyMasterData');

  return OptiflowSpreadsheetMenu.seedDummyMasterDataFromMenu();
}

function menuShowSchemaHealth() {
  // Input Validation & Sanitization
  OptiflowValidation.assertNoInput(arguments, 'menuShowSchemaHealth');

  return OptiflowSpreadsheetMenu.showSchemaHealthFromMenu();
}

function menuRunGasSmokeTest() {
  // Input Validation & Sanitization
  OptiflowValidation.assertNoInput(arguments, 'menuRunGasSmokeTest');

  return OptiflowSpreadsheetMenu.runGasSmokeTestFromMenu();
}

function getHealthCheck() {
  // Input Validation & Sanitization
  OptiflowValidation.assertNoInput(arguments, 'getHealthCheck');

  return OptiflowHealth.check();
}

function bootstrapSheets() {
  // Input Validation & Sanitization
  var payload = OptiflowValidation.validateOptionalSessionRequest(arguments, arguments[0], 'bootstrapSheets');

  if (OptiflowSheets.isFirstRunBootstrapRequired()) {
    return OptiflowSheets.bootstrap();
  }

  var session = OptiflowAuth.requireSession(payload, {
    resource: 'schema',
    action: 'bootstrap',
  });

  return OptiflowSheets.bootstrap();
}

function getSchemaHealthCheck() {
  // Input Validation & Sanitization
  var payload = OptiflowValidation.validateOptionalSessionRequest(arguments, arguments[0], 'getSchemaHealthCheck');
  var session = OptiflowAuth.requireSession(payload, {
    resource: 'schema',
    action: 'read_health',
  });

  return OptiflowSheets.healthCheck();
}

function getSessionContext(request) {
  // Input Validation & Sanitization
  var payload = OptiflowValidation.validateSessionContextRequest(arguments, request);
  return OptiflowAuth.getSessionContext(payload);
}

function checkPermission(request) {
  // Input Validation & Sanitization
  var payload = OptiflowValidation.validatePermissionCheckRequest(arguments, request);
  var session = OptiflowAuth.requireSession(payload.session || {});

  return OptiflowResponse.success({
    allowed: OptiflowPermissions.hasPermission(session, payload.resource, payload.action),
    resource: payload.resource,
    action: payload.action,
  });
}

function getScriptPropertiesStatus(request) {
  // Input Validation & Sanitization
  var payload = OptiflowValidation.validateScriptPropertiesStatusRequest(arguments, request);
  return OptiflowScriptProperties.getStatus(payload.session || {});
}

function setScriptProperty(request) {
  // Input Validation & Sanitization
  var payload = OptiflowValidation.validateScriptPropertyUpdateRequest(arguments, request);
  return OptiflowScriptProperties.setProperty(payload);
}

function deleteScriptProperty(request) {
  // Input Validation & Sanitization
  var payload = OptiflowValidation.validateScriptPropertyDeleteRequest(arguments, request);
  return OptiflowScriptProperties.deleteProperty(payload);
}

function rotateSecretProperty(request) {
  // Input Validation & Sanitization
  var payload = OptiflowValidation.validateSecretRotationRequest(arguments, request);
  return OptiflowScriptProperties.rotateSecret(payload);
}

function submitProductionReport(request) {
  // Input Validation & Sanitization
  var payload = OptiflowValidation.validateProductionReportSubmitRequest(arguments, request);
  var session = OptiflowAuth.requireSession(payload.session || {}, {
    resource: 'production_report',
    action: 'create',
  });

  return OptiflowProductionLogs.submit(payload, session);
}

function approveQuarantine(request) {
  // Input Validation & Sanitization
  var payload = OptiflowValidation.validateQuarantineDecisionRequest(arguments, request, 'approveQuarantine');
  var session = OptiflowAuth.requireSession(payload.session || {}, {
    resource: 'quarantine',
    action: 'approve',
  });

  return OptiflowQuarantine.approve(payload, session);
}

function rejectQuarantine(request) {
  // Input Validation & Sanitization
  var payload = OptiflowValidation.validateQuarantineDecisionRequest(arguments, request, 'rejectQuarantine');
  var session = OptiflowAuth.requireSession(payload.session || {}, {
    resource: 'quarantine',
    action: 'reject',
  });

  return OptiflowQuarantine.reject(payload, session);
}

function requestQuarantineCorrection(request) {
  // Input Validation & Sanitization
  var payload = OptiflowValidation.validateQuarantineDecisionRequest(arguments, request, 'requestQuarantineCorrection');
  var session = OptiflowAuth.requireSession(payload.session || {}, {
    resource: 'quarantine',
    action: 'request_correction',
  });

  return OptiflowQuarantine.requestCorrection(payload, session);
}

function closeDailyClosing(request) {
  // Input Validation & Sanitization
  var payload = OptiflowValidation.validateDailyClosingRequest(arguments, request, 'closeDailyClosing');
  var session = OptiflowAuth.requireSession(payload.session || {}, {
    resource: 'daily_closing',
    action: 'create',
  });

  return OptiflowDailyClosing.close(payload, session);
}

function reopenDailyClosing(request) {
  // Input Validation & Sanitization
  var payload = OptiflowValidation.validateDailyClosingRequest(arguments, request, 'reopenDailyClosing');
  var session = OptiflowAuth.requireSession(payload.session || {}, {
    resource: 'daily_closing',
    action: 'reopen',
  });

  return OptiflowDailyClosing.reopen(payload, session);
}

function createAdjustment(request) {
  // Input Validation & Sanitization
  var payload = OptiflowValidation.validateAdjustmentCreateRequest(arguments, request);
  var session = OptiflowAuth.requireSession(payload.session || {}, {
    resource: 'adjustment',
    action: 'create',
  });

  return OptiflowAdjustments.create(payload, session);
}

function approveAdjustment(request) {
  // Input Validation & Sanitization
  var payload = OptiflowValidation.validateAdjustmentDecisionRequest(arguments, request, 'approveAdjustment');
  var session = OptiflowAuth.requireSession(payload.session || {}, {
    resource: 'adjustment',
    action: 'approve',
  });

  return OptiflowAdjustments.approve(payload, session);
}

function rejectAdjustment(request) {
  // Input Validation & Sanitization
  var payload = OptiflowValidation.validateAdjustmentDecisionRequest(arguments, request, 'rejectAdjustment');
  var session = OptiflowAuth.requireSession(payload.session || {}, {
    resource: 'adjustment',
    action: 'reject',
  });

  return OptiflowAdjustments.reject(payload, session);
}

function runMasterRecap(request) {
  // Input Validation & Sanitization
  var payload = OptiflowValidation.validateRecapRunRequest(arguments, request);
  var session = OptiflowAuth.requireSession(payload.session || {}, {
    resource: 'dashboard',
    action: 'read',
  });

  return OptiflowRecap.run(payload, session);
}

function getSupervisorControlCenter(request) {
  // Input Validation & Sanitization
  var payload = OptiflowValidation.validateListRequest(arguments, request, 'getSupervisorControlCenter');
  var session = OptiflowAuth.requireSession(payload.session || {}, {
    resource: 'quarantine',
    action: 'read',
  });

  return OptiflowDashboard.getSupervisorControlCenter(payload, session);
}

function getManagementDashboard(request) {
  // Input Validation & Sanitization
  var payload = OptiflowValidation.validateListRequest(arguments, request, 'getManagementDashboard');
  var session = OptiflowAuth.requireSession(payload.session || {}, {
    resource: 'dashboard',
    action: 'read',
  });

  return OptiflowDashboard.getManagementDashboard(payload, session);
}

function runGasTestRunner(request) {
  // Input Validation & Sanitization
  var payload = OptiflowValidation.validateTestRunnerRequest(arguments, request);
  var session = OptiflowAuth.requireSession(payload.session || {}, {
    resource: 'test_runner',
    action: 'run',
  });

  return OptiflowTestRunner.run(payload, session);
}
