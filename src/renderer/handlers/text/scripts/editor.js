class TextEditor {
  constructor() {
    this.editor = document.getElementById('editor');
    this.lineNumbers = document.querySelector('.line-numbers');
    this.cursorPosition = document.querySelector('.cursor-position');
    this.saveStatus = document.querySelector('.save-status');
    this.searchInput = document.getElementById('searchInput');
    this.replaceInput = document.getElementById('replaceInput');
    this.fontSize = 14;
    this.modified = false;
    this.titleElement = document.querySelector('.title');

    this.initEditor();
    this.initSearch();
    this.initFontControls();
    this.initFileHandling();
    this.initWindowControls();
    this.updateLineNumbers();
    this.updateWordCount();
    this.initFileInfo();
    this.initDragDrop();

    // 初始化状态显示
    this.saveStatus.textContent = ''; // 初始状态不显示任何文本
    document.querySelector('.file-path').textContent = ''; // 初始状态不显示任何文本

    // 监听标题更新
    window.textAPI.onTitleUpdate((title) => {
      this.titleElement.textContent = title;
    });
  }

  initEditor() {
    // 行号和光标位置更新
    this.editor.addEventListener('input', () => {
      this.updateLineNumbers();
      this.updateCursorPosition();
      this.updateWordCount();
      this.setModified(true);
    });

    this.editor.addEventListener('scroll', () => {
      this.lineNumbers.style.top = `-${this.editor.scrollTop}px`;
    });

    this.editor.addEventListener('keydown', (e) => {
      // Tab 键支持
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        this.editor.value = this.editor.value.substring(0, start) + '    ' + this.editor.value.substring(end);
        this.editor.selectionStart = this.editor.selectionEnd = start + 4;
      }

      // 保存快捷键
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.saveFile();
      }
    });

    // 光标位置更新
    this.editor.addEventListener('mouseup', () => this.updateCursorPosition());
    this.editor.addEventListener('keyup', () => this.updateCursorPosition());
  }

  initSearch() {
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

    document.getElementById('findNext').addEventListener('click', () => {
      findMatches();
      if (matches.length > 0) {
        currentMatch = (currentMatch + 1) % matches.length;
        this.editor.setSelectionRange(matches[currentMatch], matches[currentMatch] + this.searchInput.value.length);
        this.editor.focus();
      }
    });

    document.getElementById('findPrev').addEventListener('click', () => {
      findMatches();
      if (matches.length > 0) {
        currentMatch = (currentMatch - 1 + matches.length) % matches.length;
        this.editor.setSelectionRange(matches[currentMatch], matches[currentMatch] + this.searchInput.value.length);
        this.editor.focus();
      }
    });

    document.getElementById('replace').addEventListener('click', () => {
      if (currentMatch >= 0 && matches.length > 0) {
        const start = matches[currentMatch];
        const end = start + this.searchInput.value.length;
        this.editor.value = this.editor.value.substring(0, start) + 
                           this.replaceInput.value + 
                           this.editor.value.substring(end);
        findMatches();
        this.setModified(true);
      }
    });

    document.getElementById('replaceAll').addEventListener('click', () => {
      if (this.searchInput.value) {
        this.editor.value = this.editor.value.replace(
          new RegExp(this.searchInput.value, 'g'),
          this.replaceInput.value
        );
        this.setModified(true);
      }
    });
  }

  initFontControls() {
    document.getElementById('fontIncrease').addEventListener('click', () => {
      this.fontSize = Math.min(this.fontSize + 2, 24);
      this.updateFontSize();
    });

    document.getElementById('fontDecrease').addEventListener('click', () => {
      this.fontSize = Math.max(this.fontSize - 2, 8);
      this.updateFontSize();
    });
  }

  initFileHandling() {
    window.textAPI.onFileLoad((content) => {
      this.editor.value = content;
      this.updateLineNumbers();
      this.updateWordCount();  // 更新字数统计
      this.setModified(false);
      
      // 设置光标位置到开头并聚焦编辑器
      this.editor.selectionStart = 0;
      this.editor.selectionEnd = 0;
      this.editor.blur();  // 先失焦
      requestAnimationFrame(() => {  // 使用 requestAnimationFrame 确保在下一帧再聚焦
        this.editor.focus();  // 重新聚焦，这样可以确保光标可见
      });

      // 加载完成后获取并更新文件信息
      window.textAPI.getFileInfo().then(info => {
        if (info) {
          this.updateFileInfo(info);
        }
      });
    });

    window.textAPI.onError((error) => {
      console.error('File error:', error);
    });

    // 监听文件信息更新
    window.textAPI.onFileChange((info) => {
      if (info) {
        this.updateFileInfo(info);
      }
    });
  }

  updateLineNumbers() {
    const lines = this.editor.value.split('\n');
    const lineCount = lines.length;
    const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1)
      .map(num => `<div class="line-number">${num}</div>`)
      .join('');
    this.lineNumbers.innerHTML = lineNumbers;

    // 更新行号容器的高度以匹配编辑器
    this.lineNumbers.style.height = `${this.editor.scrollHeight}px`;
  }

  updateCursorPosition() {
    const pos = this.editor.selectionStart;
    const text = this.editor.value.substring(0, pos);
    const lines = text.split('\n');
    const currentLine = lines.length;
    const currentColumn = lines[lines.length - 1].length + 1;
    this.cursorPosition.textContent = `行: ${currentLine}, 列: ${currentColumn}`;
  }

  updateFontSize() {
    document.documentElement.style.setProperty('--font-size', `${this.fontSize}px`);
  }

  setModified(modified) {
    if (this.modified !== modified) {
      this.modified = modified;
      document.body.classList.toggle('modified', modified);
      
      // 更新保存状态显示
      if (modified) {
        this.saveStatus.textContent = '未保存*';
      } else {
        this.saveStatus.textContent = '已保存';
      }

      // 通知主进程修改状态变化
      window.textAPI.setModified(modified);
    }
  }

  async saveFile() {
    if (!this.modified) return;
    
    try {
      const success = await window.textAPI.saveFile(this.editor.value);
      if (success) {
        this.setModified(false);
        
        // 获取并更新最新的文件信息
        const fileInfo = await window.textAPI.getFileInfo();
        if (fileInfo) {
          this.updateFileInfo(fileInfo);
        }
      }
    } catch (error) {
      console.error('保存失败:', error);
    }
  }

  initShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        this.toggleSearchPanel();
      }
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          this.saveFileAs();
        } else {
          this.saveFile();
        }
      }
    });
  }

  toggleSearchPanel() {
    const toolbar = document.querySelector('.toolbar');
    toolbar.classList.toggle('show-search');
    if (toolbar.classList.contains('show-search')) {
      this.searchInput.focus();
    }
  }

  updateWordCount() {
    const text = this.editor.value;
    // 使用更准确的中英文混合字数统计
    const words = text.trim().split(/[\s\n]+/).filter(word => word.length > 0);
    const wordCount = words.length;
    const charCount = text.length;  // 包含换行符的字符数
    document.querySelector('.word-count').textContent = 
      `字数: ${wordCount} 字符: ${charCount}`;
  }

  async saveFileAs() {
    try {
      await window.textAPI.saveFileAs(this.editor.value);
      this.setModified(false);
    } catch (error) {
      console.error('另存为失败:', error);
    }
  }

  initWindowControls() {
    // 窗口控制按钮事件
    const maximizeButton = document.querySelector('.maximize');
    
    document.querySelector('.minimize').addEventListener('click', () => {
      window.textAPI.windowControl.minimize();
    });

    maximizeButton.addEventListener('click', () => {
      window.textAPI.windowControl.maximize();
      // 切换最大化按钮的状态
      maximizeButton.classList.toggle('maximized');
    });

    document.querySelector('.close').addEventListener('click', () => {
      window.textAPI.windowControl.close();
    });

    // ESC键关闭窗口
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.textAPI.windowControl.close();
      }
    });

    // 监听窗口最大化状态变化
    window.textAPI.onMaximizeChange((isMaximized) => {
      maximizeButton.classList.toggle('maximized', isMaximized);
    });
  }

  initFileInfo() {
    // 监听文件信息更新
    window.textAPI.onFileChange((info) => {
      this.updateFileInfo(info);
    });
  }

  updateFileInfo(info) {
    if (!info) {
      // 清空所有状态显示
      document.querySelector('.file-size').textContent = '';
      document.querySelector('.file-time').textContent = '';
      document.querySelector('.file-path').textContent = '';
      document.querySelector('.file-path').removeAttribute('title');
      return;
    }

    // 更新文件大小
    const size = this.formatFileSize(info.size);
    document.querySelector('.file-size').textContent = size;

    // 更新修改时间
    const time = new Date(info.mtime).toLocaleString();
    document.querySelector('.file-time').textContent = time;

    // 更新文件路径 - 显示文件名而不是完整路径
    const fileName = info.path.split(/[/\\]/).pop();  // 提取文件名
    document.querySelector('.file-path').textContent = fileName;
    document.querySelector('.file-path').title = info.path; // 完整路径作为提示

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

  initDragDrop() {
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const file = e.dataTransfer.files[0];
      if (file) {
        await window.textAPI.openDroppedFile(file.path);
      }
    });
  }
}

new TextEditor(); 