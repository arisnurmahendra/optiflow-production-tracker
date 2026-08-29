var OptiflowValidation = (function () {
  function assertNoInput(args, functionName) {
    if (args && args.length > 0) {
      throw new Error(functionName + ' does not accept external input.');
    }
  }

  function assertDoGetEvent(args, functionName) {
    if (!args || args.length === 0) {
      return;
    }

    if (args.length > 1 || typeof args[0] !== 'object' || args[0] === null) {
      throw new Error(functionName + ' received an invalid request event.');
    }
  }

  function validateSessionContextRequest(args, request) {
    if (!args || args.length === 0 || request === undefined || request === null) {
      return {};
    }

    if (args.length > 1 || typeof request !== 'object' || Array.isArray(request)) {
      throw new Error('Input Validation & Sanitization: getSessionContext expects one object payload.');
    }

    var allowedKeys = ['simulated_role'];
    Object.keys(request).forEach(function (key) {
      if (allowedKeys.indexOf(key) === -1) {
        throw new Error('Input Validation & Sanitization: unsupported session field ' + key + '.');
      }
    });

    if (request.simulated_role === undefined || request.simulated_role === '') {
      return {};
    }

    if (typeof request.simulated_role !== 'string') {
      throw new Error('Input Validation & Sanitization: simulated_role must be a string.');
    }

    if (OPTIFLOW_ROLES.indexOf(request.simulated_role) === -1) {
      throw new Error('Input Validation & Sanitization: simulated_role is not allowed.');
    }

    return {
      simulated_role: request.simulated_role,
    };
  }

  return Object.freeze({
    assertNoInput: assertNoInput,
    assertDoGetEvent: assertDoGetEvent,
    validateSessionContextRequest: validateSessionContextRequest,
  });
})();
