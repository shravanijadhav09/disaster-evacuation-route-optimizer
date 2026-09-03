/**
 * Synchronization Service for Disaster Evacuation Route Optimizer.
 * Handles automatic and manual synchronization of pending offline road-blocking changes
 * with the FastAPI backend upon network reconnection.
 */

import { blockRoad, getRoads, getShelters } from './api.js';
import { checkBackendAvailability } from './routingService.js';
import {
  getPendingChanges,
  removePendingChange,
  saveNetworkData,
} from './offlineStorage.js';
import { NODE_COORDINATES } from '../config/nodeCoordinates.js';

/**
 * Get current count of pending offline changes stored in IndexedDB.
 */
export async function getPendingSyncCount(storageOverrides = null) {
  try {
    const getPendingFn = storageOverrides?.getPendingChanges || getPendingChanges;
    const pendingList = await getPendingFn();
    return pendingList.length;
  } catch (err) {
    console.error('Failed to count pending changes in IndexedDB:', err);
    return 0;
  }
}

/**
 * Synchronize all pending offline changes with the FastAPI backend server.
 * Order of operations:
 *   1. Check backend reachability.
 *   2. Read pending_changes from IndexedDB.
 *   3. Process each pending BLOCK_ROAD operation against backend POST /roads/{id}/block.
 *   4. Remove successfully synchronized (or already BLOCKED) records from IndexedDB.
 *   5. Fetch latest roads and shelters from backend.
 *   6. Preserve any unresolved local pending BLOCKED states.
 *   7. Save updated dataset to IndexedDB and update last_sync_timestamp.
 * 
 * @param {Object} [storageOverrides] - Optional storage dependency overrides for testing
 * @param {Object} [apiOverrides] - Optional API dependency overrides for testing
 * @returns {Promise<Object>} Synchronization summary result
 */
export async function syncPendingChanges(storageOverrides = null, apiOverrides = null) {
  const getPendingFn = storageOverrides?.getPendingChanges || getPendingChanges;
  const removePendingFn = storageOverrides?.removePendingChange || removePendingChange;
  const saveNetworkDataFn = storageOverrides?.saveNetworkData || saveNetworkData;

  const checkAvailabilityFn = apiOverrides?.checkBackendAvailability || checkBackendAvailability;
  const blockRoadFn = apiOverrides?.blockRoad || blockRoad;
  const getRoadsFn = apiOverrides?.getRoads || getRoads;
  const getSheltersFn = apiOverrides?.getShelters || getShelters;

  // Step 1: Verify backend reachability
  const isAvailable = await checkAvailabilityFn();
  if (!isAvailable) {
    const pending = await getPendingFn();
    return {
      success: false,
      reason: 'BACKEND_UNAVAILABLE',
      syncedCount: 0,
      failedCount: 0,
      pendingCount: pending.length,
    };
  }

  // Step 2: Read pending changes from IndexedDB
  const pendingList = await getPendingFn();
  let syncedCount = 0;
  let failedCount = 0;

  // Step 3: Process each pending change independently
  for (const change of pendingList) {
    if (change.type === 'BLOCK_ROAD' && change.road_id) {
      try {
        const response = await blockRoadFn(change.road_id);

        // Check if response confirms road is BLOCKED (or already BLOCKED)
        const isConfirmedBlocked =
          response?.road?.status?.toUpperCase() === 'BLOCKED' ||
          response?.status?.toUpperCase() === 'BLOCKED' ||
          (response?.detail && String(response.detail).toLowerCase().includes('already blocked'));

        if (isConfirmedBlocked || response?.road) {
          // Successfully synchronized -> remove pending change record
          await removePendingFn(change.id);
          syncedCount++;
        } else {
          failedCount++;
        }
      } catch (err) {
        // If server returns HTTP 400 or detail indicating already blocked, treat as success
        const isAlreadyBlocked =
          err?.data?.detail && String(err.data.detail).toLowerCase().includes('already');

        if (isAlreadyBlocked) {
          await removePendingFn(change.id);
          syncedCount++;
        } else {
          console.warn(`Failed to synchronize pending block for road '${change.road_id}':`, err);
          failedCount++;
        }
      }
    }
  }

  // Step 4: Fetch latest authoritative network state from backend
  let fetchedRoads = [];
  let fetchedShelters = [];

  try {
    const [roadsRes, sheltersRes] = await Promise.all([getRoadsFn(), getSheltersFn()]);
    fetchedRoads = roadsRes.roads || [];
    fetchedShelters = sheltersRes.shelters || [];
  } catch (fetchErr) {
    console.warn('Failed to fetch updated network data from backend during sync:', fetchErr);
  }

  // Step 5: Preserve local BLOCKED state for any unresolved pending changes (Safety Rule)
  const remainingPending = await getPendingFn();
  const pendingBlockedRoadIds = new Set(
    remainingPending.filter(c => c.type === 'BLOCK_ROAD').map(c => c.road_id)
  );

  if (pendingBlockedRoadIds.size > 0 && fetchedRoads.length > 0) {
    fetchedRoads = fetchedRoads.map(road => {
      if (pendingBlockedRoadIds.has(road.road_id)) {
        return { ...road, status: 'BLOCKED', routing_cost: null };
      }
      return road;
    });
  }

  // Step 6: Save updated dataset to IndexedDB & update last_sync_timestamp
  let syncMetaResult = null;
  if (fetchedRoads.length > 0) {
    syncMetaResult = await saveNetworkDataFn({
      roads: fetchedRoads,
      shelters: fetchedShelters,
      nodeCoordinates: NODE_COORDINATES,
    });
  }

  return {
    success: true,
    syncedCount,
    failedCount,
    pendingCount: remainingPending.length,
    lastSyncTimestamp: syncMetaResult?.timestamp || new Date().toISOString(),
    roads: fetchedRoads,
    shelters: fetchedShelters,
  };
}
