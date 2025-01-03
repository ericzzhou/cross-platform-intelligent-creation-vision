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

    this.initEditor();
    this.initSearch();
    this.initFontControls();
    this.initFileHandling();
  }

  initEditor() {
    // 行号和光标位置更新
    this.editor.addEventListener('input', () => {
      this.updateLineNumbers();
      this.updateCursorPosition();
      this.setModified(true);
    });

    this.editor.addEventListener('scroll', () => {
      this.lineNumbers.scrollTop = this.editor.scrollTop;
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
      this.setModified(false);
    });

    window.textAPI.onError((error) => {
      console.error('File error:', error);
    });
  }

  updateLineNumbers() {
    const lines = this.editor.value.split('\n');
    this.lineNumbers.innerHTML = lines.map((_, i) => `${i + 1}`).join('\n');
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
    }
  }

  async saveFile() {
    if (!this.modified) return;
    
    try {
      await window.textAPI.saveFile(this.editor.value);
      this.setModified(false);
    } catch (error) {
      console.error('保存失败:', error);
    }
  }
}

new TextEditor(); 