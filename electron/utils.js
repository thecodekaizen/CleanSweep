const fs = require('fs');
const path = require('path');
const os = require('os');
const { promisify } = require('util');
const { execFile } = require('child_process');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const lstat = promisify(fs.lstat);
const execFileAsync = promisify(execFile);

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

// Critical system root paths that must NEVER be deleted under any circumstances
const SYSTEM_PROTECTED_ROOTS = new Set([
  '/',
  '/bin',
  '/sbin',
  '/usr',
  '/usr/bin',
  '/usr/sbin',
  '/usr/lib',
  '/usr/local',
  '/System',
  '/System/Applications',
  '/System/Library',
  '/Library',
  '/Applications',
  '/Applications/Utilities',
  '/Users',
  '/var',
  '/etc',
  '/private',
  '/private/var',
  '/private/etc',
  '/Volumes',
  '/opt',
  '/dev'
]);

// Checks if a target path is protected by macOS system rules or user whitelist
async function isProtectedPath(targetPath) {
  if (!targetPath || typeof targetPath !== 'string') return true;

  const resolved = path.resolve(targetPath);
  const home = os.homedir();

  // 1. Root or exact critical system directories
  if (SYSTEM_PROTECTED_ROOTS.has(resolved)) return true;

  // 2. Anything within /System directory hierarchy
  if (resolved.startsWith('/System/') || resolved === '/System') return true;

  // 3. User home directory itself
  if (resolved === home) return true;

  // 4. Primary user top-level library and desktop folders
  const userPrimaryDirs = [
    path.join(home, 'Desktop'),
    path.join(home, 'Documents'),
    path.join(home, 'Downloads'),
    path.join(home, 'Library'),
    path.join(home, 'Movies'),
    path.join(home, 'Music'),
    path.join(home, 'Pictures')
  ];
  if (userPrimaryDirs.includes(resolved)) return true;

  // 5. Critical system infrastructure inside user Library
  const criticalSubdirs = [
    path.join(home, 'Library', 'Keychains'),
    path.join(home, 'Library', 'Accounts'),
    path.join(home, 'Library', 'Mobile Documents'),
    path.join(home, 'Library', 'CloudStorage'),
    path.join(home, 'Library', 'IdentityServices'),
    path.join(home, 'Library', 'Preferences'),
    path.join(home, 'Library', 'Application Support')
  ];
  if (criticalSubdirs.includes(resolved)) return true;

  // 6. Sub-paths of cloud storage or keychains
  if (resolved.startsWith(path.join(home, 'Library', 'Mobile Documents') + path.sep)) return true;
  if (resolved.startsWith(path.join(home, 'Library', 'CloudStorage') + path.sep)) return true;
  if (resolved.startsWith(path.join(home, 'Library', 'Keychains') + path.sep)) return true;

  // 7. Check user-configured whitelist in config.json
  try {
    const { isPathWhitelisted } = require('./config');
    if (typeof isPathWhitelisted === 'function') {
      const whitelisted = await isPathWhitelisted(resolved);
      if (whitelisted) return true;
    }
  } catch {
    // Config not loaded or circular require safely ignored
  }

  return false;
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

// Delete item safely (Trash by default, or permanent rm if specified), protected against system paths and whitelisted items
async function safeDelete(targetPath, useTrash = true) {
  if (!targetPath || typeof targetPath !== 'string') {
    return { success: false, skipped: true, error: 'Invalid target path' };
  }

  // Safety Shield: Block any deletion targeting system roots, user home, or whitelisted directories
  if (await isProtectedPath(targetPath)) {
    return {
      success: false,
      skipped: true,
      protected: true,
      error: `Deletion blocked: '${targetPath}' is protected by macOS safety policy or user whitelist.`
    };
  }

  if (!await pathExists(targetPath)) return { success: true, skipped: true };

  if (useTrash) {
    if (electronShell && electronShell.trashItem) {
      try {
        await electronShell.trashItem(targetPath);
        return { success: true, method: 'trash' };
      } catch {
        // Fallback to native AppleScript
      }
    }

    // CLI AppleScript native trash fallback without shell injection
    try {
      const appleScript = `tell application "Finder" to delete POSIX file "${targetPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
      await execFileAsync('osascript', ['-e', appleScript]);
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
  isProtectedPath,
  safeDelete
};
