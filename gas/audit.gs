var OptiflowAudit = (function () {
  function write(action, context, metadata) {
    try {
      OptiflowSheets.appendRecord('AUDIT_LOGS', {
        audit_id: Utilities.getUuid(),
        actor_email: context && context.email ? context.email : 'anonymous',
        actor_role: context && context.role ? context.role : 'Unknown',
        action: action,
        entity_type: 'SESSION',
        entity_id: context && context.user_id ? context.user_id : '',
        metadata_json: JSON.stringify(maskMetadata(metadata || {})),
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Audit write failed: ' + error.message);
    }
  }

  function maskMetadata(metadata) {
    var safe = {};

    Object.keys(metadata).forEach(function (key) {
      if (/secret|salt|token|password|credential/i.test(key)) {
        safe[key] = '[REDACTED]';
      } else {
        safe[key] = metadata[key];
      }
    });

    return safe;
  }

  return Object.freeze({
    write: write,
  });
})();
