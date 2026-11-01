const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { pathExists, safeDelete } = require('./utils');

const execFileAsync = promisify(execFile);
const readdir = promisify(fs.readdir);

async function parsePlist(plistPath) {
  try {
    const { stdout } = await execFileAsync('plutil', ['-convert', 'json', '-o', '-', plistPath]);
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

async function getStartupItems() {
  const home = os.homedir();
  const dirs = [
    { type: 'User LaunchAgent', dir: path.join(home, 'Library', 'LaunchAgents') },
    { type: 'System LaunchAgent', dir: '/Library/LaunchAgents' },
    { type: 'System LaunchDaemon', dir: '/Library/LaunchDaemons' }
  ];

  const items = [];

  for (const d of dirs) {
    if (!await pathExists(d.dir)) continue;

    try {
      const files = await readdir(d.dir);
      for (const file of files) {
        if (!file.endsWith('.plist')) continue;
        const fullPath = path.join(d.dir, file);
        const parsed = await parsePlist(fullPath);

        const label = parsed?.Label || file.replace('.plist', '');
        const program = parsed?.Program || (Array.isArray(parsed?.ProgramArguments) ? parsed.ProgramArguments[0] : 'Unknown');
        const runAtLoad = parsed?.RunAtLoad !== undefined ? !!parsed.RunAtLoad : true;
        const disabled = !!parsed?.Disabled;

        items.push({
          id: `${d.type}:${file}`,
          name: label,
          filename: file,
          path: fullPath,
          type: d.type,
          program,
          runAtLoad,
          enabled: !disabled,
          isUserLevel: d.type.startsWith('User')
        });
      }
    } catch {
      // Skip directory if permission denied
    }
  }

  return {
    items,
    totalCount: items.length
  };
}

async function removeStartupItem(itemPath, useTrash = true) {
  if (!itemPath || typeof itemPath !== 'string') {
    return { success: false, error: 'Invalid startup item path' };
  }

  const resolved = path.resolve(itemPath);
  const home = os.homedir();
  const allowedDirs = [
    path.join(home, 'Library', 'LaunchAgents'),
    '/Library/LaunchAgents',
    '/Library/LaunchDaemons'
  ];

  // 1. Must be a .plist file
  if (!resolved.endsWith('.plist')) {
    return { success: false, error: 'Target is not a valid launchd .plist configuration.' };
  }

  // 2. Must be located inside one of the recognized launchd directories
  const isInsideAllowed = allowedDirs.some(d => resolved.startsWith(d + path.sep));
  if (!isInsideAllowed) {
    return { success: false, error: 'Target path is outside allowed LaunchAgent/LaunchDaemon directories.' };
  }

  // 3. Protect Apple system daemons
  const baseName = path.basename(resolved).toLowerCase();
  if (baseName.startsWith('com.apple.')) {
    return { success: false, error: 'Cannot remove protected macOS system LaunchAgent/LaunchDaemon.' };
  }

  // 4. Safely unload service from launchd before deleting plist
  try {
    await execFileAsync('launchctl', ['unload', resolved]);
  } catch {
    // Ignore unload error if service is not currently active
  }

  return await safeDelete(resolved, useTrash);
}

module.exports = {
  getStartupItems,
  removeStartupItem
};
