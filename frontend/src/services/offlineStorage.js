/**
 * IndexedDB Offline Storage Service for Disaster Evacuation Route Optimizer.
 * Manages local browser database persistence for road networks, shelters, node coordinates,
 * road blockage states, synchronization metadata, pending offline changes, and custom map layouts.
 */

const DB_NAME = 'DisasterEvacuationDB_v1';
const DB_VERSION = 3;

const STORES = {
  ROADS: 'roads',
  SHELTERS: 'shelters',
  SYNC_META: 'sync_meta',
  PENDING_CHANGES: 'pending_changes',
  DISASTERS: 'disasters',
};

/**
 * Open or initialize IndexedDB connection.
 */
export function initDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported by your browser.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORES.ROADS)) {
        db.createObjectStore(STORES.ROADS, { keyPath: 'road_id' });
      }

      if (!db.objectStoreNames.contains(STORES.SHELTERS)) {
        db.createObjectStore(STORES.SHELTERS, { keyPath: 'shelter_id' });
      }

      if (!db.objectStoreNames.contains(STORES.SYNC_META)) {
        db.createObjectStore(STORES.SYNC_META, { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains(STORES.PENDING_CHANGES)) {
        db.createObjectStore(STORES.PENDING_CHANGES, { keyPath: 'id', autoIncrement: true });
      }

      if (!db.objectStoreNames.contains(STORES.DISASTERS)) {
        db.createObjectStore(STORES.DISASTERS, { keyPath: 'id' });
      }
    };


    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/**
 * Save complete synchronized network dataset to IndexedDB.
 */
export async function saveNetworkData({ roads = [], shelters = [], nodeCoordinates = {}, version = '1.0.0' }) {
  const db = await initDB();
  const timestamp = new Date().toISOString();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.ROADS, STORES.SHELTERS, STORES.SYNC_META], 'readwrite');

    transaction.onerror = (event) => reject(event.target.error);
    transaction.oncomplete = () => resolve({ timestamp, count_roads: roads.length, count_shelters: shelters.length });

    const roadStore = transaction.objectStore(STORES.ROADS);
    roads.forEach(road => {
      roadStore.put({ ...road, _updated_at: timestamp });
    });

    const shelterStore = transaction.objectStore(STORES.SHELTERS);
    shelters.forEach(shelter => {
      shelterStore.put({ ...shelter, _updated_at: timestamp });
    });

    const metaStore = transaction.objectStore(STORES.SYNC_META);
    metaStore.put({ key: 'last_sync_timestamp', value: timestamp });
    metaStore.put({ key: 'dataset_version', value: version });
    metaStore.put({ key: 'node_coordinates', value: nodeCoordinates });
    metaStore.put({ key: 'network_info', value: { total_roads: roads.length, total_shelters: shelters.length } });
  });
}

/**
 * Update individual road operational status in IndexedDB cache.
 */
export async function saveRoadStatus(roadId, status) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.ROADS], 'readwrite');
    const store = transaction.objectStore(STORES.ROADS);

    const getRequest = store.get(roadId);
    getRequest.onsuccess = () => {
      const road = getRequest.result;
      if (road) {
        road.status = String(status).toUpperCase();
        road.routing_cost = road.status === 'BLOCKED' ? null : road.routing_cost;
        road._updated_at = new Date().toISOString();
        store.put(road);
      }
    };

    transaction.oncomplete = () => resolve(true);
    transaction.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Log a pending change when operating offline.
 */
export async function addPendingChange(changeObj) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PENDING_CHANGES], 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_CHANGES);
    const request = store.add({
      ...changeObj,
      timestamp: new Date().toISOString(),
    });

    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Remove a specific pending change record by primary key ID after successful synchronization.
 */
export async function removePendingChange(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PENDING_CHANGES], 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_CHANGES);
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Get all logged pending offline changes.
 */
export async function getPendingChanges() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PENDING_CHANGES], 'readonly');
    const store = transaction.objectStore(STORES.PENDING_CHANGES);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Clear all pending changes after synchronization.
 */
export async function clearPendingChanges() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PENDING_CHANGES], 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_CHANGES);
    const request = store.clear();

    request.onsuccess = () => resolve(true);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Save custom node coordinates map to IndexedDB.
 */
export async function saveCustomNodeCoordinates(coordinatesMap) {
  const db = await initDB();
  const timestamp = new Date().toISOString();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SYNC_META], 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_META);
    const request = store.put({
      key: 'custom_node_coordinates',
      value: coordinatesMap,
      updated_at: timestamp,
    });

    request.onsuccess = () => resolve(timestamp);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Get saved custom node coordinates map from IndexedDB.
 */
export async function getCustomNodeCoordinates() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SYNC_META], 'readonly');
    const store = transaction.objectStore(STORES.SYNC_META);
    const request = store.get('custom_node_coordinates');

    request.onsuccess = () => resolve(request.result ? request.result.value : null);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Delete saved custom node coordinates from IndexedDB (reset to defaults).
 */
export async function resetCustomNodeCoordinates() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SYNC_META], 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_META);
    const request = store.delete('custom_node_coordinates');

    request.onsuccess = () => resolve(true);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Retrieve all locally cached data from IndexedDB.
 */
export async function getCachedData() {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.ROADS, STORES.SHELTERS, STORES.SYNC_META, STORES.PENDING_CHANGES], 'readonly');

    const result = {
      roads: [],
      shelters: [],
      pendingChanges: [],
      lastSyncTimestamp: null,
      datasetVersion: null,
      nodeCoordinates: null,
      customNodeCoordinates: null,
    };

    transaction.onerror = (event) => reject(event.target.error);
    transaction.oncomplete = () => resolve(result);

    const roadRequest = transaction.objectStore(STORES.ROADS).getAll();
    roadRequest.onsuccess = () => {
      result.roads = roadRequest.result || [];
    };

    const shelterRequest = transaction.objectStore(STORES.SHELTERS).getAll();
    shelterRequest.onsuccess = () => {
      result.shelters = shelterRequest.result || [];
    };

    const pendingRequest = transaction.objectStore(STORES.PENDING_CHANGES).getAll();
    pendingRequest.onsuccess = () => {
      result.pendingChanges = pendingRequest.result || [];
    };

    const metaRequest = transaction.objectStore(STORES.SYNC_META).getAll();
    metaRequest.onsuccess = () => {
      const metaList = metaRequest.result || [];
      metaList.forEach(item => {
        if (item.key === 'last_sync_timestamp') result.lastSyncTimestamp = item.value;
        if (item.key === 'dataset_version') result.datasetVersion = item.value;
        if (item.key === 'node_coordinates') result.nodeCoordinates = item.value;
        if (item.key === 'custom_node_coordinates') result.customNodeCoordinates = item.value;
      });
    };
  });
}

/**
 * Get last synchronization timestamp string.
 */
export async function getLastSyncTimestamp() {
  try {
    const cached = await getCachedData();
    return cached.lastSyncTimestamp;
  } catch (err) {
    console.error('Failed to read last sync timestamp from IndexedDB:', err);
    return null;
  }
}
