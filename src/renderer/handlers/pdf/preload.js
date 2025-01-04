const { contextBridge, ipcRenderer } = require('electron');

// 从命令行参数获取通道名称
const channels = JSON.parse(process.argv.find(arg => arg.startsWith('--channels=')).split('=')[1]);

contextBridge.exposeInMainWorld('pdfAPI', {
  // 窗口控制
  windowControl: {
    minimize: () => ipcRenderer.invoke(channels.minimize),
    maximize: () => ipcRenderer.invoke(channels.maximize),
    close: () => ipcRenderer.invoke(channels.close)
  },

  // 文件操作
  print: () => ipcRenderer.invoke(channels.print),
  save: () => ipcRenderer.invoke(channels.save),
  getFileInfo: () => ipcRenderer.invoke(channels.getFileInfo),

  // 事件监听
  onFileLoad: (callback) => {
    ipcRenderer.on('file:load', (_, data) => callback(data));
  },
  onError: (callback) => {
    ipcRenderer.on('file:error', (_, error) => callback(error));
  },
  onTitleUpdate: (callback) => {
    ipcRenderer.on('title:update', (_, title) => callback(title));
  },
  onMaximizeChange: (callback) => {
    ipcRenderer.on('window:maximize', (_, isMaximized) => callback(isMaximized));
  },
  onPrintError: (callback) => {
    ipcRenderer.on('print:error', (_, error) => callback(error));
  }
}); 