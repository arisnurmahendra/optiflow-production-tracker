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

const operatorDashboard = await api.getOperatorDashboard({
  session: { simulated_role: 'Operator' },
  filter: {
    factory_date: '2026-09-03',
    line_id: 'SMT-02',
    shift_id: 'SHIFT-1',
    machine_id: 'SLD-14',
  },
  page: 1,
  page_size: 8,
});

if (
  operatorDashboard.data.summary.ok_today <= 0
  || operatorDashboard.data.trend_history.length !== 7
  || operatorDashboard.data.weekly_history.length !== 7
  || operatorDashboard.data.recent_submissions.length === 0
) {
  throw new Error('Expected mock Operator dashboard response to include complete dummy data.');
}

const trendDeltaKinds = new Set(operatorDashboard.data.trend_history.map((row) =>
  Math.sign(Number(row.actual || 0) - Number(row.target || 0)),
));
if (!trendDeltaKinds.has(-1) || !trendDeltaKinds.has(0) || !trendDeltaKinds.has(1)) {
  throw new Error('Expected mock Operator daily trend to include under, exact, and over target examples.');
}

const todayTrend = operatorDashboard.data.trend_history.find((row) => row.label === 'Hari ini');
if (todayTrend.actual !== todayTrend.ok + todayTrend.reject) {
  throw new Error('Expected mock Operator realization to equal OK + Reject.');
}

const monthlyOperatorDashboard = await api.getOperatorDashboard({
  session: { simulated_role: 'Operator' },
  filter: { factory_date: '2026-09-03', line_id: 'SMT-02', shift_id: 'SHIFT-1', machine_id: 'SLD-14' },
  period: 'MONTHLY',
  page: 1,
  page_size: 8,
});

if (monthlyOperatorDashboard.data.period !== 'MONTHLY' || monthlyOperatorDashboard.data.trend_history.length !== 6) {
  throw new Error('Expected mock Operator dashboard to support monthly trend period.');
}

const defectCategories = await api.getDefectCategories({ session: { simulated_role: 'Operator' } });
if (!defectCategories.data.categories.some((category) => category.defect_category_id === 'DEF-COLD-SOLDER')) {
  throw new Error('Expected mock GAS to expose seeded defect categories.');
}

await api.upsertDefectCategory({
  session: { simulated_role: 'SuperAdmin' },
  category: {
    defect_category_id: 'DEF-API-NEW',
    defect_name: 'API seeded defect',
    qcc_factor: 'Machine',
    severity: 'HIGH',
    status_aktif: true,
  },
});
const updatedDefects = await api.getDefectCategories({ session: { simulated_role: 'Operator' } });
if (!updatedDefects.data.categories.some((category) => category.defect_category_id === 'DEF-API-NEW')) {
  throw new Error('Expected mock GAS upsertDefectCategory to add active category.');
}

await api.deactivateDefectCategory({
  session: { simulated_role: 'SuperAdmin' },
  defect_category_id: 'DEF-API-NEW',
});
const activeDefects = await api.getDefectCategories({ session: { simulated_role: 'Operator' } });
if (activeDefects.data.categories.some((category) => category.defect_category_id === 'DEF-API-NEW')) {
  throw new Error('Expected mock GAS deactivateDefectCategory to hide inactive category from active list.');
}

const seedDefects = await api.seedDefectCategories({ session: { simulated_role: 'SuperAdmin' } });
if (!Array.isArray(seedDefects.data.inserted)) {
  throw new Error('Expected mock GAS seedDefectCategories to return inserted list.');
}

const hrdDashboard = await api.getHrdAccessDashboard({
  session: { simulated_role: 'HRD' },
  page: 1,
  page_size: 10,
});
if (hrdDashboard.data.summary.active_users <= 0 || hrdDashboard.data.role_matrix.length === 0) {
  throw new Error('Expected mock HRD dashboard to include user and role summary.');
}
if (JSON.stringify(hrdDashboard.data).includes('operator@example.com')
  || JSON.stringify(hrdDashboard.data).includes('phone_blind_index')
  || JSON.stringify(hrdDashboard.data).includes('profile_base64')
  || JSON.stringify(hrdDashboard.data).includes('alamat_encrypted')) {
  throw new Error('Expected mock HRD dashboard to avoid raw PII fields.');
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
