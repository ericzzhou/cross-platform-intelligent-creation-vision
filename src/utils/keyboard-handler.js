export class KeyboardHandler {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  handleKeyDown(event) {
    // 防止在输入框中触发快捷键
    if (event.target.tagName === 'INPUT') return;

    const { key, ctrlKey, metaKey } = event;

    // 通用快捷键
    if (ctrlKey || metaKey) {
      switch (key) {
        case 'o':
          event.preventDefault();
          this.callbacks.openFile?.();
          break;
        case 'w':
          event.preventDefault();
          this.callbacks.close?.();
          break;
        case '0':
          event.preventDefault();
          this.callbacks.resetZoom?.();
          break;
        case '=':
        case '+':
          event.preventDefault();
          this.callbacks.zoomIn?.();
          break;
        case '-':
          event.preventDefault();
          this.callbacks.zoomOut?.();
          break;
      }
    } else {
      // 普通快捷键
      switch (key) {
        case 'Escape':
          this.callbacks.escape?.();
          break;
        case 'ArrowLeft':
          this.callbacks.prev?.();
          break;
        case 'ArrowRight':
          this.callbacks.next?.();
          break;
        case 'r':
          this.callbacks.rotateRight?.();
          break;
        case 'R':
          this.callbacks.rotateLeft?.();
          break;
      }
    }
  }

  destroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
  }
} 