const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('markdownEditor', {
  onMarkdownLoad: (callback) => {
    ipcRenderer.on('markdown:load', (event, data) => callback(data));
  },

  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close')
  },

  file: {
    save: (content) => ipcRenderer.invoke('markdown:save', content),
    saveAs: (content) => ipcRenderer.invoke('markdown:saveAs', content),
    exportPdf: () => ipcRenderer.invoke('markdown:exportPdf')
  }
}); 