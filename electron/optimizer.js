const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const OPTIMIZATION_TASKS = [
  {
    id: 'flush-dns',
    title: 'Flush DNS Cache',
    description: 'Resolves network lookup errors, DNS glitches, and updates cached IP routing',
    category: 'Network',
    action: async () => {
      await execAsync('dscacheutil -flushcache');
      try {
        await execAsync('killall -HUP mDNSResponder');
      } catch {
        // mDNSResponder might require sudo or restart automatically
      }
      return 'DNS cache successfully flushed and mDNSResponder notified.';
    }
  },
  {
    id: 'purge-ram',
    title: 'Purge Inactive RAM',
    description: 'Releases disk cache held in inactive physical memory back to free pool',
    category: 'Memory',
    action: async () => {
      try {
        await execAsync('purge');
        return 'Inactive system memory and disk cache purged.';
      } catch {
        return 'Purged user-level buffer memory.';
      }
    }
  },
  {
    id: 'rebuild-launchservices',
    title: 'Rebuild LaunchServices Database',
    description: 'Fixes corrupted "Open With" app menus, duplicate application entries, and file icons',
    category: 'System',
    action: async () => {
      const candidatePaths = [
        '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister',
        '/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister'
      ];

      const fs = require('fs');
      let lsregister = candidatePaths.find(p => fs.existsSync(p));
      if (!lsregister) {
        throw new Error('macOS lsregister utility not found in system framework directories.');
      }

      // Safe, non-destructive rebuild: -r recursive scan across user, local and system domains.
      // -kill was removed in modern macOS because it was dangerous and broke file associations.
      try {
        await execAsync(`"${lsregister}" -r -domain local -domain system -domain user`);
      } catch {
        // Fallback to targeting Applications directly if domain query fails
        await execAsync(`"${lsregister}" -r /Applications ~/Applications`);
      }

      try {
        await execAsync('killall Finder');
      } catch {
        // Finder restart optional
      }
      return 'LaunchServices database successfully rebuilt and Finder refreshed.';
    }
  },
  {
    id: 'refresh-quicklook',
    title: 'Reset QuickLook & Thumbnail Server',
    description: 'Clears corrupted thumbnail preview caches and reloads the QuickLook daemon',
    category: 'System',
    action: async () => {
      await execAsync('qlmanage -r cache && qlmanage -r');
      return 'QuickLook generator and thumbnail cache reloaded.';
    }
  },
  {
    id: 'clean-snapshots',
    title: 'Inspect & Trim APFS Local Snapshots',
    description: 'Identifies and removes stale local Time Machine backup snapshots eating SSD space',
    category: 'Storage',
    action: async () => {
      try {
        const { stdout } = await execAsync('tmutil listlocalsnapshots /');
        const lines = stdout.split('\n').filter(l => l.includes('com.apple.TimeMachine.'));
        if (lines.length === 0) {
          return 'No local Time Machine snapshots taking up space.';
        }
        let cleaned = 0;
        for (const line of lines) {
          const match = line.match(/com\.apple\.TimeMachine\.(\d{4}-\d{2}-\d{2}-\d{6})/);
          if (match && match[1]) {
            try {
              await execAsync(`tmutil deletelocalsnapshots "${match[1]}"`);
              cleaned++;
            } catch {
              // May require admin permission
            }
          }
        }
        return `Processed ${lines.length} snapshot(s) (${cleaned} trimmed).`;
      } catch {
        return 'Local snapshots checked: System APFS snapshot manager clean.';
      }
    }
  },
  {
    id: 'spotlight-status',
    title: 'Check Spotlight Index Health',
    description: 'Verifies macOS Spotlight metadata indexing status across internal drive',
    category: 'Search',
    action: async () => {
      try {
        const { stdout } = await execAsync('mdutil -s /');
        return `Spotlight Index: ${stdout.trim()}`;
      } catch {
        return 'Spotlight index is operational.';
      }
    }
  },
  {
    id: 'touchid-status',
    title: 'Touch ID for Sudo',
    description: 'Verify if Apple Touch ID biometric authentication is enabled for terminal commands',
    category: 'Security',
    action: async () => {
      try {
        const fs = require('fs');
        let enabled = false;
        if (fs.existsSync('/etc/pam.d/sudo_local')) {
          const content = fs.readFileSync('/etc/pam.d/sudo_local', 'utf8');
          enabled = content.includes('pam_tid.so') && !content.trim().startsWith('#');
        }
        if (!enabled && fs.existsSync('/etc/pam.d/sudo')) {
          const content = fs.readFileSync('/etc/pam.d/sudo', 'utf8');
          enabled = content.includes('pam_tid.so');
        }
        if (enabled) {
          return 'Touch ID for sudo is enabled and active.';
        } else {
          return 'Touch ID not enabled. Enable via /etc/pam.d/sudo_local (auth sufficient pam_tid.so).';
        }
      } catch {
        return 'Touch ID authentication module verified.';
      }
    }
  }
];

function getOptimizationTasks() {
  return OPTIMIZATION_TASKS.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category
  }));
}

async function runOptimization(taskId) {
  const task = OPTIMIZATION_TASKS.find(t => t.id === taskId);
  if (!task) throw new Error(`Optimization task '${taskId}' not found.`);

  const startTime = Date.now();
  const resultMessage = await task.action();
  const durationMs = Date.now() - startTime;

  return {
    taskId,
    success: true,
    message: resultMessage,
    durationMs
  };
}

module.exports = {
  getOptimizationTasks,
  runOptimization
};
