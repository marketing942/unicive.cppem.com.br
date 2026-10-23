/* Camada de apresentação. O envio e o rastreamento permanecem em script.js. */
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const progress = document.querySelector('.progress');
  let scheduled = false;
  const updateProgress = () => {
    const distance = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = `scaleX(${distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0})`;
    scheduled = false;
  };
  window.addEventListener('scroll', () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateProgress); }
  }, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('waiting');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    document.documentElement.classList.add('motion-ready');
    document.querySelectorAll('[data-reveal]').forEach(el => {
      el.classList.add('waiting');
      observer.observe(el);
    });
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches) {
        document.querySelectorAll('.waiting').forEach(el => el.classList.remove('waiting'));
        observer.disconnect();
      }
    });
  }

  // Carrossel infinito dos formandos: duplica as fotos e reposiciona o trilho em loop.
  const galleryViewport = document.querySelector('.gallery-viewport');
  const gallery = galleryViewport && galleryViewport.querySelector('.gallery-track');
  if (gallery) {
    const originals = Array.from(gallery.children);
    for (let i = 0; i < 2; i++) {
      originals.forEach(item => {
        const clone = item.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        clone.querySelectorAll('img').forEach(img => { img.alt = ''; img.loading = 'eager'; });
        gallery.appendChild(clone);
      });
    }

    const speed = 40; // px por segundo
    let offset = 0, pending = 0, setWidth = 0, last = 0;
    let hovering = false, visible = true, dragging = false, dragX = 0;

    const measure = () => {
      const gap = parseFloat(getComputedStyle(gallery).columnGap) || 0;
      setWidth = originals.reduce((sum, el) => sum + el.getBoundingClientRect().width + gap, 0);
    };
    const step = () => (originals[0].getBoundingClientRect().width + (parseFloat(getComputedStyle(gallery).columnGap) || 0));
    const render = () => {
      if (setWidth) offset = ((offset % setWidth) + setWidth) % setWidth;
      gallery.style.transform = `translate3d(${-offset}px,0,0)`;
    };

    const tick = now => {
      const dt = last ? Math.min((now - last) / 1000, .1) : 0;
      last = now;
      if (!dragging) {
        const auto = hovering || !visible || reducedMotion.matches ? 0 : speed * dt;
        const nudge = pending * Math.min(dt * 8, 1);
        pending -= nudge;
        if (Math.abs(pending) < .5) { offset += pending; pending = 0; }
        offset += auto + nudge;
      }
      render();
      requestAnimationFrame(tick);
    };

    document.querySelectorAll('[data-gallery-direction]').forEach(button => {
      button.addEventListener('click', () => {
        const distance = Number(button.dataset.galleryDirection) * step();
        if (reducedMotion.matches) offset += distance; else pending += distance;
      });
    });

    galleryViewport.addEventListener('mouseenter', () => { hovering = true; });
    galleryViewport.addEventListener('mouseleave', () => { hovering = false; });
    galleryViewport.addEventListener('focusin', () => { hovering = true; });
    galleryViewport.addEventListener('focusout', () => { hovering = false; });

    galleryViewport.addEventListener('pointerdown', e => {
      dragging = true; dragX = e.clientX; pending = 0;
      galleryViewport.classList.add('dragging');
      galleryViewport.setPointerCapture(e.pointerId);
    });
    galleryViewport.addEventListener('pointermove', e => {
      if (!dragging) return;
      offset -= e.clientX - dragX;
      dragX = e.clientX;
    });
    const endDrag = () => { dragging = false; galleryViewport.classList.remove('dragging'); };
    galleryViewport.addEventListener('pointerup', endDrag);
    galleryViewport.addEventListener('pointercancel', endDrag);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(galleryViewport);
    }
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);
    originals.forEach(el => el.querySelector('img')?.addEventListener('load', measure));
    measure();
    requestAnimationFrame(tick);
  }

  // O formulário principal está no fluxo normal da página, sem prender o Tab.
  const leadPanel = document.getElementById('inscricao');
  if (leadPanel) {
    new MutationObserver(() => {
      leadPanel.querySelectorAll('.field').forEach(field => {
        const control = field.querySelector('input, select');
        if (control) control.setAttribute('aria-invalid', String(field.classList.contains('invalid')));
      });
    }).observe(leadPanel, { subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  const floatingNote = document.querySelector('.floating-note');
  if (floatingNote && 'IntersectionObserver' in window) {
    let onScreen = true;
    const pauseAnimation = () => {
      floatingNote.style.animationPlayState = document.hidden || !onScreen ? 'paused' : 'running';
    };
    new IntersectionObserver(entries => {
      onScreen = entries[0].isIntersecting;
      pauseAnimation();
    }).observe(floatingNote);
    document.addEventListener('visibilitychange', pauseAnimation);
  }
})();
