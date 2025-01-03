document.addEventListener('DOMContentLoaded', () => {
  const image = document.getElementById('image');
  const loading = document.querySelector('.loading');
  const error = document.querySelector('.error');
  const container = document.querySelector('.viewer-container');
  
  let scale = 1;
  let rotation = 0;
  let translateX = 0;
  let translateY = 0;
  
  // 拖动相关变量
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let velocityX = 0;
  let velocityY = 0;
  let lastTime = 0;
  let animationFrame = null;

  // 窗口控制
  document.getElementById('minimize').addEventListener('click', () => {
    window.imageAPI.minimizeWindow();
  });
  
  document.getElementById('maximize').addEventListener('click', () => {
    window.imageAPI.maximizeWindow();
  });
  
  document.getElementById('close').addEventListener('click', () => {
    window.imageAPI.closeWindow();
  });

  // 图片加载
  window.imageAPI.onImageLoaded(({ data, name }) => {
    loading.classList.add('hidden');
    error.classList.add('hidden');
    
    // 重置状态
    scale = 1;
    rotation = 0;
    translateX = 0;
    translateY = 0;
    
    // 创建新的图片对象进行预加载
    const tempImage = new Image();
    
    tempImage.onload = () => {
      // 更新实际图片
      image.src = data;
      document.title = name;
      
      // 等待下一帧确保图片已渲染
      requestAnimationFrame(() => {
        const width = tempImage.naturalWidth;
        const height = tempImage.naturalHeight;
        
        // 检查是否需要缩放
        if (width > container.clientWidth || height > container.clientHeight) {
          // 计算水平和垂直方向的缩放比例
          const scaleX = container.clientWidth / width;
          const scaleY = container.clientHeight / height;
          // 使用较小的缩放比例，确保图片完全显示在容器内
          scale = Math.min(scaleX, scaleY);
        } else {
          // 图片尺寸小于容器时，保持原始大小
          scale = 1;
        }
        
        // 居中图片
        centerImage();
        
        // 应用变换
        updateTransform();
        
        // 显示图片
        image.style.visibility = 'visible';
        image.style.cursor = 'grab';
        image.style.opacity = '1';
      });
    };
    
    tempImage.onerror = (err) => {
      console.error('Failed to load image:', err);
      error.classList.remove('hidden');
      error.textContent = '图片加载失败';
    };
    
    tempImage.src = data;
  });

  window.imageAPI.onError((message) => {
    console.error('Image load error:', message);
    loading.classList.add('hidden');
    error.classList.remove('hidden');
    error.textContent = `加载失败: ${message}`;
  });

  // 适应屏幕
  function initializeImage() {
    if (!image.naturalWidth || !image.naturalHeight) return;
    
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    
    // 检查是否需要缩放
    if (width > container.clientWidth || height > container.clientHeight) {
      // 计算水平和垂直方向的缩放比例
      const scaleX = container.clientWidth / width;
      const scaleY = container.clientHeight / height;
      // 使用较小的缩放比例，确保图片完全显示在容器内
      scale = Math.min(scaleX, scaleY);
    } else {
      // 图片尺寸小于容器时，保持原始大小
      scale = 1;
    }
    
    // 居中图片
    centerImage();
    
    // 应用变换
    updateTransform();
  }

  function centerImage() {
    // 重置位置到中心
    translateX = 0;
    translateY = 0;
  }

  function updateTransform() {
    // 由于图片已经通过 CSS 居中，这里只需要处理额外的变换
    const matrix = `translate(-50%, -50%) translate(${translateX}px, ${translateY}px) rotate(${rotation}deg) scale(${scale})`;
    image.style.transform = matrix;
  }

  // 拖动处理
  image.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDragging = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    lastX = e.clientX;
    lastY = e.clientY;
    lastTime = Date.now();
    velocityX = 0;
    velocityY = 0;
    
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    
    image.style.cursor = 'grabbing';
    image.style.transition = 'none';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const currentTime = Date.now();
    const deltaTime = currentTime - lastTime;
    
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    
    if (deltaTime > 0) {
      velocityX = (e.clientX - lastX) / deltaTime * 16;
      velocityY = (e.clientY - lastY) / deltaTime * 16;
    }
    
    lastX = e.clientX;
    lastY = e.clientY;
    lastTime = currentTime;
    
    updateTransform();
  });

  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    
    isDragging = false;
    image.style.cursor = 'grab';
  });

  // 缩放图片
  function zoomImage(newScale, mouseX = null, mouseY = null) {
    const oldScale = scale;
    scale = Math.max(0.1, Math.min(5, newScale));
    
    if (scale !== oldScale) {
      // 获取图片当前的变换后位置和尺寸
      const rect = image.getBoundingClientRect();
      
      if (mouseX === null || mouseY === null) {
        // 默认以图片中心为原点缩放
        mouseX = rect.left + rect.width / 2;
        mouseY = rect.top + rect.height / 2;
      }

      // 计算鼠标相对于图片变换原点的位置
      const pivotX = rect.left + rect.width / 2 + translateX;
      const pivotY = rect.top + rect.height / 2 + translateY;
      
      // 计算鼠标相对于变换原点的偏移
      const relativeX = mouseX - pivotX;
      const relativeY = mouseY - pivotY;
      
      // 计算缩放比例变化
      const scaleFactor = scale / oldScale;
      
      // 调整偏移量，保持鼠标指向的点不变
      translateX += relativeX * (1 - scaleFactor);
      translateY += relativeY * (1 - scaleFactor);

      updateTransform();
    }
  }

  // 旋转图片
  function rotateImage(angle) {
    rotation = (rotation + angle) % 360;
    centerImage(); // 旋转后重新居中
    updateTransform();
  }

  // 鼠标滚轮缩放
  image.addEventListener('wheel', (e) => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = scale * delta;
    
    // 以鼠标位置为中心进行缩放
    zoomImage(newScale, e.clientX, e.clientY);
  });

  // 工具栏控制
  document.getElementById('zoom-in').addEventListener('click', () => {
    zoomImage(scale * 1.2);
  });

  document.getElementById('zoom-out').addEventListener('click', () => {
    zoomImage(scale / 1.2);
  });

  document.getElementById('zoom-reset').addEventListener('click', () => {
    scale = 1;
    centerImage();
    updateTransform();
  });

  // 还原按钮 - 重置到初始状态
  document.getElementById('reset').addEventListener('click', () => {
    // 重置所有变换
    rotation = 0;
    translateX = 0;
    translateY = 0;
    
    // 根据图片尺寸计算初始缩放比例
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    
    if (width > container.clientWidth || height > container.clientHeight) {
      // 如果图片超出容器，计算适合的缩放比例
      const scaleX = container.clientWidth / width;
      const scaleY = container.clientHeight / height;
      scale = Math.min(scaleX, scaleY);
    } else {
      // 如果图片小于容器，保持原始大小
      scale = 1;
    }
    
    updateTransform();
  });

  // 实际大小按钮 - 1:1显示
  document.getElementById('actual-size').addEventListener('click', () => {
    // 设置为原始大小
    scale = 1;
    // 保持当前旋转角度不变
    // 居中显示
    centerImage();
    updateTransform();
  });

  // 旋转按钮
  document.getElementById('rotate-left').addEventListener('click', () => {
    rotateImage(-90);
  });

  document.getElementById('rotate-right').addEventListener('click', () => {
    rotateImage(90);
  });

  // 适应屏幕按钮
  document.getElementById('fit-screen').addEventListener('click', () => {
    initializeImage();
  });

  // 键盘快捷键
  window.addEventListener('keydown', (e) => {
    switch(e.key) {
      case 'Escape':
        window.imageAPI.closeWindow();
        break;
      case '=':
      case '+':
        if (e.ctrlKey) {
          zoomImage(scale * 1.1);
        }
        break;
      case '-':
        if (e.ctrlKey) {
          zoomImage(scale / 1.1);
        }
        break;
      case '0':
        if (e.ctrlKey) {
          // Ctrl + 0 重置到初始状态
          document.getElementById('reset').click();
        }
        break;
      case '1':
        if (e.ctrlKey) {
          // Ctrl + 1 显示实际大小
          document.getElementById('actual-size').click();
        }
        break;
      case 'r':
        if (e.ctrlKey) {
          rotateImage(90);
        } else if (e.shiftKey) {
          rotateImage(-90);
        }
        break;
      case 'f':
        toggleFullscreen();
        break;
      case 'Home':
        // 适应屏幕
        initializeImage();
        break;
      case ' ':
        // 在实际大小和适应屏幕之间切换
        if (scale === 1) {
          initializeImage();
        } else {
          scale = 1;
          centerImage();
          updateTransform();
        }
        break;
    }
  });

  // 窗口大小改变时重新适应屏幕
  let resizeTimeout;
  window.addEventListener('resize', () => {
    // 防抖处理
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (scale === 1) {
        initializeImage();
      } else {
        centerImage();
        updateTransform();
      }
    }, 100);
  });

  // 工具栏自动隐藏
  const toolbar = document.querySelector('.toolbar');
  
  function showToolbar() {
    toolbar.classList.add('visible');
  }
  
  function hideToolbar() {
    toolbar.classList.remove('visible');
  }
  
  // 初始隐藏工具栏
  hideToolbar();
  
  // 鼠标移动时显示工具栏
  container.addEventListener('mousemove', () => {
    showToolbar();
    startHideTimer();
  });
  
  // 鼠标离开容器时隐藏工具栏
  container.addEventListener('mouseleave', hideToolbar);
  
  // 鼠标在工具栏上时保持显示
  toolbar.addEventListener('mouseenter', () => {
    showToolbar();
    clearHideTimer();
  });
  
  // 鼠标离开工具栏时启动隐藏计时器
  toolbar.addEventListener('mouseleave', (e) => {
    if (!container.contains(e.relatedTarget)) {
      hideToolbar();
    }
  });
  
  // 工具栏自动隐藏计时器
  let hideTimer = null;
  
  function startHideTimer() {
    clearHideTimer();
    hideTimer = setTimeout(hideToolbar, 2000);
  }
  
  function clearHideTimer() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  // 全屏模式
  let isFullscreen = false;
  document.getElementById('fullscreen').addEventListener('click', toggleFullscreen);

  function toggleFullscreen() {
    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  document.addEventListener('fullscreenchange', () => {
    isFullscreen = !!document.fullscreenElement;
    const fullscreenBtn = document.getElementById('fullscreen');
    fullscreenBtn.textContent = isFullscreen ? '⤓' : '⊞';
    fullscreenBtn.title = isFullscreen ? '退出全屏' : '全屏';
  });
}); 