window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

document.addEventListener('DOMContentLoaded', async () => {
  const editor = document.getElementById('editor');
  const lineNumbers = document.querySelector('.line-numbers');
  const searchPanel = document.querySelector('.search-panel');
  const searchInput = document.getElementById('search-input');
  const cursorPosition = document.querySelector('.cursor-position');
  const fileInfo = document.querySelector('.file-info');

  // 初始化加载内容
  try {
    const content = await window.textAPI.getContent();
    if (content) {
      editor.value = content;
      updateLineNumbers();
    }
  } catch (err) {
    console.error('Failed to load initial content:', err);
  }

  // 窗口控制
  document.getElementById('minimize').addEventListener('click', async () => {
    try {
      await window.textAPI.minimizeWindow();
    } catch (err) {
      console.error('Failed to minimize window:', err);
    }
  });
  
  document.getElementById('maximize').addEventListener('click', async () => {
    try {
      await window.textAPI.maximizeWindow();
    } catch (err) {
      console.error('Failed to maximize window:', err);
    }
  });
  
  document.getElementById('close').addEventListener('click', async () => {
    try {
      await window.textAPI.closeWindow();
    } catch (err) {
      console.error('Failed to close window:', err);
    }
  });

  // 文件加载
  window.textAPI.onFileLoaded(({ content, path }) => {
    editor.value = content;
    updateLineNumbers();
    fileInfo.textContent = path;
  });

  window.textAPI.onFileError((error) => {
    alert('加载文件失败：' + error);
  });

  // 保存文件
  document.getElementById('save').addEventListener('click', async () => {
    const success = await window.textAPI.saveContent(editor.value);
    if (!success) {
      alert('保存失败');
    }
  });

  // 行号更新
  function updateLineNumbers() {
    const lines = editor.value.split('\n');
    lineNumbers.innerHTML = lines
      .map((_, i) => `<div>${i + 1}</div>`)
      .join('');
  }

  editor.addEventListener('input', updateLineNumbers);
  editor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = editor.scrollTop;
  });

  // 光标位置
  editor.addEventListener('keyup', updateCursorPosition);
  editor.addEventListener('click', updateCursorPosition);

  function updateCursorPosition() {
    const pos = editor.selectionStart;
    const lines = editor.value.substr(0, pos).split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    cursorPosition.textContent = `行: ${line}, 列: ${col}`;
  }

  // 搜索功能
  let searchResults = [];
  let currentMatch = -1;

  document.getElementById('search').addEventListener('click', () => {
    searchPanel.classList.toggle('hidden');
    if (!searchPanel.classList.contains('hidden')) {
      searchInput.focus();
    }
  });

  document.getElementById('close-search').addEventListener('click', () => {
    searchPanel.classList.add('hidden');
  });

  searchInput.addEventListener('input', () => {
    const searchText = searchInput.value;
    if (!searchText) {
      searchResults = [];
      currentMatch = -1;
      return;
    }

    searchResults = [];
    let match;
    const regex = new RegExp(searchText, 'g');
    while ((match = regex.exec(editor.value)) !== null) {
      searchResults.push(match.index);
    }
    currentMatch = searchResults.length > 0 ? 0 : -1;
    if (currentMatch >= 0) {
      highlightMatch(searchResults[currentMatch]);
    }
  });

  function highlightMatch(index) {
    editor.focus();
    editor.setSelectionRange(index, index + searchInput.value.length);
  }

  document.getElementById('next-match').addEventListener('click', () => {
    if (searchResults.length === 0) return;
    currentMatch = (currentMatch + 1) % searchResults.length;
    highlightMatch(searchResults[currentMatch]);
  });

  document.getElementById('prev-match').addEventListener('click', () => {
    if (searchResults.length === 0) return;
    currentMatch = (currentMatch - 1 + searchResults.length) % searchResults.length;
    highlightMatch(searchResults[currentMatch]);
  });

  // 字体大小调整
  let fontSize = 14;
  document.getElementById('font-increase').addEventListener('click', () => {
    fontSize = Math.min(fontSize + 2, 24);
    editor.style.fontSize = `${fontSize}px`;
  });

  document.getElementById('font-decrease').addEventListener('click', () => {
    fontSize = Math.max(fontSize - 2, 8);
    editor.style.fontSize = `${fontSize}px`;
  });
}); 