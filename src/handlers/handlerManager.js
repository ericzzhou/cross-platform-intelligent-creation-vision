/**
 * 处理器管理器 - 单例模式
 * 负责管理所有文件处理器的加载、创建和生命周期
 */
const fs = require('fs').promises;
const path = require('path');

class HandlerManager {
  constructor() {
    this.handlers = new Map();
    this.typeMap = new Map();
    this.instances = new Map();
  }

  async loadHandlers() {
    const handlersPath = path.join(__dirname, '../renderer/handlers');
    const dirs = await fs.readdir(handlersPath);
    
    for (const dir of dirs) {
      const configPath = path.join(handlersPath, dir, 'config.json');
      try {
        const stat = await fs.stat(path.join(handlersPath, dir));
        if (!stat.isDirectory()) continue;

        const configExists = await fs.access(configPath)
          .then(() => true)
          .catch(() => false);
        if (!configExists) continue;

        const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
        if (!config.extensions || !Array.isArray(config.extensions)) continue;

        const mainPath = path.join(handlersPath, dir, 'main.js');
        const HandlerClass = require(mainPath);
        
        // 存储处理器类
        this.handlers.set(dir, HandlerClass);
        
        // 注册文件类型关联
        config.extensions.forEach(ext => {
          this.typeMap.set(ext.toLowerCase(), dir);
        });
      } catch (err) {
        console.error(`Failed to load handler: ${dir}`, err);
      }
    }
  }

  async createHandler(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const type = this.typeMap.get(ext);
    if (!type) return null;

    const HandlerClass = this.handlers.get(type);
    if (!HandlerClass) return null;

    const handler = new HandlerClass(filePath);
    const instanceId = handler.instanceId;
    
    // 存储实例
    this.instances.set(instanceId, handler);
    
    // 设置实例销毁时的清理
    handler.window?.on('closed', () => {
      this.instances.delete(instanceId);
    });

    return handler;
  }

  getHandler(instanceId) {
    return this.instances.get(instanceId);
  }

  closeAll() {
    for (const handler of this.instances.values()) {
      handler.close();
    }
    this.instances.clear();
  }
}

// 导出单例实例
module.exports = new HandlerManager(); 