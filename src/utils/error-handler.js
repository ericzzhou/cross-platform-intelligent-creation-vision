/**
 * 统一的错误处理类
 */
export class ErrorHandler {
  static handle(error, context = '') {
    console.error(`Error in ${context}:`, error);
    
    let message = '操作失败';
    if (error.code) {
      switch (error.code) {
        case 'ENOENT':
          message = '文件不存在';
          break;
        case 'EACCES':
          message = '没有访问权限';
          break;
        default:
          message = `错误: ${error.message || error}`;
      }
    }

    // 如果有UI，可以显示错误消息
    if (typeof window !== 'undefined') {
      this.showErrorMessage(message);
    }
  }

  static showErrorMessage(message) {
    // 创建错误提示元素
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;

    // 添加到页面
    document.body.appendChild(errorDiv);

    // 3秒后自动移除
    setTimeout(() => {
      errorDiv.remove();
    }, 3000);
  }
} 