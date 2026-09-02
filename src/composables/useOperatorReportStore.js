import { computed, ref, watch } from 'vue';
import { ApiAdapterError, api as defaultApi } from '../services/apiAdapter.js';
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
  const api = options.api || defaultApi;
  const network = options.network || globalThis.navigator || {};
  const form = ref({ ...initialOperatorReportForm });
  const formErrors = ref({});
  const queueItems = ref([]);
  const draftStatus = ref('Memuat draft');
  const submitMessage = ref('');
  const persistenceError = ref('');
  const syncStatus = ref('Idle');
  const syncError = ref('');
  const lastSyncResult = ref(null);
  const isSyncing = ref(false);
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

  async function syncQueue(optionsOverride = {}) {
    if (isSyncing.value) {
      return lastSyncResult.value;
    }

    if (network.onLine === false) {
      syncStatus.value = 'Offline';
      syncError.value = 'Koneksi belum tersedia. Queue tetap aman di IndexedDB.';
      return {
        attempted: 0,
        synced: 0,
        conflicted: 0,
        failed: 0,
        skipped: queueItems.value.length,
      };
    }

    isSyncing.value = true;
    syncStatus.value = 'Sinkronisasi berjalan';
    syncError.value = '';

    const candidates = queueItems.value.filter((item) =>
      ['PENDING_SYNC', 'FAILED'].includes(item.status),
    );
    const result = {
      attempted: candidates.length,
      synced: 0,
      conflicted: 0,
      failed: 0,
      skipped: queueItems.value.length - candidates.length,
    };

    try {
      for (const item of candidates) {
        try {
          await markQueueItem(item.id, {
            status: 'SYNCING',
            error_message: '',
          });

          const response = await api.submitProductionReport({
            session: optionsOverride.session || buildSessionPayload(optionsOverride),
            ...item.payload,
          });
          const serverStatus = response.data?.status || 'ACCEPTED';

          if (serverStatus === 'CONFLICT_PENDING') {
            result.conflicted += 1;
            await markQueueItem(item.id, {
              status: 'CONFLICT_PENDING',
              server_status: serverStatus,
              quarantine_id: response.data?.quarantine_id || '',
              synced_at: response.data?.server_received_at || new Date().toISOString(),
            });
            continue;
          }

          if (serverStatus === 'ACCEPTED' || response.data?.duplicate === true) {
            result.synced += 1;
            await persistence.removeQueueItem(item.id);
            queueItems.value = queueItems.value.filter((queueItem) => queueItem.id !== item.id);
            continue;
          }

          result.failed += 1;
          await markQueueItem(item.id, {
            status: 'FAILED',
            server_status: serverStatus,
            error_message: 'Server mengembalikan status yang belum bisa dihapus dari queue.',
          });
        } catch (error) {
          result.failed += 1;
          await markQueueItem(item.id, {
            status: 'FAILED',
            error_message: getSyncMessage(error),
          });
        }
      }

      lastSyncResult.value = result;
      syncStatus.value = formatSyncStatus(result);
    } finally {
      isSyncing.value = false;
    }

    return result;
  }

  async function markQueueItem(id, patch) {
    const updated = await persistence.updateQueueItem(id, patch);
    queueItems.value = queueItems.value.map((item) => (item.id === id ? updated : item));
    return updated;
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
    isSyncing,
    isTotalValid,
    lastSyncResult,
    metrics,
    normalizeRejectState,
    persistenceError,
    productionCapacity,
    queueItems,
    saveDraft,
    shouldShowDefect,
    submitMessage,
    submitOperatorReport,
    syncError,
    syncQueue,
    syncStatus,
    totalOutput,
    clearFieldError,
    dispose,
  };
}

function buildSessionPayload(optionsOverride) {
  if (optionsOverride.simulatedRole) {
    return {
      simulated_role: optionsOverride.simulatedRole,
    };
  }

  return {
    simulated_role: 'Operator',
  };
}

function formatSyncStatus(result) {
  if (result.attempted === 0) {
    return 'Tidak ada queue aktif';
  }

  if (result.failed > 0) {
    return `${result.synced} synced, ${result.failed} gagal`;
  }

  if (result.conflicted > 0) {
    return `${result.synced} synced, ${result.conflicted} konflik`;
  }

  return `${result.synced} item synced`;
}

function getSyncMessage(error) {
  if (error instanceof ApiAdapterError) {
    return `${error.code}: ${error.message}`;
  }

  if (error instanceof PersistenceError) {
    return `${error.code}: ${error.message}`;
  }

  return 'Sinkronisasi gagal. Queue tetap tersimpan untuk retry.';
}

function getPersistenceMessage(error) {
  if (error instanceof PersistenceError) {
    return `${error.code}: ${error.message}`;
  }

  return 'IndexedDB tidak tersedia atau gagal menyimpan data lokal.';
}
