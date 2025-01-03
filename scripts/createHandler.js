const fs = require('fs');
const path = require('path');

// 处理器模板
const templates = {
  main: (name) => `const BaseHandler = require('../../../handlers/base');
const path = require('path');

class ${name}Handler extends BaseHandler {
  async handle(filePath) {
    // 在这里实现文件处理逻辑
    await this.window.loadFile(this.getTemplate());
    this.window.webContents.send('load-file', filePath);
  }

  getTemplate() {
    return path.join(__dirname, 'index.html');
  }
}

module.exports = ${name}Handler;
`,
  // ... 其他模板保持不变
};

function createHandler(name, options = {}) {
  const {
    extensions = [],
    description = `支持查看${name}文件`,
    title = `${name}查看器`
  } = options;

  // 修改目标目录路径
  const handlerDir = path.join(__dirname, '..', 'src', 'renderer', 'handlers', name.toLowerCase());
  // ... 其他代码保持不变
}

// ... 其他代码保持不变 