export const defaultDashboardFilters = Object.freeze({
  factory_date: '2026-09-02',
  line_id: '',
  shift_id: '',
});

export function buildDashboardTiles(data = {}) {
  const summary = data.summary || {};
  const output = Number(summary.ok_total || 0) + Number(summary.reject_total || 0);

  return [
    { label: 'Target', value: formatCompact(summary.target_total), tone: 'neutral' },
    { label: 'OK', value: formatCompact(summary.ok_total), tone: 'success' },
    { label: 'Reject', value: formatCompact(summary.reject_total), tone: Number(summary.reject_total || 0) > 0 ? 'warning' : 'success' },
    { label: 'Defect Rate', value: output > 0 ? `${Math.round(Number(summary.defect_rate || 0) * 10000) / 100}%` : '0%', tone: 'neutral' },
  ];
}

export function formatCompact(value) {
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
