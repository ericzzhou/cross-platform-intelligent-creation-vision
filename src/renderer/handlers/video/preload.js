const { contextBridge, ipcRenderer } = require('electron');

// 从命令行参数获取处理器 ID 和通道
const handlerId = process.argv.find(arg => arg.startsWith('--handler-id=')).split('=')[1];
const channels = JSON.parse(process.argv.find(arg => arg.startsWith('--channels=')).split('=')[1]);

function handleError(action, err) {
  console.error(`Failed to ${action}:`, err);
}

contextBridge.exposeInMainWorld('videoAPI', {
  // 事件监听
  onVideoLoaded: (callback) => {
    const handler = (_, data) => {
      try {
        callback(data);
      } catch (err) {
        handleError('handle video loaded', err);
      }
    };
    ipcRenderer.on('file:loaded', handler);
    return () => ipcRenderer.removeListener('file:loaded', handler);
  },

  onError: (callback) => {
    const handler = (_, error) => {
      try {
        callback(error);
      } catch (err) {
        handleError('handle error', err);
      }
    };
    ipcRenderer.on('file:error', handler);
    return () => ipcRenderer.removeListener('file:error', handler);
  },

  // 窗口控制
  minimizeWindow: async () => {
    try {
      await ipcRenderer.invoke(channels.minimize);
    } catch (err) {
      handleError('minimize window', err);
    }
  },
  maximizeWindow: async () => {
    try {
      await ipcRenderer.invoke(channels.maximize);
    } catch (err) {
      handleError('maximize window', err);
    }
  },
  closeWindow: async () => {
    try {
      await ipcRenderer.invoke(channels.close);
    } catch (err) {
      handleError('close window', err);
    }
  },
  toggleFullscreen: async () => {
    try {
      await ipcRenderer.invoke(channels.fullscreen);
    } catch (err) {
      handleError('toggle fullscreen', err);
    }
  }
}); 