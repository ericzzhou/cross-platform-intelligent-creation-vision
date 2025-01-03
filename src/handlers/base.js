// 基础文件处理器类
class BaseHandler {
  constructor() {
    this.supportedTypes = [];
  }

  async open(filePath) {
    throw new Error('必须实现 open 方法');
  }

  async close() {
    throw new Error('必须实现 close 方法');
  }
}

module.exports = { BaseHandler };