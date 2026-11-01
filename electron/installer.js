const fs = require('fs');
const path = require('path');
const os = require('os');
const { promisify } = require('util');
const { formatBytes, pathExists, safeDelete } = require('./utils');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const INSTALLER_EXTENSIONS = new Set([
  '.dmg',
  '.pkg',
  '.mpkg',
  '.iso'
]);

async function scanInstallers(customDirs = null) {
  const home = os.homedir();
  const defaultDirs = [
    path.join(home, 'Downloads'),
    path.join(home, 'Desktop'),
    path.join(home, 'Documents')
  ];

  const targetDirs = customDirs 
    ? (Array.isArray(customDirs) ? customDirs : [customDirs]) 
    : defaultDirs;

  const installers = [];

  for (const dir of targetDirs) {
    if (!await pathExists(dir)) continue;

    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;

        const ext = path.extname(entry.name).toLowerCase();
        if (INSTALLER_EXTENSIONS.has(ext)) {
          const fullPath = path.join(dir, entry.name);
          try {
            const fileStat = await stat(fullPath);
            installers.push({
              name: entry.name,
              path: fullPath,
              extension: ext,
              sizeBytes: fileStat.size,
              sizeFormatted: formatBytes(fileStat.size),
              modifiedAt: fileStat.mtime.toISOString(),
              ageDays: Math.floor((Date.now() - fileStat.mtimeMs) / (1000 * 60 * 60 * 24))
            });
          } catch {
            // Skip unreadable file
          }
        }
      }
    } catch {
      // Skip unreadable directory
    }
  }

  // Sort descending by size
  installers.sort((a, b) => b.sizeBytes - a.sizeBytes);

  const totalBytes = installers.reduce((sum, i) => sum + i.sizeBytes, 0);

  return {
    installers,
    totalCount: installers.length,
    totalBytes,
    totalFormatted: formatBytes(totalBytes)
  };
}

async function cleanInstallers(installerPaths, options = { useTrash: true }) {
  let cleanedCount = 0;
  let skippedCount = 0;

  for (const p of installerPaths) {
    const res = await safeDelete(p, options.useTrash);
    if (res.success && !res.skipped) cleanedCount++;
    else skippedCount++;
  }

  return {
    success: true,
    cleanedCount,
    skippedCount,
    message: `Cleaned ${cleanedCount} installer package(s).`
  };
}

module.exports = {
  scanInstallers,
  cleanInstallers
};
