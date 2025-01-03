let scale = 1;
let rotation = 0;

// 初始化窗口控制
document.getElementById('minimize').onclick = () => window.imageViewer.window.minimize();
document.getElementById('maximize').onclick = () => window.imageViewer.window.maximize();
document.getElementById('close').onclick = () => window.imageViewer.window.close();

// 初始化工具栏控制
document.getElementById('zoomIn').onclick = () => {
  scale *= 1.2;
  updateTransform();
};

document.getElementById('zoomOut').onclick = () => {
  scale /= 1.2;
  updateTransform();
};

document.getElementById('rotate').onclick = () => {
  rotation += 90;
  updateTransform();
};

document.getElementById('reset').onclick = () => {
  scale = 1;
  rotation = 0;
  updateTransform();
};

function updateTransform() {
  const img = document.getElementById('image');
  img.style.transform = `scale(${scale}) rotate(${rotation}deg)`;
}

// 监听图片加载
window.imageViewer.onImageLoad((imageData) => {
  const img = document.getElementById('image');
  img.src = `file://${imageData.path}`;
  document.querySelector('.title').textContent = imageData.name;
}); 