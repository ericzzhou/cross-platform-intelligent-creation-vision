const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const handlerManager = require('../handlers/handlerManager');

class App {
  constructor() {
    this.mainWindow = null;
    this.handlerManager = handlerManager;
  }

  async initialize() {
    try {
      await this.handlerManager.loadHandlers();
      this.createWindow();
      this.setupIPC();
    } catch (err) {
      console.error('Failed to initialize app:', err);
      app.quit();
    }
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      frame: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });

    this.mainWindow.loadFile('src/renderer/index.html');
  }

  setupIPC() {
    ipcMain.handle('window:minimize', () => this.mainWindow.minimize());
    ipcMain.handle('window:maximize', () => {
      if (this.mainWindow.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow.maximize();
      }
    });
    ipcMain.handle('window:close', () => this.mainWindow.close());
    
    // 添加文件处理相关的 IPC 处理
    ipcMain.handle('file:open', async (_, filePath) => {
      const handler = await this.handlerManager.createHandler(filePath);
      if (handler) {
        await handler.initialize();
        return handler.instanceId;
      }
      return null;
    });
  }
}

const application = new App();

app.whenReady().then(() => {
  application.initialize();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 当应用退出时，关闭所有处理器窗口
app.on('before-quit', () => {
  handlerManager.closeAll();
}); 