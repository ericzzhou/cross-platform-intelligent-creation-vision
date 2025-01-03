const BaseHandler = require('../../../handlers/base');
const path = require('path');
const fs = require('fs').promises;
const { ipcMain, dialog, Menu } = require('electron');
const chardet = require('chardet');
const iconv = require('iconv-lite');  // 需要安装这个包

class TextHandler extends BaseHandler {
  constructor(filePath) {
    super(filePath);
    this.ipc = ipcMain;
    this.filePath = filePath;
    this.encoding = 'utf8';
    this.modified = false;  // 添加修改状态跟踪
  }

  // 获取实例特定的通道名称
  getChannelName(action) {
    return `text:${action}:${this.instanceId}`;
  }

  async initialize() {
    const channels = this.setupIPC();
    
    this.createWindow({
      width: 800,
      height: 600,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        additionalArguments: [
          `--handler-id=${this.instanceId}`,
          `--channels=${JSON.stringify(channels)}`
        ]
      }
    });

    // 添加窗口关闭前的保存检查
    this.window.on('close', async (e) => {
      if (this.modified) {  // 使用实例的 modified 状态而不是通过 JS 执行
        e.preventDefault();
        const choice = await dialog.showMessageBox(this.window, {
          type: 'question',
          buttons: ['保存', '不保存', '取消'],
          title: '保存文件',
          message: '文件已修改，是否保存？',
          defaultId: 0,
          cancelId: 2
        });
        
        try {
          if (choice.response === 0) {
            // 保存
            if (!this.filePath) {
              // 如果没有文件路径，先执行另存为
              const saved = await this.saveFileAs();
              if (!saved) return; // 用户取消了另存为操作
            } else {
              await this.handleSave();
            }
            this.window.destroy();
          } else if (choice.response === 1) {
            // 不保存
            this.window.destroy();
          }
          // 取消则不做任何操作
        } catch (error) {
          await dialog.showMessageBox(this.window, {
            type: 'error',
            title: '保存失败',
            message: '保存文件时发生错误：' + error.message
          });
        }
      }
    });

    this.createMenu();
    await this.window.loadFile(path.join(__dirname, 'index.html'));
    await this.load();
  }

  createMenu() {
    const template = [
      {
        label: '文件',
        submenu: [
          {
            label: '打开',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.openFile()
          },
          {
            label: '保存',
            accelerator: 'CmdOrCtrl+S',
            click: () => this.handleSave()
          },
          {
            label: '另存为',
            accelerator: 'CmdOrCtrl+Shift+S',
            click: () => this.saveFileAs()
          },
          { type: 'separator' },
          {
            label: '退出',
            accelerator: 'Alt+F4',
            click: () => this.window.close()
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    this.window.setMenu(menu);
  }

  async detectEncoding(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      const detected = chardet.detect(buffer);
      
      // 将检测到的编码映射到 Node.js 支持的编码
      const encodingMap = {
        'windows-1252': 'latin1',
        'ascii': 'utf8',
        'utf-8': 'utf8',
        'utf-16le': 'utf16le',
        'utf-16be': 'utf16be',
        'iso-8859-1': 'latin1'
      };

      return encodingMap[detected.toLowerCase()] || 'utf8';
    } catch (error) {
      console.error('检测文件编码失败:', error);
      return 'utf8';
    }
  }

  async openFile() {
    const result = await dialog.showOpenDialog(this.window, {
      filters: [
        { name: 'Text Files', extensions: ['txt', 'log', 'ini', 'conf'] }
      ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      this.filePath = result.filePaths[0];
      await this.load();
    }
  }

  async saveFileAs() {
    const result = await dialog.showSaveDialog(this.window, {
      filters: [
        { name: 'Text Files', extensions: ['txt', 'log', 'ini', 'conf'] }
      ]
    });

    if (!result.canceled) {
      this.filePath = result.filePath;
      await this.handleSave();
      return true;
    }
    return false;
  }

  async load() {
    try {
      if (!this.filePath) {
        throw new Error('No file path specified');
      }

      // 先读取文件内容为 Buffer
      const buffer = await fs.readFile(this.filePath);
      
      // 检测编码
      this.encoding = await this.detectEncoding(this.filePath);
      
      // 使用 iconv-lite 解码内容
      const content = iconv.decode(buffer, this.encoding);
      
      // 获取文件信息
      const fileInfo = await this.getFileInfo();

      if (this.window && !this.window.isDestroyed()) {
        // 先发送文件信息，再发送内容
        if (fileInfo) {
          this.window.webContents.send('file:info', fileInfo);
        }
        this.window.webContents.send('file:load', content);
        this.window.webContents.send('file:encoding', this.encoding);
      }

      // 更新窗口标题
      this.updateTitle();
    } catch (error) {
      console.error('加载文件失败:', error);
      if (this.window && !this.window.isDestroyed()) {
        this.window.webContents.send('file:error', error.message);
      }
    }
  }

  async handleSave(event, content) {
    try {
      if (!this.filePath) {
        throw new Error('No file path specified');
      }

      // 使用 iconv-lite 编码内容
      const buffer = iconv.encode(content || await this.getCurrentContent(), this.encoding);
      await fs.writeFile(this.filePath, buffer);
      
      // 更新修改状态
      this.modified = false;
      this.updateTitle();

      // 获取并发送最新的文件信息
      const fileInfo = await this.getFileInfo();
      if (fileInfo && this.window && !this.window.isDestroyed()) {
        this.window.webContents.send('file:info', fileInfo);
      }
      
      return true;
    } catch (error) {
      console.error('保存文件失败:', error);
      throw error;
    }
  }

  async getFileInfo() {
    try {
      if (!this.filePath) return null;
      
      const stats = await fs.stat(this.filePath);
      return {
        path: this.filePath,
        size: stats.size,
        mtime: stats.mtime,
        encoding: this.encoding
      };
    } catch (error) {
      console.error('获取文件信息失败:', error);
      return null;
    }
  }

  updateTitle() {
    if (!this.window || this.window.isDestroyed()) return;
    
    const fileName = this.filePath ? path.basename(this.filePath) : '未命名';
    const filePath = this.filePath ? `[${this.filePath}]` : '';
    const title = this.modified ? `* ${fileName} ${filePath}` : `${fileName} ${filePath}`;
    
    // 更新窗口标题和任务栏标题
    this.window.setTitle(title);
    // 通知渲染进程更新标题栏
    this.window.webContents.send('title:update', title);
  }

  setupIPC() {
    const channels = super.setupIPC();
    
    // 使用实例特定的通道名称
    this.ipc.handle(this.getChannelName('save'), this.handleSave.bind(this));
    this.ipc.handle(this.getChannelName('saveAs'), this.saveFileAs.bind(this));
    this.ipc.handle(this.getChannelName('open'), this.openFile.bind(this));
    this.ipc.handle(this.getChannelName('getEncoding'), () => this.encoding);
    this.ipc.handle(this.getChannelName('openDropped'), (_, path) => {
      this.filePath = path;
      return this.load();
    });

    // 添加窗口控制处理器
    this.ipc.handle(this.getChannelName('minimize'), () => {
      if (this.window && !this.window.isDestroyed()) {
        this.window.minimize();
      }
    });

    this.ipc.handle(this.getChannelName('maximize'), () => {
      if (this.window && !this.window.isDestroyed()) {
        if (this.window.isMaximized()) {
          this.window.unmaximize();
          this.window.webContents.send('window:maximize', false);
        } else {
          this.window.maximize();
          this.window.webContents.send('window:maximize', true);
        }
      }
    });

    this.ipc.handle(this.getChannelName('close'), () => {
      if (this.window && !this.window.isDestroyed()) {
        this.window.close();
      }
    });
    
    // 添加文件信息处理器
    this.ipc.handle(this.getChannelName('getFileInfo'), () => this.getFileInfo());

    // 监听修改状态变化
    this.ipc.on(this.getChannelName('modified'), (_, isModified) => {
      this.modified = isModified;
      this.updateTitle();
    });

    // 返回通道名称映射
    return {
      ...channels,
      save: this.getChannelName('save'),
      saveAs: this.getChannelName('saveAs'),
      open: this.getChannelName('open'),
      getEncoding: this.getChannelName('getEncoding'),
      minimize: this.getChannelName('minimize'),
      maximize: this.getChannelName('maximize'),
      close: this.getChannelName('close'),
      getFileInfo: this.getChannelName('getFileInfo'),
      openDropped: this.getChannelName('openDropped'),
      modified: this.getChannelName('modified')
    };
  }

  // 添加获取当前内容的方法
  async getCurrentContent() {
    return await this.window.webContents.executeJavaScript('document.getElementById("editor").value');
  }
}

module.exports = TextHandler; 