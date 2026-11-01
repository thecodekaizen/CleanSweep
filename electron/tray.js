const { Tray, Menu, nativeImage, app } = require('electron');
const { getLiveSystemHealth } = require('./monitor');
const { runOptimization } = require('./optimizer');

let tray = null;
let updateInterval = null;

// Clean 18x18 SVG monochrome broom icon designed for macOS menu bar
const TRAY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="m16 22-8-8"/>
  <path d="M12 18 4 10"/>
  <path d="m20 14-8-8"/>
  <path d="M16 10 8 2"/>
  <circle cx="19" cy="5" r="2"/>
</svg>`;

function getTrayIcon() {
  const base64Svg = Buffer.from(TRAY_SVG).toString('base64');
  const img = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${base64Svg}`);
  img.setTemplateImage(true); // Automatically adapts to macOS Dark/Light Menu Bar
  return img;
}

function buildContextMenu(mainWindow, metrics = null) {
  const memUsed = metrics ? `${metrics.memory.usedFormatted} used` : 'Calculating...';
  const memPct = metrics ? ` (${metrics.memory.usedPercent}%)` : '';

  return Menu.buildFromTemplate([
    {
      label: 'CleanSweep',
      enabled: false
    },
    {
      label: `Memory: ${memUsed}${memPct}`,
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
    if (metrics && metrics.memory) {
      // Display free memory in macOS menu bar (e.g. " 14.2 GB")
      const freeMb = metrics.memory.freeMb || (metrics.memory.totalMb - metrics.memory.usedMb);
      const freeFormatted = freeMb >= 1024 
        ? `${(freeMb / 1024).toFixed(1)} GB` 
        : `${Math.round(freeMb)} MB`;

      tray.setTitle(` ${freeFormatted}`);
      tray.setToolTip(`CleanSweep — ${freeFormatted} Free Memory`);
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
