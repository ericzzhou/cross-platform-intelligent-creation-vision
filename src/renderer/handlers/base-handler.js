export class BaseHandler {
  constructor() {
    if (this.constructor === BaseHandler) {
      throw new Error('BaseHandler cannot be instantiated directly');
    }
  }

  // 检查是否支持该文件类型
  canHandle(file) {
    throw new Error('canHandle method must be implemented');
  }

  // 创建查看器
  createViewer(file, container) {
    throw new Error('createViewer method must be implemented');
  }

  // 销毁查看器
  destroyViewer() {
    throw new Error('destroyViewer method must be implemented');
  }
} 