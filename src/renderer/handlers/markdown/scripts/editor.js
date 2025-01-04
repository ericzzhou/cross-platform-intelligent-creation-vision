class MarkdownEditor {
  constructor() {
    this.editor = document.getElementById('editor');
    this.preview = document.getElementById('preview');
    this.lineNumbers = document.querySelector('.line-numbers');
    this.titleElement = document.querySelector('.title');
    this.saveStatus = document.querySelector('.save-status');
    this.fontSize = 14;
    this.modified = false;

    // 初始化 markdown-it
    this.md = window.markdownit({
      html: true,
      linkify: true,
      typographer: true,
      highlight: (str, lang) => {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(str, { language: lang }).value;
          } catch (__) {}
        }
        return '';
      }
    });

    // 初始化各个组件
    this.initEditor();
    this.initModeControls();
    this.initSearch();
    this.initWindowControls();
    this.updateLineNumbers();
    this.updateWordCount();

    // 初始化状态显示
    this.saveStatus.textContent = '';
    document.querySelector('.file-path').textContent = '';

    // 监听标题更新
    window.markdownAPI.onTitleUpdate((title) => {
      if (this.titleElement) {
        this.titleElement.textContent = title;
        console.log('Title updated:', title);
      }
    });

    // 添加加载状态管理
    this.loading = false;
    this.loadingElement = document.createElement('div');
    this.loadingElement.className = 'loading';
    document.querySelector('.editor-container').appendChild(this.loadingElement);
    this.showLoading(false);

    // 初始化编辑器状态
    document.body.classList.add('split-mode');
    this.updateActiveMode(document.getElementById('splitMode'));

    // 初始化文件处理
    this.initFileHandling();

    // 添加调试日志
    console.log('Editor initialized');

    // 添加 ESC 键监听
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.markdownAPI.windowControl.close();
      }
    });
  }

  initEditor() {
    // 编辑器输入处理
    this.editor.addEventListener('input', () => {
      this.updatePreview();
      this.updateLineNumbers();
      this.updateCursorPosition();
      this.updateWordCount();
      this.setModified(true);
    });

    // 滚动同步
    this.editor.addEventListener('scroll', () => {
      this.lineNumbers.style.top = `-${this.editor.scrollTop}px`;
      if (document.body.classList.contains('split-mode')) {
        const percentage = this.editor.scrollTop / (this.editor.scrollHeight - this.editor.clientHeight);
        this.preview.parentElement.scrollTop = percentage * (this.preview.parentElement.scrollHeight - this.preview.parentElement.clientHeight);
      }
    });

    // Tab 键支持
    this.editor.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        this.editor.value = this.editor.value.substring(0, start) + '    ' + this.editor.value.substring(end);
        this.editor.selectionStart = this.editor.selectionEnd = start + 4;
        this.updatePreview();
      }
    });
  }

  initModeControls() {
    const editMode = document.getElementById('editMode');
    const previewMode = document.getElementById('previewMode');
    const splitMode = document.getElementById('splitMode');

    editMode.addEventListener('click', () => {
      document.body.className = 'edit-mode';
      this.updateActiveMode(editMode);
    });

    previewMode.addEventListener('click', () => {
      document.body.className = 'preview-mode';
      this.updateActiveMode(previewMode);
    });

    splitMode.addEventListener('click', () => {
      document.body.className = 'split-mode';
      this.updateActiveMode(splitMode);
    });
  }

  updateActiveMode(activeButton) {
    document.querySelectorAll('.mode-controls button').forEach(btn => {
      btn.classList.remove('active');
    });
    activeButton.classList.add('active');
  }

  updatePreview() {
    const content = this.editor.value;
    const html = this.md.render(content);
    this.preview.innerHTML = html;
  }

  initSearch() {
    // 初始化搜索相关元素
    this.searchInput = document.getElementById('searchInput');
    this.replaceInput = document.getElementById('replaceInput');
    
    let currentMatch = -1;
    let matches = [];

    const findMatches = () => {
      const searchText = this.searchInput.value;
      if (!searchText) {
        matches = [];
        currentMatch = -1;
        return;
      }

      matches = [];
      const text = this.editor.value;
      let match;
      const regex = new RegExp(searchText, 'gi');
      while ((match = regex.exec(text)) !== null) {
        matches.push(match.index);
      }
    };

    // 搜索和替换功能实现
    document.getElementById('findNext')?.addEventListener('click', () => {
      findMatches();
      if (matches.length > 0) {
        currentMatch = (currentMatch + 1) % matches.length;
        this.editor.setSelectionRange(matches[currentMatch], matches[currentMatch] + this.searchInput.value.length);
        this.editor.focus();
      }
    });

    // 替换功能
    document.getElementById('replace')?.addEventListener('click', () => {
      if (currentMatch >= 0 && this.searchInput.value) {
        const start = matches[currentMatch];
        const end = start + this.searchInput.value.length;
        this.editor.value = this.editor.value.substring(0, start) +
          this.replaceInput.value +
          this.editor.value.substring(end);
        this.updatePreview();
        findMatches();
      }
    });
  }

  async initFileHandling() {
    // 文件加载
    window.markdownAPI.onFileLoad(async (content) => {
      this.showLoading(true);
      try {
        // 设置编辑器内容
        this.editor.value = content;
        
        // 更新预览
        this.updatePreview();
        
        // 更新行号和字数统计
        this.updateLineNumbers();
        this.updateWordCount();
        
        // 重置修改状态
        this.setModified(false);
        
        // 设置光标位置到开头并聚焦编辑器
        this.editor.selectionStart = 0;
        this.editor.selectionEnd = 0;
        this.editor.blur();
        requestAnimationFrame(() => {
          this.editor.focus();
        });

        console.log('File loaded:', content); // 添加调试日志
      } catch (error) {
        console.error('Error loading file:', error);
      } finally {
        this.showLoading(false);
      }
    });

    // 文件信息更新
    window.markdownAPI.onFileChange((info) => {
      if (info) {
        this.updateFileInfo(info);
        console.log('File info updated:', info); // 添加调试日志
      }
    });

    // 错误处理
    window.markdownAPI.onError((error) => {
      console.error('File error:', error);
      // 添加错误提示 UI
      this.showError(error);
    });
  }

  updateFileInfo(info) {
    if (!info) {
      document.querySelector('.file-size').textContent = '';
      document.querySelector('.file-time').textContent = '';
      document.querySelector('.file-path').textContent = '';
      document.querySelector('.encoding').textContent = 'UTF-8';
      return;
    }

    // 更新文件大小
    const size = this.formatFileSize(info.size);
    document.querySelector('.file-size').textContent = size;

    // 更新修改时间
    const time = new Date(info.mtime).toLocaleString();
    document.querySelector('.file-time').textContent = time;

    // 更新文件路径
    const fileName = info.path.split(/[/\\]/).pop();
    document.querySelector('.file-path').textContent = fileName;
    document.querySelector('.file-path').title = info.path;

    // 更新编码显示
    document.querySelector('.encoding').textContent = info.encoding.toUpperCase();
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }

  setModified(modified) {
    this.modified = modified;
    window.markdownAPI.setModified(modified);
    this.saveStatus.textContent = modified ? '未保存' : '';
    this.saveStatus.style.color = modified ? '#f44336' : '#4caf50';
  }

  updateLineNumbers() {
    const lines = this.editor.value.split('\n');
    const lineCount = lines.length;
    const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1)
      .map(num => `<div class="line-number">${num}</div>`)
      .join('');
    this.lineNumbers.innerHTML = lineNumbers;
  }

  updateCursorPosition() {
    const pos = this.editor.selectionStart;
    const text = this.editor.value.substring(0, pos);
    const lines = text.split('\n');
    const currentLine = lines.length;
    const currentColumn = lines[lines.length - 1].length + 1;
    document.querySelector('.cursor-position').textContent = `行: ${currentLine}, 列: ${currentColumn}`;
  }

  updateWordCount() {
    const text = this.editor.value;
    const words = text.trim().split(/[\s\n]+/).filter(word => word.length > 0);
    const wordCount = words.length;
    const charCount = text.length;
    document.querySelector('.word-count').textContent = `字数: ${wordCount} 字符: ${charCount}`;
  }

  showLoading(show) {
    this.loading = show;
    this.loadingElement.style.display = show ? 'flex' : 'none';
  }

  // 添加错误提示方法
  showError(error) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = `错误: ${error}`;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      errorDiv.remove();
    }, 3000);
  }

  initWindowControls() {
    const minimizeBtn = document.querySelector('.window-controls .minimize');
    const maximizeBtn = document.querySelector('.window-controls .maximize');
    const closeBtn = document.querySelector('.window-controls .close');

    console.log('Window controls:', { minimizeBtn, maximizeBtn, closeBtn });

    minimizeBtn?.addEventListener('click', () => {
      console.log('Minimize clicked');
      window.markdownAPI.windowControl.minimize();
    });

    maximizeBtn?.addEventListener('click', () => {
      console.log('Maximize clicked');
      window.markdownAPI.windowControl.maximize();
    });

    closeBtn?.addEventListener('click', () => {
      console.log('Close clicked');
      window.markdownAPI.windowControl.close();
    });

    window.markdownAPI.onMaximizeChange((isMaximized) => {
      console.log('Maximize state changed:', isMaximized);
      if (isMaximized) {
        maximizeBtn?.classList.add('maximized');
      } else {
        maximizeBtn?.classList.remove('maximized');
      }
    });
  }
}

// 创建编辑器实例
window.addEventListener('DOMContentLoaded', () => {
  new MarkdownEditor();
}); 