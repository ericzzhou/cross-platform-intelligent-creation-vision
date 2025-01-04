const { contextBridge, ipcRenderer } = require('electron');

// 从命令行参数获取通道名称
const channels = JSON.parse(process.argv.find(arg => arg.startsWith('--channels=')).split('=')[1]);

contextBridge.exposeInMainWorld('markdownAPI', {
  // 文件操作
  onFileLoad: (callback) => {
    ipcRenderer.on('file:load', (_, content) => callback(content));
  },
  onError: (callback) => {
    ipcRenderer.on('file:error', (_, error) => callback(error));
  },
  saveFile: (content) => ipcRenderer.invoke(channels.save, content),
  saveFileAs: () => ipcRenderer.invoke(channels.saveAs),
  openFile: () => ipcRenderer.invoke(channels.open),
  getEncoding: () => ipcRenderer.invoke(channels.getEncoding),
  getFileInfo: () => ipcRenderer.invoke(channels.getFileInfo),
  onFileChange: (callback) => {
    ipcRenderer.on('file:change', (_, info) => callback(info));
  },
  setModified: (modified) => ipcRenderer.send(channels.modified, modified),
  
  // 窗口控制
  windowControl: {
    minimize: () => ipcRenderer.invoke(channels.minimize),
    maximize: () => ipcRenderer.invoke(channels.maximize),
    close: () => ipcRenderer.invoke(channels.close)
  },
  
  // 标题更新
  onTitleUpdate: (callback) => {
    ipcRenderer.on('title:update', (_, title) => callback(title));
  },
  
  // 窗口状态
  onMaximizeChange: (callback) => {
    ipcRenderer.on('window:maximize', (_, isMaximized) => callback(isMaximized));
  }
}); 