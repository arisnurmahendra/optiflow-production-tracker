import { computed, ref, watch } from 'vue';
import { createIndexedDbPersistence, PersistenceError } from '../services/indexedDbPersistence.js';
import {
  createDraftQueueItem,
  createOperatorReportPayload,
  formatNumber,
  initialOperatorReportForm,
} from '../services/operatorReportForm.js';

const AUTOSAVE_DELAY_MS = 250;

export function useOperatorReportStore(options = {}) {
  const persistence = options.persistence || createIndexedDbPersistence();
  const form = ref({ ...initialOperatorReportForm });
  const formErrors = ref({});
  const queueItems = ref([]);
  const draftStatus = ref('Memuat draft');
  const submitMessage = ref('');
  const persistenceError = ref('');
  const isHydrated = ref(false);
  let autosaveTimer;

  const totalOutput = computed(() => Number(form.value.perolehan_ok || 0) + Number(form.value.perolehan_reject || 0));
  const productionCapacity = computed(() => Number(form.value.target_harian || 0) + Number(form.value.tandon || 0));
  const shouldShowDefect = computed(() => Number(form.value.perolehan_reject || 0) > 0);
  const isTotalValid = computed(() => totalOutput.value <= productionCapacity.value);
  const metrics = computed(() => [
    { label: 'Target', value: formatNumber(form.value.target_harian), tone: 'neutral' },
    { label: 'OK', value: formatNumber(form.value.perolehan_ok), tone: 'success' },
    { label: 'Reject', value: formatNumber(form.value.perolehan_reject), tone: 'danger' },
    { label: 'Queue', value: formatNumber(queueItems.value.length), tone: 'warning' },
  ]);

  async function hydrate() {
    try {
      const snapshot = await persistence.loadSnapshot();

      if (snapshot.draft) {
        form.value = {
          ...initialOperatorReportForm,
          ...snapshot.draft,
        };
      }

      queueItems.value = snapshot.queue || [];
      draftStatus.value = snapshot.draft ? 'Draft dimuat' : 'Draft tersimpan';
      persistenceError.value = '';
    } catch (error) {
      draftStatus.value = 'Draft lokal gagal';
      persistenceError.value = getPersistenceMessage(error);
    } finally {
      isHydrated.value = true;
    }
  }

  async function saveDraft() {
    draftStatus.value = 'Menyimpan draft';

    try {
      await persistence.saveDraft(form.value);
      draftStatus.value = 'Draft tersimpan';
      submitMessage.value = 'Draft tersimpan di IndexedDB.';
      persistenceError.value = '';
    } catch (error) {
      draftStatus.value = 'Draft gagal';
      persistenceError.value = getPersistenceMessage(error);
    }
  }

  async function submitOperatorReport(optionsOverride = {}) {
    const result = createOperatorReportPayload(form.value, {
      operatorEmail: optionsOverride.operatorEmail || 'dev.operator@optiflow.local',
      syncType: optionsOverride.syncType || 'OFFLINE_QUEUE',
    });

    formErrors.value = result.errors;

    if (!result.valid) {
      submitMessage.value = 'Periksa field yang ditandai sebelum submit.';
      return null;
    }

    const queueItem = createDraftQueueItem(result.data);

    try {
      const persisted = await persistence.enqueueReport(queueItem);
      queueItems.value = [persisted, ...queueItems.value.filter((item) => item.id !== persisted.id)];
      draftStatus.value = 'Menunggu sinkronisasi';
      submitMessage.value = `Payload ${persisted.id} tersimpan di queue IndexedDB.`;
      persistenceError.value = '';
      return persisted;
    } catch (error) {
      draftStatus.value = 'Queue gagal';
      persistenceError.value = getPersistenceMessage(error);
      return null;
    }
  }

  function clearFieldError(field) {
    if (!formErrors.value[field]) {
      return;
    }

    formErrors.value = {
      ...formErrors.value,
      [field]: '',
    };
  }

  function normalizeRejectState() {
    clearFieldError('perolehan_reject');

    if (!shouldShowDefect.value) {
      form.value.defect_category_id = '';
      clearFieldError('defect_category_id');
    }
  }

  function scheduleDraftPersist() {
    if (!isHydrated.value) {
      return;
    }

    globalThis.clearTimeout(autosaveTimer);
    autosaveTimer = globalThis.setTimeout(() => {
      saveDraft();
    }, AUTOSAVE_DELAY_MS);
  }

  function dispose() {
    globalThis.clearTimeout(autosaveTimer);
  }

  watch(form, scheduleDraftPersist, { deep: true });

  return {
    draftStatus,
    form,
    formErrors,
    hydrate,
    isHydrated,
    isTotalValid,
    metrics,
    normalizeRejectState,
    persistenceError,
    productionCapacity,
    queueItems,
    saveDraft,
    shouldShowDefect,
    submitMessage,
    submitOperatorReport,
    totalOutput,
    clearFieldError,
    dispose,
  };
}

function getPersistenceMessage(error) {
  if (error instanceof PersistenceError) {
    return `${error.code}: ${error.message}`;
  }

  return 'IndexedDB tidak tersedia atau gagal menyimpan data lokal.';
}
