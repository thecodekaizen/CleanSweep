const path = require('path');
const os = require('os');
const fs = require('fs');
const { formatBytes, pathExists, getDirSize, safeDelete } = require('./utils');

function getTargets() {
  const home = os.homedir();

  return [
    // 1. System & App Junk
    {
      id: 'user-caches',
      name: 'User Application Caches',
      category: 'System & App Junk',
      description: 'Temporary application caches and webkit data in user Library',
      path: path.join(home, 'Library', 'Caches'),
      defaultChecked: true,
      alwaysShow: true,
      cleanChildrenOnly: true
    },
    {
      id: 'user-logs',
      name: 'User Application Logs',
      category: 'System & App Junk',
      description: 'System log files, debug transcripts, and diagnostic crash reports',
      path: path.join(home, 'Library', 'Logs'),
      defaultChecked: true,
      alwaysShow: true,
      cleanChildrenOnly: true
    },
    {
      id: 'diagnostic-reports',
      name: 'Diagnostic & Crash Reports',
      category: 'System & App Junk',
      description: 'macOS crash reports (.ips and .crash files) and spindumps',
      path: path.join(home, 'Library', 'Logs', 'DiagnosticReports'),
      defaultChecked: true,
      cleanChildrenOnly: true
    },
    {
      id: 'quicklook-cache',
      name: 'QuickLook Thumbnail Cache',
      category: 'System & App Junk',
      description: 'Cached preview thumbnails generated for Finder and QuickLook',
      path: path.join(home, 'Library', 'Caches', 'com.apple.QuickLook.thumbnailcache'),
      defaultChecked: true
    },
    {
      id: 'trash-bin',
      name: 'User Trash Bin',
      category: 'System & App Junk',
      description: 'Deleted files waiting to be permanently removed from your Trash',
      path: path.join(home, '.Trash'),
      defaultChecked: true,
      alwaysShow: true,
      cleanChildrenOnly: true
    },

    // 2. Browsers & Web Data
    {
      id: 'chrome-cache',
      name: 'Google Chrome Cache',
      category: 'Browsers',
      description: 'Cached web files, media, and script caches from Chrome',
      path: path.join(home, 'Library', 'Caches', 'Google', 'Chrome'),
      defaultChecked: true
    },
    {
      id: 'safari-cache',
      name: 'Safari Web Cache',
      category: 'Browsers',
      description: 'Cached page resources and media from Safari browser',
      path: path.join(home, 'Library', 'Caches', 'com.apple.Safari'),
      defaultChecked: true
    },
    {
      id: 'arc-cache',
      name: 'Arc Browser Cache',
      category: 'Browsers',
      description: 'Temporary web and browser storage from Arc',
      path: path.join(home, 'Library', 'Caches', 'company.thebrowser.Browser'),
      defaultChecked: true
    },
    {
      id: 'brave-cache',
      name: 'Brave Browser Cache',
      category: 'Browsers',
      description: 'Cached websites, offline assets, and network data for Brave',
      path: path.join(home, 'Library', 'Caches', 'BraveSoftware', 'Brave-Browser'),
      defaultChecked: true
    },
    {
      id: 'edge-cache',
      name: 'Microsoft Edge Cache',
      category: 'Browsers',
      description: 'Cached media, assets, and temporary browser files from Edge',
      path: path.join(home, 'Library', 'Caches', 'Microsoft Edge'),
      defaultChecked: true
    },
    {
      id: 'firefox-cache',
      name: 'Firefox Cache',
      category: 'Browsers',
      description: 'HTTP web cache and startup caches from Firefox',
      path: path.join(home, 'Library', 'Caches', 'Firefox'),
      defaultChecked: true
    },

    // 3. Developer & Build Artifacts (Mole inspired)
    {
      id: 'xcode-derived',
      name: 'Xcode DerivedData',
      category: 'Developer & Build',
      description: 'Intermediate build artifacts, indexing caches, and compiler files',
      path: path.join(home, 'Library', 'Developer', 'Xcode', 'DerivedData'),
      defaultChecked: true
    },
    {
      id: 'xcode-device-support',
      name: 'iOS Device Support Symbols',
      category: 'Developer & Build',
      description: 'Debugging symbols extracted for connected physical iOS devices',
      path: path.join(home, 'Library', 'Developer', 'Xcode', 'iOS DeviceSupport'),
      defaultChecked: true
    },
    {
      id: 'xcode-archives',
      name: 'Xcode Archives',
      category: 'Developer & Build',
      description: 'Archived app bundles (.xcarchive) stored during App Store distribution',
      path: path.join(home, 'Library', 'Developer', 'Xcode', 'Archives'),
      defaultChecked: false
    },
    {
      id: 'xcode-simulators-caches',
      name: 'CoreSimulator Caches',
      category: 'Developer & Build',
      description: 'Cached runtime files and temporary data from iOS/macOS simulators',
      path: path.join(home, 'Library', 'Developer', 'CoreSimulator', 'Caches'),
      defaultChecked: true
    },
    {
      id: 'homebrew-cache',
      name: 'Homebrew Downloads & Bottles',
      category: 'Developer & Build',
      description: 'Downloaded bottles, formula archives, and git cache from Homebrew',
      path: path.join(home, 'Library', 'Caches', 'Homebrew'),
      defaultChecked: true
    },
    {
      id: 'npm-cache',
      name: 'npm Cache (_cacache)',
      category: 'Developer & Build',
      description: 'Content-addressable download cache for npm packages',
      path: path.join(home, '.npm', '_cacache'),
      defaultChecked: true
    },
    {
      id: 'yarn-cache',
      name: 'Yarn Cache',
      category: 'Developer & Build',
      description: 'Global cache of downloaded Yarn package tarballs',
      path: path.join(home, 'Library', 'Caches', 'Yarn'),
      defaultChecked: true
    },
    {
      id: 'pnpm-cache',
      name: 'pnpm Store Cache',
      category: 'Developer & Build',
      description: 'pnpm package manager metadata and download store cache',
      path: path.join(home, 'Library', 'Caches', 'pnpm'),
      defaultChecked: true
    },
    {
      id: 'bun-cache',
      name: 'Bun Package Cache',
      category: 'Developer & Build',
      description: 'Global download and package cache for Bun runtime',
      path: path.join(home, '.bun', 'install', 'cache'),
      defaultChecked: true
    },
    {
      id: 'pip-cache',
      name: 'Pip / Python Cache',
      category: 'Developer & Build',
      description: 'Cached Python wheel packages and HTTP responses from PyPI',
      path: path.join(home, 'Library', 'Caches', 'pip'),
      defaultChecked: true
    },
    {
      id: 'poetry-cache',
      name: 'Poetry Cache',
      category: 'Developer & Build',
      description: 'Virtual environment and wheel artifact cache for Poetry',
      path: path.join(home, 'Library', 'Caches', 'pypoetry'),
      defaultChecked: true
    },
    {
      id: 'uv-cache',
      name: 'uv Python Cache',
      category: 'Developer & Build',
      description: 'Extremely fast Python package cache managed by uv',
      path: path.join(home, '.cache', 'uv'),
      defaultChecked: true
    },
    {
      id: 'cargo-cache',
      name: 'Cargo / Rust Registry Cache',
      category: 'Developer & Build',
      description: 'Rust crate tarballs and registry git checkouts in ~/.cargo',
      path: path.join(home, '.cargo', 'registry', 'cache'),
      defaultChecked: true
    },
    {
      id: 'go-build-cache',
      name: 'Go Build Cache',
      category: 'Developer & Build',
      description: 'Compiled package objects and test results from Go',
      path: path.join(home, 'Library', 'Caches', 'go-build'),
      defaultChecked: true
    },
    {
      id: 'gradle-cache',
      name: 'Gradle Cache',
      category: 'Developer & Build',
      description: 'Downloaded dependencies and transform caches from Gradle',
      path: path.join(home, '.gradle', 'caches'),
      defaultChecked: true
    },
    {
      id: 'cocoapods-cache',
      name: 'CocoaPods Cache',
      category: 'Developer & Build',
      description: 'Cached CocoaPod specs and downloaded git repositories',
      path: path.join(home, 'Library', 'Caches', 'CocoaPods'),
      defaultChecked: true
    },
    {
      id: 'vscode-cache',
      name: 'VS Code Cache',
      category: 'Developer & Build',
      description: 'Workspace state, GPU caches, and extension caches for VS Code',
      path: path.join(home, 'Library', 'Caches', 'com.microsoft.VSCode'),
      defaultChecked: true
    },
    {
      id: 'jetbrains-cache',
      name: 'JetBrains IDE Caches',
      category: 'Developer & Build',
      description: 'Project index caches for IntelliJ IDEA, PyCharm, WebStorm, etc.',
      path: path.join(home, 'Library', 'Caches', 'JetBrains'),
      defaultChecked: true
    },

    // 4. AI & Local Model Caches (PureMac inspired)
    {
      id: 'ollama-models',
      name: 'Ollama Local Models',
      category: 'AI & Local Models',
      description: 'Downloaded LLM weights and model blobs managed by Ollama',
      path: path.join(home, '.ollama', 'models'),
      defaultChecked: false
    },
    {
      id: 'lm-studio-cache',
      name: 'LM Studio Cache',
      category: 'AI & Local Models',
      description: 'Downloaded model weights and runtime caches for LM Studio',
      path: path.join(home, '.cache', 'lm-studio'),
      defaultChecked: false
    },
    {
      id: 'huggingface-cache',
      name: 'Hugging Face Hub Cache',
      category: 'AI & Local Models',
      description: 'Pretrained transformers and diffusion models downloaded via huggingface_hub',
      path: path.join(home, '.cache', 'huggingface', 'hub'),
      defaultChecked: false
    },

    // 5. Containers & Virtual Disks
    {
      id: 'docker-data',
      name: 'Docker Desktop Virtual Disk',
      category: 'Containers & Virtual Disks',
      description: 'Docker Desktop container layers, builder cache, and images',
      path: path.join(home, 'Library', 'Containers', 'com.docker.docker', 'Data'),
      defaultChecked: false
    },
    {
      id: 'podman-cache',
      name: 'Podman Machine Storage',
      category: 'Containers & Virtual Disks',
      description: 'Podman machine virtual disk images and cached registries',
      path: path.join(home, '.local', 'share', 'containers', 'storage'),
      defaultChecked: false
    },

    // 6. Backups & Media Downloads
    {
      id: 'ios-backups',
      name: 'iOS / iPadOS Device Backups',
      category: 'Backups & Mail',
      description: 'Local iPhone and iPad device backups made via Finder or iTunes',
      path: path.join(home, 'Library', 'Application Support', 'MobileSync', 'Backup'),
      defaultChecked: false
    },
    {
      id: 'mail-downloads',
      name: 'Apple Mail Downloads',
      category: 'Backups & Mail',
      description: 'Attachments automatically opened and saved by Apple Mail',
      path: path.join(home, 'Library', 'Containers', 'com.apple.mail', 'Data', 'Library', 'Mail Downloads'),
      defaultChecked: true
    }
  ];
}

async function scanSystem(onProgress = null) {
  const targets = getTargets();
  const results = [];
  let processed = 0;

  for (const target of targets) {
    if (onProgress) {
      onProgress({
        current: processed + 1,
        total: targets.length,
        item: target.name
      });
    }

    const exists = await pathExists(target.path);
    let sizeBytes = 0;

    if (exists) {
      sizeBytes = await getDirSize(target.path);
    }

    results.push({
      ...target,
      exists,
      sizeBytes,
      sizeFormatted: formatBytes(sizeBytes)
    });

    processed++;
  }

  // Filter items: show items with data or permanent system anchor items
  const items = results.filter(item => item.sizeBytes > 0 || item.alwaysShow);
  const totalBytes = items.reduce((sum, item) => sum + item.sizeBytes, 0);

  return {
    items,
    totalBytes,
    totalFormatted: formatBytes(totalBytes),
    timestamp: new Date().toISOString()
  };
}

async function cleanSystem(itemsToClean, options = { dryRun: false, useTrash: true }, onProgress = null) {
  let cleanedCount = 0;
  let skippedCount = 0;
  let cleanedBytes = 0;
  const cleanedItemIds = [];

  if (options.dryRun) {
    const totalBytes = itemsToClean.reduce((sum, item) => sum + (item.sizeBytes || 0), 0);
    return {
      success: true,
      dryRun: true,
      cleanedCount: itemsToClean.length,
      skippedCount: 0,
      cleanedBytes: totalBytes,
      cleanedFormatted: formatBytes(totalBytes),
      message: `[Dry Run] Would clean ${itemsToClean.length} items (${formatBytes(totalBytes)}).`
    };
  }

  for (let i = 0; i < itemsToClean.length; i++) {
    const item = itemsToClean[i];
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: itemsToClean.length,
        item: item.name
      });
    }

    try {
      if (item.cleanChildrenOnly) {
        // Only delete contents inside the directory so directory itself persists (e.g. ~/Library/Caches)
        const entries = await fs.promises.readdir(item.path);
        for (const entry of entries) {
          const entryPath = path.join(item.path, entry);
          const res = await safeDelete(entryPath, options.useTrash);
          if (res.success && !res.skipped) {
            cleanedCount++;
          } else {
            skippedCount++;
          }
        }
      } else {
        const res = await safeDelete(item.path, options.useTrash);
        if (res.success && !res.skipped) {
          cleanedCount++;
        } else {
          skippedCount++;
        }
      }
      cleanedBytes += item.sizeBytes || 0;
      cleanedItemIds.push(item.id);
    } catch {
      skippedCount++;
    }
  }

  return {
    success: true,
    cleanedCount,
    skippedCount,
    cleanedBytes,
    cleanedFormatted: formatBytes(cleanedBytes),
    cleanedItemIds,
    message: `Cleaned ${cleanedCount} item(s) (${formatBytes(cleanedBytes)} freed).`
  };
}

module.exports = {
  getTargets,
  scanSystem,
  cleanSystem
};
