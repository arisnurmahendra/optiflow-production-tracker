import {
  createDraftQueueItem,
  createOperatorReportPayload,
  initialOperatorReportForm,
  validateOperatorReport,
} from '../src/services/operatorReportForm.js';

const valid = createOperatorReportPayload(initialOperatorReportForm, {
  now: new Date('2026-08-30T01:00:00.000Z'),
  operatorEmail: 'operator@example.com',
  transactionId: '550e8400-e29b-41d4-a716-446655440000',
});

if (!valid.valid) {
  throw new Error('Expected initial operator report form to be valid.');
}

if (valid.data.metadata.transaction_id !== '550e8400-e29b-41d4-a716-446655440000') {
  throw new Error('Expected payload to include transaction_id.');
}

if (valid.data.payload.perolehan_reject !== 36 || valid.data.payload.defect_category_id === '') {
  throw new Error('Expected reject payload to keep defect category.');
}

const queueItem = createDraftQueueItem(valid.data);
if (queueItem.status !== 'PENDING_SYNC' || queueItem.id !== valid.data.metadata.transaction_id) {
  throw new Error('Expected draft queue item to use payload transaction id.');
}

const noDefect = validateOperatorReport({
  ...initialOperatorReportForm,
  perolehan_reject: 1,
  defect_category_id: '',
});

if (noDefect.valid || !noDefect.errors.defect_category_id) {
  throw new Error('Expected reject without defect category to fail.');
}

const negative = validateOperatorReport({
  ...initialOperatorReportForm,
  tandon: -1,
});

if (negative.valid || !negative.errors.tandon) {
  throw new Error('Expected negative tandon to fail.');
}

const overCapacity = validateOperatorReport({
  ...initialOperatorReportForm,
  target_harian: 100,
  tandon: 0,
  perolehan_ok: 120,
  perolehan_reject: 1,
});

if (overCapacity.valid || !overCapacity.errors.perolehan_ok) {
  throw new Error('Expected output above target plus tandon to fail.');
}

const zeroReject = createOperatorReportPayload({
  ...initialOperatorReportForm,
  perolehan_reject: 0,
  defect_category_id: 'DEF-SOLDER-THIN',
});

if (!zeroReject.valid || zeroReject.data.payload.defect_category_id !== '') {
  throw new Error('Expected zero reject payload to clear defect category.');
}

console.log('operator report form test ok');
