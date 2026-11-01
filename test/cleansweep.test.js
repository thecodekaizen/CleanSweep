const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

// Point config and history to an isolated temporary sandbox directory for test run
const testConfigDir = path.join(os.tmpdir(), `cleansweep-unit-test-${Date.now()}`);
process.env.CLEANSWEEP_CONFIG_DIR = testConfigDir;

const { formatBytes, pathExists } = require('../electron/utils');
const { getConfig, updateConfig, isPathWhitelisted } = require('../electron/config');
const { getHistory, recordHistoryEntry } = require('../electron/history');
const { getOptimizationTasks } = require('../electron/optimizer');
const { getTargets, cleanSystem } = require('../electron/scanner');
const { scanDuplicateFiles, removeDuplicates } = require('../electron/duplicates');
const { scanDevProjects, purgeArtifacts } = require('../electron/purger');
const { scanInstallers, cleanInstallers } = require('../electron/installer');
const { scanLargeAndOldFiles } = require('../electron/analyzer');

test('utils: formatBytes handles various byte ranges', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(-100), '0 B');
  assert.equal(formatBytes(1024), '1 KB');
  assert.equal(formatBytes(1024 * 1024 * 5), '5 MB');
  assert.equal(formatBytes(1024 * 1024 * 1024 * 2.5), '2.5 GB');
});

test('utils: pathExists returns boolean correctly', async () => {
  assert.equal(await pathExists(__filename), true);
  assert.equal(await pathExists('/non/existent/path/for/cleansweep/test'), false);
});

test('config: defaults, update, and whitelist checks', async () => {
  const cfg = await getConfig();
  assert.ok(typeof cfg.useTrash === 'boolean');
  assert.ok(Array.isArray(cfg.whitelist));

  // Test updating config
  const updateRes = await updateConfig({
    whitelist: ['/Users/test/Code/protected']
  });
  assert.ok(updateRes.success);
  assert.deepEqual(updateRes.config.whitelist, ['/Users/test/Code/protected']);

  // Whitelist path checking
  assert.equal(await isPathWhitelisted('/Users/test/Code/protected/file.txt'), true);
  assert.equal(await isPathWhitelisted('/Users/test/Code/other'), false);
});

test('optimizer: returns full suite of maintenance routines', () => {
  const tasks = getOptimizationTasks();
  assert.ok(tasks.length >= 6);
  const ids = tasks.map(t => t.id);
  assert.ok(ids.includes('flush-dns'));
  assert.ok(ids.includes('purge-ram'));
  assert.ok(ids.includes('rebuild-launchservices'));
  assert.ok(ids.includes('spotlight-status'));
  assert.ok(ids.includes('refresh-quicklook'));
});

test('scanner: getTargets returns target definitions', () => {
  const targets = getTargets();
  assert.ok(Array.isArray(targets));
  assert.ok(targets.length > 10);
  const categories = new Set(targets.map(t => t.category));
  assert.ok(categories.has('System & App Junk'));
  assert.ok(categories.has('Developer & Build'));
  assert.ok(categories.has('Browsers'));
  assert.ok(categories.has('Containers & Virtual Disks'));
  assert.ok(categories.has('AI & Local Models'));
});

test('scanner: cleanSystem dry run calculations', async () => {
  const mockItems = [
    { id: 'test-1', path: '/tmp/test-item-1', sizeBytes: 1024 * 1024 },
    { id: 'test-2', path: '/tmp/test-item-2', sizeBytes: 2048 * 1024 }
  ];

  const dryRunResult = await cleanSystem(mockItems, { dryRun: true });
  assert.ok(dryRunResult.success);
  assert.equal(dryRunResult.cleanedCount, 2);
  assert.equal(dryRunResult.cleanedBytes, 3145728);
});

test('duplicates: identifies exact SHA-256 matches and supports safe deletion', async () => {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'cleansweep-dup-test-'));

  try {
    const file1 = path.join(tmpDir, 'sample1.txt');
    const file2 = path.join(tmpDir, 'sample2.txt');
    const file3 = path.join(tmpDir, 'different.txt');

    const contentA = 'The quick brown fox jumps over the lazy dog! Repeat content to exceed min length.';
    const contentB = 'Completely different random bytes for hashing test.';

    await fs.promises.writeFile(file1, contentA, 'utf8');
    await fs.promises.writeFile(file2, contentA, 'utf8');
    await fs.promises.writeFile(file3, contentB, 'utf8');

    // Run duplicate finder with 10 bytes min size
    const dupReport = await scanDuplicateFiles(tmpDir, 10);
    assert.equal(dupReport.groups.length, 1);
    assert.equal(dupReport.groups[0].duplicates.length, 1);
    assert.equal(dupReport.totalDuplicates, 1);

    // Test removing duplicate file
    const delResult = await removeDuplicates([file2], { useTrash: false });
    assert.ok(delResult.success);
    assert.equal(await pathExists(file1), true); // Original preserved
    assert.equal(await pathExists(file2), false); // Duplicate removed
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
});

test('purger: discovers project build artifacts (node_modules, target)', async () => {
  const tmpProjectDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'cleansweep-proj-test-'));

  try {
    const nodeModulesDir = path.join(tmpProjectDir, 'node_modules', 'sample-pkg');
    await fs.promises.mkdir(nodeModulesDir, { recursive: true });
    await fs.promises.writeFile(path.join(nodeModulesDir, 'index.js'), 'console.log("hello");', 'utf8');

    const result = await scanDevProjects(tmpProjectDir);
    assert.equal(result.artifacts.length, 1);
    assert.equal(result.artifacts[0].artifactType, 'node_modules');
    assert.ok(result.artifacts[0].sizeBytes > 0);

    // Purge test
    const purgeResult = await purgeArtifacts([result.artifacts[0].path], { useTrash: false });
    assert.ok(purgeResult.success);
    assert.equal(purgeResult.cleanedCount, 1);
    assert.equal(await pathExists(result.artifacts[0].path), false);
  } finally {
    await fs.promises.rm(tmpProjectDir, { recursive: true, force: true });
  }
});

test('installer: scans leftover installation packages (.dmg, .pkg)', async () => {
  const tmpInstallDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'cleansweep-installer-test-'));

  try {
    const testDmg = path.join(tmpInstallDir, 'sample-installer.dmg');
    const testPkg = path.join(tmpInstallDir, 'sample-package.pkg');
    const testTxt = path.join(tmpInstallDir, 'readme.txt');

    await fs.promises.writeFile(testDmg, 'dummy dmg image content', 'utf8');
    await fs.promises.writeFile(testPkg, 'dummy pkg installer content', 'utf8');
    await fs.promises.writeFile(testTxt, 'text file', 'utf8');

    const result = await scanInstallers([tmpInstallDir]);
    assert.equal(result.installers.length, 2);
    assert.ok(result.totalBytes > 0);

    const cleanResult = await cleanInstallers([testDmg], { useTrash: false });
    assert.ok(cleanResult.success);
    assert.equal(cleanResult.cleanedCount, 1);
    assert.equal(await pathExists(testDmg), false);
    assert.equal(await pathExists(testPkg), true);
  } finally {
    await fs.promises.rm(tmpInstallDir, { recursive: true, force: true });
  }
});

test('analyzer: scans and identifies large and old files', async () => {
  const tmpAnalyzerDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'cleansweep-analyzer-test-'));

  try {
    const bigFile = path.join(tmpAnalyzerDir, 'large-archive.zip');
    const smallFile = path.join(tmpAnalyzerDir, 'notes.txt');

    // Create 100KB file
    const buffer100K = Buffer.alloc(100 * 1024, 'a');
    await fs.promises.writeFile(bigFile, buffer100K);
    await fs.promises.writeFile(smallFile, 'short text', 'utf8');

    // Large file search with min size 50KB
    const result = await scanLargeAndOldFiles({ customDirs: [tmpAnalyzerDir], minSizeBytes: 50 * 1024 });
    assert.equal(result.files.length, 1);
    assert.equal(result.files[0].name, 'large-archive.zip');
    assert.equal(result.files[0].category, 'Archives & Installers');
  } finally {
    await fs.promises.rm(tmpAnalyzerDir, { recursive: true, force: true });
  }
});

test('history: logs operations and calculates cumulative statistics', async () => {
  const initialHistory = await getHistory();
  const initialReclaimed = initialHistory.totalLifetimeBytes;

  await recordHistoryEntry({
    type: 'Smart Clean',
    bytesReclaimed: 1048576, // 1MB
    itemCount: 42
  });

  const updatedHistory = await getHistory();
  assert.ok(updatedHistory.totalLifetimeBytes >= initialReclaimed + 1048576);
  assert.ok(updatedHistory.entries.length > 0);
  assert.equal(updatedHistory.entries[0].bytesReclaimed, 1048576);
});
