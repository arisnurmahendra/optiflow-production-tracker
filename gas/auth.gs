var OptiflowAuth = (function () {
  var AUTH_MODE_KEY = 'AUTH_MODE';
  var DEV_EMAIL = 'dev.simulated@optiflow.local';

  function getSessionContext(request) {
    var authMode = getAuthMode();

    if (authMode === OPTIFLOW_AUTH_MODES.OFF) {
      return getDevelopmentSession(request || {});
    }

    if (authMode === OPTIFLOW_AUTH_MODES.ON) {
      return getProductionSession();
    }

    OptiflowAudit.write('SESSION_FAILED', null, {
      reason: 'INVALID_AUTH_MODE',
      auth_mode: authMode || '',
    });
    throw new Error('Invalid AUTH_MODE configuration.');
  }

  function requireSession(request, requiredPermission) {
    var response = getSessionContext(request || {});
    var session = response.data;

    if (session.requires_role_selection) {
      throw new Error('Role selection is required before continuing.');
    }

    if (requiredPermission) {
      requirePermission(session, requiredPermission.resource, requiredPermission.action);
    }

    return session;
  }

  function requireRole(session, allowedRoles) {
    if (!session || allowedRoles.indexOf(session.role) === -1) {
      OptiflowAudit.write('RBAC_DENIED', session || null, {
        allowed_roles: allowedRoles || [],
      });
      throw new Error('Access denied for role.');
    }

    return true;
  }

  function getAuthMode() {
    return String(PropertiesService.getScriptProperties().getProperty(AUTH_MODE_KEY) || '').trim().toUpperCase();
  }

  function getDevelopmentSession(request) {
    if (!request.simulated_role) {
      return OptiflowResponse.success({
        auth_mode: OPTIFLOW_AUTH_MODES.OFF,
        email: '',
        role: '',
        user_id: '',
        is_simulated: true,
        requires_role_selection: true,
        allowed_simulated_roles: OPTIFLOW_ROLES,
      });
    }

    var session = {
      auth_mode: OPTIFLOW_AUTH_MODES.OFF,
      email: DEV_EMAIL,
      role: request.simulated_role,
      user_id: 'DEV-' + request.simulated_role,
      is_simulated: true,
      requires_role_selection: false,
      allowed_simulated_roles: OPTIFLOW_ROLES,
    };

    OptiflowAudit.write('SESSION_SUCCESS', session, {
      auth_mode: OPTIFLOW_AUTH_MODES.OFF,
      simulated: true,
    });

    return OptiflowResponse.success(session);
  }

  function getProductionSession() {
    var email = normalizeEmail(Session.getActiveUser().getEmail());

    if (!email) {
      OptiflowAudit.write('SESSION_FAILED', null, {
        reason: 'EMPTY_GOOGLE_SESSION_EMAIL',
      });
      throw new Error('Unable to resolve active Google account.');
    }

    var user = findActiveUserByEmail(email);

    if (!user) {
      OptiflowAudit.write('SESSION_FAILED', { email: email, role: 'Unknown' }, {
        reason: 'USER_NOT_ACTIVE_OR_NOT_REGISTERED',
      });
      throw new Error('User is not registered or inactive.');
    }

    var session = {
      auth_mode: OPTIFLOW_AUTH_MODES.ON,
      email: user.email,
      role: user.role,
      user_id: user.user_id,
      is_simulated: false,
      requires_role_selection: false,
      allowed_simulated_roles: [],
    };

    OptiflowAudit.write('SESSION_SUCCESS', session, {
      auth_mode: OPTIFLOW_AUTH_MODES.ON,
      simulated: false,
    });

    return OptiflowResponse.success(session);
  }

  function findActiveUserByEmail(email) {
    var rows = OptiflowSheets.getRows('USER_ROLES');

    for (var index = 0; index < rows.length; index += 1) {
      var row = rows[index];

      if (normalizeEmail(row.email) === email
        && row.role
        && OPTIFLOW_ROLES.indexOf(row.role) !== -1
        && isTruthy(row.status_aktif)
        && !isTruthy(row.is_deleted)) {
        return {
          user_id: String(row.user_id || ''),
          email: normalizeEmail(row.email),
          role: row.role,
        };
      }
    }

    return null;
  }

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function isTruthy(value) {
    return value === true || String(value).toUpperCase() === 'TRUE';
  }

  return Object.freeze({
    getSessionContext: getSessionContext,
    requirePermission: requirePermission,
    requireRole: requireRole,
    requireSession: requireSession,
  });

  function requirePermission(session, resource, action) {
    return OptiflowPermissions.requirePermission(session, resource, action);
  }
})();
