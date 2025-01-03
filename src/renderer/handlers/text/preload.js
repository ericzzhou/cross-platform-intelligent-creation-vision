const { contextBridge, ipcRenderer } = require('electron');

// 从命令行参数获取处理器 ID 和通道
const handlerId = process.argv.find(arg => arg.startsWith('--handler-id=')).split('=')[1];
const channels = JSON.parse(process.argv.find(arg => arg.startsWith('--channels=')).split('=')[1]);

// 添加错误处理
function handleError(action, err) {
  console.error(`Failed to ${action}:`, err);
  // 可以在这里添加错误提示UI
}

contextBridge.exposeInMainWorld('textAPI', {
  // 文件操作
  getContent: async () => {
    try {
      return await ipcRenderer.invoke(channels.load);
    } catch (err) {
      handleError('load content', err);
      return null;
    }
  },
  saveContent: async (content) => {
    try {
      return await ipcRenderer.invoke(channels.save, content);
    } catch (err) {
      handleError('save content', err);
      return false;
    }
  },
  
  // 事件监听
  onFileLoaded: (callback) => {
    const handler = (_, data) => {
      try {
        callback(data);
      } catch (err) {
        handleError('handle file loaded', err);
      }
    };
    ipcRenderer.on('file:loaded', handler);
    return () => ipcRenderer.removeListener('file:loaded', handler);
  },
  onFileError: (callback) => {
    const handler = (_, error) => {
      try {
        callback(error);
      } catch (err) {
        handleError('handle file error', err);
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
  }
}); 