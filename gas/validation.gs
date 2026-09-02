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

  function validateScriptPropertiesStatusRequest(args, request) {
    var payload = validateRequestObject(args, request, 'getScriptPropertiesStatus', ['session'], true);

    return {
      session: validateSessionContextRequest([payload.session || {}], payload.session || {}),
    };
  }

  function validateScriptPropertyUpdateRequest(args, request) {
    var payload = validateRequestObject(args, request, 'setScriptProperty', ['session', 'key', 'value'], false);
    var key = validateScriptPropertyKey(payload.key);
    var contract = OPTIFLOW_SCRIPT_PROPERTY_CONTRACT[key];

    if (!contract.updatable) {
      throw new Error('Input Validation & Sanitization: script property is not updatable through this endpoint.');
    }

    if (typeof payload.value !== 'string') {
      throw new Error('Input Validation & Sanitization: script property value must be a string.');
    }

    var value = payload.value.trim();

    if (key === 'AUTH_MODE' && contract.allowed_values.indexOf(value.toUpperCase()) === -1) {
      throw new Error('Input Validation & Sanitization: AUTH_MODE must be ON or OFF.');
    }

    if (key === 'SPREADSHEET_ID' && !new RegExp(contract.pattern).test(value)) {
      throw new Error('Input Validation & Sanitization: SPREADSHEET_ID format is invalid.');
    }

    if (key === 'APP_ACTIVE_UNTIL' && !new RegExp(contract.pattern).test(value)) {
      throw new Error('Input Validation & Sanitization: APP_ACTIVE_UNTIL must use YYYY-MM-DD format.');
    }

    return {
      session: validateSessionContextRequest([payload.session || {}], payload.session || {}),
      key: key,
      value: key === 'AUTH_MODE' ? value.toUpperCase() : value,
    };
  }

  function validateScriptPropertyDeleteRequest(args, request) {
    var payload = validateRequestObject(args, request, 'deleteScriptProperty', ['session', 'key'], false);
    var key = validateScriptPropertyKey(payload.key);

    if (!OPTIFLOW_SCRIPT_PROPERTY_CONTRACT[key].deletable) {
      throw new Error('Input Validation & Sanitization: script property is not deletable through this endpoint.');
    }

    return {
      session: validateSessionContextRequest([payload.session || {}], payload.session || {}),
      key: key,
    };
  }

  function validateSecretRotationRequest(args, request) {
    var payload = validateRequestObject(args, request, 'rotateSecretProperty', ['session', 'key'], false);
    var key = validateScriptPropertyKey(payload.key);

    if (!OPTIFLOW_SCRIPT_PROPERTY_CONTRACT[key].rotatable) {
      throw new Error('Input Validation & Sanitization: script property is not rotatable through this endpoint.');
    }

    return {
      session: validateSessionContextRequest([payload.session || {}], payload.session || {}),
      key: key,
    };
  }

  function validateProductionReportSubmitRequest(args, request) {
    var payload = validateRequestObject(args, request, 'submitProductionReport', ['session', 'metadata', 'payload'], false);
    var metadata = validateRequestObject([payload.metadata], payload.metadata, 'submitProductionReport.metadata', [
      'transaction_id',
      'device_timestamp',
      'sync_type',
      'operator_email',
      'client_version',
    ], false);
    var report = validateRequestObject([payload.payload], payload.payload, 'submitProductionReport.payload', [
      'line_id',
      'shift_id',
      'machine_id',
      'target_harian',
      'tandon',
      'perolehan_ok',
      'perolehan_reject',
      'defect_category_id',
      'defect_notes',
    ], false);

    var normalizedReport = {
      line_id: normalizeIdentifier(report.line_id, 'line_id'),
      shift_id: normalizeIdentifier(report.shift_id, 'shift_id'),
      machine_id: normalizeIdentifier(report.machine_id, 'machine_id'),
      target_harian: normalizeInteger(report.target_harian, 'target_harian'),
      tandon: normalizeInteger(report.tandon, 'tandon'),
      perolehan_ok: normalizeInteger(report.perolehan_ok, 'perolehan_ok'),
      perolehan_reject: normalizeInteger(report.perolehan_reject, 'perolehan_reject'),
      defect_category_id: normalizeOptionalIdentifier(report.defect_category_id, 'defect_category_id'),
      defect_notes: normalizeFreeText(report.defect_notes, 'defect_notes', OPTIFLOW_PRODUCTION_LOGS.max_defect_notes_length),
    };

    if (normalizedReport.perolehan_reject > 0 && !normalizedReport.defect_category_id) {
      throw new Error('Input Validation & Sanitization: defect_category_id is required when perolehan_reject is greater than zero.');
    }

    if (normalizedReport.perolehan_ok + normalizedReport.perolehan_reject > normalizedReport.target_harian + normalizedReport.tandon) {
      throw new Error('Input Validation & Sanitization: perolehan_ok + perolehan_reject must not exceed target_harian + tandon.');
    }

    return {
      session: validateSessionContextRequest([payload.session || {}], payload.session || {}),
      metadata: {
        transaction_id: normalizeUuid(metadata.transaction_id, 'transaction_id'),
        device_timestamp: normalizeUtcTimestamp(metadata.device_timestamp, 'device_timestamp'),
        sync_type: normalizeEnum(metadata.sync_type, 'sync_type', ['LIVE', 'OFFLINE_QUEUE']),
        operator_email: normalizeEmail(metadata.operator_email, 'operator_email'),
        client_version: normalizeClientVersion(metadata.client_version),
      },
      payload: normalizedReport,
    };
  }

  function validateRequestObject(args, request, functionName, allowedKeys, allowMissing) {
    if ((!args || args.length === 0 || request === undefined || request === null) && allowMissing) {
      return {};
    }

    if (!args || args.length !== 1 || typeof request !== 'object' || request === null || Array.isArray(request)) {
      throw new Error('Input Validation & Sanitization: ' + functionName + ' expects one object payload.');
    }

    Object.keys(request).forEach(function (key) {
      if (allowedKeys.indexOf(key) === -1) {
        throw new Error('Input Validation & Sanitization: unsupported field ' + key + '.');
      }
    });

    return request;
  }

  function validateScriptPropertyKey(key) {
    if (typeof key !== 'string') {
      throw new Error('Input Validation & Sanitization: script property key must be a string.');
    }

    var normalizedKey = key.trim().toUpperCase();

    if (!OPTIFLOW_SCRIPT_PROPERTY_CONTRACT[normalizedKey]) {
      throw new Error('Input Validation & Sanitization: script property key is not allowlisted.');
    }

    return normalizedKey;
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

  function normalizeUuid(value, fieldName) {
    if (typeof value !== 'string') {
      throw new Error('Input Validation & Sanitization: ' + fieldName + ' must be a UUID string.');
    }

    var normalized = value.trim().toLowerCase();

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(normalized)) {
      throw new Error('Input Validation & Sanitization: ' + fieldName + ' must be a valid UUID.');
    }

    return normalized;
  }

  function normalizeUtcTimestamp(value, fieldName) {
    if (typeof value !== 'string') {
      throw new Error('Input Validation & Sanitization: ' + fieldName + ' must be an ISO 8601 UTC string.');
    }

    var normalized = value.trim();

    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(normalized)) {
      throw new Error('Input Validation & Sanitization: ' + fieldName + ' must be ISO 8601 UTC.');
    }

    if (isNaN(new Date(normalized).getTime())) {
      throw new Error('Input Validation & Sanitization: ' + fieldName + ' is not a valid date.');
    }

    return new Date(normalized).toISOString();
  }

  function normalizeEnum(value, fieldName, allowedValues) {
    if (typeof value !== 'string') {
      throw new Error('Input Validation & Sanitization: ' + fieldName + ' must be a string enum.');
    }

    var normalized = value.trim().toUpperCase();

    if (allowedValues.indexOf(normalized) === -1) {
      throw new Error('Input Validation & Sanitization: ' + fieldName + ' is not allowed.');
    }

    return normalized;
  }

  function normalizeEmail(value, fieldName) {
    if (typeof value !== 'string') {
      throw new Error('Input Validation & Sanitization: ' + fieldName + ' must be a string.');
    }

    var normalized = value.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 254) {
      throw new Error('Input Validation & Sanitization: ' + fieldName + ' must be a valid email.');
    }

    return normalized;
  }

  function normalizeClientVersion(value) {
    if (typeof value !== 'string') {
      throw new Error('Input Validation & Sanitization: client_version must be a string.');
    }

    var normalized = value.trim();

    if (!/^v?\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(normalized)) {
      throw new Error('Input Validation & Sanitization: client_version format is invalid.');
    }

    return normalized;
  }

  function normalizeIdentifier(value, fieldName) {
    if (typeof value !== 'string') {
      throw new Error('Input Validation & Sanitization: ' + fieldName + ' must be a string.');
    }

    var normalized = value.trim().toUpperCase();

    if (!/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(normalized)) {
      throw new Error('Input Validation & Sanitization: ' + fieldName + ' format is invalid.');
    }

    return normalized;
  }

  function normalizeOptionalIdentifier(value, fieldName) {
    if (value === undefined || value === null || value === '') {
      return '';
    }

    return normalizeIdentifier(value, fieldName);
  }

  function normalizeInteger(value, fieldName) {
    var numberValue = Number(value);

    if (!isFinite(numberValue) || Math.floor(numberValue) !== numberValue) {
      throw new Error('Input Validation & Sanitization: ' + fieldName + ' must be an integer.');
    }

    if (numberValue < 0 || numberValue > OPTIFLOW_PRODUCTION_LOGS.max_integer_value) {
      throw new Error('Input Validation & Sanitization: ' + fieldName + ' is outside allowed bounds.');
    }

    return numberValue;
  }

  function normalizeFreeText(value, fieldName, maxLength) {
    if (value === undefined || value === null) {
      return '';
    }

    if (typeof value !== 'string') {
      throw new Error('Input Validation & Sanitization: ' + fieldName + ' must be a string.');
    }

    var normalized = value.trim().replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ');

    if (normalized.length > maxLength) {
      throw new Error('Input Validation & Sanitization: ' + fieldName + ' is too long.');
    }

    if (/[^\s]+@[^\s]+|\+?\d[\d\s().-]{7,}/.test(normalized)) {
      throw new Error('Input Validation & Sanitization: ' + fieldName + ' must not contain PII.');
    }

    return normalized;
  }

  return Object.freeze({
    assertKnownPermission: assertKnownPermission,
    assertNoInput: assertNoInput,
    assertDoGetEvent: assertDoGetEvent,
    validateOptionalSessionRequest: validateOptionalSessionRequest,
    validatePermissionCheckRequest: validatePermissionCheckRequest,
    validateScriptPropertiesStatusRequest: validateScriptPropertiesStatusRequest,
    validateScriptPropertyDeleteRequest: validateScriptPropertyDeleteRequest,
    validateScriptPropertyUpdateRequest: validateScriptPropertyUpdateRequest,
    validateProductionReportSubmitRequest: validateProductionReportSubmitRequest,
    validateSessionContextRequest: validateSessionContextRequest,
    validateSecretRotationRequest: validateSecretRotationRequest,
  });
})();
