const BaseHandler = require('../../../handlers/base');
const path = require('path');
const fs = require('fs').promises;

class ImageHandler extends BaseHandler {
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
      // 读取图片文件为 base64
      const imageBuffer = await fs.readFile(this.filePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.getMimeType(path.extname(this.filePath));
      
      if (this.window && !this.window.isDestroyed()) {
        this.window.webContents.send('file:loaded', {
          data: `data:${mimeType};base64,${base64Image}`,
          path: this.filePath,
          name: path.basename(this.filePath)
        });
      }
    } catch (err) {
      console.error('Failed to load image:', err);
      if (this.window && !this.window.isDestroyed()) {
        this.window.webContents.send('file:error', err.message);
      }
    }
  }

  getMimeType(ext) {
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.tiff': 'image/tiff'
    };
    return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
  }
}

module.exports = ImageHandler; 