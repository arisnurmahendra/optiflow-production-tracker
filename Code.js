/**
 * GAS entrypoint for OPTIFLOW.
 * Keep this file thin; business logic belongs in gas/*.gs modules.
 */

function doGet() {
  // Input Validation & Sanitization
  OptiflowValidation.assertDoGetEvent(arguments, 'doGet');

  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(OPTIFLOW_APP.name)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getHealthCheck() {
  // Input Validation & Sanitization
  OptiflowValidation.assertNoInput(arguments, 'getHealthCheck');

  return OptiflowHealth.check();
}

function bootstrapSheets() {
  // Input Validation & Sanitization
  var payload = OptiflowValidation.validateOptionalSessionRequest(arguments, arguments[0], 'bootstrapSheets');
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
