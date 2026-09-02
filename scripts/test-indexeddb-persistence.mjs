import { indexedDB } from 'fake-indexeddb';
import {
  createIndexedDbPersistence,
  createMemoryPersistence,
  PersistenceError,
} from '../src/services/indexedDbPersistence.js';
import {
  createDraftQueueItem,
  createOperatorReportPayload,
  initialOperatorReportForm,
} from '../src/services/operatorReportForm.js';

const dbName = `optiflow-test-${Date.now()}`;
const persistence = createIndexedDbPersistence({
  indexedDB,
  dbName,
  now: () => '2026-09-02T00:00:00.000Z',
});

await persistence.saveDraft({
  ...initialOperatorReportForm,
  perolehan_ok: 100,
});

const draft = await persistence.getDraft();
if (draft.perolehan_ok !== 100) {
  throw new Error('Expected IndexedDB persistence to save and read draft.');
}

const payloadResult = createOperatorReportPayload(initialOperatorReportForm, {
  now: new Date('2026-09-02T01:00:00.000Z'),
  transactionId: 'tx-indexeddb-1',
});
const queueItem = createDraftQueueItem(payloadResult.data);
const persistedQueueItem = await persistence.enqueueReport(queueItem);

if (persistedQueueItem.id !== 'tx-indexeddb-1' || persistedQueueItem.queued_at !== '2026-09-02T00:00:00.000Z') {
  throw new Error('Expected IndexedDB persistence to enqueue report with metadata.');
}

let queue = await persistence.listQueue();
if (queue.length !== 1 || queue[0].status !== 'PENDING_SYNC') {
  throw new Error('Expected IndexedDB queue to contain one pending item.');
}

await persistence.updateQueueItem('tx-indexeddb-1', { status: 'FAILED' });
queue = await persistence.listQueue();
if (queue[0].status !== 'FAILED') {
  throw new Error('Expected IndexedDB queue update to persist.');
}

await persistence.removeQueueItem('tx-indexeddb-1');
queue = await persistence.listQueue();
if (queue.length !== 0) {
  throw new Error('Expected IndexedDB queue remove to persist.');
}

const unavailable = createIndexedDbPersistence({ indexedDB: null });
let rejected = false;
try {
  await unavailable.loadSnapshot();
} catch (error) {
  rejected = error instanceof PersistenceError && error.code === 'INDEXEDDB_UNAVAILABLE';
}

if (!rejected) {
  throw new Error('Expected unavailable IndexedDB to fail with safe error.');
}

const memory = createMemoryPersistence({
  draft: initialOperatorReportForm,
  queue: [queueItem],
});
const snapshot = await memory.loadSnapshot();
if (!snapshot.draft || snapshot.queue.length !== 1) {
  throw new Error('Expected memory persistence to mirror persistence contract.');
}

console.log('indexeddb persistence test ok');
