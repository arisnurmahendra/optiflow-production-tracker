import { z } from 'zod';
import {
  createParetoRejectSummary,
  defectOptions,
  getDefectOptions,
  getDefectCategory,
  isActiveDefectCategory,
  setDefectCategories,
} from './defectCategories.js';

export const CLIENT_VERSION = 'v0.1.0';
export {
  createParetoRejectSummary,
  defectOptions,
  getDefectOptions,
  getDefectCategory,
  setDefectCategories,
};

export const lineOptions = Object.freeze([
  { value: 'SMT-01', label: 'SMT-01' },
  { value: 'SMT-02', label: 'SMT-02' },
  { value: 'ASSY-01', label: 'ASSY-01' },
]);

export const bagianOptions = Object.freeze([
  { value: 'SOLDER', label: 'Bagian Solder' },
  { value: 'LEM', label: 'Bagian Lem' },
  { value: 'PACKING', label: 'Bagian Packing' },
]);

export const shiftOptions = Object.freeze([
  { value: 'SHIFT-1', label: 'Shift 1' },
  { value: 'SHIFT-2', label: 'Shift 2' },
  { value: 'SHIFT-3', label: 'Shift 3' },
]);

export const machineOptions = Object.freeze([
  { value: 'SLD-14', label: 'SLD-14' },
  { value: 'SLD-18', label: 'SLD-18' },
  { value: 'ASM-03', label: 'ASM-03' },
]);

export const workCategoryOptions = Object.freeze([
  { value: 'SOLDER', label: 'Solder' },
  { value: 'LEM', label: 'Lem' },
  { value: 'PACKING', label: 'Packing' },
]);

export const initialOperatorReportForm = Object.freeze({
  bagian_id: 'SOLDER',
  work_category_id: 'SOLDER',
  line_id: 'SMT-02',
  shift_id: 'SHIFT-1',
  machine_id: 'SLD-14',
  target_harian: 1200,
  tandon: 0,
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
  bagian_id: z.string().min(1, 'Bagian wajib dipilih.'),
  work_category_id: z.string().min(1, 'Jenis pekerjaan wajib dipilih.'),
  line_id: z.string().min(1, 'Bagian legacy wajib tersedia.'),
  shift_id: z.string().min(1, 'Shift wajib dipilih.'),
  machine_id: z.string().min(1, 'Jenis pekerjaan legacy wajib tersedia.'),
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

  if (value.defect_category_id && !isActiveDefectCategory(value.defect_category_id)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['defect_category_id'],
      message: 'Kategori defect tidak aktif atau tidak dikenal.',
    });
  }

  // Target hanya dibandingkan dengan OK + Reject. Tandon tetap data konteks terpisah.
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
