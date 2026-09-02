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
    deleteScriptProperty(payload) { this.invoke('deleteScriptProperty', payload); },
    getHealthCheck(payload) { this.invoke('getHealthCheck', payload); },
    getSchemaHealthCheck(payload) { this.invoke('getSchemaHealthCheck', payload); },
    getScriptPropertiesStatus(payload) { this.invoke('getScriptPropertiesStatus', payload); },
    getSessionContext(payload) { this.invoke('getSessionContext', payload); },
    rotateSecretProperty(payload) { this.invoke('rotateSecretProperty', payload); },
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

function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value));
}
