/**
 * 格式化文件大小
 * @param {number} bytes 文件大小（字节）
 * @returns {string} 格式化后的文件大小
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 获取文件类型
 * @param {File|Object} file 文件对象
 * @returns {string} 文件MIME类型
 */
export function getFileType(file) {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop().toLowerCase();
  const mimeTypes = {
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp'
  };
  return mimeTypes[ext] || '';
}

/**
 * 检查文件是否支持
 * @param {File|Object} file 文件对象
 * @returns {boolean} 是否支持
 */
export function isSupportedFile(file) {
  const type = getFileType(file);
  return type.startsWith('image/') || type === 'application/pdf';
}

/**
 * 生成文件预览URL
 * @param {File|Object} file 文件对象
 * @returns {string} 预览URL
 */
export function createPreviewUrl(file) {
  if (file.path) {
    return `file://${file.path}`;
  }
  return URL.createObjectURL(file);
}

/**
 * 清理预览URL
 * @param {string} url 预览URL
 */
export function revokePreviewUrl(url) {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
} 