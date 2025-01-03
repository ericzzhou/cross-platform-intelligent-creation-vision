import { formatFileSize, getFileType } from '../../../utils/file-utils';

export class ListView {
  constructor(container) {
    this.container = container;
    this.files = [];
    this.selectedFiles = new Set();
    this.setupUI();
  }

  setupUI() {
    this.container.innerHTML = `
      <div class="list-viewer">
        <div class="toolbar">
          <div class="view-controls">
            <button class="grid-view-btn">网格视图</button>
            <button class="list-view-btn active">列表视图</button>
          </div>
          <div class="sort-controls">
            <select class="sort-select">
              <option value="name">按名称</option>
              <option value="size">按大小</option>
              <option value="type">按类型</option>
              <option value="date">按日期</option>
            </select>
          </div>
        </div>
        <div class="list-container">
          <table class="file-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>类型</th>
                <th>大小</th>
                <th>修改日期</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  setupEventListeners() {
    const tbody = this.container.querySelector('tbody');
    const sortSelect = this.container.querySelector('.sort-select');
    const viewBtns = this.container.querySelectorAll('.view-controls button');

    tbody.addEventListener('click', (e) => {
      const row = e.target.closest('tr');
      if (!row) return;

      const index = row.dataset.index;
      if (e.ctrlKey || e.metaKey) {
        this.toggleSelection(index);
      } else if (e.shiftKey) {
        this.rangeSelect(index);
      } else {
        this.singleSelect(index);
      }
    });

    sortSelect.addEventListener('change', () => {
      this.sortFiles(sortSelect.value);
    });

    viewBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        viewBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.toggleView(btn.classList.contains('grid-view-btn'));
      });
    });
  }

  load(files) {
    this.files = files;
    this.renderFiles();
    return Promise.resolve();
  }

  renderFiles() {
    const tbody = this.container.querySelector('tbody');
    tbody.innerHTML = this.files.map((file, index) => `
      <tr data-index="${index}" class="${this.selectedFiles.has(index) ? 'selected' : ''}">
        <td>
          <div class="file-name">
            <img src="${this.getFileIcon(file)}" alt="${file.type}" class="file-icon">
            ${file.name}
          </div>
        </td>
        <td>${this.getFileTypeLabel(file)}</td>
        <td>${formatFileSize(file.size)}</td>
        <td>${new Date(file.lastModified).toLocaleString()}</td>
      </tr>
    `).join('');
  }

  getFileIcon(file) {
    const type = getFileType(file);
    // 这里可以根据文件类型返回不同的图标
    return `icons/${type.split('/')[0]}.svg`;
  }

  getFileTypeLabel(file) {
    const type = getFileType(file);
    const typeMap = {
      'application/pdf': 'PDF文档',
      'image/jpeg': 'JPEG图片',
      'image/png': 'PNG图片',
      'image/gif': 'GIF图片'
    };
    return typeMap[type] || type;
  }

  toggleSelection(index) {
    if (this.selectedFiles.has(index)) {
      this.selectedFiles.delete(index);
    } else {
      this.selectedFiles.add(index);
    }
    this.renderFiles();
  }

  singleSelect(index) {
    this.selectedFiles.clear();
    this.selectedFiles.add(index);
    this.renderFiles();
  }

  rangeSelect(index) {
    const lastSelected = Array.from(this.selectedFiles).pop();
    if (lastSelected === undefined) {
      this.singleSelect(index);
      return;
    }

    const start = Math.min(lastSelected, index);
    const end = Math.max(lastSelected, index);
    
    for (let i = start; i <= end; i++) {
      this.selectedFiles.add(i);
    }
    this.renderFiles();
  }

  sortFiles(by) {
    const sorters = {
      name: (a, b) => a.name.localeCompare(b.name),
      size: (a, b) => a.size - b.size,
      type: (a, b) => getFileType(a).localeCompare(getFileType(b)),
      date: (a, b) => new Date(b.lastModified) - new Date(a.lastModified)
    };

    this.files.sort(sorters[by]);
    this.renderFiles();
  }

  toggleView(isGrid) {
    const container = this.container.querySelector('.list-container');
    container.className = `list-container ${isGrid ? 'grid-view' : 'list-view'}`;
  }

  destroy() {
    this.container.innerHTML = '';
    this.files = [];
    this.selectedFiles.clear();
  }
} 