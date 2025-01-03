const BaseHandler = require('../../../handlers/base');
const path = require('path');

class ImageHandler extends BaseHandler {
  async handle(filePath) {
    const imageUrl = `file://${filePath}`;
    await this.window.loadFile(this.getTemplate());
    this.window.webContents.send('load-image', imageUrl);
  }

  getTemplate() {
    return path.join(__dirname, 'index.html');
  }
}

module.exports = ImageHandler; 