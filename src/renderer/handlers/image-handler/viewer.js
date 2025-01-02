export class ImageViewer {
  constructor(container) {
    this.container = container;
    this.scale = 1;
    this.rotation = 0;
    this.position = { x: 0, y: 0 };
    this.setupUI();
  }

  setupUI() {
    this.container.innerHTML = `
      <div class="image-viewer">
        <div class="toolbar">
          <button class="zoom-in">放大</button>
          <button class="zoom-out">缩小</button>
          <button class="rotate-left">向左旋转</button>
          <button class="rotate-right">向右旋转</button>
          <button class="reset">重置</button>
        </div>
        <div class="image-container">
          <img class="preview-image" draggable="false">
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  setupEventListeners() {
    const img = this.container.querySelector('.preview-image');
    const container = this.container.querySelector('.image-container');
    
    // 缩放控制
    this.container.querySelector('.zoom-in').addEventListener('click', () => this.zoomIn());
    this.container.querySelector('.zoom-out').addEventListener('click', () => this.zoomOut());
    
    // 旋转控制
    this.container.querySelector('.rotate-left').addEventListener('click', () => this.rotate(-90));
    this.container.querySelector('.rotate-right').addEventListener('click', () => this.rotate(90));
    
    // 重置
    this.container.querySelector('.reset').addEventListener('click', () => this.reset());

    // 鼠标拖动
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    container.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        isDragging = true;
        startX = e.clientX - this.position.x;
        startY = e.clientY - this.position.y;
        img.style.cursor = 'grabbing';
      }
    });

    container.addEventListener('mousemove', (e) => {
      if (isDragging) {
        this.position.x = e.clientX - startX;
        this.position.y = e.clientY - startY;
        this.updateTransform();
      }
    });

    container.addEventListener('mouseup', () => {
      isDragging = false;
      img.style.cursor = 'grab';
    });

    container.addEventListener('mouseleave', () => {
      isDragging = false;
      img.style.cursor = 'grab';
    });

    // 鼠标滚轮缩放
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY * -0.01;
      this.scale = Math.min(Math.max(0.1, this.scale + delta), 10);
      this.updateTransform();
    });
  }

  zoomIn() {
    this.scale = Math.min(this.scale * 1.1, 10);
    this.updateTransform();
  }

  zoomOut() {
    this.scale = Math.max(this.scale * 0.9, 0.1);
    this.updateTransform();
  }

  rotate(angle) {
    this.rotation = (this.rotation + angle) % 360;
    this.updateTransform();
  }

  reset() {
    this.scale = 1;
    this.rotation = 0;
    this.position = { x: 0, y: 0 };
    this.updateTransform();
  }

  updateTransform() {
    const img = this.container.querySelector('.preview-image');
    img.style.transform = `translate(${this.position.x}px, ${this.position.y}px) scale(${this.scale}) rotate(${this.rotation}deg)`;
  }

  load(file) {
    return new Promise((resolve, reject) => {
      const img = this.container.querySelector('.preview-image');
      if (file.path) {
        img.src = file.path;
      } else {
        img.src = URL.createObjectURL(file);
      }
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
    });
  }

  destroy() {
    // 清理事件监听器和资源
    this.container.innerHTML = '';
  }
} 