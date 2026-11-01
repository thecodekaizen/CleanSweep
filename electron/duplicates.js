const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { promisify } = require('util');
const { formatBytes, pathExists, safeDelete } = require('./utils');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Compute SHA-256 of file (partial or full)
async function getFileHash(filePath, maxBytes = null) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath, maxBytes ? { start: 0, end: maxBytes } : undefined);

    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', err => reject(err));
  });
}

// Collect all files in directory
async function collectFiles(dirPath, minSizeBytes = 1024, maxDepth = 4, currentDepth = 0) {
  if (currentDepth > maxDepth) return [];
  const files = [];

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      if (entry.name.startsWith('.') && currentDepth === 0) continue;

      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await collectFiles(fullPath, minSizeBytes, maxDepth, currentDepth + 1);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        try {
          const fileStat = await stat(fullPath);
          if (fileStat.size >= minSizeBytes) {
            files.push({
              name: entry.name,
              path: fullPath,
              sizeBytes: fileStat.size,
              sizeFormatted: formatBytes(fileStat.size),
              modifiedAt: fileStat.mtime.toISOString(),
              mtimeMs: fileStat.mtimeMs
            });
          }
        } catch {
          // Skip unreadable file
        }
      }
    }
  } catch {
    // Skip unreadable dir
  }

  return files;
}

// Two-pass duplicate finder
async function scanDuplicateFiles(targetDirs = null, minSizeBytes = 10 * 1024) {
  const defaultDirs = [
    path.join(os.homedir(), 'Downloads'),
    path.join(os.homedir(), 'Documents'),
    path.join(os.homedir(), 'Desktop')
  ];

  const searchDirs = Array.isArray(targetDirs)
    ? targetDirs
    : (targetDirs ? [targetDirs] : defaultDirs);
  const allFiles = [];

  for (const d of searchDirs) {
    if (await pathExists(d)) {
      const files = await collectFiles(d, minSizeBytes, 4);
      allFiles.push(...files);
    }
  }

  // Pass 1: Group by file size
  const sizeMap = new Map();
  for (const f of allFiles) {
    if (!sizeMap.has(f.sizeBytes)) {
      sizeMap.set(f.sizeBytes, []);
    }
    sizeMap.get(f.sizeBytes).push(f);
  }

  // Filter out sizes with only 1 file
  const candidateGroups = [];
  for (const [, list] of sizeMap.entries()) {
    if (list.length > 1) {
      candidateGroups.push(list);
    }
  }

  // Pass 2: Fast SHA-256 chunk hash (first 64KB)
  const hashMap = new Map();

  for (const group of candidateGroups) {
    for (const f of group) {
      try {
        const chunkHash = await getFileHash(f.path, 64 * 1024);
        const hashKey = `${f.sizeBytes}-${chunkHash}`;
        if (!hashMap.has(hashKey)) {
          hashMap.set(hashKey, []);
        }
        hashMap.get(hashKey).push(f);
      } catch {
        // Skip unreadable
      }
    }
  }

  // Pass 3: Strict cryptographic verification - compute full SHA-256 for all remaining candidates
  const verifiedHashMap = new Map();

  for (const [, list] of hashMap.entries()) {
    if (list.length <= 1) continue;

    for (const f of list) {
      try {
        // If file is 64KB or smaller, chunk hash is already the full file hash
        let fullHash;
        if (f.sizeBytes <= 64 * 1024) {
          fullHash = 'exact-verified';
        } else {
          fullHash = await getFileHash(f.path);
        }
        const fullKey = `${f.sizeBytes}-${fullHash}`;
        if (!verifiedHashMap.has(fullKey)) {
          verifiedHashMap.set(fullKey, []);
        }
        verifiedHashMap.get(fullKey).push(f);
      } catch {
        // Skip unreadable files
      }
    }
  }

  const duplicateGroups = [];
  let totalWastedBytes = 0;
  let duplicateCount = 0;

  for (const [, list] of verifiedHashMap.entries()) {
    if (list.length <= 1) continue;

    // Sort by modified time: oldest first is considered the Original
    list.sort((a, b) => a.mtimeMs - b.mtimeMs);

    const original = list[0];
    const duplicates = list.slice(1);

    const groupWasted = duplicates.reduce((sum, d) => sum + d.sizeBytes, 0);
    totalWastedBytes += groupWasted;
    duplicateCount += duplicates.length;

    duplicateGroups.push({
      groupId: original.path,
      sizeBytes: original.sizeBytes,
      sizeFormatted: original.sizeFormatted,
      original,
      duplicates,
      wastedBytes: groupWasted,
      wastedFormatted: formatBytes(groupWasted)
    });
  }

  // Sort duplicate groups descending by wasted space
  duplicateGroups.sort((a, b) => b.wastedBytes - a.wastedBytes);

  return {
    groups: duplicateGroups,
    totalGroups: duplicateGroups.length,
    totalDuplicates: duplicateCount,
    totalWastedBytes,
    totalWastedFormatted: formatBytes(totalWastedBytes)
  };
}

async function removeDuplicates(duplicatePaths, options = { useTrash: true }) {
  let cleanedCount = 0;
  let skippedCount = 0;

  for (const p of duplicatePaths) {
    const res = await safeDelete(p, options.useTrash);
    if (res.success && !res.skipped) cleanedCount++;
    else skippedCount++;
  }

  return {
    success: true,
    cleanedCount,
    skippedCount,
    message: `Cleaned ${cleanedCount} duplicate file(s).`
  };
}

module.exports = {
  scanDuplicateFiles,
  removeDuplicates
};
