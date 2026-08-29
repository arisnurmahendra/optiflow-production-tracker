/**
 * GAS entrypoint for OPTIFLOW.
 * Keep this file thin; business logic belongs in gas/*.gs modules.
 */

function doGet() {
  OptiflowValidation.assertDoGetEvent(arguments, 'doGet');

  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(OPTIFLOW_APP.name)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getHealthCheck() {
  OptiflowValidation.assertNoInput(arguments, 'getHealthCheck');

  return OptiflowHealth.check();
}

function bootstrapSheets() {
  OptiflowValidation.assertNoInput(arguments, 'bootstrapSheets');
  return OptiflowSheets.bootstrap();
}

function getSchemaHealthCheck() {
  OptiflowValidation.assertNoInput(arguments, 'getSchemaHealthCheck');
  return OptiflowSheets.healthCheck();
}
