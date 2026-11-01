const fs = require('fs');
const path = require('path');
const os = require('os');
const { pathExists } = require('./utils');

const CONFIG_DIR = process.env.CLEANSWEEP_CONFIG_DIR || path.join(os.homedir(), '.config', 'cleansweep');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG = {
  useTrash: true,
  autoCleanSchedule: 'weekly',
  largeFileThresholdMb: 50,
  cleanOnQuit: false,
  whitelist: []
};

async function ensureConfigDir() {
  if (!await pathExists(CONFIG_DIR)) {
    await fs.promises.mkdir(CONFIG_DIR, { recursive: true });
  }
}

async function getConfig() {
  try {
    if (await pathExists(CONFIG_FILE)) {
      const raw = await fs.promises.readFile(CONFIG_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch {
    // Return default if error
  }

  return { ...DEFAULT_CONFIG };
}

async function updateConfig(updates) {
  try {
    await ensureConfigDir();
    const current = await getConfig();
    const updated = { ...current, ...updates };

    await fs.promises.writeFile(
      CONFIG_FILE,
      JSON.stringify(updated, null, 2),
      'utf8'
    );

    return { success: true, config: updated };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function isPathWhitelisted(targetPath) {
  const config = await getConfig();
  const normalized = path.resolve(targetPath).toLowerCase();

  return config.whitelist.some(w => {
    const normW = path.resolve(w).toLowerCase();
    return normalized === normW || normalized.startsWith(normW + path.sep);
  });
}

module.exports = {
  getConfig,
  updateConfig,
  isPathWhitelisted
};
