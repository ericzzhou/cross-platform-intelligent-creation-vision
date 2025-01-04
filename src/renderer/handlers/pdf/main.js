const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const BaseHandler = require('../../../handlers/base');

class PDFHandler extends BaseHandler {
  constructor(filePath) {
    super(filePath);
    this.ipc = ipcMain;
    this.filePath = filePath;
    this.encoding = 'utf8';
  }

  getChannelName(action) {
    return `pdf:${action}:${this.instanceId}`;
  }

  async initialize() {
    const channels = this.setupIPC();
    
    this.window = new BrowserWindow({
        width: 1024,
        height: 768,
        minWidth: 800,
        minHeight: 600,
        frame: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            additionalArguments: [
            `--handler-id=${this.instanceId}`,
            `--channels=${JSON.stringify(channels)}`
            ]
        }
    });

    // 只在 PDF 处理器窗口打开开发者工具
    // if (process.env.NODE_ENV === 'development') {
    //   this.window.webContents.openDevTools();
    // }

    // 监听窗口状态变化
    this.window.on('maximize', () => {
      if (!this.window.isDestroyed()) {
        this.window.webContents.send('window:maximize', true);
      }
    });

    this.window.on('unmaximize', () => {
      if (!this.window.isDestroyed()) {
        this.window.webContents.send('window:maximize', false);
      }
    });

    await this.window.loadFile(path.join(__dirname, 'index.html'));

    if (this.filePath) {
      await this.load();
    }
  }

  async load() {
    try {
      if (!this.filePath) return;
      
      const buffer = await fs.readFile(this.filePath);
      const base64Data = buffer.toString('base64');
      
      if (this.window && !this.window.isDestroyed()) {
        this.window.webContents.send('file:load', {
          data: base64Data,
          path: this.filePath
        });
        
        // 更新窗口标题
        const fileName = path.basename(this.filePath);
        this.window.webContents.send('title:update', fileName);
      }
    } catch (error) {
      console.error('Error loading PDF:', error);
      if (this.window && !this.window.isDestroyed()) {
        this.window.webContents.send('file:error', error.message);
      }
    }
  }

  async handleSave(event, content) {
    try {
      if (!this.filePath) return false;
      await fs.writeFile(this.filePath, content);
      return true;
    } catch (error) {
      console.error('Error saving PDF:', error);
      return false;
    }
  }

  // 实现 BaseHandler 的其他方法
  getChannels() {
    const baseChannels = super.getChannels();
    return {
      ...baseChannels,
      print: `pdf:print:${this.instanceId}`,
      getFileInfo: `pdf:getFileInfo:${this.instanceId}`
    };
  }

  setupIPC() {
    const channels = super.setupIPC();
    
    // 添加 PDF 特有的 IPC 处理
    this.ipc.handle(channels.print, () => this.handlePrint());
    this.ipc.handle(channels.getFileInfo, () => this.getFileInfo());
    
    return channels;
  }

  async handlePrint() {
    if (!this.window || this.window.isDestroyed()) return;
    
    try {
      await this.window.webContents.print({
        silent: false,
        printBackground: true,
        deviceName: ''
      });
    } catch (error) {
      console.error('打印失败:', error);
      this.window.webContents.send('print:error', error.message);
    }
  }

  async getFileInfo() {
    try {
      if (!this.filePath) return null;
      
      const stats = await fs.stat(this.filePath);
      return {
        path: this.filePath,
        size: stats.size,
        mtime: stats.mtime
      };
    } catch (error) {
      console.error('获取文件信息失败:', error);
      return null;
    }
  }
}

module.exports = PDFHandler; 