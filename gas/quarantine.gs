var OptiflowQuarantine = (function () {
  var RAW_LOGS = 'RAW_LOGS';
  var QUARANTINE = 'QUARANTINE';

  function evaluateProductionReport(record) {
    var conflict = findMachineOperatorTimeConflict(record);

    if (!conflict) {
      return {
        requires_quarantine: false,
        status: 'ACCEPTED',
        reason_code: '',
        conflict_with: null,
      };
    }

    return {
      requires_quarantine: true,
      status: 'CONFLICT_PENDING',
      reason_code: OPTIFLOW_QUARANTINE_REASONS.MACHINE_OPERATOR_TIME_COLLISION,
      conflict_with: conflict,
    };
  }

  function routeProductionReport(record, decision, session) {
    if (!decision || !decision.requires_quarantine) {
      return {
        quarantine_id: '',
      };
    }

    var quarantineId = Utilities.getUuid();

    OptiflowSheets.appendRecord(QUARANTINE, {
      quarantine_id: quarantineId,
      transaction_id: record.transaction_id,
      reason_code: decision.reason_code,
      payload_json: JSON.stringify(buildSafePayload(record, decision.conflict_with)),
      status: decision.status,
      reviewed_by: '',
      reviewed_at: '',
      notes: 'Auto-routed by backend quarantine rule.',
    });

    OptiflowAudit.write('QUARANTINE_ROUTED', session, {
      quarantine_id: quarantineId,
      transaction_id: record.transaction_id,
      reason_code: decision.reason_code,
      status: decision.status,
      conflict_transaction_id: decision.conflict_with ? decision.conflict_with.transaction_id : '',
    });

    return {
      quarantine_id: quarantineId,
    };
  }

  function findMachineOperatorTimeConflict(record) {
    var rows = OptiflowSheets.getRows(RAW_LOGS);
    var deviceTime = new Date(record.device_timestamp).getTime();
    var windowMs = OPTIFLOW_PRODUCTION_LOGS.conflict_window_minutes * 60 * 1000;

    for (var index = rows.length - 1; index >= 0; index -= 1) {
      var row = rows[index];

      if (String(row.transaction_id || '').trim().toLowerCase() === record.transaction_id) {
        continue;
      }

      if (String(row.machine_id || '').trim().toUpperCase() !== record.machine_id) {
        continue;
      }

      if (String(row.operator_email || '').trim().toLowerCase() === record.operator_email) {
        continue;
      }

      if (['ACCEPTED', 'CONFLICT_PENDING', 'QUARANTINED'].indexOf(String(row.status || '').trim().toUpperCase()) === -1) {
        continue;
      }

      var rowTime = new Date(row.device_timestamp).getTime();
      if (!isNaN(rowTime) && Math.abs(deviceTime - rowTime) <= windowMs) {
        return {
          transaction_id: String(row.transaction_id || ''),
          operator_email: String(row.operator_email || '').trim().toLowerCase(),
          device_timestamp: new Date(row.device_timestamp).toISOString(),
          machine_id: String(row.machine_id || '').trim().toUpperCase(),
          status: String(row.status || '').trim().toUpperCase(),
        };
      }
    }

    return null;
  }

  function buildSafePayload(record, conflict) {
    return {
      current: {
        transaction_id: record.transaction_id,
        device_timestamp: record.device_timestamp,
        operator_email_masked: maskEmail(record.operator_email),
        line_id: record.line_id,
        shift_id: record.shift_id,
        machine_id: record.machine_id,
        status: record.status,
      },
      conflict_with: conflict ? {
        transaction_id: conflict.transaction_id,
        device_timestamp: conflict.device_timestamp,
        operator_email_masked: maskEmail(conflict.operator_email),
        machine_id: conflict.machine_id,
        status: conflict.status,
      } : null,
    };
  }

  function maskEmail(email) {
    var normalized = String(email || '').trim().toLowerCase();
    var parts = normalized.split('@');

    if (parts.length !== 2 || parts[0].length === 0) {
      return '[MASKED]';
    }

    return parts[0].slice(0, 2) + '***@' + parts[1];
  }

  return Object.freeze({
    evaluateProductionReport: evaluateProductionReport,
    routeProductionReport: routeProductionReport,
  });
})();
