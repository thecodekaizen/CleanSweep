#!/usr/bin/env node

/**
 * CleanSweep CLI (sweep)
 * Telemetry-free macOS optimizer, app uninstaller, and developer cleaning suite
 */

import path from 'path';
import readline from 'readline';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { scanSystem, cleanSystem } = require('../electron/scanner.js');
const { scanInstalledApps, uninstallApp } = require('../electron/uninstaller.js');
const { scanLargeAndOldFiles } = require('../electron/analyzer.js');
const { getOptimizationTasks, runOptimization } = require('../electron/optimizer.js');
const { getLiveSystemHealth } = require('../electron/monitor.js');
const { scanDevProjects, purgeArtifacts } = require('../electron/purger.js');
const { scanDuplicateFiles, removeDuplicates } = require('../electron/duplicates.js');
const { scanSlimmableApps, slimApp } = require('../electron/slimmer.js');
const { getHistory, recordHistoryEntry } = require('../electron/history.js');
const { scanInstallers, cleanInstallers } = require('../electron/installer.js');

const args = process.argv.slice(2);
const command = args[0] || 'menu';

// Colors for terminal formatting
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function printBanner() {
  console.log(`\n${c.bold}${c.cyan}🧹 CleanSweep${c.reset} ${c.dim}— The zero-telemetry macOS optimizer${c.reset}\n`);
}

function printHelp() {
  printBanner();
  console.log(`${c.bold}USAGE:${c.reset}`);
  console.log(`  sweep <command> [options]\n`);
  console.log(`${c.bold}COMMANDS:${c.reset}`);
  console.log(`  ${c.green}status${c.reset}             Display real-time system metrics (CPU, Memory, Disk, Battery)`);
  console.log(`  ${c.green}clean${c.reset}              Scan and clean system, browser, and developer junk`);
  console.log(`  ${c.green}purge [dir]${c.reset}        Purge heavy project artifacts (node_modules, target, .venv)`);
  console.log(`  ${c.green}duplicates [dir]${c.reset}   Find and remove duplicate files using SHA-256 matching`);
  console.log(`  ${c.green}apps${c.reset}               List installed macOS applications and their storage footprint`);
  console.log(`  ${c.green}uninstall <name>${c.reset}    Completely uninstall an application and its leftover files`);
  console.log(`  ${c.green}analyze [dir]${c.reset}      Find large and old files taking up space`);
  console.log(`  ${c.green}optimize${c.reset}           Run macOS maintenance tasks (Flush DNS, purge RAM, rebuild services)`);
  console.log(`  ${c.green}menu${c.reset}               Launch the interactive terminal menu (default if no args)`);
  console.log(`  ${c.green}help${c.reset}               Show this help message\n`);
  console.log(`${c.bold}OPTIONS:${c.reset}`);
  console.log(`  ${c.yellow}--dry-run${c.reset}          Simulate cleanup without deleting any files`);
  console.log(`  ${c.yellow}--json${c.reset}             Output results as formatted JSON`);
  console.log(`  ${c.yellow}--all${c.reset}              Auto-select all cleanable categories`);
  console.log(`  ${c.yellow}--version, -v${c.reset}      Print version information\n`);
}

async function handleStatus() {
  const jsonMode = args.includes('--json');
  const metrics = await getLiveSystemHealth();

  if (jsonMode) {
    console.log(JSON.stringify(metrics, null, 2));
    return;
  }

  printBanner();
  console.log(`${c.bold}Hardware & Operating System:${c.reset}`);
  console.log(`  Model:     ${c.cyan}${metrics.cpu.model}${c.reset} (${metrics.cpu.cores} cores)`);
  console.log(`  Host:      ${metrics.hostname} (macOS Darwin ${metrics.release})`);
  console.log(`  Uptime:    ${Math.floor(metrics.uptimeSeconds / 3600)}h ${Math.floor((metrics.uptimeSeconds % 3600) / 60)}m\n`);

  console.log(`${c.bold}CPU & Memory:${c.reset}`);
  console.log(`  CPU Usage: ${c.yellow}${metrics.cpu.percentage}%${c.reset}`);
  console.log(`  Memory:    ${c.yellow}${metrics.memory.usedFormatted}${c.reset} used / ${metrics.memory.totalFormatted} total (${metrics.memory.usedPercent}%)`);
  console.log(`             ${c.dim}Active: ${metrics.memory.activeFormatted} | Wired: ${metrics.memory.wiredFormatted} | Compressed: ${metrics.memory.compressedFormatted}${c.reset}\n`);

  console.log(`${c.bold}Primary Disk (/):${c.reset}`);
  console.log(`  Capacity:  ${c.green}${metrics.disk.usedFormatted}${c.reset} used of ${metrics.disk.totalFormatted} (${metrics.disk.capacityPercent}% full)`);
  console.log(`  Available: ${c.green}${metrics.disk.availableFormatted}${c.reset}\n`);

  if (metrics.battery.hasBattery) {
    console.log(`${c.bold}Battery Status:${c.reset}`);
    console.log(`  Level:     ${c.magenta}${metrics.battery.percent}%${c.reset} (${metrics.battery.status})\n`);
  }
}

async function handleClean() {
  const isDryRun = args.includes('--dry-run');
  const jsonMode = args.includes('--json');
  const cleanAll = args.includes('--all');

  if (!jsonMode) {
    printBanner();
    process.stdout.write(`${c.dim}Scanning system and developer caches...${c.reset}\r`);
  }

  const scanResult = await scanSystem();
  const selected = cleanAll ? scanResult.items : scanResult.items.filter(i => i.defaultChecked);

  if (jsonMode) {
    if (isDryRun) {
      console.log(JSON.stringify({ dryRun: true, targets: selected, totalBytes: scanResult.totalBytes }, null, 2));
      return;
    }
  }

  console.log(`\r${c.bold}Detected System & Developer Data:${c.reset} ${c.yellow}${scanResult.totalFormatted}${c.reset} across ${scanResult.items.length} targets\n`);

  selected.forEach(item => {
    console.log(`  ${c.cyan}•${c.reset} ${item.name.padEnd(32)} ${c.dim}[${item.category}]${c.reset}  ${c.green}${item.sizeFormatted}${c.reset}`);
  });

  console.log(`\n${c.bold}${isDryRun ? '[DRY RUN] Simulating' : 'Executing'} Clean...${c.reset}`);
  const result = await cleanSystem(selected, { dryRun: isDryRun, useTrash: true });

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\n${c.bold}${c.green}✓ Done!${c.reset} ${result.message}\n`);
  }
}

async function handlePurge() {
  const customDir = args[1] && !args[1].startsWith('--') ? args[1] : null;
  const isDryRun = args.includes('--dry-run');
  const jsonMode = args.includes('--json');

  if (!jsonMode) {
    printBanner();
    process.stdout.write(`${c.dim}Scanning for rebuildable project build artifacts...${c.reset}\r`);
  }

  const result = await scanDevProjects(customDir);

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`\r${c.bold}Rebuildable Build Artifacts:${c.reset} ${c.yellow}${result.totalFormatted}${c.reset} across ${result.totalCount} project folders\n`);

  result.artifacts.slice(0, 25).forEach(art => {
    console.log(`  ${c.cyan}•${c.reset} ${art.projectName.padEnd(25)} ${c.dim}[${art.artifactType}]${c.reset}  ${c.green}${art.sizeFormatted.padEnd(10)}${c.reset} ${c.dim}${art.path}${c.reset}`);
  });

  if (result.artifacts.length === 0) {
    console.log(`  ${c.dim}No heavy project build artifacts found.${c.reset}\n`);
    return;
  }

  if (isDryRun) {
    console.log(`\n${c.bold}[DRY RUN] Would purge ${result.totalCount} artifact folders (${result.totalFormatted}).${c.reset}\n`);
    return;
  }

  console.log(`\n${c.bold}Purging artifacts to Trash...${c.reset}`);
  const res = await purgeArtifacts(result.artifacts.map(a => a.path), { useTrash: true });
  console.log(`\n${c.bold}${c.green}✓ Done!${c.reset} ${res.message}\n`);
}

async function handleDuplicates() {
  const customDir = args[1] && !args[1].startsWith('--') ? [path.resolve(args[1])] : null;
  const jsonMode = args.includes('--json');

  if (!jsonMode) {
    printBanner();
    process.stdout.write(`${c.dim}Scanning files & calculating SHA-256 signatures...${c.reset}\r`);
  }

  const result = await scanDuplicateFiles(customDir);

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`\r${c.bold}Duplicate Files Detected:${c.reset} ${c.yellow}${result.totalWastedFormatted}${c.reset} wasted across ${result.totalDuplicates} duplicates\n`);

  result.groups.slice(0, 20).forEach(group => {
    console.log(`  ${c.cyan}Group [${group.sizeFormatted}]:${c.reset}`);
    console.log(`    ${c.green}Original:${c.reset}  ${group.original.path}`);
    group.duplicates.forEach(d => {
      console.log(`    ${c.red}Duplicate:${c.reset} ${d.path}`);
    });
  });

  if (result.groups.length === 0) {
    console.log(`  ${c.dim}No duplicate files detected in target directories.${c.reset}\n`);
    return;
  }

  const shouldClean = args.includes('--clean');
  if (shouldClean) {
    const allDupes = [];
    result.groups.forEach(g => g.duplicates.forEach(d => allDupes.push(d.path)));
    console.log(`\n${c.bold}Moving ${allDupes.length} duplicate file(s) to Trash...${c.reset}`);
    const res = await removeDuplicates(allDupes, { useTrash: true });
    console.log(`\n${c.bold}${c.green}✓ Done!${c.reset} ${res.message}\n`);
  } else {
    console.log(`\n${c.dim}Tip: Run 'sweep duplicates --clean' to move all identified duplicates to Trash.${c.reset}\n`);
  }
}

async function handleApps() {
  const jsonMode = args.includes('--json');
  if (!jsonMode) {
    printBanner();
    process.stdout.write(`${c.dim}Scanning installed applications...${c.reset}\r`);
  }

  const result = await scanInstalledApps();

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`\r${c.bold}Installed Applications:${c.reset} (${result.totalCount} found, ${c.yellow}${result.totalFormatted}${c.reset} total)\n`);

  result.apps.slice(0, 30).forEach(app => {
    const leftText = app.associatedBytes > 0 ? ` (+${app.associatedFormatted} leftovers)` : '';
    console.log(`  ${c.cyan}•${c.reset} ${app.name.padEnd(30)} ${c.bold}${app.totalFormatted}${c.reset}${c.dim}${leftText}${c.reset}`);
  });

  if (result.apps.length > 30) {
    console.log(`  ${c.dim}...and ${result.apps.length - 30} more apps.${c.reset}`);
  }
  console.log('');
}

async function handleUninstall() {
  const targetName = args[1];
  if (!targetName) {
    console.error(`${c.red}Error:${c.reset} Please provide the application name to uninstall (e.g. 'sweep uninstall Slack')`);
    process.exit(1);
  }

  printBanner();
  console.log(`${c.dim}Searching for ${targetName}...${c.reset}`);
  const result = await scanInstalledApps();
  const match = result.apps.find(a => 
    a.name.toLowerCase() === targetName.toLowerCase() || 
    (a.bundleId && a.bundleId.toLowerCase().includes(targetName.toLowerCase()))
  );

  if (!match) {
    console.log(`${c.red}Application '${targetName}' not found in /Applications or ~/Applications.${c.reset}`);
    process.exit(1);
  }

  console.log(`\n${c.bold}Target Application Found:${c.reset}`);
  console.log(`  Name:         ${c.cyan}${match.name}${c.reset} (v${match.version})`);
  console.log(`  App Bundle:   ${match.appPath} (${match.appSizeFormatted})`);
  console.log(`  Leftovers:    ${match.associatedFiles.length} file(s) (${match.associatedFormatted})`);

  match.associatedFiles.forEach(f => {
    console.log(`    ${c.dim}-${c.reset} [${f.type}] ${f.path}`);
  });

  await uninstallApp(match.appPath, match.associatedFiles.map(f => f.path), { useTrash: true });
  console.log(`\n${c.bold}${c.green}✓ ${match.name} and associated files moved to macOS Trash!${c.reset}\n`);
}

async function handleAnalyze() {
  const customDir = args[1];
  const jsonMode = args.includes('--json');

  if (!jsonMode) {
    printBanner();
    process.stdout.write(`${c.dim}Analyzing directories for large files...${c.reset}\r`);
  }

  const result = await scanLargeAndOldFiles({
    customDirs: customDir ? [path.resolve(customDir)] : undefined
  });

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`\r${c.bold}Large Files Detected (>50MB):${c.reset} ${c.yellow}${result.totalFormatted}${c.reset} in ${result.totalCount} files\n`);

  result.files.slice(0, 25).forEach(f => {
    console.log(`  ${c.cyan}•${c.reset} ${f.name.padEnd(36)} ${c.bold}${f.sizeFormatted.padEnd(10)}${c.reset} ${c.dim}[${f.category}, ${f.ageDays}d old]${c.reset}`);
  });

  console.log('');
}

async function handleSlim() {
  const isDryRun = args.includes('--dry-run');
  const jsonMode = args.includes('--json');

  if (!jsonMode) {
    printBanner();
    process.stdout.write(`${c.dim}Scanning application bundles for unneeded localizations...${c.reset}\r`);
  }

  const result = await scanSlimmableApps();

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`\r${c.bold}Slimmable Applications:${c.reset} ${c.yellow}${result.grandTotalFormatted}${c.reset} across ${result.totalApps} apps\n`);

  result.apps.slice(0, 20).forEach(app => {
    console.log(`  ${c.cyan}•${c.reset} ${app.appName.padEnd(28)} ${c.bold}${app.totalSlimFormatted.padEnd(10)}${c.reset} ${c.dim}(${app.localesCount} language packs)${c.reset}`);
  });

  if (result.apps.length === 0) {
    console.log(`  ${c.dim}All applications are already slimmed down.${c.reset}\n`);
    return;
  }

  if (isDryRun) {
    console.log(`\n${c.bold}[DRY RUN] Would slim ${result.totalApps} applications (${result.grandTotalFormatted}).${c.reset}\n`);
    return;
  }

  console.log(`\n${c.bold}Slimming applications...${c.reset}`);
  let totalStripped = 0;
  for (const a of result.apps) {
    const res = await slimApp(a.locales.map(l => l.path), { useTrash: true });
    totalStripped += res.cleanedCount;
  }

  await recordHistoryEntry({
    type: 'App Slimmer',
    bytesReclaimed: result.grandTotalBytes,
    itemCount: totalStripped,
    details: `Slimmed ${result.apps.length} apps by stripping ${totalStripped} unused language packs`
  });

  console.log(`\n${c.bold}${c.green}✓ Done!${c.reset} Stripped ${totalStripped} language packs (${result.grandTotalFormatted} freed).\n`);
}

async function handleInstaller() {
  const isDryRun = args.includes('--dry-run');
  const jsonMode = args.includes('--json');

  if (!jsonMode) {
    printBanner();
    process.stdout.write(`${c.dim}Searching for downloaded installer packages...${c.reset}\r`);
  }

  const result = await scanInstallers();

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`\r${c.bold}Installer Packages Found (.dmg / .pkg / .iso):${c.reset} ${c.yellow}${result.totalFormatted}${c.reset} in ${result.totalCount} packages\n`);

  result.installers.forEach(inst => {
    console.log(`  ${c.cyan}•${c.reset} ${inst.name.padEnd(36)} ${c.bold}${inst.sizeFormatted.padEnd(10)}${c.reset} ${c.dim}[${inst.ageDays}d old] ${inst.path}${c.reset}`);
  });

  if (result.installers.length === 0) {
    console.log(`  ${c.dim}No leftover installer packages found.${c.reset}\n`);
    return;
  }

  if (isDryRun) {
    console.log(`\n${c.bold}[DRY RUN] Would clean ${result.totalCount} installer packages (${result.totalFormatted}).${c.reset}\n`);
    return;
  }

  const shouldClean = args.includes('--clean');
  if (shouldClean) {
    const res = await cleanInstallers(result.installers.map(i => i.path), { useTrash: true });
    await recordHistoryEntry({
      type: 'Installers Clean',
      bytesReclaimed: result.totalBytes,
      itemCount: res.cleanedCount,
      details: `Removed ${res.cleanedCount} installer packages`
    });
    console.log(`\n${c.bold}${c.green}✓ Done!${c.reset} ${res.message}\n`);
  } else {
    console.log(`\n${c.dim}Tip: Run 'sweep installer --clean' to move all identified installer packages to Trash.${c.reset}\n`);
  }
}

async function handleHistory() {
  const jsonMode = args.includes('--json');
  const history = await getHistory();

  if (jsonMode) {
    console.log(JSON.stringify(history, null, 2));
    return;
  }

  printBanner();
  console.log(`${c.bold}Storage Optimization Lifetime History:${c.reset}`);
  console.log(`  Total Reclaimed: ${c.bold}${c.green}${history.totalLifetimeFormatted}${c.reset}`);
  console.log(`  Total Actions:   ${c.bold}${history.totalOperations}${c.reset} operations\n`);

  console.log(`${c.bold}Recent Maintenance Runs:${c.reset}`);
  history.entries.slice(0, 15).forEach(e => {
    const dateStr = new Date(e.timestamp).toLocaleDateString();
    const bytesStr = e.bytesReclaimed > 0 ? ` (+${e.reclaimedFormatted})` : '';
    console.log(`  ${c.cyan}•${c.reset} [${dateStr}] ${c.bold}${e.type.padEnd(18)}${c.reset} ${e.details}${c.green}${bytesStr}${c.reset}`);
  });

  if (history.entries.length === 0) {
    console.log(`  ${c.dim}No maintenance history recorded yet.${c.reset}`);
  }
  console.log('');
}

async function handleOptimize() {
  printBanner();
  console.log(`${c.bold}Running macOS System Optimization Tasks...${c.reset}\n`);

  const tasks = getOptimizationTasks();
  for (const t of tasks) {
    process.stdout.write(`  ${c.cyan}•${c.reset} ${t.title.padEnd(40)} ... `);
    try {
      const res = await runOptimization(t.id);
      console.log(`${c.green}✓ (${res.durationMs}ms)${c.reset}`);
      console.log(`    ${c.dim}${res.message}${c.reset}`);
    } catch {
      console.log(`${c.yellow}⚠ (Skipped/Protected)${c.reset}`);
    }
  }

  console.log(`\n${c.bold}${c.green}✓ System maintenance routines completed!${c.reset}\n`);
}

async function handleInteractiveMenu() {
  printBanner();
  console.log(`${c.bold}Select an operation:${c.reset}\n`);
  console.log(`  ${c.cyan}1${c.reset} - 🧹 Smart Clean (System & Developer Caches)`);
  console.log(`  ${c.cyan}2${c.reset} - 🏗️  Purge Project Artifacts (node_modules, target, .venv)`);
  console.log(`  ${c.cyan}3${c.reset} - ♊ Duplicate File Finder (SHA-256 match)`);
  console.log(`  ${c.cyan}4${c.reset} - ✂️  App Localization Slimmer (Strip unused languages)`);
  console.log(`  ${c.cyan}5${c.reset} - 💿 Downloaded Installer Cleaner (.dmg/.pkg)`);
  console.log(`  ${c.cyan}6${c.reset} - 📦 Inspect Installed Apps & Leftovers`);
  console.log(`  ${c.cyan}7${c.reset} - ⚡ Run System Maintenance (Flush DNS, purge RAM)`);
  console.log(`  ${c.cyan}8${c.reset} - 📊 System Health & Activity Dashboard`);
  console.log(`  ${c.cyan}9${c.reset} - 📂 Analyze Large & Old Files`);
  console.log(`  ${c.cyan}h${c.reset} - 📜 View Cleanup History & Lifetime Stats`);
  console.log(`  ${c.cyan}0${c.reset} - Exit\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(`${c.bold}Enter your choice: ${c.reset}`, async (answer) => {
    rl.close();
    console.log('');
    switch (answer.trim()) {
      case '1': await handleClean(); break;
      case '2': await handlePurge(); break;
      case '3': await handleDuplicates(); break;
      case '4': await handleSlim(); break;
      case '5': await handleInstaller(); break;
      case '6': await handleApps(); break;
      case '7': await handleOptimize(); break;
      case '8': await handleStatus(); break;
      case '9': await handleAnalyze(); break;
      case 'h': case 'H': await handleHistory(); break;
      default: console.log('Exiting CleanSweep.'); break;
    }
  });
}

async function main() {
  if (args.includes('--version') || args.includes('-v')) {
    console.log('CleanSweep CLI v1.0.0');
    return;
  }

  switch (command) {
    case 'status':
      await handleStatus();
      break;
    case 'clean':
      await handleClean();
      break;
    case 'purge':
      await handlePurge();
      break;
    case 'duplicates':
      await handleDuplicates();
      break;
    case 'slim':
      await handleSlim();
      break;
    case 'installer':
      await handleInstaller();
      break;
    case 'history':
      await handleHistory();
      break;
    case 'apps':
      await handleApps();
      break;
    case 'uninstall':
      await handleUninstall();
      break;
    case 'analyze':
      await handleAnalyze();
      break;
    case 'optimize':
      await handleOptimize();
      break;
    case 'menu':
      await handleInteractiveMenu();
      break;
    case 'help':
    default:
      printHelp();
      break;
  }
}

main().catch(err => {
  console.error(`${c.red}Error:${c.reset}`, err.message);
  process.exit(1);
});
