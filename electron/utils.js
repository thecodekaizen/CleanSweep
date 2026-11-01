const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const lstat = promisify(fs.lstat);
const execAsync = promisify(exec);

// Safely obtain Electron modules if running inside Electron runtime
let electronShell = null;
try {
  if (process.versions && process.versions.electron) {
    const electron = require('electron');
    electronShell = electron.shell;
  }
} catch {
  // Running in pure Node CLI context
}

function formatBytes(bytes, decimals = 2) {
  if (!+bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

async function pathExists(p) {
  try {
    await fs.promises.access(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// Recursively get directory size, skipping symlinks and handling APFS sparse blocks
async function getDirSize(dirPath, maxDepth = 10, currentDepth = 0) {
  if (currentDepth > maxDepth) return 0;
  let size = 0;

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const fullPath = path.join(dirPath, entry.name);

      try {
        if (entry.isDirectory()) {
          size += await getDirSize(fullPath, maxDepth, currentDepth + 1);
        } else if (entry.isFile()) {
          const fileStat = await stat(fullPath);
          const actualSize = fileStat.blocks ? Math.min(fileStat.size, fileStat.blocks * 512) : fileStat.size;
          size += actualSize;
        }
      } catch {
        // Skip inaccessible individual files
      }
    }
  } catch {
    // Skip unreadable directories
  }

  return size;
}

// Get file or directory size directly
async function getPathSize(itemPath) {
  try {
    const fileStat = await lstat(itemPath);
    if (fileStat.isSymbolicLink()) return 0;
    if (fileStat.isDirectory()) {
      return await getDirSize(itemPath);
    }
    return fileStat.blocks ? Math.min(fileStat.size, fileStat.blocks * 512) : fileStat.size;
  } catch {
    return 0;
  }
}

// Delete item safely (Trash by default, or permanent rm if specified)
async function safeDelete(targetPath, useTrash = true) {
  if (!await pathExists(targetPath)) return { success: true, skipped: true };

  if (useTrash) {
    if (electronShell && electronShell.trashItem) {
      try {
        await electronShell.trashItem(targetPath);
        return { success: true, method: 'trash' };
      } catch {
        // Fallback to AppleScript or rm
      }
    }

    // CLI AppleScript native trash fallback
    try {
      const escaped = targetPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      await execAsync(`osascript -e 'tell application "Finder" to delete POSIX file "${escaped}"'`);
      return { success: true, method: 'trash' };
    } catch {
      // If AppleScript fails, fallback to rm
      try {
        await fs.promises.rm(targetPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        return { success: true, method: 'permanent' };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  } else {
    try {
      await fs.promises.rm(targetPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      return { success: true, method: 'permanent' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = {
  formatBytes,
  pathExists,
  getDirSize,
  getPathSize,
  safeDelete
};
