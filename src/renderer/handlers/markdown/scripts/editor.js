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
    this.initFontControls();
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

    // 初始化分隔线拖动
    this.initSplitter();
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
      // 使用 requestAnimationFrame 优化滚动性能
      requestAnimationFrame(() => {
        // 同步行号滚动
        this.lineNumbers.style.top = `-${this.editor.scrollTop}px`;
        
        // 预览区域滚动同步
        if (document.body.classList.contains('split-mode')) {
          const percentage = this.editor.scrollTop / (this.editor.scrollHeight - this.editor.clientHeight);
          const previewContainer = this.preview.parentElement;
          const scrollTop = percentage * (previewContainer.scrollHeight - previewContainer.clientHeight);
          previewContainer.scrollTop = scrollTop;
        }
      });
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

    // 添加窗口大小变化监听
    window.addEventListener('resize', () => {
      this.updateLineNumbers();
    });
  }

  initModeControls() {
    const editMode = document.getElementById('editMode');
    const previewMode = document.getElementById('previewMode');
    const splitMode = document.getElementById('splitMode');
    const editorSection = document.querySelector('.editor-section');
    const previewSection = document.querySelector('.preview-section');

    editMode?.addEventListener('click', () => {
      document.body.className = 'edit-mode';
      this.updateActiveMode(editMode);
      // 重置flex样式
      editorSection.style.flex = '';
      previewSection.style.flex = '';
    });

    previewMode?.addEventListener('click', () => {
      document.body.className = 'preview-mode';
      this.updateActiveMode(previewMode);
      // 重置flex样式
      editorSection.style.flex = '';
      previewSection.style.flex = '';
    });

    splitMode?.addEventListener('click', () => {
      document.body.className = 'split-mode';
      this.updateActiveMode(splitMode);
      // 重置为均分
      editorSection.style.flex = '1';
      previewSection.style.flex = '1';
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

    const scrollToMatch = (index) => {
      if (index >= 0 && index < matches.length) {
        const matchPosition = matches[index];
        const matchLength = this.searchInput.value.length;
        
        // 设置选中
        this.editor.setSelectionRange(matchPosition, matchPosition + matchLength);
        
        // 计算滚动位置
        const lineHeight = parseFloat(getComputedStyle(this.editor).lineHeight);
        const textBeforeMatch = this.editor.value.substring(0, matchPosition);
        const linesBeforeMatch = textBeforeMatch.split('\n').length - 1;
        const scrollPosition = linesBeforeMatch * lineHeight;
        
        // 确保选中内容在视图中间
        const editorHeight = this.editor.clientHeight;
        this.editor.scrollTop = scrollPosition - (editorHeight / 2);
        
        // 聚焦编辑器
        this.editor.focus();
      }
    };

    const updateSearchStatus = () => {
      const searchStatus = document.querySelector('.search-status');
      if (!searchStatus) return;
      
      if (matches.length > 0) {
        searchStatus.textContent = `${currentMatch + 1}/${matches.length}`;
        searchStatus.style.display = 'inline';
      } else {
        searchStatus.textContent = '无匹配';
        searchStatus.style.display = this.searchInput.value ? 'inline' : 'none';
      }
    };

    // 在搜索输入框变化时更新
    this.searchInput.addEventListener('input', () => {
      findMatches();
      currentMatch = matches.length > 0 ? 0 : -1;
      updateSearchStatus();
      if (currentMatch >= 0) {
        scrollToMatch(currentMatch);
      }
    });

    // 在查找操作后更新状态
    const findNext = document.getElementById('findNext');
    const findPrev = document.getElementById('findPrev');
    
    findNext?.addEventListener('click', () => {
      findMatches();
      if (matches.length > 0) {
        currentMatch = (currentMatch + 1) % matches.length;
        scrollToMatch(currentMatch);
        updateSearchStatus();
      }
    });

    findPrev?.addEventListener('click', () => {
      findMatches();
      if (matches.length > 0) {
        currentMatch = currentMatch <= 0 ? matches.length - 1 : currentMatch - 1;
        scrollToMatch(currentMatch);
        updateSearchStatus();
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
    // 获取编辑器内容的实际行数（只计算换行符）
    const lines = this.editor.value.split('\n');
    const lineCount = lines.length;
    
    // 获取编辑器的行高并设置为 CSS 变量
    const lineHeight = parseFloat(getComputedStyle(this.editor).lineHeight);
    document.documentElement.style.setProperty('--line-height', `${lineHeight}px`);
    
    // 计算每行的实际高度（考虑自动换行）
    const lineHeights = lines.map(line => {
      // 创建临时元素来测量实际高度
      const temp = document.createElement('div');
      temp.style.cssText = `
        position: absolute;
        visibility: hidden;
        white-space: pre-wrap;
        word-wrap: break-word;
        overflow-wrap: break-word;
        width: ${this.editor.clientWidth - 60}px; /* 减去padding和行号宽度 */
        font-family: ${getComputedStyle(this.editor).fontFamily};
        font-size: ${getComputedStyle(this.editor).fontSize};
        line-height: ${lineHeight}px;
        padding: 0;
        margin: 0;
      `;
      temp.textContent = line || ' '; // 空行也要保持一行高度
      document.body.appendChild(temp);
      const height = temp.offsetHeight;
      document.body.removeChild(temp);
      return height;
    });
    
    // 生成行号 HTML，并计算每个行号的位置
    let currentTop = 20; // 初始padding-top
    const lineNumbersHTML = lines.map((_, i) => {
      const lineNumber = i + 1;
      const lineNumberHTML = `<div class="line-number" style="top: ${currentTop}px">${lineNumber}</div>`;
      currentTop += lineHeights[i];
      return lineNumberHTML;
    }).join('');
    
    // 更新行号容器
    this.lineNumbers.innerHTML = lineNumbersHTML;
    
    // 设置行号容器的总高度
    const totalHeight = currentTop + 20; // 加上padding-bottom
    this.lineNumbers.style.height = `${totalHeight}px`;
    
    // 同步滚动位置
    requestAnimationFrame(() => {
      this.lineNumbers.style.top = `-${this.editor.scrollTop}px`;
    });
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

  initFontControls() {
    const fontDecrease = document.getElementById('fontDecrease');
    const fontIncrease = document.getElementById('fontIncrease');
    
    fontDecrease?.addEventListener('click', () => {
      if (this.fontSize > 12) { // 最小字号限制
        this.fontSize -= 2;
        this.updateFontSize();
      }
    });
    
    fontIncrease?.addEventListener('click', () => {
      if (this.fontSize < 24) { // 最大字号限制
        this.fontSize += 2;
        this.updateFontSize();
      }
    });
  }

  updateFontSize() {
    this.editor.style.fontSize = `${this.fontSize}px`;
    this.lineNumbers.style.fontSize = `${this.fontSize}px`;
    // 更新行号高度以匹配新的字体大小
    this.updateLineNumbers();
  }

  initSplitter() {
    const container = document.querySelector('.editor-container');
    const editorSection = document.querySelector('.editor-section');
    const previewSection = document.querySelector('.preview-section');
    const splitter = document.querySelector('.splitter');
    
    let isDragging = false;
    let startX;
    let startWidth;
    
    splitter?.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.pageX;
      startWidth = editorSection.getBoundingClientRect().width;
      
      // 添加拖动状态样式
      document.body.classList.add('dragging');
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      // 计算拖动距离
      const delta = e.pageX - startX;
      
      // 计算新的宽度百分比
      const containerWidth = container.getBoundingClientRect().width;
      const newWidth = ((startWidth + delta) / containerWidth) * 100;
      
      // 限制最小和最大宽度
      if (newWidth >= 20 && newWidth <= 80) {
        editorSection.style.flex = `0 0 ${newWidth}%`;
        previewSection.style.flex = `0 0 ${100 - newWidth}%`;
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        document.body.classList.remove('dragging');
        
        // 确保在分屏模式下分隔线保持显示
        if (document.body.classList.contains('split-mode')) {
          splitter.style.display = 'block';
        }
      }
    });
    
    // 双击分隔线重置为均分
    splitter?.addEventListener('dblclick', () => {
      if (document.body.classList.contains('split-mode')) {
        editorSection.style.flex = '1 1 50%';
        previewSection.style.flex = '1 1 50%';
      }
    });
  }
}

// 创建编辑器实例
window.addEventListener('DOMContentLoaded', () => {
  new MarkdownEditor();
}); 