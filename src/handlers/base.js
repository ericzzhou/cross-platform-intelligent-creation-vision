const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

class BaseHandler {
  constructor(filePath) {
    this.filePath = filePath;
    this.window = null;
    // 为每个实例生成唯一的 ID
    this.instanceId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async initialize() {
    // 子类必须实现
    throw new Error('Must implement initialize method');
  }

  async load() {
    // 子类必须实现
    throw new Error('Must implement load method');
  }

  setupIPC() {
    const channels = this.getChannels();
    
    // 文件操作
    ipcMain.handle(channels.save, this.handleSave.bind(this));
    ipcMain.handle(channels.load, this.handleLoad.bind(this));

    // 窗口控制
    ipcMain.handle(channels.minimize, (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        win.minimize();
      }
    });

    ipcMain.handle(channels.maximize, (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        if (win.isMaximized()) {
          win.unmaximize();
        } else {
          win.maximize();
        }
      }
    });

    ipcMain.handle(channels.close, (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        win.close();
      }
    });

    return channels;
  }

  // 获取实例特定的 IPC 通道名称
  getChannels() {
    return {
      save: `file:save:${this.instanceId}`,
      load: `file:load:${this.instanceId}`,
      minimize: `window:minimize:${this.instanceId}`,
      maximize: `window:maximize:${this.instanceId}`,
      close: `window:close:${this.instanceId}`,
    };
  }

  // 默认的保存处理方法
  async handleSave(event, content) {
    throw new Error('Must implement handleSave method');
  }

  // 默认的加载处理方法
  async handleLoad(event) {
    throw new Error('Must implement handleLoad method');
  }

  // 创建处理器窗口
  createWindow(options = {}) {
    const channels = this.getChannels();
    
    this.window = new BrowserWindow({
      width: 800,
      height: 600,
      frame: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        additionalArguments: [
          `--handler-id=${this.instanceId}`,
          `--channels=${JSON.stringify(channels)}`
        ]
      },
      ...options
    });

    // 添加窗口关闭事件处理
    this.window.on('closed', () => {
      const channels = this.getChannels();
      // 清理该窗口的 IPC 处理器
      Object.values(channels).forEach(channel => {
        ipcMain.removeHandler(channel);
      });
      this.window = null;
    });
  }

  // 关闭窗口方法
  close() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
      this.window = null;
    }
  }
}

module.exports = BaseHandler;