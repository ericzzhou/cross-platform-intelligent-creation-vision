let editor;
let highlight;
let lineNumbers;
let currentFile;
let isDirty = false;
let xmlParser;
let errorMarkers = [];
let treeView;

document.addEventListener('DOMContentLoaded', () => {
  editor = document.getElementById('editor');
  highlight = document.querySelector('#highlight code');
  lineNumbers = document.querySelector('.line-numbers');
  xmlParser = new XmlParser();

  // 窗口控制
  document.getElementById('minimize').onclick = () => window.xmlEditor.window.minimize();
  document.getElementById('maximize').onclick = () => window.xmlEditor.window.maximize();
  document.getElementById('close').onclick = () => window.xmlEditor.window.close();

  // 文件操作
  document.getElementById('save').onclick = saveFile;
  document.getElementById('saveAs').onclick = saveFileAs;
  document.getElementById('format').onclick = formatXml;
  document.getElementById('minify').onclick = minifyXml;
  document.getElementById('validate').onclick = validateXml;

  // 编辑器设置
  document.getElementById('fontSize').onchange = (e) => {
    const size = e.target.value;
    editor.style.fontSize = `${size}px`;
    highlight.style.fontSize = `${size}px`;
  };

  document.getElementById('theme').onchange = (e) => {
    document.body.classList.toggle('light-theme', e.target.value === 'light');
  };

  // 编辑器事件
  editor.addEventListener('input', () => {
    updateHighlight();
    updateLineNumbers();
    validateXml();
    isDirty = true;
  });

  editor.addEventListener('scroll', () => {
    highlight.scrollTop = editor.scrollTop;
    highlight.scrollLeft = editor.scrollLeft;
    lineNumbers.scrollTop = editor.scrollTop;
  });

  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
      editor.selectionStart = editor.selectionEnd = start + 2;
      updateHighlight();
    }
  });

  // 光标位置
  editor.addEventListener('click', updateCursorPosition);
  editor.addEventListener('keyup', updateCursorPosition);

  // 初始化树形视图
  treeView = new XmlTreeView(
    document.querySelector('.tree-view'),
    editor
  );
  
  // 树形视图控制
  document.getElementById('toggleTree').onclick = () => {
    treeView.toggleVisibility();
  };
});

// 加载文件
window.xmlEditor.onXmlLoad((data) => {
  currentFile = data;
  editor.value = data.content;
  document.querySelector('.title').textContent = data.name;
  updateHighlight();
  updateLineNumbers();
  validateXml();
  isDirty = false;
});

function updateHighlight() {
  const code = editor.value;
  highlight.innerHTML = xmlParser.highlightXml(code);
  treeView.update(code);
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

function formatXml() {
  try {
    editor.value = xmlParser.format(editor.value);
    updateHighlight();
    updateLineNumbers();
    isDirty = true;
  } catch (err) {
    showError(err.message);
  }
}

function minifyXml() {
  try {
    editor.value = xmlParser.minify(editor.value);
    updateHighlight();
    updateLineNumbers();
    isDirty = true;
  } catch (err) {
    showError(err.message);
  }
}

function validateXml() {
  clearErrorMarkers();
  const result = xmlParser.parse(editor.value);
  const status = document.querySelector('.validation-status');
  
  if (result.valid) {
    status.textContent = '有效的 XML';
    status.style.color = '#4caf50';
  } else {
    status.textContent = '无效的 XML';
    status.style.color = '#f44336';
    showError(result.error);
  }
}

async function saveFile() {
  if (!isDirty) return;
  await window.xmlEditor.file.save(editor.value);
  isDirty = false;
}

async function saveFileAs() {
  await window.xmlEditor.file.saveAs(editor.value);
  isDirty = false;
}

function showError(message) {
  // 可以改为使用更好的通知UI
  alert(message);
}

function addErrorMarker(line, message) {
  const lineHeight = parseInt(getComputedStyle(editor).lineHeight);
  const top = (line - 1) * lineHeight;
  
  // 添加错误行背景
  const errorLine = document.createElement('div');
  errorLine.className = 'error-line';
  errorLine.style.top = `${top}px`;
  errorLine.style.height = `${lineHeight}px`;
  highlight.appendChild(errorLine);
  
  // 添加错误消息
  const errorMessage = document.createElement('div');
  errorMessage.className = 'error-message';
  errorMessage.textContent = message;
  errorMessage.style.top = `${top}px`;
  highlight.appendChild(errorMessage);
  
  errorMarkers.push(errorLine, errorMessage);
}

function clearErrorMarkers() {
  errorMarkers.forEach(marker => marker.remove());
  errorMarkers = [];
} 