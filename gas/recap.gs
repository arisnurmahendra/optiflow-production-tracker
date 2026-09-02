var OptiflowRecap = (function () {
  var RAW_LOGS = 'RAW_LOGS';
  var MASTER_RECAP = 'MASTER_RECAP';

  function run(payload, session) {
    var filter = payload.filter || {};
    var now = new Date().toISOString();
    var cleanRows = getCleanProductionRows(filter);
    var grouped = {};

    cleanRows.forEach(function (row) {
      var key = buildGroupKey(row);
      if (!grouped[key]) {
        grouped[key] = createRecapBucket(row);
      }

      addProductionToBucket(grouped[key], row);
    });

    OptiflowAdjustments.listApproved(filter).forEach(function (adjustment) {
      applyAdjustment(grouped, adjustment);
    });

    var recaps = Object.keys(grouped).map(function (key) {
      return finalizeBucket(grouped[key], now);
    });

    OptiflowSheets.replaceDataRows(MASTER_RECAP, recaps, function (row) {
      return matchesScope(row, filter);
    });

    OptiflowAudit.write('MASTER_RECAP_GENERATED', session, {
      scope: JSON.stringify(filter),
      rows: recaps.length,
    });

    return OptiflowResponse.success({
      generated_at: now,
      rows_written: recaps.length,
      scope: filter,
    });
  }

  function getCleanProductionRows(filter) {
    var approvedTransactions = buildApprovedQuarantineMap();

    return OptiflowSheets.getRows(RAW_LOGS).filter(function (row) {
      var status = String(row.status || '').trim().toUpperCase();
      var transactionId = String(row.transaction_id || '').trim().toLowerCase();
      var allowed = status === 'ACCEPTED' || approvedTransactions[transactionId] === true;

      return allowed && matchesScope(row, filter || {});
    });
  }

  function buildApprovedQuarantineMap() {
    var latest = {};

    OptiflowSheets.getRows('QUARANTINE').forEach(function (row) {
      latest[String(row.transaction_id || '').trim().toLowerCase()] = String(row.status || '').trim().toUpperCase();
    });

    return Object.keys(latest).reduce(function (map, transactionId) {
      map[transactionId] = latest[transactionId] === 'APPROVED';
      return map;
    }, {});
  }

  function createRecapBucket(row) {
    return {
      factory_date: row.factory_date,
      operator_email: String(row.operator_email || '').trim().toLowerCase(),
      line_id: row.line_id,
      shift_id: row.shift_id,
      machine_id: row.machine_id,
      target_total: 0,
      tandon_total: 0,
      ok_total: 0,
      reject_total: 0,
      defects: {},
    };
  }

  function addProductionToBucket(bucket, row) {
    bucket.target_total += toNumber(row.target_harian);
    bucket.tandon_total += toNumber(row.tandon);
    bucket.ok_total += toNumber(row.perolehan_ok);
    bucket.reject_total += toNumber(row.perolehan_reject);

    if (toNumber(row.perolehan_reject) > 0 && row.defect_category_id) {
      var defectId = String(row.defect_category_id || '').trim().toUpperCase();
      bucket.defects[defectId] = (bucket.defects[defectId] || 0) + toNumber(row.perolehan_reject);
    }
  }

  function applyAdjustment(grouped, adjustment) {
    var source = findRawLog(adjustment.source_transaction_id);
    if (!source) {
      return;
    }

    var key = buildGroupKey(source);
    if (!grouped[key]) {
      grouped[key] = createRecapBucket(source);
    }

    var delta = parseDelta(adjustment.delta_json);
    grouped[key].target_total += toNumber(delta.target_harian);
    grouped[key].tandon_total += toNumber(delta.tandon);
    grouped[key].ok_total += toNumber(delta.perolehan_ok);
    grouped[key].reject_total += toNumber(delta.perolehan_reject);

    if (toNumber(delta.perolehan_reject) > 0 && delta.defect_category_id) {
      var defectId = String(delta.defect_category_id || '').trim().toUpperCase();
      grouped[key].defects[defectId] = (grouped[key].defects[defectId] || 0) + toNumber(delta.perolehan_reject);
    }
  }

  function finalizeBucket(bucket, generatedAt) {
    var outputTotal = bucket.ok_total + bucket.reject_total;
    return {
      recap_id: buildRecapId(bucket),
      factory_date: bucket.factory_date,
      operator_email: bucket.operator_email,
      line_id: bucket.line_id,
      shift_id: bucket.shift_id,
      machine_id: bucket.machine_id,
      target_total: bucket.target_total,
      tandon_total: bucket.tandon_total,
      ok_total: bucket.ok_total,
      reject_total: bucket.reject_total,
      defect_rate: outputTotal > 0 ? Math.round((bucket.reject_total / outputTotal) * 10000) / 10000 : 0,
      top_defect_category_id: getTopDefect(bucket.defects),
      generated_at: generatedAt,
    };
  }

  function findRawLog(transactionId) {
    var normalized = String(transactionId || '').trim().toLowerCase();
    return OptiflowSheets.getRows(RAW_LOGS).find(function (row) {
      return String(row.transaction_id || '').trim().toLowerCase() === normalized;
    }) || null;
  }

  function buildGroupKey(row) {
    return [
      row.factory_date,
      String(row.operator_email || '').trim().toLowerCase(),
      row.line_id,
      row.shift_id,
      row.machine_id,
    ].join('|');
  }

  function buildRecapId(bucket) {
    return [
      bucket.factory_date,
      bucket.operator_email,
      bucket.line_id,
      bucket.shift_id,
      bucket.machine_id,
    ].join('_');
  }

  function getTopDefect(defects) {
    return Object.keys(defects).sort(function (a, b) {
      return defects[b] - defects[a] || a.localeCompare(b);
    })[0] || '';
  }

  function matchesScope(row, filter) {
    return (!filter.factory_date || row.factory_date === filter.factory_date)
      && (!filter.line_id || row.line_id === filter.line_id)
      && (!filter.shift_id || row.shift_id === filter.shift_id);
  }

  function parseDelta(value) {
    try {
      return JSON.parse(value || '{}');
    } catch (error) {
      return {};
    }
  }

  function toNumber(value) {
    var numberValue = Number(value || 0);
    return isFinite(numberValue) ? numberValue : 0;
  }

  return Object.freeze({
    getCleanProductionRows: getCleanProductionRows,
    run: run,
  });
})();
