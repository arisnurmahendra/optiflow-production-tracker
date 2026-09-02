import { nextTick } from 'vue';
import { useOperatorReportStore } from '../src/composables/useOperatorReportStore.js';
import { createMemoryPersistence } from '../src/services/indexedDbPersistence.js';
import { initialOperatorReportForm } from '../src/services/operatorReportForm.js';

const writes = [];
const persistence = createMemoryPersistence({
  draft: {
    ...initialOperatorReportForm,
    perolehan_ok: 777,
  },
  queue: [
    {
      id: 'existing-queue-item',
      status: 'PENDING_SYNC',
      time: '08:00',
      payload: {},
      queued_at: '2026-09-02T00:00:00.000Z',
    },
  ],
  now: () => '2026-09-02T00:00:00.000Z',
});

const trackedPersistence = {
  ...persistence,
  async saveDraft(draft) {
    writes.push(draft);
    return persistence.saveDraft(draft);
  },
};

const store = useOperatorReportStore({
  persistence: trackedPersistence,
});

await store.hydrate();

if (!store.isHydrated.value || store.form.value.perolehan_ok !== 777) {
  throw new Error('Expected operator store to hydrate draft into reactive state.');
}

if (store.queueItems.value.length !== 1) {
  throw new Error('Expected operator store to hydrate queue into reactive state.');
}

store.form.value.perolehan_ok = 778;
await nextTick();
await wait(320);

if (writes.length === 0 || writes.at(-1).perolehan_ok !== 778) {
  throw new Error('Expected operator store to autosave reactive mutations.');
}

const item = await store.submitOperatorReport({
  operatorEmail: 'operator@example.com',
});

if (!item || item.status !== 'PENDING_SYNC') {
  throw new Error('Expected operator store submit to enqueue a pending sync item.');
}

if (store.queueItems.value.length !== 2 || store.draftStatus.value !== 'Menunggu sinkronisasi') {
  throw new Error('Expected operator store to update queue and status after submit.');
}

store.form.value.perolehan_reject = 5;
store.form.value.defect_category_id = '';
await store.submitOperatorReport();

if (!store.formErrors.value.defect_category_id) {
  throw new Error('Expected operator store to expose validation errors.');
}

store.dispose();

const syncPayload = item.payload;
const syncPersistence = createMemoryPersistence({
  queue: [
    {
      ...item,
      payload: syncPayload,
    },
  ],
  now: () => '2026-09-02T00:10:00.000Z',
});
const syncedCalls = [];
const syncStore = useOperatorReportStore({
  persistence: syncPersistence,
  network: { onLine: true },
  api: {
    async submitProductionReport(request) {
      syncedCalls.push(request);
      return {
        ok: true,
        data: {
          transaction_id: request.metadata.transaction_id,
          status: 'ACCEPTED',
          duplicate: false,
          appended: true,
          server_received_at: '2026-09-02T00:11:00.000Z',
        },
      };
    },
  },
});

await syncStore.hydrate();
const syncedResult = await syncStore.syncQueue({ simulatedRole: 'Operator' });

if (syncedResult.synced !== 1 || syncStore.queueItems.value.length !== 0 || syncedCalls.length !== 1) {
  throw new Error('Expected syncQueue to remove accepted items after GAS success.');
}

if (syncedCalls[0].session.simulated_role !== 'Operator') {
  throw new Error('Expected syncQueue to pass session payload through apiAdapter.');
}

const conflictItem = {
  ...item,
  id: 'conflict-queue-item',
  status: 'PENDING_SYNC',
  payload: {
    ...syncPayload,
    metadata: {
      ...syncPayload.metadata,
      transaction_id: '550e8400-e29b-41d4-a716-446655440002',
    },
  },
};
const conflictStore = useOperatorReportStore({
  persistence: createMemoryPersistence({
    queue: [conflictItem],
    now: () => '2026-09-02T00:20:00.000Z',
  }),
  network: { onLine: true },
  api: {
    async submitProductionReport() {
      return {
        ok: true,
        data: {
          status: 'CONFLICT_PENDING',
          quarantine_id: 'quarantine-1',
          server_received_at: '2026-09-02T00:21:00.000Z',
        },
      };
    },
  },
});

await conflictStore.hydrate();
const conflictResult = await conflictStore.syncQueue();

if (conflictResult.conflicted !== 1
  || conflictStore.queueItems.value[0].status !== 'CONFLICT_PENDING'
  || conflictStore.queueItems.value[0].quarantine_id !== 'quarantine-1') {
  throw new Error('Expected syncQueue to keep conflict items in IndexedDB.');
}

const offlineStore = useOperatorReportStore({
  persistence: createMemoryPersistence({ queue: [conflictItem] }),
  network: { onLine: false },
  api: {
    async submitProductionReport() {
      throw new Error('API should not be called while offline.');
    },
  },
});

await offlineStore.hydrate();
const offlineResult = await offlineStore.syncQueue();

if (offlineResult.attempted !== 0 || offlineStore.syncStatus.value !== 'Offline' || !offlineStore.syncError.value) {
  throw new Error('Expected syncQueue to skip API calls while offline.');
}

const failedItem = {
  ...item,
  id: 'failed-queue-item',
  status: 'PENDING_SYNC',
};
const failedStore = useOperatorReportStore({
  persistence: createMemoryPersistence({
    queue: [failedItem],
    now: () => '2026-09-02T00:30:00.000Z',
  }),
  network: { onLine: true },
  api: {
    async submitProductionReport() {
      throw new Error('Transport unavailable.');
    },
  },
});

await failedStore.hydrate();
const failedResult = await failedStore.syncQueue();

if (failedResult.failed !== 1
  || failedStore.queueItems.value.length !== 1
  || failedStore.queueItems.value[0].status !== 'FAILED'
  || !failedStore.queueItems.value[0].error_message) {
  throw new Error('Expected syncQueue failure to keep item as FAILED for retry.');
}

console.log('operator report store test ok');

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
