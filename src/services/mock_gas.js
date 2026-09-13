import { defaultDefectCategories } from './defectCategories.js';

const DEFAULT_LATENCY_MS = 180;
const DEFAULT_FAILURE_RATE = 0;

const DUMMY_PROFILE_BASE64 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHJ4PSIxOCIgZmlsbD0iIzM4YjRmOCIvPjxjaXJjbGUgY3g9IjMyIiBjeT0iMjQiIHI9IjEwIiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTE0IDU2YzMtMTMgMTMtMjAgMTgtMjBzMTUgNyAxOCAyMCIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==';

const MOCK_PERMISSION_CATALOG = Object.freeze({
  schema: Object.freeze(['bootstrap', 'read_health']),
  session: Object.freeze(['read']),
  production_report: Object.freeze(['create', 'read']),
  quarantine: Object.freeze(['read', 'approve', 'reject', 'request_correction']),
  daily_closing: Object.freeze(['create', 'read', 'reopen']),
  adjustment: Object.freeze(['create', 'read', 'approve', 'reject']),
  production_review: Object.freeze(['read', 'void', 'request_correction', 'pre_closing_correction']),
  audit_log: Object.freeze(['read']),
  dashboard: Object.freeze(['read']),
  defect_category: Object.freeze(['read', 'create', 'update', 'soft_delete', 'seed']),
  bagian_master: Object.freeze(['read', 'create', 'update', 'soft_delete', 'seed']),
  production_target: Object.freeze(['read', 'create', 'update', 'bulk_update', 'soft_delete']),
  reference_data: Object.freeze(['read']),
  test_runner: Object.freeze(['run']),
  user_role: Object.freeze(['create', 'read', 'update', 'soft_delete']),
  script_property: Object.freeze(['read_status', 'update', 'delete', 'rotate_secret']),
});

const DEFAULT_USER_ROLES = [
  { user_id: '10001', employee_no: '10001', full_name: 'Rina Wulandari', address: 'Jl. Melati 12, Bogor', email: 'operator@example.com', wa_number: '628121110001', username: 'rina.solder', role: 'Operator', bagian_id: 'SOLDER', nama_lengkap_encrypted: 'enc:rina-wulandari', alamat_encrypted: 'enc:bogor-melati-12', nomor_telepon_encrypted: 'enc:628121110001', phone_blind_index: 'blind:628121110001', profile_base64: DUMMY_PROFILE_BASE64, mandor_email: 'mandor@example.com', status_aktif: true, is_deleted: false, last_login: '2026-09-04T00:55:00.000Z', created_at: '2026-08-25T02:00:00.000Z', updated_at: '2026-09-03T03:10:00.000Z' },
  { user_id: '10002', employee_no: '10002', full_name: 'Budi Hartono', address: 'Kp. Cikaret RT 03/02, Bogor', email: 'mandor@example.com', wa_number: '628121110002', username: 'budi.mandor', role: 'Mandor', bagian_id: 'SOLDER', nama_lengkap_encrypted: 'enc:budi-hartono', alamat_encrypted: 'enc:cikaret-rt0302', nomor_telepon_encrypted: 'enc:628121110002', phone_blind_index: 'blind:628121110002', profile_base64: DUMMY_PROFILE_BASE64, status_aktif: true, is_deleted: false, last_login: '2026-09-04T01:12:00.000Z', created_at: '2026-08-25T02:10:00.000Z', updated_at: '2026-09-03T03:12:00.000Z' },
  { user_id: '10003', employee_no: '10003', full_name: 'Maya Safitri', address: 'Perum Griya Asri Blok C7, Depok', email: 'management@example.com', wa_number: '628121110003', username: 'maya.management', role: 'Management', roles: ['Management', 'Supervisor'], bagian_id: 'ALL', nama_lengkap_encrypted: 'enc:maya-safitri', alamat_encrypted: 'enc:griya-asri-c7', nomor_telepon_encrypted: 'enc:628121110003', phone_blind_index: 'blind:628121110003', profile_base64: DUMMY_PROFILE_BASE64, status_aktif: true, is_deleted: false, last_login: '2026-09-03T08:45:00.000Z', created_at: '2026-08-25T02:20:00.000Z', updated_at: '2026-09-03T03:14:00.000Z' },
  { user_id: '10004', employee_no: '10004', full_name: 'Dewi Anggraeni', address: 'Jl. Kenanga 5, Cibinong', email: 'hrd@example.com', wa_number: '628121110004', username: 'dewi.hrd', role: 'HRD', bagian_id: 'HRD', nama_lengkap_encrypted: 'enc:dewi-anggraeni', alamat_encrypted: 'enc:kenanga-5', nomor_telepon_encrypted: 'enc:628121110004', phone_blind_index: 'blind:628121110004', profile_base64: DUMMY_PROFILE_BASE64, status_aktif: true, is_deleted: false, last_login: '2026-09-04T01:30:00.000Z', created_at: '2026-08-25T02:30:00.000Z', updated_at: '2026-09-03T03:16:00.000Z' },
  { user_id: '10005', employee_no: '10005', full_name: 'Agus Prasetyo', address: 'Jl. Raya Tajur 88, Bogor', email: 'agus.lem@example.com', wa_number: '628121110005', username: 'agus.lem', role: 'Operator', bagian_id: 'LEM', nama_lengkap_encrypted: 'enc:agus-prasetyo', alamat_encrypted: 'enc:tajur-88', nomor_telepon_encrypted: 'enc:628121110005', phone_blind_index: 'blind:628121110005', profile_base64: DUMMY_PROFILE_BASE64, mandor_email: 'mandor@example.com', status_aktif: true, is_deleted: false, last_login: '2026-09-04T02:10:00.000Z', created_at: '2026-08-26T02:00:00.000Z', updated_at: '2026-09-03T04:10:00.000Z' },
  { user_id: '10006', employee_no: '10006', full_name: 'Siti Nurhaliza', address: 'Jl. Pahlawan 21, Sukabumi', email: 'inactive.operator@example.com', wa_number: '628121110006', username: 'siti.resign', role: 'Operator', bagian_id: 'SOLDER', nama_lengkap_encrypted: 'enc:siti-nurhaliza', alamat_encrypted: 'enc:pahlawan-21', nomor_telepon_encrypted: 'enc:628121110006', phone_blind_index: 'blind:628121110006', profile_base64: DUMMY_PROFILE_BASE64, status_aktif: false, is_deleted: false, last_login: '', created_at: '2026-08-20T02:00:00.000Z', updated_at: '2026-09-01T04:00:00.000Z' },
];

const DEFAULT_ROLE_PERMISSIONS = [
  ['Operator', 'production_report', 'create'],
  ['Operator', 'production_report', 'read'],
  ['Operator', 'bagian_master', 'read'],
  ['Operator', 'defect_category', 'read'],
  ['Operator', 'production_target', 'read'],
  ['Operator', 'reference_data', 'read'],
  ['Mandor', 'quarantine', 'read'],
  ['Mandor', 'quarantine', 'approve'],
  ['Mandor', 'production_review', 'read'],
  ['Mandor', 'production_review', 'void'],
  ['Mandor', 'production_review', 'request_correction'],
  ['Mandor', 'production_review', 'pre_closing_correction'],
  ['Mandor', 'daily_closing', 'create'],
  ['Mandor', 'dashboard', 'read'],
  ['Mandor', 'production_target', 'read'],
  ['Mandor', 'production_target', 'create'],
  ['Mandor', 'production_target', 'update'],
  ['Mandor', 'production_target', 'bulk_update'],
  ['Mandor', 'production_target', 'soft_delete'],
  ['Mandor', 'reference_data', 'read'],
  ['Mandor', 'bagian_master', 'read'],
  ['Supervisor', 'bagian_master', 'read'],
  ['Management', 'dashboard', 'read'],
  ['Management', 'production_review', 'read'],
  ['Management', 'bagian_master', 'read'],
  ['Management', 'bagian_master', 'create'],
  ['Management', 'bagian_master', 'update'],
  ['Management', 'bagian_master', 'soft_delete'],
  ['Management', 'bagian_master', 'seed'],
  ['Management', 'defect_category', 'read'],
  ['Management', 'production_target', 'read'],
  ['Management', 'reference_data', 'read'],
  ['HRD', 'user_role', 'read'],
  ['HRD', 'audit_log', 'read'],
  ['HRD', 'bagian_master', 'read'],
  ['HRD', 'reference_data', 'read'],
  ...Object.entries(MOCK_PERMISSION_CATALOG).flatMap(([resource, actions]) =>
    actions.map((action) => ['SuperAdmin', resource, action]),
  ),
].map(([role, resource, action]) => ({ role, resource, action, is_allowed: true }));

const DEFAULT_SHIFT_MASTER = [
  { shift_id: 'SHIFT-1', shift_name: 'Shift 1', start_time: '07:00', end_time: '15:00', timezone: 'Asia/Jakarta', status_aktif: true },
  { shift_id: 'SHIFT-2', shift_name: 'Shift 2', start_time: '15:00', end_time: '23:00', timezone: 'Asia/Jakarta', status_aktif: true },
  { shift_id: 'SHIFT-3', shift_name: 'Shift 3', start_time: '23:00', end_time: '07:00', timezone: 'Asia/Jakarta', status_aktif: false },
];

const DEFAULT_LINE_MASTER = [
  { line_id: 'SMT-01', line_name: 'Surface Mount 01', area: 'Produksi Elektronik', mandor_email: 'mandor@example.com', status_aktif: true },
  { line_id: 'SMT-02', line_name: 'Surface Mount 02', area: 'Produksi Elektronik', mandor_email: 'mandor@example.com', status_aktif: true },
  { line_id: 'ASSY-01', line_name: 'Assembly 01', area: 'Final Assembly', mandor_email: 'mandor@example.com', status_aktif: true },
];

const DEFAULT_BAGIAN_MASTER = [
  { bagian_id: 'SOLDER', bagian_name: 'Bagian Solder', description: 'Proses solder/las komponen produksi.', unit_rate: 94, monthly_target_unit: 37234, target_salary: 3500000, status_aktif: true, created_by: 'seed@optiflow.local', updated_by: 'seed@optiflow.local', created_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-09-01T00:00:00.000Z' },
  { bagian_id: 'LEM', bagian_name: 'Bagian Lem', description: 'Proses lem dan perakitan lanjutan.', unit_rate: 83, monthly_target_unit: 42169, target_salary: 3500000, status_aktif: true, created_by: 'seed@optiflow.local', updated_by: 'seed@optiflow.local', created_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-09-01T00:00:00.000Z' },
  { bagian_id: 'PACKING', bagian_name: 'Bagian Packing', description: 'Packing dan persiapan pengiriman.', unit_rate: 0, monthly_target_unit: 0, target_salary: 3500000, status_aktif: true, created_by: 'seed@optiflow.local', updated_by: 'seed@optiflow.local', created_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-09-01T00:00:00.000Z' },
];

const DEFAULT_TARGET_MASTER = [
  {
    target_id: '00000000-0000-4000-8000-000000000351',
    factory_date: '',
    effective_from: '2026-09-01',
    effective_until: '',
    line_id: 'SMT-02',
    shift_id: 'SHIFT-1',
    machine_id: 'SLD-14',
    operator_email: 'ALL',
    target_harian: 1200,
    scope_type: 'MACHINE_SCOPE',
    status_aktif: true,
    created_by: 'mandor@example.com',
    updated_by: 'mandor@example.com',
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
  },
  {
    target_id: '00000000-0000-4000-8000-000000000352',
    factory_date: '',
    effective_from: '2026-09-01',
    effective_until: '',
    line_id: 'SMT-02',
    shift_id: 'SHIFT-1',
    machine_id: 'SLD-18',
    operator_email: 'operator@example.com',
    target_harian: 1180,
    scope_type: 'OPERATOR_ONLY',
    status_aktif: true,
    created_by: 'mandor@example.com',
    updated_by: 'mandor@example.com',
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-02T00:00:00.000Z',
  },
  {
    target_id: '00000000-0000-4000-8000-000000000353',
    factory_date: '',
    effective_from: '2026-09-01',
    effective_until: '',
    line_id: 'SMT-02',
    shift_id: 'SHIFT-2',
    machine_id: 'ALL',
    operator_email: 'ALL',
    target_harian: 1100,
    scope_type: 'LINE_SHIFT',
    status_aktif: true,
    created_by: 'mandor@example.com',
    updated_by: 'mandor@example.com',
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
  },
];

const DEFAULT_AUDIT_LOGS = [
  { action: 'SESSION_SUCCESS', created_at: '2026-09-04T01:30:00.000Z' },
  { action: 'SESSION_SUCCESS', created_at: '2026-09-04T01:12:00.000Z' },
  { action: 'RBAC_ALLOWED', created_at: '2026-09-04T01:13:00.000Z' },
  { action: 'RBAC_DENIED', created_at: '2026-09-03T09:10:00.000Z' },
  { action: 'USER_ROLE_REVIEWED', created_at: '2026-09-03T07:00:00.000Z' },
];

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
    key: 'REQUIRE_REGISTERED_EMAIL_LOGIN',
    sensitivity: 'CONFIG',
    status: 'SET',
    readable: true,
    updatable: true,
    deletable: true,
    rotatable: false,
    value_preview: 'FALSE',
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

const DEFAULT_MANAGEMENT_DEMO = Object.freeze({
  attendance_summary: Object.freeze({
    factory_date: '2026-09-03',
    total_employees: 96,
    present_count: 89,
    absent_count: 7,
    izin_count: 2,
    sakit_count: 3,
    alpha_count: 2,
    mandor_confirmed_count: 86,
    pending_confirmation_count: 3,
  }),
  bagian_summary: Object.freeze([
    Object.freeze({
      bagian_id: 'SOLDER',
      bagian_name: 'Bagian Solder',
      target_total: 127448,
      qc_ok_total: 125910,
      qc_reject_total: 842,
      tandon_total: 3280,
      present_count: 89,
      absent_count: 7,
      unit_rate: 94,
      monthly_target_unit: 37234,
      monthly_actual_unit: 35800,
      target_salary: 3500000,
      recorder: 'mandor@example.com',
      verifier: 'qc.management@example.com',
      verification_status: 'QC_VERIFIED',
    }),
    Object.freeze({
      bagian_id: 'LEM',
      bagian_name: 'Bagian Lem',
      target_total: 68896,
      qc_ok_total: 67640,
      qc_reject_total: 514,
      tandon_total: 1460,
      present_count: 41,
      absent_count: 4,
      unit_rate: 83,
      monthly_target_unit: 42169,
      monthly_actual_unit: 43050,
      target_salary: 3500000,
      recorder: 'mandor.lem@example.com',
      verifier: 'supervisor@example.com',
      verification_status: 'SUPERVISOR_VERIFIED',
    }),
    Object.freeze({
      bagian_id: 'PACKING',
      bagian_name: 'Bagian Packing',
      target_total: 54000,
      qc_ok_total: 54820,
      qc_reject_total: 120,
      tandon_total: 0,
      present_count: 32,
      absent_count: 1,
      unit_rate: 0,
      monthly_target_unit: 0,
      monthly_actual_unit: 0,
      target_salary: 0,
      recorder: 'mandor.packing@example.com',
      verifier: 'supervisor@example.com',
      verification_status: 'DRAFT_POLICY',
    }),
  ]),
  material_flow: Object.freeze([
    Object.freeze({
      flow_id: 'FLOW-LEM-20260903-001',
      target_bagian_id: 'LEM',
      target_employee_no: 'LEM-014',
      source_bagian_id: 'SOLDER',
      source_employee_nos: Object.freeze(['SLD-006', 'SLD-014', 'SLD-021']),
      received_units: 4820,
      verified_units: 4744,
      note: 'Satu operator Lem menerima bahan dari tiga operator Solder.',
    }),
    Object.freeze({
      flow_id: 'FLOW-LEM-20260903-002',
      target_bagian_id: 'LEM',
      target_employee_no: 'LEM-018',
      source_bagian_id: 'SOLDER',
      source_employee_nos: Object.freeze(['SLD-011', 'SLD-019']),
      received_units: 3910,
      verified_units: 3892,
      note: 'Relasi many-to-one untuk debugging traceability.',
    }),
  ]),
});

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
  const initialState = options.initialState || {};
  const onStateChange = typeof options.onStateChange === 'function' ? options.onStateChange : null;
  const state = {
    properties: structuredCloneSafe(options.properties || initialState.properties || DEFAULT_PROPERTIES),
    rawLogs: structuredCloneSafe(options.rawLogs || initialState.rawLogs || []),
    quarantine: structuredCloneSafe(options.quarantine || initialState.quarantine || []),
    dailyClosing: structuredCloneSafe(options.dailyClosing || initialState.dailyClosing || []),
    adjustments: structuredCloneSafe(options.adjustments || initialState.adjustments || []),
    masterRecap: structuredCloneSafe(options.masterRecap || initialState.masterRecap || []),
    defectCategories: structuredCloneSafe(options.defectCategories || initialState.defectCategories || defaultDefectCategories),
    userRoles: structuredCloneSafe(options.userRoles || initialState.userRoles || DEFAULT_USER_ROLES),
    rolePermissions: mergeDefaultRows(
      options.rolePermissions || initialState.rolePermissions,
      DEFAULT_ROLE_PERMISSIONS,
      (permission) => `${permission.role}.${permission.resource}.${permission.action}`,
    ),
    lineMaster: structuredCloneSafe(options.lineMaster || initialState.lineMaster || DEFAULT_LINE_MASTER),
    shiftMaster: structuredCloneSafe(options.shiftMaster || initialState.shiftMaster || DEFAULT_SHIFT_MASTER),
    bagianMaster: mergeDefaultRows(
      options.bagianMaster || initialState.bagianMaster,
      DEFAULT_BAGIAN_MASTER,
      (bagian) => String(bagian.bagian_id || '').toUpperCase(),
    ),
    targetMaster: structuredCloneSafe(options.targetMaster || initialState.targetMaster || DEFAULT_TARGET_MASTER),
    auditLogs: structuredCloneSafe(options.auditLogs || initialState.auditLogs || DEFAULT_AUDIT_LOGS),
    session: structuredCloneSafe(options.session || initialState.session || {
      auth_mode: 'OFF',
      email: 'dev.simulated@optiflow.local',
      role: 'SuperAdmin',
      user_id: 'DEV-SuperAdmin',
      is_simulated: true,
      requires_role_selection: false,
      allowed_simulated_roles: ['Operator', 'Mandor', 'Supervisor', 'Management', 'HRD', 'SuperAdmin'],
    }),
  };

  function respond(data, meta = {}) {
    persistState();

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

  function persistState() {
    if (!onStateChange) {
      return;
    }

    onStateChange(structuredCloneSafe(state));
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
    createProductionReview: (request = {}) => {
      const actionMap = {
        VOID: 'void',
        REQUEST_CORRECTION: 'request_correction',
        PRE_CLOSING_CORRECTION: 'pre_closing_correction',
      };
      const action = String(request.action || '').toUpperCase();
      assertMockPermission(state, request, 'production_review', actionMap[action] || '');
      const source = state.rawLogs.find((row) => row.transaction_id === request.source_transaction_id);
      if (!source) {
        throw new Error('Production review source transaction was not found.');
      }
      if (latestClosing(state, source)?.status === 'CLOSED') {
        throw new Error('Production review is only allowed before daily closing.');
      }
      if (String(source.status || '').toUpperCase() !== 'ACCEPTED') {
        throw new Error('Production review only accepts normal ACCEPTED production rows.');
      }
      const existing = getLatestMockProductionReview(state, request.source_transaction_id);
      if (existing && existing.adjustment_type === action && action !== 'PRE_CLOSING_CORRECTION' && ['PENDING', 'APPROVED'].includes(existing.status)) {
        return respond({
          adjustment_id: existing.adjustment_id,
          source_transaction_id: existing.source_transaction_id,
          action: existing.adjustment_type,
          status: existing.status,
          duplicate: true,
        });
      }
      const now = new Date().toISOString();
      const status = action === 'REQUEST_CORRECTION' ? 'PENDING' : 'APPROVED';
      const adjustment = {
        adjustment_id: `00000000-0000-4000-8000-${String(state.adjustments.length + 1).padStart(12, '0')}`,
        source_transaction_id: source.transaction_id,
        factory_date: source.factory_date,
        line_id: source.line_id,
        shift_id: source.shift_id,
        adjustment_type: action,
        delta_json: JSON.stringify(request.delta || {}),
        reason: request.reason || '',
        status,
        requested_by: state.session.email,
        approved_by: status === 'APPROVED' ? state.session.email : '',
        approved_at: status === 'APPROVED' ? now : '',
        created_at: now,
      };
      state.adjustments.push(adjustment);
      return respond({
        adjustment_id: adjustment.adjustment_id,
        source_transaction_id: adjustment.source_transaction_id,
        action: adjustment.adjustment_type,
        status: adjustment.status,
        created_at: now,
        duplicate: false,
      });
    },
    deactivateBagianMaster: (request = {}) => {
      assertMockPermission(state, request, 'bagian_master', 'soft_delete');
      const bagian = findBagianMaster(state, request.bagian_id);
      bagian.status_aktif = false;
      bagian.updated_by = state.session.email;
      bagian.updated_at = new Date().toISOString();
      return respond({ bagian_id: bagian.bagian_id, status_aktif: false });
    },
    deactivateDefectCategory: (request = {}) => {
      const category = findDefectCategory(state, request.defect_category_id);
      category.status_aktif = false;
      category.updated_at = new Date().toISOString();
      return respond({ category: { ...category } });
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
    getHrdAccessDashboard: (request = {}) => respond(buildHrdAccessDashboard(state, request)),
    getManagementDashboard: (request = {}) => respond(buildManagementDashboard(state, request)),
    getBagianMaster: (request = {}) => {
      assertMockPermission(state, request, 'bagian_master', 'read');
      return respond({
        bagian: state.bagianMaster
          .filter((bagian) => request.include_inactive || isTruthy(bagian.status_aktif))
          .map(normalizeMockBagian),
      });
    },
    getDefectCategories: (request = {}) => respond({
      categories: state.defectCategories
        .filter((category) => request.include_inactive || isTruthy(category.status_aktif))
        .map((category) => ({ ...category })),
    }),
    getOperatorDashboard: (request = {}) => respond(buildOperatorDashboard(state, request)),
    getOperatorReferenceData: (request = {}) => {
      assertMockPermission(state, request, 'reference_data', 'read');
      const includeInactive = Boolean(request.include_inactive);
      return respond({
        lines: state.lineMaster
          .filter((line) => includeInactive || isTruthy(line.status_aktif))
          .map((line) => ({
            value: line.line_id,
            label: line.line_name ? `${line.line_id} - ${line.line_name}` : line.line_id,
            line_id: line.line_id,
            line_name: line.line_name || '',
            area: line.area || '',
            status_aktif: isTruthy(line.status_aktif),
          })),
        shifts: state.shiftMaster
          .filter((shift) => includeInactive || isTruthy(shift.status_aktif))
          .map((shift) => ({
            value: shift.shift_id,
            label: shift.shift_name || shift.shift_id,
            shift_id: shift.shift_id,
            shift_name: shift.shift_name || '',
            start_time: shift.start_time || '',
            end_time: shift.end_time || '',
            timezone: shift.timezone || 'Asia/Jakarta',
            status_aktif: isTruthy(shift.status_aktif),
          })),
        machines: buildMockMachineOptions(state, includeInactive),
        operators: state.userRoles
          .filter((user) => user.role === 'Operator')
          .filter((user) => includeInactive || isTruthy(user.status_aktif))
          .filter((user) => !isTruthy(user.is_deleted))
          .map((user) => ({
            value: user.email,
            label: user.username ? `${user.username} (${maskMockEmail(user.email)})` : maskMockEmail(user.email),
            email: user.email,
            username: user.username || '',
            role: 'Operator',
            status_aktif: isTruthy(user.status_aktif),
          })),
      });
    },
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
    getShiftOptions: (request = {}) => respond({
      shifts: state.shiftMaster
        .filter((shift) => request.include_inactive || isTruthy(shift.status_aktif))
        .map((shift) => ({
          value: shift.shift_id,
          label: shift.shift_name || shift.shift_id,
          shift_id: shift.shift_id,
          shift_name: shift.shift_name || '',
          start_time: shift.start_time || '',
          end_time: shift.end_time || '',
          timezone: shift.timezone || 'Asia/Jakarta',
          status_aktif: isTruthy(shift.status_aktif),
        })),
    }),
    getProductionTarget: (request = {}) => {
      assertMockPermission(state, request, 'production_target', 'read');
      const targets = listMockProductionTargets(state, request.filter || {}, request.include_inactive);
      return respond({
        active_target: targets.filter((target) => target.status_aktif)[0] || null,
        targets,
        scope: request.filter || {},
      });
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
    seedBagianMaster: (request = {}) => {
      assertMockPermission(state, request, 'bagian_master', 'seed');
      const inserted = seedDefaultBagianMaster(state);
      return respond({
        inserted,
        bagian: state.bagianMaster.map(normalizeMockBagian),
      });
    },
    seedDefectCategories: () => {
      const inserted = seedDefaultDefectCategories(state);
      return respond({
        inserted,
        categories: state.defectCategories.map((category) => ({ ...category })),
      });
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

      assertActiveMockDefectCategory(state, record);
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
    deactivateProductionTarget: (request = {}) => {
      assertMockPermission(state, request, 'production_target', 'soft_delete');
      const target = state.targetMaster.find((item) => item.target_id === request.target_id);
      if (!target) {
        throw new Error('Production target was not found.');
      }

      target.status_aktif = false;
      target.updated_by = state.session.email;
      target.updated_at = new Date().toISOString();
      return respond({ target_id: target.target_id, status_aktif: false });
    },
    upsertBagianMaster: (request = {}) => {
      const bagian = normalizeIncomingBagian(request.bagian || {});
      const index = state.bagianMaster.findIndex((item) => item.bagian_id === bagian.bagian_id);
      assertMockPermission(state, request, 'bagian_master', index === -1 ? 'create' : 'update');
      const now = new Date().toISOString();
      const existing = index >= 0 ? state.bagianMaster[index] : null;
      const record = {
        ...bagian,
        created_by: existing?.created_by || state.session.email,
        updated_by: state.session.email,
        created_at: existing?.created_at || now,
        updated_at: now,
      };

      if (index >= 0) {
        state.bagianMaster.splice(index, 1, record);
      } else {
        state.bagianMaster.push(record);
      }

      return respond({ bagian: normalizeMockBagian(record), created: index === -1 });
    },
    upsertDefectCategory: (request = {}) => {
      const category = normalizeMockDefectCategory(request.category || {});
      const existing = state.defectCategories.find((item) =>
        item.defect_category_id === category.defect_category_id,
      );

      if (existing) {
        Object.assign(existing, category, { updated_at: new Date().toISOString() });
      } else {
        state.defectCategories.push({ ...category, updated_at: new Date().toISOString() });
      }

      return respond({ category: { ...findDefectCategory(state, category.defect_category_id) } });
    },
    upsertProductionTarget: (request = {}) => {
      const now = new Date().toISOString();
      const incoming = normalizeMockProductionTarget(request.target || {});
      const index = state.targetMaster.findIndex((target) => target.target_id === incoming.target_id);
      const existing = index >= 0 ? state.targetMaster[index] : null;
      assertMockPermission(state, request, 'production_target', existing ? 'update' : 'create');
      if (incoming.scope_type !== 'OPERATOR_ONLY') {
        assertMockPermission(state, request, 'production_target', 'bulk_update');
      }

      const target = {
        ...incoming,
        target_id: incoming.target_id || crypto.randomUUID(),
        created_by: existing?.created_by || state.session.email,
        updated_by: state.session.email,
        created_at: existing?.created_at || now,
        updated_at: now,
      };

      if (index >= 0) {
        state.targetMaster[index] = target;
      } else {
        state.targetMaster.push(target);
      }

      return respond({ target, created: index < 0 });
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
    deactivateBagianMaster(payload) { this.invoke('deactivateBagianMaster', payload); },
    deactivateDefectCategory(payload) { this.invoke('deactivateDefectCategory', payload); },
    deactivateProductionTarget(payload) { this.invoke('deactivateProductionTarget', payload); },
    deleteScriptProperty(payload) { this.invoke('deleteScriptProperty', payload); },
    getDefectCategories(payload) { this.invoke('getDefectCategories', payload); },
    getBagianMaster(payload) { this.invoke('getBagianMaster', payload); },
    getHealthCheck(payload) { this.invoke('getHealthCheck', payload); },
    getHrdAccessDashboard(payload) { this.invoke('getHrdAccessDashboard', payload); },
    getManagementDashboard(payload) { this.invoke('getManagementDashboard', payload); },
    getOperatorDashboard(payload) { this.invoke('getOperatorDashboard', payload); },
    getOperatorReferenceData(payload) { this.invoke('getOperatorReferenceData', payload); },
    getProductionTarget(payload) { this.invoke('getProductionTarget', payload); },
    getSchemaHealthCheck(payload) { this.invoke('getSchemaHealthCheck', payload); },
    getScriptPropertiesStatus(payload) { this.invoke('getScriptPropertiesStatus', payload); },
    getSessionContext(payload) { this.invoke('getSessionContext', payload); },
    getShiftOptions(payload) { this.invoke('getShiftOptions', payload); },
    getSupervisorControlCenter(payload) { this.invoke('getSupervisorControlCenter', payload); },
    rejectAdjustment(payload) { this.invoke('rejectAdjustment', payload); },
    rejectQuarantine(payload) { this.invoke('rejectQuarantine', payload); },
    requestQuarantineCorrection(payload) { this.invoke('requestQuarantineCorrection', payload); },
    reopenDailyClosing(payload) { this.invoke('reopenDailyClosing', payload); },
    rotateSecretProperty(payload) { this.invoke('rotateSecretProperty', payload); },
    runMasterRecap(payload) { this.invoke('runMasterRecap', payload); },
    seedBagianMaster(payload) { this.invoke('seedBagianMaster', payload); },
    seedDefectCategories(payload) { this.invoke('seedDefectCategories', payload); },
    setScriptProperty(payload) { this.invoke('setScriptProperty', payload); },
    submitProductionReport(payload) { this.invoke('submitProductionReport', payload); },
    upsertBagianMaster(payload) { this.invoke('upsertBagianMaster', payload); },
    upsertDefectCategory(payload) { this.invoke('upsertDefectCategory', payload); },
    upsertProductionTarget(payload) { this.invoke('upsertProductionTarget', payload); },
  };
}

function findProperty(state, key) {
  const property = state.properties.find((item) => item.key === String(key || '').trim().toUpperCase());

  if (!property) {
    throw new Error('Script property key is not allowlisted.');
  }

  return property;
}

function findDefectCategory(state, defectCategoryId) {
  const category = state.defectCategories.find((item) =>
    item.defect_category_id === String(defectCategoryId || '').trim().toUpperCase(),
  );

  if (!category) {
    throw new Error('Defect category was not found.');
  }

  return category;
}

function findBagianMaster(state, bagianId) {
  const bagian = state.bagianMaster.find((item) =>
    item.bagian_id === String(bagianId || '').trim().toUpperCase(),
  );

  if (!bagian) {
    throw new Error('Bagian was not found.');
  }

  return bagian;
}

function seedDefaultBagianMaster(state) {
  const existing = new Set(state.bagianMaster.map((bagian) => bagian.bagian_id));
  const inserted = [];
  const now = new Date().toISOString();

  DEFAULT_BAGIAN_MASTER.forEach((bagian) => {
    if (existing.has(bagian.bagian_id)) {
      return;
    }

    state.bagianMaster.push({ ...bagian, created_at: now, updated_at: now });
    inserted.push(bagian.bagian_id);
  });

  return inserted;
}

function normalizeIncomingBagian(bagian) {
  const normalized = {
    bagian_id: String(bagian.bagian_id || '').trim().toUpperCase(),
    bagian_name: String(bagian.bagian_name || '').trim(),
    description: String(bagian.description || '').trim(),
    unit_rate: Number(bagian.unit_rate || 0),
    monthly_target_unit: Number(bagian.monthly_target_unit || 0),
    target_salary: Number(bagian.target_salary || 0),
    status_aktif: bagian.status_aktif === undefined ? true : isTruthy(bagian.status_aktif),
  };

  if (!/^[A-Z0-9_-]{2,40}$/.test(normalized.bagian_id)) {
    throw new Error('bagian_id must be 2-40 uppercase identifier chars.');
  }

  if (!normalized.bagian_name || normalized.bagian_name.length > 80) {
    throw new Error('bagian_name is required and max 80 chars.');
  }

  if (normalized.description.length > 160) {
    throw new Error('description max 160 chars.');
  }

  [
    ['unit_rate', 999999],
    ['monthly_target_unit', 999999],
    ['target_salary', 999999999],
  ].forEach(([field, maxValue]) => {
    if (!Number.isInteger(normalized[field]) || normalized[field] < 0 || normalized[field] > maxValue) {
      throw new Error(`${field} must be a positive integer.`);
    }
  });

  return normalized;
}

function normalizeMockBagian(bagian) {
  return {
    bagian_id: String(bagian.bagian_id || '').trim().toUpperCase(),
    bagian_name: String(bagian.bagian_name || '').trim(),
    description: String(bagian.description || '').trim(),
    unit_rate: Number(bagian.unit_rate || 0),
    monthly_target_unit: Number(bagian.monthly_target_unit || 0),
    target_salary: Number(bagian.target_salary || 0),
    status_aktif: bagian.status_aktif === undefined ? true : isTruthy(bagian.status_aktif),
    created_by: String(bagian.created_by || '').trim(),
    updated_by: String(bagian.updated_by || '').trim(),
    created_at: bagian.created_at || '',
    updated_at: bagian.updated_at || '',
  };
}

function assertActiveMockDefectCategory(state, record) {
  if (Number(record.perolehan_reject || 0) <= 0) {
    return;
  }

  const category = state.defectCategories.find((item) =>
    item.defect_category_id === String(record.defect_category_id || '').trim().toUpperCase()
    && isTruthy(item.status_aktif),
  );

  if (!category) {
    throw new Error('Defect category is not active or not found.');
  }
}

function seedDefaultDefectCategories(state) {
  const existing = new Set(state.defectCategories.map((category) => category.defect_category_id));
  const inserted = [];

  defaultDefectCategories.forEach((category) => {
    if (existing.has(category.defect_category_id)) {
      return;
    }

    state.defectCategories.push({ ...category, updated_at: new Date().toISOString() });
    inserted.push(category.defect_category_id);
  });

  return inserted;
}

function normalizeMockDefectCategory(category) {
  const normalized = {
    defect_category_id: String(category.defect_category_id || '').trim().toUpperCase(),
    defect_name: String(category.defect_name || '').trim(),
    qcc_factor: String(category.qcc_factor || '').trim(),
    severity: String(category.severity || '').trim().toUpperCase(),
    status_aktif: category.status_aktif === undefined ? true : isTruthy(category.status_aktif),
  };

  if (!/^DEF-[A-Z0-9-]{2,40}$/.test(normalized.defect_category_id)) {
    throw new Error('defect_category_id must use DEF-* format.');
  }

  if (!normalized.defect_name || normalized.defect_name.length > 80) {
    throw new Error('defect_name is required and max 80 chars.');
  }

  if (!['Man', 'Method', 'Machine', 'Material', 'Environment'].includes(normalized.qcc_factor)) {
    throw new Error('qcc_factor is invalid.');
  }

  if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(normalized.severity)) {
    throw new Error('severity is invalid.');
  }

  return normalized;
}

function normalizeMockProductionTarget(target) {
  const normalized = {
    target_id: String(target.target_id || '').trim().toLowerCase(),
    factory_date: String(target.factory_date || '').trim(),
    effective_from: String(target.effective_from || new Date().toISOString().slice(0, 10)).trim(),
    effective_until: String(target.effective_until || '').trim(),
    line_id: String(target.line_id || '').trim().toUpperCase(),
    shift_id: String(target.shift_id || '').trim().toUpperCase(),
    machine_id: String(target.machine_id || 'ALL').trim().toUpperCase(),
    operator_email: normalizeMockWildcardEmail(target.operator_email),
    target_harian: Number(target.target_harian || 0),
    scope_type: String(target.scope_type || 'LINE_SHIFT').trim().toUpperCase(),
    status_aktif: target.status_aktif === undefined ? true : isTruthy(target.status_aktif),
  };

  if (!normalized.line_id || !normalized.shift_id || !Number.isInteger(normalized.target_harian) || normalized.target_harian < 0) {
    throw new Error('Production target is invalid.');
  }

  if (!['ALL_USERS', 'OPERATOR_ONLY', 'LINE_SHIFT', 'MACHINE_SCOPE'].includes(normalized.scope_type)) {
    throw new Error('Production target scope_type is invalid.');
  }

  return normalized;
}

function listMockProductionTargets(state, filter, includeInactive) {
  const scopePriority = {
    OPERATOR_ONLY: 1,
    MACHINE_SCOPE: 2,
    LINE_SHIFT: 3,
    ALL_USERS: 4,
  };

  return state.targetMaster
    .filter((target) => includeInactive || isTruthy(target.status_aktif))
    .filter((target) => matchesMockTargetScope(target, filter))
    .filter((target) => isMockTargetDateActive(target, filter.factory_date))
    .map((target) => ({ ...target, status_aktif: isTruthy(target.status_aktif) }))
    .sort((a, b) =>
      scopePriority[a.scope_type] - scopePriority[b.scope_type]
      || String(b.effective_from || '').localeCompare(String(a.effective_from || '')),
    );
}

function normalizeMockWildcardEmail(value) {
  const normalized = String(value || 'ALL').trim();
  return normalized.toUpperCase() === 'ALL' ? 'ALL' : normalized.toLowerCase();
}

function assertMockPermission(state, request, resource, action) {
  const role = request.session?.simulated_role || state.session.role;
  const allowed = state.rolePermissions.some((permission) =>
    permission.role === role
    && permission.resource === resource
    && permission.action === action
    && isTruthy(permission.is_allowed),
  );

  if (!allowed) {
    throw new Error(`Mock RBAC denied for ${role}.${resource}.${action}.`);
  }
}

function buildMockMachineOptions(state, includeInactive) {
  const machines = new Set();
  state.targetMaster
    .filter((target) => includeInactive || isTruthy(target.status_aktif))
    .forEach((target) => {
      if (target.machine_id && target.machine_id !== 'ALL') {
        machines.add(target.machine_id);
      }
    });
  state.rawLogs.forEach((row) => {
    if (row.machine_id) {
      machines.add(row.machine_id);
    }
  });

  return [...machines].sort().map((machineId) => ({
    value: machineId,
    label: machineId,
    machine_id: machineId,
  }));
}

function maskMockEmail(email = '') {
  const [name, domain] = String(email).split('@');
  if (!name || !domain) {
    return '';
  }

  return `${name.slice(0, 2)}***@${domain}`;
}

function matchesMockTargetScope(target, filter = {}) {
  if (filter.line_id && target.line_id !== String(filter.line_id).toUpperCase()) {
    return false;
  }

  if (filter.shift_id && target.shift_id !== String(filter.shift_id).toUpperCase()) {
    return false;
  }

  if (filter.machine_id && target.machine_id !== 'ALL' && target.machine_id !== String(filter.machine_id).toUpperCase()) {
    return false;
  }

  if (filter.operator_email && target.operator_email !== 'ALL' && target.operator_email !== String(filter.operator_email).toLowerCase()) {
    return false;
  }

  return true;
}

function isMockTargetDateActive(target, factoryDate) {
  if (!factoryDate) {
    return true;
  }

  if (target.factory_date && target.factory_date !== factoryDate) {
    return false;
  }

  return target.effective_from <= factoryDate
    && (!target.effective_until || target.effective_until >= factoryDate);
}

function isTruthy(value) {
  return value === true || String(value).toUpperCase() === 'TRUE';
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

  if (key === 'REQUIRE_REGISTERED_EMAIL_LOGIN' && !['TRUE', 'FALSE'].includes(text.toUpperCase())) {
    throw new Error('REQUIRE_REGISTERED_EMAIL_LOGIN must be TRUE or FALSE.');
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

  if (key === 'AUTH_MODE' || key === 'APP_ACTIVE_UNTIL' || key === 'REQUIRE_REGISTERED_EMAIL_LOGIN') {
    return text;
  }

  if (text.length <= 8) {
    return '***';
  }

  return `${text.slice(0, 4)}...${text.slice(-4)}`;
}

function buildHrdAccessDashboard(state, request) {
  const filter = request.filter || {};
  const users = state.userRoles
    .map(maskMockUser)
    .filter((user) =>
      (!filter.role || user.role === filter.role)
      && matchesMockUserStatus(user, filter.status || 'ALL'),
    )
    .sort((a, b) => a.role.localeCompare(b.role) || a.email_masked.localeCompare(b.email_masked));
  const roleMatrix = buildMockRoleMatrix(state.rolePermissions);
  const auditSummary = buildMockAuditSummary(state.auditLogs);

  return {
    summary: {
      total_users: state.userRoles.length,
      active_users: state.userRoles.filter((user) => isTruthy(user.status_aktif) && !isTruthy(user.is_deleted)).length,
      inactive_users: state.userRoles.filter((user) => !isTruthy(user.status_aktif) && !isTruthy(user.is_deleted)).length,
      deleted_users: state.userRoles.filter((user) => isTruthy(user.is_deleted)).length,
      roles_with_missing_permissions: roleMatrix.filter((role) => role.readiness !== 'READY').length,
      last_audit_at: auditSummary.last_event_at,
    },
    users: paginate(users, normalizePagination(request)),
    role_matrix: roleMatrix,
    audit_summary: auditSummary,
  };
}

function maskMockUser(user) {
  return {
    user_id: user.user_id,
    employee_no: user.employee_no || user.user_id,
    full_name: user.full_name || user.username || '',
    address: user.address || '',
    email: user.email,
    email_masked: maskEmail(user.email),
    wa_number: user.wa_number || '',
    wa_url: buildWaUrl(user.wa_number),
    bagian_id: user.bagian_id || '',
    role: user.role,
    roles: user.roles || [user.role],
    status_aktif: isTruthy(user.status_aktif),
    is_deleted: isTruthy(user.is_deleted),
    last_login: user.last_login || '',
    created_at: user.created_at || '',
    updated_at: user.updated_at || '',
  };
}

function buildWaUrl(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : '';
}

function buildMockRoleMatrix(rolePermissions) {
  return ['Operator', 'Mandor', 'Supervisor', 'Management', 'HRD', 'SuperAdmin'].map((role) => {
    const permissions = rolePermissions.filter((permission) =>
      permission.role === role && isTruthy(permission.is_allowed),
    );
    return {
      role,
      permission_count: permissions.length,
      resources: [...new Set(permissions.map((permission) => permission.resource))].sort(),
      readiness: permissions.length > 0 ? 'READY' : 'MISSING_PERMISSION',
    };
  });
}

function buildMockAuditSummary(auditLogs) {
  return auditLogs.reduce((summary, row) => {
    const action = String(row.action || '');
    const group = action.startsWith('RBAC_')
      ? 'rbac'
      : action.startsWith('SESSION_')
        ? 'session'
        : action.startsWith('USER_ROLE_')
          ? 'user_role'
          : 'other';

    summary[group] += 1;
    if (row.created_at && row.created_at > summary.last_event_at) {
      summary.last_event_at = row.created_at;
    }
    return summary;
  }, {
    session: 0,
    rbac: 0,
    user_role: 0,
    other: 0,
    last_event_at: '',
  });
}

function matchesMockUserStatus(user, status) {
  if (status === 'ALL') {
    return true;
  }

  if (status === 'DELETED') {
    return user.is_deleted;
  }

  if (status === 'ACTIVE') {
    return user.status_aktif && !user.is_deleted;
  }

  if (status === 'INACTIVE') {
    return !user.status_aktif && !user.is_deleted;
  }

  return true;
}

function maskEmail(email) {
  const [name, domain] = String(email || '').trim().toLowerCase().split('@');

  if (!name || !domain) {
    return '[masked-email]';
  }

  return `${name.slice(0, 2)}***@${domain}`;
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

function getLatestMockProductionReview(state, transactionId) {
  const types = ['VOID', 'REQUEST_CORRECTION', 'PRE_CLOSING_CORRECTION'];
  return [...state.adjustments]
    .reverse()
    .find((row) =>
      row.source_transaction_id === transactionId
      && types.includes(String(row.adjustment_type || '').toUpperCase()),
    ) || null;
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
  const demo = buildManagementDemoDataset(state, filter);
  const legacyRows = filterRows(state.masterRecap, filter);
  const rows = filter.bagian_id || !legacyRows.length
    ? demo.recap_rows
    : legacyRows;
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
      present_count: demo.attendance_summary.present_count,
      absent_count: demo.attendance_summary.absent_count,
      pending_confirmation_count: demo.attendance_summary.pending_confirmation_count,
    },
    pareto: buildPareto(rows),
    bagian_summary: demo.bagian_summary,
    attendance_summary: demo.attendance_summary,
    wage_policy: demo.wage_policy,
    material_flow: demo.material_flow,
    rows: paginate(rows, pagination),
  };
}

function buildManagementDemoDataset(state, filter = {}) {
  const factoryDate = filter.factory_date || DEFAULT_MANAGEMENT_DEMO.attendance_summary.factory_date;
  const bagianFilter = String(filter.bagian_id || '').trim().toUpperCase();
  const policyByBagian = new Map(state.bagianMaster.map((bagian) => [String(bagian.bagian_id || '').toUpperCase(), normalizeMockBagian(bagian)]));
  const demoIds = new Set(DEFAULT_MANAGEMENT_DEMO.bagian_summary.map((bagian) => bagian.bagian_id));
  const baseRows = [
    ...DEFAULT_MANAGEMENT_DEMO.bagian_summary.map((bagian) => ({ ...bagian })),
    ...state.bagianMaster
      .filter((bagian) => !demoIds.has(String(bagian.bagian_id || '').toUpperCase()))
      .map((bagian) => ({
        bagian_id: bagian.bagian_id,
        bagian_name: bagian.bagian_name,
        target_total: 0,
        qc_ok_total: 0,
        qc_reject_total: 0,
        tandon_total: 0,
        present_count: 0,
        absent_count: 0,
        monthly_actual_unit: 0,
        recorder: '',
        verifier: '',
        verification_status: 'NO_TRANSACTION',
      })),
  ];
  const bagianSummary = baseRows.filter((bagian) =>
    !bagianFilter || bagian.bagian_id === bagianFilter,
  ).map((bagian) => {
    const policy = policyByBagian.get(bagian.bagian_id) || {};
    const actual = Number(bagian.qc_ok_total || 0) + Number(bagian.qc_reject_total || 0);
    const target = Number(bagian.target_total || 0);
    const unitRate = Number(policy.unit_rate ?? bagian.unit_rate ?? 0);
    const targetSalary = Number(policy.target_salary ?? bagian.target_salary ?? 0);
    const monthlyTargetUnit = Number(policy.monthly_target_unit ?? bagian.monthly_target_unit ?? 0);
    const monthlyActualUnit = Number(bagian.monthly_actual_unit || 0);
    return {
      ...bagian,
      bagian_name: policy.bagian_name || bagian.bagian_name,
      description: policy.description || '',
      unit_rate: unitRate,
      monthly_target_unit: monthlyTargetUnit,
      target_salary: targetSalary,
      status_aktif: policy.status_aktif ?? true,
      factory_date: factoryDate,
      actual_total: actual,
      achievement_rate: target > 0 ? Math.round((actual / target) * 1000) / 10 : 0,
      reject_rate: actual > 0 ? Math.round((Number(bagian.qc_reject_total || 0) / actual) * 1000) / 10 : 0,
      wage_estimate: unitRate * actual,
      monthly_wage_estimate: unitRate * monthlyActualUnit,
      umr_monthly: targetSalary,
      wage_gap_amount: Math.max(0, targetSalary - (unitRate * monthlyActualUnit)),
      wage_gap_units: unitRate > 0
        ? Math.ceil(Math.max(0, targetSalary - (unitRate * monthlyActualUnit)) / unitRate)
        : 0,
      umr_status: unitRate <= 0 || targetSalary <= 0
        ? 'POLICY_PENDING'
        : unitRate * monthlyActualUnit >= targetSalary
          ? 'MEETS_UMR'
          : 'BELOW_UMR',
    };
  });

  return {
    attendance_summary: {
      ...DEFAULT_MANAGEMENT_DEMO.attendance_summary,
      factory_date: factoryDate,
    },
    bagian_summary: bagianSummary,
    wage_policy: state.bagianMaster.map(normalizeMockBagian),
    material_flow: DEFAULT_MANAGEMENT_DEMO.material_flow.map((flow) => ({ ...flow })),
    recap_rows: bagianSummary.map((bagian) => ({
      recap_id: `${factoryDate}_${bagian.bagian_id}`,
      factory_date: factoryDate,
      operator_email: '',
      line_id: bagian.bagian_id,
      shift_id: 'ALL',
      machine_id: 'BAGIAN',
      target_total: bagian.target_total,
      tandon_total: bagian.tandon_total,
      ok_total: bagian.qc_ok_total,
      reject_total: bagian.qc_reject_total,
      defect_rate: bagian.reject_rate / 100,
      top_defect_category_id: bagian.bagian_id === 'SOLDER' ? 'DEF-SOLDER-THIN' : 'DEF-VISUAL-SCRATCH',
      generated_at: new Date().toISOString(),
    })),
  };
}

function buildOperatorDashboard(state, request) {
  const filter = request.filter || {};
  const period = normalizeTrendPeriod(request.period);
  const seedRows = createOperatorDashboardSeed(filter);
  const reviewState = buildMockProductionReviewState(state, filter);
  const submittedRows = state.rawLogs
    .filter((row) => row.status !== 'CONFLICT_PENDING')
    .filter((row) => !isMockReviewExcluded(reviewState.get(row.transaction_id)))
    .map((row) => ({
      transaction_id: row.transaction_id,
      device_timestamp: row.device_timestamp,
      factory_date: row.factory_date,
      line_id: row.line_id,
      shift_id: row.shift_id,
      machine_id: row.machine_id,
      target_harian: Number(row.target_harian || 0),
      tandon: Number(row.tandon || 0),
      perolehan_ok: Number(row.perolehan_ok || 0),
      perolehan_reject: Number(row.perolehan_reject || 0),
      defect_category_id: row.defect_category_id || '',
      status: row.status || 'ACCEPTED',
    }));
  const scopedFilter = {
    ...filter,
    factory_date: '',
  };
  const rows = filterRows([...seedRows, ...submittedRows], scopedFilter)
    .sort((a, b) => String(b.device_timestamp || '').localeCompare(String(a.device_timestamp || '')));
  const today = filter.factory_date || seedRows[seedRows.length - 1].factory_date;
  const yesterday = shiftDate(today, -1);
  const todayRows = rows.filter((row) => row.factory_date === today);
  const yesterdayRows = rows.filter((row) => row.factory_date === yesterday);
  const trendHistory = buildOperatorTrendHistory(rows, today, period);
  const allRecent = rows.slice(0, Number(request.page_size || 8));
  const todayTotals = summarizeOperatorRows(todayRows);
  const yesterdayTotals = summarizeOperatorRows(yesterdayRows);
  const todayTarget = resolveMockDashboardTarget(state, {
    ...filter,
    factory_date: today,
  }, todayTotals.target);
  const yesterdayTarget = resolveMockDashboardTarget(state, {
    ...filter,
    factory_date: yesterday,
  }, yesterdayTotals.target);

  return {
    filters: filter,
    period,
    pagination: normalizePagination(request),
    summary: {
      factory_date: today,
      line_id: filter.line_id || 'SMT-02',
      shift_id: filter.shift_id || 'SHIFT-1',
      machine_id: filter.machine_id || 'SLD-14',
      operator_name_masked: 'Operator Demo',
      target_today: todayTarget,
      tandon_today: todayTotals.tandon,
      ok_today: todayTotals.ok,
      reject_today: todayTotals.reject,
      target_yesterday: yesterdayTarget,
      tandon_yesterday: yesterdayTotals.tandon,
      ok_yesterday: yesterdayTotals.ok,
      reject_yesterday: yesterdayTotals.reject,
    },
    trend_history: trendHistory,
    weekly_history: period === 'DAILY' ? trendHistory : [],
    recent_submissions: allRecent,
    sync: {
      draft_status: 'saved',
      queue_count: state.rawLogs.filter((row) => row.status === 'CONFLICT_PENDING').length,
      last_sync_at: new Date().toISOString(),
      status: 'Mock GAS ready',
    },
    pareto: buildOperatorPareto(rows, state.defectCategories),
  };
}

function createOperatorDashboardSeed(filter) {
  const today = filter.factory_date || '2026-09-03';
  const lineId = filter.line_id || 'SMT-02';
  const shiftId = filter.shift_id || 'SHIFT-1';
  const machineId = filter.machine_id || 'SLD-14';
  const pattern = [
    [1200, 86, 0, 'DEF-SOLDER-THIN'],
    [1200, 78, -35, 'DEF-SOLDER-BRIDGE'],
    [1180, 92, 42, 'DEF-COMPONENT-MISS'],
    [1200, 80, -6, 'DEF-SOLDER-THIN'],
    [1210, 74, 0, 'DEF-VISUAL-SCRATCH'],
    [1190, 96, -42, 'DEF-SOLDER-THIN'],
    [1200, 84, 36, 'DEF-SOLDER-BRIDGE'],
  ];

  return Array.from({ length: 186 }, (_, dayIndex) => shiftDate(today, dayIndex - 185)).flatMap((date, index) => {
    const [baseTarget, baseTandon, actualVariance, defectId] = pattern[index % pattern.length];
    const cycleOffset = (index % 9) - 4;
    const target = Math.max(900, baseTarget + cycleOffset * 8);
    const tandon = Math.max(0, baseTandon + cycleOffset);
    const actual = Math.max(0, target + actualVariance + (actualVariance === 0 ? 0 : cycleOffset * 3));
    const reject = actual === target ? 0 : Math.max(6, Math.round(actual * (0.018 + (index % 4) * 0.004)));
    const ok = Math.max(0, actual - reject);
    const hour = index === 185 ? 9 : 15;
    return [
      {
        transaction_id: `mock-operator-${date}-a`,
        device_timestamp: `${date}T${String(hour).padStart(2, '0')}:12:00.000+07:00`,
        factory_date: date,
        line_id: lineId,
        shift_id: shiftId,
        machine_id: machineId,
        target_harian: target,
        tandon,
        perolehan_ok: Math.round(ok * 0.58),
        perolehan_reject: Math.round(reject * 0.56),
        defect_category_id: defectId,
        status: 'ACCEPTED',
      },
      {
        transaction_id: `mock-operator-${date}-b`,
        device_timestamp: `${date}T${String(hour + 3).padStart(2, '0')}:35:00.000+07:00`,
        factory_date: date,
        line_id: lineId,
        shift_id: shiftId,
        machine_id: machineId,
        target_harian: 0,
        tandon: 0,
        perolehan_ok: ok - Math.round(ok * 0.58),
        perolehan_reject: reject - Math.round(reject * 0.56),
        defect_category_id: defectId,
        status: index === 184 ? 'PENDING_SYNC' : 'ACCEPTED',
      },
    ];
  });
}

function buildOperatorTrendHistory(rows, anchorDate, period) {
  if (period === 'WEEKLY') {
    return Array.from({ length: 8 }, (_, index) => {
      const end = shiftDate(anchorDate, (index - 7) * 7);
      const start = shiftDate(end, -6);
      return summarizeTrendBucket(rows, start, end, index === 7 ? 'Minggu ini' : `W-${7 - index}`, period);
    });
  }

  if (period === 'MONTHLY') {
    return Array.from({ length: 6 }, (_, index) => {
      const monthAnchor = shiftMonth(anchorDate, index - 5);
      const start = monthStart(monthAnchor);
      const end = monthEnd(monthAnchor);
      return summarizeTrendBucket(rows, start, end, index === 5 ? 'Bulan ini' : monthAnchor.slice(0, 7), period);
    });
  }

  return Array.from({ length: 7 }, (_, index) => {
    const date = shiftDate(anchorDate, index - 6);
    const label = date === anchorDate ? 'Hari ini' : date === shiftDate(anchorDate, -1) ? 'Kemarin' : date.slice(5);
    return summarizeTrendBucket(rows, date, date, label, period);
  });
}

function summarizeTrendBucket(rows, startDate, endDate, label, period) {
  const totals = summarizeOperatorRows(rows.filter((row) =>
    row.factory_date >= startDate && row.factory_date <= endDate,
  ));

  return {
    period,
    period_start: startDate,
    period_end: endDate,
    factory_date: endDate,
    label,
    target: totals.target,
    actual: totals.ok + totals.reject,
    ok: totals.ok,
    reject: totals.reject,
    tandon: totals.tandon,
  };
}

function normalizeTrendPeriod(period) {
  const value = String(period || 'DAILY').trim().toUpperCase();
  return ['DAILY', 'WEEKLY', 'MONTHLY'].includes(value) ? value : 'DAILY';
}

function shiftDate(dateString, days) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function shiftMonth(dateString, months) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + months, 1);
  return date.toISOString().slice(0, 10);
}

function monthStart(dateString) {
  return `${dateString.slice(0, 7)}-01`;
}

function monthEnd(dateString) {
  const date = new Date(`${dateString.slice(0, 7)}-01T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  return date.toISOString().slice(0, 10);
}

function summarizeOperatorRows(rows) {
  const targetByDate = new Map();
  const totals = rows.reduce((total, row) => {
    const target = Number(row.target_harian || 0);
    if (target > 0) {
      const key = row.factory_date || row.device_timestamp?.slice(0, 10) || 'unknown-date';
      targetByDate.set(key, Math.max(targetByDate.get(key) || 0, target));
    }

    return {
      target: total.target,
      tandon: total.tandon + Number(row.tandon || 0),
      ok: total.ok + Number(row.perolehan_ok || 0),
      reject: total.reject + Number(row.perolehan_reject || 0),
    };
  }, {
    target: 0,
    tandon: 0,
    ok: 0,
    reject: 0,
  });

  totals.target = [...targetByDate.values()].reduce((sum, value) => sum + value, 0);
  return totals;
}

function resolveMockDashboardTarget(state, filter, fallbackTarget) {
  const target = listMockProductionTargets(state, filter, false)[0] || null;
  return target && Number(target.target_harian || 0) > 0
    ? Number(target.target_harian)
    : fallbackTarget;
}

function buildOperatorPareto(rows, categories) {
  const metadata = new Map(categories.map((category) => [
    category.defect_category_id,
    category,
  ]));
  const buckets = new Map();
  rows.forEach((row) => {
    if (!row.defect_category_id || Number(row.perolehan_reject || 0) <= 0) {
      return;
    }
    buckets.set(row.defect_category_id, (buckets.get(row.defect_category_id) || 0) + Number(row.perolehan_reject || 0));
  });
  const total = [...buckets.values()].reduce((sum, value) => sum + value, 0);

  return [...buckets.entries()]
    .map(([defect_category_id, reject_total]) => {
      const category = metadata.get(defect_category_id) || {};
      return {
        defect_category_id,
        defect_name: category.defect_name || defect_category_id,
        reject_total,
        pareto_percent: total > 0 ? Math.round((reject_total / total) * 1000) / 10 : 0,
        qcc_factor: category.qcc_factor || '-',
        severity: category.severity || '-',
      };
    })
    .sort((a, b) => b.reject_total - a.reject_total || a.defect_category_id.localeCompare(b.defect_category_id));
}

function buildRecapRows(state, filter) {
  const grouped = new Map();
  const reviewState = buildMockProductionReviewState(state, filter);
  filterRows(state.rawLogs, filter)
    .filter((row) => row.status === 'ACCEPTED' || isApprovedQuarantine(state, row.transaction_id))
    .filter((row) => !isMockReviewExcluded(reviewState.get(row.transaction_id)))
    .forEach((row) => {
      addMockRecapRow(grouped, row, row);
    });
  filterRows(state.adjustments, filter)
    .filter((adjustment) => adjustment.status === 'APPROVED')
    .forEach((adjustment) => {
      const source = state.rawLogs.find((row) => row.transaction_id === adjustment.source_transaction_id);
      if (!source || isMockReviewExcluded(reviewState.get(source.transaction_id))) {
        return;
      }
      addMockRecapRow(grouped, source, JSON.parse(adjustment.delta_json || '{}'));
    });
  return [...grouped.values()];
}

function addMockRecapRow(grouped, source, values) {
  const key = `${source.factory_date}_${source.operator_email}_${source.line_id}_${source.shift_id}_${source.machine_id}`;
  const current = grouped.get(key) || {
    recap_id: key,
    factory_date: source.factory_date,
    operator_email: source.operator_email,
    line_id: source.line_id,
    shift_id: source.shift_id,
    machine_id: source.machine_id,
    target_total: 0,
    tandon_total: 0,
    ok_total: 0,
    reject_total: 0,
    top_defect_category_id: '',
    generated_at: new Date().toISOString(),
  };
  current.target_total += Number(values.target_harian || 0);
  current.tandon_total += Number(values.tandon || 0);
  current.ok_total += Number(values.perolehan_ok || 0);
  current.reject_total += Number(values.perolehan_reject || 0);
  current.top_defect_category_id = current.top_defect_category_id || values.defect_category_id || '';
  const output = current.ok_total + current.reject_total;
  current.defect_rate = output > 0 ? Math.round((current.reject_total / output) * 10000) / 10000 : 0;
  grouped.set(key, current);
}

function buildMockProductionReviewState(state, filter) {
  const types = ['VOID', 'REQUEST_CORRECTION', 'PRE_CLOSING_CORRECTION'];
  const adjustmentFilter = {
    factory_date: filter.factory_date,
    line_id: filter.line_id,
    shift_id: filter.shift_id,
  };
  return filterRows(state.adjustments, adjustmentFilter).reduce((map, adjustment) => {
    if (types.includes(String(adjustment.adjustment_type || '').toUpperCase())) {
      map.set(adjustment.source_transaction_id, adjustment);
    }
    return map;
  }, new Map());
}

function isMockReviewExcluded(review) {
  if (!review) {
    return false;
  }

  if (review.adjustment_type === 'VOID' && review.status === 'APPROVED') {
    return true;
  }

  return review.adjustment_type === 'REQUEST_CORRECTION'
    && ['PENDING', 'APPROVED'].includes(review.status);
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

function mergeDefaultRows(existingRows, defaultRows, getKey) {
  const rows = structuredCloneSafe(existingRows || []);
  const existingKeys = new Set(rows.map(getKey));

  defaultRows.forEach((defaultRow) => {
    const key = getKey(defaultRow);
    if (!existingKeys.has(key)) {
      rows.push(structuredCloneSafe(defaultRow));
      existingKeys.add(key);
    }
  });

  return rows;
}

function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value));
}
