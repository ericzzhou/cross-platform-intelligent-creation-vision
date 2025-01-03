const { BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { BaseHandler } = require('../../../handlers/base');

class XmlHandler extends BaseHandler {
  constructor() {
    super();
    this.supportedTypes = ['.xml', '.svg', '.xhtml', '.xsl', '.xsd'];
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
      this.window.webContents.send('xml:load', {
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
}

module.exports = XmlHandler; 