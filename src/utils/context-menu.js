export class ContextMenu {
  constructor() {
    this.menu = null;
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.addEventListener('contextmenu', this.handleContextMenu.bind(this));
    document.addEventListener('click', this.hideMenu.bind(this));
    document.addEventListener('scroll', this.hideMenu.bind(this));
  }

  handleContextMenu(event) {
    event.preventDefault();
    this.hideMenu();

    const target = event.target.closest('[data-context-menu]');
    if (!target) return;

    const menuType = target.dataset.contextMenu;
    const menuItems = this.getMenuItems(menuType, target);
    
    this.showMenu(event.clientX, event.clientY, menuItems);
  }

  getMenuItems(type, target) {
    const commonItems = [
      {
        label: '复制',
        icon: '📋',
        action: () => this.handleCopy(target)
      },
      {
        label: '删除',
        icon: '🗑️',
        action: () => this.handleDelete(target)
      }
    ];

    const menuConfigs = {
      file: [
        {
          label: '打开',
          icon: '📂',
          action: () => this.handleOpen(target)
        },
        {
          label: '重命名',
          icon: '✏️',
          action: () => this.handleRename(target)
        },
        { type: 'separator' },
        ...commonItems,
        { type: 'separator' },
        {
          label: '属性',
          icon: 'ℹ️',
          action: () => this.handleProperties(target)
        }
      ],
      
      image: [
        {
          label: '在新窗口中打开',
          icon: '🖼️',
          action: () => this.handleOpenInNewWindow(target)
        },
        {
          label: '复制图片',
          icon: '📋',
          action: () => this.handleCopyImage(target)
        },
        { type: 'separator' },
        ...commonItems
      ]
    };

    return menuConfigs[type] || commonItems;
  }

  showMenu(x, y, items) {
    this.menu = document.createElement('div');
    this.menu.className = 'context-menu';
    
    items.forEach(item => {
      if (item.type === 'separator') {
        this.menu.appendChild(this.createSeparator());
      } else {
        this.menu.appendChild(this.createMenuItem(item));
      }
    });

    document.body.appendChild(this.menu);

    // 调整菜单位置，确保不超出视窗
    const rect = this.menu.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    if (x + rect.width > windowWidth) {
      x = windowWidth - rect.width;
    }
    if (y + rect.height > windowHeight) {
      y = windowHeight - rect.height;
    }

    this.menu.style.left = `${x}px`;
    this.menu.style.top = `${y}px`;
  }

  createMenuItem(item) {
    const menuItem = document.createElement('div');
    menuItem.className = 'context-menu-item';
    menuItem.innerHTML = `
      <span class="context-menu-icon">${item.icon}</span>
      <span class="context-menu-label">${item.label}</span>
    `;
    menuItem.addEventListener('click', () => {
      this.hideMenu();
      item.action();
    });
    return menuItem;
  }

  createSeparator() {
    const separator = document.createElement('div');
    separator.className = 'context-menu-separator';
    return separator;
  }

  hideMenu() {
    if (this.menu) {
      this.menu.remove();
      this.menu = null;
    }
  }

  // 菜单项处理方法
  handleOpen(target) {
    // 实现打开文件的逻辑
  }

  handleRename(target) {
    // 实现重命名的逻辑
  }

  handleCopy(target) {
    // 实现复制的逻辑
  }

  handleDelete(target) {
    // 实现删除的逻辑
  }

  handleProperties(target) {
    // 实现显示属性的逻辑
  }

  handleOpenInNewWindow(target) {
    // 实现在新窗口打开的逻辑
  }

  handleCopyImage(target) {
    // 实现复制图片的逻辑
  }
} 