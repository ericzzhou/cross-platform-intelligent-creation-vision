// 基础文件处理器类
class BaseHandler {
  constructor(window) {
    this.window = window;
  }

  // 处理文件的基础方法
  async handle(filePath) {
    throw new Error('必须在子类中实现handle方法');
  }

  // 获取处理器对应的HTML模板
  getTemplate() {
    throw new Error('必须在子类中实现getTemplate方法');
  }
}

module.exports = BaseHandler;