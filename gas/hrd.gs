var OptiflowHrd = (function () {
  function getAccessDashboard(payload, session) {
    var users = buildUserDirectory(payload.filter || {});
    var roleMatrix = buildRoleMatrix();
    var auditSummary = buildAuditSummary();

    OptiflowAudit.write('HRD_ACCESS_DASHBOARD_READ', session, {
      users_returned: users.items.length,
      filter_role: payload.filter.role || '',
      filter_status: payload.filter.status || '',
    });

    return OptiflowResponse.success({
      summary: buildSummary(users.all_items, roleMatrix, auditSummary),
      users: paginate(users.items, payload.pagination),
      role_matrix: roleMatrix,
      audit_summary: auditSummary,
    });
  }

  function buildUserDirectory(filter) {
    var allItems = OptiflowSheets.getRows('USER_ROLES').map(maskUserRow);
    var filtered = allItems.filter(function (user) {
      return (!filter.role || user.role === filter.role)
        && matchesStatus(user, filter.status || 'ALL');
    }).sort(function (a, b) {
      return a.role.localeCompare(b.role) || a.email_masked.localeCompare(b.email_masked);
    });

    return {
      all_items: allItems,
      items: filtered,
    };
  }

  function buildRoleMatrix() {
    var buckets = {};

    OPTIFLOW_ROLES.forEach(function (role) {
      buckets[role] = {
        role: role,
        permission_count: 0,
        resources: {},
      };
    });

    OptiflowSheets.getRows('ROLE_PERMISSIONS').forEach(function (row) {
      if (!buckets[row.role] || !isTruthy(row.is_allowed)) {
        return;
      }

      buckets[row.role].permission_count += 1;
      buckets[row.role].resources[String(row.resource || '')] = true;
    });

    return OPTIFLOW_ROLES.map(function (role) {
      var resourceNames = Object.keys(buckets[role].resources).sort();
      return {
        role: role,
        permission_count: buckets[role].permission_count,
        resources: resourceNames,
        readiness: buckets[role].permission_count > 0 ? 'READY' : 'MISSING_PERMISSION',
      };
    });
  }

  function buildAuditSummary() {
    var rows = OptiflowSheets.getRows('AUDIT_LOGS');
    var buckets = rows.reduce(function (summary, row) {
      var action = String(row.action || '');
      var group = action.indexOf('RBAC_') === 0
        ? 'rbac'
        : action.indexOf('SESSION_') === 0
          ? 'session'
          : action.indexOf('USER_ROLE_') === 0
            ? 'user_role'
            : 'other';

      summary[group] += 1;
      if (row.created_at && String(row.created_at) > summary.last_event_at) {
        summary.last_event_at = String(row.created_at);
      }
      return summary;
    }, {
      session: 0,
      rbac: 0,
      user_role: 0,
      other: 0,
      last_event_at: '',
    });

    return buckets;
  }

  function buildSummary(users, roleMatrix, auditSummary) {
    var activeUsers = users.filter(function (user) {
      return user.status_aktif && !user.is_deleted;
    });
    var inactiveUsers = users.filter(function (user) {
      return !user.status_aktif && !user.is_deleted;
    });
    var deletedUsers = users.filter(function (user) {
      return user.is_deleted;
    });
    var rolesWithMissingPermissions = roleMatrix.filter(function (role) {
      return role.readiness !== 'READY';
    }).length;

    return {
      total_users: users.length,
      active_users: activeUsers.length,
      inactive_users: inactiveUsers.length,
      deleted_users: deletedUsers.length,
      roles_with_missing_permissions: rolesWithMissingPermissions,
      last_audit_at: auditSummary.last_event_at,
    };
  }

  function maskUserRow(row) {
    return {
      user_id: String(row.user_id || ''),
      email_masked: maskEmail(row.email),
      role: String(row.role || ''),
      status_aktif: isTruthy(row.status_aktif),
      is_deleted: isTruthy(row.is_deleted),
      last_login: safeTimestamp(row.last_login),
      created_at: safeTimestamp(row.created_at),
      updated_at: safeTimestamp(row.updated_at),
    };
  }

  function matchesStatus(user, status) {
    if (status === 'ALL') {
      return true;
    }

    if (status === 'DELETED') {
      return user.is_deleted;
    }

    if (status === 'ACTIVE') {
      return user.status_aktif && !user.is_deleted;
    }

    if (status === 'INACTIVE') {
      return !user.status_aktif && !user.is_deleted;
    }

    return true;
  }

  function paginate(items, pagination) {
    var page = pagination.page;
    var pageSize = pagination.page_size;
    var start = (page - 1) * pageSize;

    return {
      page: page,
      page_size: pageSize,
      total: items.length,
      items: items.slice(start, start + pageSize),
    };
  }

  function maskEmail(email) {
    var normalized = String(email || '').trim().toLowerCase();
    var parts = normalized.split('@');

    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return '[masked-email]';
    }

    return parts[0].slice(0, 2) + '***@' + parts[1];
  }

  function safeTimestamp(value) {
    if (!value) {
      return '';
    }

    var date = new Date(value);
    return isNaN(date.getTime()) ? '' : date.toISOString();
  }

  function isTruthy(value) {
    return value === true || String(value).toUpperCase() === 'TRUE';
  }

  return Object.freeze({
    getAccessDashboard: getAccessDashboard,
  });
})();
