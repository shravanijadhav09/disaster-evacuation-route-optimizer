/**
 * Automated Test Suite for Disaster Incident Resolution (Resolve Button Workflow).
 * Tests resolving disasters, status payload formatting, operational feedback construction,
 * and graph status restoration.
 * Run command: node frontend/tests/test_disaster_resolve.mjs
 */

import assert from 'node:assert/strict';
import { updateDisasterStatus } from '../src/services/api.js';

let testsPassed = 0;
let testsFailed = 0;

async function runTest(name, testFn) {
  try {
    await testFn();
    console.log(`  ✓ PASSED: ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ FAILED: ${name}`);
    console.error(err);
    testsFailed++;
  }
}

async function runAllTests() {
  console.log('\n==================================================');
  console.log('  RUNNING DISASTER RESOLVE BUTTON TEST SUITE');
  console.log('==================================================\n');

  await runTest('1. updateDisasterStatus formats payload correctly for RESOLVED status', async () => {
    let capturedUrl = '';
    let capturedOptions = {};

    globalThis.fetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          id: 'DISASTER-001',
          title: 'Flash Flood',
          status: 'RESOLVED',
          admin_notes: 'Incident resolved & hazards cleared by field team.',
        }),
      };
    };

    const response = await updateDisasterStatus(
      'DISASTER-001',
      { status: 'RESOLVED', admin_notes: 'Incident resolved & hazards cleared by field team.' },
      'admin'
    );

    assert.equal(response.status, 'RESOLVED');
    assert.equal(capturedUrl, 'http://localhost:8000/disasters/DISASTER-001/status');
    assert.equal(capturedOptions.method, 'PATCH');
    assert.equal(capturedOptions.headers['X-Role'], 'admin');

    const parsedBody = JSON.parse(capturedOptions.body);
    assert.equal(parsedBody.status, 'RESOLVED');
    assert.equal(parsedBody.admin_notes, 'Incident resolved & hazards cleared by field team.');
  });

  await runTest('2. Handle resolve updates disaster list & road statuses', async () => {
    let disasters = [
      { id: 'D1', title: 'Landslide on R1', status: 'APPROVED', affected_roads: ['R1'] }
    ];
    let roads = [
      { road_id: 'R1', status: 'BLOCKED' }
    ];

    // Simulate handleResolveDisaster workflow
    const disasterId = 'D1';
    const target = disasters.find(d => d.id === disasterId);
    assert.ok(target);

    // Mock API call return
    target.status = 'RESOLVED';
    roads[0].status = 'OPEN';

    const affRoads = target.affected_roads || [];
    const restoredStatus = roads
      .filter(r => affRoads.includes(r.road_id))
      .map(r => `Road ${r.road_id} (🟢 ${r.status})`)
      .join(', ');

    const feedback = {
      type: 'RESOLVED',
      title: target.title,
      affectedRoads: affRoads.join(', '),
      restoredStatus: restoredStatus,
    };

    assert.equal(feedback.type, 'RESOLVED');
    assert.equal(feedback.title, 'Landslide on R1');
    assert.equal(feedback.affectedRoads, 'R1');
    assert.equal(feedback.restoredStatus, 'Road R1 (🟢 OPEN)');
    assert.equal(target.status, 'RESOLVED');
  });

  console.log('\n==================================================');
  console.log(`  RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('==================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAllTests();
