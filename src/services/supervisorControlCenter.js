export const defaultSupervisorFilters = Object.freeze({
  factory_date: '2026-09-02',
  line_id: 'SMT-02',
  shift_id: 'SHIFT-1',
  status: '',
});

export function createClosingPayload(filters, notes = '') {
  return {
    factory_date: filters.factory_date,
    line_id: filters.line_id,
    shift_id: filters.shift_id,
    notes,
  };
}

export function createAdjustmentPayload(sourceTransactionId, delta, reason) {
  return {
    source_transaction_id: sourceTransactionId,
    adjustment_type: 'POST_CLOSING_ADJUSTMENT',
    delta,
    reason,
  };
}

export function summarizeControlCenter(data = {}) {
  const summary = data.summary || {};
  return [
    { label: 'Raw logs', value: summary.total_raw_logs || 0, tone: 'neutral' },
    { label: 'Quarantine', value: summary.pending_quarantine || 0, tone: summary.pending_quarantine ? 'conflict' : 'success' },
    { label: 'Closing', value: summary.closed_scopes || 0, tone: summary.closed_scopes ? 'success' : 'warning' },
    { label: 'Adjustment', value: summary.pending_adjustments || 0, tone: summary.pending_adjustments ? 'warning' : 'neutral' },
  ];
}

export function getFirstPageItems(page) {
  return page?.items || [];
}
