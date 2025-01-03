const { BrowserWindow } = require('electron');
const path = require('path');
const { BaseHandler } = require('../../../handlers/base');

class ImageHandler extends BaseHandler {
  constructor() {
    super();
    this.supportedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    this.window = null;
  }

  async open(filePath) {
    // 创建新窗口
    this.window = new BrowserWindow({
      width: 800,
      height: 600,
      frame: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });

    // 加载图片查看器界面
    await this.window.loadFile(path.join(__dirname, 'index.html'));

    // 发送文件路径到渲染进程
    this.window.webContents.send('image:load', {
      path: filePath,
      name: path.basename(filePath)
    });

    // 处理窗口关闭
    this.window.on('closed', () => {
      this.window = null;
    });
  }

  async close() {
    if (this.window) {
      this.window.close();
      this.window = null;
    }
  }
}

module.exports = ImageHandler; 