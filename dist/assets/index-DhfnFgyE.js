true&&(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
}());

class HandlerRegistry {
  constructor() {
    this.handlers = new Set();
  }

  register(handler) {
    this.handlers.add(handler);
  }

  findHandler(file) {
    // 只处理图片文件
    for (const handler of this.handlers) {
      if (handler.canHandle(file)) {
        return handler;
      }
    }
    return null;
  }
}

class ImageHandler {
  constructor() {
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.rotation = 0;
    this.image = null;
    this.zoomConfig = {
      minScale: 0.1,
      maxScale: 10,
      zoomFactor: 0.1
    };
    this.isDragging = false;
  }

  canHandle(file) {
    if (file instanceof File) {
      return file.type.startsWith('image/');
    }
    return Array.isArray(file) ? file.some(f => f.type.startsWith('image/')) : false;
  }

  async createViewer(file, container) {
    // 清理现有的查看器
    this.destroyViewer();

    container.innerHTML = `
      <div class="image-viewer">
        <img id="displayed-image" draggable="false" style="cursor: grab;">
        <div class="image-toolbar">
          <button id="zoom-out" title="缩小">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19 13H5v-2h14v2z"/>
            </svg>
          </button>
          <span class="zoom-text">100%</span>
          <button id="zoom-in" title="放大">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </button>
          <button id="rotate-left" title="向左旋转">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" d="M7.11 8.53L5.7 7.11C4.8 8.27 4.24 9.61 4.07 11h2.02c.14-.87.49-1.72 1.02-2.47zM6.09 13H4.07c.17 1.39.72 2.73 1.62 3.89l1.41-1.42c-.52-.75-.87-1.59-1.01-2.47zm1.01 5.32c1.16.9 2.51 1.44 3.9 1.61V17.9c-.87-.15-1.71-.49-2.46-1.03L7.1 18.32zM13 4.07V1L8.45 5.55 13 10V6.09c2.84.48 5 2.94 5 5.91s-2.16 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93s-3.05-7.44-7-7.93z"/>
            </svg>
          </button>
          <button id="rotate-right" title="向右旋转">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" d="M15.55 5.55L11 1v3.07C7.06 4.56 4 7.92 4 12s3.05 7.44 7 7.93v-2.02c-2.84-.48-5-2.94-5-5.91s2.16-5.43 5-5.91V10l4.55-4.45zM19.93 11c-.17-1.39-.72-2.73-1.62-3.89l-1.42 1.42c.54.75.88 1.6 1.02 2.47h2.02zM13 17.9v2.02c1.39-.17 2.74-.71 3.9-1.61l-1.44-1.44c-.75.54-1.59.89-2.46 1.03zm3.89-2.42l1.42 1.41c.9-1.16 1.45-2.5 1.62-3.89h-2.02c-.14.87-.48 1.72-1.02 2.48z"/>
            </svg>
          </button>
          <button id="reset" title="重置">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    this.image = container.querySelector('#displayed-image');

    try {
      if (file instanceof File) {
        await this.loadImage(file);
      } else if (typeof file === 'string') {
        // 如果是文件路径，使用 file:// 协议
        this.image.src = `file://${file}`;
        await new Promise((resolve, reject) => {
          this.image.onload = resolve;
          this.image.onerror = reject;
        });
        this.centerImage();
      }
      this.setupControls(container);
    } catch (error) {
      console.error('Error loading image:', error);
      throw error;
    }
  }

  async loadImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.image.src = e.target.result;
        this.image.onload = () => {
          this.centerImage();
          resolve();
        };
      };
      reader.readAsDataURL(file);
    });
  }

  setupControls(container) {
    // 拖动功能
    let startX, startY;
    
    this.image.onmousedown = (e) => {
      if (e.button !== 0) return;
      this.isDragging = true;
      startX = e.clientX - this.translateX;
      startY = e.clientY - this.translateY;
      this.image.style.cursor = 'grabbing';
    };

    window.onmousemove = (e) => {
      if (!this.isDragging) return;
      this.translateX = e.clientX - startX;
      this.translateY = e.clientY - startY;
      this.updateTransform();
    };

    window.onmouseup = () => {
      this.isDragging = false;
      this.image.style.cursor = 'grab';
    };

    // 缩放功能
    container.onwheel = (e) => {
      e.preventDefault();
      const delta = -Math.sign(e.deltaY) * this.zoomConfig.zoomFactor;
      this.zoom(delta);
    };

    // 按钮控制
    container.querySelector('#zoom-in').onclick = () => this.zoom(0.1);
    container.querySelector('#zoom-out').onclick = () => this.zoom(-0.1);
    container.querySelector('#rotate-left').onclick = () => this.rotate(-90);
    container.querySelector('#rotate-right').onclick = () => this.rotate(90);
    container.querySelector('#reset').onclick = () => this.reset();
  }

  zoom(delta) {
    const newScale = Math.min(
      Math.max(
        this.zoomConfig.minScale,
        this.scale * (1 + delta)
      ),
      this.zoomConfig.maxScale
    );
    this.scale = newScale;
    this.updateTransform();
    this.updateZoomText();
  }

  rotate(angle) {
    this.rotation = (this.rotation + angle) % 360;
    this.updateTransform();
  }

  reset() {
    this.scale = 1;
    this.rotation = 0;
    this.translateX = 0;
    this.translateY = 0;
    this.updateTransform();
    this.updateZoomText();
    this.centerImage();
  }

  centerImage() {
    const container = this.image.parentElement;
    const rect = this.image.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    this.translateX = (containerRect.width - rect.width) / 2;
    this.translateY = (containerRect.height - rect.height) / 2;
    this.updateTransform();
  }

  updateTransform() {
    this.image.style.transform = `translate(${this.translateX}px, ${this.translateY}px) rotate(${this.rotation}deg) scale(${this.scale})`;
  }

  updateZoomText() {
    const zoomText = this.image.parentElement.querySelector('.zoom-text');
    if (zoomText) {
      zoomText.textContent = `${Math.round(this.scale * 100)}%`;
    }
  }

  destroyViewer() {
    // 移除全局事件监听器
    window.onmousemove = null;
    window.onmouseup = null;

    // 清理图片资源
    if (this.image) {
      if (this.image.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.image.src);
      }
      this.image = null;
    }

    // 重置状态
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.rotation = 0;
    this.isDragging = false;
  }
}

class BaseHandler {
  constructor() {
    if (this.constructor === BaseHandler) {
      throw new Error('BaseHandler cannot be instantiated directly');
    }
  }

  // 检查是否支持该文件类型
  canHandle(file) {
    throw new Error('canHandle method must be implemented');
  }

  // 创建查看器
  createViewer(file, container) {
    throw new Error('createViewer method must be implemented');
  }

  // 销毁查看器
  destroyViewer() {
    throw new Error('destroyViewer method must be implemented');
  }
}

/**
 * 格式化文件大小
 * @param {number} bytes 文件大小（字节）
 * @returns {string} 格式化后的文件大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 获取文件类型
 * @param {File|Object} file 文件对象
 * @returns {string} 文件MIME类型
 */
function getFileType(file) {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop().toLowerCase();
  const mimeTypes = {
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp'
  };
  return mimeTypes[ext] || '';
}

class ListView {
  constructor(container) {
    this.container = container;
    this.files = [];
    this.selectedFiles = new Set();
    this.setupUI();
  }

  setupUI() {
    this.container.innerHTML = `
      <div class="list-viewer">
        <div class="toolbar">
          <div class="view-controls">
            <button class="grid-view-btn">网格视图</button>
            <button class="list-view-btn active">列表视图</button>
          </div>
          <div class="sort-controls">
            <select class="sort-select">
              <option value="name">按名称</option>
              <option value="size">按大小</option>
              <option value="type">按类型</option>
              <option value="date">按日期</option>
            </select>
          </div>
        </div>
        <div class="list-container">
          <table class="file-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>类型</th>
                <th>大小</th>
                <th>修改日期</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  setupEventListeners() {
    const tbody = this.container.querySelector('tbody');
    const sortSelect = this.container.querySelector('.sort-select');
    const viewBtns = this.container.querySelectorAll('.view-controls button');

    tbody.addEventListener('click', (e) => {
      const row = e.target.closest('tr');
      if (!row) return;

      const index = row.dataset.index;
      if (e.ctrlKey || e.metaKey) {
        this.toggleSelection(index);
      } else if (e.shiftKey) {
        this.rangeSelect(index);
      } else {
        this.singleSelect(index);
      }
    });

    sortSelect.addEventListener('change', () => {
      this.sortFiles(sortSelect.value);
    });

    viewBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        viewBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.toggleView(btn.classList.contains('grid-view-btn'));
      });
    });
  }

  load(files) {
    this.files = files;
    this.renderFiles();
    return Promise.resolve();
  }

  renderFiles() {
    const tbody = this.container.querySelector('tbody');
    tbody.innerHTML = this.files.map((file, index) => `
      <tr data-index="${index}" class="${this.selectedFiles.has(index) ? 'selected' : ''}">
        <td>
          <div class="file-name">
            <img src="${this.getFileIcon(file)}" alt="${file.type}" class="file-icon">
            ${file.name}
          </div>
        </td>
        <td>${this.getFileTypeLabel(file)}</td>
        <td>${formatFileSize(file.size)}</td>
        <td>${new Date(file.lastModified).toLocaleString()}</td>
      </tr>
    `).join('');
  }

  getFileIcon(file) {
    const type = getFileType(file);
    // 这里可以根据文件类型返回不同的图标
    return `icons/${type.split('/')[0]}.svg`;
  }

  getFileTypeLabel(file) {
    const type = getFileType(file);
    const typeMap = {
      'application/pdf': 'PDF文档',
      'image/jpeg': 'JPEG图片',
      'image/png': 'PNG图片',
      'image/gif': 'GIF图片'
    };
    return typeMap[type] || type;
  }

  toggleSelection(index) {
    if (this.selectedFiles.has(index)) {
      this.selectedFiles.delete(index);
    } else {
      this.selectedFiles.add(index);
    }
    this.renderFiles();
  }

  singleSelect(index) {
    this.selectedFiles.clear();
    this.selectedFiles.add(index);
    this.renderFiles();
  }

  rangeSelect(index) {
    const lastSelected = Array.from(this.selectedFiles).pop();
    if (lastSelected === undefined) {
      this.singleSelect(index);
      return;
    }

    const start = Math.min(lastSelected, index);
    const end = Math.max(lastSelected, index);
    
    for (let i = start; i <= end; i++) {
      this.selectedFiles.add(i);
    }
    this.renderFiles();
  }

  sortFiles(by) {
    const sorters = {
      name: (a, b) => a.name.localeCompare(b.name),
      size: (a, b) => a.size - b.size,
      type: (a, b) => getFileType(a).localeCompare(getFileType(b)),
      date: (a, b) => new Date(b.lastModified) - new Date(a.lastModified)
    };

    this.files.sort(sorters[by]);
    this.renderFiles();
  }

  toggleView(isGrid) {
    const container = this.container.querySelector('.list-container');
    container.className = `list-container ${isGrid ? 'grid-view' : 'list-view'}`;
  }

  destroy() {
    this.container.innerHTML = '';
    this.files = [];
    this.selectedFiles.clear();
  }
}

class ListHandler extends BaseHandler {
  constructor() {
    super();
    this.viewer = null;
  }

  canHandle(files) {
    return Array.isArray(files) && files.length > 0;
  }

  createViewer(files, container) {
    this.viewer = new ListView(container);
    return this.viewer.load(files);
  }

  destroyViewer() {
    if (this.viewer) {
      this.viewer.destroy();
      this.viewer = null;
    }
  }
}

/**
 * 统一的错误处理类
 */
class ErrorHandler {
  static handle(error, context = '') {
    console.error(`Error in ${context}:`, error);
    
    let message = '操作失败';
    if (error.code) {
      switch (error.code) {
        case 'ENOENT':
          message = '文件不存在';
          break;
        case 'EACCES':
          message = '没有访问权限';
          break;
        default:
          message = `错误: ${error.message || error}`;
      }
    }

    // 如果有UI，可以显示错误消息
    if (typeof window !== 'undefined') {
      this.showErrorMessage(message);
    }
  }

  static showErrorMessage(message) {
    // 创建错误提示元素
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;

    // 添加到页面
    document.body.appendChild(errorDiv);

    // 3秒后自动移除
    setTimeout(() => {
      errorDiv.remove();
    }, 3000);
  }
}

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
    document.getElementById('status-bar');

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
//# sourceMappingURL=index-DhfnFgyE.js.map
