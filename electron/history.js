const fs = require('fs');
const path = require('path');
const os = require('os');
const { formatBytes, pathExists } = require('./utils');

const CONFIG_DIR = path.join(os.homedir(), '.config', 'cleansweep');
const HISTORY_FILE = path.join(CONFIG_DIR, 'history.json');

async function ensureConfigDir() {
  if (!await pathExists(CONFIG_DIR)) {
    await fs.promises.mkdir(CONFIG_DIR, { recursive: true });
  }
}

async function getHistory() {
  try {
    if (await pathExists(HISTORY_FILE)) {
      const raw = await fs.promises.readFile(HISTORY_FILE, 'utf8');
      const data = JSON.parse(raw);
      const totalLifetimeBytes = (data.entries || []).reduce((sum, e) => sum + (e.bytesReclaimed || 0), 0);
      return {
        entries: data.entries || [],
        totalLifetimeBytes,
        totalLifetimeFormatted: formatBytes(totalLifetimeBytes),
        totalOperations: (data.entries || []).length
      };
    }
  } catch {
    // If corrupted or non-existent, return empty
  }

  return {
    entries: [],
    totalLifetimeBytes: 0,
    totalLifetimeFormatted: '0 B',
    totalOperations: 0
  };
}

async function recordHistoryEntry(entry) {
  try {
    await ensureConfigDir();
    const current = await getHistory();

    const newRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      type: entry.type || 'Smart Clean',
      bytesReclaimed: entry.bytesReclaimed || 0,
      reclaimedFormatted: formatBytes(entry.bytesReclaimed || 0),
      itemCount: entry.itemCount || 0,
      details: entry.details || ''
    };

    // Prepend latest entry, limit history to 500 records
    const updatedEntries = [newRecord, ...current.entries].slice(0, 500);

    await fs.promises.writeFile(
      HISTORY_FILE,
      JSON.stringify({ entries: updatedEntries }, null, 2),
      'utf8'
    );

    return newRecord;
  } catch (err) {
    console.error('Failed to record history:', err);
    return null;
  }
}

async function clearHistory() {
  try {
    if (await pathExists(HISTORY_FILE)) {
      await fs.promises.unlink(HISTORY_FILE);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  getHistory,
  recordHistoryEntry,
  clearHistory
};
