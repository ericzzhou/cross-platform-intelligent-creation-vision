export class IconManager {
  constructor() {
    this.iconCache = new Map();
    this.defaultIcons = {
      folder: this.createSVGIcon('folder'),
      file: this.createSVGIcon('file'),
      image: this.createSVGIcon('image'),
      pdf: this.createSVGIcon('pdf')
    };
  }

  getIcon(file) {
    const type = this.getFileType(file);
    const cacheKey = `${type}-${file.name}`;

    if (this.iconCache.has(cacheKey)) {
      return this.iconCache.get(cacheKey);
    }

    let icon;
    if (file.isDirectory) {
      icon = this.defaultIcons.folder;
    } else {
      icon = this.getIconByType(type);
    }

    this.iconCache.set(cacheKey, icon);
    return icon;
  }

  getFileType(file) {
    if (file.isDirectory) return 'folder';
    const ext = file.name.split('.').pop()?.toLowerCase();
    return ext || 'file';
  }

  getIconByType(type) {
    const iconMap = {
      // 图片文件
      jpg: this.defaultIcons.image,
      jpeg: this.defaultIcons.image,
      png: this.defaultIcons.image,
      gif: this.defaultIcons.image,
      bmp: this.defaultIcons.image,
      webp: this.defaultIcons.image,
      
      // 文档文件
      pdf: this.defaultIcons.pdf,
    };

    return iconMap[type] || this.defaultIcons.file;
  }

  createSVGIcon(type) {
    const icons = {
      folder: `<svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
      </svg>`,
      
      file: `<svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2z"/>
      </svg>`,
      
      image: `<svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
      </svg>`,
      
      pdf: `<svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/>
      </svg>`
    };

    return icons[type] || icons.file;
  }

  clearCache() {
    this.iconCache.clear();
  }
} 