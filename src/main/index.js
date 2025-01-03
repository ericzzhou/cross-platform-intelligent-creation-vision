const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const handlerManager = require('../handlers/handlerManager');

async function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(async () => {
  // 加载所有处理器
  await handlerManager.loadHandlers();
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 处理文件打开
ipcMain.handle('open-file', async (_, filePath) => {
  const handler = handlerManager.getHandlerForFile(filePath);
  if (handler) {
    await handler.open(filePath);
    return true;
  }
  return false;
});

// 处理窗口控制
ipcMain.handle('window:minimize', (event) => {
  BrowserWindow.fromWebContents(event.sender).minimize();
});

ipcMain.handle('window:maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win.isMaximized() ? win.unmaximize() : win.maximize();
});

ipcMain.handle('window:close', (event) => {
  BrowserWindow.fromWebContents(event.sender).close();
});

// 处理文件保存
ipcMain.handle('xml:save', async (event, content) => {
  // 实现保存逻辑
});

ipcMain.handle('xml:saveAs', async (event, content) => {
  // 实现另存为逻辑
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
}); 