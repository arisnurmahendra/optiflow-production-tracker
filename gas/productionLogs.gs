var OptiflowProductionLogs = (function () {
  var RAW_LOGS = 'RAW_LOGS';

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

    var record = buildRawLogRecord(payload, operatorEmail, now, 'ACCEPTED');
    assertActiveDefectCategory(record);
    var quarantineDecision = OptiflowQuarantine.evaluateProductionReport(record);
    record.status = quarantineDecision.status;

    OptiflowSheets.appendRecord(RAW_LOGS, record);

    var quarantineRoute = OptiflowQuarantine.routeProductionReport(record, quarantineDecision, session);
    var quarantineId = quarantineRoute.quarantine_id;

    OptiflowAudit.write(quarantineDecision.requires_quarantine ? 'PRODUCTION_REPORT_CONFLICT_PENDING' : 'PRODUCTION_REPORT_ACCEPTED', session, {
      transaction_id: payload.metadata.transaction_id,
      machine_id: payload.payload.machine_id,
      sync_type: payload.metadata.sync_type,
      status: record.status,
      quarantine_id: quarantineId,
    });

    return OptiflowResponse.success({
      transaction_id: payload.metadata.transaction_id,
      status: record.status,
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

  function assertActiveDefectCategory(record) {
    if (Number(record.perolehan_reject || 0) <= 0) {
      return;
    }

    var exists = OptiflowSheets.getRows('DEFECT_CATEGORIES').some(function (category) {
      return String(category.defect_category_id || '').trim().toUpperCase() === String(record.defect_category_id || '').trim().toUpperCase()
        && isTruthy(category.status_aktif);
    });

    if (!exists) {
      throw new Error('Defect category is not active or not found.');
    }
  }

  function isTruthy(value) {
    return value === true || String(value).toUpperCase() === 'TRUE';
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
