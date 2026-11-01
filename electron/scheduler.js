const fs = require('fs');
const path = require('path');
const os = require('os');
const { promisify } = require('util');
const { exec } = require('child_process');
const { pathExists } = require('./utils');
const { getConfig, updateConfig } = require('./config');

const execAsync = promisify(exec);

const LAUNCH_AGENTS_DIR = process.env.CLEANSWEEP_AGENTS_DIR || path.join(os.homedir(), 'Library', 'LaunchAgents');
const PLIST_LABEL = 'com.thecodekaizen.cleansweep.autoclean';
const PLIST_FILE = path.join(LAUNCH_AGENTS_DIR, `${PLIST_LABEL}.plist`);

function generatePlistContent(intervalSeconds, nodePath, sweepScriptPath) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${nodePath}</string>
        <string>${sweepScriptPath}</string>
        <string>clean</string>
        <string>--all</string>
        <string>--silent</string>
    </array>
    <key>StartInterval</key>
    <integer>${intervalSeconds}</integer>
    <key>RunAtLoad</key>
    <false/>
    <key>StandardOutPath</key>
    <string>/tmp/cleansweep-autoclean.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/cleansweep-autoclean.log</string>
</dict>
</plist>
`;
}

async function getScheduleStatus() {
  const config = await getConfig();
  const exists = await pathExists(PLIST_FILE);

  if (!exists) {
    return {
      enabled: false,
      frequency: config.autoCleanSchedule || 'none',
      label: PLIST_LABEL,
      plistPath: PLIST_FILE
    };
  }

  try {
    const raw = await fs.promises.readFile(PLIST_FILE, 'utf8');
    let frequency = 'custom';
    if (raw.includes('<integer>86400</integer>')) {
      frequency = 'daily';
    } else if (raw.includes('<integer>604800</integer>')) {
      frequency = 'weekly';
    }

    return {
      enabled: true,
      frequency,
      label: PLIST_LABEL,
      plistPath: PLIST_FILE
    };
  } catch {
    return {
      enabled: false,
      frequency: 'none',
      label: PLIST_LABEL,
      plistPath: PLIST_FILE
    };
  }
}

async function configureSchedule(frequency) {
  const normFreq = (frequency || '').toLowerCase().trim();

  if (normFreq === 'none' || normFreq === 'disabled' || normFreq === 'off') {
    // Unload and delete existing LaunchAgent
    if (await pathExists(PLIST_FILE)) {
      try {
        await execAsync(`launchctl unload "${PLIST_FILE}"`);
      } catch {
        // Ignore unload error if not loaded
      }
      try {
        await fs.promises.unlink(PLIST_FILE);
      } catch {
        // Ignore deletion error
      }
    }

    await updateConfig({ autoCleanSchedule: 'none' });
    return { success: true, enabled: false, frequency: 'none' };
  }

  // Interval in seconds
  let interval = 604800; // 7 days default
  if (normFreq === 'daily') {
    interval = 86400; // 24 hours
  } else if (normFreq === 'weekly') {
    interval = 604800;
  }

  // Locate node runtime and sweep script path
  const nodePath = process.execPath || '/usr/local/bin/node';
  const sweepScriptPath = path.resolve(__dirname, '../bin/sweep.mjs');

  const plistContent = generatePlistContent(interval, nodePath, sweepScriptPath);

  try {
    if (!await pathExists(LAUNCH_AGENTS_DIR)) {
      await fs.promises.mkdir(LAUNCH_AGENTS_DIR, { recursive: true });
    }

    // Unload previous instance if active
    if (await pathExists(PLIST_FILE)) {
      try {
        await execAsync(`launchctl unload "${PLIST_FILE}"`);
      } catch {
        // Not running
      }
    }

    // Write new plist
    await fs.promises.writeFile(PLIST_FILE, plistContent, 'utf8');

    // Register with launchctl
    try {
      await execAsync(`launchctl load -w "${PLIST_FILE}"`);
    } catch {
      // launchctl might require elevated permissions or report already loaded
    }

    await updateConfig({ autoCleanSchedule: normFreq });

    return {
      success: true,
      enabled: true,
      frequency: normFreq,
      intervalSeconds: interval,
      plistPath: PLIST_FILE
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

module.exports = {
  getScheduleStatus,
  configureSchedule,
  PLIST_LABEL,
  PLIST_FILE
};
