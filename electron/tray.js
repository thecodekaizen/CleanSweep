const fs = require('fs');
const path = require('path');
const { Tray, Menu, nativeImage, app } = require('electron');
const { getLiveSystemHealth } = require('./monitor');
const { runOptimization } = require('./optimizer');

let tray = null;
let updateInterval = null;

// Clean solid monochrome broom icon for macOS menu bar template rendering
const TRAY_FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 36 36" fill="#000000">
  <path d="M7 3 C7 5.5 8.5 7 11.5 7 C8.5 7 7 8.5 7 11 C7 8.5 5.5 7 2.5 7 C5.5 7 7 5.5 7 3 Z"/>
  <circle cx="3.5" cy="11" r="1.2"/>
  <line x1="29" y1="6" x2="18" y2="17" stroke="#000000" stroke-width="3" stroke-linecap="round"/>
  <polygon points="15,16 19,12 21.5,14.5 17.5,18.5"/>
  <polygon points="15,18 7,24.5 8,27 11,27.2 16,19"/>
  <polygon points="16.5,19 12,27.5 14.5,28.5 18,20"/>
  <polygon points="18.5,19.5 16,28.5 18.5,29 20.5,20.5"/>
</svg>`;

function getTrayIcon() {
  const iconPath = path.join(__dirname, '../build/trayTemplate.png');
  if (fs.existsSync(iconPath)) {
    const img = nativeImage.createFromPath(iconPath);
    img.setTemplateImage(true);
    return img;
  }

  const base64Svg = Buffer.from(TRAY_FALLBACK_SVG).toString('base64');
  const img = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${base64Svg}`);
  img.setTemplateImage(true); // Automatically adapts to macOS Dark/Light Menu Bar
  return img;
}

function formatFreeMemory(metrics) {
  if (!metrics || !metrics.memory) return null;
  const mem = metrics.memory;

  // Use pre-formatted string if valid and not NaN
  if (typeof mem.freeFormatted === 'string' && !mem.freeFormatted.includes('NaN')) {
    return mem.freeFormatted;
  }

  // Safe fallback calculation
  const freeMb = typeof mem.freeMb === 'number' && Number.isFinite(mem.freeMb)
    ? mem.freeMb
    : (typeof mem.freeBytes === 'number' && Number.isFinite(mem.freeBytes)
      ? mem.freeBytes / (1024 * 1024)
      : null);

  if (freeMb !== null && Number.isFinite(freeMb) && freeMb > 0) {
    return freeMb >= 1024
      ? `${(freeMb / 1024).toFixed(1)} GB`
      : `${Math.round(freeMb)} MB`;
  }

  return null;
}

function buildContextMenu(mainWindow, metrics = null) {
  const freeText = formatFreeMemory(metrics);
  const memUsed = metrics && metrics.memory && metrics.memory.usedFormatted
    ? `${metrics.memory.usedFormatted} used`
    : 'Calculating...';
  const memPct = metrics && metrics.memory && typeof metrics.memory.usedPercent === 'number'
    ? ` (${metrics.memory.usedPercent}%)`
    : '';

  const memoryLabel = freeText
    ? `Memory: ${freeText} free • ${memUsed}${memPct}`
    : `Memory: ${memUsed}${memPct}`;

  return Menu.buildFromTemplate([
    {
      label: 'CleanSweep',
      enabled: false
    },
    {
      label: memoryLabel,
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Open CleanSweep',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: '⚡ Quick Clean (Flush RAM & DNS)',
      click: async () => {
        try {
          await runOptimization('purge-ram');
          await runOptimization('flush-dns');
          if (tray) {
            tray.setTitle(' Cleaned!');
            setTimeout(async () => {
              const freshMetrics = await getLiveSystemHealth();
              updateTray(mainWindow, freshMetrics);
            }, 2000);
          }
        } catch {
          // Quick clean handled gracefully
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Launch at Login',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => {
        app.setLoginItemSettings({
          openAtLogin: item.checked,
          openAsHidden: true
        });
      }
    },
    { type: 'separator' },
    {
      label: 'Quit CleanSweep',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
}

function updateTray(mainWindow, metrics) {
  if (!tray) return;

  try {
    const freeText = formatFreeMemory(metrics);
    if (freeText) {
      tray.setTitle(` ${freeText}`);
      tray.setToolTip(`CleanSweep — ${freeText} Free Memory`);
    } else {
      tray.setTitle('');
      tray.setToolTip('CleanSweep — Zero-telemetry macOS optimizer');
    }

    tray.setContextMenu(buildContextMenu(mainWindow, metrics));
  } catch {
    // Suppress update errors during window transition
  }
}

function setupTray(mainWindow) {
  if (tray) return tray;

  try {
    const icon = getTrayIcon();
    tray = new Tray(icon);
    tray.setToolTip('CleanSweep — Zero-telemetry macOS optimizer');
    tray.setContextMenu(buildContextMenu(mainWindow));

    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.focus();
        } else {
          mainWindow.show();
        }
      }
    });

    // Start background telemetry polling for menu bar
    const pollMetrics = async () => {
      const metrics = await getLiveSystemHealth();
      updateTray(mainWindow, metrics);
    };

    pollMetrics();
    updateInterval = setInterval(pollMetrics, 10000); // Poll every 10s to keep CPU near 0%
  } catch (err) {
    console.error('Failed to initialize macOS menu bar tray:', err.message);
  }

  return tray;
}

function destroyTray() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

module.exports = {
  setupTray,
  updateTray,
  destroyTray
};
