const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { scanSystem, cleanSystem } = require('./scanner');
const { scanInstalledApps, scanOrphanFiles, uninstallApp } = require('./uninstaller');
const { scanLargeAndOldFiles, deleteLargeFiles } = require('./analyzer');
const { getOptimizationTasks, runOptimization } = require('./optimizer');
const { getLiveSystemHealth } = require('./monitor');
const { getStartupItems, removeStartupItem } = require('./startup');
const { scanDevProjects, purgeArtifacts } = require('./purger');
const { scanDuplicateFiles, removeDuplicates } = require('./duplicates');
const { safeDelete } = require('./utils');

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
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
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
  return await cleanSystem(items, options, (progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('clean-progress', progress);
    }
  });
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
  return await uninstallApp(appPath, associatedFiles, options);
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
  return await removeDuplicates(duplicatePaths, options);
});

// 9. System Utilities (Finder, URLs)
ipcMain.handle('reveal-in-finder', async (event, targetPath) => {
  shell.showItemInFolder(targetPath);
  return { success: true };
});

ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
  return { success: true };
});
