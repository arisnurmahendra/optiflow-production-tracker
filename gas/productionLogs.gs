var OptiflowProductionLogs = (function () {
  var RAW_LOGS = 'RAW_LOGS';
  var QUARANTINE = 'QUARANTINE';
  var CONFLICT_REASON = 'MACHINE_OPERATOR_TIME_COLLISION';

  function submit(payload, session) {
    var now = new Date().toISOString();
    var operatorEmail = resolveOperatorEmail(payload.metadata.operator_email, session);
    var duplicate = findRawLogByTransactionId(payload.metadata.transaction_id);

    if (duplicate) {
      OptiflowAudit.write('PRODUCTION_REPORT_DUPLICATE', session, {
        transaction_id: payload.metadata.transaction_id,
        status: duplicate.status || 'DUPLICATE',
      });

      return OptiflowResponse.success({
        transaction_id: payload.metadata.transaction_id,
        status: duplicate.status || 'DUPLICATE',
        duplicate: true,
        appended: false,
        quarantine_id: '',
      });
    }

    var conflict = findMachineOperatorTimeConflict(payload, operatorEmail);
    var status = conflict ? 'CONFLICT_PENDING' : 'ACCEPTED';
    var record = buildRawLogRecord(payload, operatorEmail, now, status);

    OptiflowSheets.appendRecord(RAW_LOGS, record);

    var quarantineId = '';
    if (conflict) {
      quarantineId = Utilities.getUuid();
      OptiflowSheets.appendRecord(QUARANTINE, {
        quarantine_id: quarantineId,
        transaction_id: payload.metadata.transaction_id,
        reason_code: CONFLICT_REASON,
        payload_json: JSON.stringify({
          current: record,
          conflict_with: {
            transaction_id: conflict.transaction_id,
            operator_email: conflict.operator_email,
            device_timestamp: conflict.device_timestamp,
            machine_id: conflict.machine_id,
          },
        }),
        status: 'CONFLICT_PENDING',
        reviewed_by: '',
        reviewed_at: '',
        notes: 'Auto-flagged by machine/operator/time conflict rule.',
      });
    }

    OptiflowAudit.write(conflict ? 'PRODUCTION_REPORT_CONFLICT_PENDING' : 'PRODUCTION_REPORT_ACCEPTED', session, {
      transaction_id: payload.metadata.transaction_id,
      machine_id: payload.payload.machine_id,
      sync_type: payload.metadata.sync_type,
      status: status,
      quarantine_id: quarantineId,
    });

    return OptiflowResponse.success({
      transaction_id: payload.metadata.transaction_id,
      status: status,
      duplicate: false,
      appended: true,
      quarantine_id: quarantineId,
      server_received_at: now,
    });
  }

  function buildRawLogRecord(payload, operatorEmail, serverReceivedAt, status) {
    return {
      transaction_id: payload.metadata.transaction_id,
      device_timestamp: payload.metadata.device_timestamp,
      server_received_at: serverReceivedAt,
      sync_type: payload.metadata.sync_type,
      operator_email: operatorEmail,
      client_version: payload.metadata.client_version,
      factory_date: getFactoryDate(payload.metadata.device_timestamp),
      line_id: payload.payload.line_id,
      shift_id: payload.payload.shift_id,
      machine_id: payload.payload.machine_id,
      target_harian: payload.payload.target_harian,
      tandon: payload.payload.tandon,
      perolehan_ok: payload.payload.perolehan_ok,
      perolehan_reject: payload.payload.perolehan_reject,
      defect_category_id: payload.payload.defect_category_id,
      defect_notes: payload.payload.defect_notes,
      status: status,
    };
  }

  function findRawLogByTransactionId(transactionId) {
    var rows = OptiflowSheets.getRows(RAW_LOGS);

    for (var index = 0; index < rows.length; index += 1) {
      if (String(rows[index].transaction_id || '').trim().toLowerCase() === transactionId) {
        return rows[index];
      }
    }

    return null;
  }

  function findMachineOperatorTimeConflict(payload, operatorEmail) {
    var rows = OptiflowSheets.getRows(RAW_LOGS);
    var deviceTime = new Date(payload.metadata.device_timestamp).getTime();
    var windowMs = OPTIFLOW_PRODUCTION_LOGS.conflict_window_minutes * 60 * 1000;

    for (var index = rows.length - 1; index >= 0; index -= 1) {
      var row = rows[index];

      if (String(row.machine_id || '').trim().toUpperCase() !== payload.payload.machine_id) {
        continue;
      }

      if (String(row.operator_email || '').trim().toLowerCase() === operatorEmail) {
        continue;
      }

      if (['ACCEPTED', 'CONFLICT_PENDING', 'QUARANTINED'].indexOf(String(row.status || '').trim().toUpperCase()) === -1) {
        continue;
      }

      var rowTime = new Date(row.device_timestamp).getTime();
      if (!isNaN(rowTime) && Math.abs(deviceTime - rowTime) <= windowMs) {
        return row;
      }
    }

    return null;
  }

  function resolveOperatorEmail(payloadEmail, session) {
    if (session && session.auth_mode === OPTIFLOW_AUTH_MODES.ON) {
      return session.email;
    }

    return payloadEmail;
  }

  function getFactoryDate(timestamp) {
    return Utilities.formatDate(new Date(timestamp), OPTIFLOW_APP.timezone, 'yyyy-MM-dd');
  }

  return Object.freeze({
    submit: submit,
  });
})();
