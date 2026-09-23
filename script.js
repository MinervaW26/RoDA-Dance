const RAW_ROOT = 'assets/raw';
const RODA_DIR = `${RAW_ROOT}/S3resume5k-6000_envelope_t5_peak6`;

const comparisonCases = {
  '01': { number: '010', sample: 'wJVuQyGWyeOqeMFW' },
  '02': { number: '014', sample: 'wJXyPfTfwHKYRSiF' },
  '03': { number: '036', sample: 'wJmABKvxLNIkmKAZ' },
  '04': { number: '038', sample: 'wJmKdwubxyyvmauf' },
  '05': { number: '046', sample: 'wJreDjNDzQzgVXeG' },
};

const methodPath = {
  xdance: ({ sample }) => `${RAW_ROOT}/XD/${sample}.mp4`,
  musicinfuser: ({ sample }) => `${RAW_ROOT}/MF-5first-video/${sample}_generated.mp4`,
  omnidance: ({ sample }) => `${RAW_ROOT}/OmniDance/${sample}.mp4`,
  roda: ({ number, sample }) => `${RODA_DIR}/st5_sa6_${number}_${sample}_vl.mp4`,
};

function filename(src) {
  return decodeURIComponent(src.split('/').pop());
}

function updateProgress(video) {
  const progress = video.parentElement.querySelector('.video-progress');
  if (!progress || !video.duration) return;
  progress.value = String((video.currentTime / video.duration) * 1000);
}

function setPlayingState(video, playing) {
  const wrapper = video.parentElement;
  wrapper.classList.toggle('playing', playing);
  wrapper.classList.toggle('paused', !playing);
  const button = wrapper.querySelector('.video-toggle');
  if (button) button.setAttribute('aria-label', playing ? 'Pause video' : 'Play video');
}

function sourceFor(video) {
  return video.dataset.pendingSrc || video.dataset.src || '';
}

function toggleVideo(video) {
  if (video.paused) {
    const src = sourceFor(video);
    if (src && video.dataset.currentSrc !== src) {
      loadVideo(video, src);
    }
    video.play().catch(() => {});
  } else {
    video.pause();
  }
}

function setupVideoControls(video) {
  const wrapper = video.parentElement;
  video.preload = 'metadata';
  wrapper.classList.add('paused');

  if (!wrapper.querySelector('.video-toggle')) {
    const button = document.createElement('button');
    button.className = 'video-toggle';
    button.type = 'button';
    button.setAttribute('aria-label', 'Play video');
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleVideo(video);
    });
    wrapper.appendChild(button);
  }

  if (!wrapper.querySelector('.video-progress')) {
    const progress = document.createElement('input');
    progress.className = 'video-progress';
    progress.type = 'range';
    progress.min = '0';
    progress.max = '1000';
    progress.value = '0';
    progress.step = '1';
    progress.setAttribute('aria-label', 'Video progress');
    progress.addEventListener('input', () => {
      if (!video.duration) return;
      video.currentTime = (Number(progress.value) / 1000) * video.duration;
    });
    progress.addEventListener('click', (event) => event.stopPropagation());
    wrapper.appendChild(progress);
  }

  video.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleVideo(video);
  });
  wrapper.addEventListener('click', () => toggleVideo(video));
  video.addEventListener('play', () => setPlayingState(video, true));
  video.addEventListener('pause', () => setPlayingState(video, false));
  video.addEventListener('ended', () => setPlayingState(video, false));
  video.addEventListener('timeupdate', () => updateProgress(video));
  video.addEventListener('loadedmetadata', () => updateProgress(video));
}

function loadVideo(video, src) {
  const wrapper = video.parentElement;
  if (video.dataset.currentSrc === src) return;
  video.dataset.currentSrc = src;
  video.pause();
  video.removeAttribute('src');
  video.load();
  wrapper.classList.remove('loaded', 'errored', 'playing');
  wrapper.classList.add('loading');
  wrapper.classList.add('paused');
  const progress = wrapper.querySelector('.video-progress');
  if (progress) progress.value = '0';
  video.src = src;
  video.load();
  video.addEventListener('loadeddata', () => {
    wrapper.classList.remove('loading');
    wrapper.classList.add('loaded');
  }, { once: true });
  video.addEventListener('error', () => {
    wrapper.classList.remove('loading');
    wrapper.classList.add('errored');
  }, { once: true });
}

document.querySelectorAll('.video video').forEach(setupVideoControls);

const lazyVideoObserver = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const video = entry.target.querySelector('video');
      const src = sourceFor(video);
      if (src) loadVideo(video, src);
    });
  }, { rootMargin: '600px 0px' })
  : null;

function scheduleVideo(video, src) {
  video.dataset.pendingSrc = src;
  if (video.dataset.currentSrc && video.dataset.currentSrc !== src) {
    video.pause();
    video.removeAttribute('src');
    video.load();
    delete video.dataset.currentSrc;
    video.parentElement.classList.remove('loaded', 'loading', 'errored', 'playing');
    video.parentElement.classList.add('paused');
  }
  if (lazyVideoObserver) {
    lazyVideoObserver.observe(video.parentElement);
  } else {
    loadVideo(video, src);
  }
}

document.querySelectorAll('video[data-src]').forEach((video) => {
  scheduleVideo(video, video.dataset.src);
});

function setCase(caseId) {
  const selected = comparisonCases[caseId];
  document.querySelectorAll('[data-method]').forEach((video) => {
    const src = methodPath[video.dataset.method](selected);
    video.nextElementSibling.textContent = filename(src);
    scheduleVideo(video, src);
  });
  document.querySelectorAll('[data-case]').forEach((button) => {
    button.classList.toggle('active', button.dataset.case === caseId);
  });
}

setCase('01');

document.querySelectorAll('[data-case]').forEach((button) => {
  button.onclick = () => setCase(button.dataset.case);
});
