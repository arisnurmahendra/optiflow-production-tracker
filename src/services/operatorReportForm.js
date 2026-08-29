import { z } from 'zod';

export const CLIENT_VERSION = 'v0.1.0';

export const lineOptions = Object.freeze([
  { value: 'SMT-01', label: 'SMT-01' },
  { value: 'SMT-02', label: 'SMT-02' },
  { value: 'ASSY-01', label: 'ASSY-01' },
]);

export const shiftOptions = Object.freeze([
  { value: 'SHIFT-1', label: 'Pagi' },
  { value: 'SHIFT-2', label: 'Siang' },
  { value: 'SHIFT-3', label: 'Malam' },
]);

export const machineOptions = Object.freeze([
  { value: 'SLD-14', label: 'SLD-14' },
  { value: 'SLD-18', label: 'SLD-18' },
  { value: 'ASM-03', label: 'ASM-03' },
]);

export const defectOptions = Object.freeze([
  { value: '', label: 'Tidak ada defect' },
  { value: 'DEF-SOLDER-THIN', label: 'Solder tipis' },
  { value: 'DEF-SOLDER-BRIDGE', label: 'Solder bridge' },
  { value: 'DEF-COMPONENT-MISS', label: 'Komponen missing' },
]);

export const initialOperatorReportForm = Object.freeze({
  line_id: 'SMT-02',
  shift_id: 'SHIFT-1',
  machine_id: 'SLD-14',
  target_harian: 1200,
  tandon: 80,
  perolehan_ok: 1164,
  perolehan_reject: 36,
  defect_category_id: 'DEF-SOLDER-THIN',
  defect_notes: 'Sampling akhir',
});

const integerField = z.coerce.number()
  .int('Harus angka bulat.')
  .min(0, 'Tidak boleh negatif.')
  .max(999999, 'Angka terlalu besar.');

export const operatorReportSchema = z.object({
  line_id: z.string().min(1, 'Line wajib dipilih.'),
  shift_id: z.string().min(1, 'Shift wajib dipilih.'),
  machine_id: z.string().min(1, 'Machine wajib dipilih.'),
  target_harian: integerField,
  tandon: integerField,
  perolehan_ok: integerField,
  perolehan_reject: integerField,
  defect_category_id: z.string().optional().default(''),
  defect_notes: z.string().max(140, 'Catatan maksimal 140 karakter.').optional().default(''),
}).superRefine((value, context) => {
  if (value.perolehan_reject > 0 && !value.defect_category_id) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['defect_category_id'],
      message: 'Kategori defect wajib ketika Reject lebih dari 0.',
    });
  }

  if (value.perolehan_ok + value.perolehan_reject > value.target_harian + value.tandon) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['perolehan_ok'],
      message: 'OK + Reject tidak boleh melebihi Target + Tandon.',
    });
  }
});

export function validateOperatorReport(form) {
  const result = operatorReportSchema.safeParse(form);

  if (result.success) {
    return {
      valid: true,
      data: result.data,
      errors: {},
    };
  }

  return {
    valid: false,
    data: null,
    errors: result.error.issues.reduce((errors, issue) => {
      const field = issue.path[0] || 'form';
      errors[field] = issue.message;
      return errors;
    }, {}),
  };
}

export function createOperatorReportPayload(form, options = {}) {
  const validation = validateOperatorReport(form);

  if (!validation.valid) {
    return validation;
  }

  const now = options.now || new Date();
  const transactionId = options.transactionId || createUuid();
  const operatorEmail = options.operatorEmail || 'dev.operator@optiflow.local';

  return {
    valid: true,
    data: {
      metadata: {
        transaction_id: transactionId,
        device_timestamp: now.toISOString(),
        sync_type: options.syncType || 'LIVE',
        operator_email: operatorEmail,
        client_version: options.clientVersion || CLIENT_VERSION,
      },
      payload: {
        ...validation.data,
        defect_category_id: validation.data.perolehan_reject > 0 ? validation.data.defect_category_id : '',
        defect_notes: validation.data.defect_notes || '',
      },
    },
    errors: {},
  };
}

export function createDraftQueueItem(payload) {
  return {
    id: payload.metadata.transaction_id,
    status: 'PENDING_SYNC',
    time: formatDeviceTime(payload.metadata.device_timestamp),
    payload,
  };
}

export function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US');
}

export function formatDeviceTime(timestamp) {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(timestamp));
}

function createUuid() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return 'tx-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}
