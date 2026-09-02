const DEFAULT_LATENCY_MS = 180;
const DEFAULT_FAILURE_RATE = 0;

const DEFAULT_PROPERTIES = [
  {
    key: 'AUTH_MODE',
    sensitivity: 'CONFIG',
    status: 'SET',
    readable: true,
    updatable: true,
    deletable: false,
    rotatable: false,
    value_preview: 'OFF',
  },
  {
    key: 'APP_ACTIVE_UNTIL',
    sensitivity: 'CONFIG',
    status: 'SET',
    readable: true,
    updatable: true,
    deletable: true,
    rotatable: false,
    value_preview: '2099-12-31',
  },
  {
    key: 'SPREADSHEET_ID',
    sensitivity: 'CONFIG',
    status: 'SET',
    readable: true,
    updatable: true,
    deletable: true,
    rotatable: false,
    value_preview: '1abc...2345',
  },
  {
    key: 'ENCRYPTION_SALT',
    sensitivity: 'SECRET',
    status: 'SET',
    readable: false,
    updatable: false,
    deletable: false,
    rotatable: true,
    value_preview: '',
  },
];

export function installMockGas(options = {}) {
  const mockGas = createMockGas(options);
  window.__OPTIFLOW_MOCK_GAS__ = mockGas;
  window.google = window.google || {};
  window.google.script = window.google.script || {};
  window.google.script.run = createGoogleScriptRunMock(mockGas);
  return mockGas;
}

export function createMockGas(options = {}) {
  const latencyMs = options.latencyMs ?? DEFAULT_LATENCY_MS;
  const failureRate = options.failureRate ?? DEFAULT_FAILURE_RATE;
  const state = {
    properties: structuredCloneSafe(options.properties || DEFAULT_PROPERTIES),
    rawLogs: [],
    quarantine: [],
    dailyClosing: [],
    adjustments: [],
    masterRecap: [],
    session: options.session || {
      auth_mode: 'OFF',
      email: 'dev.simulated@optiflow.local',
      role: 'SuperAdmin',
      user_id: 'DEV-SuperAdmin',
      is_simulated: true,
      requires_role_selection: false,
      allowed_simulated_roles: ['Operator', 'Mandor', 'Management', 'HRD', 'SuperAdmin'],
    },
  };

  function respond(data, meta = {}) {
    return simulateNetwork({
      ok: true,
      data,
      meta: {
        mocked: true,
        latency_ms: latencyMs,
        ...meta,
      },
      error: null,
    });
  }

  return Object.freeze({
    approveAdjustment: (request = {}) => decideAdjustment(state, request, 'APPROVED', respond),
    approveQuarantine: (request = {}) => decideQuarantine(state, request, 'APPROVED', respond),
    bootstrapSheets: () => respond({
      spreadsheet_id: 'mock-spreadsheet-id',
      created_sheets: [],
      initialized_headers: [],
      schema_health: { valid: true },
    }),
    checkPermission: (request = {}) => respond({
      allowed: state.session.role === 'SuperAdmin',
      resource: request.resource,
      action: request.action,
    }),
    closeDailyClosing: (request = {}) => {
      const existing = latestClosing(state, request);
      if (existing?.status === 'CLOSED') {
        return respond({ closing_id: existing.closing_id, status: 'CLOSED', duplicate: true });
      }

      const closing = {
        closing_id: `${request.factory_date}_${request.line_id}_${request.shift_id}`,
        factory_date: request.factory_date,
        line_id: request.line_id,
        shift_id: request.shift_id,
        status: 'CLOSED',
        closed_by: state.session.email,
        closed_at: new Date().toISOString(),
        notes: request.notes || '',
      };
      state.dailyClosing.push(closing);
      return respond({ ...closing, duplicate: false });
    },
    createAdjustment: (request = {}) => {
      const source = state.rawLogs.find((row) => row.transaction_id === request.source_transaction_id);
      if (!source) {
        throw new Error('Adjustment source transaction was not found.');
      }

      const adjustment = {
        adjustment_id: `00000000-0000-4000-8000-${String(state.adjustments.length + 1).padStart(12, '0')}`,
        source_transaction_id: request.source_transaction_id,
        factory_date: source.factory_date,
        line_id: source.line_id,
        shift_id: source.shift_id,
        adjustment_type: request.adjustment_type,
        delta_json: JSON.stringify(request.delta || {}),
        reason: request.reason || '',
        status: 'PENDING',
        requested_by: state.session.email,
        approved_by: '',
        approved_at: '',
        created_at: new Date().toISOString(),
      };
      state.adjustments.push(adjustment);
      return respond({ adjustment_id: adjustment.adjustment_id, status: adjustment.status, created_at: adjustment.created_at });
    },
    deleteScriptProperty: (request = {}) => {
      const property = findProperty(state, request.key);
      assertMutable(property, 'deletable');
      property.status = 'NOT_SET';
      property.value_preview = '';
      return respond({ property });
    },
    getHealthCheck: () => respond({
      app: 'OPTIFLOW',
      status: 'ok',
      version: '0.1.0',
    }),
    getManagementDashboard: (request = {}) => respond(buildManagementDashboard(state, request)),
    getSchemaHealthCheck: () => respond({
      spreadsheet_id: 'mock-spreadsheet-id',
      valid: true,
      missing_sheets: [],
      invalid_sheets: [],
      raw_logs_formula_count: 0,
      sheets: [],
    }),
    getScriptPropertiesStatus: () => respond({
      properties: structuredCloneSafe(state.properties),
    }),
    getSessionContext: (request = {}) => {
      if (request.simulated_role) {
        state.session = {
          ...state.session,
          role: request.simulated_role,
          user_id: `DEV-${request.simulated_role}`,
        };
      }

      return respond(state.session);
    },
    getSupervisorControlCenter: (request = {}) => respond(buildSupervisorControlCenter(state, request)),
    rejectAdjustment: (request = {}) => decideAdjustment(state, request, 'REJECTED', respond),
    rejectQuarantine: (request = {}) => decideQuarantine(state, request, 'REJECTED', respond),
    requestQuarantineCorrection: (request = {}) => decideQuarantine(state, request, 'CORRECTION_REQUESTED', respond),
    reopenDailyClosing: (request = {}) => {
      const closing = {
        closing_id: `${request.factory_date}_${request.line_id}_${request.shift_id}`,
        factory_date: request.factory_date,
        line_id: request.line_id,
        shift_id: request.shift_id,
        status: 'REOPENED',
        reopened_by: state.session.email,
        reopened_at: new Date().toISOString(),
        notes: request.notes || '',
      };
      state.dailyClosing.push(closing);
      return respond(closing);
    },
    rotateSecretProperty: (request = {}) => {
      const property = findProperty(state, request.key);
      assertMutable(property, 'rotatable');
      property.status = 'SET';
      property.value_preview = '';
      return respond({ property });
    },
    setScriptProperty: (request = {}) => {
      const property = findProperty(state, request.key);
      assertMutable(property, 'updatable');
      validatePropertyValue(property.key, request.value);
      property.status = 'SET';
      property.value_preview = property.sensitivity === 'SECRET' ? '' : maskPreview(property.key, request.value);
      return respond({ property });
    },
    runMasterRecap: (request = {}) => {
      state.masterRecap = buildRecapRows(state, request.filter || {});
      return respond({
        generated_at: new Date().toISOString(),
        rows_written: state.masterRecap.length,
        scope: request.filter || {},
      });
    },
    submitProductionReport: (request = {}) => {
      const existing = state.rawLogs.find((row) =>
        row.transaction_id === request.metadata?.transaction_id,
      );

      if (existing) {
        return respond({
          transaction_id: existing.transaction_id,
          status: existing.status,
          duplicate: true,
          appended: false,
          quarantine_id: '',
        });
      }

      const serverReceivedAt = new Date().toISOString();
      const factoryDate = request.metadata?.device_timestamp
        ? request.metadata.device_timestamp.slice(0, 10)
        : serverReceivedAt.slice(0, 10);
      const conflict = state.rawLogs.find((row) =>
        row.machine_id === request.payload?.machine_id
        && row.operator_email !== request.metadata?.operator_email
        && Math.abs(new Date(row.device_timestamp).getTime() - new Date(request.metadata?.device_timestamp).getTime()) <= 10 * 60 * 1000,
      );
      const status = conflict ? 'CONFLICT_PENDING' : 'ACCEPTED';
      const record = {
        ...request.metadata,
        ...request.payload,
        server_received_at: serverReceivedAt,
        factory_date: factoryDate,
        status,
      };

      state.rawLogs.push(record);

      const quarantineId = conflict ? `mock-quarantine-${state.quarantine.length + 1}` : '';
      if (conflict) {
        state.quarantine.push({
          quarantine_id: quarantineId,
          transaction_id: record.transaction_id,
          reason_code: 'MACHINE_OPERATOR_TIME_COLLISION',
          status: 'CONFLICT_PENDING',
        });
      }

      return respond({
        transaction_id: record.transaction_id,
        status,
        duplicate: false,
        appended: true,
        quarantine_id: quarantineId,
        server_received_at: serverReceivedAt,
      });
    },
  });

  function simulateNetwork(response) {
    return new Promise((resolve, reject) => {
      window.setTimeout(() => {
        if (Math.random() < failureRate) {
          reject(new Error('Mock GAS network failure.'));
          return;
        }

        resolve(response);
      }, latencyMs);
    });
  }
}

function createGoogleScriptRunMock(mockGas) {
  return {
    successHandler: null,
    failureHandler: null,
    withSuccessHandler(handler) {
      this.successHandler = handler;
      return this;
    },
    withFailureHandler(handler) {
      this.failureHandler = handler;
      return this;
    },
    invoke(functionName, payload) {
      mockGas[functionName](payload)
        .then((response) => this.successHandler?.(response))
        .catch((error) => this.failureHandler?.(error));
    },
    bootstrapSheets(payload) { this.invoke('bootstrapSheets', payload); },
    checkPermission(payload) { this.invoke('checkPermission', payload); },
    approveAdjustment(payload) { this.invoke('approveAdjustment', payload); },
    approveQuarantine(payload) { this.invoke('approveQuarantine', payload); },
    closeDailyClosing(payload) { this.invoke('closeDailyClosing', payload); },
    createAdjustment(payload) { this.invoke('createAdjustment', payload); },
    deleteScriptProperty(payload) { this.invoke('deleteScriptProperty', payload); },
    getHealthCheck(payload) { this.invoke('getHealthCheck', payload); },
    getManagementDashboard(payload) { this.invoke('getManagementDashboard', payload); },
    getSchemaHealthCheck(payload) { this.invoke('getSchemaHealthCheck', payload); },
    getScriptPropertiesStatus(payload) { this.invoke('getScriptPropertiesStatus', payload); },
    getSessionContext(payload) { this.invoke('getSessionContext', payload); },
    getSupervisorControlCenter(payload) { this.invoke('getSupervisorControlCenter', payload); },
    rejectAdjustment(payload) { this.invoke('rejectAdjustment', payload); },
    rejectQuarantine(payload) { this.invoke('rejectQuarantine', payload); },
    requestQuarantineCorrection(payload) { this.invoke('requestQuarantineCorrection', payload); },
    reopenDailyClosing(payload) { this.invoke('reopenDailyClosing', payload); },
    rotateSecretProperty(payload) { this.invoke('rotateSecretProperty', payload); },
    runMasterRecap(payload) { this.invoke('runMasterRecap', payload); },
    setScriptProperty(payload) { this.invoke('setScriptProperty', payload); },
    submitProductionReport(payload) { this.invoke('submitProductionReport', payload); },
  };
}

function findProperty(state, key) {
  const property = state.properties.find((item) => item.key === String(key || '').trim().toUpperCase());

  if (!property) {
    throw new Error('Script property key is not allowlisted.');
  }

  return property;
}

function assertMutable(property, flag) {
  if (!property[flag]) {
    throw new Error(`Script property is not ${flag.replace('able', 'able through this endpoint')}.`);
  }
}

function validatePropertyValue(key, value) {
  const text = String(value || '').trim();

  if (key === 'AUTH_MODE' && !['ON', 'OFF'].includes(text.toUpperCase())) {
    throw new Error('AUTH_MODE must be ON or OFF.');
  }

  if (key === 'APP_ACTIVE_UNTIL' && !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error('APP_ACTIVE_UNTIL must use YYYY-MM-DD format.');
  }

  if (key === 'SPREADSHEET_ID' && !/^[A-Za-z0-9_-]{20,}$/.test(text)) {
    throw new Error('SPREADSHEET_ID format is invalid.');
  }
}

function maskPreview(key, value) {
  const text = String(value || '').trim();

  if (key === 'AUTH_MODE' || key === 'APP_ACTIVE_UNTIL') {
    return text;
  }

  if (text.length <= 8) {
    return '***';
  }

  return `${text.slice(0, 4)}...${text.slice(-4)}`;
}

function latestClosing(state, request) {
  return [...state.dailyClosing].reverse().find((row) =>
    row.factory_date === request.factory_date
    && row.line_id === request.line_id
    && row.shift_id === request.shift_id,
  ) || null;
}

function decideQuarantine(state, request, status, respond) {
  const index = state.quarantine.findIndex((row) => row.quarantine_id === request.quarantine_id);
  if (index === -1) {
    throw new Error('Quarantine case was not found.');
  }

  state.quarantine[index] = {
    ...state.quarantine[index],
    status,
    reviewed_by: state.session.email,
    reviewed_at: new Date().toISOString(),
    notes: request.notes || '',
  };

  return respond({
    quarantine_id: request.quarantine_id,
    transaction_id: state.quarantine[index].transaction_id,
    status,
    duplicate: false,
  });
}

function decideAdjustment(state, request, status, respond) {
  const latest = [...state.adjustments].reverse().find((row) => row.adjustment_id === request.adjustment_id);
  if (!latest) {
    throw new Error('Adjustment was not found.');
  }

  const next = {
    ...latest,
    status,
    approved_by: state.session.email,
    approved_at: new Date().toISOString(),
    reason: request.notes || latest.reason,
  };
  state.adjustments.push(next);

  return respond({
    adjustment_id: request.adjustment_id,
    status,
    approved_at: next.approved_at,
    duplicate: false,
  });
}

function buildSupervisorControlCenter(state, request) {
  const filter = request.filter || {};
  const pagination = normalizePagination(request);
  const rawLogs = filterRows(state.rawLogs, filter);
  const quarantine = filterRows(state.quarantine.map((item) => ({
    ...item,
    ...findRawScope(state, item.transaction_id),
  })), filter);
  const dailyClosing = filterRows(state.dailyClosing, filter);
  const adjustments = filterRows(state.adjustments, filter);

  return {
    filters: filter,
    pagination,
    summary: {
      total_raw_logs: rawLogs.length,
      pending_quarantine: quarantine.filter((row) => ['PENDING', 'CONFLICT_PENDING', 'CORRECTION_REQUESTED'].includes(row.status)).length,
      closed_scopes: dailyClosing.filter((row) => row.status === 'CLOSED').length,
      pending_adjustments: adjustments.filter((row) => row.status === 'PENDING').length,
    },
    raw_logs: paginate(rawLogs, pagination),
    quarantine: paginate(quarantine, pagination),
    daily_closing: paginate(dailyClosing, pagination),
    adjustments: paginate(adjustments, pagination),
  };
}

function buildManagementDashboard(state, request) {
  const filter = request.filter || {};
  const pagination = normalizePagination(request);
  const rows = filterRows(state.masterRecap, filter);
  const summary = rows.reduce((total, row) => ({
    target_total: total.target_total + Number(row.target_total || 0),
    tandon_total: total.tandon_total + Number(row.tandon_total || 0),
    ok_total: total.ok_total + Number(row.ok_total || 0),
    reject_total: total.reject_total + Number(row.reject_total || 0),
  }), {
    target_total: 0,
    tandon_total: 0,
    ok_total: 0,
    reject_total: 0,
  });
  const output = summary.ok_total + summary.reject_total;

  return {
    filters: filter,
    pagination,
    summary: {
      ...summary,
      defect_rate: output > 0 ? Math.round((summary.reject_total / output) * 10000) / 10000 : 0,
      pending_quarantine: state.quarantine.filter((row) => ['PENDING', 'CONFLICT_PENDING', 'CORRECTION_REQUESTED'].includes(row.status)).length,
      open_closing: state.dailyClosing.filter((row) => row.status !== 'CLOSED').length,
    },
    pareto: buildPareto(rows),
    rows: paginate(rows, pagination),
  };
}

function buildRecapRows(state, filter) {
  const grouped = new Map();
  filterRows(state.rawLogs, filter)
    .filter((row) => row.status === 'ACCEPTED' || isApprovedQuarantine(state, row.transaction_id))
    .forEach((row) => {
      const key = `${row.factory_date}_${row.operator_email}_${row.line_id}_${row.shift_id}_${row.machine_id}`;
      const current = grouped.get(key) || {
        recap_id: key,
        factory_date: row.factory_date,
        operator_email: row.operator_email,
        line_id: row.line_id,
        shift_id: row.shift_id,
        machine_id: row.machine_id,
        target_total: 0,
        tandon_total: 0,
        ok_total: 0,
        reject_total: 0,
        top_defect_category_id: '',
        generated_at: new Date().toISOString(),
      };
      current.target_total += Number(row.target_harian || 0);
      current.tandon_total += Number(row.tandon || 0);
      current.ok_total += Number(row.perolehan_ok || 0);
      current.reject_total += Number(row.perolehan_reject || 0);
      current.top_defect_category_id = current.top_defect_category_id || row.defect_category_id || '';
      const output = current.ok_total + current.reject_total;
      current.defect_rate = output > 0 ? Math.round((current.reject_total / output) * 10000) / 10000 : 0;
      grouped.set(key, current);
    });
  return [...grouped.values()];
}

function filterRows(rows, filter) {
  return rows.filter((row) =>
    (!filter.factory_date || row.factory_date === filter.factory_date)
    && (!filter.line_id || row.line_id === filter.line_id)
    && (!filter.shift_id || row.shift_id === filter.shift_id)
    && (!filter.machine_id || row.machine_id === filter.machine_id)
    && (!filter.status || row.status === filter.status),
  );
}

function findRawScope(state, transactionId) {
  const raw = state.rawLogs.find((row) => row.transaction_id === transactionId) || {};
  return {
    factory_date: raw.factory_date || '',
    line_id: raw.line_id || '',
    shift_id: raw.shift_id || '',
    machine_id: raw.machine_id || '',
  };
}

function isApprovedQuarantine(state, transactionId) {
  return state.quarantine.some((row) => row.transaction_id === transactionId && row.status === 'APPROVED');
}

function buildPareto(rows) {
  const buckets = new Map();
  rows.forEach((row) => {
    if (!row.top_defect_category_id || Number(row.reject_total || 0) <= 0) {
      return;
    }
    buckets.set(row.top_defect_category_id, (buckets.get(row.top_defect_category_id) || 0) + Number(row.reject_total || 0));
  });
  const total = [...buckets.values()].reduce((sum, value) => sum + value, 0);
  return [...buckets.entries()]
    .map(([defect_category_id, reject_total]) => ({
      defect_category_id,
      reject_total,
      pareto_percent: total > 0 ? Math.round((reject_total / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.reject_total - a.reject_total || a.defect_category_id.localeCompare(b.defect_category_id));
}

function normalizePagination(request) {
  return {
    page: Number(request.page || 1),
    page_size: Number(request.page_size || 20),
  };
}

function paginate(rows, pagination) {
  const start = (pagination.page - 1) * pagination.page_size;
  return {
    page: pagination.page,
    page_size: pagination.page_size,
    total: rows.length,
    items: rows.slice(start, start + pagination.page_size),
  };
}

function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value));
}
