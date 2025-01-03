const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('xmlEditor', {
  onXmlLoad: (callback) => {
    ipcRenderer.on('xml:load', (event, data) => callback(data));
  },

  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close')
  },

  file: {
    save: (content) => ipcRenderer.invoke('xml:save', content),
    saveAs: (content) => ipcRenderer.invoke('xml:saveAs', content)
  }
}); 