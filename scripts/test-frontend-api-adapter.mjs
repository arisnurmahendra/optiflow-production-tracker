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
const targetBeforeSubmit = operatorDashboard.data.summary.target_today;
const actualBeforeSubmit = operatorDashboard.data.summary.ok_today + operatorDashboard.data.summary.reject_today;

await api.submitProductionReport({
  session: { simulated_role: 'Operator' },
  metadata: {
    transaction_id: '30862ff2-af10-4c54-bf45-9641be0625d2',
    device_timestamp: '2026-09-03T03:05:00.000Z',
    sync_type: 'OFFLINE_QUEUE',
    operator_email: 'operator@example.com',
    client_version: 'test',
  },
  payload: {
    line_id: 'SMT-02',
    shift_id: 'SHIFT-1',
    machine_id: 'SLD-14',
    target_harian: 1200,
    tandon: 81,
    perolehan_ok: 1178,
    perolehan_reject: 27,
    defect_category_id: 'DEF-SOLDER-THIN',
    defect_notes: '',
  },
});

const dashboardAfterSubmit = await api.getOperatorDashboard({
  session: { simulated_role: 'Operator' },
  filter: { factory_date: '2026-09-03', line_id: 'SMT-02', shift_id: 'SHIFT-1', machine_id: 'SLD-14' },
  page: 1,
  page_size: 8,
});
if (dashboardAfterSubmit.data.summary.target_today !== targetBeforeSubmit
  || dashboardAfterSubmit.data.summary.ok_today + dashboardAfterSubmit.data.summary.reject_today <= actualBeforeSubmit) {
  throw new Error('Expected repeated Operator submits to add realization without doubling daily target.');
}

const mandorControlCenter = await api.getSupervisorControlCenter({
  session: { simulated_role: 'Mandor' },
  filter: { factory_date: '2026-09-03', line_id: 'SMT-02', shift_id: 'SHIFT-1' },
  page: 1,
  page_size: 8,
});
if (!mandorControlCenter.data.raw_logs.items.some((row) => row.transaction_id === '30862ff2-af10-4c54-bf45-9641be0625d2')) {
  throw new Error('Expected Mandor control center to see synced Operator mock transaction.');
}

const review = await api.createProductionReview({
  session: { simulated_role: 'Mandor' },
  source_transaction_id: '30862ff2-af10-4c54-bf45-9641be0625d2',
  action: 'VOID',
  delta: {},
  reason: 'Mock pre-closing void verification.',
});
if (review.data.status !== 'APPROVED') {
  throw new Error('Expected mock pre-closing void to be approved immediately.');
}

await api.runMasterRecap({
  session: { simulated_role: 'Management' },
  filter: { factory_date: '2026-09-03', line_id: 'SMT-02', shift_id: 'SHIFT-1' },
});
const managementAfterVoid = await api.getManagementDashboard({
  session: { simulated_role: 'Management' },
  filter: { factory_date: '2026-09-03', line_id: 'SMT-02', shift_id: 'SHIFT-1' },
});
if (managementAfterVoid.data.rows.items.some((row) => row.ok_total === 1178 && row.reject_total === 27)) {
  throw new Error('Expected mock recap to exclude pre-closing VOID transaction.');
}

const managementBagianDemo = await api.getManagementDashboard({
  session: { simulated_role: 'Management' },
  filter: { factory_date: '2026-09-03' },
});
if (
  !managementBagianDemo.data.bagian_summary?.some((row) => row.bagian_id === 'SOLDER')
  || !managementBagianDemo.data.bagian_summary?.some((row) => row.bagian_id === 'LEM')
  || Number(managementBagianDemo.data.attendance_summary?.present_count || 0) <= 0
  || !managementBagianDemo.data.material_flow?.some((flow) => flow.source_employee_nos.length > 1)
) {
  throw new Error('Expected mock Management dashboard to expose Bagian, attendance, and multi-source material flow demo data.');
}
if (
  !managementBagianDemo.data.bagian_summary?.some((row) => row.umr_status === 'BELOW_UMR' && row.wage_gap_units > 0)
  || !managementBagianDemo.data.bagian_summary?.some((row) => row.umr_status === 'MEETS_UMR')
) {
  throw new Error('Expected mock Management dashboard to expose monthly UMR wage condition states.');
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

const hrdDirectory = await api.getHrdAccessDashboard({
  session: { simulated_role: 'HRD' },
  page: 1,
  page_size: 10,
});
if (
  !hrdDirectory.data.users.items.some((user) =>
    /^\d{5}$/.test(user.employee_no)
    && user.full_name
    && user.address
    && user.email
    && /^https:\/\/wa\.me\/62\d+/.test(user.wa_url || ''),
  )
) {
  throw new Error('Expected mock HRD directory to expose dummy employee data and wa.me link.');
}

const shiftOptions = await api.getShiftOptions({ session: { simulated_role: 'Operator' } });
if (!shiftOptions.data.shifts.some((shift) => shift.value === 'SHIFT-1' && shift.label === 'Shift 1')) {
  throw new Error('Expected mock GAS to expose SHIFT_MASTER shift options.');
}

const operatorReferences = await api.getOperatorReferenceData({ session: { simulated_role: 'Operator' } });
if (!operatorReferences.data.lines.some((line) => line.value === 'SMT-02')
  || !operatorReferences.data.machines.some((machine) => machine.value === 'SLD-14')
  || !operatorReferences.data.operators.some((operator) => operator.value === 'operator@example.com')) {
  throw new Error('Expected mock GAS to expose operator reference datasets.');
}

const productionTarget = await api.getProductionTarget({
  session: { simulated_role: 'Operator' },
  filter: {
    factory_date: '2026-09-03',
    line_id: 'SMT-02',
    shift_id: 'SHIFT-1',
    machine_id: 'SLD-14',
    operator_email: 'operator@example.com',
  },
});
if (!productionTarget.data.active_target || productionTarget.data.active_target.target_harian !== 1200) {
  throw new Error('Expected Operator to read active mock production target.');
}

await api.upsertProductionTarget({
  session: { simulated_role: 'Mandor' },
  target: {
    factory_date: '2026-09-03',
    effective_from: '2026-09-03',
    effective_until: '',
    line_id: 'SMT-02',
    shift_id: 'SHIFT-1',
    machine_id: 'SLD-14',
    operator_email: 'ALL',
    target_harian: 1325,
    scope_type: 'MACHINE_SCOPE',
    status_aktif: true,
  },
});
const operatorDashboardAfterTarget = await api.getOperatorDashboard({
  session: { simulated_role: 'Operator' },
  filter: {
    factory_date: '2026-09-03',
    line_id: 'SMT-02',
    shift_id: 'SHIFT-1',
    machine_id: 'SLD-14',
    operator_email: 'operator@example.com',
  },
  page: 1,
  page_size: 8,
});
if (operatorDashboardAfterTarget.data.summary.target_today !== 1325) {
  throw new Error('Expected Operator dashboard progress target to follow Mandor target planning.');
}

await api.upsertProductionTarget({
  session: { simulated_role: 'Mandor' },
  target: {
    factory_date: '',
    effective_from: '2026-09-03',
    effective_until: '',
    line_id: 'SMT-02',
    shift_id: 'SHIFT-1',
    machine_id: 'SLD-19',
    operator_email: 'ALL',
    target_harian: 1250,
    scope_type: 'MACHINE_SCOPE',
    status_aktif: true,
  },
});
const scopedTarget = await api.getProductionTarget({
  session: { simulated_role: 'Operator' },
  filter: {
    factory_date: '2026-09-03',
    line_id: 'SMT-02',
    shift_id: 'SHIFT-1',
    machine_id: 'SLD-19',
    operator_email: 'operator@example.com',
  },
});
if (!scopedTarget.data.active_target || scopedTarget.data.active_target.target_harian !== 1250) {
  throw new Error('Expected Mandor-created machine-scope target to resolve for Operator.');
}

rejected = false;
try {
  await api.upsertProductionTarget({
    session: { simulated_role: 'Operator' },
    target: {
      factory_date: '',
      effective_from: '2026-09-03',
      effective_until: '',
      line_id: 'SMT-02',
      shift_id: 'SHIFT-1',
      machine_id: 'SLD-20',
      operator_email: 'ALL',
      target_harian: 1250,
      scope_type: 'MACHINE_SCOPE',
      status_aktif: true,
    },
  });
} catch {
  rejected = true;
}
if (!rejected) {
  throw new Error('Expected Operator production target upsert to be rejected.');
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

let persistedMockState = null;
const persistentMockGas = createMockGas({
  latencyMs: 1,
  failureRate: 0,
  onStateChange: (state) => {
    persistedMockState = state;
  },
});
await persistentMockGas.upsertProductionTarget({
  session: { simulated_role: 'Mandor' },
  target: {
    factory_date: '',
    effective_from: '2026-09-03',
    effective_until: '',
    line_id: 'SMT-02',
    shift_id: 'SHIFT-1',
    machine_id: 'SLD-21',
    operator_email: 'ALL',
    target_harian: 1330,
    scope_type: 'MACHINE_SCOPE',
    status_aktif: true,
  },
});
if (!persistedMockState?.targetMaster.some((target) => target.machine_id === 'SLD-21' && target.target_harian === 1330)) {
  throw new Error('Expected mock GAS onStateChange to persist changed demo target state.');
}
const reloadedMockGas = createMockGas({
  latencyMs: 1,
  failureRate: 0,
  initialState: persistedMockState,
});
const reloadedTarget = await reloadedMockGas.getProductionTarget({
  session: { simulated_role: 'Operator' },
  filter: {
    factory_date: '2026-09-03',
    line_id: 'SMT-02',
    shift_id: 'SHIFT-1',
    machine_id: 'SLD-21',
    operator_email: 'operator@example.com',
  },
});
if (reloadedTarget.data.active_target?.target_harian !== 1330) {
  throw new Error('Expected mock GAS reload to keep persisted demo target state.');
}

const migratedMockGas = createMockGas({
  latencyMs: 1,
  failureRate: 0,
  initialState: {
    rolePermissions: [
      { role: 'Management', resource: 'dashboard', action: 'read', is_allowed: true },
    ],
  },
});
await migratedMockGas.upsertBagianMaster({
  session: { simulated_role: 'Management' },
  bagian: {
    bagian_id: 'QC_TEST',
    bagian_name: 'Bagian Test',
    description: 'Seed migrasi permission mock.',
    unit_rate: 77,
    monthly_target_unit: 1000,
    target_salary: 3500000,
    status_aktif: true,
  },
});
const migratedBagian = await migratedMockGas.getBagianMaster({
  session: { simulated_role: 'Management' },
  include_inactive: true,
});
if (!migratedBagian.data.bagian.some((bagian) => bagian.bagian_id === 'QC_TEST' && bagian.unit_rate === 77)) {
  throw new Error('Expected mock GAS to migrate bagian_master permissions into old persisted state.');
}

const migratedSuperAdminMockGas = createMockGas({
  latencyMs: 1,
  failureRate: 0,
  initialState: {
    rolePermissions: [
      { role: 'SuperAdmin', resource: 'test_runner', action: 'run', is_allowed: true },
    ],
  },
});
const superAdminBagian = await migratedSuperAdminMockGas.getBagianMaster({
  session: { simulated_role: 'SuperAdmin' },
  include_inactive: true,
});
if (!superAdminBagian.data.bagian.some((bagian) => bagian.bagian_id === 'SOLDER')) {
  throw new Error('Expected mock GAS to migrate SuperAdmin bagian_master read permission.');
}

const hrdDashboard = await api.getHrdAccessDashboard({
  session: { simulated_role: 'HRD' },
  page: 1,
  page_size: 10,
});
if (hrdDashboard.data.summary.active_users <= 0 || hrdDashboard.data.role_matrix.length === 0) {
  throw new Error('Expected mock HRD dashboard to include user and role summary.');
}
if (JSON.stringify(hrdDashboard.data).includes('phone_blind_index')
  || JSON.stringify(hrdDashboard.data).includes('profile_base64')
  || JSON.stringify(hrdDashboard.data).includes('alamat_encrypted')) {
  throw new Error('Expected mock HRD dashboard to avoid backend-only sensitive fields.');
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
