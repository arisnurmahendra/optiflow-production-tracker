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

  function validateOptionalSessionRequest(args, request, functionName) {
    if (!args || args.length === 0 || request === undefined || request === null) {
      return {};
    }

    if (args.length > 1 || typeof request !== 'object' || Array.isArray(request)) {
      throw new Error('Input Validation & Sanitization: ' + functionName + ' expects one optional object payload.');
    }

    var allowedKeys = ['simulated_role'];
    Object.keys(request).forEach(function (key) {
      if (allowedKeys.indexOf(key) === -1) {
        throw new Error('Input Validation & Sanitization: unsupported field ' + key + '.');
      }
    });

    return validateSessionContextRequest([request], request);
  }

  function validatePermissionCheckRequest(args, request) {
    if (!args || args.length !== 1 || typeof request !== 'object' || request === null || Array.isArray(request)) {
      throw new Error('Input Validation & Sanitization: checkPermission expects one object payload.');
    }

    var allowedKeys = ['session', 'resource', 'action'];
    Object.keys(request).forEach(function (key) {
      if (allowedKeys.indexOf(key) === -1) {
        throw new Error('Input Validation & Sanitization: unsupported permission field ' + key + '.');
      }
    });

    assertKnownPermission(request.resource, request.action);

    return {
      session: validateSessionContextRequest([request.session || {}], request.session || {}),
      resource: request.resource,
      action: request.action,
    };
  }

  function assertKnownPermission(resource, action) {
    if (typeof resource !== 'string' || typeof action !== 'string') {
      throw new Error('Input Validation & Sanitization: resource and action must be strings.');
    }

    if (!OPTIFLOW_PERMISSION_CATALOG[resource]) {
      throw new Error('Input Validation & Sanitization: unknown permission resource.');
    }

    if (OPTIFLOW_PERMISSION_CATALOG[resource].indexOf(action) === -1) {
      throw new Error('Input Validation & Sanitization: unknown permission action.');
    }
  }

  return Object.freeze({
    assertKnownPermission: assertKnownPermission,
    assertNoInput: assertNoInput,
    assertDoGetEvent: assertDoGetEvent,
    validateOptionalSessionRequest: validateOptionalSessionRequest,
    validatePermissionCheckRequest: validatePermissionCheckRequest,
    validateSessionContextRequest: validateSessionContextRequest,
  });
})();
