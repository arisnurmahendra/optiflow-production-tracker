var OptiflowPermissions = (function () {
  function hasPermission(session, resource, action) {
    if (!session || !session.role) {
      return false;
    }

    OptiflowValidation.assertKnownPermission(resource, action);

    if (OPTIFLOW_ROLES.indexOf(session.role) === -1) {
      return false;
    }

    return OptiflowSheets.getRows('ROLE_PERMISSIONS').some(function (row) {
      return row.role === session.role
        && row.resource === resource
        && row.action === action
        && isAllowed(row.is_allowed);
    });
  }

  function requirePermission(session, resource, action) {
    if (!hasPermission(session, resource, action)) {
      OptiflowAudit.write('RBAC_DENIED', session || null, {
        resource: resource,
        action: action,
      });
      throw new Error('Access denied for permission ' + resource + ':' + action + '.');
    }

    OptiflowAudit.write('RBAC_ALLOWED', session, {
      resource: resource,
      action: action,
    });

    return true;
  }

  function listPermissionsForRole(role) {
    if (OPTIFLOW_ROLES.indexOf(role) === -1) {
      throw new Error('Unknown role.');
    }

    return OptiflowSheets.getRows('ROLE_PERMISSIONS').filter(function (row) {
      return row.role === role && isAllowed(row.is_allowed);
    }).map(function (row) {
      return {
        resource: row.resource,
        action: row.action,
      };
    });
  }

  function isAllowed(value) {
    return value === true || String(value).toUpperCase() === 'TRUE';
  }

  return Object.freeze({
    hasPermission: hasPermission,
    listPermissionsForRole: listPermissionsForRole,
    requirePermission: requirePermission,
  });
})();
