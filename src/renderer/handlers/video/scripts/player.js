let video;
let progressBar;
let playPauseBtn;
let volumeSlider;
let muteBtn;
let currentTimeSpan;
let durationSpan;

// 初始化控件
document.addEventListener('DOMContentLoaded', () => {
  video = document.getElementById('video');
  progressBar = document.querySelector('.progress-bar');
  playPauseBtn = document.getElementById('play-pause');
  volumeSlider = document.getElementById('volume');
  muteBtn = document.getElementById('mute');
  currentTimeSpan = document.getElementById('current-time');
  durationSpan = document.getElementById('duration');

  // 窗口控制
  document.getElementById('minimize').onclick = () => window.videoPlayer.window.minimize();
  document.getElementById('maximize').onclick = () => window.videoPlayer.window.maximize();
  document.getElementById('close').onclick = () => window.videoPlayer.window.close();

  // 播放控制
  playPauseBtn.onclick = togglePlay;
  muteBtn.onclick = toggleMute;
  volumeSlider.oninput = updateVolume;
  
  // 进度更新
  video.ontimeupdate = updateProgress;
  video.onloadedmetadata = () => {
    durationSpan.textContent = formatTime(video.duration);
  };

  // 进度条点击
  document.querySelector('.progress').onclick = (e) => {
    const percent = e.offsetX / e.target.offsetWidth;
    video.currentTime = percent * video.duration;
  };
});

// 加载视频
window.videoPlayer.onVideoLoad((videoData) => {
  video.src = `file://${videoData.path}`;
  document.querySelector('.title').textContent = videoData.name;
});

function togglePlay() {
  if (video.paused) {
    video.play();
    playPauseBtn.textContent = '暂停';
  } else {
    video.pause();
    playPauseBtn.textContent = '播放';
  }
}

function toggleMute() {
  video.muted = !video.muted;
  muteBtn.textContent = video.muted ? '静音' : '音量';
}

function updateVolume() {
  video.volume = volumeSlider.value;
}

function updateProgress() {
  const percent = (video.currentTime / video.duration) * 100;
  progressBar.style.width = `${percent}%`;
  currentTimeSpan.textContent = formatTime(video.currentTime);
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  seconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
} 