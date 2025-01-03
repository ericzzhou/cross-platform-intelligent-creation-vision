const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close')
  },
  handlers: {
    openFile: (filePath) => ipcRenderer.invoke('handler:openFile', filePath),
    getHandlerInfo: (fileType) => ipcRenderer.invoke('handler:getInfo', fileType)
  }
}); 