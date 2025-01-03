class HandlerRegistry {
  constructor() {
    this.handlers = new Set();
  }

  register(handler) {
    this.handlers.add(handler);
  }

  findHandler(file) {
    // 只处理图片文件
    for (const handler of this.handlers) {
      if (handler.canHandle(file)) {
        return handler;
      }
    }
    return null;
  }
}

export { HandlerRegistry }; 