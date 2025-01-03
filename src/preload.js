const { contextBridge, ipcRenderer } = require('electron');

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('api', {
  // 窗口控制
  minimize: () => {
    console.log('Minimizing window');
    return ipcRenderer.invoke('window-minimize');
  },
  maximize: () => {
    console.log('Maximizing window');
    return ipcRenderer.invoke('window-maximize');
  },
  close: () => {
    console.log('Closing window');
    return ipcRenderer.invoke('window-close');
  },
  onMaximizeChange: (callback) => {
    ipcRenderer.on('window-maximized', (_, isMaximized) => callback(isMaximized));
  },

  // 文件操作
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  readDirectory: (path) => ipcRenderer.invoke('read-directory', path),
  isDirectory: (path) => ipcRenderer.invoke('is-directory', path),
  
  // 系统信息
  platform: process.platform,

  // 添加文件打开监听器
  onFileOpen: (callback) => {
    ipcRenderer.on('open-file', (_, filePath) => callback(filePath));
  },

  // 添加图片处理 API
  processImage: (operation, filePath, options) => 
    ipcRenderer.invoke('image-process', { operation, filePath, options }),

  log: {
    debug: (message, ...args) => 
      ipcRenderer.invoke('log-message', { 
        level: 'DEBUG', 
        message,
        args 
      }),
    info: (message, ...args) => 
      ipcRenderer.invoke('log-message', { 
        level: 'INFO', 
        message,
        args 
      }),
    error: (message, ...args) => 
      ipcRenderer.invoke('log-message', { 
        level: 'ERROR', 
        message,
        args 
      })
  }
}); 