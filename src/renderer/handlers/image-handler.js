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

export { ImageHandler }; 