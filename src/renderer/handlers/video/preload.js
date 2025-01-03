const { contextBridge, ipcRenderer } = require('electron');

// 获取实例 ID
const instanceId = new URLSearchParams(window.location.search).get('instanceId');

// 视频播放器 API
contextBridge.exposeInMainWorld('videoAPI', {
  // 加载视频
  loadVideo: (filePath) => {
    return ipcRenderer.invoke(`video:load:${instanceId}`, filePath);
  },

  // 保存截图
  saveScreenshot: (data, name) => {
    return ipcRenderer.invoke(`video:screenshot:${instanceId}`, { data, name });
  },

  // 窗口控制
  minimizeWindow: () => {
    ipcRenderer.send('window:minimize', instanceId);
  },

  maximizeWindow: () => {
    ipcRenderer.send('window:maximize', instanceId);
  },

  closeWindow: () => {
    ipcRenderer.send('window:close', instanceId);
  },

  // 错误处理
  onError: (callback) => {
    ipcRenderer.on(`video:error:${instanceId}`, (event, message) => {
      callback(message);
    });
  }
});

// 禁用右键菜单
window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
}); 