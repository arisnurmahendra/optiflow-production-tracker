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

  function getOperatorDashboard(payload, session) {
    var filter = payload.filter || {};
    var pagination = payload.pagination;
    var period = payload.period || 'DAILY';
    var operatorEmail = session.role === 'Operator' && !session.is_simulated
      ? String(session.email || '').trim().toLowerCase()
      : filter.operator_email || String(session.email || '').trim().toLowerCase();
    var today = filter.factory_date || Utilities.formatDate(new Date(), OPTIFLOW_APP.timezone, 'yyyy-MM-dd');
    var yesterday = shiftFactoryDate(today, -1);
    var scopedFilter = {
      factory_date: '',
      line_id: filter.line_id || '',
      shift_id: filter.shift_id || '',
      machine_id: filter.machine_id || '',
      operator_email: operatorEmail,
      status: '',
    };
    var rawRows = OptiflowRecap.getCleanProductionRows(scopedFilter).filter(function (row) {
      return String(row.status || '').trim().toUpperCase() !== 'CONFLICT_PENDING';
    }).sort(function (a, b) {
      return String(b.device_timestamp || '').localeCompare(String(a.device_timestamp || ''));
    });
    var todayRows = rawRows.filter(function (row) { return row.factory_date === today; });
    var yesterdayRows = rawRows.filter(function (row) { return row.factory_date === yesterday; });
    var todayTotals = summarizeProduction(todayRows);
    var yesterdayTotals = summarizeProduction(yesterdayRows);
    var todayTarget = resolveDashboardTarget({
      factory_date: today,
      line_id: filter.line_id || '',
      shift_id: filter.shift_id || '',
      machine_id: filter.machine_id || '',
      operator_email: operatorEmail,
    }, todayTotals.target);
    var yesterdayTarget = resolveDashboardTarget({
      factory_date: yesterday,
      line_id: filter.line_id || '',
      shift_id: filter.shift_id || '',
      machine_id: filter.machine_id || '',
      operator_email: operatorEmail,
    }, yesterdayTotals.target);

    return OptiflowResponse.success({
      filters: filter,
      period: period,
      pagination: pagination,
      summary: {
        factory_date: today,
        bagian_id: filter.bagian_id || '',
        bagian_name: resolveBagianName(filter.bagian_id || ''),
        work_category_id: filter.work_category_id || '',
        line_id: filter.line_id || '',
        shift_id: filter.shift_id || '',
        machine_id: filter.machine_id || '',
        operator_name_masked: maskEmail(operatorEmail),
        target_today: todayTarget,
        tandon_today: todayTotals.tandon,
        ok_today: todayTotals.ok,
        reject_today: todayTotals.reject,
        target_yesterday: yesterdayTarget,
        tandon_yesterday: yesterdayTotals.tandon,
        ok_yesterday: yesterdayTotals.ok,
        reject_yesterday: yesterdayTotals.reject,
      },
      trend_history: buildOperatorTrendHistory(rawRows, today, period),
      weekly_history: period === 'DAILY' ? buildOperatorTrendHistory(rawRows, today, period) : [],
      recent_submissions: paginate(rawRows, pagination).items.map(toOperatorRecentSubmission),
      sync: {
        draft_status: 'server-side',
        queue_count: 0,
        last_sync_at: new Date().toISOString(),
        status: 'GAS ready',
      },
      pareto: buildOperatorPareto(rawRows),
    });
  }

  function resolveDashboardTarget(filter, fallbackTarget) {
    var target = OptiflowTargetMaster.resolveActiveTarget(filter);
    if (target && target.target_harian > 0) {
      return target.target_harian;
    }

    return fallbackTarget;
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

  function buildOperatorTrendHistory(rows, anchorDate, period) {
    if (period === 'WEEKLY') {
      return buildRollingWeeklyTrend(rows, anchorDate);
    }

    if (period === 'MONTHLY') {
      return buildRollingMonthlyTrend(rows, anchorDate);
    }

    var dates = [];
    for (var dayIndex = 6; dayIndex >= 0; dayIndex -= 1) {
      dates.push(shiftFactoryDate(anchorDate, -dayIndex));
    }

    return dates.map(function (date) {
      var totals = summarizeProduction(rows.filter(function (row) { return row.factory_date === date; }));
      return {
        period: 'DAILY',
        period_start: date,
        period_end: date,
        factory_date: date,
        label: date === anchorDate ? 'Hari ini' : indexLabel(date, anchorDate),
        target: totals.target,
        actual: totals.ok + totals.reject,
        ok: totals.ok,
        reject: totals.reject,
        tandon: totals.tandon,
      };
    });
  }

  function buildRollingWeeklyTrend(rows, anchorDate) {
    var buckets = [];
    for (var weekIndex = 7; weekIndex >= 0; weekIndex -= 1) {
      var end = shiftFactoryDate(anchorDate, -weekIndex * 7);
      var start = shiftFactoryDate(end, -6);
      buckets.push(summarizeTrendBucket(rows, start, end, weekIndex === 0 ? 'Minggu ini' : 'W-' + weekIndex, 'WEEKLY'));
    }
    return buckets;
  }

  function buildRollingMonthlyTrend(rows, anchorDate) {
    var buckets = [];
    for (var monthIndex = 5; monthIndex >= 0; monthIndex -= 1) {
      var monthAnchor = shiftFactoryMonth(anchorDate, -monthIndex);
      var start = monthStart(monthAnchor);
      var end = monthEnd(monthAnchor);
      buckets.push(summarizeTrendBucket(rows, start, end, monthIndex === 0 ? 'Bulan ini' : monthAnchor.slice(0, 7), 'MONTHLY'));
    }
    return buckets;
  }

  function summarizeTrendBucket(rows, startDate, endDate, periodLabel, period) {
    var totals = summarizeProduction(rows.filter(function (row) {
      return row.factory_date >= startDate && row.factory_date <= endDate;
    }));

    return {
      period: period,
      period_start: startDate,
      period_end: endDate,
      factory_date: endDate,
      label: periodLabel,
      target: totals.target,
      actual: totals.ok + totals.reject,
      ok: totals.ok,
      reject: totals.reject,
      tandon: totals.tandon,
    };
  }

  function buildOperatorPareto(rows) {
    var categoryMap = {};
    OptiflowSheets.getRows('DEFECT_CATEGORIES').forEach(function (row) {
      categoryMap[String(row.defect_category_id || '').trim().toUpperCase()] = row;
    });
    var buckets = {};
    rows.forEach(function (row) {
      var defectId = String(row.defect_category_id || '').trim().toUpperCase();
      var rejectTotal = toNumber(row.perolehan_reject);
      if (!defectId || rejectTotal <= 0) {
        return;
      }
      buckets[defectId] = (buckets[defectId] || 0) + rejectTotal;
    });
    var totalReject = Object.keys(buckets).reduce(function (total, defectId) {
      return total + buckets[defectId];
    }, 0);

    return Object.keys(buckets).map(function (defectId) {
      var category = categoryMap[defectId] || {};
      return {
        defect_category_id: defectId,
        defect_name: String(category.defect_name || defectId),
        reject_total: buckets[defectId],
        pareto_percent: totalReject > 0 ? Math.round((buckets[defectId] / totalReject) * 1000) / 10 : 0,
        qcc_factor: String(category.qcc_factor || ''),
        severity: String(category.severity || ''),
      };
    }).sort(function (a, b) {
      return b.reject_total - a.reject_total || a.defect_category_id.localeCompare(b.defect_category_id);
    });
  }

  function summarizeProduction(rows) {
    var targetByDate = {};
    var summary = rows.reduce(function (summary, row) {
      var target = toNumber(row.target_harian);
      if (target > 0) {
        var key = String(row.factory_date || row.device_timestamp || 'unknown-date').slice(0, 10);
        targetByDate[key] = Math.max(targetByDate[key] || 0, target);
      }
      summary.tandon += toNumber(row.tandon);
      summary.ok += toNumber(row.perolehan_ok);
      summary.reject += toNumber(row.perolehan_reject);
      return summary;
    }, {
      target: 0,
      tandon: 0,
      ok: 0,
      reject: 0,
    });
    summary.target = Object.keys(targetByDate).reduce(function (total, key) {
      return total + targetByDate[key];
    }, 0);
    return summary;
  }

  function toOperatorRecentSubmission(row) {
    return {
      transaction_id: String(row.transaction_id || ''),
      device_timestamp: String(row.device_timestamp || ''),
      bagian_id: String(row.bagian_id || ''),
      work_category_id: String(row.work_category_id || ''),
      line_id: String(row.line_id || ''),
      shift_id: String(row.shift_id || ''),
      machine_id: String(row.machine_id || ''),
      target_harian: toNumber(row.target_harian),
      tandon: toNumber(row.tandon),
      perolehan_ok: toNumber(row.perolehan_ok),
      perolehan_reject: toNumber(row.perolehan_reject),
      defect_category_id: String(row.defect_category_id || ''),
      status: String(row.status || ''),
    };
  }

  function resolveBagianName(bagianId) {
    var normalizedId = String(bagianId || '').trim().toUpperCase();
    if (!normalizedId) {
      return '';
    }

    var rows = OptiflowSheets.getRows('BAGIAN_MASTER');
    for (var index = 0; index < rows.length; index += 1) {
      if (String(rows[index].bagian_id || '').trim().toUpperCase() === normalizedId) {
        return String(rows[index].bagian_name || normalizedId);
      }
    }

    return normalizedId;
  }

  function shiftFactoryDate(dateString, offsetDays) {
    var date = new Date(dateString + 'T00:00:00Z');
    date.setUTCDate(date.getUTCDate() + offsetDays);
    return Utilities.formatDate(date, 'UTC', 'yyyy-MM-dd');
  }

  function shiftFactoryMonth(dateString, offsetMonths) {
    var date = new Date(dateString + 'T00:00:00Z');
    date.setUTCMonth(date.getUTCMonth() + offsetMonths, 1);
    return Utilities.formatDate(date, 'UTC', 'yyyy-MM-dd');
  }

  function monthStart(dateString) {
    return String(dateString).slice(0, 7) + '-01';
  }

  function monthEnd(dateString) {
    var date = new Date(String(dateString).slice(0, 7) + '-01T00:00:00Z');
    date.setUTCMonth(date.getUTCMonth() + 1, 0);
    return Utilities.formatDate(date, 'UTC', 'yyyy-MM-dd');
  }

  function indexLabel(date, anchorDate) {
    if (date === shiftFactoryDate(anchorDate, -1)) {
      return 'Kemarin';
    }

    return String(date).slice(5);
  }

  function maskEmail(email) {
    var parts = String(email || '').split('@');
    if (parts.length !== 2 || !parts[0]) {
      return 'Operator';
    }

    return parts[0].slice(0, 2) + '***@' + parts[1];
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
        && (!filter.bagian_id || row.bagian_id === filter.bagian_id)
        && (!filter.work_category_id || row.work_category_id === filter.work_category_id)
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
    getOperatorDashboard: getOperatorDashboard,
    getSupervisorControlCenter: getSupervisorControlCenter,
  });
})();
