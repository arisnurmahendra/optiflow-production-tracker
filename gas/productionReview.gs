var OptiflowProductionReview = (function () {
  var ADJUSTMENT_LOGS = 'ADJUSTMENT_LOGS';
  var RAW_LOGS = 'RAW_LOGS';
  var PRE_CLOSING_TYPES = ['VOID', 'REQUEST_CORRECTION', 'PRE_CLOSING_CORRECTION'];

  function create(payload, session) {
    var source = findRawLog(payload.source_transaction_id);

    if (!source) {
      throw new Error('Production review source transaction was not found.');
    }

    if (OptiflowDailyClosing.isClosed(source.factory_date, source.line_id, source.shift_id)) {
      throw new Error('Production review is only allowed before daily closing.');
    }

    var sourceStatus = String(source.status || '').trim().toUpperCase();
    if (sourceStatus !== 'ACCEPTED') {
      throw new Error('Production review only accepts normal ACCEPTED production rows.');
    }

    var existing = getLatestBySource(payload.source_transaction_id);
    if (existing && isSameBlockingAction(existing, payload.action)) {
      return OptiflowResponse.success({
        adjustment_id: existing.adjustment_id,
        source_transaction_id: existing.source_transaction_id,
        action: existing.adjustment_type,
        status: existing.status,
        duplicate: true,
      });
    }

    var now = new Date().toISOString();
    var status = payload.action === 'REQUEST_CORRECTION' ? 'PENDING' : 'APPROVED';
    var reviewId = Utilities.getUuid();

    OptiflowSheets.appendRecord(ADJUSTMENT_LOGS, {
      adjustment_id: reviewId,
      source_transaction_id: payload.source_transaction_id,
      factory_date: source.factory_date,
      line_id: source.line_id,
      shift_id: source.shift_id,
      adjustment_type: payload.action,
      delta_json: JSON.stringify(payload.delta || {}),
      reason: payload.reason,
      status: status,
      requested_by: session.email,
      approved_by: status === 'APPROVED' ? session.email : '',
      approved_at: status === 'APPROVED' ? now : '',
      created_at: now,
    });

    OptiflowAudit.write('PRODUCTION_REVIEW_CREATED', session, {
      adjustment_id: reviewId,
      source_transaction_id: payload.source_transaction_id,
      action: payload.action,
      status: status,
    });

    return OptiflowResponse.success({
      adjustment_id: reviewId,
      source_transaction_id: payload.source_transaction_id,
      action: payload.action,
      status: status,
      created_at: now,
      duplicate: false,
    });
  }

  function getLatestBySource(transactionId) {
    var normalized = String(transactionId || '').trim().toLowerCase();
    var latest = null;

    OptiflowAdjustments.listLatest({}).forEach(function (row) {
      if (
        row.source_transaction_id === normalized
        && PRE_CLOSING_TYPES.indexOf(row.adjustment_type) !== -1
        && (!latest || String(row.approved_at || row.created_at).localeCompare(String(latest.approved_at || latest.created_at)) >= 0)
      ) {
        latest = row;
      }
    });

    return latest;
  }

  function isReviewType(type) {
    return PRE_CLOSING_TYPES.indexOf(String(type || '').trim().toUpperCase()) !== -1;
  }

  function isSameBlockingAction(existing, action) {
    if (existing.adjustment_type !== action) {
      return false;
    }

    if (action === 'PRE_CLOSING_CORRECTION') {
      return false;
    }

    return existing.status === 'PENDING' || existing.status === 'APPROVED';
  }

  function findRawLog(transactionId) {
    var normalized = String(transactionId || '').trim().toLowerCase();
    return OptiflowSheets.getRows(RAW_LOGS).find(function (row) {
      return String(row.transaction_id || '').trim().toLowerCase() === normalized;
    }) || null;
  }

  return Object.freeze({
    create: create,
    getLatestBySource: getLatestBySource,
    isReviewType: isReviewType,
  });
})();
