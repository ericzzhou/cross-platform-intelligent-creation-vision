const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  
  // 文件处理
  openFile: (filePath) => ipcRenderer.invoke('file:open', filePath),
  
  // 拖放处理
  handleDrop: (callback) => {
    ipcRenderer.on('file:dropped', callback);
  }
}); 