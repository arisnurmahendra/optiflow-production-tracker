var OptiflowDashboard = (function () {
  function getSupervisorControlCenter(payload) {
    var filter = payload.filter || {};
    var pagination = payload.pagination;
    var rawLogs = filterRows(OptiflowSheets.getRows('RAW_LOGS'), filter);
    var quarantine = filterRows(joinQuarantineScope(OptiflowSheets.getRows('QUARANTINE')), filter);
    var closings = OptiflowDailyClosing.listLatest(filter);
    var adjustments = OptiflowAdjustments.listLatest(filter);

    return OptiflowResponse.success({
      filters: filter,
      pagination: pagination,
      summary: {
        total_raw_logs: rawLogs.length,
        pending_quarantine: quarantine.filter(function (row) {
          return ['PENDING', 'CONFLICT_PENDING', 'CORRECTION_REQUESTED'].indexOf(row.status) !== -1;
        }).length,
        closed_scopes: closings.filter(function (row) { return row.status === 'CLOSED'; }).length,
        pending_adjustments: adjustments.filter(function (row) { return row.status === 'PENDING'; }).length,
      },
      raw_logs: paginate(rawLogs, pagination),
      quarantine: paginate(quarantine, pagination),
      daily_closing: paginate(closings, pagination),
      adjustments: paginate(adjustments, pagination),
    });
  }

  function getManagementDashboard(payload) {
    var filter = payload.filter || {};
    var pagination = payload.pagination;
    var recapRows = filterRows(OptiflowSheets.getRows('MASTER_RECAP'), filter);
    var totals = recapRows.reduce(function (summary, row) {
      summary.target_total += toNumber(row.target_total);
      summary.tandon_total += toNumber(row.tandon_total);
      summary.ok_total += toNumber(row.ok_total);
      summary.reject_total += toNumber(row.reject_total);
      return summary;
    }, {
      target_total: 0,
      tandon_total: 0,
      ok_total: 0,
      reject_total: 0,
    });
    var outputTotal = totals.ok_total + totals.reject_total;
    var pareto = buildPareto(recapRows);

    return OptiflowResponse.success({
      filters: filter,
      pagination: pagination,
      summary: {
        target_total: totals.target_total,
        tandon_total: totals.tandon_total,
        ok_total: totals.ok_total,
        reject_total: totals.reject_total,
        defect_rate: outputTotal > 0 ? Math.round((totals.reject_total / outputTotal) * 10000) / 10000 : 0,
        pending_quarantine: countPendingQuarantine(filter),
        open_closing: countOpenClosingSignal(filter),
      },
      pareto: pareto,
      rows: paginate(recapRows, pagination),
    });
  }

  function joinQuarantineScope(rows) {
    var rawByTransactionId = {};
    OptiflowSheets.getRows('RAW_LOGS').forEach(function (row) {
      rawByTransactionId[String(row.transaction_id || '').trim().toLowerCase()] = row;
    });

    return rows.map(function (row) {
      var raw = rawByTransactionId[String(row.transaction_id || '').trim().toLowerCase()] || {};
      return {
        quarantine_id: String(row.quarantine_id || ''),
        transaction_id: String(row.transaction_id || ''),
        reason_code: String(row.reason_code || ''),
        status: String(row.status || '').trim().toUpperCase(),
        reviewed_by: String(row.reviewed_by || ''),
        reviewed_at: String(row.reviewed_at || ''),
        notes: String(row.notes || ''),
        factory_date: String(raw.factory_date || ''),
        line_id: String(raw.line_id || ''),
        shift_id: String(raw.shift_id || ''),
        machine_id: String(raw.machine_id || ''),
      };
    });
  }

  function buildPareto(rows) {
    var buckets = {};
    rows.forEach(function (row) {
      var defectId = String(row.top_defect_category_id || '').trim().toUpperCase();
      if (!defectId || toNumber(row.reject_total) <= 0) {
        return;
      }
      buckets[defectId] = (buckets[defectId] || 0) + toNumber(row.reject_total);
    });

    var totalReject = Object.keys(buckets).reduce(function (total, defectId) {
      return total + buckets[defectId];
    }, 0);

    return Object.keys(buckets).map(function (defectId) {
      return {
        defect_category_id: defectId,
        reject_total: buckets[defectId],
        pareto_percent: totalReject > 0 ? Math.round((buckets[defectId] / totalReject) * 1000) / 10 : 0,
      };
    }).sort(function (a, b) {
      return b.reject_total - a.reject_total || a.defect_category_id.localeCompare(b.defect_category_id);
    });
  }

  function countPendingQuarantine(filter) {
    return filterRows(joinQuarantineScope(OptiflowSheets.getRows('QUARANTINE')), filter).filter(function (row) {
      return ['PENDING', 'CONFLICT_PENDING', 'CORRECTION_REQUESTED'].indexOf(row.status) !== -1;
    }).length;
  }

  function countOpenClosingSignal(filter) {
    var latest = OptiflowDailyClosing.listLatest(filter);
    if (latest.length === 0) {
      return filter.factory_date && filter.line_id && filter.shift_id ? 1 : 0;
    }
    return latest.filter(function (row) { return row.status !== 'CLOSED'; }).length;
  }

  function filterRows(rows, filter) {
    return rows.filter(function (row) {
      return (!filter.factory_date || row.factory_date === filter.factory_date)
        && (!filter.line_id || row.line_id === filter.line_id)
        && (!filter.shift_id || row.shift_id === filter.shift_id)
        && (!filter.machine_id || row.machine_id === filter.machine_id)
        && (!filter.operator_email || String(row.operator_email || '').trim().toLowerCase() === filter.operator_email)
        && (!filter.status || String(row.status || '').trim().toUpperCase() === filter.status);
    });
  }

  function paginate(rows, pagination) {
    var page = pagination.page;
    var pageSize = pagination.page_size;
    var start = (page - 1) * pageSize;

    return {
      page: page,
      page_size: pageSize,
      total: rows.length,
      items: rows.slice(start, start + pageSize),
    };
  }

  function toNumber(value) {
    var numberValue = Number(value || 0);
    return isFinite(numberValue) ? numberValue : 0;
  }

  return Object.freeze({
    getManagementDashboard: getManagementDashboard,
    getSupervisorControlCenter: getSupervisorControlCenter,
  });
})();
