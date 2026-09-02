global.window = {
  setTimeout,
  clearTimeout,
  confirm: () => true,
};

const { assertAllowedCallable, createApiAdapter } = await import('../src/services/apiAdapter.js');
const { createMockGas } = await import('../src/services/mock_gas.js');
const {
  buildDashboardTiles,
  formatCompact,
} = await import('../src/services/managementDashboard.js');
const {
  createAdjustmentPayload,
  createClosingPayload,
  summarizeControlCenter,
} = await import('../src/services/supervisorControlCenter.js');

[
  'approveQuarantine',
  'closeDailyClosing',
  'createAdjustment',
  'runMasterRecap',
  'getSupervisorControlCenter',
  'getManagementDashboard',
].forEach(assertAllowedCallable);

const closingPayload = createClosingPayload({
  factory_date: '2026-09-02',
  line_id: 'SMT-02',
  shift_id: 'SHIFT-1',
}, 'Done');
if (closingPayload.closing_id || closingPayload.notes !== 'Done') {
  throw new Error('Expected closing payload to use backend generated closing_id.');
}

const adjustmentPayload = createAdjustmentPayload('550e8400-e29b-41d4-a716-446655440000', { perolehan_ok: 1 }, 'Fix');
if (adjustmentPayload.adjustment_type !== 'POST_CLOSING_ADJUSTMENT') {
  throw new Error('Expected default post closing adjustment type.');
}

const tiles = summarizeControlCenter({
  summary: {
    total_raw_logs: 3,
    pending_quarantine: 1,
    closed_scopes: 1,
    pending_adjustments: 0,
  },
});
if (tiles[1].tone !== 'conflict' || tiles[2].tone !== 'success') {
  throw new Error('Expected control center tile tones to reflect risk.');
}

const dashboardTiles = buildDashboardTiles({
  summary: {
    target_total: 1200,
    ok_total: 1100,
    reject_total: 25,
    defect_rate: 0.0222,
  },
});
if (dashboardTiles[3].value !== '2.22%' || formatCompact(1200) !== '1.200') {
  throw new Error('Expected dashboard tiles to format management metrics.');
}

const mockGas = createMockGas({ latencyMs: 1, failureRate: 0 });
const api = createApiAdapter({
  timeoutMs: 100,
  transport(functionName, payload) {
    return mockGas[functionName](payload);
  },
});

await api.submitProductionReport({
  session: { simulated_role: 'Operator' },
  metadata: {
    transaction_id: '550e8400-e29b-41d4-a716-446655440100',
    device_timestamp: '2026-09-02T01:00:00.000Z',
    sync_type: 'LIVE',
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

await api.runMasterRecap({
  session: { simulated_role: 'Management' },
  filter: { factory_date: '2026-09-02' },
  page: 1,
  page_size: 5,
});
const dashboard = await api.getManagementDashboard({
  session: { simulated_role: 'Management' },
  filter: { factory_date: '2026-09-02' },
  page: 1,
  page_size: 5,
});

if (dashboard.data.summary.ok_total !== 1164 || dashboard.data.rows.total !== 1) {
  throw new Error('Expected mock management dashboard to read generated recap rows.');
}

console.log('M5 frontend services test ok');
