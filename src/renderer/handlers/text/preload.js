const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('textAPI', {
  onFileLoad: (callback) => {
    ipcRenderer.on('file:load', (_, content) => callback(content));
  },
  onError: (callback) => {
    ipcRenderer.on('file:error', (_, error) => callback(error));
  },
  saveFile: (content) => ipcRenderer.invoke('file:save', content)
}); 