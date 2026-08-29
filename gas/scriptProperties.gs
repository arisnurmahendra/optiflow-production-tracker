var OptiflowScriptProperties = (function () {
  function getStatus(request) {
    var session = OptiflowAuth.requireSession(request || {}, {
      resource: 'script_property',
      action: 'read_status',
    });

    var properties = PropertiesService.getScriptProperties();
    var keys = Object.keys(OPTIFLOW_SCRIPT_PROPERTY_CONTRACT);
    var records = keys.map(function (key) {
      var value = properties.getProperty(key);
      return buildSafeRecord(key, value);
    });

    OptiflowAudit.write('SCRIPT_PROPERTY_STATUS_READ', session, {
      keys: keys,
    });

    return OptiflowResponse.success({
      properties: records,
    });
  }

  function setProperty(request) {
    var session = OptiflowAuth.requireSession(request.session || {}, {
      resource: 'script_property',
      action: 'update',
    });

    PropertiesService.getScriptProperties().setProperty(request.key, request.value);
    OptiflowAudit.write('SCRIPT_PROPERTY_UPDATED', session, {
      key: request.key,
      sensitivity: OPTIFLOW_SCRIPT_PROPERTY_CONTRACT[request.key].sensitivity,
    });

    return OptiflowResponse.success({
      property: buildSafeRecord(request.key, request.value),
    });
  }

  function deleteProperty(request) {
    var session = OptiflowAuth.requireSession(request.session || {}, {
      resource: 'script_property',
      action: 'delete',
    });

    PropertiesService.getScriptProperties().deleteProperty(request.key);
    OptiflowAudit.write('SCRIPT_PROPERTY_DELETED', session, {
      key: request.key,
      sensitivity: OPTIFLOW_SCRIPT_PROPERTY_CONTRACT[request.key].sensitivity,
    });

    return OptiflowResponse.success({
      property: buildSafeRecord(request.key, ''),
    });
  }

  function rotateSecret(request) {
    var session = OptiflowAuth.requireSession(request.session || {}, {
      resource: 'script_property',
      action: 'rotate_secret',
    });

    var nextValue = Utilities.getUuid() + '-' + Utilities.getUuid();
    PropertiesService.getScriptProperties().setProperty(request.key, nextValue);
    OptiflowAudit.write('SCRIPT_PROPERTY_SECRET_ROTATED', session, {
      key: request.key,
      sensitivity: OPTIFLOW_SCRIPT_PROPERTY_CONTRACT[request.key].sensitivity,
    });

    return OptiflowResponse.success({
      property: buildSafeRecord(request.key, nextValue),
    });
  }

  function buildSafeRecord(key, value) {
    var contract = OPTIFLOW_SCRIPT_PROPERTY_CONTRACT[key];
    var hasValue = value !== undefined && value !== null && String(value) !== '';
    var record = {
      key: key,
      sensitivity: contract.sensitivity,
      status: hasValue ? 'SET' : 'NOT_SET',
      readable: contract.readable,
      updatable: contract.updatable,
      deletable: contract.deletable,
      rotatable: contract.rotatable,
      value_preview: '',
    };

    if (hasValue && contract.readable) {
      record.value_preview = maskValue(key, String(value));
    }

    return record;
  }

  function maskValue(key, value) {
    if (key === 'AUTH_MODE' || key === 'APP_ACTIVE_UNTIL') {
      return value;
    }

    if (value.length <= 8) {
      return '***';
    }

    return value.slice(0, 4) + '...' + value.slice(-4);
  }

  return Object.freeze({
    deleteProperty: deleteProperty,
    getStatus: getStatus,
    rotateSecret: rotateSecret,
    setProperty: setProperty,
  });
})();
