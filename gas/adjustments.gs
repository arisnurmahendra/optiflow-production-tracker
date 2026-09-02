var OptiflowAdjustments = (function () {
  var ADJUSTMENT_LOGS = 'ADJUSTMENT_LOGS';
  var RAW_LOGS = 'RAW_LOGS';

  function create(payload, session) {
    var source = findRawLog(payload.source_transaction_id);

    if (!source) {
      throw new Error('Adjustment source transaction was not found.');
    }

    if (!OptiflowDailyClosing.isClosed(source.factory_date, source.line_id, source.shift_id)) {
      throw new Error('Adjustment requires a CLOSED daily closing scope.');
    }

    var now = new Date().toISOString();
    var adjustmentId = Utilities.getUuid();
    OptiflowSheets.appendRecord(ADJUSTMENT_LOGS, {
      adjustment_id: adjustmentId,
      source_transaction_id: payload.source_transaction_id,
      factory_date: source.factory_date,
      line_id: source.line_id,
      shift_id: source.shift_id,
      adjustment_type: payload.adjustment_type,
      delta_json: JSON.stringify(payload.delta),
      reason: payload.reason,
      status: 'PENDING',
      requested_by: session.email,
      approved_by: '',
      approved_at: '',
      created_at: now,
    });

    OptiflowAudit.write('ADJUSTMENT_CREATED', session, {
      adjustment_id: adjustmentId,
      source_transaction_id: payload.source_transaction_id,
      adjustment_type: payload.adjustment_type,
    });

    return OptiflowResponse.success({
      adjustment_id: adjustmentId,
      status: 'PENDING',
      created_at: now,
    });
  }

  function approve(payload, session) {
    return decide(payload, session, 'APPROVED', 'ADJUSTMENT_APPROVED');
  }

  function reject(payload, session) {
    return decide(payload, session, 'REJECTED', 'ADJUSTMENT_REJECTED');
  }

  function decide(payload, session, nextStatus, auditAction) {
    var latest = getLatestAdjustment(payload.adjustment_id);

    if (!latest) {
      throw new Error('Adjustment was not found.');
    }

    if (latest.status !== 'PENDING') {
      return OptiflowResponse.success({
        adjustment_id: latest.adjustment_id,
        status: latest.status,
        duplicate: true,
      });
    }

    var now = new Date().toISOString();
    OptiflowSheets.appendRecord(ADJUSTMENT_LOGS, {
      adjustment_id: latest.adjustment_id,
      source_transaction_id: latest.source_transaction_id,
      factory_date: latest.factory_date,
      line_id: latest.line_id,
      shift_id: latest.shift_id,
      adjustment_type: latest.adjustment_type,
      delta_json: latest.delta_json,
      reason: payload.notes || latest.reason,
      status: nextStatus,
      requested_by: latest.requested_by,
      approved_by: session.email,
      approved_at: now,
      created_at: latest.created_at,
    });

    OptiflowAudit.write(auditAction, session, {
      adjustment_id: latest.adjustment_id,
      source_transaction_id: latest.source_transaction_id,
      status: nextStatus,
    });

    return OptiflowResponse.success({
      adjustment_id: latest.adjustment_id,
      status: nextStatus,
      approved_at: now,
      duplicate: false,
    });
  }

  function listLatest(filter) {
    var latestById = {};
    OptiflowSheets.getRows(ADJUSTMENT_LOGS).forEach(function (row) {
      if (!matchesScope(row, filter || {})) {
        return;
      }

      latestById[row.adjustment_id] = normalizeAdjustment(row);
    });

    return Object.keys(latestById).map(function (key) {
      return latestById[key];
    }).sort(function (a, b) {
      return String(b.approved_at || b.created_at).localeCompare(String(a.approved_at || a.created_at));
    });
  }

  function listApproved(filter) {
    return listLatest(filter).filter(function (adjustment) {
      return adjustment.status === 'APPROVED';
    });
  }

  function getLatestAdjustment(adjustmentId) {
    var latest = null;
    OptiflowSheets.getRows(ADJUSTMENT_LOGS).forEach(function (row) {
      if (String(row.adjustment_id || '').trim().toLowerCase() === adjustmentId) {
        latest = normalizeAdjustment(row);
      }
    });
    return latest;
  }

  function findRawLog(transactionId) {
    var normalized = String(transactionId || '').trim().toLowerCase();
    return OptiflowSheets.getRows(RAW_LOGS).find(function (row) {
      return String(row.transaction_id || '').trim().toLowerCase() === normalized;
    }) || null;
  }

  function matchesScope(row, filter) {
    return (!filter.factory_date || row.factory_date === filter.factory_date)
      && (!filter.line_id || row.line_id === filter.line_id)
      && (!filter.shift_id || row.shift_id === filter.shift_id);
  }

  function normalizeAdjustment(row) {
    return {
      adjustment_id: String(row.adjustment_id || '').trim().toLowerCase(),
      source_transaction_id: String(row.source_transaction_id || '').trim().toLowerCase(),
      factory_date: String(row.factory_date || ''),
      line_id: String(row.line_id || ''),
      shift_id: String(row.shift_id || ''),
      adjustment_type: String(row.adjustment_type || '').trim().toUpperCase(),
      delta_json: String(row.delta_json || '{}'),
      reason: String(row.reason || ''),
      status: String(row.status || '').trim().toUpperCase(),
      requested_by: String(row.requested_by || ''),
      approved_by: String(row.approved_by || ''),
      approved_at: String(row.approved_at || ''),
      created_at: String(row.created_at || ''),
    };
  }

  return Object.freeze({
    approve: approve,
    create: create,
    getLatestAdjustment: getLatestAdjustment,
    listApproved: listApproved,
    listLatest: listLatest,
    reject: reject,
  });
})();
