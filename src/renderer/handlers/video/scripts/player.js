document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('video');
  const loading = document.querySelector('.loading');
  const error = document.querySelector('.error');
  const progressBar = document.querySelector('.progress-bar');
  const progressCurrent = document.querySelector('.progress-current');
  const progressHover = document.querySelector('.progress-hover');
  const currentTime = document.querySelector('.current-time');
  const duration = document.querySelector('.duration');
  const playPauseBtn = document.getElementById('play-pause');
  const muteBtn = document.getElementById('mute');
  const volumeSlider = document.getElementById('volume');
  const pipBtn = document.getElementById('pip');
  const fullscreenBtn = document.getElementById('fullscreen');

  // 窗口控制
  document.getElementById('minimize').addEventListener('click', () => {
    window.videoAPI.minimizeWindow();
  });
  
  document.getElementById('maximize').addEventListener('click', () => {
    window.videoAPI.maximizeWindow();
  });
  
  document.getElementById('close').addEventListener('click', () => {
    window.videoAPI.closeWindow();
  });

  // 视频加载
  window.videoAPI.onVideoLoaded(({ path, name }) => {
    loading.classList.add('hidden');
    error.classList.add('hidden');
    video.src = path;
    document.title = name;
  });

  window.videoAPI.onError((message) => {
    loading.classList.add('hidden');
    error.classList.remove('hidden');
    error.textContent = `加载失败: ${message}`;
  });

  // 播放控制
  playPauseBtn.addEventListener('click', () => {
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  });

  video.addEventListener('play', () => {
    playPauseBtn.textContent = '⏸';
  });

  video.addEventListener('pause', () => {
    playPauseBtn.textContent = '▶';
  });

  // 音量控制
  muteBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    muteBtn.textContent = video.muted ? '🔇' : '🔊';
  });

  volumeSlider.addEventListener('input', () => {
    video.volume = volumeSlider.value / 100;
    if (video.volume === 0) {
      muteBtn.textContent = '🔇';
    } else {
      muteBtn.textContent = '🔊';
    }
  });

  // 进度条控制
  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  video.addEventListener('loadedmetadata', () => {
    duration.textContent = formatTime(video.duration);
  });

  video.addEventListener('timeupdate', () => {
    const progress = (video.currentTime / video.duration) * 100;
    progressCurrent.style.width = `${progress}%`;
    currentTime.textContent = formatTime(video.currentTime);
  });

  progressBar.addEventListener('mousemove', (e) => {
    const rect = progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    progressHover.style.transform = `scaleX(${pos})`;
  });

  progressBar.addEventListener('mouseleave', () => {
    progressHover.style.transform = 'scaleX(0)';
  });

  progressBar.addEventListener('click', (e) => {
    const rect = progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  });

  // 画中画
  pipBtn.addEventListener('click', async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error('PiP Failed:', err);
    }
  });

  // 全屏
  fullscreenBtn.addEventListener('click', () => {
    window.videoAPI.toggleFullscreen();
  });

  // 键盘快捷键
  window.addEventListener('keydown', (e) => {
    switch(e.key) {
      case ' ':
        e.preventDefault();
        if (video.paused) {
          video.play();
        } else {
          video.pause();
        }
        break;
      case 'ArrowLeft':
        video.currentTime = Math.max(video.currentTime - 5, 0);
        break;
      case 'ArrowRight':
        video.currentTime = Math.min(video.currentTime + 5, video.duration);
        break;
      case 'ArrowUp':
        video.volume = Math.min(video.volume + 0.1, 1);
        volumeSlider.value = video.volume * 100;
        break;
      case 'ArrowDown':
        video.volume = Math.max(video.volume - 0.1, 0);
        volumeSlider.value = video.volume * 100;
        break;
      case 'f':
        window.videoAPI.toggleFullscreen();
        break;
      case 'Escape':
        window.videoAPI.closeWindow();
        break;
    }
  });
}); 