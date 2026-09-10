var OptiflowTargetMaster = (function () {
  var SHEET_NAME = 'TARGET_MASTER';
  var SCOPE_PRIORITY = Object.freeze({
    OPERATOR_ONLY: 1,
    MACHINE_SCOPE: 2,
    LINE_SHIFT: 3,
    ALL_USERS: 4,
  });

  function get(payload, session) {
    var targets = listTargets(payload.filter, payload.include_inactive);
    var activeTarget = selectTarget(targets, payload.filter);

    OptiflowAudit.write('PRODUCTION_TARGET_READ', session, {
      count: targets.length,
      active_target_id: activeTarget ? activeTarget.target_id : '',
      scope_type: activeTarget ? activeTarget.scope_type : '',
    });

    return OptiflowResponse.success({
      active_target: activeTarget,
      targets: targets,
      scope: payload.filter,
    });
  }

  function upsert(payload, session) {
    var now = new Date().toISOString();
    var incoming = payload.target;
    var existingRows = OptiflowSheets.getRows(SHEET_NAME).map(normalizeRow);
    var targetId = incoming.target_id || Utilities.getUuid();
    var existing = findById(existingRows, targetId);
    var isBulkScope = incoming.scope_type !== 'OPERATOR_ONLY';

    if (!existing) {
      OptiflowAuth.requirePermission(session, 'production_target', 'create');
    } else {
      OptiflowAuth.requirePermission(session, 'production_target', 'update');
    }

    if (isBulkScope) {
      OptiflowAuth.requirePermission(session, 'production_target', 'bulk_update');
    }

    var target = {
      target_id: targetId,
      factory_date: incoming.factory_date,
      effective_from: incoming.effective_from,
      effective_until: incoming.effective_until,
      line_id: incoming.line_id,
      shift_id: incoming.shift_id,
      machine_id: incoming.machine_id,
      operator_email: incoming.operator_email,
      target_harian: incoming.target_harian,
      scope_type: incoming.scope_type,
      status_aktif: incoming.status_aktif,
      created_by: existing ? existing.created_by : session.email,
      updated_by: session.email,
      created_at: existing ? existing.created_at : now,
      updated_at: now,
    };
    var nextRows = existingRows.map(function (row) {
      return row.target_id === target.target_id ? target : row;
    });

    if (!existing) {
      nextRows.push(target);
    }

    OptiflowSheets.replaceDataRows(SHEET_NAME, nextRows);
    OptiflowAudit.write(existing ? 'PRODUCTION_TARGET_UPDATED' : 'PRODUCTION_TARGET_CREATED', session, {
      target_id: target.target_id,
      scope_type: target.scope_type,
      target_harian: target.target_harian,
      affected_scope: buildScopeSummary(target),
    });

    return OptiflowResponse.success({
      target: target,
      created: !existing,
    });
  }

  function deactivate(payload, session) {
    var now = new Date().toISOString();
    var found = false;
    var nextRows = OptiflowSheets.getRows(SHEET_NAME).map(normalizeRow).map(function (row) {
      if (row.target_id !== payload.target_id) {
        return row;
      }

      found = true;
      return Object.assign({}, row, {
        status_aktif: false,
        updated_by: session.email,
        updated_at: now,
      });
    });

    if (!found) {
      throw new Error('Production target was not found.');
    }

    OptiflowSheets.replaceDataRows(SHEET_NAME, nextRows);
    OptiflowAudit.write('PRODUCTION_TARGET_DEACTIVATED', session, {
      target_id: payload.target_id,
    });

    return OptiflowResponse.success({
      target_id: payload.target_id,
      status_aktif: false,
    });
  }

  function listTargets(filter, includeInactive) {
    return OptiflowSheets.getRows(SHEET_NAME)
      .map(normalizeRow)
      .filter(function (target) {
        return includeInactive || target.status_aktif;
      })
      .filter(function (target) {
        return matchesScope(target, filter);
      })
      .sort(function (a, b) {
        return SCOPE_PRIORITY[a.scope_type] - SCOPE_PRIORITY[b.scope_type]
          || b.effective_from.localeCompare(a.effective_from)
          || a.target_id.localeCompare(b.target_id);
      });
  }

  function selectTarget(targets, filter) {
    return targets.filter(function (target) {
      return target.status_aktif && isDateInRange(target, filter.factory_date);
    })[0] || null;
  }

  function matchesScope(target, filter) {
    if (filter.line_id && target.line_id !== filter.line_id) {
      return false;
    }

    if (filter.shift_id && target.shift_id !== filter.shift_id) {
      return false;
    }

    if (filter.machine_id && target.machine_id !== 'ALL' && target.machine_id !== filter.machine_id) {
      return false;
    }

    if (filter.operator_email && target.operator_email !== 'ALL' && target.operator_email !== filter.operator_email) {
      return false;
    }

    return true;
  }

  function isDateInRange(target, factoryDate) {
    if (!factoryDate) {
      return true;
    }

    if (target.factory_date && target.factory_date !== factoryDate) {
      return false;
    }

    return target.effective_from <= factoryDate
      && (!target.effective_until || target.effective_until >= factoryDate);
  }

  function findById(rows, targetId) {
    return rows.find(function (row) {
      return row.target_id === targetId;
    });
  }

  function normalizeRow(row) {
    return {
      target_id: String(row.target_id || '').trim().toLowerCase(),
      factory_date: String(row.factory_date || '').trim(),
      effective_from: String(row.effective_from || '').trim(),
      effective_until: String(row.effective_until || '').trim(),
      line_id: String(row.line_id || '').trim().toUpperCase(),
      shift_id: String(row.shift_id || '').trim().toUpperCase(),
      machine_id: String(row.machine_id || 'ALL').trim().toUpperCase(),
      operator_email: normalizeWildcardEmail(row.operator_email),
      target_harian: Number(row.target_harian || 0),
      scope_type: String(row.scope_type || 'LINE_SHIFT').trim().toUpperCase(),
      status_aktif: row.status_aktif === true || String(row.status_aktif).toUpperCase() === 'TRUE',
      created_by: String(row.created_by || '').trim().toLowerCase(),
      updated_by: String(row.updated_by || '').trim().toLowerCase(),
      created_at: row.created_at ? new Date(row.created_at).toISOString() : '',
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : '',
    };
  }

  function buildScopeSummary(target) {
    return [
      target.scope_type,
      target.line_id,
      target.shift_id,
      target.machine_id,
      target.operator_email,
    ].join('/');
  }

  function normalizeWildcardEmail(value) {
    var normalized = String(value || 'ALL').trim();
    return normalized.toUpperCase() === 'ALL' ? 'ALL' : normalized.toLowerCase();
  }

  return Object.freeze({
    deactivate: deactivate,
    get: get,
    upsert: upsert,
  });
})();
