const DB_NAME = 'optiflow-offline-state';
const DB_VERSION = 1;
const DRAFT_STORE = 'drafts';
const QUEUE_STORE = 'queue';
const OPERATOR_DRAFT_KEY = 'operator_report';

export class PersistenceError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'PersistenceError';
    this.code = options.code || 'PERSISTENCE_ERROR';
  }
}

export function createIndexedDbPersistence(options = {}) {
  const indexedDb = options.indexedDB || globalThis.indexedDB;
  const dbName = options.dbName || DB_NAME;
  const now = options.now || (() => new Date().toISOString());

  if (!indexedDb) {
    return createUnavailablePersistence();
  }

  let dbPromise;

  function getDb() {
    if (!dbPromise) {
      dbPromise = openDatabase(indexedDb, dbName);
    }

    return dbPromise;
  }

  async function loadSnapshot() {
    const draft = await getDraft();
    const queue = await listQueue();

    return {
      draft,
      queue,
    };
  }

  async function getDraft() {
    const db = await getDb();
    const record = await requestToPromise(
      db.transaction(DRAFT_STORE, 'readonly')
        .objectStore(DRAFT_STORE)
        .get(OPERATOR_DRAFT_KEY),
    );

    return record ? record.value : null;
  }

  async function saveDraft(draft) {
    const db = await getDb();
    await requestToPromise(
      db.transaction(DRAFT_STORE, 'readwrite')
        .objectStore(DRAFT_STORE)
        .put({
          key: OPERATOR_DRAFT_KEY,
          value: structuredCloneSafe(draft),
          updated_at: now(),
        }),
    );
  }

  async function enqueueReport(queueItem) {
    const db = await getDb();
    const record = {
      ...structuredCloneSafe(queueItem),
      queued_at: queueItem.queued_at || now(),
      updated_at: now(),
    };

    await requestToPromise(
      db.transaction(QUEUE_STORE, 'readwrite')
        .objectStore(QUEUE_STORE)
        .put(record),
    );

    return record;
  }

  async function listQueue() {
    const db = await getDb();
    const records = await requestToPromise(
      db.transaction(QUEUE_STORE, 'readonly')
        .objectStore(QUEUE_STORE)
        .getAll(),
    );

    return records.sort(function (a, b) {
      return String(b.queued_at || '').localeCompare(String(a.queued_at || ''));
    });
  }

  async function updateQueueItem(id, patch) {
    const db = await getDb();
    const transaction = db.transaction(QUEUE_STORE, 'readwrite');
    const store = transaction.objectStore(QUEUE_STORE);
    const existing = await requestToPromise(store.get(id));

    if (!existing) {
      throw new PersistenceError('Queue item not found.', {
        code: 'QUEUE_ITEM_NOT_FOUND',
      });
    }

    const next = {
      ...existing,
      ...structuredCloneSafe(patch),
      updated_at: now(),
    };
    await requestToPromise(store.put(next));
    return next;
  }

  async function removeQueueItem(id) {
    const db = await getDb();
    await requestToPromise(
      db.transaction(QUEUE_STORE, 'readwrite')
        .objectStore(QUEUE_STORE)
        .delete(id),
    );
  }

  return Object.freeze({
    enqueueReport,
    getDraft,
    listQueue,
    loadSnapshot,
    removeQueueItem,
    saveDraft,
    updateQueueItem,
  });
}

export function createMemoryPersistence(initialState = {}) {
  let draft = initialState.draft ? structuredCloneSafe(initialState.draft) : null;
  let queue = initialState.queue ? structuredCloneSafe(initialState.queue) : [];
  const now = initialState.now || (() => new Date().toISOString());

  return Object.freeze({
    async enqueueReport(queueItem) {
      const record = {
        ...structuredCloneSafe(queueItem),
        queued_at: queueItem.queued_at || now(),
        updated_at: now(),
      };
      queue = [record, ...queue.filter((item) => item.id !== record.id)];
      return record;
    },
    async getDraft() {
      return draft ? structuredCloneSafe(draft) : null;
    },
    async listQueue() {
      return structuredCloneSafe(queue);
    },
    async loadSnapshot() {
      return {
        draft: draft ? structuredCloneSafe(draft) : null,
        queue: structuredCloneSafe(queue),
      };
    },
    async removeQueueItem(id) {
      queue = queue.filter((item) => item.id !== id);
    },
    async saveDraft(nextDraft) {
      draft = structuredCloneSafe(nextDraft);
    },
    async updateQueueItem(id, patch) {
      const index = queue.findIndex((item) => item.id === id);

      if (index === -1) {
        throw new PersistenceError('Queue item not found.', {
          code: 'QUEUE_ITEM_NOT_FOUND',
        });
      }

      queue[index] = {
        ...queue[index],
        ...structuredCloneSafe(patch),
        updated_at: now(),
      };

      return structuredCloneSafe(queue[index]);
    },
  });
}

function openDatabase(indexedDb, dbName) {
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(dbName, DB_VERSION);

    request.onupgradeneeded = function () {
      const db = request.result;

      if (!db.objectStoreNames.contains(DRAFT_STORE)) {
        db.createObjectStore(DRAFT_STORE, { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = function () {
      resolve(request.result);
    };

    request.onerror = function () {
      reject(new PersistenceError('IndexedDB open failed.', {
        code: 'INDEXEDDB_OPEN_FAILED',
      }));
    };
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = function () {
      resolve(request.result);
    };

    request.onerror = function () {
      reject(new PersistenceError('IndexedDB request failed.', {
        code: 'INDEXEDDB_REQUEST_FAILED',
      }));
    };
  });
}

function createUnavailablePersistence() {
  async function rejectUnavailable() {
    throw new PersistenceError('IndexedDB is not available.', {
      code: 'INDEXEDDB_UNAVAILABLE',
    });
  }

  return Object.freeze({
    enqueueReport: rejectUnavailable,
    getDraft: rejectUnavailable,
    listQueue: rejectUnavailable,
    loadSnapshot: rejectUnavailable,
    removeQueueItem: rejectUnavailable,
    saveDraft: rejectUnavailable,
    updateQueueItem: rejectUnavailable,
  });
}

function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value));
}
