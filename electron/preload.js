const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  scanSystem: () => ipcRenderer.invoke('scan-system'),
  cleanSystem: (items) => ipcRenderer.invoke('clean-system', items)
});
