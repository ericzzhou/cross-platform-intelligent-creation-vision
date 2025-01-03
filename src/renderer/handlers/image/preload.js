const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('imageViewer', {
  // 接收图片加载事件
  onImageLoad: (callback) => {
    ipcRenderer.on('image:load', (event, imageData) => callback(imageData));
  },
  
  // 窗口控制
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close')
  },
  
  // 图片操作
  controls: {
    zoomIn: () => ipcRenderer.send('image:zoom-in'),
    zoomOut: () => ipcRenderer.send('image:zoom-out'),
    rotate: () => ipcRenderer.send('image:rotate'),
    reset: () => ipcRenderer.send('image:reset')
  }
}); 