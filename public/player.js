/* ─────────────────────────────────────────────────────────
   HLS Player - player.js
   Pure HLS.js player, no iframe, no ads
───────────────────────────────────────────────────────── */

let hls = null;
let lastUrl = '';

const video       = document.getElementById('video');
const playerIdle  = document.getElementById('playerIdle');
const playerCont  = document.getElementById('playerContainer');
const spinnerWrap = document.getElementById('spinnerWrap');
const spinnerText = document.getElementById('spinnerText');
const errorOvl    = document.getElementById('errorOverlay');
const errorMsg    = document.getElementById('errorMsg');
const statusBar   = document.getElementById('statusBar');
const infoPanel   = document.getElementById('infoPanel');
const liveBadge   = document.getElementById('liveBadge');
const qualityMenu = document.getElementById('qualityMenu');

// ── Load Stream ───────────────────────────────────────────
function loadStream() {
  const urlInput    = document.getElementById('streamUrl').value.trim();
  const useProxy    = document.getElementById('useProxy').checked;
  const rewriteM3u8 = document.getElementById('rewriteM3u8').checked;

  if (!urlInput) {
    showStatus('Masukkan URL stream terlebih dahulu', 'err');
    return;
  }

  lastUrl = urlInput;
  destroyHls();
  hideError();
  showSpinner('Memuat stream...');
  playerIdle.style.display = 'none';
  video.classList.remove('active');

  let finalUrl = urlInput;

  // Lewatkan melalui proxy jika diaktifkan
  if (useProxy) {
    const isM3u8 = urlInput.toLowerCase().includes('.m3u8') || urlInput.toLowerCase().includes('m3u8');
    if (isM3u8 && rewriteM3u8) {
      finalUrl = `/proxy-m3u8?url=${encodeURIComponent(urlInput)}`;
    } else {
      finalUrl = `/proxy?url=${encodeURIComponent(urlInput)}`;
    }
  }

  showStatus(`Menghubungkan ke stream${useProxy ? ' (via proxy)' : ''}...`, '');

  if (Hls.isSupported()) {
    hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 90,
      maxBufferLength: 30,
      maxMaxBufferLength: 600,
      progressive: false,
      startLevel: -1, // auto quality
      debug: false,
    });

    hls.loadSource(finalUrl);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
      hideSpinner();
      video.classList.add('active');
      video.play().catch(() => {});
      playerCont.classList.add('paused');
      showStatus('Stream berhasil dimuat ✓', 'ok');
      buildQualityMenu(data.levels);
      infoPanel.style.display = 'block';
      updateInfoFormat('HLS');
      checkLive();
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
      const level = hls.levels[data.level];
      if (level) {
        document.getElementById('qualityLabel').textContent =
          level.height ? `${level.height}p` : 'AUTO';
        updateInfoLevel(data.level);
        updateInfoRes(level.width, level.height);
        updateInfoBitrate(level.bitrate);
      }
    });

    hls.on(Hls.Events.FRAG_BUFFERED, () => {
      updateBuffer();
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      console.error('[HLS Error]', data);
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            spinnerText.textContent = 'Network error, mencoba ulang...';
            showSpinner('Network error, mencoba ulang...');
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            spinnerText.textContent = 'Media error, recovering...';
            hls.recoverMediaError();
            break;
          default:
            hideSpinner();
            showError(`Fatal error: ${data.details}`);
            break;
        }
      }
    });

  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    // Safari native HLS
    video.src = finalUrl;
    video.classList.add('active');
    hideSpinner();
    video.play().catch(() => {});
    showStatus('Stream dimuat via Native HLS (Safari) ✓', 'ok');
    infoPanel.style.display = 'block';
    updateInfoFormat('Native HLS');
  } else {
    hideSpinner();
    showError('Browser tidak mendukung HLS. Coba Chrome atau Firefox.');
  }
}

// ── Enter key on input ────────────────────────────────────
document.getElementById('streamUrl').addEventListener('keydown', e => {
  if (e.key === 'Enter') loadStream();
});

// ── Retry ─────────────────────────────────────────────────
function retryStream() {
  document.getElementById('streamUrl').value = lastUrl;
  loadStream();
}

// ── Destroy HLS instance ──────────────────────────────────
function destroyHls() {
  if (hls) { hls.destroy(); hls = null; }
  video.src = '';
  video.classList.remove('active');
  qualityMenu.innerHTML = '';
  qualityMenu.classList.add('hidden');
  document.getElementById('qualityLabel').textContent = 'AUTO';
  liveBadge.classList.add('hidden');
  infoPanel.style.display = 'none';
}

// ── Controls ──────────────────────────────────────────────
function togglePlay() {
  if (video.paused) {
    video.play();
    playerCont.classList.remove('paused');
  } else {
    video.pause();
    playerCont.classList.add('paused');
  }
}

function skipTime(secs) {
  video.currentTime = Math.max(0, video.currentTime + secs);
}

function toggleMute() {
  video.muted = !video.muted;
  document.getElementById('iconVol').classList.toggle('hidden', video.muted);
  document.getElementById('iconMute').classList.toggle('hidden', !video.muted);
}

function setVolume(val) {
  video.volume = parseFloat(val);
  if (video.volume === 0) {
    video.muted = true;
    document.getElementById('iconVol').classList.add('hidden');
    document.getElementById('iconMute').classList.remove('hidden');
  } else {
    video.muted = false;
    document.getElementById('iconVol').classList.remove('hidden');
    document.getElementById('iconMute').classList.add('hidden');
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    playerCont.requestFullscreen();
    document.getElementById('iconFs').classList.add('hidden');
    document.getElementById('iconExit').classList.remove('hidden');
  } else {
    document.exitFullscreen();
    document.getElementById('iconFs').classList.remove('hidden');
    document.getElementById('iconExit').classList.add('hidden');
  }
}

function togglePiP() {
  if (document.pictureInPictureElement) {
    document.exitPictureInPicture();
  } else if (video && !video.paused) {
    video.requestPictureInPicture().catch(err => {
      showStatus('PiP tidak tersedia: ' + err.message, 'err');
    });
  }
}

// ── Seek Bar ──────────────────────────────────────────────
const seekBar = document.getElementById('seekBar');
seekBar.addEventListener('input', () => {
  if (video.duration) {
    video.currentTime = (seekBar.value / 100) * video.duration;
  }
});

video.addEventListener('timeupdate', () => {
  if (!video.duration) return;
  const pct = (video.currentTime / video.duration) * 100;
  seekBar.value = pct;
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('timeNow').textContent = formatTime(video.currentTime);
  document.getElementById('timeDur').textContent = formatTime(video.duration);
  updateInfoDropped();
});

video.addEventListener('progress', updateBuffer);

video.addEventListener('play', () => {
  document.getElementById('iconPlay').classList.add('hidden');
  document.getElementById('iconPause').classList.remove('hidden');
  playerCont.classList.remove('paused');
});

video.addEventListener('pause', () => {
  document.getElementById('iconPlay').classList.remove('hidden');
  document.getElementById('iconPause').classList.add('hidden');
  playerCont.classList.add('paused');
});

video.addEventListener('waiting', () => showSpinner('Buffering...'));
video.addEventListener('playing', hideSpinner);
video.addEventListener('canplay', hideSpinner);

// Click to play/pause on video
video.addEventListener('click', togglePlay);

// ── Quality Menu ──────────────────────────────────────────
function buildQualityMenu(levels) {
  qualityMenu.innerHTML = '';

  // Auto option
  const autoOpt = document.createElement('div');
  autoOpt.className = 'quality-option active';
  autoOpt.innerHTML = '<span>Auto</span><span></span>';
  autoOpt.onclick = () => setQuality(-1);
  qualityMenu.appendChild(autoOpt);

  levels.forEach((level, idx) => {
    const opt = document.createElement('div');
    opt.className = 'quality-option';
    const label = level.height ? `${level.height}p` : `Level ${idx}`;
    const br = level.bitrate ? ` · ${Math.round(level.bitrate / 1000)}k` : '';
    opt.innerHTML = `<span>${label}</span><span style="color:var(--text2);font-size:0.65rem">${br}</span>`;
    opt.onclick = () => setQuality(idx);
    qualityMenu.appendChild(opt);
  });
}

function setQuality(level) {
  if (hls) {
    hls.currentLevel = level;
    const label = level === -1 ? 'AUTO' : (hls.levels[level]?.height ? `${hls.levels[level].height}p` : `L${level}`);
    document.getElementById('qualityLabel').textContent = label;
    document.querySelectorAll('.quality-option').forEach((el, i) => {
      el.classList.toggle('active', level === -1 ? i === 0 : i === level + 1);
    });
  }
  qualityMenu.classList.add('hidden');
}

function toggleQualityMenu() {
  qualityMenu.classList.toggle('hidden');
}

// Close quality menu on outside click
document.addEventListener('click', e => {
  if (!document.getElementById('qualityWrap').contains(e.target)) {
    qualityMenu.classList.add('hidden');
  }
});

// ── Live Detection ────────────────────────────────────────
function checkLive() {
  if (!hls) return;
  const isLive = hls.currentLevel !== -1
    ? !isFinite(video.duration)
    : !isFinite(video.duration);
  liveBadge.classList.toggle('hidden', !isLive);
  if (isLive) {
    document.getElementById('timeDur').textContent = 'LIVE';
    seekBar.disabled = true;
  }
}

// ── Info Panel Updates ────────────────────────────────────
function updateInfoFormat(f) { document.getElementById('infoFormat').textContent = f; }
function updateInfoRes(w, h) { document.getElementById('infoRes').textContent = (w && h) ? `${w}×${h}` : '—'; }
function updateInfoBitrate(bps) { document.getElementById('infoBitrate').textContent = bps ? `${Math.round(bps / 1000)} kbps` : '—'; }
function updateInfoLevel(l) { document.getElementById('infoLevel').textContent = l >= 0 ? `Level ${l}` : 'AUTO'; }
function updateInfoDropped() {
  if (video.getVideoPlaybackQuality) {
    const q = video.getVideoPlaybackQuality();
    document.getElementById('infoDropped').textContent = q.droppedVideoFrames || 0;
  }
}
function updateBuffer() {
  if (!hls) return;
  try {
    const buf = hls.bufferInfo(video.currentTime, 0);
    document.getElementById('infoBuffer').textContent = buf.len ? `${buf.len.toFixed(1)}s` : '—';
    if (video.duration && video.buffered.length > 0) {
      const bufEnd = video.buffered.end(video.buffered.length - 1);
      const pct = (bufEnd / video.duration) * 100;
      document.getElementById('progressBuffer').style.width = pct + '%';
    }
  } catch {}
}

// ── Helpers ───────────────────────────────────────────────
function formatTime(secs) {
  if (!isFinite(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
function showSpinner(text) {
  spinnerText.textContent = text || 'Memuat...';
  spinnerWrap.classList.remove('hidden');
}
function hideSpinner() { spinnerWrap.classList.add('hidden'); }
function showError(msg) {
  errorMsg.textContent = msg;
  errorOvl.classList.remove('hidden');
}
function hideError() { errorOvl.classList.add('hidden'); }
function showStatus(msg, type) {
  statusBar.textContent = msg;
  statusBar.className = `status-bar${type ? ' ' + type : ''}`;
  statusBar.classList.remove('hidden');
}

// ── Keyboard Shortcuts ────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  switch (e.key) {
    case ' ': case 'k': e.preventDefault(); togglePlay(); break;
    case 'ArrowLeft':   e.preventDefault(); skipTime(-10); break;
    case 'ArrowRight':  e.preventDefault(); skipTime(10); break;
    case 'ArrowUp':     e.preventDefault(); video.volume = Math.min(1, video.volume + 0.1); document.getElementById('volumeBar').value = video.volume; break;
    case 'ArrowDown':   e.preventDefault(); video.volume = Math.max(0, video.volume - 0.1); document.getElementById('volumeBar').value = video.volume; break;
    case 'm':           toggleMute(); break;
    case 'f':           toggleFullscreen(); break;
  }
});
