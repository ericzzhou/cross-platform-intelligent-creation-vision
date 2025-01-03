const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jsonEditor', {
  onJsonLoad: (callback) => {
    ipcRenderer.on('json:load', (event, data) => callback(data));
  },

  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close')
  },

  file: {
    save: (content) => ipcRenderer.invoke('json:save', content),
    saveAs: (content) => ipcRenderer.invoke('json:saveAs', content),
    openSchema: () => ipcRenderer.invoke('json:openSchema')
  }
}); 