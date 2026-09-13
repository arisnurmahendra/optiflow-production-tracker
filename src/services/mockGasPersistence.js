const DB_NAME = 'optiflow-demo-gas-state';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';
const SNAPSHOT_KEY = 'mock_gas_state';

export function createMockGasPersistence(options = {}) {
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

  async function loadState() {
    const db = await getDb();
    const record = await requestToPromise(
      db.transaction(STORE_NAME, 'readonly')
        .objectStore(STORE_NAME)
        .get(SNAPSHOT_KEY),
    );

    return record ? structuredCloneSafe(record.value) : null;
  }

  async function saveState(state) {
    const db = await getDb();
    await requestToPromise(
      db.transaction(STORE_NAME, 'readwrite')
        .objectStore(STORE_NAME)
        .put({
          key: SNAPSHOT_KEY,
          value: structuredCloneSafe(state),
          updated_at: now(),
        }),
    );
  }

  async function clearState() {
    const db = await getDb();
    await requestToPromise(
      db.transaction(STORE_NAME, 'readwrite')
        .objectStore(STORE_NAME)
        .delete(SNAPSHOT_KEY),
    );
  }

  return Object.freeze({
    clearState,
    loadState,
    saveState,
  });
}

function openDatabase(indexedDb, dbName) {
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(dbName, DB_VERSION);

    request.onupgradeneeded = function () {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = function () {
      resolve(request.result);
    };

    request.onerror = function () {
      reject(new Error('Mock GAS IndexedDB open failed.'));
    };
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = function () {
      resolve(request.result);
    };

    request.onerror = function () {
      reject(new Error('Mock GAS IndexedDB request failed.'));
    };
  });
}

function createUnavailablePersistence() {
  return Object.freeze({
    async clearState() {},
    async loadState() {
      return null;
    },
    async saveState() {},
  });
}

function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value));
}
