let editor;
let preview;
let lineNumbers;
let currentFile;
let isDirty = false;

// 配置 marked
marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(lang, code).value;
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true
});

document.addEventListener('DOMContentLoaded', () => {
  editor = document.getElementById('editor');
  preview = document.getElementById('preview');
  lineNumbers = document.querySelector('.line-numbers');

  // 窗口控制
  document.getElementById('minimize').onclick = () => window.markdownEditor.window.minimize();
  document.getElementById('maximize').onclick = () => window.markdownEditor.window.maximize();
  document.getElementById('close').onclick = () => window.markdownEditor.window.close();

  // 文件操作
  document.getElementById('save').onclick = saveFile;
  document.getElementById('saveAs').onclick = saveFileAs;
  document.getElementById('exportPdf').onclick = exportToPdf;

  // 主题切换
  document.getElementById('theme').onchange = (e) => {
    document.body.classList.toggle('dark-theme', e.target.value === 'dark');
    document.body.classList.toggle('light-theme', e.target.value === 'light');
  };

  // 编辑器事件
  editor.addEventListener('input', () => {
    updatePreview();
    updateLineNumbers();
    isDirty = true;
  });

  editor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = editor.scrollTop;
  });

  // 光标位置
  editor.addEventListener('click', updateCursorPosition);
  editor.addEventListener('keyup', updateCursorPosition);
});

// 加载文件
window.markdownEditor.onMarkdownLoad((data) => {
  currentFile = data;
  editor.value = data.content;
  document.querySelector('.title').textContent = data.name;
  updatePreview();
  updateLineNumbers();
  isDirty = false;
});

function updatePreview() {
  preview.innerHTML = marked(editor.value);
}

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
  await window.markdownEditor.file.save(editor.value);
  isDirty = false;
}

async function saveFileAs() {
  await window.markdownEditor.file.saveAs(editor.value);
  isDirty = false;
}

async function exportToPdf() {
  await window.markdownEditor.file.exportPdf();
} 