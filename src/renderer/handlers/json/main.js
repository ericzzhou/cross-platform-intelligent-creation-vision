const { BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { BaseHandler } = require('../../../handlers/base');

class JsonHandler extends BaseHandler {
  constructor() {
    super();
    this.supportedTypes = ['.json'];
    this.window = null;
    this.currentFile = null;
  }

  async open(filePath) {
    this.currentFile = filePath;

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

    await this.window.loadFile(path.join(__dirname, 'index.html'));

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      this.window.webContents.send('json:load', {
        path: filePath,
        name: path.basename(filePath),
        content: content
      });
    } catch (err) {
      dialog.showErrorBox('错误', `无法读取文件: ${err.message}`);
    }

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

  async handleSchemaOpen() {
    const result = await dialog.showOpenDialog(this.window, {
      properties: ['openFile'],
      filters: [
        { name: 'JSON Schema', extensions: ['json', 'schema.json'] }
      ]
    });

    if (result.canceled || !result.filePaths.length) {
      return { success: false };
    }

    try {
      const schemaPath = result.filePaths[0];
      const schema = JSON.parse(
        await fs.readFile(schemaPath, 'utf-8')
      );
      return {
        success: true,
        schema,
        name: path.basename(schemaPath)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }
}

module.exports = JsonHandler; 