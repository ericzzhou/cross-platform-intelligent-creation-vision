const BaseHandler = require('../../../handlers/base');
const path = require('path');
const fs = require('fs').promises;
const { ipcMain, dialog, Menu } = require('electron');
const chardet = require('chardet');
const iconv = require('iconv-lite');

class MarkdownHandler extends BaseHandler {
  constructor(filePath) {
    super(filePath);
    this.ipc = ipcMain;
    this.filePath = filePath;
    this.encoding = 'utf8';
    this.modified = false;
  }

  getChannelName(action) {
    return `markdown:${action}:${this.instanceId}`;
  }

  async initialize() {
    const channels = this.setupIPC();
    
    this.createWindow({
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

    this.createMenu();
    await this.window.loadFile(path.join(__dirname, 'index.html'));

    // 如果有文件路径，加载文件
    if (this.filePath) {
      await this.load();
    } else {
      // 更新标题
      this.updateTitle();
    }
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
      },
      {
        label: '编辑',
        submenu: [
          {
            label: '撤销',
            accelerator: 'CmdOrCtrl+Z',
            role: 'undo'
          },
          {
            label: '重做',
            accelerator: 'CmdOrCtrl+Y',
            role: 'redo'
          },
          { type: 'separator' },
          {
            label: '剪切',
            accelerator: 'CmdOrCtrl+X',
            role: 'cut'
          },
          {
            label: '复制',
            accelerator: 'CmdOrCtrl+C',
            role: 'copy'
          },
          {
            label: '粘贴',
            accelerator: 'CmdOrCtrl+V',
            role: 'paste'
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    this.window.setMenu(menu);
  }

  async load() {
    try {
      if (!this.filePath) {
        console.log('No file path specified');
        return;
      }

      console.log('Loading file:', this.filePath);
      
      // 检查文件是否存在
      try {
        await fs.access(this.filePath);
      } catch (error) {
        throw new Error(`文件不存在: ${this.filePath}`);
      }

      const buffer = await fs.readFile(this.filePath);
      this.encoding = await this.detectEncoding(this.filePath);
      const content = iconv.decode(buffer, this.encoding);
      
      console.log('File loaded:', {
        encoding: this.encoding,
        contentLength: content.length
      });

      if (this.window && !this.window.isDestroyed()) {
        // 确保窗口已经准备好
        await this.window.webContents.executeJavaScript('document.readyState === "complete"');
        
        this.window.webContents.send('file:load', content);
        const fileInfo = await this.getFileInfo();
        if (fileInfo) {
          this.window.webContents.send('file:info', fileInfo);
        }
      }

      this.updateTitle();
    } catch (error) {
      console.error('Error loading file:', error);
      if (this.window && !this.window.isDestroyed()) {
        this.window.webContents.send('file:error', error.message);
      }
    }
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

  async openFile() {
    const result = await dialog.showOpenDialog(this.window, {
      filters: [
        { name: 'Markdown Files', extensions: ['md'] }
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
        { name: 'Markdown Files', extensions: ['md'] }
      ]
    });

    if (!result.canceled) {
      this.filePath = result.filePath;
      await this.handleSave();
      return true;
    }
    return false;
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
    const filePath = this.filePath ? ` [${this.filePath}]` : '';
    const modified = this.modified ? '* ' : '';
    const title = `${modified}${fileName}${filePath}`;
    
    // 更新窗口标题
    this.window.setTitle(title);
    
    // 更新渲染进程的标题显示
    this.window.webContents.send('title:update', title);
  }

  async getCurrentContent() {
    return await this.window.webContents.executeJavaScript('document.getElementById("editor").value');
  }

  setupIPC() {
    const channels = {
      minimize: this.getChannelName('minimize'),
      maximize: this.getChannelName('maximize'),
      close: this.getChannelName('close'),
      save: this.getChannelName('save'),
      saveAs: this.getChannelName('saveAs'),
      open: this.getChannelName('open'),
      getEncoding: this.getChannelName('getEncoding'),
      getFileInfo: this.getChannelName('getFileInfo'),
      modified: this.getChannelName('modified')
    };

    // 窗口控制
    this.ipc.handle(channels.minimize, () => {
      if (this.window && !this.window.isDestroyed()) {
        this.window.minimize();
      }
    });

    this.ipc.handle(channels.maximize, () => {
      if (this.window && !this.window.isDestroyed()) {
        if (this.window.isMaximized()) {
          this.window.unmaximize();
        } else {
          this.window.maximize();
        }
      }
    });

    this.ipc.handle(channels.close, () => {
      if (this.window && !this.window.isDestroyed()) {
        this.window.close();
      }
    });

    // 文件操作
    this.ipc.handle(channels.save, (_, content) => this.handleSave(content));
    this.ipc.handle(channels.saveAs, () => this.saveFileAs());
    this.ipc.handle(channels.open, () => this.openFile());
    this.ipc.handle(channels.getEncoding, () => this.encoding);
    this.ipc.handle(channels.getFileInfo, () => this.getFileInfo());

    // 修改状态
    this.ipc.on(channels.modified, (_, isModified) => {
      this.modified = isModified;
      this.updateTitle();
    });

    return channels;
  }
}

module.exports = MarkdownHandler; 