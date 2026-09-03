var OptiflowTestRunner = (function () {
  function run(payload, session) {
    var startedAt = new Date().toISOString();
    var tests = [
      runCheck('schema_health', testSchemaHealth),
      runCheck('rbac_catalog', testRbacCatalog),
      runCheck('validation_rejects_bad_payload', testValidationRejectsBadPayload),
      runCheck('required_modules', testRequiredModules),
      runCheck('script_properties_status_safe', testScriptPropertiesStatusSafe),
    ];
    var failed = tests.filter(function (test) { return test.status === 'FAIL'; });

    OptiflowAudit.write('TEST_RUNNER_EXECUTED', session, {
      total: tests.length,
      passed: tests.length - failed.length,
      failed: failed.length,
      mode: payload.mode,
    });

    return OptiflowResponse.success({
      status: failed.length === 0 ? 'PASS' : 'FAIL',
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      summary: {
        total: tests.length,
        passed: tests.length - failed.length,
        failed: failed.length,
      },
      tests: tests,
    });
  }

  function runCheck(name, checkFn) {
    try {
      checkFn();
      return {
        name: name,
        status: 'PASS',
        message: 'OK',
      };
    } catch (error) {
      return {
        name: name,
        status: 'FAIL',
        message: sanitizeMessage(error),
      };
    }
  }

  function testSchemaHealth() {
    var health = OptiflowSheets.healthCheck();
    if (!health.ok || !health.data.valid) {
      throw new Error('Schema health check failed.');
    }
  }

  function testRbacCatalog() {
    OptiflowValidation.assertKnownPermission('test_runner', 'run');
    OptiflowValidation.assertKnownPermission('dashboard', 'read');
  }

  function testValidationRejectsBadPayload() {
    var rejected = false;
    try {
      OptiflowValidation.validateProductionReportSubmitRequest([{
        payload: {},
      }], {
        payload: {},
      });
    } catch (error) {
      rejected = true;
    }

    if (!rejected) {
      throw new Error('Invalid production payload was accepted.');
    }
  }

  function testRequiredModules() {
    var requiredModules = [
      'OptiflowAccessGate',
      'OptiflowAdjustments',
      'OptiflowAudit',
      'OptiflowAuth',
      'OptiflowDailyClosing',
      'OptiflowDashboard',
      'OptiflowPermissions',
      'OptiflowProductionLogs',
      'OptiflowQuarantine',
      'OptiflowRecap',
      'OptiflowResponse',
      'OptiflowScriptProperties',
      'OptiflowSheets',
      'OptiflowSpreadsheetMenu',
      'OptiflowValidation',
    ];

    requiredModules.forEach(function (moduleName) {
      if (typeof globalThis[moduleName] !== 'object') {
        throw new Error('Required module is missing.');
      }
    });
  }

  function testScriptPropertiesStatusSafe() {
    var contract = OPTIFLOW_SCRIPT_PROPERTY_CONTRACT.ENCRYPTION_SALT;
    if (!contract || contract.readable !== false || contract.rotatable !== true) {
      throw new Error('Secret property contract is unsafe.');
    }
  }

  function sanitizeMessage(error) {
    return String(error && error.message ? error.message : 'Unknown failure')
      .replace(/[^\s]+@[^\s]+/g, '[masked-email]')
      .slice(0, 160);
  }

  return Object.freeze({
    run: run,
  });
})();
