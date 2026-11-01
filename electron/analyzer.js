const fs = require('fs');
const path = require('path');
const os = require('os');
const { promisify } = require('util');
const { formatBytes, pathExists, getPathSize, safeDelete } = require('./utils');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

function categorizeFile(filename) {
  const ext = path.extname(filename).toLowerCase();

  const archiveExts = ['.dmg', '.iso', '.pkg', '.mpkg', '.zip', '.tar', '.gz', '.tgz', '.7z', '.rar', '.bz2', '.xz', '.zst'];
  const videoExts = ['.mp4', '.mov', '.mkv', '.avi', '.wmv', '.webm', '.m4v', '.flv', '.ts', '.mpeg', '.mpg'];
  const audioExts = ['.mp3', '.wav', '.flac', '.aac', '.m4a', '.aiff', '.ogg', '.wma', '.alac'];
  const docExts = ['.pdf', '.docx', '.xlsx', '.pptx', '.psd', '.ai', '.sketch', '.fig', '.epub', '.key', '.pages', '.numbers'];
  const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.tiff', '.raw', '.heic', '.svg', '.cr2', '.nef', '.arw'];
  const vmDiskExts = ['.vdi', '.vmdk', '.qcow2', '.img', '.bin', '.sparseimage', '.sparsebundle', '.raw', '.hdd'];
  const devDataExts = ['.sqlite', '.sqlite3', '.db', '.sql', '.parquet', '.arrow', '.csv', '.json', '.h5', '.hdf5', '.pt', '.pth', '.onnx', '.safetensors', '.model', '.gguf'];

  if (archiveExts.includes(ext)) return 'Archives & Installers';
  if (videoExts.includes(ext)) return 'Videos';
  if (audioExts.includes(ext)) return 'Audio';
  if (docExts.includes(ext)) return 'Documents';
  if (imageExts.includes(ext)) return 'Images';
  if (vmDiskExts.includes(ext)) return 'Disk Images & VMs';
  if (devDataExts.includes(ext)) return 'Developer & Data';
  return 'Other Large Files';
}

const IGNORED_DIR_NAMES = new Set([
  '.git',
  '.svn',
  '.hg',
  '.Trash',
  'node_modules',
  '.npm',
  '.yarn',
  '.pnpm',
  '.cache',
  'Library',
  '.venv',
  'venv'
]);

async function findLargeFiles(dirPath, minSizeBytes = 50 * 1024 * 1024, maxDepth = 6, currentDepth = 0) {
  if (currentDepth > maxDepth) return [];
  const filesList = [];

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;

      // Skip common hidden or system build directories at any depth
      if (IGNORED_DIR_NAMES.has(entry.name) || (entry.name.startsWith('.') && currentDepth > 0)) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);

      try {
        if (entry.isDirectory()) {
          // Check package bundles (like .app or .framework in downloads)
          if (entry.name.endsWith('.app') || entry.name.endsWith('.framework')) {
            const pkgSize = await getPathSize(fullPath);
            if (pkgSize >= minSizeBytes) {
              const fileStat = await stat(fullPath).catch(() => ({ mtime: new Date(), mtimeMs: Date.now() }));
              filesList.push({
                name: entry.name,
                path: fullPath,
                sizeBytes: pkgSize,
                sizeFormatted: formatBytes(pkgSize),
                modifiedAt: fileStat.mtime ? fileStat.mtime.toISOString() : new Date().toISOString(),
                ageDays: Math.floor((Date.now() - (fileStat.mtimeMs || Date.now())) / (1000 * 60 * 60 * 24)),
                category: 'App Packages',
                extension: path.extname(entry.name).toLowerCase() || '.app'
              });
            }
          } else {
            const subFiles = await findLargeFiles(fullPath, minSizeBytes, maxDepth, currentDepth + 1);
            filesList.push(...subFiles);
          }
        } else if (entry.isFile()) {
          const fileStat = await stat(fullPath);
          const fileSize = fileStat.size;

          if (fileSize >= minSizeBytes) {
            filesList.push({
              name: entry.name,
              path: fullPath,
              sizeBytes: fileSize,
              sizeFormatted: formatBytes(fileSize),
              modifiedAt: fileStat.mtime.toISOString(),
              ageDays: Math.floor((Date.now() - fileStat.mtimeMs) / (1000 * 60 * 60 * 24)),
              category: categorizeFile(entry.name),
              extension: path.extname(entry.name).toLowerCase()
            });
          }
        }
      } catch {
        // Skip inaccessible files or nested folders
      }
    }
  } catch {
    // Skip unreadable directory
  }

  return filesList;
}

async function scanLargeAndOldFiles(options = {}) {
  const minSizeBytes = options.minSizeBytes || (50 * 1024 * 1024); // 50MB default
  const home = os.homedir();

  let targetDirs = options.customDirs;
  if (!targetDirs || !targetDirs.length) {
    const candidateFolders = [
      path.join(home, 'Downloads'),
      path.join(home, 'Documents'),
      path.join(home, 'Desktop'),
      path.join(home, 'Movies'),
      path.join(home, 'Music'),
      path.join(home, 'Pictures'),
      path.join(home, 'Code'),
      path.join(home, 'Projects'),
      path.join(home, 'Developer')
    ];
    targetDirs = [];
    for (const dir of candidateFolders) {
      if (await pathExists(dir)) {
        targetDirs.push(dir);
      }
    }
  }

  const allFiles = [];
  const scannedDirs = [];
  const permissionDeniedDirs = [];

  for (const dir of targetDirs) {
    try {
      await fs.promises.access(dir, fs.constants.R_OK);
      const dirFiles = await findLargeFiles(dir, minSizeBytes, options.maxDepth || 6);
      allFiles.push(...dirFiles);
      scannedDirs.push(dir);
    } catch (err) {
      if (err.code === 'EPERM' || err.code === 'EACCES') {
        permissionDeniedDirs.push({
          dir,
          error: 'macOS permission required. Choose folder manually or grant Full Disk Access.'
        });
      }
    }
  }

  // Sort descending by size
  allFiles.sort((a, b) => b.sizeBytes - a.sizeBytes);

  const totalBytes = allFiles.reduce((sum, f) => sum + f.sizeBytes, 0);

  return {
    files: allFiles,
    totalCount: allFiles.length,
    totalBytes,
    totalFormatted: formatBytes(totalBytes),
    scannedDirs,
    permissionDeniedDirs
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
  categorizeFile,
  scanLargeAndOldFiles,
  deleteLargeFiles
};
