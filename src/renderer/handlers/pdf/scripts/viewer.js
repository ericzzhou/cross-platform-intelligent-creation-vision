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

    // 初始化 PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    this.initControls();
    this.initWindowControls();
    this.initFileHandling();
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

    // 键盘快捷键
    document.addEventListener('keydown', (e) => this.onKeyDown(e));

    // 鼠标滚轮缩放
    document.addEventListener('wheel', (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        this.onZoom(e.deltaY < 0 ? 1.1 : 0.9);
      }
    });
  }

  initWindowControls() {
    const minimizeBtn = document.querySelector('.window-controls .minimize');
    const maximizeBtn = document.querySelector('.window-controls .maximize');
    const closeBtn = document.querySelector('.window-controls .close');

    minimizeBtn?.addEventListener('click', () => {
      window.pdfAPI.windowControl.minimize();
    });

    maximizeBtn?.addEventListener('click', () => {
      window.pdfAPI.windowControl.maximize();
    });

    closeBtn?.addEventListener('click', () => {
      window.pdfAPI.windowControl.close();
    });

    // ESC 键关闭窗口
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.pdfAPI.windowControl.close();
      }
    });

    window.pdfAPI.onMaximizeChange((isMaximized) => {
      if (isMaximized) {
        maximizeBtn?.classList.add('maximized');
      } else {
        maximizeBtn?.classList.remove('maximized');
      }
    });
  }

  initFileHandling() {
    window.pdfAPI.onFileLoad(async (data) => {
      this.showLoading(true);
      try {
        console.log('Received PDF data:', data); // 添加调试日志
        const binary = atob(data.data);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        
        // 直接使用 Uint8Array 加载
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

    window.pdfAPI.onPrintError((error) => {
      this.showError(`打印失败: ${error}`);
    });
  }

  async loadPDF(pdfData) {
    try {
      // 清理之前的内容
      this.viewer.innerHTML = '';
      
      console.log('Loading PDF with data length:', pdfData.length); // 添加调试日志
      
      // 加载 PDF 文档
      this.pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;
      
      console.log('PDF loaded, pages:', this.pdfDoc.numPages); // 添加调试日志
      
      // 更新页码信息
      document.getElementById('pageCount').textContent = this.pdfDoc.numPages;
      document.getElementById('pageNumber').value = this.pageNum;
      
      // 渲染第一页
      await this.renderPage(this.pageNum);
      
      // 更新 UI 状态
      this.updateUIState();
    } catch (error) {
      console.error('Error loading PDF:', error);
      this.showError(error.message);
    }
  }

  async renderPage(num) {
    if (this.pageRendering) {
      this.pageNumPending = num;
      return;
    }
    
    this.pageRendering = true;
    console.log('Rendering page:', num); // 添加调试日志
    
    try {
      const page = await this.pdfDoc.getPage(num);
      const viewport = page.getViewport({ scale: this.scale, rotation: this.rotation });
      
      const canvas = document.createElement('canvas');
      canvas.className = 'page';
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      console.log('Page rendered successfully'); // 添加调试日志
      
      // 清理旧页面并添加新页面
      this.viewer.innerHTML = '';
      this.viewer.appendChild(canvas);
      
      this.pageRendering = false;
      if (this.pageNumPending !== null) {
        this.renderPage(this.pageNumPending);
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
  }

  onNextPage() {
    if (this.pageNum >= this.pdfDoc.numPages) return;
    this.pageNum++;
    this.renderPage(this.pageNum);
  }

  onPageNumberChange(e) {
    const num = parseInt(e.target.value);
    if (num && num > 0 && num <= this.pdfDoc.numPages) {
      this.pageNum = num;
      this.renderPage(this.pageNum);
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
  }

  onZoomLevelChange(e) {
    const value = e.target.value;
    if (value === 'auto') {
      // 自适应逻辑
      const containerWidth = this.viewer.clientWidth;
      const containerHeight = this.viewer.clientHeight;
      const page = this.pdfDoc.getPage(this.pageNum);
      const viewport = page.getViewport({ scale: 1 });
      this.scale = Math.min(
        containerWidth / viewport.width,
        containerHeight / viewport.height
      );
    } else if (value === 'page-width') {
      // 适合页宽逻辑
      const containerWidth = this.viewer.clientWidth;
      const page = this.pdfDoc.getPage(this.pageNum);
      const viewport = page.getViewport({ scale: 1 });
      this.scale = containerWidth / viewport.width;
    } else if (value === 'page-height') {
      // 适合页高逻辑
      const containerHeight = this.viewer.clientHeight;
      const page = this.pdfDoc.getPage(this.pageNum);
      const viewport = page.getViewport({ scale: 1 });
      this.scale = containerHeight / viewport.height;
    } else {
      this.scale = parseFloat(value);
    }
    this.renderPage(this.pageNum);
  }

  onRotateLeft() {
    this.rotation = (this.rotation - 90) % 360;
    this.renderPage(this.pageNum);
  }

  onRotateRight() {
    this.rotation = (this.rotation + 90) % 360;
    this.renderPage(this.pageNum);
  }

  onPrint() {
    window.pdfAPI.print();
  }

  onSave() {
    window.pdfAPI.save();
  }

  onKeyDown(e) {
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      this.onPrevPage();
    } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      this.onNextPage();
    } else if (e.key === 'Home') {
      this.pageNum = 1;
      this.renderPage(this.pageNum);
    } else if (e.key === 'End') {
      this.pageNum = this.pdfDoc.numPages;
      this.renderPage(this.pageNum);
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

  async updateFileInfo() {
    const info = await window.pdfAPI.getFileInfo();
    if (info) {
      document.querySelector('.file-size').textContent = this.formatFileSize(info.size);
      document.querySelector('.file-time').textContent = new Date(info.mtime).toLocaleString();
      document.querySelector('.file-path').textContent = info.path;
    }
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
}

// 创建查看器实例
window.addEventListener('DOMContentLoaded', () => {
  new PDFViewer();
}); 