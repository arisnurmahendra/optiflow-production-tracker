var OptiflowDailyClosing = (function () {
  var DAILY_CLOSING = 'DAILY_CLOSING';
  var RAW_LOGS = 'RAW_LOGS';
  var QUARANTINE = 'QUARANTINE';

  function close(payload, session) {
    var latest = getLatestClosing(payload.factory_date, payload.line_id, payload.shift_id);

    if (latest && latest.status === 'CLOSED') {
      return OptiflowResponse.success({
        closing_id: latest.closing_id,
        status: latest.status,
        duplicate: true,
      });
    }

    if (hasPendingQuarantine(payload.factory_date, payload.line_id, payload.shift_id)) {
      throw new Error('Daily closing blocked: pending quarantine exists for this line/shift/date.');
    }

    var now = new Date().toISOString();
    var closingId = buildClosingId(payload.factory_date, payload.line_id, payload.shift_id);
    OptiflowSheets.appendRecord(DAILY_CLOSING, {
      closing_id: closingId,
      factory_date: payload.factory_date,
      line_id: payload.line_id,
      shift_id: payload.shift_id,
      status: 'CLOSED',
      closed_by: session.email,
      closed_at: now,
      reopened_by: '',
      reopened_at: '',
      notes: payload.notes,
    });

    OptiflowAudit.write('DAILY_CLOSING_CLOSED', session, {
      closing_id: closingId,
      factory_date: payload.factory_date,
      line_id: payload.line_id,
      shift_id: payload.shift_id,
    });

    return OptiflowResponse.success({
      closing_id: closingId,
      status: 'CLOSED',
      duplicate: false,
      closed_at: now,
    });
  }

  function reopen(payload, session) {
    var latest = getLatestClosing(payload.factory_date, payload.line_id, payload.shift_id);

    if (!latest || latest.status !== 'CLOSED') {
      throw new Error('Daily closing cannot be reopened because the latest status is not CLOSED.');
    }

    var now = new Date().toISOString();
    var closingId = buildClosingId(payload.factory_date, payload.line_id, payload.shift_id);
    OptiflowSheets.appendRecord(DAILY_CLOSING, {
      closing_id: closingId,
      factory_date: payload.factory_date,
      line_id: payload.line_id,
      shift_id: payload.shift_id,
      status: 'REOPENED',
      closed_by: latest.closed_by || '',
      closed_at: latest.closed_at || '',
      reopened_by: session.email,
      reopened_at: now,
      notes: payload.notes,
    });

    OptiflowAudit.write('DAILY_CLOSING_REOPENED', session, {
      closing_id: closingId,
      factory_date: payload.factory_date,
      line_id: payload.line_id,
      shift_id: payload.shift_id,
    });

    return OptiflowResponse.success({
      closing_id: closingId,
      status: 'REOPENED',
      reopened_at: now,
    });
  }

  function isClosed(factoryDate, lineId, shiftId) {
    var latest = getLatestClosing(factoryDate, lineId, shiftId);
    return Boolean(latest && latest.status === 'CLOSED');
  }

  function listLatest(filter) {
    var latestById = {};
    OptiflowSheets.getRows(DAILY_CLOSING).forEach(function (row) {
      if (!matchesScope(row, filter || {})) {
        return;
      }

      latestById[row.closing_id] = normalizeClosing(row);
    });

    return Object.keys(latestById).map(function (key) {
      return latestById[key];
    }).sort(function (a, b) {
      return String(b.closed_at || b.reopened_at).localeCompare(String(a.closed_at || a.reopened_at));
    });
  }

  function getLatestClosing(factoryDate, lineId, shiftId) {
    var closingId = buildClosingId(factoryDate, lineId, shiftId);
    var latest = null;

    OptiflowSheets.getRows(DAILY_CLOSING).forEach(function (row) {
      if (String(row.closing_id || '') === closingId) {
        latest = normalizeClosing(row);
      }
    });

    return latest;
  }

  function hasPendingQuarantine(factoryDate, lineId, shiftId) {
    var rawByTransactionId = {};
    OptiflowSheets.getRows(RAW_LOGS).forEach(function (row) {
      rawByTransactionId[String(row.transaction_id || '').trim().toLowerCase()] = row;
    });

    var latestByQuarantineId = {};
    OptiflowSheets.getRows(QUARANTINE).forEach(function (row) {
      latestByQuarantineId[String(row.quarantine_id || '').trim()] = row;
    });

    return Object.keys(latestByQuarantineId).some(function (quarantineId) {
      var row = latestByQuarantineId[quarantineId];
      var status = String(row.status || '').trim().toUpperCase();
      var raw = rawByTransactionId[String(row.transaction_id || '').trim().toLowerCase()];

      return ['PENDING', 'CONFLICT_PENDING', 'CORRECTION_REQUESTED'].indexOf(status) !== -1
        && raw
        && raw.factory_date === factoryDate
        && raw.line_id === lineId
        && raw.shift_id === shiftId;
    });
  }

  function matchesScope(row, filter) {
    return (!filter.factory_date || row.factory_date === filter.factory_date)
      && (!filter.line_id || row.line_id === filter.line_id)
      && (!filter.shift_id || row.shift_id === filter.shift_id);
  }

  function buildClosingId(factoryDate, lineId, shiftId) {
    return [factoryDate, lineId, shiftId].join('_');
  }

  function normalizeClosing(row) {
    return {
      closing_id: String(row.closing_id || ''),
      factory_date: String(row.factory_date || ''),
      line_id: String(row.line_id || ''),
      shift_id: String(row.shift_id || ''),
      status: String(row.status || '').trim().toUpperCase(),
      closed_by: String(row.closed_by || ''),
      closed_at: String(row.closed_at || ''),
      reopened_by: String(row.reopened_by || ''),
      reopened_at: String(row.reopened_at || ''),
      notes: String(row.notes || ''),
    };
  }

  return Object.freeze({
    close: close,
    getLatestClosing: getLatestClosing,
    isClosed: isClosed,
    listLatest: listLatest,
    reopen: reopen,
  });
})();
