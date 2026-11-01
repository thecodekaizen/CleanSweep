const { contextBridge, ipcRenderer } = require('electron');

const api = {
  // 1. Live System Monitor
  getSystemMetrics: () => ipcRenderer.invoke('get-system-metrics'),

  // 2. Smart System Scanner & Clean
  scanSystem: () => ipcRenderer.invoke('scan-system'),
  cleanSystem: (items, options = { useTrash: true, dryRun: false }) => 
    ipcRenderer.invoke('clean-system', { items, options }),

  // 3. App Uninstaller & Orphans
  scanApps: () => ipcRenderer.invoke('scan-apps'),
  uninstallApp: (appPath, associatedFiles = [], options = { useTrash: true }) => 
    ipcRenderer.invoke('uninstall-app', { appPath, associatedFiles, options }),
  scanOrphans: () => ipcRenderer.invoke('scan-orphans'),
  cleanOrphans: (orphanPaths, options = { useTrash: true }) => 
    ipcRenderer.invoke('clean-orphans', { orphanPaths, options }),

  // 4. Large & Old Files Analyzer
  scanLargeFiles: (options = {}) => ipcRenderer.invoke('scan-large-files', options),
  deleteLargeFiles: (filePaths, options = { useTrash: true }) => 
    ipcRenderer.invoke('delete-large-files', { filePaths, options }),

  // 5. System Optimization & Maintenance
  getOptimizationTasks: () => ipcRenderer.invoke('get-optimization-tasks'),
  runOptimization: (taskId) => ipcRenderer.invoke('run-optimization', taskId),

  // 6. Startup Items
  getStartupItems: () => ipcRenderer.invoke('get-startup-items'),
  removeStartupItem: (itemPath, useTrash = true) => 
    ipcRenderer.invoke('remove-startup-item', { itemPath, useTrash }),

  // 7. Developer Project Artifact Purger (Mole mo purge)
  scanProjectArtifacts: (customPath = null) => ipcRenderer.invoke('scan-project-artifacts', customPath),
  purgeArtifacts: (artifactPaths, options = { useTrash: true }) => 
    ipcRenderer.invoke('purge-artifacts', { artifactPaths, options }),

  // 8. Duplicate File Finder (PureMac Duplicate Finder)
  scanDuplicates: (options = {}) => ipcRenderer.invoke('scan-duplicates', options),
  removeDuplicates: (duplicatePaths, options = { useTrash: true }) => 
    ipcRenderer.invoke('remove-duplicates', { duplicatePaths, options }),

  // 9. App Localization Slimmer (Mole mo slim)
  scanSlimmableApps: () => ipcRenderer.invoke('scan-slimmable-apps'),
  slimApp: (localePaths, options = { useTrash: true }) => 
    ipcRenderer.invoke('slim-app', { localePaths, options }),

  // 10. Installer Packages (Mole mo installer)
  scanInstallers: () => ipcRenderer.invoke('scan-installers'),
  cleanInstallers: (installerPaths, options = { useTrash: true }) => 
    ipcRenderer.invoke('clean-installers', { installerPaths, options }),

  // 11. Cleanup History (Mole mo history)
  getHistory: () => ipcRenderer.invoke('get-history'),
  clearHistory: () => ipcRenderer.invoke('clear-history'),

  // 12. Preferences & Whitelist (PureMac Settings)
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateConfig: (updates) => ipcRenderer.invoke('update-config', updates),

  // 13. Utilities
  revealInFinder: (targetPath) => ipcRenderer.invoke('reveal-in-finder', targetPath),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Progress Event Subscriptions
  onScanProgress: (callback) => {
    const subscription = (event, progress) => callback(progress);
    ipcRenderer.on('scan-progress', subscription);
    return () => ipcRenderer.removeListener('scan-progress', subscription);
  },
  onCleanProgress: (callback) => {
    const subscription = (event, progress) => callback(progress);
    ipcRenderer.on('clean-progress', subscription);
    return () => ipcRenderer.removeListener('clean-progress', subscription);
  },
  onAppsProgress: (callback) => {
    const subscription = (event, progress) => callback(progress);
    ipcRenderer.on('apps-progress', subscription);
    return () => ipcRenderer.removeListener('apps-progress', subscription);
  }
};

contextBridge.exposeInMainWorld('cleanSweepAPI', api);
// Backward compatibility alias
contextBridge.exposeInMainWorld('electronAPI', api);
