const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');
let electronApp = null;
try {
  if (process.versions && process.versions.electron) {
    const electron = require('electron');
    electronApp = electron.app;
  }
} catch {
  // Pure Node CLI
}
const { formatBytes, pathExists, getPathSize, safeDelete } = require('./utils');

const execFileAsync = promisify(execFile);
const readdir = promisify(fs.readdir);

// Read app plist using plutil
async function getAppMetadata(appPath) {
  const plistPath = path.join(appPath, 'Contents', 'Info.plist');
  const baseName = path.basename(appPath, '.app');

  let bundleId = null;
  let version = 'Unknown';
  let displayName = baseName;

  try {
    const { stdout } = await execFileAsync('plutil', ['-convert', 'json', '-o', '-', plistPath]);
    const info = JSON.parse(stdout);
    bundleId = info.CFBundleIdentifier || null;
    version = info.CFBundleShortVersionString || info.CFBundleVersion || 'Unknown';
    displayName = info.CFBundleDisplayName || info.CFBundleName || baseName;
  } catch {
    // If plutil fails, fallback to folder name
  }

  // Get native icon
  let iconDataUrl = null;
  try {
    if (electronApp && electronApp.getFileIcon) {
      const nativeIcon = await electronApp.getFileIcon(appPath, { size: 'normal' });
      iconDataUrl = nativeIcon.toDataURL();
    }
  } catch {
    // Skip if icon cannot be loaded
  }

  return {
    displayName,
    bundleId,
    version,
    iconDataUrl
  };
}

// Search for associated files of an app across standard macOS locations
async function findAssociatedFiles(appName, bundleId) {
  const home = os.homedir();
  const searchLocations = [
    { type: 'Application Support', dir: path.join(home, 'Library', 'Application Support') },
    { type: 'Caches', dir: path.join(home, 'Library', 'Caches') },
    { type: 'Preferences', dir: path.join(home, 'Library', 'Preferences') },
    { type: 'Saved State', dir: path.join(home, 'Library', 'Saved Application State') },
    { type: 'Containers', dir: path.join(home, 'Library', 'Containers') },
    { type: 'Group Containers', dir: path.join(home, 'Library', 'Group Containers') },
    { type: 'Logs', dir: path.join(home, 'Library', 'Logs') },
    { type: 'WebKit', dir: path.join(home, 'Library', 'WebKit') },
    { type: 'HTTPStorages', dir: path.join(home, 'Library', 'HTTPStorages') },
    { type: 'LaunchAgents', dir: path.join(home, 'Library', 'LaunchAgents') }
  ];

  const matchedFiles = [];
  const queryStrings = new Set();
  if (bundleId) queryStrings.add(bundleId.toLowerCase());
  if (appName && appName.length > 2) queryStrings.add(appName.toLowerCase());

  for (const loc of searchLocations) {
    if (!await pathExists(loc.dir)) continue;

    try {
      const entries = await readdir(loc.dir);
      for (const entry of entries) {
        const lowerEntry = entry.toLowerCase();
        let matched = false;

        for (const q of queryStrings) {
          if (lowerEntry === q || lowerEntry === `${q}.plist` || lowerEntry === `${q}.savedstate` || lowerEntry.includes(q)) {
            // Avoid matching common short substrings or system prefixes
            if (q.length < 4 && !lowerEntry.startsWith(q)) continue;
            matched = true;
            break;
          }
        }

        if (matched) {
          const fullPath = path.join(loc.dir, entry);
          const sizeBytes = await getPathSize(fullPath);
          matchedFiles.push({
            name: entry,
            type: loc.type,
            path: fullPath,
            sizeBytes,
            sizeFormatted: formatBytes(sizeBytes)
          });
        }
      }
    } catch {
      // Skip unreadable directories
    }
  }

  return matchedFiles;
}

// Scan installed applications in /Applications and ~/Applications
async function scanInstalledApps(onProgress = null) {
  const appDirs = [
    '/Applications',
    path.join(os.homedir(), 'Applications')
  ];

  const appPaths = [];
  for (const dir of appDirs) {
    if (!await pathExists(dir)) continue;
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.endsWith('.app')) {
          appPaths.push(path.join(dir, entry.name));
        }
      }
    } catch {
      // Skip unreadable directory
    }
  }

  const apps = [];
  let index = 0;

  for (const appPath of appPaths) {
    index++;
    const appBaseName = path.basename(appPath, '.app');

    if (onProgress) {
      onProgress({
        current: index,
        total: appPaths.length,
        item: appBaseName
      });
    }

    try {
      const meta = await getAppMetadata(appPath);
      const appSize = await getPathSize(appPath);
      const associatedFiles = await findAssociatedFiles(meta.displayName, meta.bundleId);
      const associatedBytes = associatedFiles.reduce((sum, f) => sum + f.sizeBytes, 0);
      const totalBytes = appSize + associatedBytes;

      apps.push({
        id: meta.bundleId || appBaseName,
        name: meta.displayName,
        bundleId: meta.bundleId,
        version: meta.version,
        appPath,
        appSize,
        appSizeFormatted: formatBytes(appSize),
        iconDataUrl: meta.iconDataUrl,
        associatedFiles,
        associatedBytes,
        associatedFormatted: formatBytes(associatedBytes),
        totalBytes,
        totalFormatted: formatBytes(totalBytes),
        isAppleSystemApp: appPath.startsWith('/System') || (meta.bundleId && meta.bundleId.startsWith('com.apple.'))
      });
    } catch {
      // Skip corrupted app bundle
    }
  }

  // Sort descending by total size
  apps.sort((a, b) => b.totalBytes - a.totalBytes);

  return {
    apps,
    totalCount: apps.length,
    totalBytes: apps.reduce((sum, a) => sum + a.totalBytes, 0),
    totalFormatted: formatBytes(apps.reduce((sum, a) => sum + a.totalBytes, 0))
  };
}

// Find orphaned preferences, caches, and leftover application support files
async function scanOrphanFiles() {
  const home = os.homedir();
  const installedAppMeta = await scanInstalledApps();
  const knownBundleIds = new Set(installedAppMeta.apps.map(a => (a.bundleId || '').toLowerCase()).filter(Boolean));
  const knownAppNames = new Set(installedAppMeta.apps.map(a => a.name.toLowerCase()));

  const searchLocations = [
    { type: 'Application Support', dir: path.join(home, 'Library', 'Application Support') },
    { type: 'Preferences', dir: path.join(home, 'Library', 'Preferences') },
    { type: 'Caches', dir: path.join(home, 'Library', 'Caches') },
    { type: 'Containers', dir: path.join(home, 'Library', 'Containers') },
    { type: 'Saved State', dir: path.join(home, 'Library', 'Saved Application State') }
  ];

  const orphans = [];
  const systemIgnoreList = new Set([
    'com.apple', 'apple', 'icloud', 'finder', 'dock', 'safari', 'system',
    'quicklook', 'spotlight', 'siri', 'addressbook', 'messages', 'photos'
  ]);

  for (const loc of searchLocations) {
    if (!await pathExists(loc.dir)) continue;

    try {
      const entries = await readdir(loc.dir);
      for (const entry of entries) {
        const lower = entry.toLowerCase();

        // Skip Apple system entries and default OS directories
        let isSystem = false;
        for (const sys of systemIgnoreList) {
          if (lower.startsWith(sys)) {
            isSystem = true;
            break;
          }
        }
        if (isSystem) continue;

        // Strip extensions for matching
        const cleanName = lower.replace(/\.(plist|savedstate|saved_state)$/, '');

        // If not in known apps, check if it's an orphan candidate
        let isKnown = false;
        for (const bId of knownBundleIds) {
          if (cleanName === bId || cleanName.includes(bId)) {
            isKnown = true;
            break;
          }
        }
        if (!isKnown) {
          for (const name of knownAppNames) {
            if (cleanName === name || cleanName.includes(name)) {
              isKnown = true;
              break;
            }
          }
        }

        if (!isKnown) {
          const fullPath = path.join(loc.dir, entry);
          const sizeBytes = await getPathSize(fullPath);
          if (sizeBytes > 1024) { // Only show orphans with at least 1KB
            orphans.push({
              id: `${loc.type}:${entry}`,
              name: entry,
              type: loc.type,
              path: fullPath,
              sizeBytes,
              sizeFormatted: formatBytes(sizeBytes)
            });
          }
        }
      }
    } catch {
      // Skip unreadable
    }
  }

  // Sort descending by size
  orphans.sort((a, b) => b.sizeBytes - a.sizeBytes);

  const totalBytes = orphans.reduce((sum, o) => sum + o.sizeBytes, 0);
  return {
    orphans,
    totalCount: orphans.length,
    totalBytes,
    totalFormatted: formatBytes(totalBytes)
  };
}

// Cleanly uninstall an app and remove its associated files
async function uninstallApp(appPath, associatedPaths = [], options = { useTrash: true }) {
  let cleanedCount = 0;
  let skippedCount = 0;

  // 1. Delete associated files first
  for (const filePath of associatedPaths) {
    const res = await safeDelete(filePath, options.useTrash);
    if (res.success && !res.skipped) cleanedCount++;
    else skippedCount++;
  }

  // 2. Delete main app bundle
  if (appPath) {
    const res = await safeDelete(appPath, options.useTrash);
    if (res.success && !res.skipped) cleanedCount++;
    else skippedCount++;
  }

  return {
    success: true,
    cleanedCount,
    skippedCount,
    message: `Application and ${cleanedCount} associated files removed.`
  };
}

module.exports = {
  scanInstalledApps,
  scanOrphanFiles,
  uninstallApp
};
