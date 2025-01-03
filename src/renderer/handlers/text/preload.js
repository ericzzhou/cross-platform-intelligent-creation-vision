const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('textEditor', {
  onTextLoad: (callback) => {
    ipcRenderer.on('text:load', (event, textData) => callback(textData));
  },

  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close')
  },

  file: {
    save: (content) => ipcRenderer.invoke('text:save', content),
    saveAs: (content) => ipcRenderer.invoke('text:saveAs', content)
  }
}); 