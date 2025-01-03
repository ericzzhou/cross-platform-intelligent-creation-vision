const BaseHandler = require('../../../handlers/base');
const path = require('path');
const fs = require('fs').promises;
const { ipcMain } = require('electron');

class TextHandler extends BaseHandler {
  constructor(filePath) {
    super(filePath);
    this.ipc = ipcMain;
    this.filePath = filePath;
  }

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
      if (!this.filePath) {
        throw new Error('No file path specified');
      }

      const content = await fs.readFile(this.filePath, 'utf8');
      if (this.window && !this.window.isDestroyed()) {
        this.window.webContents.send('file:load', content);
      }
    } catch (error) {
      console.error('加载文件失败:', error);
      if (this.window && !this.window.isDestroyed()) {
        this.window.webContents.send('file:error', error.message);
      }
    }
  }

  async handleSave(event, content) {
    try {
      if (!this.filePath) {
        throw new Error('No file path specified');
      }

      await fs.writeFile(this.filePath, content, 'utf8');
      return true;
    } catch (error) {
      console.error('保存文件失败:', error);
      throw error;
    }
  }

  setupIPC() {
    const channels = super.setupIPC();
    
    this.ipc.handle('file:save', this.handleSave.bind(this));
    
    return channels;
  }
}

module.exports = TextHandler; 