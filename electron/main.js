const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const { scanSystem, cleanSystem } = require('./scanner');
const { scanInstalledApps, scanOrphanFiles, uninstallApp } = require('./uninstaller');
const { scanLargeAndOldFiles, deleteLargeFiles } = require('./analyzer');
const { getOptimizationTasks, runOptimization } = require('./optimizer');
const { getLiveSystemHealth } = require('./monitor');
const { getStartupItems, removeStartupItem } = require('./startup');
const { scanDevProjects, purgeArtifacts } = require('./purger');
const { scanDuplicateFiles, removeDuplicates } = require('./duplicates');
const { scanSlimmableApps, slimApp } = require('./slimmer');
const { getHistory, recordHistoryEntry, clearHistory } = require('./history');
const { scanInstallers, cleanInstallers } = require('./installer');
const { getConfig, updateConfig } = require('./config');
const { getScheduleStatus, configureSchedule } = require('./scheduler');
const { setupTray, destroyTray } = require('./tray');
const { safeDelete } = require('./utils');
const { runDamageScan } = require('./damageScanner');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 920,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#ffffff',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // PureMac behavior: Hide window instead of quitting when user closes it, staying active in Menu Bar
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  setupTray(mainWindow);

  app.on('activate', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  app.isQuitting = true;
  destroyTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handler Registrations

// 1. Live System Monitor & Metrics
ipcMain.handle('get-system-metrics', async () => {
  return await getLiveSystemHealth();
});

// 2. Smart System & Developer Scanner
ipcMain.handle('scan-system', async () => {
  return await scanSystem((progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('scan-progress', progress);
    }
  });
});

ipcMain.handle('clean-system', async (event, { items, options }) => {
  const result = await cleanSystem(items, options, (progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('clean-progress', progress);
    }
  });
  if (result.success && !options?.dryRun && result.cleanedBytes > 0) {
    await recordHistoryEntry({
      type: 'Smart Clean',
      bytesReclaimed: result.cleanedBytes,
      itemCount: result.cleanedCount,
      details: `${result.cleanedCount} items cleaned across system and developer caches`
    });
  }
  return result;
});

// 3. App Uninstaller & Leftover Cleaner
ipcMain.handle('scan-apps', async () => {
  return await scanInstalledApps((progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('apps-progress', progress);
    }
  });
});

ipcMain.handle('uninstall-app', async (event, { appPath, associatedFiles, options }) => {
  const res = await uninstallApp(appPath, associatedFiles, options);
  if (res.success) {
    await recordHistoryEntry({
      type: 'App Uninstall',
      bytesReclaimed: 0,
      itemCount: res.cleanedCount,
      details: `Uninstalled ${path.basename(appPath, '.app')} and ${res.cleanedCount} associated files`
    });
  }
  return res;
});

ipcMain.handle('scan-orphans', async () => {
  return await scanOrphanFiles();
});

ipcMain.handle('clean-orphans', async (event, { orphanPaths, options }) => {
  let cleanedCount = 0;
  for (const p of orphanPaths) {
    const res = await safeDelete(p, options?.useTrash !== false);
    if (res.success && !res.skipped) cleanedCount++;
  }
  if (cleanedCount > 0) {
    await recordHistoryEntry({
      type: 'Orphan Leftovers',
      bytesReclaimed: 0,
      itemCount: cleanedCount,
      details: `Cleaned ${cleanedCount} orphaned leftover files`
    });
  }
  return { success: true, cleanedCount };
});

// 4. Large & Old Files Analyzer
ipcMain.handle('scan-large-files', async (event, options) => {
  return await scanLargeAndOldFiles(options);
});

ipcMain.handle('delete-large-files', async (event, { filePaths, options }) => {
  return await deleteLargeFiles(filePaths, options);
});

// 5. System Optimization & Maintenance
ipcMain.handle('get-optimization-tasks', async () => {
  return getOptimizationTasks();
});

ipcMain.handle('run-optimization', async (event, taskId) => {
  return await runOptimization(taskId);
});

// 5b. System Safety & Damage Scanner
ipcMain.handle('run-damage-scan', async () => {
  return await runDamageScan();
});

// 6. Startup Items Manager
ipcMain.handle('get-startup-items', async () => {
  return await getStartupItems();
});

ipcMain.handle('remove-startup-item', async (event, { itemPath, useTrash }) => {
  return await removeStartupItem(itemPath, useTrash);
});

// 7. Developer Project Artifact Purger (Mole inspired)
ipcMain.handle('scan-project-artifacts', async (event, customPath) => {
  return await scanDevProjects(customPath);
});

ipcMain.handle('purge-artifacts', async (event, { artifactPaths, options }) => {
  return await purgeArtifacts(artifactPaths, options);
});

// 8. Duplicate File Finder (PureMac inspired)
ipcMain.handle('scan-duplicates', async (event, { targetDirs, minSizeBytes }) => {
  return await scanDuplicateFiles(targetDirs, minSizeBytes);
});

ipcMain.handle('remove-duplicates', async (event, { duplicatePaths, options }) => {
  const res = await removeDuplicates(duplicatePaths, options);
  if (res.success && res.cleanedCount > 0) {
    await recordHistoryEntry({
      type: 'Duplicate Files',
      bytesReclaimed: 0,
      itemCount: res.cleanedCount,
      details: `Removed ${res.cleanedCount} verified duplicate files`
    });
  }
  return res;
});

// 9. App Localization Slimmer (Mole mo slim)
ipcMain.handle('scan-slimmable-apps', async () => {
  return await scanSlimmableApps();
});

ipcMain.handle('slim-app', async (event, { localePaths, options }) => {
  const res = await slimApp(localePaths, options);
  if (res.success && res.cleanedCount > 0) {
    await recordHistoryEntry({
      type: 'App Slimmer',
      bytesReclaimed: 0,
      itemCount: res.cleanedCount,
      details: `Removed ${res.cleanedCount} unneeded language localization files`
    });
  }
  return res;
});

// 10. Installer Package Cleaner (Mole mo installer)
ipcMain.handle('scan-installers', async () => {
  return await scanInstallers();
});

ipcMain.handle('clean-installers', async (event, { installerPaths, options }) => {
  const res = await cleanInstallers(installerPaths, options);
  if (res.success && res.cleanedCount > 0) {
    await recordHistoryEntry({
      type: 'Installers Clean',
      bytesReclaimed: 0,
      itemCount: res.cleanedCount,
      details: `Removed ${res.cleanedCount} leftover installer packages (.dmg/.pkg)`
    });
  }
  return res;
});

// 11. Cleanup History & Audit Log (Mole mo history)
ipcMain.handle('get-history', async () => {
  return await getHistory();
});

ipcMain.handle('clear-history', async () => {
  return await clearHistory();
});

// 12. Settings, Preferences & Whitelist (PureMac Settings)
ipcMain.handle('get-config', async () => {
  return await getConfig();
});

ipcMain.handle('update-config', async (event, updates) => {
  return await updateConfig(updates);
});

// 12b. Scheduled Clean LaunchAgent (PureMac parity)
ipcMain.handle('get-schedule-status', async () => {
  return await getScheduleStatus();
});

ipcMain.handle('configure-schedule', async (event, frequency) => {
  return await configureSchedule(frequency);
});

// 13. System Utilities (Finder, URLs, Dialogs)
ipcMain.handle('select-directory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Directory to Scan for Large & Old Files',
    properties: ['openDirectory']
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('reveal-in-finder', async (event, targetPath) => {
  shell.showItemInFolder(targetPath);
  return { success: true };
});

ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
  return { success: true };
});
