var OptiflowHealth = (function () {
  function check() {
    return OptiflowResponse.success({
      app: OPTIFLOW_APP.name,
      version: OPTIFLOW_APP.version,
      timezone: OPTIFLOW_APP.timezone,
      required_sheets: OPTIFLOW_REQUIRED_SHEETS,
      status: 'BOOTSTRAPPED',
    });
  }

  return Object.freeze({
    check: check,
  });
})();
