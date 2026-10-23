/* Panda: https://docs.pandavideo.com/reference/send-events
   Carrega sob demanda e só trata mensagens do iframe e da origem esperados. */
(() => {
  const film = document.querySelector('.hero-film');
  const iframe = film?.querySelector('iframe');
  const cover = film?.querySelector('[data-film-play]');
  if (!iframe || !cover) return;

  const status = film.querySelector('[data-film-status]');
  const soundButton = film.querySelector('[data-film-sound]');
  const pauseButton = film.querySelector('[data-film-pause]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const embed = new URL(iframe.dataset.src);
  const origin = embed.origin;
  let inView = !('IntersectionObserver' in window);
  let previewInView = false;
  let scrolled = false;
  let autoAttempted = false;
  let loaded = false;
  let ready = false;
  let playing = false;
  let muted = true;
  let wantsPlay = false;
  let wantsSound = false;
  let ended = false;
  let autoTimer;
  let fallbackTimer;

  const blocked = () => document.hidden || document.body.classList.contains('modal-open');
  const autoAllowed = () => !reducedMotion.matches && !connection?.saveData && !blocked();
  const send = (type, parameter) => {
    if (!ready) return;
    const command = { type };
    if (parameter !== undefined) command.parameter = parameter;
    iframe.contentWindow?.postMessage(command, origin);
  };
  const revealPlayer = () => {
    const moveFocus = document.activeElement === cover;
    cover.classList.add('is-dismissed');
    cover.setAttribute('aria-hidden', 'true');
    cover.tabIndex = -1;
    iframe.removeAttribute('aria-hidden');
    iframe.tabIndex = 0;
    if (moveFocus) iframe.focus({ preventScroll: true });
  };
  const playWhenReady = () => {
    if (!ready || !wantsPlay || !inView || blocked()) return;
    if (ended || (wantsSound && muted)) send('currentTime', 0);
    muted = !wantsSound;
    send('volume', muted ? 0 : 1);
    send('play');
    ended = false;
    if (playing) {
      clearTimeout(fallbackTimer);
      film.classList.remove('is-loading');
      soundButton.hidden = !muted;
      status.textContent = muted ? 'Prévia sem som. Dê play no seu próximo capítulo.' : 'Vídeo institucional · Unicive × CPPEM.';
    }
  };
  const requestPlay = (withSound) => {
    if (blocked()) return;
    autoAttempted = true;
    wantsPlay = true;
    wantsSound = withSound;
    film.classList.add('is-loading');
    status.textContent = withSound ? 'Preparando o seu próximo capítulo…' : 'Preparando uma prévia sem som…';
    clearTimeout(fallbackTimer);
    fallbackTimer = setTimeout(() => {
      if (playing || !wantsPlay || blocked() || !inView) return;
      film.classList.remove('is-loading');
      revealPlayer();
      status.textContent = 'Toque no play do vídeo ou use “Abrir vídeo”.';
      soundButton.hidden = !ready;
    }, 8000);
    if (!loaded) {
      loaded = true;
      muted = !withSound;
      const url = new URL(embed);
      url.searchParams.set('autoplay', 'false');
      url.searchParams.set('muted', String(muted));
      url.searchParams.set('smartAutoplay', 'false');
      url.searchParams.set('color', '#f2c57c');
      iframe.src = url.href;
    } else {
      playWhenReady();
    }
  };
  const pause = () => {
    clearTimeout(autoTimer);
    clearTimeout(fallbackTimer);
    if (!loaded) return;
    wantsPlay = false;
    send('pause');
    playing = false;
    film.classList.remove('is-loading', 'is-playing');
    pauseButton.textContent = 'Continuar';
    status.textContent = 'Vídeo pausado. Continue quando quiser.';
  };
  const schedulePreview = () => {
    clearTimeout(autoTimer);
    if (!scrolled || !previewInView || autoAttempted || !autoAllowed()) return;
    // A capa permanece em cena antes da prévia e não reage a uma passagem rápida.
    autoTimer = setTimeout(() => {
      if (previewInView && !autoAttempted && autoAllowed()) requestPlay(false);
    }, 900);
  };

  cover.addEventListener('click', () => { inView = true; requestPlay(true); });
  soundButton.addEventListener('click', () => { inView = true; requestPlay(true); });
  pauseButton.addEventListener('click', () => {
    if (playing) pause();
    else { inView = true; requestPlay(!muted); }
  });

  window.addEventListener('message', event => {
    if (event.origin !== origin || event.source !== iframe.contentWindow) return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    switch (data.message) {
      case 'panda_ready':
        ready = true;
        playWhenReady();
        break;
      case 'panda_play':
        if (!inView || blocked()) { send('pause'); return; }
        wantsPlay = true;
        clearTimeout(fallbackTimer);
        playing = true;
        film.classList.remove('is-loading');
        film.classList.add('is-playing');
        revealPlayer();
        soundButton.hidden = !muted;
        pauseButton.hidden = false;
        pauseButton.textContent = 'Pausar';
        status.textContent = muted ? 'Prévia sem som. Dê play no seu próximo capítulo.' : 'Vídeo institucional · Unicive × CPPEM.';
        break;
      case 'panda_pause':
        playing = false;
        film.classList.remove('is-playing', 'is-loading');
        pauseButton.textContent = 'Continuar';
        status.textContent = 'Vídeo pausado. Continue quando quiser.';
        break;
      case 'panda_ended':
        ended = true;
        playing = false;
        film.classList.remove('is-playing');
        pauseButton.textContent = 'Rever';
        status.textContent = 'Novas possibilidades esperam por você.';
        break;
      case 'panda_error':
        playing = false;
        wantsPlay = false;
        clearTimeout(fallbackTimer);
        film.classList.remove('is-loading', 'is-playing');
        revealPlayer();
        pauseButton.hidden = true;
        soundButton.hidden = true;
        status.textContent = 'Não foi possível reproduzir aqui. Use “Abrir vídeo”.';
        break;
    }
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const entry = entries[0];
      if (!entry.isIntersecting || entry.intersectionRatio < 0.15) {
        inView = false;
        previewInView = false;
        pause();
      } else {
        inView = true;
        previewInView = entry.intersectionRatio >= 0.65;
        if (previewInView) schedulePreview();
        else clearTimeout(autoTimer);
      }
    }, { threshold: [0, 0.15, 0.65, 1], rootMargin: '-102px 0px 0px 0px' });
    observer.observe(film.querySelector('.film-stage'));
    window.addEventListener('scroll', () => {
      if (scrolled || window.scrollY < 20) return;
      scrolled = true;
      schedulePreview();
    }, { passive: true });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });
  new MutationObserver(() => {
    if (document.body.classList.contains('modal-open')) pause();
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      clearTimeout(autoTimer);
      if (!wantsSound) pause();
    }
  });
  connection?.addEventListener?.('change', () => {
    if (connection.saveData) {
      clearTimeout(autoTimer);
      if (!wantsSound) pause();
    }
  });
})();
