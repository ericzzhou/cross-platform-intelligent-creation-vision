let editor;
let highlight;
let lineNumbers;
let currentFile;
let isDirty = false;
let schemaValidator;
let errorMarkers = [];

document.addEventListener('DOMContentLoaded', () => {
  editor = document.getElementById('editor');
  highlight = document.querySelector('#highlight code');
  lineNumbers = document.querySelector('.line-numbers');

  // 窗口控制
  document.getElementById('minimize').onclick = () => window.jsonEditor.window.minimize();
  document.getElementById('maximize').onclick = () => window.jsonEditor.window.maximize();
  document.getElementById('close').onclick = () => window.jsonEditor.window.close();

  // 文件操作
  document.getElementById('save').onclick = saveFile;
  document.getElementById('saveAs').onclick = saveFileAs;
  document.getElementById('format').onclick = formatJson;
  document.getElementById('minify').onclick = minifyJson;
  document.getElementById('validate').onclick = validateJson;

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
    validateJson();
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

  // 初始化 Schema 验证器
  schemaValidator = new SchemaValidator();
  
  // Schema 控制
  document.getElementById('loadSchema').onclick = loadSchema;
  document.getElementById('clearSchema').onclick = clearSchema;
});

// 加载文件
window.jsonEditor.onJsonLoad((data) => {
  currentFile = data;
  editor.value = data.content;
  document.querySelector('.title').textContent = data.name;
  updateHighlight();
  updateLineNumbers();
  validateJson();
  isDirty = false;
});

function updateHighlight() {
  const code = editor.value;
  highlight.innerHTML = highlightJson(code);
}

function highlightJson(code) {
  return code
    .replace(/(".*?")/g, '<span class="token string">$1</span>')
    .replace(/\b(\d+)\b/g, '<span class="token number">$1</span>')
    .replace(/\b(true|false)\b/g, '<span class="token boolean">$1</span>')
    .replace(/\b(null)\b/g, '<span class="token null">$1</span>')
    .replace(/(".*?")(?=:)/g, '<span class="token property">$1</span>')
    .replace(/([{}[\],:])/g, '<span class="token punctuation">$1</span>');
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

function formatJson() {
  try {
    const parsed = JSON.parse(editor.value);
    editor.value = JSON.stringify(parsed, null, 2);
    updateHighlight();
    updateLineNumbers();
    isDirty = true;
  } catch (err) {
    showError('无法格式化: ' + err.message);
  }
}

function minifyJson() {
  try {
    const parsed = JSON.parse(editor.value);
    editor.value = JSON.stringify(parsed);
    updateHighlight();
    updateLineNumbers();
    isDirty = true;
  } catch (err) {
    showError('无法压缩: ' + err.message);
  }
}

function validateJson() {
  try {
    JSON.parse(editor.value);
    if (schemaValidator.currentSchema) {
      validateWithSchema();
    } else {
      document.querySelector('.validation-status').textContent = '有效的 JSON';
      document.querySelector('.validation-status').style.color = '#4caf50';
    }
  } catch (err) {
    document.querySelector('.validation-status').textContent = 
      '无效的 JSON: ' + err.message;
    document.querySelector('.validation-status').style.color = '#f44336';
  }
}

async function saveFile() {
  if (!isDirty) return;
  await window.jsonEditor.file.save(editor.value);
  isDirty = false;
}

async function saveFileAs() {
  await window.jsonEditor.file.saveAs(editor.value);
  isDirty = false;
}

function showError(message) {
  // 可以改为使用更好的通知UI
  alert(message);
}

async function loadSchema() {
  try {
    const result = await window.jsonEditor.file.openSchema();
    if (!result.success) {
      showError(result.error);
      return;
    }

    const setResult = schemaValidator.setSchema(result.schema);
    if (!setResult.success) {
      showError(setResult.error);
      return;
    }

    document.querySelector('.schema-status').textContent = 
      `已加载: ${result.name}`;
    validateWithSchema();
  } catch (err) {
    showError('加载 Schema 失败: ' + err.message);
  }
}

function clearSchema() {
  schemaValidator.currentSchema = null;
  document.querySelector('.schema-status').textContent = '未加载 Schema';
  clearErrorMarkers();
}

function validateWithSchema() {
  clearErrorMarkers();
  
  try {
    const json = JSON.parse(editor.value);
    const result = schemaValidator.validate(json);
    
    if (result.valid) {
      document.querySelector('.validation-status').textContent = 
        '验证通过';
      document.querySelector('.validation-status').style.color = '#4caf50';
      return;
    }

    // 显示错误
    result.errors.forEach(error => {
      const message = schemaValidator.getErrorMessage(error);
      const line = getErrorLine(error.path);
      addErrorMarker(line, message);
    });

    document.querySelector('.validation-status').textContent = 
      `发现 ${result.errors.length} 个错误`;
    document.querySelector('.validation-status').style.color = '#f44336';
  } catch (err) {
    showError('JSON 格式错误: ' + err.message);
  }
}

function getErrorLine(path) {
  if (!path) return 1;
  const json = editor.value;
  const lines = json.split('\n');
  const pathParts = path.split('/').filter(Boolean);
  
  let currentObj = JSON.parse(json);
  let currentLine = 1;
  
  for (const part of pathParts) {
    const propString = `"${part}"`;
    for (let i = currentLine - 1; i < lines.length; i++) {
      if (lines[i].includes(propString)) {
        currentLine = i + 1;
        break;
      }
    }
    currentObj = currentObj[part];
  }
  
  return currentLine;
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