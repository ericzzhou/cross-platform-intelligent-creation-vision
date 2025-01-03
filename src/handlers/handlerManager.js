const fs = require('fs');
const path = require('path');

class HandlerManager {
  constructor() {
    this.handlers = new Map();
    this.handlersDir = path.join(__dirname, '..', 'renderer', 'handlers');
    this.loadHandlers();
  }

  // 动态加载所有处理器
  loadHandlers() {
    try {
      // 读取 handlers 目录下的所有文件夹
      const entries = fs.readdirSync(this.handlersDir, { withFileTypes: true });
      
      entries.forEach(entry => {
        // 跳过非目录和特殊文件
        if (!entry.isDirectory() || entry.name === 'base' || entry.name.startsWith('.')) {
          return;
        }

        const mainPath = path.join(this.handlersDir, entry.name, 'main.js');
        
        // 检查处理器文件是否存在
        if (fs.existsSync(mainPath)) {
          try {
            // 动态导入处理器
            const Handler = require(mainPath);
            
            // 读取处理器配置文件(如果存在)
            const configPath = path.join(this.handlersDir, entry.name, 'config.json');
            let extensions = [];
            
            if (fs.existsSync(configPath)) {
              const config = require(configPath);
              extensions = config.extensions || [];
            } else {
              // 如果没有配置名作为扩展名
              extensions = [`.${entry.name}`];
            }

            // 注册处理器支持的所有文件扩展名
            extensions.forEach(ext => {
              this.handlers.set(ext.toLowerCase(), Handler);
              console.log(`已注册处理器 ${entry.name} 支持文件类型: ${ext}`);
            });
          } catch (error) {
            console.error(`加载处理器 ${entry.name} 失败:`, error);
          }
        }
      });
    } catch (error) {
      console.error('加载处理器时出错:', error);
    }
  }

  getHandler(filePath, window) {
    const ext = path.extname(filePath).toLowerCase();
    const HandlerClass = this.handlers.get(ext);
    
    if (!HandlerClass) {
      throw new Error(`未找到文件类型 ${ext} 的处理器`);
    }

    return new HandlerClass(window);
  }
}

module.exports = new HandlerManager(); 