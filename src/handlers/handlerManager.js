const path = require('path');
const fs = require('fs').promises;

class HandlerManager {
  constructor() {
    this.handlers = new Map();
  }

  async loadHandlers() {
    const handlersPath = path.join(__dirname, '../renderer/handlers');
    const entries = await fs.readdir(handlersPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        try {
          const configPath = path.join(handlersPath, entry.name, 'config.json');
          const config = require(configPath);
          
          if (config.type && config.supportedExtensions) {
            const HandlerClass = require(path.join(handlersPath, entry.name, 'main.js'));
            this.handlers.set(config.type, {
              config,
              handler: new HandlerClass()
            });
            
            console.log(`已加载处理器: ${config.type}`);
          }
        } catch (err) {
          console.error(`加载处理器失败 ${entry.name}:`, err);
        }
      }
    }
  }

  getHandlerForFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    for (const [_, { config, handler }] of this.handlers) {
      if (config.supportedExtensions.includes(ext)) {
        return handler;
      }
    }
    
    return null;
  }
}

// 创建单例实例并导出
const handlerManager = new HandlerManager();
module.exports = handlerManager; 