/**
 * Automated Test Suite for Frontend Offline Routing Logic.
 * Tests offlineRouting.js and routingService.js.
 * Run command: node frontend/tests/test_offline_routing.mjs
 */

import assert from 'node:assert/strict';

// Mock window global for Node environment before importing
globalThis.window = globalThis.window || {};
globalThis.window.indexedDB = globalThis.window.indexedDB || {
  open: () => ({ onupgradeneeded: null, onsuccess: null, onerror: null }),
};

import { calculateOfflineRoute } from '../src/services/offlineRouting.js';

let testsPassed = 0;
let testsFailed = 0;

async function runTest(name, testFn) {
  try {
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
  console.log('  RUNNING FRONTEND OFFLINE ROUTING TEST SUITE');
  console.log('==================================================\n');

  // Test 1: Graph Construction & OPEN Road Traversability
  await runTest('1. Graph construction & OPEN road traversability', async () => {
    const roads = [
      { road_id: 'R1', u: 'A', v: 'B', distance: 2.0, status: 'OPEN', blockage_probability: 0.1, routing_cost: 3.0 },
      { road_id: 'R2', u: 'B', v: 'C', distance: 3.0, status: 'OPEN', blockage_probability: 0.1, routing_cost: 4.0 },
    ];

    const result = await calculateOfflineRoute('A', 'C', 10.0, roads);
    assert.deepEqual(result.nodes, ['A', 'B', 'C']);
    assert.deepEqual(result.road_ids, ['R1', 'R2']);
    assert.equal(result.is_offline, true);
    assert.equal(result.routing_mode, 'offline');
  });

  // Test 2: BLOCKED Road Exclusion
  await runTest('2. BLOCKED roads are excluded from graph', async () => {
    const roads = [
      { road_id: 'R_DIRECT', u: 'A', v: 'C', distance: 1.0, status: 'BLOCKED', blockage_probability: 0.9, routing_cost: null },
      { road_id: 'R_ALT1', u: 'A', v: 'D', distance: 2.0, status: 'OPEN', blockage_probability: 0.1, routing_cost: 3.0 },
      { road_id: 'R_ALT2', u: 'D', v: 'C', distance: 2.0, status: 'OPEN', blockage_probability: 0.1, routing_cost: 3.0 },
    ];

    const result = await calculateOfflineRoute('A', 'C', 10.0, roads);
    assert.deepEqual(result.nodes, ['A', 'D', 'C']);
    assert.deepEqual(result.road_ids, ['R_ALT1', 'R_ALT2']);
    assert.ok(!result.road_ids.includes('R_DIRECT'));
  });

  // Test 3: Dijkstra Minimum Cost Selection (Prefer safer longer road)
  await runTest('3. Dijkstra selects path with minimum total cost (safer vs shorter)', async () => {
    const roads = [
      // Shorter path A -> B -> C: dist 2km, but high risk 0.9 -> cost 2 + (0.9*10) = 11
      { road_id: 'R_HIGH_RISK_1', u: 'A', v: 'B', distance: 1.0, status: 'OPEN', blockage_probability: 0.9 },
      { road_id: 'R_HIGH_RISK_2', u: 'B', v: 'C', distance: 1.0, status: 'OPEN', blockage_probability: 0.9 },
      // Longer path A -> D -> C: dist 6km, low risk 0.05 -> cost 6 + (0.05*10) = 6.5
      { road_id: 'R_SAFE_1', u: 'A', v: 'D', distance: 3.0, status: 'OPEN', blockage_probability: 0.05 },
      { road_id: 'R_SAFE_2', u: 'D', v: 'C', distance: 3.0, status: 'OPEN', blockage_probability: 0.05 },
    ];

    const result = await calculateOfflineRoute('A', 'C', 10.0, roads);
    assert.deepEqual(result.nodes, ['A', 'D', 'C']);
    assert.deepEqual(result.road_ids, ['R_SAFE_1', 'R_SAFE_2']);
  });

  // Test 4: Impact of risk_weight Parameter
  await runTest('4. Changing risk_weight alters route selection', async () => {
    const roads = [
      // Direct path A -> C: dist 4km, risk 0.4 -> cost at W=0 is 4.0; cost at W=20 is 4 + (0.4*20) = 12.0
      { road_id: 'R_DIRECT', u: 'A', v: 'C', distance: 4.0, status: 'OPEN', blockage_probability: 0.4 },
      // Indirect path A -> D -> C: dist 5km, risk 0.05 -> cost at W=0 is 5.0; cost at W=20 is 5 + (0.05*20) = 6.0
      { road_id: 'R_IND1', u: 'A', v: 'D', distance: 2.5, status: 'OPEN', blockage_probability: 0.02 },
      { road_id: 'R_IND2', u: 'D', v: 'C', distance: 2.5, status: 'OPEN', blockage_probability: 0.03 },
    ];

    // At W = 0 (pure distance), selects R_DIRECT (4km < 5km)
    const resultLowWeight = await calculateOfflineRoute('A', 'C', 0.0, roads);
    assert.deepEqual(resultLowWeight.road_ids, ['R_DIRECT']);

    // At W = 20 (high safety), selects safer indirect path R_IND1 -> R_IND2
    const resultHighWeight = await calculateOfflineRoute('A', 'C', 20.0, roads);
    assert.deepEqual(resultHighWeight.road_ids, ['R_IND1', 'R_IND2']);
  });

  // Test 5: Total Distance Calculation
  await runTest('5. Total physical distance calculation accuracy', async () => {
    const roads = [
      { road_id: 'R1', u: 'A', v: 'B', distance: 3.5, status: 'OPEN', blockage_probability: 0.1 },
      { road_id: 'R2', u: 'B', v: 'C', distance: 4.2, status: 'OPEN', blockage_probability: 0.1 },
    ];

    const result = await calculateOfflineRoute('A', 'C', 10.0, roads);
    assert.equal(result.total_distance, 7.7);
  });

  // Test 6: Total Risk Score Calculation
  await runTest('6. Total risk score calculation accuracy', async () => {
    const roads = [
      { road_id: 'R1', u: 'A', v: 'B', distance: 2.0, status: 'OPEN', blockage_probability: 0.15 },
      { road_id: 'R2', u: 'B', v: 'C', distance: 2.0, status: 'OPEN', blockage_probability: 0.25 },
    ];

    const result = await calculateOfflineRoute('A', 'C', 10.0, roads);
    assert.equal(result.total_risk_score, 0.4);
  });

  // Test 7: Total Routing Cost Calculation
  await runTest('7. Total routing cost calculation accuracy', async () => {
    // R1: dist 2.0, prob 0.1 -> cost = 2.0 + (0.1 * 10) = 3.0
    // R2: dist 3.0, prob 0.2 -> cost = 3.0 + (0.2 * 10) = 5.0
    // Total cost = 8.0
    const roads = [
      { road_id: 'R1', u: 'A', v: 'B', distance: 2.0, status: 'OPEN', blockage_probability: 0.1 },
      { road_id: 'R2', u: 'B', v: 'C', distance: 3.0, status: 'OPEN', blockage_probability: 0.2 },
    ];

    const result = await calculateOfflineRoute('A', 'C', 10.0, roads);
    assert.equal(result.total_cost, 8.0);
  });

  // Test 8: Start Node Validation
  await runTest('8. Start node validation throws error on invalid node', async () => {
    const roads = [
      { road_id: 'R1', u: 'A', v: 'B', distance: 2.0, status: 'OPEN', blockage_probability: 0.1 },
    ];

    await assert.rejects(
      async () => await calculateOfflineRoute('NON_EXISTENT_START', 'B', 10.0, roads),
      /Start node 'NON_EXISTENT_START' does not exist/
    );
  });

  // Test 9: Destination Node Validation
  await runTest('9. Destination node validation throws error on invalid node', async () => {
    const roads = [
      { road_id: 'R1', u: 'A', v: 'B', distance: 2.0, status: 'OPEN', blockage_probability: 0.1 },
    ];

    await assert.rejects(
      async () => await calculateOfflineRoute('A', 'NON_EXISTENT_DEST', 10.0, roads),
      /Destination node 'NON_EXISTENT_DEST' does not exist/
    );
  });

  // Test 10: No-Route Scenario Error Handling
  await runTest('10. No-route scenario throws clear descriptive error', async () => {
    const roads = [
      { road_id: 'R1', u: 'A', v: 'B', distance: 2.0, status: 'OPEN', blockage_probability: 0.1 },
      { road_id: 'R2', u: 'X', v: 'Y', distance: 2.0, status: 'OPEN', blockage_probability: 0.1 },
    ];

    await assert.rejects(
      async () => await calculateOfflineRoute('A', 'Y', 10.0, roads),
      /No safe route is currently available between 'A' and 'Y'/
    );
  });

  // Test 11: Offline Route Response Structure
  await runTest('11. Offline route response matches expected backend schema structure', async () => {
    const roads = [
      { road_id: 'R1', u: 'A', v: 'B', distance: 1.0, status: 'OPEN', blockage_probability: 0.1 },
    ];

    const result = await calculateOfflineRoute('A', 'B', 10.0, roads);
    assert.equal(typeof result.start_node, 'string');
    assert.equal(typeof result.destination_node, 'string');
    assert.ok(Array.isArray(result.nodes));
    assert.ok(Array.isArray(result.road_ids));
    assert.equal(typeof result.total_distance, 'number');
    assert.equal(typeof result.total_risk_score, 'number');
    assert.equal(typeof result.total_cost, 'number');
    assert.equal(result.is_offline, true);
    assert.equal(result.routing_mode, 'offline');
  });

  // Test 12: Empty Cache Error Handling
  await runTest('12. Empty cache throws clear offline unavailable error', async () => {
    await assert.rejects(
      async () => await calculateOfflineRoute('A', 'B', 10.0, []),
      /Offline routing unavailable: No synchronized road network stored/
    );
  });

  console.log('\n==================================================');
  console.log(`  RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('==================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAllTests();
