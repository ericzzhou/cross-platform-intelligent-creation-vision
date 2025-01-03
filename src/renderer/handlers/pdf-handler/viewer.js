import { getDocument } from 'pdfjs-dist';

export class PDFViewer {
  constructor(container) {
    this.container = container;
    this.pdfDoc = null;
    this.currentPage = 1;
    this.scale = 1.0;
    this.setupUI();
  }

  setupUI() {
    this.container.innerHTML = `
      <div class="pdf-viewer">
        <div class="toolbar">
          <div class="page-controls">
            <button class="prev-page">上一页</button>
            <span class="page-info">第 <span class="current-page">1</span> 页，共 <span class="total-pages">0</span> 页</span>
            <button class="next-page">下一页</button>
          </div>
          <div class="zoom-controls">
            <button class="zoom-out">缩小</button>
            <span class="zoom-level">100%</span>
            <button class="zoom-in">放大</button>
          </div>
        </div>
        <div class="pdf-container">
          <canvas class="pdf-canvas"></canvas>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  setupEventListeners() {
    const toolbar = this.container.querySelector('.toolbar');
    
    toolbar.querySelector('.prev-page').addEventListener('click', () => this.prevPage());
    toolbar.querySelector('.next-page').addEventListener('click', () => this.nextPage());
    toolbar.querySelector('.zoom-in').addEventListener('click', () => this.zoomIn());
    toolbar.querySelector('.zoom-out').addEventListener('click', () => this.zoomOut());
  }

  async load(file) {
    try {
      const data = await this.readFileData(file);
      this.pdfDoc = await getDocument(data).promise;
      this.updatePageInfo();
      await this.renderPage(1);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async readFileData(file) {
    if (file.path) {
      // 如果是本地文件，使用 ArrayBuffer
      const buffer = await window.electron.readFile(file.path);
      return new Uint8Array(buffer);
    } else {
      // 如果是拖放的文件，使用 Blob
      return file;
    }
  }

  async renderPage(num) {
    if (!this.pdfDoc) return;

    const page = await this.pdfDoc.getPage(num);
    const canvas = this.container.querySelector('.pdf-canvas');
    const ctx = canvas.getContext('2d');

    const viewport = page.getViewport({ scale: this.scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: ctx,
      viewport: viewport
    }).promise;

    this.currentPage = num;
    this.updatePageInfo();
  }

  updatePageInfo() {
    const currentPageEl = this.container.querySelector('.current-page');
    const totalPagesEl = this.container.querySelector('.total-pages');
    const zoomLevelEl = this.container.querySelector('.zoom-level');

    currentPageEl.textContent = this.currentPage;
    totalPagesEl.textContent = this.pdfDoc?.numPages || 0;
    zoomLevelEl.textContent = `${Math.round(this.scale * 100)}%`;
  }

  async prevPage() {
    if (this.currentPage <= 1) return;
    await this.renderPage(this.currentPage - 1);
  }

  async nextPage() {
    if (this.currentPage >= this.pdfDoc?.numPages) return;
    await this.renderPage(this.currentPage + 1);
  }

  zoomIn() {
    this.scale = Math.min(this.scale * 1.1, 3.0);
    this.renderPage(this.currentPage);
  }

  zoomOut() {
    this.scale = Math.max(this.scale * 0.9, 0.5);
    this.renderPage(this.currentPage);
  }

  destroy() {
    if (this.pdfDoc) {
      this.pdfDoc.destroy();
      this.pdfDoc = null;
    }
    this.container.innerHTML = '';
  }
} 