const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath)
}); 