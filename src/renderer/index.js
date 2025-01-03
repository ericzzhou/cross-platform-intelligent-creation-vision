import { HandlerRegistry } from './handlers/handler-registry';
import { ImageHandler } from './handlers/image-handler';
import { ListHandler } from './handlers/list-handler';
import { ErrorHandler } from '../utils/error-handler';

function getFileName(filePath) {
  return filePath.split(/[/\\]/).pop();
}

class App {
  constructor() {
    this.registry = new HandlerRegistry();
    this.currentHandler = null;
    this.setupHandlers();
    this.setupUI();
    this.initializeImageDropZone();
    
    // 初始隐藏 viewer-container
    document.getElementById('viewer-container').style.display = 'none';
    this.setupWindowControls();

    // 监听文件打开事件
    this.setupFileOpenHandler();
  }

  setupHandlers() {
    this.registry.register(new ImageHandler());
    this.registry.register(new ListHandler());
  }

  setupUI() {
    const dropZone = document.getElementById('drop-zone');
    const viewerContainer = document.getElementById('viewer-container');
    const statusBar = document.getElementById('status-bar');

    dropZone.addEventListener('dragover', (e) => {
      console.log('dragover');
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
      console.log('dragleave');
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', async (e) => {
      console.log('drop');
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');

      const items = Array.from(e.dataTransfer.items);
      console.log(items);
      try {
        await this.handleDroppedItems(items, viewerContainer);
      } catch (error) {
        ErrorHandler.handle(error, 'Dropping files');
      }
    });
  }

  showErrorToast(message, duration = 3000) {
    // 移除现有的提示（如果有）
    const existingToast = document.querySelector('.error-toast');
    if (existingToast) {
      existingToast.remove();
    }

    // 创建新的提示
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // 触发动画
    setTimeout(() => toast.classList.add('show'), 10);

    // 设置自动消失
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  async handleDroppedItems(items, container) {
    const files = [];
    const directories = [];
    const unsupportedFiles = [];

    for (const item of items) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          if (entry.isDirectory) {
            directories.push(entry);
          } else {
            const file = item.getAsFile();
            // 检查文件类型是否支持
            if (this.registry.findHandler(file)) {
              files.push(file);
            } else {
              unsupportedFiles.push(file.name);
            }
          }
        }
      }
    }

    // 显示不支持的文件提示
    if (unsupportedFiles.length > 0) {
      const message = unsupportedFiles.length === 1
        ? `不支持的文件类型: ${unsupportedFiles[0]}`
        : `有 ${unsupportedFiles.length} 个文件类型不支持`;
      this.showErrorToast(message);
      return;
    }

    // 处理目录
    if (directories.length > 0) {
      const directoryFiles = await this.processDirectories(directories);
      // 过滤出支持的文件类型
      const supportedFiles = directoryFiles.filter(file => this.registry.findHandler(file));
      if (directoryFiles.length !== supportedFiles.length) {
        this.showErrorToast(`目录中有 ${directoryFiles.length - supportedFiles.length} 个文件类型不支持`);
      }
      files.push(...supportedFiles);
    }

    // 如果没有可处理的文件，直接返回
    if (files.length === 0) {
      return;
    }

    // 处理文件
    if (files.length > 1) {
      await this.handleMultipleFiles(files, container);
    } else if (files.length === 1) {
      await this.handleSingleFile(files[0], container);
    }
  }

  async processDirectories(entries) {
    const files = [];
    
    async function readEntry(entry) {
      if (entry.isFile) {
        return new Promise((resolve) => {
          entry.file(file => {
            // 添加完整路径信息
            file.path = entry.fullPath;
            files.push(file);
            resolve();
          });
        });
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        return new Promise((resolve) => {
          dirReader.readEntries(async (entries) => {
            const promises = entries.map(entry => readEntry(entry));
            await Promise.all(promises);
            resolve();
          });
        });
      }
    }

    await Promise.all(entries.map(entry => readEntry(entry)));
    return files;
  }

  async handleMultipleFiles(files, container) {
    if (this.currentHandler) {
      this.currentHandler.destroyViewer();
    }

    const handler = this.registry.findHandler(files);
    if (handler) {
      this.currentHandler = handler;
      try {
        await handler.createViewer(files, container);
        container.style.display = 'block';
        this.updateStatusBar(files.length);
      } catch (error) {
        ErrorHandler.handle(error, 'Multiple files handling');
      }
    }
  }

  async handleSingleFile(file, container) {
    if (this.currentHandler) {
      this.currentHandler.destroyViewer();
    }

    const handler = this.registry.findHandler(file);
    if (handler) {
      this.currentHandler = handler;
      try {
        // 确保容器可见
        container.style.display = 'block';
        await handler.createViewer(file, container);
        // 隐藏初始拖放区域
        document.getElementById('drop-zone').style.display = 'none';
        this.updateStatusBar(1);
      } catch (error) {
        ErrorHandler.handle(error, 'Single file handling');
      }
    }
  }

  updateStatusBar(fileCount) {
    const statusText = document.querySelector('.status-text');
    const fileCountEl = document.querySelector('.file-count');
    
    statusText.textContent = fileCount > 1 ? '多文件视图' : '单文件视图';
    fileCountEl.textContent = `${fileCount} 个文件`;
  }

  initializeImageDropZone() {
    const viewerContainer = document.getElementById('viewer-container');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      viewerContainer.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    viewerContainer.addEventListener('dragenter', () => {
      viewerContainer.classList.add('drag-over');
    });

    viewerContainer.addEventListener('dragleave', (e) => {
      if (!viewerContainer.contains(e.relatedTarget)) {
        viewerContainer.classList.remove('drag-over');
      }
    });

    viewerContainer.addEventListener('drop', async (e) => {
      viewerContainer.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer.files);
      
      // 检查是否有不支持的文件类型
      const unsupportedFiles = files.filter(file => !file.type.startsWith('image/'));
      if (unsupportedFiles.length > 0) {
        const message = unsupportedFiles.length === 1
          ? `不支持的文件类型: ${unsupportedFiles[0].name}`
          : `有 ${unsupportedFiles.length} 个文件类型不支持`;
        this.showErrorToast(message);
        return;
      }

      // 找到第一个图片文件
      const imageFile = files.find(file => file.type.startsWith('image/'));
      if (imageFile) {
        try {
          await this.handleSingleFile(imageFile, viewerContainer);
        } catch (error) {
          ErrorHandler.handle(error, 'Image drop handling');
        }
      }
    });
  }

  setupWindowControls() {
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const closeBtn = document.getElementById('close-btn');

    minimizeBtn.addEventListener('click', async () => {
      console.log('Minimize button clicked');
      await window.api.minimize();
    });

    maximizeBtn.addEventListener('click', async () => {
      console.log('Maximize button clicked');
      await window.api.maximize();
    });

    closeBtn.addEventListener('click', async () => {
      console.log('Close button clicked');
      await window.api.close();
    });

    // 监听窗口状态变化，更新最大化按钮图标
    window.api.onMaximizeChange((isMaximized) => {
      if (isMaximized) {
        maximizeBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect fill="none" stroke="currentColor" width="7" height="7" x="3.5" y="1.5"/>
            <rect fill="none" stroke="currentColor" width="7" height="7" x="1.5" y="3.5"/>
          </svg>
        `;
      } else {
        maximizeBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect fill="none" stroke="currentColor" width="9" height="9" x="1.5" y="1.5"/>
          </svg>
        `;
      }
    });
  }

  setupFileOpenHandler() {
    window.api.onFileOpen(async (filePath) => {
      try {
        await window.api.log.debug('File Open Handler Start', { filePath });
        
        try {
          // 确保文件路径是字符串
          if (typeof filePath !== 'string') {
            throw new Error('Invalid file path');
          }

          // 过滤掉非文件路径的参数
          if (filePath.startsWith('--')) {
            throw new Error('Invalid file path');
          }

          await window.api.log.debug('Reading file:', filePath);
          const fileBuffer = await window.api.readFile(filePath);
          await window.api.log.debug('File buffer received', { size: fileBuffer.byteLength });
          
          // 使用工具函数替代 path.basename
          const fileName = getFileName(filePath);
          
          // 创建 File 对象
          const file = new File([fileBuffer], fileName, {
            type: this.getFileType(filePath)
          });
          
          await window.api.log.debug('File object created:', { 
            name: file.name, 
            type: file.type, 
            size: file.size 
          });

          // 显示查看器容器
          const viewerContainer = document.getElementById('viewer-container');
          if (!viewerContainer) {
            throw new Error('Viewer container not found');
          }

          // 清理当前处理器
          if (this.currentHandler) {
            this.currentHandler.destroyViewer();
            this.currentHandler = null;
          }

          // 显示容器并隐藏拖放区域
          viewerContainer.style.display = 'block';
          document.getElementById('drop-zone').style.display = 'none';
          
          await window.api.log.debug('Containers updated');

          // 处理文件
          await this.handleSingleFile(file, viewerContainer);
          await window.api.log.debug('=== File Open Handler Complete ===');
        } catch (error) {
          await window.api.log.error('Error in file open handler:', error);
          throw error;
        }
      } catch (error) {
        this.showErrorToast(error.message || '打开文件失败');
      }
    });
  }

  getFileType(filePath) {
    // 获取文件扩展名（不使用 path 模块）
    const ext = filePath.toLowerCase().split('.').pop();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'webp': 'image/webp'
    };
    return mimeTypes[ext] || '';
  }
}

new App(); 

document.addEventListener('DOMContentLoaded', () => {
  // 处理文件拖放
  document.body.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  document.body.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const filePath = files[0].path;
      await window.api.openFile(filePath);
    }
  });
}); 