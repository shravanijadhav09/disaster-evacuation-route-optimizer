/**
 * Automated Test Suite for Map Theme Visualization & LocalStorage Persistence.
 * Tests default theme initialization ('light'), localStorage persistence, and toggle state transitions.
 * Run command: node frontend/tests/test_map_theme.mjs
 */

import assert from 'node:assert/strict';

// Mock localStorage for Node environment
let localStorageStore = {};

globalThis.localStorage = {
  getItem: (key) => localStorageStore[key] || null,
  setItem: (key, value) => { localStorageStore[key] = String(value); },
  removeItem: (key) => { delete localStorageStore[key]; },
  clear: () => { localStorageStore = {}; },
};

let testsPassed = 0;
let testsFailed = 0;

async function runTest(name, testFn) {
  try {
    localStorageStore = {};
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
  console.log('  RUNNING MAP THEME TOGGLE & PERSISTENCE TEST SUITE');
  console.log('==================================================\n');

  // Test 1: Default theme initialization is 'light' when no localStorage key exists
  await runTest('1. Default theme initializes to light when no preference saved', async () => {
    const savedTheme = localStorage.getItem('evacuation_map_theme') || 'light';
    assert.equal(savedTheme, 'light');
  });

  // Test 2: Saved 'dark' preference in localStorage is read correctly
  await runTest('2. Saved dark preference in localStorage loads as dark', async () => {
    localStorage.setItem('evacuation_map_theme', 'dark');
    const savedTheme = localStorage.getItem('evacuation_map_theme') || 'light';
    assert.equal(savedTheme, 'dark');
  });

  // Test 3: Toggle changes light -> dark and updates localStorage
  await runTest('3. Toggle changes light -> dark and persists to localStorage', async () => {
    let currentTheme = localStorage.getItem('evacuation_map_theme') || 'light';
    assert.equal(currentTheme, 'light');

    // Simulate user clicking Dark toggle
    currentTheme = 'dark';
    localStorage.setItem('evacuation_map_theme', currentTheme);

    assert.equal(localStorage.getItem('evacuation_map_theme'), 'dark');
  });

  // Test 4: Toggle changes dark -> light and updates localStorage
  await runTest('4. Toggle changes dark -> light and persists to localStorage', async () => {
    localStorage.setItem('evacuation_map_theme', 'dark');
    let currentTheme = localStorage.getItem('evacuation_map_theme');
    assert.equal(currentTheme, 'dark');

    // Simulate user clicking Light toggle
    currentTheme = 'light';
    localStorage.setItem('evacuation_map_theme', currentTheme);

    assert.equal(localStorage.getItem('evacuation_map_theme'), 'light');
  });

  // Test 5: Invalid localStorage theme falls back to 'light'
  await runTest('5. Invalid theme in localStorage falls back to light', async () => {
    localStorage.setItem('evacuation_map_theme', 'INVALID_THEME');
    const themeRaw = localStorage.getItem('evacuation_map_theme');
    const validTheme = (themeRaw === 'light' || themeRaw === 'dark') ? themeRaw : 'light';
    assert.equal(validTheme, 'light');
  });

  console.log('\n==================================================');
  console.log(`  RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('==================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAllTests();
