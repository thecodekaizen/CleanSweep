const fs = require('fs');
const path = require('path');
const os = require('os');
const { promisify } = require('util');
const { formatBytes, pathExists, safeDelete } = require('./utils');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

function categorizeFile(filename) {
  const ext = path.extname(filename).toLowerCase();

  const archiveExts = ['.dmg', '.iso', '.pkg', '.zip', '.tar', '.gz', '.tgz', '.7z', '.rar', '.bz2', '.xz'];
  const videoExts = ['.mp4', '.mov', '.mkv', '.avi', '.wmv', '.webm', '.m4v', '.flv'];
  const audioExts = ['.mp3', '.wav', '.flac', '.aac', '.m4a', '.aiff', '.ogg'];
  const docExts = ['.pdf', '.docx', '.xlsx', '.pptx', '.psd', '.ai', '.sketch', '.fig', '.epub'];
  const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.tiff', '.raw', '.heic', '.svg'];

  if (archiveExts.includes(ext)) return 'Archives & Installers';
  if (videoExts.includes(ext)) return 'Videos';
  if (audioExts.includes(ext)) return 'Audio';
  if (docExts.includes(ext)) return 'Documents';
  if (imageExts.includes(ext)) return 'Images';
  return 'Other Large Files';
}

async function findLargeFiles(dirPath, minSizeBytes = 50 * 1024 * 1024, maxDepth = 4, currentDepth = 0) {
  if (currentDepth > maxDepth) return [];
  const filesList = [];

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      // Skip hidden directories (like .git, .Trash)
      if (entry.name.startsWith('.') && currentDepth === 0) continue;

      const fullPath = path.join(dirPath, entry.name);

      try {
        if (entry.isDirectory()) {
          // Skip package contents (like .app bundles in downloads)
          if (entry.name.endsWith('.app') || entry.name.endsWith('.framework')) {
            const fileStat = await stat(fullPath);
            if (fileStat.size >= minSizeBytes) {
              filesList.push({
                name: entry.name,
                path: fullPath,
                sizeBytes: fileStat.size,
                sizeFormatted: formatBytes(fileStat.size),
                modifiedAt: fileStat.mtime.toISOString(),
                ageDays: Math.floor((Date.now() - fileStat.mtimeMs) / (1000 * 60 * 60 * 24)),
                category: 'App Packages',
                extension: '.app'
              });
            }
          } else {
            const subFiles = await findLargeFiles(fullPath, minSizeBytes, maxDepth, currentDepth + 1);
            filesList.push(...subFiles);
          }
        } else if (entry.isFile()) {
          const fileStat = await stat(fullPath);
          const actualSize = fileStat.blocks ? Math.min(fileStat.size, fileStat.blocks * 512) : fileStat.size;

          if (actualSize >= minSizeBytes) {
            filesList.push({
              name: entry.name,
              path: fullPath,
              sizeBytes: actualSize,
              sizeFormatted: formatBytes(actualSize),
              modifiedAt: fileStat.mtime.toISOString(),
              ageDays: Math.floor((Date.now() - fileStat.mtimeMs) / (1000 * 60 * 60 * 24)),
              category: categorizeFile(entry.name),
              extension: path.extname(entry.name).toLowerCase()
            });
          }
        }
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    // Skip unreadable directory
  }

  return filesList;
}

async function scanLargeAndOldFiles(options = {}) {
  const minSizeBytes = options.minSizeBytes || (50 * 1024 * 1024); // 50MB default
  const targetDirs = options.customDirs || [
    path.join(os.homedir(), 'Downloads'),
    path.join(os.homedir(), 'Documents'),
    path.join(os.homedir(), 'Desktop'),
    path.join(os.homedir(), 'Movies'),
    path.join(os.homedir(), 'Music')
  ];

  const allFiles = [];

  for (const dir of targetDirs) {
    if (await pathExists(dir)) {
      const dirFiles = await findLargeFiles(dir, minSizeBytes, 4);
      allFiles.push(...dirFiles);
    }
  }

  // Sort descending by size
  allFiles.sort((a, b) => b.sizeBytes - a.sizeBytes);

  const totalBytes = allFiles.reduce((sum, f) => sum + f.sizeBytes, 0);

  return {
    files: allFiles,
    totalCount: allFiles.length,
    totalBytes,
    totalFormatted: formatBytes(totalBytes)
  };
}

async function deleteLargeFiles(filePaths, options = { useTrash: true }) {
  let deletedCount = 0;
  let skippedCount = 0;

  for (const p of filePaths) {
    const res = await safeDelete(p, options.useTrash);
    if (res.success && !res.skipped) deletedCount++;
    else skippedCount++;
  }

  return {
    success: true,
    deletedCount,
    skippedCount,
    message: `Removed ${deletedCount} file(s).`
  };
}

module.exports = {
  scanLargeAndOldFiles,
  deleteLargeFiles
};
