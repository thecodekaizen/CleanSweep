const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const os = require('os');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 640,
    minWidth: 800,
    minHeight: 500,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#ffffff', // Light mode default, CSS handles dark mode
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

// Recursively get directory size, skipping inaccessible files
async function getDirSize(dirPath) {
  let size = 0;
  try {
    const files = await readdir(dirPath, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dirPath, file.name);
      try {
        if (file.isDirectory()) {
          size += await getDirSize(fullPath);
        } else {
          const fileStat = await stat(fullPath);
          size += fileStat.size;
        }
      } catch (err) {
        // Skip inaccessible individual files
      }
    }
  } catch (error) {
    // Skip entire directory if inaccessible (e.g. EACCES permissions)
  }
  return size;
}

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// IPC Handlers
ipcMain.handle('scan-system', async () => {
  const homeDir = os.homedir();
  const cacheDir = path.join(homeDir, 'Library', 'Caches');
  const logsDir = path.join(homeDir, 'Library', 'Logs');
  const trashDir = path.join(homeDir, '.Trash');

  // Slight simulated delay to let the UI breathe
  await new Promise(res => setTimeout(res, 800));

  const [cacheSize, logsSize, trashSize] = await Promise.all([
    getDirSize(cacheDir),
    getDirSize(logsDir),
    getDirSize(trashDir)
  ]);

  const totalBytes = cacheSize + logsSize + trashSize;

  return {
    items: [
      { id: 'caches', name: 'Application Caches', sizeBytes: cacheSize, sizeFormatted: formatBytes(cacheSize), path: cacheDir },
      { id: 'logs', name: 'System Logs', sizeBytes: logsSize, sizeFormatted: formatBytes(logsSize), path: logsDir },
      { id: 'trash', name: 'Trash Bin', sizeBytes: trashSize, sizeFormatted: formatBytes(trashSize), path: trashDir }
    ],
    totalBytes,
    totalFormatted: formatBytes(totalBytes)
  };
});

ipcMain.handle('clean-system', async (event, itemsToClean) => {
  let cleanedCount = 0;
  let skippedCount = 0;

  for (const item of itemsToClean) {
    try {
      const files = await readdir(item.path);
      for (const file of files) {
        const fullPath = path.join(item.path, file);
        try {
          // Permanently delete the file/folder to actually free up space
          await fs.promises.rm(fullPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
          cleanedCount++;
        } catch (e) {
          // Ignore files that cannot be deleted (permission issues, protected by SIP, or locked in use by active apps)
          skippedCount++;
        }
      }
    } catch (e) {
      skippedCount++;
    }
  }

  console.log(`[Clean Completed] Successfully deleted: ${cleanedCount} item(s) | Skipped (in use or protected): ${skippedCount} item(s)`);

  return {
    success: true,
    cleanedCount,
    skippedCount,
    message: `Successfully cleaned ${cleanedCount} item(s).`
  };
});

