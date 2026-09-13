export const approvalStatusOptions = Object.freeze([
  { value: 'ALL', label: 'Semua status' },
  { value: 'CONFLICT_PENDING', label: 'Bentrok Data' },
  { value: 'PENDING', label: 'Review Umum' },
]);

export const approvalLineOptions = Object.freeze([
  { value: 'ALL', label: 'Semua line' },
  { value: 'SMT-02', label: 'SMT-02' },
  { value: 'ASSY-01', label: 'ASSY-01' },
]);

export const initialApprovalCases = Object.freeze([
  {
    id: 'Q-20260902-001',
    transaction_id: '550e8400-e29b-41d4-a716-446655440001',
    status: 'CONFLICT_PENDING',
    reason_code: 'MACHINE_OPERATOR_TIME_COLLISION',
    priority: 1,
    line_id: 'SMT-02',
    shift_id: 'SHIFT-1',
    machine_id: 'SLD-14',
    submitted_at: '2026-09-02T01:18:00.000Z',
    current: {
      operator: 'Rina',
      operator_email_masked: 'ri***@factory.local',
      ok: 416,
      reject: 12,
      defect_category_id: 'DEF-SOLDER-THIN',
      device_timestamp: '2026-09-02T01:16:20.000Z',
    },
    conflict_with: {
      operator: 'Andi',
      operator_email_masked: 'an***@factory.local',
      ok: 420,
      reject: 8,
      defect_category_id: 'DEF-SOLDER-THIN',
      device_timestamp: '2026-09-02T01:11:52.000Z',
    },
    note: 'Mesin sama, operator berbeda, selisih 4 menit 28 detik.',
  },
  {
    id: 'Q-20260902-002',
    transaction_id: '550e8400-e29b-41d4-a716-446655440002',
    status: 'PENDING',
    reason_code: 'TIME_DRIFT',
    priority: 2,
    line_id: 'SMT-02',
    shift_id: 'SHIFT-2',
    machine_id: 'SLD-18',
    submitted_at: '2026-09-02T02:04:00.000Z',
    current: {
      operator: 'Budi',
      operator_email_masked: 'bu***@factory.local',
      ok: 328,
      reject: 5,
      defect_category_id: 'DEF-SOLDER-BRIDGE',
      device_timestamp: '2026-09-02T01:51:10.000Z',
    },
    conflict_with: null,
    note: 'Timestamp perangkat perlu dicek ulang sebelum masuk rekap.',
  },
]);

const FINAL_STATUSES = ['APPROVED', 'REJECTED', 'CORRECTION_REQUESTED'];
export const actionableApprovalStatuses = Object.freeze(['CONFLICT_PENDING', 'PENDING']);

export function summarizeApprovalCases(cases) {
  return cases.reduce((summary, item) => {
    if (item.status === 'CONFLICT_PENDING') {
      summary.conflict += 1;
    }

    if (item.status === 'PENDING') {
      summary.pending += 1;
    }

    if (FINAL_STATUSES.includes(item.status)) {
      summary.resolved += 1;
    }

    return summary;
  }, {
    conflict: 0,
    pending: 0,
    resolved: 0,
  });
}

export function filterApprovalCases(cases, filters = {}) {
  return [...cases]
    .filter((item) => !filters.status || filters.status === 'ALL' || item.status === filters.status)
    .filter((item) => !filters.line || filters.line === 'ALL' || item.line_id === filters.line)
    .sort((a, b) => {
      if (a.status === 'CONFLICT_PENDING' && b.status !== 'CONFLICT_PENDING') {
        return -1;
      }

      if (b.status === 'CONFLICT_PENDING' && a.status !== 'CONFLICT_PENDING') {
        return 1;
      }

      return a.priority - b.priority || String(b.submitted_at).localeCompare(String(a.submitted_at));
    });
}

export function filterActionableApprovalCases(cases) {
  return cases.filter((item) => actionableApprovalStatuses.includes(item.status));
}

export function createApprovalCasesFromControlCenter(data = {}) {
  const rawRows = data.raw_logs?.items || [];
  const rawByTransaction = new Map(rawRows.map((row) => [row.transaction_id, row]));
  const rows = data.quarantine?.items || [];

  return rows.map((row, index) => {
    const raw = rawByTransaction.get(row.transaction_id) || {};
    return {
      id: row.quarantine_id,
      transaction_id: row.transaction_id,
      status: row.status || 'PENDING',
      reason_code: row.reason_code || 'REVIEW_REQUIRED',
      priority: row.status === 'CONFLICT_PENDING' ? 1 : index + 2,
      line_id: row.line_id || raw.line_id || '',
      shift_id: row.shift_id || raw.shift_id || '',
      machine_id: row.machine_id || raw.machine_id || '',
      submitted_at: raw.server_received_at || raw.device_timestamp || '',
      current: {
        operator: raw.operator_name || 'Operator',
        operator_email_masked: raw.operator_email_masked || maskEmail(raw.operator_email),
        ok: Number(raw.perolehan_ok || 0),
        reject: Number(raw.perolehan_reject || 0),
        defect_category_id: raw.defect_category_id || '',
        device_timestamp: raw.device_timestamp || '',
      },
      conflict_with: null,
      note: row.notes || 'Kasus membutuhkan keputusan Mandor sebelum masuk proses recap.',
    };
  });
}

export function findApprovalCase(cases, id) {
  return cases.find((item) => item.id === id) || null;
}

export function resolveApprovalCase(cases, id, action, now = () => new Date().toISOString()) {
  const allowedActions = {
    APPROVE_CURRENT: 'APPROVED',
    REJECT_BOTH: 'REJECTED',
    REQUEST_CORRECTION: 'CORRECTION_REQUESTED',
  };
  const nextStatus = allowedActions[action];

  if (!nextStatus) {
    throw new Error('Unknown approval action.');
  }

  return cases.map((item) => {
    if (item.id !== id) {
      return item;
    }

    return {
      ...item,
      status: nextStatus,
      reviewed_at: now(),
      staged_action: action,
    };
  });
}

function maskEmail(email) {
  const value = String(email || '').trim();
  if (!value || !value.includes('@')) {
    return '-';
  }

  const [name, domain] = value.split('@');
  return `${name.slice(0, 2)}***@${domain}`;
}
