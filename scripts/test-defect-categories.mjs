import {
  createParetoRejectSummary,
  defectOptions,
  getDefectCategory,
  isActiveDefectCategory,
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
