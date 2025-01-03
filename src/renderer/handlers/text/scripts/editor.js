let editor;
let lineNumbers;
let currentFile;
let isDirty = false;

document.addEventListener('DOMContentLoaded', () => {
  editor = document.getElementById('editor');
  lineNumbers = document.querySelector('.line-numbers');

  // 窗口控制
  document.getElementById('minimize').onclick = () => window.textEditor.window.minimize();
  document.getElementById('maximize').onclick = () => window.textEditor.window.maximize();
  document.getElementById('close').onclick = () => window.textEditor.window.close();

  // 文件操作
  document.getElementById('save').onclick = saveFile;
  document.getElementById('saveAs').onclick = saveFileAs;

  // 编辑器设置
  document.getElementById('fontSize').onchange = (e) => {
    editor.style.fontSize = `${e.target.value}px`;
  };

  document.getElementById('theme').onchange = (e) => {
    document.body.classList.toggle('light-theme', e.target.value === 'light');
  };

  // 编辑器事件
  editor.addEventListener('input', () => {
    updateLineNumbers();
    isDirty = true;
  });

  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
      editor.selectionStart = editor.selectionEnd = start + 2;
    }
  });

  editor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = editor.scrollTop;
  });

  // 光标位置
  editor.addEventListener('click', updateCursorPosition);
  editor.addEventListener('keyup', updateCursorPosition);
});

// 加载文件
window.textEditor.onTextLoad((textData) => {
  currentFile = textData;
  editor.value = textData.content;
  document.querySelector('.title').textContent = textData.name;
  document.querySelector('.file-type').textContent = getFileTypeName(textData.type);
  updateLineNumbers();
  isDirty = false;
});

function updateLineNumbers() {
  const lines = editor.value.split('\n').length;
  lineNumbers.innerHTML = Array(lines)
    .fill(0)
    .map((_, i) => `<div>${i + 1}</div>`)
    .join('');
}

function updateCursorPosition() {
  const pos = getCursorPosition(editor);
  document.querySelector('.cursor-position').textContent = 
    `行 ${pos.line}, 列 ${pos.column}`;
}

function getCursorPosition(textarea) {
  const lines = textarea.value.substr(0, textarea.selectionStart).split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  };
}

async function saveFile() {
  if (!isDirty) return;
  await window.textEditor.file.save(editor.value);
  isDirty = false;
}

async function saveFileAs() {
  await window.textEditor.file.saveAs(editor.value);
  isDirty = false;
}

function getFileTypeName(ext) {
  const typeMap = {
    '.txt': '文本文件',
    '.md': 'Markdown',
    '.json': 'JSON',
    '.xml': 'XML',
    '.yml': 'YAML',
    '.yaml': 'YAML',
    '.js': 'JavaScript',
    '.ts': 'TypeScript',
    '.py': 'Python',
    '.java': 'Java',
    '.c': 'C',
    '.cpp': 'C++',
    '.h': 'C/C++ Header',
    '.css': 'CSS',
    '.html': 'HTML'
  };
  return typeMap[ext] || '纯文本';
} 