document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('video');
  const loading = document.querySelector('.loading');
  const error = document.querySelector('.error');
  const controls = document.querySelector('.controls');
  
  // 播放控制
  const playPauseBtn = document.getElementById('play-pause');
  const progressBar = document.querySelector('.progress-bar');
  const progressPlayed = document.querySelector('.progress-played');
  const progressLoaded = document.querySelector('.progress-loaded');
  const preview = document.querySelector('.preview');
  const previewVideo = preview.querySelector('video');
  const previewTime = preview.querySelector('.time');
  const currentTime = document.getElementById('current-time');
  const totalTime = document.getElementById('total-time');
  
  // 音量控制
  const muteBtn = document.getElementById('mute');
  const volumeSlider = document.querySelector('.volume-slider');
  const volumeBar = document.querySelector('.volume-bar');
  
  // 其他控制
  const pipBtn = document.getElementById('pip');
  const fullscreenBtn = document.getElementById('fullscreen');

  // 初始化视频加载
  window.videoAPI.onError((message) => {
    loading.classList.add('hidden');
    error.classList.remove('hidden');
    error.textContent = message;
  });

  // 时间格式化
  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

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
    playPauseBtn.title = '暂停';
  });

  video.addEventListener('pause', () => {
    playPauseBtn.textContent = '▶';
    playPauseBtn.title = '播放';
  });

  // 进度条控制
  video.addEventListener('loadedmetadata', () => {
    totalTime.textContent = formatTime(video.duration);
  });

  video.addEventListener('timeupdate', () => {
    // 更新播放进度
    const progress = (video.currentTime / video.duration) * 100;
    progressPlayed.style.width = `${progress}%`;
    currentTime.textContent = formatTime(video.currentTime);
  });

  video.addEventListener('progress', () => {
    // 更新缓冲进度
    if (video.buffered.length > 0) {
      const buffered = video.buffered.end(video.buffered.length - 1);
      const progress = (buffered / video.duration) * 100;
      progressLoaded.style.width = `${progress}%`;
    }
  });

  // 进度条预览
  let previewTimeout;
  progressBar.addEventListener('mousemove', (e) => {
    const rect = progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    
    // 显示预览
    preview.classList.remove('hidden');
    preview.style.left = `${e.clientX}px`;
    
    // 设置预览时间
    const time = video.duration * pos;
    previewTime.textContent = formatTime(time);
    
    // 更新预览画面
    clearTimeout(previewTimeout);
    previewTimeout = setTimeout(() => {
      previewVideo.currentTime = time;
    }, 100);
  });

  progressBar.addEventListener('mouseleave', () => {
    preview.classList.add('hidden');
  });

  progressBar.addEventListener('click', (e) => {
    const rect = progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  });

  // 音量控制
  let lastVolume = 1;
  muteBtn.addEventListener('click', () => {
    if (video.volume > 0) {
      lastVolume = video.volume;
      video.volume = 0;
    } else {
      video.volume = lastVolume;
    }
  });

  video.addEventListener('volumechange', () => {
    volumeBar.style.width = `${video.volume * 100}%`;
    muteBtn.textContent = video.volume === 0 ? '🔇' : '🔊';
    muteBtn.title = video.volume === 0 ? '取消静音' : '静音';
  });

  volumeSlider.addEventListener('click', (e) => {
    const rect = volumeSlider.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.volume = Math.max(0, Math.min(1, pos));
  });

  // 继续实现其他功能...
}); 