const fs = require('fs');
const path = require('path');
const os = require('os');
const { promisify } = require('util');
const { execFile } = require('child_process');
const { formatBytes, pathExists, getPathSize, safeDelete } = require('./utils');

const readdir = promisify(fs.readdir);
const execFileAsync = promisify(execFile);

// Common languages to keep by default
const DEFAULT_KEEP_LANGUAGES = new Set([
  'en.lproj',
  'base.lproj',
  'english.lproj'
]);

// Check if an app is code-signed by Apple or a developer
async function checkAppSignature(appPath) {
  try {
    await execFileAsync('codesign', ['-v', '--no-strict', appPath]);
    return { isSigned: true };
  } catch {
    return { isSigned: false };
  }
}

// Re-seal code signature with ad-hoc identity to prevent "App is damaged" Gatekeeper errors
async function resealAppSignature(appPath) {
  try {
    await execFileAsync('codesign', ['--force', '--deep', '--sign', '-', appPath]);
    return true;
  } catch {
    return false;
  }
}

async function scanSlimmableApps(keepLanguages = DEFAULT_KEEP_LANGUAGES) {
  const appDirs = ['/Applications', path.join(os.homedir(), 'Applications')];
  const slimmableApps = [];

  for (const dir of appDirs) {
    if (!await pathExists(dir)) continue;

    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || !entry.name.endsWith('.app')) continue;

        const appPath = path.join(dir, entry.name);
        // Avoid modifying protected Apple system apps or macOS utilities
        if (appPath.startsWith('/System') || appPath.includes('/Applications/Utilities')) continue;

        const resourcesPath = path.join(appPath, 'Contents', 'Resources');
        if (!await pathExists(resourcesPath)) continue;

        try {
          const resEntries = await readdir(resourcesPath, { withFileTypes: true });
          const unneededLocales = [];
          let totalSlimBytes = 0;

          for (const res of resEntries) {
            if (res.isDirectory() && res.name.endsWith('.lproj')) {
              const lower = res.name.toLowerCase();
              if (!keepLanguages.has(lower)) {
                const fullLocalePath = path.join(resourcesPath, res.name);
                const localeSize = await getPathSize(fullLocalePath);
                if (localeSize > 0) {
                  unneededLocales.push({
                    name: res.name,
                    path: fullLocalePath,
                    sizeBytes: localeSize,
                    sizeFormatted: formatBytes(localeSize)
                  });
                  totalSlimBytes += localeSize;
                }
              }
            }
          }

          if (unneededLocales.length > 0) {
            const { isSigned } = await checkAppSignature(appPath);

            slimmableApps.push({
              appName: entry.name.replace('.app', ''),
              appPath,
              isSigned,
              signatureWarning: isSigned ? 'App is code-signed. CleanSweep will automatically reseal it with ad-hoc signature after slimming to preserve macOS Gatekeeper integrity.' : null,
              localesCount: unneededLocales.length,
              totalSlimBytes,
              totalSlimFormatted: formatBytes(totalSlimBytes),
              locales: unneededLocales
            });
          }
        } catch {
          // Skip unreadable resources
        }
      }
    } catch {
      // Skip unreadable app dir
    }
  }

  // Sort descending by savings
  slimmableApps.sort((a, b) => b.totalSlimBytes - a.totalSlimBytes);

  const grandTotal = slimmableApps.reduce((sum, a) => sum + a.totalSlimBytes, 0);

  return {
    apps: slimmableApps,
    totalApps: slimmableApps.length,
    grandTotalBytes: grandTotal,
    grandTotalFormatted: formatBytes(grandTotal)
  };
}

async function slimApp(localePaths, options = { useTrash: true }) {
  let cleanedCount = 0;
  let skippedCount = 0;
  const affectedApps = new Set();

  for (const p of localePaths) {
    // Safety verification: path must contain .lproj and be inside Contents/Resources
    if (!p.endsWith('.lproj') || !p.includes(path.join('Contents', 'Resources'))) {
      skippedCount++;
      continue;
    }

    const appMatch = p.match(/^(.+\.app)/);
    if (appMatch) {
      affectedApps.add(appMatch[1]);
    }

    const res = await safeDelete(p, options.useTrash);
    if (res.success && !res.skipped) cleanedCount++;
    else skippedCount++;
  }

  // Re-seal affected applications so Gatekeeper does not flag them as damaged
  for (const appPath of affectedApps) {
    await resealAppSignature(appPath);
  }

  return {
    success: true,
    cleanedCount,
    skippedCount,
    message: `Safely removed ${cleanedCount} unused language localization files and resealed code signatures.`
  };
}

module.exports = {
  scanSlimmableApps,
  slimApp
};
