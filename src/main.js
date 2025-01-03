const { app, BrowserWindow,ipcMain } = require('electron');
const handlerManager = require('./handlers/handlerManager');

// 应用启动时
app.whenReady().then(() => {
  // 1. handlerManager 会自动扫描和加载所有处理器
  // 2. 创建主窗口(如果有的话)
});

// 监听文件打开请求
ipcMain.on('open-file', (event, filePath) => {
  handleFileOpen(filePath);
});

// 处理文件打开
async function handleFileOpen(filePath) {
  // 1. 创建新窗口
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 2. 获取对应的处理器并处理文件
  const handler = handlerManager.getHandler(filePath, win);
  await handler.handle(filePath);
} 