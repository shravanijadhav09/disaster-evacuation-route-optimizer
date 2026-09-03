/**
 * Automated Test Suite for Synchronization Service (syncService.js).
 * Tests offline change synchronization, pending change processing, error resilience,
 * idempotent already-blocked handling, and local state preservation.
 * Run command: node frontend/tests/test_sync_service.mjs
 */

import assert from 'node:assert/strict';
import { syncPendingChanges } from '../src/services/syncService.js';

// In-memory Mock State
let mockPendingStore = [];
let mockCachedRoads = [];
let mockCachedShelters = [];
let mockApiBlockCalls = [];
let mockBackendReachable = true;
let mockBackendRoads = [];

const storageOverrides = {
  getPendingChanges: async () => [...mockPendingStore],
  removePendingChange: async (id) => {
    mockPendingStore = mockPendingStore.filter(c => c.id !== id);
  },
  saveNetworkData: async ({ roads, shelters }) => {
    mockCachedRoads = roads;
    mockCachedShelters = shelters;
    return { timestamp: '2026-08-24T16:40:00.000Z' };
  },
};

const apiOverrides = {
  checkBackendAvailability: async () => mockBackendReachable,
  blockRoad: async (roadId) => {
    mockApiBlockCalls.push(roadId);
    const road = mockBackendRoads.find(r => r.road_id === roadId);
    if (!road) {
      const err = new Error(`Road '${roadId}' not found`);
      err.data = { detail: `Road '${roadId}' not found` };
      throw err;
    }
    if (road.status === 'BLOCKED') {
      return { status: 'BLOCKED', detail: 'Road segment already blocked' };
    }
    road.status = 'BLOCKED';
    return { road: { ...road, status: 'BLOCKED' } };
  },
  getRoads: async () => ({ roads: mockBackendRoads }),
  getShelters: async () => ({ shelters: mockCachedShelters }),
};

let testsPassed = 0;
let testsFailed = 0;

async function runTest(name, testFn) {
  try {
    // Reset mocks before each test
    mockPendingStore = [];
    mockCachedRoads = [];
    mockCachedShelters = [];
    mockApiBlockCalls = [];
    mockBackendReachable = true;
    mockBackendRoads = [
      { road_id: 'R1', u: 'A', v: 'B', distance: 2.0, status: 'OPEN', blockage_probability: 0.1, routing_cost: 3.0 },
      { road_id: 'R2', u: 'B', v: 'C', distance: 3.0, status: 'OPEN', blockage_probability: 0.1, routing_cost: 4.0 },
      { road_id: 'R3', u: 'A', v: 'D', distance: 4.0, status: 'OPEN', blockage_probability: 0.1, routing_cost: 5.0 },
    ];

    await testFn();
    console.log(`  ✓ PASSED: ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ FAILED: ${name}`);
    console.error(`    ${err.stack || err.message}`);
    testsFailed++;
  }
}

async function runAllTests() {
  console.log('\n==================================================');
  console.log('  RUNNING OFFLINE CHANGE SYNC TEST SUITE');
  console.log('==================================================\n');

  // Test 1: No pending changes -> no block API calls
  await runTest('1. No pending changes -> zero block API calls', async () => {
    mockPendingStore = [];
    const res = await syncPendingChanges(storageOverrides, apiOverrides);
    assert.equal(res.success, true);
    assert.equal(res.syncedCount, 0);
    assert.equal(mockApiBlockCalls.length, 0);
  });

  // Test 2: One pending BLOCK_ROAD -> API called
  await runTest('2. One pending BLOCK_ROAD -> API blockRoad called', async () => {
    mockPendingStore = [{ id: 1, type: 'BLOCK_ROAD', road_id: 'R1' }];
    const res = await syncPendingChanges(storageOverrides, apiOverrides);
    assert.equal(res.success, true);
    assert.equal(res.syncedCount, 1);
    assert.deepEqual(mockApiBlockCalls, ['R1']);
  });

  // Test 3: Successful sync -> pending change removed
  await runTest('3. Successful sync -> pending record removed from IndexedDB', async () => {
    mockPendingStore = [{ id: 1, type: 'BLOCK_ROAD', road_id: 'R1' }];
    await syncPendingChanges(storageOverrides, apiOverrides);
    assert.equal(mockPendingStore.length, 0);
  });

  // Test 4: Failed sync -> pending change remains
  await runTest('4. Failed sync -> pending record remains in IndexedDB', async () => {
    mockPendingStore = [{ id: 99, type: 'BLOCK_ROAD', road_id: 'NON_EXISTENT_ROAD' }];
    const res = await syncPendingChanges(storageOverrides, apiOverrides);
    assert.equal(res.failedCount, 1);
    assert.equal(mockPendingStore.length, 1);
    assert.equal(mockPendingStore[0].id, 99);
  });

  // Test 5: Multiple pending changes processed independently
  await runTest('5. Multiple pending changes processed independently', async () => {
    mockPendingStore = [
      { id: 1, type: 'BLOCK_ROAD', road_id: 'R1' },
      { id: 2, type: 'BLOCK_ROAD', road_id: 'R2' },
    ];
    const res = await syncPendingChanges(storageOverrides, apiOverrides);
    assert.equal(res.syncedCount, 2);
    assert.equal(mockPendingStore.length, 0);
    assert.deepEqual(mockApiBlockCalls, ['R1', 'R2']);
  });

  // Test 6: Partial failure (R1 succeeds, R_INVALID fails) -> R1 removed, R_INVALID remains
  await runTest('6. Partial failure -> successful removed, failed preserved', async () => {
    mockPendingStore = [
      { id: 1, type: 'BLOCK_ROAD', road_id: 'R1' },
      { id: 2, type: 'BLOCK_ROAD', road_id: 'R_INVALID' },
    ];
    const res = await syncPendingChanges(storageOverrides, apiOverrides);
    assert.equal(res.syncedCount, 1);
    assert.equal(res.failedCount, 1);
    assert.equal(mockPendingStore.length, 1);
    assert.equal(mockPendingStore[0].road_id, 'R_INVALID');
  });

  // Test 7: Already BLOCKED backend response -> treated as success
  await runTest('7. Already BLOCKED response -> treated as success, removed', async () => {
    mockBackendRoads[0].status = 'BLOCKED';
    mockPendingStore = [{ id: 1, type: 'BLOCK_ROAD', road_id: 'R1' }];
    const res = await syncPendingChanges(storageOverrides, apiOverrides);
    assert.equal(res.syncedCount, 1);
    assert.equal(mockPendingStore.length, 0);
  });

  // Test 8: Backend unavailable -> pending changes remain untouched
  await runTest('8. Backend unavailable -> pending changes remain untouched', async () => {
    const customApiOverrides = {
      ...apiOverrides,
      checkBackendAvailability: async () => false,
    };
    mockPendingStore = [{ id: 1, type: 'BLOCK_ROAD', road_id: 'R1' }];

    const res = await syncPendingChanges(storageOverrides, customApiOverrides);
    assert.equal(res.success, false);
    assert.equal(res.reason, 'BACKEND_UNAVAILABLE');
    assert.equal(mockPendingStore.length, 1);
    assert.equal(mockApiBlockCalls.length, 0);
  });

  // Test 9: Stale server OPEN state cannot overwrite local pending BLOCKED state
  await runTest('9. Stale server OPEN state preserves local pending BLOCKED state', async () => {
    const customApiOverrides = {
      ...apiOverrides,
      blockRoad: async () => { throw new Error('Network timeout during block'); },
    };

    mockPendingStore = [{ id: 1, type: 'BLOCK_ROAD', road_id: 'R1' }];
    const res = await syncPendingChanges(storageOverrides, customApiOverrides);

    const r1 = res.roads.find(r => r.road_id === 'R1');
    assert.equal(r1.status, 'BLOCKED');
    assert.equal(mockPendingStore.length, 1);
  });

  // Test 10: Successful sync updates last_sync_timestamp
  await runTest('10. Successful sync updates last_sync_timestamp', async () => {
    mockPendingStore = [{ id: 1, type: 'BLOCK_ROAD', road_id: 'R1' }];
    const res = await syncPendingChanges(storageOverrides, apiOverrides);
    assert.ok(res.lastSyncTimestamp);
    assert.equal(typeof res.lastSyncTimestamp, 'string');
  });

  console.log('\n==================================================');
  console.log(`  RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('==================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAllTests();
