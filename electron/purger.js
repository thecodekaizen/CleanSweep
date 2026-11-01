const fs = require('fs');
const path = require('path');
const os = require('os');
const { promisify } = require('util');
const { formatBytes, pathExists, getDirSize, safeDelete, isProtectedPath } = require('./utils');

const readdir = promisify(fs.readdir);

const PURGE_TARGET_NAMES = new Set([
  'node_modules',
  '.next',
  '.nuxt',
  '.svelte-kit',
  'target',
  '.venv',
  'venv',
  '__pycache__',
  '.turbo',
  '.parcel-cache',
  '.gradle',
  '.dart_tool'
]);

// Verify whether an artifact directory is genuinely disposable and belongs to a verified code project
async function isGenuineProjectArtifact(rootDir, artifactName, fullPath) {
  if (artifactName === 'target') {
    // Only purge 'target' if accompanied by a Rust, Maven, or Gradle project file
    return (
      (await pathExists(path.join(rootDir, 'Cargo.toml'))) ||
      (await pathExists(path.join(rootDir, 'pom.xml'))) ||
      (await pathExists(path.join(rootDir, 'build.gradle'))) ||
      (await pathExists(path.join(rootDir, 'build.gradle.kts')))
    );
  }

  if (artifactName === 'venv' || artifactName === '.venv') {
    // Must contain standard Python virtualenv markers
    return (
      (await pathExists(path.join(fullPath, 'pyvenv.cfg'))) ||
      (await pathExists(path.join(fullPath, 'bin', 'activate')))
    );
  }

  return true;
}

// Find rebuildable artifacts in a given root directory
async function scanProjectArtifacts(rootDir, maxDepth = 4, currentDepth = 0) {
  if (currentDepth > maxDepth) return [];
  if (await isProtectedPath(rootDir)) return [];

  const artifacts = [];

  try {
    const entries = await readdir(rootDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;

      const fullPath = path.join(rootDir, entry.name);

      if (entry.isDirectory()) {
        if (PURGE_TARGET_NAMES.has(entry.name)) {
          // Safety check: verify that generic directory names are actually project artifacts
          const isGenuine = await isGenuineProjectArtifact(rootDir, entry.name, fullPath);
          if (!isGenuine) {
            continue;
          }

          // Found a rebuildable artifact directory!
          const sizeBytes = await getDirSize(fullPath);
          if (sizeBytes > 0) {
            const projectName = path.basename(rootDir);
            artifacts.push({
              id: fullPath,
              projectName,
              artifactType: entry.name,
              path: fullPath,
              sizeBytes,
              sizeFormatted: formatBytes(sizeBytes)
            });
          }
          // Do not recurse into node_modules or target directories
          continue;
        }

        // Skip hidden dot-directories that are not in purge list (e.g. .git)
        if (entry.name.startsWith('.') && !PURGE_TARGET_NAMES.has(entry.name)) {
          continue;
        }

        const subArtifacts = await scanProjectArtifacts(fullPath, maxDepth, currentDepth + 1);
        artifacts.push(...subArtifacts);
      }
    }
  } catch {
    // Skip unreadable directories
  }

  return artifacts;
}

// Scans default dev directories or a user-chosen custom folder
async function scanDevProjects(customPath = null) {
  const home = os.homedir();
  const searchDirs = Array.isArray(customPath)
    ? customPath
    : (customPath
        ? [path.resolve(customPath)]
        : [
            path.join(home, 'Code'),
            path.join(home, 'Projects'),
            path.join(home, 'Developer')
          ]);

  const allArtifacts = [];

  for (const dir of searchDirs) {
    if (await pathExists(dir) && !(await isProtectedPath(dir))) {
      const found = await scanProjectArtifacts(dir, 4);
      allArtifacts.push(...found);
    }
  }

  // Sort descending by size
  allArtifacts.sort((a, b) => b.sizeBytes - a.sizeBytes);

  const totalBytes = allArtifacts.reduce((sum, a) => sum + a.sizeBytes, 0);

  return {
    artifacts: allArtifacts,
    totalCount: allArtifacts.length,
    totalBytes,
    totalFormatted: formatBytes(totalBytes)
  };
}

async function purgeArtifacts(artifactPaths, options = { useTrash: true }) {
  let cleanedCount = 0;
  let skippedCount = 0;

  for (const p of artifactPaths) {
    const res = await safeDelete(p, options.useTrash);
    if (res.success && !res.skipped) cleanedCount++;
    else skippedCount++;
  }

  return {
    success: true,
    cleanedCount,
    skippedCount,
    message: `Purged ${cleanedCount} build artifact(s).`
  };
}

module.exports = {
  scanDevProjects,
  purgeArtifacts
};
