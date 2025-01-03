const { app, BrowserWindow, ipcMain, protocol, Menu } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const sharp = require('sharp');
const logger = require('../utils/logger');

// 存储主窗口引用
let mainWindow = null;
let pendingFilePath = null;

// 确保在 app ready 之前注册协议
protocol.registerSchemesAsPrivileged([
  { scheme: 'file', privileges: { secure: true, standard: true } }
]);

// 提取公共方法：处理文件路径
function findValidImagePath(args) {
  logger.debug('Processing args for valid image path:', args);
  logger.debug('Args type:', typeof args, 'Is array:', Array.isArray(args));
  
  // 处理参数格式
  if (!Array.isArray(args)) {
    logger.debug('Args is not an array, converting to array');
    args = [args];
  }
  
  // 如果参数是数组的数组，取第一个数组
  if (args.length > 0 && Array.isArray(args[0])) {
    logger.debug('First arg is an array, unwrapping');
    args = args[0];
  }

  // 打印处理后的参数
  logger.debug('Processed args after unwrapping:', args);

  // 查找第一个有效的图片文件路径
  for (const arg of args) {
    logger.debug('Checking arg:', arg);
    if (typeof arg === 'string' && 
        !arg.startsWith('--') && 
        !arg.endsWith('.exe') && 
        arg.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
      logger.debug('Found valid image file path:', arg);
      return arg;
    }
  }
  
  logger.debug('No valid image file path found in args');
  return null;
}

// 提取公共方法：发送文件路径到渲染进程
function sendFilePathToRenderer(filePath) {
  if (!filePath) {
    logger.debug('Invalid file path');
    return;
  }

  if (!mainWindow) {
    logger.debug('No window available, storing path for later:', filePath);
    pendingFilePath = filePath;
    return;
  }

  logger.debug('Attempting to send file path to renderer:', filePath);
  
  const sendPath = () => {
    logger.debug('Actually sending file path to renderer');
    mainWindow.webContents.send('open-file', filePath);
    pendingFilePath = null;
  };

  if (mainWindow.webContents.isLoading()) {
    logger.debug('Window is still loading, waiting...');
    mainWindow.webContents.once('did-finish-load', () => {
      logger.debug('Window finished loading, sending after delay');
      setTimeout(sendPath, 1000);
    });
  } else {
    logger.debug('Window is ready, sending immediately');
    setTimeout(sendPath, 100);
  }
}

// 处理命令行参数
function handleCommandLineArgs() {
  logger.debug('=== Command Line Arguments Processing Start ===');
  logger.debug('Raw argv:', process.argv);
  
  const startIndex = process.defaultApp ? 2 : 1;
  let args = process.argv.slice(startIndex);
  logger.debug('Initial sliced args:', args);
  
  const filePath = findValidImagePath(args);
  if (filePath) {
    logger.debug('Found file path to open:', filePath);
    sendFilePathToRenderer(filePath);
  }
  
  logger.debug('=== Command Line Arguments Processing End ===');
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, '../preload.js')
    }
  });

  // 防止默认的文件拖放行为
  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  // 移除菜单栏
  Menu.setApplicationMenu(null);

  // 设置 IPC 处理器
  setupIpcHandlers();

  // 等待窗口加载完成
  try {
    if (process.env.NODE_ENV === 'development') {
      await mainWindow.loadURL('http://localhost:5173');
      mainWindow.webContents.openDevTools();
    } else {
      const indexPath = path.join(__dirname, '../../dist/index.html');
      await mainWindow.loadFile(indexPath);
    }
    
    logger.debug('Window loaded successfully');

    // 添加 dom-ready 事件监听器
    mainWindow.webContents.once('dom-ready', () => {
      logger.debug('DOM is ready');
      if (pendingFilePath) {
        logger.debug('Found pending file path, sending it now');
        sendFilePathToRenderer(pendingFilePath);
      }
    });

  } catch (error) {
    logger.error('Error loading window:', error);
  }
}

// 添加第二个实例启动处理
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    logger.debug('=== Second Instance Processing Start ===');
    logger.debug('Second instance detected');
    logger.debug('Command line:', commandLine);
    logger.debug('Working directory:', workingDirectory);
    
    const startIndex = process.defaultApp ? 2 : 1;
    const args = commandLine.slice(startIndex);
    logger.debug('Processed second instance args:', args);
    
    const filePath = findValidImagePath(args);
    if (filePath) {
      logger.debug('Found file path in second instance:', filePath);
      sendFilePathToRenderer(filePath);
    }

    // 聚焦主窗口
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        logger.debug('Restoring minimized window');
        mainWindow.restore();
      }
      logger.debug('Focusing window');
      mainWindow.focus();
    } else {
      logger.debug('Main window not found');
    }
    
    logger.debug('=== Second Instance Processing End ===');
  });

  app.whenReady().then(() => {
    // 注册文件协议
    protocol.registerFileProtocol('file', (request, callback) => {
      const pathname = decodeURIComponent(request.url.replace('file:///', ''));
      callback(pathname);
    });

    createWindow();
    
    // 在窗口创建后处理命令行参数
    handleCommandLineArgs();
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
}); 

function setupIpcHandlers() {
  // 窗口控制
  ipcMain.handle('window-minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle('window-close', () => {
    mainWindow?.close();
  });

  // 监听窗口最大化状态变化
  mainWindow?.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized', true);
  });

  mainWindow?.on('unmaximize', () => {
    mainWindow?.webContents.send('window-maximized', false);
  });

  // 图片处理相关的 IPC 处理器
  ipcMain.handle('image-process', async (event, { operation, filePath, options }) => {
    try {
      const imageBuffer = await fs.readFile(filePath);
      let processedImage = sharp(imageBuffer);

      switch (operation) {
        case 'rotate':
          processedImage = processedImage.rotate(options.angle);
          break;
        case 'resize':
          processedImage = processedImage.resize(options.width, options.height, {
            fit: 'inside',
            withoutEnlargement: true
          });
          break;
      }

      const outputBuffer = await processedImage.toBuffer();
      return outputBuffer.toString('base64');
    } catch (error) {
      console.error('Image processing error:', error);
      throw error;
    }
  });

  // 添加文件读取处理器
  ipcMain.handle('read-file', async (event, filePath) => {
    try {
      logger.debug('Attempting to read file:', filePath);
      const buffer = await fs.readFile(filePath);
      logger.debug('File read successfully, size:', buffer.length);
      return buffer;
    } catch (error) {
      logger.error('Error reading file:', error);
      throw error;
    }
  });

  // 修改日志处理器
  ipcMain.handle('log-message', async (event, { level, message, args }) => {
    try {
      logger[level.toLowerCase()](message, ...args);
    } catch (error) {
      console.error('Error in log handler:', error);
    }
  });
} 