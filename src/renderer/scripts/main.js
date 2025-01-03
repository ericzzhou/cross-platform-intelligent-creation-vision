document.addEventListener('DOMContentLoaded', () => {
  // 窗口控制
  document.getElementById('minimize').addEventListener('click', () => {
    window.electronAPI.minimizeWindow();
  });
  
  document.getElementById('maximize').addEventListener('click', () => {
    window.electronAPI.maximizeWindow();
  });
  
  document.getElementById('close').addEventListener('click', () => {
    window.electronAPI.closeWindow();
  });
  
  // 拖放处理
  const dropZone = document.getElementById('drop-zone');
  
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });
  
  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
  });
  
  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const filePath = files[0].path;
      try {
        const success = await window.electronAPI.openFile(filePath);
        if (!success) {
          alert('不支持的文件类型');
        }
      } catch (err) {
        alert('打开文件失败：' + err.message);
      }
    }
  });
}); 