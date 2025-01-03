const BaseHandler = require('../../../handlers/base');
const path = require('path');
const fs = require('fs').promises;

class TextHandler extends BaseHandler {
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
      const content = await fs.readFile(this.filePath, 'utf8');
      if (this.window && !this.window.isDestroyed()) {
        this.window.webContents.send('file:loaded', {
          content,
          path: this.filePath
        });
      }
    } catch (err) {
      console.error('Failed to load file:', err);
      if (this.window && !this.window.isDestroyed()) {
        this.window.webContents.send('file:error', err.message);
      }
    }
  }

  async handleSave(event, content) {
    try {
      await fs.writeFile(this.filePath, content, 'utf8');
      return true;
    } catch (err) {
      console.error('Failed to save file:', err);
      return false;
    }
  }

  async handleLoad() {
    try {
      const content = await fs.readFile(this.filePath, 'utf8');
      return content;
    } catch (err) {
      console.error('Failed to load file:', err);
      throw err;
    }
  }
}

module.exports = TextHandler; 