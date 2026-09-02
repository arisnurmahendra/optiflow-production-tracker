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

console.log('operator report store test ok');

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
