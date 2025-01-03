const BaseHandler = require('../../../handlers/base');
const path = require('path');
const fs = require('fs').promises;

class VideoHandler extends BaseHandler {
  async initialize() {
    const channels = this.setupIPC();
    
    this.createWindow({
      width: 800,
      height: 600,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        additionalArguments: [
          `--handler-id=${this.instanceId}`,
          `--channels=${JSON.stringify(channels)}`
        ]
      }
    });

    await this.window.loadFile(path.join(__dirname, 'index.html'));
    await this.load();
  }

  async load() {
    try {
      if (this.window && !this.window.isDestroyed()) {
        this.window.webContents.send('file:loaded', {
          path: this.filePath,
          name: path.basename(this.filePath)
        });
      }
    } catch (err) {
      console.error('Failed to load video:', err);
      if (this.window && !this.window.isDestroyed()) {
        this.window.webContents.send('file:error', err.message);
      }
    }
  }

  // 添加视频特定的 IPC 处理方法
  setupIPC() {
    const channels = super.setupIPC();

    // 处理全屏切换
    ipcMain.handle(`video:fullscreen:${this.instanceId}`, () => {
      if (this.window && !this.window.isDestroyed()) {
        if (this.window.isFullScreen()) {
          this.window.setFullScreen(false);
        } else {
          this.window.setFullScreen(true);
        }
      }
    });

    return {
      ...channels,
      fullscreen: `video:fullscreen:${this.instanceId}`
    };
  }
}

module.exports = VideoHandler; 