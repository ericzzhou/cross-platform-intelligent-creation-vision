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
    this.outline = null;
    
    // 初始化 PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    // 初始化时设置默认缩放级别
    document.getElementById('zoomLevel').value = '1';

    this.initWindowControls();
    this.initControls();
    this.initFileHandling();
    this.initThumbnails();
    this.initScrollHandlers();
    this.initKeyboardControls();
    this.initSidebarControls();

    // 添加用户滚动标志
    this.userScrolling = false;
    this.userScrollTimeout = null;

    this.initResizeHandlers();
    this.minSidebarWidth = 160; // 最小宽度
    this.maxSidebarWidth = 400; // 最大宽度
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
  async generateThumbnails(containerWidth = null) {
    const container = document.getElementById('thumbnailsContainer');
    
    // 保存滚动位置
    const scrollTop = container.scrollTop;
    
    // 清空容器但保留现有缩略图直到新的准备好
    const oldThumbnails = container.innerHTML;
    const fragment = document.createDocumentFragment();

    if (!containerWidth) {
      const sidebar = document.querySelector('.sidebar');
      const thumbnailPadding = 16;
      const thumbnailBorder = 4;
      containerWidth = sidebar.offsetWidth - thumbnailPadding - thumbnailBorder;
    }

    try {
      for (let i = 1; i <= this.pdfDoc.numPages; i++) {
        const page = await this.pdfDoc.getPage(i);
        const originalViewport = page.getViewport({ scale: 1 });
        const scale = containerWidth / originalViewport.width;
        const viewport = page.getViewport({ scale });
        
        const thumbnailDiv = document.createElement('div');
        thumbnailDiv.className = 'thumbnail';
        thumbnailDiv.dataset.pageNumber = i;
        thumbnailDiv.style.width = `${containerWidth}px`;
        
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

      // 只在所有缩略图都准备好后才更新容器
      container.innerHTML = '';
      container.appendChild(fragment);
      
      // 恢复滚动位置
      container.scrollTop = scrollTop;
      
      // 更新当前页面的高亮状态
      this.updateThumbnailHighlight();
    } catch (error) {
      console.error('Error generating thumbnails:', error);
      // 如果生成失败，恢复原来的缩略图
      container.innerHTML = oldThumbnails;
    }
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
      
      // 生成缩略图和目录
      await Promise.all([
        this.generateThumbnails(),
        this.generateOutline()
      ]);
      
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
          document.getElementById('pageNumber').value = num;
        }

        // 更新并滚动缩略图
        this.updateThumbnailHighlight();
        const activeThumbnail = this.thumbnails.get(num);
        if (activeThumbnail) {
          const container = document.getElementById('thumbnailsContainer');
          this.scrollIntoViewIfNeeded(activeThumbnail, container);
        }

        // 更新并滚动目录
        this.updateOutlineHighlight(num);
      }

      this.pageRendering = false;
      if (this.pageNumPending !== null) {
        await this.renderPage(this.pageNumPending);
        this.pageNumPending = null;
      }
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
    
    // 更新缩放显示
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
    zoomLevel.value = this.scale;
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
    pageNumber.value = this.pageNum;
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

  // 修改滚动处理方法
  initScrollHandlers() {
    const thumbnailsContainer = document.querySelector('.thumbnails-container');
    const outlineContainer = document.getElementById('outlineContainer');
    const viewerContainer = document.getElementById('viewerContainer');

    // 缩略图容器滚动处理
    thumbnailsContainer.addEventListener('wheel', (e) => {
      this.userScrolling = true;
      clearTimeout(this.userScrollTimeout);
      
      const maxScroll = thumbnailsContainer.scrollHeight - thumbnailsContainer.clientHeight;
      const currentScroll = thumbnailsContainer.scrollTop;
      const isScrollingUp = e.deltaY < 0;
      const isScrollingDown = e.deltaY > 0;
      const isAtTop = currentScroll <= 0;
      const isAtBottom = currentScroll >= maxScroll;

      e.stopPropagation();

      if ((isAtTop && isScrollingUp) || (isAtBottom && isScrollingDown)) {
        e.preventDefault();
      }

      // 3秒后重置用户滚动标志
      this.userScrollTimeout = setTimeout(() => {
        this.userScrolling = false;
      }, 3000);
    }, { passive: false });

    // 目录容器滚动处理
    outlineContainer.addEventListener('wheel', (e) => {
      this.userScrolling = true;
      clearTimeout(this.userScrollTimeout);
      
      e.stopPropagation();

      // 3秒后重置用户滚动标志
      this.userScrollTimeout = setTimeout(() => {
        this.userScrolling = false;
      }, 3000);
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

  // 修改滚动到可见区域的方法
  scrollIntoViewIfNeeded(element, container) {
    // 如果用户正在滚动，不执行自动滚动
    if (this.userScrolling) return;

    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    if (elementRect.top < containerRect.top) {
      container.scrollTop += elementRect.top - containerRect.top - 8;
    } else if (elementRect.bottom > containerRect.bottom) {
      container.scrollTop += elementRect.bottom - containerRect.bottom + 8;
    }
  }

  // 添加目录高亮更新方法
  updateOutlineHighlight(pageNum) {
    if (!this.outline) return;

    const outlineContainer = document.getElementById('outlineContainer');
    const currentActive = outlineContainer.querySelector('.outline-item.active');
    if (currentActive) {
      currentActive.classList.remove('active');
    }

    // 查找当前页面对应的目录项
    const findOutlineItemForPage = async (items) => {
      for (const item of items) {
        if (item.dest) {
          try {
            let destination = item.dest;
            if (typeof destination === 'string') {
              destination = await this.pdfDoc.getDestination(destination);
            }
            
            if (Array.isArray(destination) && destination.length > 0) {
              const pageRef = destination[0];
              const itemPageNum = await this.pdfDoc.getPageIndex(pageRef) + 1;
              
              if (itemPageNum === pageNum) {
                const element = outlineContainer.querySelector(`[data-page="${itemPageNum}"]`);
                if (element) {
                  element.classList.add('active');
                  this.scrollIntoViewIfNeeded(element, outlineContainer);
                  return true;
                }
              }
            }
          } catch (error) {
            console.error('Error checking outline item:', error);
          }
        }

        if (item.items && item.items.length > 0) {
          const found = await findOutlineItemForPage(item.items);
          if (found) return true;
        }
      }
      return false;
    };

    if (this.outline) {
      findOutlineItemForPage(this.outline);
    }
  }

  // 添加键盘控制初始化方法
  initKeyboardControls() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.pdfAPI.windowControl.close();
      }
    });
  }

  // 添加侧边栏控制初始化
  initSidebarControls() {
    const sidebarMode = document.getElementById('sidebarMode');
    sidebarMode.addEventListener('change', (e) => this.onSidebarModeChange(e));
  }

  // 处理侧边栏模式切换
  onSidebarModeChange(e) {
    const mode = e.target.value;
    const outlineContainer = document.getElementById('outlineContainer');
    const thumbnailsContainer = document.getElementById('thumbnailsContainer');

    if (mode === 'outline') {
      outlineContainer.style.display = 'block';
      thumbnailsContainer.style.display = 'none';
      if (!this.outline) {
        this.generateOutline();
      }
    } else {
      outlineContainer.style.display = 'none';
      thumbnailsContainer.style.display = 'block';
      // 检查缩略图是否需要重新生成
      if (this.thumbnails.size === 0) {
        this.generateThumbnails();
      }
    }
  }

  // 生成目录
  async generateOutline() {
    try {
      const outline = await this.pdfDoc.getOutline();
      if (!outline || outline.length === 0) {
        const container = document.getElementById('outlineContainer');
        container.innerHTML = '<div class="no-outline">没有目录</div>';
        return;
      }

      this.outline = outline;
      await this.renderOutline(outline);
    } catch (error) {
      console.error('Error generating outline:', error);
    }
  }

  // 渲染目录
  async renderOutline(outline, container = document.getElementById('outlineContainer'), level = 0) {
    container.innerHTML = '';
    
    for (const item of outline) {
      const div = document.createElement('div');
      div.className = 'outline-item';
      div.style.paddingLeft = `${level * 16 + 8}px`;
      div.textContent = item.title;

      if (item.dest) {
        try {
          let destination = item.dest;
          if (typeof destination === 'string') {
            destination = await this.pdfDoc.getDestination(destination);
          }
          
          if (Array.isArray(destination) && destination.length > 0) {
            const pageRef = destination[0];
            const pageNumber = await this.pdfDoc.getPageIndex(pageRef) + 1;
            div.dataset.page = pageNumber;
          }
        } catch (error) {
          console.error('Error setting page data:', error);
        }

        div.addEventListener('click', async () => {
          try {
            let destination = item.dest;
            if (typeof destination === 'string') {
              destination = await this.pdfDoc.getDestination(destination);
            }
            
            if (Array.isArray(destination) && destination.length > 0) {
              const pageRef = destination[0];
              const pageNumber = await this.pdfDoc.getPageIndex(pageRef);
              this.pageNum = pageNumber + 1;
              await this.renderPage(this.pageNum);
              this.updateUIState();
            }
          } catch (error) {
            console.error('Error navigating to destination:', error);
          }
        });
      }

      container.appendChild(div);

      if (item.items && item.items.length > 0) {
        const subContainer = document.createElement('div');
        container.appendChild(subContainer);
        await this.renderOutline(item.items, subContainer, level + 1);
      }
    }
  }

  // 添加侧边栏拖动调整大小功能
  initResizeHandlers() {
    const sidebar = document.querySelector('.sidebar');
    const resizer = document.createElement('div');
    resizer.className = 'sidebar-resizer';
    sidebar.appendChild(resizer);

    let startX;
    let startWidth;
    let isDragging = false;
    let resizeTimeout;
    let lastWidth = sidebar.offsetWidth;

    const startResize = (e) => {
      isDragging = true;
      startX = e.pageX;
      startWidth = sidebar.offsetWidth;
      document.body.classList.add('resizing');
    };

    const stopResize = async () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.classList.remove('resizing');

      const currentWidth = sidebar.offsetWidth;
      // 只有当宽度真的改变时才重新渲染
      if (currentWidth !== lastWidth && document.getElementById('sidebarMode').value === 'thumbnails') {
        clearTimeout(resizeTimeout);
        try {
          // 显示加载状态
          const container = document.getElementById('thumbnailsContainer');
          const loadingDiv = document.createElement('div');
          loadingDiv.className = 'thumbnail-loading';
          loadingDiv.textContent = '加载中...';
          container.appendChild(loadingDiv);

          // 等待一小段时间确保 DOM 更新
          await new Promise(resolve => setTimeout(resolve, 50));

          // 重新生成缩略图
          await this.generateThumbnails(currentWidth - 20); // 20 = padding + border
          
          // 更新最后的宽度
          lastWidth = currentWidth;
        } catch (error) {
          console.error('Error regenerating thumbnails:', error);
        } finally {
          // 移除加载状态
          const loadingDiv = document.querySelector('.thumbnail-loading');
          if (loadingDiv) {
            loadingDiv.remove();
          }
        }
      }
    };

    const resize = (e) => {
      if (!isDragging) return;
      
      const width = startWidth + (e.pageX - startX);
      const newWidth = Math.min(Math.max(width, this.minSidebarWidth), this.maxSidebarWidth);
      sidebar.style.width = `${newWidth}px`;
      
      // 实时预览大小调整
      if (document.getElementById('sidebarMode').value === 'thumbnails') {
        const thumbnails = document.querySelectorAll('.thumbnail');
        thumbnails.forEach(thumbnail => {
          thumbnail.style.width = `${newWidth - 20}px`;
          const canvas = thumbnail.querySelector('canvas');
          if (canvas) {
            canvas.style.width = '100%';
            canvas.style.height = 'auto';
          }
        });
      }
    };

    resizer.addEventListener('mousedown', startResize);
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
    document.addEventListener('mouseleave', stopResize);
  }
}

// 创建查看器实例
window.addEventListener('DOMContentLoaded', () => {
  new PDFViewer();
}); 