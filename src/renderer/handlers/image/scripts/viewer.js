// 渲染进程代码
ipcRenderer.on('load-image', (event, imageUrl) => {
    document.getElementById('image').src = imageUrl;
}); 