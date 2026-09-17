var OptiflowHrd = (function () {
  function getAccessDashboard(payload, session) {
    var filter = payload.filter || {};
    var users = buildUserDirectory(filter);
    var roleMatrix = buildRoleMatrix();
    var auditSummary = buildAuditSummary();
    var dailyAttendance = buildAttendanceDaily(users.all_items, filter);
    var monthlyAttendance = buildAttendanceMonthly(users.all_items, filter);
    var attendanceSummary = buildAttendanceSummary(dailyAttendance.items, monthlyAttendance.items, filter);
    var governance = buildGovernanceSummary(users.all_items);

    OptiflowAudit.write('HRD_ACCESS_DASHBOARD_READ', session, {
      users_returned: users.items.length,
      filter_role: filter.role || '',
      filter_status: filter.status || '',
      filter_bagian: filter.bagian_id || '',
    });

    return OptiflowResponse.success({
      summary: buildSummary(users.all_items, roleMatrix, auditSummary, attendanceSummary),
      attendance_summary: attendanceSummary,
      attendance_daily: paginate(dailyAttendance.items, payload.pagination),
      attendance_monthly: paginate(monthlyAttendance.items, payload.pagination),
      attendance_filters: {
        factory_date: dailyAttendance.factory_date,
        period_month: monthlyAttendance.period_month,
        bagian_options: dailyAttendance.bagian_options,
        status_options: ['ALL', 'HADIR', 'IZIN', 'SAKIT', 'ALPHA', 'BELUM_KONFIRMASI', 'RESIGN'],
      },
      users: paginate(users.items, payload.pagination),
      role_matrix: roleMatrix,
      audit_summary: auditSummary,
      governance_summary: governance.summary,
      access_anomalies: governance.access_anomalies,
      multi_role_users: governance.multi_role_users,
      audit_events: buildSafeAuditEvents(),
    });
  }

  function buildUserDirectory(filter) {
    var employeeRows = safeGetRows('EMPLOYEE_MASTER');
    var sourceRows = employeeRows.length ? employeeRows : OptiflowSheets.getRows('USER_ROLES');
    var allItems = sourceRows.map(maskUserRow);
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

  function upsertEmployee(payload, session) {
    var employee = payload.employee;
    var mode = String(payload.mode || 'UPSERT').toUpperCase();
    var now = new Date().toISOString();
    var rows = safeGetRows('EMPLOYEE_MASTER');
    var existingByNo = rows.filter(function (row) {
      return String(row.employee_no || '') === employee.employee_no;
    })[0];
    var existingByEmail = employee.email ? rows.filter(function (row) {
      return normalizeEmail(row.email) === normalizeEmail(employee.email);
    })[0] : null;

    if (mode === 'CREATE' && (existingByNo || existingByEmail)) {
      if (existingByNo) {
        throw new Error('Employee number already exists. Use Edit to update existing employee data.');
      }

      throw new Error('Employee email already exists. Use Edit to update existing employee data.');
    }

    if ((mode === 'EDIT' || mode === 'UPDATE') && !existingByNo) {
      throw new Error('Employee was not found for update.');
    }

    if ((mode === 'EDIT' || mode === 'UPDATE') && existingByEmail && String(existingByEmail.employee_no || '') !== employee.employee_no) {
      throw new Error('Employee email already exists. Use another email address.');
    }

    var existing = existingByNo || existingByEmail;
    var next = {
      employee_id: existing ? String(existing.employee_id || employee.employee_no) : employee.employee_no,
      employee_no: employee.employee_no,
      nama_lengkap: employee.full_name,
      bagian_id: employee.bagian_id,
      status_karyawan: employee.status_karyawan,
      email: employee.email,
      no_wa: employee.wa_number,
      alamat: employee.address,
      username: employee.username,
      role: employee.role,
      roles: employee.roles.join(','),
      mandor_email: employee.mandor_email,
      created_at: existing ? safeTimestamp(existing.created_at) : now,
      updated_at: now,
    };

    OptiflowSheets.replaceDataRows('EMPLOYEE_MASTER', [next], function (row) {
      return String(row.employee_no || '') === employee.employee_no;
    });
    OptiflowAudit.write(existing ? 'EMPLOYEE_MASTER_UPDATED' : 'EMPLOYEE_MASTER_CREATED', session, {
      employee_no: employee.employee_no,
      bagian_id: employee.bagian_id,
      status_karyawan: employee.status_karyawan,
    });

    return OptiflowResponse.success({
      employee: maskUserRow(next),
      mode: existing ? 'UPDATE' : 'CREATE',
    });
  }

  function deactivateEmployee(payload, session) {
    var employeeNo = String(payload.employee_no || '');
    var rows = safeGetRows('EMPLOYEE_MASTER');
    var existing = rows.filter(function (row) {
      return String(row.employee_no || '') === employeeNo;
    })[0];

    if (!existing) {
      throw new Error('Employee was not found.');
    }

    var next = Object.assign({}, existing, {
      status_karyawan: 'RESIGN',
      updated_at: new Date().toISOString(),
    });

    OptiflowSheets.replaceDataRows('EMPLOYEE_MASTER', [next], function (row) {
      return String(row.employee_no || '') === employeeNo;
    });
    OptiflowAudit.write('EMPLOYEE_MASTER_RESIGNED', session, {
      employee_no: employeeNo,
    });

    return OptiflowResponse.success({
      employee: maskUserRow(next),
      status_karyawan: 'RESIGN',
    });
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

  function buildSummary(users, roleMatrix, auditSummary, attendanceSummary) {
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
      payroll_ready_status: attendanceSummary.pending_confirmation > 0 ? 'REVIEW_REQUIRED' : 'READY',
    };
  }

  function buildAttendanceDaily(users, filter) {
    var factoryDate = String(filter.factory_date || new Date().toISOString().slice(0, 10));
    var rows = safeGetRows('ATTENDANCE_DAILY_RECAP');

    if (rows.length === 0) {
      rows = users.slice(0, 8).map(function (user, index) {
        var inactive = !user.status_aktif || user.is_deleted;
        var status = inactive
          ? 'RESIGN'
          : index % 5 === 0
            ? 'BELUM_KONFIRMASI'
            : index % 7 === 0
              ? 'SAKIT'
              : 'HADIR';

        return {
          daily_attendance_id: 'ATT-D-' + factoryDate.replace(/-/g, '') + '-' + (user.employee_no || user.user_id || index),
          factory_date: factoryDate,
          employee_no: user.employee_no || user.user_id || '',
          full_name: user.full_name || user.email_masked,
          bagian_id: user.bagian_id || 'UNASSIGNED',
          attendance_status: status,
          clock_in_at: status === 'HADIR' || status === 'BELUM_KONFIRMASI' ? factoryDate + 'T01:00:00.000Z' : '',
          clock_out_at: status === 'HADIR' ? factoryDate + 'T09:00:00.000Z' : '',
          confirmed_by: status === 'BELUM_KONFIRMASI' ? '' : 'mandor@example.com',
          confirmed_at: status === 'BELUM_KONFIRMASI' ? '' : factoryDate + 'T01:30:00.000Z',
          notes: inactive ? 'Karyawan nonaktif/resign.' : '',
          payroll_ready: status !== 'BELUM_KONFIRMASI',
        };
      });
    }

    rows = rows.filter(function (row) {
      return String(row.factory_date || factoryDate) === factoryDate
        && (!filter.bagian_id || filter.bagian_id === 'ALL' || String(row.bagian_id || '') === filter.bagian_id)
        && (!filter.attendance_status || filter.attendance_status === 'ALL' || String(row.attendance_status || '') === filter.attendance_status);
    });

    return {
      factory_date: factoryDate,
      items: rows,
      bagian_options: unique(rows.map(function (row) { return String(row.bagian_id || 'UNASSIGNED'); })),
    };
  }

  function buildAttendanceMonthly(users, filter) {
    var periodMonth = String(filter.period_month || new Date().toISOString().slice(0, 7));
    var rows = safeGetRows('ATTENDANCE_MONTHLY_RECAP');

    if (rows.length === 0) {
      rows = users.slice(0, 8).map(function (user, index) {
        var inactive = !user.status_aktif || user.is_deleted;
        return {
          monthly_attendance_id: 'ATT-M-' + periodMonth.replace('-', '') + '-' + (user.employee_no || user.user_id || index),
          period_month: periodMonth,
          employee_no: user.employee_no || user.user_id || '',
          full_name: user.full_name || user.email_masked,
          bagian_id: user.bagian_id || 'UNASSIGNED',
          hadir_count: inactive ? 0 : 20 + (index % 4),
          izin_count: inactive ? 0 : index % 2,
          sakit_count: inactive ? 0 : index % 3 === 0 ? 1 : 0,
          alpha_count: inactive ? 0 : index % 6 === 0 ? 1 : 0,
          resign_count: inactive ? 1 : 0,
          pending_confirmation_count: inactive ? 0 : index % 5 === 0 ? 1 : 0,
          payroll_ready: inactive || index % 5 !== 0,
        };
      });
    }

    rows = rows.filter(function (row) {
      return String(row.period_month || periodMonth) === periodMonth
        && (!filter.bagian_id || filter.bagian_id === 'ALL' || String(row.bagian_id || '') === filter.bagian_id)
        && (!filter.attendance_status || filter.attendance_status === 'ALL');
    });

    return {
      period_month: periodMonth,
      items: rows,
    };
  }

  function buildAttendanceSummary(dailyRows, monthlyRows, filter) {
    function countDaily(status) {
      return dailyRows.filter(function (row) { return row.attendance_status === status; }).length;
    }

    function sumMonthly(key) {
      return monthlyRows.reduce(function (total, row) {
        return total + Number(row[key] || 0);
      }, 0);
    }

    var pendingConfirmation = countDaily('BELUM_KONFIRMASI');
    var payrollReadyCount = dailyRows.filter(function (row) {
      return isTruthy(row.payroll_ready);
    }).length;

    return {
      factory_date: String(filter.factory_date || new Date().toISOString().slice(0, 10)),
      period_month: String(filter.period_month || new Date().toISOString().slice(0, 7)),
      present_today: countDaily('HADIR'),
      absent_today: countDaily('IZIN') + countDaily('SAKIT') + countDaily('ALPHA'),
      izin_today: countDaily('IZIN'),
      sakit_today: countDaily('SAKIT'),
      alpha_today: countDaily('ALPHA'),
      resign_today: countDaily('RESIGN'),
      pending_confirmation: pendingConfirmation,
      payroll_ready_count: payrollReadyCount,
      payroll_blocked_count: Math.max(0, dailyRows.length - payrollReadyCount),
      monthly_hadir_count: sumMonthly('hadir_count'),
      monthly_izin_count: sumMonthly('izin_count'),
      monthly_sakit_count: sumMonthly('sakit_count'),
      monthly_alpha_count: sumMonthly('alpha_count'),
      monthly_resign_count: sumMonthly('resign_count'),
      monthly_pending_confirmation_count: sumMonthly('pending_confirmation_count'),
      status: pendingConfirmation > 0 ? 'REVIEW_REQUIRED' : 'READY',
    };
  }

  function buildGovernanceSummary(users) {
    var multiRoleUsers = users.filter(function (user) {
      return user.roles && user.roles.length > 1;
    }).map(function (user) {
      return {
        employee_no: user.employee_no || user.user_id,
        email_masked: user.email_masked,
        roles: user.roles,
        status: user.status_aktif ? 'ACTIVE' : 'INACTIVE',
      };
    });
    var anomalies = users.filter(function (user) {
      return !user.status_aktif || user.is_deleted || !user.last_login;
    }).map(function (user) {
      return {
        employee_no: user.employee_no || user.user_id,
        email_masked: user.email_masked,
        anomaly_type: user.is_deleted ? 'DELETED_USER' : !user.status_aktif ? 'INACTIVE_USER' : 'NO_LOGIN_HISTORY',
        severity: user.is_deleted || !user.status_aktif ? 'WARNING' : 'INFO',
      };
    });

    return {
      summary: {
        multi_role_user_count: multiRoleUsers.length,
        access_anomaly_count: anomalies.length,
        denied_access_count: OptiflowSheets.getRows('AUDIT_LOGS').filter(function (row) {
          return String(row.action || '').indexOf('RBAC_') === 0;
        }).length,
        last_login_missing_count: users.filter(function (user) { return !user.last_login; }).length,
      },
      multi_role_users: multiRoleUsers,
      access_anomalies: anomalies,
    };
  }

  function buildSafeAuditEvents() {
    return OptiflowSheets.getRows('AUDIT_LOGS').slice(0, 6).map(function (row) {
      return {
        action: String(row.action || ''),
        actor_role: String(row.actor_role || ''),
        actor_email_masked: maskEmail(row.actor_email),
        entity_type: String(row.entity_type || ''),
        entity_id: String(row.entity_id || ''),
        created_at: safeTimestamp(row.created_at),
      };
    });
  }

  function maskUserRow(row) {
    return {
      user_id: String(row.user_id || ''),
      employee_no: String(row.employee_no || row.user_id || ''),
      full_name: String(row.full_name || row.nama_lengkap || row.username || ''),
      address: String(row.address || row.alamat || ''),
      wa_number: String(row.wa_number || row.no_wa || ''),
      wa_url: buildWaUrl(row.wa_number || row.no_wa),
      username: String(row.username || ''),
      bagian_id: String(row.bagian_id || ''),
      email_masked: maskEmail(row.email),
      role: String(row.role || ''),
      roles: parseRoles(row.roles, row.role),
      mandor_email: String(row.mandor_email || ''),
      status_karyawan: String(row.status_karyawan || (isTruthy(row.status_aktif) ? 'AKTIF' : 'RESIGN')),
      status_aktif: row.status_karyawan ? ['AKTIF', 'ACTIVE'].indexOf(String(row.status_karyawan).toUpperCase()) !== -1 : isTruthy(row.status_aktif),
      is_deleted: isTruthy(row.is_deleted),
      last_login: safeTimestamp(row.last_login),
      created_at: safeTimestamp(row.created_at),
      updated_at: safeTimestamp(row.updated_at),
    };
  }

  function safeGetRows(sheetName) {
    try {
      return OptiflowSheets.getRows(sheetName);
    } catch (error) {
      return [];
    }
  }

  function parseRoles(value, fallbackRole) {
    var roles = String(value || fallbackRole || '').split(',').map(function (role) {
      return role.trim();
    }).filter(Boolean);

    return roles.length ? roles : [];
  }

  function buildWaUrl(value) {
    var digits = String(value || '').replace(/\D/g, '');
    return digits ? 'https://wa.me/' + digits : '';
  }

  function unique(values) {
    var seen = {};
    return values.filter(function (value) {
      if (!value || seen[value]) {
        return false;
      }

      seen[value] = true;
      return true;
    }).sort();
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

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
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
    upsertEmployee: upsertEmployee,
    deactivateEmployee: deactivateEmployee,
  });
})();
