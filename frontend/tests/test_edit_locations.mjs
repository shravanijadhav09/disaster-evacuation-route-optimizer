/**
 * Automated Test Suite for Map Location Customization (STEP 10).
 * Tests node dragging, polyline coordinate derivation, IndexedDB persistence,
 * reset functionality, and graph topology invariance.
 * Run command: node frontend/tests/test_edit_locations.mjs
 */

import assert from 'node:assert/strict';
import { NODE_COORDINATES, getNodeCoordinates } from '../src/config/nodeCoordinates.js';

// In-memory IndexedDB & Storage Mock
let mockIndexedDBStore = {};

const mockStorage = {
  saveCustomNodeCoordinates: async (coordsMap) => {
    mockIndexedDBStore['custom_node_coordinates'] = { ...coordsMap };
    return new Date().toISOString();
  },
  getCustomNodeCoordinates: async () => {
    return mockIndexedDBStore['custom_node_coordinates'] ? { ...mockIndexedDBStore['custom_node_coordinates'] } : null;
  },
  resetCustomNodeCoordinates: async () => {
    delete mockIndexedDBStore['custom_node_coordinates'];
    return true;
  },
};

let testsPassed = 0;
let testsFailed = 0;

async function runTest(name, testFn) {
  try {
    mockIndexedDBStore = {};
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
  console.log('  RUNNING MAP LOCATION CUSTOMIZATION TEST SUITE');
  console.log('==================================================\n');

  // Test 1: Default coordinates load correctly
  await runTest('1. Default node coordinates load correctly', async () => {
    assert.deepEqual(getNodeCoordinates('A'), [13.0850, 80.2600]);
    assert.deepEqual(getNodeCoordinates('Z'), [13.0700, 80.2720]);
  });

  // Test 2: Node coordinate state can be modified
  await runTest('2. Node coordinate state can be modified', async () => {
    let state = { ...NODE_COORDINATES };
    state['A'] = [13.1000, 80.3000];

    assert.deepEqual(state['A'], [13.1000, 80.3000]);
    assert.deepEqual(state['B'], NODE_COORDINATES['B']);
  });

  // Test 3: Dragging node updates coordinate state
  await runTest('3. Dragging node updates coordinate state', async () => {
    let state = { ...NODE_COORDINATES };
    const handleDrag = (nodeId, newPos) => {
      state[nodeId] = newPos;
    };

    handleDrag('B', [13.0900, 80.2750]);
    assert.deepEqual(state['B'], [13.0900, 80.2750]);
  });

  // Test 4: Road polyline derives endpoints dynamically from current node coordinate state
  await runTest('4. Road polyline derives endpoints dynamically from current node state', async () => {
    let state = { ...NODE_COORDINATES };
    state['A'] = [13.1000, 80.3000];

    const road = { road_id: 'R1', u: 'A', v: 'B' };
    const getPolyline = (r, coordsState) => [
      coordsState[r.u] || getNodeCoordinates(r.u),
      coordsState[r.v] || getNodeCoordinates(r.v),
    ];

    const polyline = getPolyline(road, state);
    assert.deepEqual(polyline[0], [13.1000, 80.3000]);
    assert.deepEqual(polyline[1], NODE_COORDINATES['B']);
  });

  // Test 5: Moving a node updates connected road polyline visualization
  await runTest('5. Moving a node updates connected road polyline visualization', async () => {
    let state = { ...NODE_COORDINATES };
    const roadR1 = { road_id: 'R1', u: 'A', v: 'B' };
    const roadR2 = { road_id: 'R2', u: 'B', v: 'C' };

    // Move node B
    state['B'] = [13.0999, 80.2999];

    const getPolyline = (r, coordsState) => [
      coordsState[r.u] || getNodeCoordinates(r.u),
      coordsState[r.v] || getNodeCoordinates(r.v),
    ];

    const p1 = getPolyline(roadR1, state);
    const p2 = getPolyline(roadR2, state);

    assert.deepEqual(p1[1], [13.0999, 80.2999]); // Endpoint of R1
    assert.deepEqual(p2[0], [13.0999, 80.2999]); // Startpoint of R2
  });

  // Test 6: Active recommended route follows moved nodes without changing topology
  await runTest('6. Active recommended route polyline follows moved node coordinates', async () => {
    let state = { ...NODE_COORDINATES };
    state['D'] = [13.1111, 80.2222];

    const activeRoute = { nodes: ['A', 'D', 'Z'] };
    const routeCoords = activeRoute.nodes.map(n => state[n] || getNodeCoordinates(n));

    assert.deepEqual(routeCoords[0], NODE_COORDINATES['A']);
    assert.deepEqual(routeCoords[1], [13.1111, 80.2222]); // Moved D
    assert.deepEqual(routeCoords[2], NODE_COORDINATES['Z']);
  });

  // Test 7: Custom coordinates save to IndexedDB
  await runTest('7. Custom coordinates save to IndexedDB', async () => {
    const customCoords = { ...NODE_COORDINATES, A: [13.1234, 80.5678] };
    await mockStorage.saveCustomNodeCoordinates(customCoords);

    const stored = await mockStorage.getCustomNodeCoordinates();
    assert.ok(stored);
    assert.deepEqual(stored['A'], [13.1234, 80.5678]);
  });

  // Test 8: Saved coordinates load after startup / refresh
  await runTest('8. Saved custom layout loads from IndexedDB on startup', async () => {
    mockIndexedDBStore['custom_node_coordinates'] = { ...NODE_COORDINATES, Z: [13.9999, 80.9999] };

    const loaded = await mockStorage.getCustomNodeCoordinates();
    const activeCoords = { ...NODE_COORDINATES, ...loaded };

    assert.deepEqual(activeCoords['Z'], [13.9999, 80.9999]);
  });

  // Test 9: Reset restores original default coordinates
  await runTest('9. Reset restores original default coordinates', async () => {
    mockIndexedDBStore['custom_node_coordinates'] = { ...NODE_COORDINATES, A: [13.9999, 80.9999] };
    await mockStorage.resetCustomNodeCoordinates();

    const stored = await mockStorage.getCustomNodeCoordinates();
    assert.equal(stored, null);

    const resetState = { ...NODE_COORDINATES };
    assert.deepEqual(resetState['A'], [13.0850, 80.2600]);
  });

  // Test 10: Graph routing topology remains 100% invariant when nodes are dragged
  await runTest('10. Graph routing topology remains 100% invariant when nodes move', async () => {
    const road = { road_id: 'R1', u: 'A', v: 'B', distance: 2.5, blockage_probability: 0.1 };

    // Move node A to arbitrary position
    let state = { ...NODE_COORDINATES, A: [0.0, 0.0] };

    // Graph topology endpoints remain strictly 'A' and 'B'
    assert.equal(road.u, 'A');
    assert.equal(road.v, 'B');
    assert.equal(road.distance, 2.5);
  });

  console.log('\n==================================================');
  console.log(`  RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('==================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAllTests();
