global.window = {
  setTimeout,
  clearTimeout,
};

const { ApiAdapterError, assertAllowedCallable, createApiAdapter } = await import('../src/services/apiAdapter.js');
const { createMockGas, installMockGas } = await import('../src/services/mock_gas.js');

let rejected = false;
try {
  assertAllowedCallable('deleteEverything');
} catch (error) {
  rejected = error instanceof ApiAdapterError && error.code === 'CALLABLE_NOT_ALLOWED';
}

if (!rejected) {
  throw new Error('Expected non-allowlisted callable to be rejected.');
}

const mockGas = createMockGas({ latencyMs: 1, failureRate: 0 });
const api = createApiAdapter({
  timeoutMs: 100,
  transport(functionName, payload) {
    return mockGas[functionName](payload);
  },
});

const health = await api.getHealthCheck();
if (!health.ok || health.data.status !== 'ok' || health.meta.mocked !== true) {
  throw new Error('Expected mock GAS health response to be normalized.');
}

const properties = await api.getScriptPropertiesStatus({ session: { simulated_role: 'SuperAdmin' } });
const salt = properties.data.properties.find((property) => property.key === 'ENCRYPTION_SALT');
if (!salt || salt.value_preview !== '') {
  throw new Error('Expected mock ENCRYPTION_SALT to remain status-only.');
}

await api.setScriptProperty({
  session: { simulated_role: 'SuperAdmin' },
  key: 'APP_ACTIVE_UNTIL',
  value: '2026-12-31',
});

const submitResponse = await api.submitProductionReport({
  session: { simulated_role: 'Operator' },
  metadata: {
    transaction_id: '550e8400-e29b-41d4-a716-446655440100',
    device_timestamp: '2026-09-02T01:00:00.000Z',
    sync_type: 'OFFLINE_QUEUE',
    operator_email: 'operator@example.com',
    client_version: 'v0.1.0',
  },
  payload: {
    line_id: 'SMT-02',
    shift_id: 'SHIFT-1',
    machine_id: 'SLD-14',
    target_harian: 1200,
    tandon: 80,
    perolehan_ok: 1164,
    perolehan_reject: 36,
    defect_category_id: 'DEF-SOLDER-THIN',
    defect_notes: 'Sampling akhir',
  },
});

if (submitResponse.data.status !== 'ACCEPTED' || !submitResponse.data.appended) {
  throw new Error('Expected mock GAS submitProductionReport to return accepted response.');
}

rejected = false;
try {
  await api.setScriptProperty({
    session: { simulated_role: 'SuperAdmin' },
    key: 'ENCRYPTION_SALT',
    value: 'raw-secret',
  });
} catch (error) {
  rejected = error instanceof ApiAdapterError || /not updatable/.test(error.message);
}

if (!rejected) {
  throw new Error('Expected direct secret update to be rejected by mock GAS.');
}

const timeoutApi = createApiAdapter({
  timeoutMs: 1,
  transport() {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ ok: true, data: {}, meta: {}, error: null }), 30);
    });
  },
});

rejected = false;
try {
  await timeoutApi.getHealthCheck();
} catch (error) {
  rejected = error instanceof ApiAdapterError && error.code === 'TIMEOUT';
}

if (!rejected) {
  throw new Error('Expected timed out call to reject with TIMEOUT.');
}

const invalidResponseApi = createApiAdapter({
  transport() {
    return Promise.resolve('bad response');
  },
});

rejected = false;
try {
  await invalidResponseApi.getHealthCheck();
} catch (error) {
  rejected = error instanceof ApiAdapterError && error.code === 'INVALID_RESPONSE';
}

if (!rejected) {
  throw new Error('Expected invalid response shape to be rejected.');
}

global.window = {
  setTimeout,
  clearTimeout,
  Math,
};

installMockGas({ latencyMs: 1, failureRate: 0 });
const installedApi = createApiAdapter({ timeoutMs: 100 });
const session = await installedApi.getSessionContext({ simulated_role: 'Mandor' });

if (session.data.role !== 'Mandor') {
  throw new Error('Expected installed mock GAS to be discovered by apiAdapter.');
}

console.log('frontend api adapter test ok');
