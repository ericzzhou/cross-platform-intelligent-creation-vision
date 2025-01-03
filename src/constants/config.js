export const CONFIG = {
  // 支持的文件类型
  supportedTypes: {
    images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
    documents: ['.pdf']
  },

  // 视图模式
  viewModes: {
    LIST: 'list',
    IMAGE: 'image',
    PDF: 'pdf'
  },

  // 默认设置
  defaults: {
    imageScale: 1.0,
    pdfScale: 1.0,
    maxFileSize: 100 * 1024 * 1024 // 100MB
  },

  // UI配置
  ui: {
    theme: {
      dark: {
        background: '#1e1e1e',
        surface: '#2c2c2c',
        primary: '#4c8bf5',
        text: '#ffffff'
      }
    },
    animation: {
      duration: '0.3s'
    }
  }
}; 