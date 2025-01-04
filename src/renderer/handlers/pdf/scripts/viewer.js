class PDFViewer {
  constructor() {
    this.pdfDoc = null;
    this.pageNum = 1;
    this.pageRendering = false;
    this.pageNumPending = null;
    this.scale = 1.0;
    this.rotation = 0;
    this.viewer = document.getElementById('viewer');
    this.titleElement = document.querySelector('.title');
    this.viewMode = 'single';
    this.thumbnails = new Map();
    this.thumbnailScale = 0.15; // 减小缩略图缩放比例
    
    // 初始化 PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    // 初始化时设置默认缩放级别
    document.getElementById('zoomLevel').value = '1';

    this.initWindowControls();
    this.initControls();
    this.initFileHandling();
    this.initThumbnails();
    this.initScrollHandlers();
  }

  initWindowControls() {
    // 窗口控制
    document.querySelector('.minimize').addEventListener('click', () => {
      window.pdfAPI.windowControl.minimize();
    });

    document.querySelector('.maximize').addEventListener('click', () => {
      window.pdfAPI.windowControl.maximize();
    });

    document.querySelector('.close').addEventListener('click', () => {
      window.pdfAPI.windowControl.close();
    });

    window.pdfAPI.onMaximizeChange((isMaximized) => {
      document.body.classList.toggle('maximized', isMaximized);
    });
  }

  initControls() {
    // 页面控制
    document.getElementById('prevPage').addEventListener('click', () => this.onPrevPage());
    document.getElementById('nextPage').addEventListener('click', () => this.onNextPage());
    document.getElementById('pageNumber').addEventListener('change', (e) => this.onPageNumberChange(e));

    // 缩放控制
    document.getElementById('zoomOut').addEventListener('click', () => this.onZoomOut());
    document.getElementById('zoomIn').addEventListener('click', () => this.onZoomIn());
    document.getElementById('zoomLevel').addEventListener('change', (e) => this.onZoomLevelChange(e));

    // 旋转控制
    document.getElementById('rotateLeft').addEventListener('click', () => this.onRotateLeft());
    document.getElementById('rotateRight').addEventListener('click', () => this.onRotateRight());

    // 文件操作
    document.getElementById('print').addEventListener('click', () => this.onPrint());
    document.getElementById('save').addEventListener('click', () => this.onSave());

    // 滚轮事件
    document.getElementById('viewerContainer').addEventListener('wheel', (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        this.onZoom(e.deltaY > 0 ? 0.9 : 1.1);
      } else {
        e.preventDefault();
        if (e.deltaY > 0) {
          this.onNextPage();
        } else {
          this.onPrevPage();
        }
      }
    }, { passive: false });
  }

  initFileHandling() {
    window.pdfAPI.onFileLoad(async (data) => {
      this.showLoading(true);
      try {
        const binary = atob(data.data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        await this.loadPDF(bytes);
        this.updateFileInfo();
      } catch (error) {
        console.error('Error loading PDF:', error);
        this.showError(error.message);
      } finally {
        this.showLoading(false);
      }
    });

    window.pdfAPI.onError((error) => {
      this.showError(error);
    });

    window.pdfAPI.onTitleUpdate((title) => {
      this.titleElement.textContent = title;
    });
  }

  // 初始化缩略图功能
  async initThumbnails() {
    const container = document.getElementById('thumbnailsContainer');
    container.addEventListener('click', (e) => {
      const thumbnail = e.target.closest('.thumbnail');
      if (thumbnail) {
        const pageNum = parseInt(thumbnail.dataset.pageNumber);
        if (pageNum) {
          this.pageNum = pageNum;
          this.renderPage(pageNum);
          this.updateUIState();
        }
      }
    });
  }

  // 生成缩略图
  async generateThumbnails() {
    const container = document.getElementById('thumbnailsContainer');
    container.innerHTML = '';

    // 创建一个文档片段来优化性能
    const fragment = document.createDocumentFragment();

    for (let i = 1; i <= this.pdfDoc.numPages; i++) {
      const page = await this.pdfDoc.getPage(i);
      // 计算合适的缩放比例
      const originalViewport = page.getViewport({ scale: 1 });
      const containerWidth = 144; // 缩略图容器宽度
      const scale = containerWidth / originalViewport.width;
      const viewport = page.getViewport({ scale });
      
      const thumbnailDiv = document.createElement('div');
      thumbnailDiv.className = 'thumbnail';
      thumbnailDiv.dataset.pageNumber = i;
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      const label = document.createElement('div');
      label.className = 'thumbnail-label';
      label.textContent = i;
      
      thumbnailDiv.appendChild(canvas);
      thumbnailDiv.appendChild(label);
      fragment.appendChild(thumbnailDiv);
      
      this.thumbnails.set(i, thumbnailDiv);
    }

    container.appendChild(fragment);
  }

  // 更新缩略图高亮状态
  updateThumbnailHighlight() {
    this.thumbnails.forEach((thumbnail, pageNum) => {
      thumbnail.classList.toggle('active', pageNum === this.pageNum);
    });
  }

  async loadPDF(pdfData) {
    try {
      this.pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;
      document.getElementById('pageCount').textContent = this.pdfDoc.numPages;
      this.pageNum = 1;
      
      // 生成缩略图
      await this.generateThumbnails();
      
      // 根据视图模式渲染
      if (this.viewMode === 'continuous') {
        await this.renderContinuousMode();
      } else {
        await this.renderPage(this.pageNum);
      }
      
      this.updateUIState();
    } catch (error) {
      console.error('Error loading PDF:', error);
      this.showError(error.message);
    }
  }

  async renderPage(num, isPreload = false) {
    if (this.pageRendering && !isPreload) {
      this.pageNumPending = num;
      return;
    }

    this.pageRendering = !isPreload;
    const page = await this.pdfDoc.getPage(num);
    const viewport = page.getViewport({ 
      scale: this.scale,
      rotation: this.rotation 
    });

    const canvas = document.createElement('canvas');
    canvas.className = 'page';
    canvas.dataset.pageNumber = num;
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    try {
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      if (!isPreload) {
        if (this.viewMode === 'single') {
          this.viewer.innerHTML = '';
          this.viewer.appendChild(canvas);
        }
      }

      this.pageRendering = false;
      if (this.pageNumPending !== null) {
        await this.renderPage(this.pageNumPending);
        this.pageNumPending = null;
      }

      // 更新缩略图高亮
      this.updateThumbnailHighlight();
    } catch (error) {
      console.error('Error rendering page:', error);
      this.showError(error.message);
      this.pageRendering = false;
    }
  }

  onPrevPage() {
    if (this.pageNum <= 1) return;
    this.pageNum--;
    this.renderPage(this.pageNum);
    this.updateUIState();
  }

  onNextPage() {
    if (this.pageNum >= this.pdfDoc.numPages) return;
    this.pageNum++;
    this.renderPage(this.pageNum);
    this.updateUIState();
  }

  onPageNumberChange(e) {
    const num = parseInt(e.target.value);
    if (num && num > 0 && num <= this.pdfDoc.numPages) {
      this.pageNum = num;
      this.renderPage(this.pageNum);
      this.updateUIState();
    }
  }

  onZoomIn() {
    this.onZoom(1.1);
  }

  onZoomOut() {
    this.onZoom(0.9);
  }

  onZoom(factor) {
    this.scale *= factor;
    this.scale = Math.max(0.25, Math.min(4, this.scale));
    this.renderPage(this.pageNum);
    this.updateZoomLevel();
  }

  async onZoomLevelChange(e) {
    if (!this.pdfDoc) return;

    const value = e.target.value;
    const container = document.getElementById('viewerContainer');
    
    try {
      const page = await this.pdfDoc.getPage(this.pageNum);
      const viewport = page.getViewport({ scale: 1, rotation: this.rotation });
      
      // 计算容器的实际可用空间
      const containerWidth = container.clientWidth - 40; // 减去内边距
      const containerHeight = container.clientHeight - 40;

      // 计算新的缩放比例
      switch (value) {
        case 'auto':
          // 自适应：选择宽度或高度缩放中较小的一个
          const scaleWidth = containerWidth / viewport.width;
          const scaleHeight = containerHeight / viewport.height;
          this.scale = Math.min(scaleWidth, scaleHeight);
          break;
          
        case 'page-width':
          // 适合页宽
          this.scale = containerWidth / viewport.width;
          break;
          
        case 'page-height':
          // 适合页高
          this.scale = containerHeight / viewport.height;
          break;
          
        default:
          // 固定缩放比例
          this.scale = parseFloat(value);
      }

      // 确保缩放比例在合理范围内
      this.scale = Math.max(0.25, Math.min(4, this.scale));

      // 更新缩放显示
      await this.updateZoomLevel();

      // 重新渲染
      if (this.viewMode === 'continuous') {
        await this.renderContinuousMode();
      } else {
        await this.renderPage(this.pageNum);
      }

      console.log(`Zoom level changed: ${value}, scale: ${this.scale}`); // 添加日志
    } catch (error) {
      console.error('Error changing zoom level:', error);
      this.showError('缩放失败: ' + error.message);
    }
  }

  onRotateLeft() {
    this.rotation = (this.rotation - 90) % 360;
    this.renderPage(this.pageNum);
  }

  onRotateRight() {
    this.rotation = (this.rotation + 90) % 360;
    this.renderPage(this.pageNum);
  }

  async onPrint() {
    try {
      await window.pdfAPI.print();
    } catch (error) {
      this.showError('打印失败: ' + error);
    }
  }

  async onSave() {
    try {
      await window.pdfAPI.save();
    } catch (error) {
      this.showError('保存失败: ' + error);
    }
  }

  async updateFileInfo() {
    const info = await window.pdfAPI.getFileInfo();
    if (info) {
      document.querySelector('.file-size').textContent = this.formatFileSize(info.size);
      document.querySelector('.file-time').textContent = new Date(info.mtime).toLocaleString();
      document.querySelector('.file-path').textContent = info.path;
    }
  }

  updateUIState() {
    const prevButton = document.getElementById('prevPage');
    const nextButton = document.getElementById('nextPage');
    const pageNumber = document.getElementById('pageNumber');

    prevButton.disabled = this.pageNum <= 1;
    nextButton.disabled = this.pageNum >= this.pdfDoc.numPages;
    pageNumber.max = this.pdfDoc.numPages;
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }

  showLoading(show) {
    document.querySelector('.loading').style.display = show ? 'flex' : 'none';
  }

  showError(message) {
    const errorElement = document.querySelector('.error');
    const errorMessage = errorElement.querySelector('.error-message');
    errorMessage.textContent = message;
    errorElement.style.display = 'flex';
    setTimeout(() => {
      errorElement.style.display = 'none';
    }, 3000);
  }

  async updateZoomLevel() {
    const zoomLevel = document.getElementById('zoomLevel');
    const percentage = Math.round(this.scale * 100);
    
    // 移除之前的自定义选项
    const oldCustomOption = zoomLevel.querySelector('.custom-zoom');
    if (oldCustomOption) {
      oldCustomOption.remove();
    }

    // 添加新的自定义选项
    const customOption = document.createElement('option');
    customOption.className = 'custom-zoom';
    customOption.value = this.scale;
    customOption.textContent = `${percentage}%`;
    zoomLevel.appendChild(customOption);
    
    // 如果当前值是预设值之一，保持选中状态
    if (!['auto', 'page-width', 'page-height'].includes(zoomLevel.value)) {
      zoomLevel.value = this.scale;
    }
  }

  onViewModeChange(e) {
    this.viewMode = e.target.value;
    document.getElementById('viewer').className = `pdfViewer ${this.viewMode}-mode`;
    
    if (this.viewMode === 'continuous') {
      this.renderContinuousMode();
    } else {
      this.renderSingleMode();
    }
  }

  async renderContinuousMode() {
    this.viewer.innerHTML = '';
    const container = document.createDocumentFragment();
    
    for (let i = 1; i <= this.pdfDoc.numPages; i++) {
      const page = await this.pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: this.scale, rotation: this.rotation });
      
      const pageDiv = document.createElement('div');
      pageDiv.className = 'page-container';
      pageDiv.dataset.pageNumber = i;
      
      const canvas = document.createElement('canvas');
      canvas.className = 'page';
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      pageDiv.appendChild(canvas);
      container.appendChild(pageDiv);
    }
    
    this.viewer.appendChild(container);
  }

  async renderSingleMode() {
    await this.renderPage(this.pageNum);
  }

  // 添加滚动处理方法
  initScrollHandlers() {
    const thumbnailsContainer = document.querySelector('.thumbnails-container');
    const viewerContainer = document.getElementById('viewerContainer');

    // 缩略图容器滚动处理
    thumbnailsContainer.addEventListener('wheel', (e) => {
      const maxScroll = thumbnailsContainer.scrollHeight - thumbnailsContainer.clientHeight;
      const currentScroll = thumbnailsContainer.scrollTop;
      const isScrollingUp = e.deltaY < 0;
      const isScrollingDown = e.deltaY > 0;
      const isAtTop = currentScroll <= 0;
      const isAtBottom = currentScroll >= maxScroll;

      // 阻止滚动传播到主容器
      e.stopPropagation();

      // 在边界处阻止滚动
      if ((isAtTop && isScrollingUp) || (isAtBottom && isScrollingDown)) {
        e.preventDefault();
      }
    }, { passive: false });

    // 主容器滚动处理
    viewerContainer.addEventListener('wheel', (e) => {
      // 如果按住 Ctrl 键，处理缩放
      if (e.ctrlKey) {
        e.preventDefault();
        this.onZoom(e.deltaY > 0 ? 0.9 : 1.1);
        return;
      }

      // 在单页模式下处理翻页
      if (this.viewMode === 'single') {
        e.preventDefault();
        if (e.deltaY > 0) {
          this.onNextPage();
        } else {
          this.onPrevPage();
        }
      }
      // 连续模式下自然滚动，不需要特殊处理
    }, { passive: false });
  }
}

// 创建查看器实例
window.addEventListener('DOMContentLoaded', () => {
  new PDFViewer();
}); 