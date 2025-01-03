const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const handlerManager = require('../handlers/handlerManager');

let mainWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload.js')
    }
  });

  // 在开发环境中加载 Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

// 应用启动时
app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// 监听文件打开请求
ipcMain.on('open-file', (event, filePath) => {
  handleFileOpen(filePath);
});

// 处理文件打开
async function handleFileOpen(filePath) {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload.js')
    }
  });

  try {
    const handler = handlerManager.getHandler(filePath, win);
    await handler.handle(filePath);
  } catch (error) {
    console.error('处理文件时出错:', error);
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
}); 