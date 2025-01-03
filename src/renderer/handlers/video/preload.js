const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('videoPlayer', {
  onVideoLoad: (callback) => {
    ipcRenderer.on('video:load', (event, videoData) => callback(videoData));
  },
  
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close')
  },
  
  controls: {
    play: () => ipcRenderer.send('video:play'),
    pause: () => ipcRenderer.send('video:pause'),
    seek: (time) => ipcRenderer.send('video:seek', time),
    volume: (level) => ipcRenderer.send('video:volume', level)
  }
}); 