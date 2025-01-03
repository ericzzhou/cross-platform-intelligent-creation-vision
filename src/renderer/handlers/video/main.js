const { BrowserWindow } = require('electron');
const path = require('path');
const { BaseHandler } = require('../../../handlers/base');

class VideoHandler extends BaseHandler {
  constructor() {
    super();
    this.supportedTypes = ['.mp4', '.webm', '.mkv', '.avi', '.mov'];
    this.window = null;
  }

  async open(filePath) {
    this.window = new BrowserWindow({
      width: 960,
      height: 600,
      frame: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });

    await this.window.loadFile(path.join(__dirname, 'index.html'));

    this.window.webContents.send('video:load', {
      path: filePath,
      name: path.basename(filePath)
    });

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

module.exports = VideoHandler; 