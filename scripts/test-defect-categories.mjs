import {
  createParetoRejectSummary,
  defectOptions,
  getDefectOptions,
  getDefectCategory,
  isActiveDefectCategory,
  setDefectCategories,
} from '../src/services/defectCategories.js';

if (!defectOptions.some((option) => option.value === 'DEF-SOLDER-THIN' && option.qcc_factor === 'Method')) {
  throw new Error('Expected defect options to expose QCC factor metadata.');
}

if (getDefectCategory('DEF-SOLDER-BRIDGE')?.severity !== 'HIGH') {
  throw new Error('Expected defect catalog lookup to return severity.');
}

if (isActiveDefectCategory('DEF-NOT-ACTIVE')) {
  throw new Error('Expected unknown defect category to be inactive.');
}

setDefectCategories([
  {
    defect_category_id: 'DEF-RUNTIME-ONLY',
    defect_name: 'Runtime defect',
    qcc_factor: 'Machine',
    severity: 'CRITICAL',
    status_aktif: true,
  },
  {
    defect_category_id: 'DEF-INACTIVE',
    defect_name: 'Inactive defect',
    qcc_factor: 'Method',
    severity: 'LOW',
    status_aktif: false,
  },
]);

if (!getDefectOptions().some((option) => option.value === 'DEF-RUNTIME-ONLY')
  || getDefectOptions().some((option) => option.value === 'DEF-INACTIVE')) {
  throw new Error('Expected runtime defect catalog to expose active spreadsheet-backed options only.');
}

setDefectCategories([]);

const pareto = createParetoRejectSummary([
  { payload: { defect_category_id: 'DEF-SOLDER-THIN', perolehan_reject: 10 } },
  { payload: { defect_category_id: 'DEF-SOLDER-BRIDGE', perolehan_reject: 30 } },
  { payload: { defect_category_id: 'DEF-SOLDER-THIN', perolehan_reject: 10 } },
  { payload: { defect_category_id: '', perolehan_reject: 99 } },
]);

if (pareto[0].defect_category_id !== 'DEF-SOLDER-BRIDGE'
  || pareto[0].pareto_percent !== 60
  || pareto[1].reject_total !== 20) {
  throw new Error('Expected Pareto summary to sort and aggregate reject totals.');
}

console.log('defect categories test ok');
