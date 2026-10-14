/* ==========================================================================
   VIDRIO Y ALUMINIO BOSQUES
   main.js: loader, scroll suave, animaciones de scroll, formulario y visor.

   Dependencias (cargadas por CDN en index.html):
   - GSAP + ScrollTrigger  -> animaciones ligadas al scroll
   - Lenis                 -> scroll suave
   Si alguna falla, la pagina sigue funcionando completa y sin efectos.
   Con "reducir movimiento" activado en el sistema se desactivan los efectos.
   ========================================================================== */

(() => {
  'use strict';

  /* ------------------------------------------------------------------------
     CONFIGURACION: edita solo este bloque antes de publicar
  ------------------------------------------------------------------------ */
  const CONFIG = {
    // WhatsApp con lada de pais y solo digitos. Ejemplo Mexico: '5215512345678'
    // Si se deja vacio, WhatsApp abre sin contacto elegido (solo sirve para pruebas).
    whatsapp: '',

    // Telefono visible en la seccion de contacto (opcional). Ejemplo: '55 1234 5678'
    phoneDisplay: '',
    // Telefono para el enlace de llamada. Ejemplo: '+525512345678'
    phoneTel: '',

    // Pagina de Facebook del negocio. Si se deja vacio, se ocultan esos enlaces.
    facebook: '',
  };

  /* ------------------------------------------------------------------------
     UTILIDADES
  ------------------------------------------------------------------------ */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const html = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = Boolean(window.gsap && window.ScrollTrigger);
  const fx = hasGSAP && !reduced; // efectos de scroll activos

  let lenis = null;
  let menuOpen = false;

  const waUrl = (text) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;

  const headerEl = () => $('#header');

  /** Convierte el texto de un titulo en palabras enmascaradas para animarlas. */
  function splitWords(el) {
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;

    const vis = document.createElement('span');
    vis.setAttribute('aria-hidden', 'true');
    const inner = [];
    text.split(' ').forEach((word, i, all) => {
      const mask = document.createElement('span');
      mask.className = 'w';
      const wi = document.createElement('span');
      wi.className = 'wi';
      wi.textContent = word;
      mask.append(wi);
      vis.append(mask);
      if (i < all.length - 1) vis.append(document.createTextNode(' '));
      inner.push(wi);
    });
    el.textContent = '';
    el.append(sr, vis);
    return inner;
  }

  /** Separa palabras respetando etiquetas internas (<b>) para el manifiesto. */
  function splitManifest(el) {
    const words = [];
    const wrap = document.createElement('span');
    wrap.setAttribute('aria-hidden', 'true');

    const walk = (node, parent) => {
      node.childNodes.forEach((n) => {
        if (n.nodeType === Node.TEXT_NODE) {
          n.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) {
              parent.append(document.createTextNode(' '));
            } else {
              const s = document.createElement('span');
              s.className = 'wd';
              s.textContent = tok;
              parent.append(s);
              words.push(s);
            }
          });
        } else if (n.nodeType === Node.ELEMENT_NODE) {
          const clone = n.cloneNode(false);
          parent.append(clone);
          walk(n, clone);
        }
      });
    };
    walk(el, wrap);

    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = el.textContent.trim().replace(/\s+/g, ' ');
    el.textContent = '';
    el.append(sr, wrap);
    return words;
  }

  /* ------------------------------------------------------------------------
     CONTENIDO ESTATICO: enlaces de WhatsApp, contacto, anio
  ------------------------------------------------------------------------ */
  function initContent() {
    if (!CONFIG.whatsapp) {
      console.warn('[Vidrio y Aluminio Bosques] Falta CONFIG.whatsapp en js/main.js. Los botones de WhatsApp abrirán sin número.');
    }

    // Todos los CTA con data-wa abren WhatsApp con un mensaje ya escrito
    $$('[data-wa]').forEach((a) => {
      a.href = waUrl(a.dataset.wa);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });

    const phoneWrap = $('[data-phone-wrap]');
    if (CONFIG.phoneDisplay && phoneWrap) {
      phoneWrap.hidden = false;
      $('[data-phone-text]').textContent = CONFIG.phoneDisplay;
      $('#phone-link').href = `tel:${CONFIG.phoneTel || CONFIG.phoneDisplay.replace(/\s+/g, '')}`;
    }

    ['#fb-link', '#fb-link-2'].forEach((sel) => {
      const a = $(sel);
      if (!a) return;
      if (CONFIG.facebook) a.href = CONFIG.facebook;
      else if (a.closest('li')) a.closest('li').hidden = true;
    });

    const year = $('#year');
    if (year) year.textContent = new Date().getFullYear();
  }

  /* ------------------------------------------------------------------------
     SCROLL: Lenis + anclas
  ------------------------------------------------------------------------ */
  function initSmoothScroll() {
    if (reduced || typeof window.Lenis === 'undefined') return;
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });

    if (hasGSAP) {
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add((t) => lenis.raf(t * 1000));
      window.gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  function scrollLock(lock) {
    html.classList.toggle('is-locked', lock);
    if (!lenis) return;
    if (lock) lenis.stop();
    else lenis.start();
  }

  function scrollToTarget(target, immediate = false) {
    let y = target.getBoundingClientRect().top + window.scrollY;
    if (hasGSAP) {
      // Si la seccion esta fijada (pin), el destino es donde empieza el pin
      const st = window.ScrollTrigger.getAll().find((s) => s.pin && (s.trigger === target));
      if (st) y = st.start;
    }
    if (lenis) lenis.scrollTo(y, { immediate, duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else window.scrollTo({ top: y, behavior: reduced || immediate ? 'auto' : 'smooth' });
  }

  function initAnchors() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.getElementById(id.slice(1));
      if (!target) return;
      e.preventDefault();
      if (a.hasAttribute('data-menu-link')) closeMenu();
      scrollToTarget(target);
      history.replaceState(null, '', id);
    });

    const top = $('#totop');
    if (top) top.addEventListener('click', () => {
      if (lenis) lenis.scrollTo(0, { duration: 1.6 });
      else window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
  }

  /* ------------------------------------------------------------------------
     LOADER: cuatro cristales que se arman y dos hojas que se abren
  ------------------------------------------------------------------------ */
  function runLoader() {
    const el = $('#loader');
    if (!el) { html.classList.remove('is-loading'); return Promise.resolve(); }
    if (reduced) { el.remove(); html.classList.remove('is-loading'); return Promise.resolve(); }

    const countEl = $('#loader-count');
    const core = $('.loader__core', el);
    const doorL = $('.loader__door--l', el);
    const doorR = $('.loader__door--r', el);
    const MIN = 2300;   // el loader se ve al menos este tiempo
    const MAX = 7000;   // tope de seguridad
    const t0 = performance.now();

    let assetsReady = false;
    const pageLoaded = new Promise((res) => {
      if (document.readyState === 'complete') res();
      else window.addEventListener('load', res, { once: true });
    });
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready.catch(() => {}) : Promise.resolve();
    Promise.all([pageLoaded, fontsReady]).then(() => { assetsReady = true; });

    return new Promise((resolve) => {
      let p = 0;
      let finishing = false;

      const finish = () => {
        if (finishing) return;
        finishing = true;
        el.style.setProperty('--p', '1');
        if (countEl) countEl.textContent = '100';

        const ease = 'cubic-bezier(0.76, 0, 0.24, 1)';
        core.animate(
          [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.88)' }],
          { duration: 500, delay: 180, easing: ease, fill: 'forwards' }
        );
        doorL.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-101%)' }], { duration: 1150, delay: 520, easing: ease, fill: 'forwards' });
        doorR.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(101%)' }], { duration: 1150, delay: 520, easing: ease, fill: 'forwards' });

        // La pagina arranca mientras las hojas terminan de abrirse
        setTimeout(() => { html.classList.remove('is-loading'); resolve(); }, 900);
        setTimeout(() => el.remove(), 1900);
      };

      const tick = (now) => {
        if (finishing) return;
        const elapsed = now - t0;
        const eased = 1 - Math.pow(1 - Math.min(elapsed / 1900, 1), 3);
        const target = assetsReady && elapsed >= MIN ? 1 : eased * 0.92;
        p += (target - p) * 0.12;
        el.style.setProperty('--p', p.toFixed(3));
        if (countEl) countEl.textContent = String(Math.round(p * 100));

        if ((p > 0.996 && assetsReady) || elapsed > MAX) { finish(); return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ------------------------------------------------------------------------
     ESTADOS INICIALES (se aplican mientras el loader tapa la pagina)
  ------------------------------------------------------------------------ */
  const state = { words: [], manifest: [] };

  function prepareFx() {
    const { gsap } = window;
    gsap.registerPlugin(window.ScrollTrigger);
    window.ScrollTrigger.config({ ignoreMobileResize: true });
    html.classList.add('gsap-on');

    // Hero
    gsap.set('#header', { opacity: 0 });
    gsap.set('[data-hero-line]', { yPercent: 118 });
    gsap.set('[data-hero]', { y: 28, opacity: 0 });
    gsap.set('.pane', { opacity: 0, y: 90, scale: 0.94 });
    gsap.set('.pane__glass', { clipPath: 'inset(0 0 100% 0)' });
    gsap.set('.seal', { opacity: 0, scale: 0.5, rotate: -50 });
    gsap.set('.rot__w:not(.is-on)', { yPercent: 115 });

    // Titulos de seccion
    $$('[data-split]').forEach((h) => {
      const w = splitWords(h);
      gsap.set(w, { yPercent: 118 });
      state.words.push({ el: h, w });
    });

    // Manifiesto
    const m = $('[data-manifest]');
    if (m) {
      const words = splitManifest(m);
      gsap.set(words, { opacity: 0.16 });
      state.manifest = { el: m, words };
    }

    // Aparicion generica
    gsap.set('[data-reveal]', { opacity: 0, y: 38 });

    // Contadores
    $$('[data-count]').forEach((n) => { n.textContent = '0'; });

    // Llamada final
    gsap.set('#open-content', { opacity: 0, scale: 0.92 });
  }

  /* ------------------------------------------------------------------------
     HERO
  ------------------------------------------------------------------------ */
  function heroIntro() {
    const { gsap } = window;
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

    tl.to('#header', { opacity: 1, duration: 0.9, ease: 'power2.out' }, 0)
      .to('[data-hero-line]', { yPercent: 0, duration: 1.4, stagger: 0.14 }, 0.05)
      .to('[data-hero]', { y: 0, opacity: 1, duration: 1.1, stagger: 0.12 }, 0.35)
      .to('.pane', { opacity: 1, y: 0, scale: 1, duration: 1.6, stagger: 0.18 }, 0.25)
      .to('.pane__glass', { clipPath: 'inset(0 0 0% 0)', duration: 1.5, stagger: 0.18, ease: 'power3.inOut' }, 0.3)
      .to('.seal', { opacity: 1, scale: 1, rotate: 0, duration: 1.3, ease: 'back.out(1.5)' }, 0.9)
      .add(() => { startRotator(); initPaneParallax(); }, 1.6);
  }

  /** Palabra que cambia en el titular: tu casa, tu negocio, tu terraza... */
  function startRotator() {
    const words = $$('.rot__w');
    if (words.length < 2 || reduced) return;
    let i = 0;
    const next = () => {
      const cur = words[i];
      i = (i + 1) % words.length;
      const nxt = words[i];
      const { gsap } = window;
      gsap.to(cur, { yPercent: -115, duration: 0.8, ease: 'power3.inOut' });
      gsap.fromTo(nxt, { yPercent: 115 }, { yPercent: 0, duration: 0.8, ease: 'power3.inOut', onComplete: () => gsap.delayedCall(2.4, next) });
    };
    window.gsap.delayedCall(2.6, next);
  }

  function initPaneParallax() {
    if (!finePointer) return;
    const { gsap } = window;
    const hero = $('#inicio');
    const items = $$('[data-pane]').map((p) => ({
      x: gsap.quickTo(p, 'x', { duration: 0.9, ease: 'power3' }),
      y: gsap.quickTo(p, 'y', { duration: 0.9, ease: 'power3' }),
      d: parseFloat(p.dataset.depth) || 1,
    }));
    hero.addEventListener('pointermove', (e) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      items.forEach((it) => { it.x(-nx * 38 * it.d); it.y(-ny * 30 * it.d); });
    });
  }

  /** Particulas de luz sobre el hero: destellos de cristal que suben lento. */
  function heroParticles() {
    const cv = $('#hero-fx');
    if (!cv || reduced) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const hero = $('#inicio');
    let w = 0, h = 0, dpr = 1;
    let parts = [];
    let visible = true;
    let tabVisible = true;
    let raf = 0;
    let px = 0, py = 0, tx = 0, ty = 0;

    const sprite = (rgb) => {
      const s = document.createElement('canvas');
      s.width = s.height = 64;
      const c = s.getContext('2d');
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, `rgba(${rgb}, 1)`);
      g.addColorStop(0.25, `rgba(${rgb}, 0.45)`);
      g.addColorStop(1, `rgba(${rgb}, 0)`);
      c.fillStyle = g;
      c.fillRect(0, 0, 64, 64);
      return s;
    };
    const sprites = { ice: sprite('190, 214, 255'), amber: sprite('244, 184, 31') };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      w = hero.clientWidth;
      h = hero.clientHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      const count = w < 768 ? 26 : 64;
      parts = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 5 + Math.random() * 16,
        vy: -(0.1 + Math.random() * 0.34),
        vx: (Math.random() - 0.5) * 0.14,
        z: 0.25 + Math.random() * 0.75,
        ph: Math.random() * Math.PI * 2,
        sp: 0.6 + Math.random() * 1.4,
        amber: Math.random() < 0.26,
        cross: Math.random() < 0.18,
      }));
    };

    const frame = (t) => {
      raf = 0;
      if (!visible || !tabVisible) return;
      px += (tx - px) * 0.05;
      py += (ty - py) * 0.05;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';

      for (const p of parts) {
        p.y += p.vy * p.z * 1.6;
        p.x += p.vx;
        if (p.y < -30) { p.y = h + 30; p.x = Math.random() * w; }
        if (p.x < -30) p.x = w + 30;
        if (p.x > w + 30) p.x = -30;

        const tw = 0.5 + 0.5 * Math.sin(t * 0.001 * p.sp + p.ph);
        const a = (0.15 + tw * 0.65) * p.z;
        const x = p.x + px * 46 * p.z;
        const y = p.y + py * 34 * p.z;
        const s = p.r * (0.6 + p.z * 0.7);

        ctx.globalAlpha = a;
        ctx.drawImage(p.amber ? sprites.amber : sprites.ice, x - s, y - s, s * 2, s * 2);

        if (p.cross && tw > 0.55) {
          ctx.globalAlpha = a * 0.9;
          ctx.fillStyle = p.amber ? '#FFD36B' : '#EAF0FF';
          const l = s * 1.9 * tw;
          ctx.fillRect(x - l, y - 0.5, l * 2, 1);
          ctx.fillRect(x - 0.5, y - l, 1, l * 2);
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };

    const run = () => { if (!raf && visible && tabVisible) raf = requestAnimationFrame(frame); };

    resize();
    new ResizeObserver(() => { resize(); }).observe(hero);
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; run(); }).observe(hero);
    document.addEventListener('visibilitychange', () => { tabVisible = !document.hidden; run(); });
    if (finePointer) {
      hero.addEventListener('pointermove', (e) => {
        tx = e.clientX / window.innerWidth - 0.5;
        ty = e.clientY / window.innerHeight - 0.5;
      });
    }
    run();
  }

  function heroScroll() {
    const { gsap } = window;
    const trig = { trigger: '#inicio', start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('.hero__bg', { yPercent: 14, ease: 'none', scrollTrigger: trig });
    gsap.to('.hero__copy', { yPercent: -12, opacity: 0.15, ease: 'none', scrollTrigger: trig });
    gsap.to('.hero__visual', { yPercent: -9, ease: 'none', scrollTrigger: trig });
  }

  /* ------------------------------------------------------------------------
     HEADER, PROGRESO Y NAVEGACION
  ------------------------------------------------------------------------ */
  function initHeader() {
    const header = headerEl();
    if (!header) return;

    if (hasGSAP) {
      window.ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: (self) => {
          const y = self.scroll();
          header.classList.toggle('is-scrolled', y > 24);
          header.classList.toggle('is-hidden', self.direction === 1 && y > 560 && !menuOpen);
        },
      });
      header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
    } else {
      // Sin GSAP: solo fondo al bajar, usando un observador y no un listener de scroll
      const sentinel = document.createElement('div');
      sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:24px;pointer-events:none';
      document.body.prepend(sentinel);
      new IntersectionObserver(([en]) => header.classList.toggle('is-scrolled', !en.isIntersecting)).observe(sentinel);
    }

    // Enlace activo segun la seccion visible
    const links = $$('.nav__list a');
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const a = map.get(en.target.id);
        if (a && en.isIntersecting) {
          links.forEach((l) => l.classList.remove('is-current'));
          a.classList.add('is-current');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  function initProgress() {
    window.gsap.to('#progress-bar', {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 0.2 },
    });
  }

  function openMenu() {
    const menu = $('#menu');
    const burger = $('#burger');
    menuOpen = true;
    menu.removeAttribute('inert');
    menu.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Cerrar menú');
    headerEl().classList.add('is-menu');
    headerEl().classList.remove('is-hidden');
    scrollLock(true);
  }

  function closeMenu() {
    if (!menuOpen) return;
    const menu = $('#menu');
    const burger = $('#burger');
    menuOpen = false;
    menu.classList.remove('is-open');
    menu.setAttribute('inert', '');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Abrir menú');
    headerEl().classList.remove('is-menu');
    scrollLock(false);
  }

  function initMenu() {
    const burger = $('#burger');
    if (!burger) return;
    burger.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) closeMenu(); });
  }

  /* ------------------------------------------------------------------------
     SECCIONES CON SCROLL
  ------------------------------------------------------------------------ */
  function marquee() {
    const { gsap, ScrollTrigger } = window;
    const track = $('#band-track');
    if (!track) return;
    const tween = gsap.to(track, { xPercent: -50, ease: 'none', duration: 38, repeat: -1 });

    // La velocidad del scroll acelera o invierte la banda y luego vuelve a su ritmo
    let boost = 0;
    ScrollTrigger.create({
      trigger: '.band',
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => { boost = gsap.utils.clamp(-7, 7, self.getVelocity() / 260); },
    });
    gsap.ticker.add(() => {
      if (Math.abs(boost) < 0.01) { if (boost !== 0) { boost = 0; tween.timeScale(1); } return; }
      boost *= 0.93;
      tween.timeScale(1 + boost);
    });
  }

  function revealAll() {
    const { gsap, ScrollTrigger } = window;

    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 90%',
      end: 'max',
      once: true,
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.1, stagger: 0.12, ease: 'power3.out', overwrite: 'auto' }),
    });

    state.words.forEach(({ el, w }) => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        end: 'max',
        once: true,
        onEnter: () => gsap.to(w, { yPercent: 0, duration: 1.15, stagger: 0.07, ease: 'power4.out' }),
      });
    });
  }

  function manifest() {
    if (!state.manifest.words) return;
    window.gsap.to(state.manifest.words, {
      opacity: 1,
      ease: 'none',
      stagger: { each: 0.08 },
      duration: 0.3,
      scrollTrigger: { trigger: state.manifest.el, start: 'top 82%', end: 'bottom 52%', scrub: true },
    });
  }

  function counters() {
    const { gsap, ScrollTrigger } = window;
    $$('[data-count]').forEach((n) => {
      const end = parseInt(n.dataset.count, 10);
      const o = { v: 0 };
      ScrollTrigger.create({
        trigger: n,
        start: 'top 92%',
        end: 'max',
        once: true,
        onEnter: () => gsap.to(o, {
          v: end,
          duration: 2.4,
          ease: 'power3.out',
          onUpdate: () => { n.textContent = Math.round(o.v).toLocaleString('es-MX'); },
          onComplete: () => { n.textContent = end.toLocaleString('es-MX'); },
        }),
      });
    });
  }

  /** Servicios en escritorio: la lista se desplaza y el cristal de la derecha cambia. */
  function servicesStage() {
    const { ScrollTrigger } = window;
    const items = $$('.svc__item');
    const imgs = $$('.svc__frame img');
    const ticks = $$('#svc-ticks i');
    const sheen = $('.svc__sheen');
    let current = 0;

    const set = (i) => {
      if (i === current) return;
      const target = imgs[i];
      const prev = imgs[current];
      imgs.forEach((im) => im.classList.remove('is-prev'));
      prev.classList.remove('is-active');
      prev.classList.add('is-prev');
      void target.offsetWidth; // reinicia la imagen nueva a su estado base para que se vea el barrido
      target.classList.add('is-active');

      items.forEach((it, k) => it.classList.toggle('is-active', k === i));
      ticks.forEach((t, k) => t.classList.toggle('is-on', k === i));
      if (sheen) { sheen.classList.remove('is-run'); void sheen.offsetWidth; sheen.classList.add('is-run'); }
      current = i;
    };

    items.forEach((item, i) => {
      ScrollTrigger.create({
        trigger: item,
        start: 'top 58%',
        end: 'bottom 58%',
        onToggle: (self) => { if (self.isActive) set(i); },
      });
    });
  }

  /** Obras en escritorio: la galeria se fija y se desplaza en horizontal con el scroll. */
  function workPin() {
    const { gsap } = window;
    const sec = $('#proyectos');
    const track = $('#work-track');
    const bar = $('#work-bar');
    if (!sec || !track) return undefined;

    sec.classList.add('is-pin');
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);

    gsap.to(track, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: {
        trigger: sec,
        start: 'top top',
        end: () => `+=${dist()}`,
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        refreshPriority: 2, // si el breakpoint cambia, este pin se recalcula antes que los de abajo
        onUpdate: (self) => { if (bar) bar.style.transform = `scaleX(${self.progress})`; },
      },
    });
    return () => sec.classList.remove('is-pin');
  }

  function steps() {
    const { gsap, ScrollTrigger } = window;
    const wrap = $('#steps');
    if (!wrap) return;

    gsap.to('#steps-fill', {
      scaleY: 1,
      ease: 'none',
      scrollTrigger: { trigger: wrap, start: 'top 62%', end: 'bottom 62%', scrub: 0.4 },
    });
    $$('.step', wrap).forEach((step) => {
      ScrollTrigger.create({
        trigger: step,
        start: 'top 62%',
        end: 'max',
        onEnter: () => step.classList.add('is-on'),
        onLeaveBack: () => step.classList.remove('is-on'),
      });
    });
  }

  /** Llamada final: dos hojas de cristal se abren con el scroll y revelan el mensaje. */
  function openWindow() {
    const { gsap } = window;
    const stage = $('#open-stage');
    if (!stage) return;

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: stage, start: 'top top', end: '+=110%', pin: true, scrub: 0.6, anticipatePin: 1 },
    });
    tl.to('#open-content', { opacity: 1, scale: 1, duration: 0.55 }, 0.2)
      .to('#pane-l', { xPercent: -101, duration: 1 }, 0.1)
      .to('#pane-r', { xPercent: 101, duration: 1 }, 0.1);
  }

  function footerWord() {
    window.gsap.fromTo('#footer-word',
      { yPercent: 40, opacity: 0 },
      { yPercent: 0, opacity: 1, ease: 'none',
        scrollTrigger: { trigger: '.footer__word', start: 'top 108%', end: 'bottom 88%', scrub: true } });
  }

  /** Botones que se acercan un poco al cursor. */
  function magnetic() {
    if (!finePointer) return;
    const { gsap } = window;
    $$('[data-magnetic]').forEach((btn) => {
      const x = gsap.quickTo(btn, 'x', { duration: 0.6, ease: 'power3' });
      const y = gsap.quickTo(btn, 'y', { duration: 0.6, ease: 'power3' });
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        x((e.clientX - (r.left + r.width / 2)) * 0.22);
        y((e.clientY - (r.top + r.height / 2)) * 0.3);
      });
      btn.addEventListener('pointerleave', () => { x(0); y(0); });
    });
  }

  /** Foco de luz que sigue al cursor en las tarjetas del bento. */
  function spotlight() {
    if (!finePointer) return;
    $$('[data-spot]').forEach((c) => {
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty('--mx', `${e.clientX - r.left}px`);
        c.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  /** Sin efectos: todo visible y en su estado final. */
  function staticFallback() {
    $$('.step').forEach((s) => s.classList.add('is-on'));
    const fill = $('#steps-fill');
    if (fill) fill.style.transform = 'none';
    const bar = $('#progress-bar');
    if (bar) bar.parentElement.hidden = true;
  }

  /* ------------------------------------------------------------------------
     PREGUNTAS FRECUENTES
  ------------------------------------------------------------------------ */
  function initAccordion() {
    const items = $$('.acc__item');
    if (!items.length) return;
    let t = 0;

    const set = (item, open) => {
      item.classList.toggle('is-open', open);
      $('.acc__btn', item).setAttribute('aria-expanded', String(open));
    };
    items.forEach((item) => {
      $('.acc__btn', item).addEventListener('click', () => {
        const wasOpen = item.classList.contains('is-open');
        items.forEach((i) => set(i, false));
        if (!wasOpen) set(item, true);
        if (hasGSAP) { clearTimeout(t); t = setTimeout(() => window.ScrollTrigger.refresh(), 700); }
      });
    });
    set(items[0], true);
  }

  /* ------------------------------------------------------------------------
     FORMULARIO EN TRES PASOS -> WHATSAPP
  ------------------------------------------------------------------------ */
  function initWizard() {
    const form = $('#wizard');
    if (!form) return;

    const steps = $$('.wiz__step', form);
    const tabs = $$('.wiz__tabs li', form);
    const bar = $('#wiz-bar');
    const top = $('.wiz__top', form);
    const done = $('#wiz-done');
    const chips = $$('.chip', form);
    const errNeed = $('#err-need');
    const nameInput = $('#f-name');
    const errName = $('#err-name');
    const preview = $('#preview-text');
    const list = typeof Intl !== 'undefined' && Intl.ListFormat ? new Intl.ListFormat('es', { style: 'long', type: 'conjunction' }) : null;
    let idx = 0;

    const selected = () => chips.filter((c) => c.getAttribute('aria-pressed') === 'true').map((c) => c.dataset.value);

    const message = () => {
      const needs = selected();
      const name = nameInput.value.trim() || '(tu nombre)';
      const place = $('#f-place').value;
      const zone = $('#f-zone').value.trim();
      const size = $('#f-size').value.trim();
      const notes = $('#f-notes').value.trim();
      const what = needs.length ? (list ? list.format(needs) : needs.join(', ')) : 'un proyecto de vidrio y aluminio';
      const lines = [`Hola, soy ${name}. Quiero cotizar: ${what}.`, `Lugar: ${place}${zone ? ` en ${zone}` : ''}.`];
      if (size) lines.push(`Medidas aproximadas: ${size}.`);
      if (notes) lines.push(`Detalles: ${notes}`);
      lines.push('Vi su página web y me gustaría recibir una cotización.');
      return lines.join('\n');
    };

    const show = (n) => {
      idx = n;
      steps.forEach((s, k) => {
        s.hidden = k !== n;
        s.classList.remove('is-in');
        if (k === n) { void s.offsetWidth; s.classList.add('is-in'); }
      });
      tabs.forEach((t, k) => {
        t.classList.toggle('is-current', k === n);
        t.classList.toggle('is-done', k < n);
        if (k === n) t.setAttribute('aria-current', 'step'); else t.removeAttribute('aria-current');
      });
      bar.style.width = `${((n + 1) / steps.length) * 100}%`;
      if (n === 2) preview.textContent = message();
    };

    chips.forEach((c) => c.addEventListener('click', () => {
      c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true'));
      if (selected().length) errNeed.hidden = true;
    }));

    form.addEventListener('click', (e) => {
      const next = e.target.closest('[data-next]');
      const prev = e.target.closest('[data-prev]');
      if (next) {
        if (idx === 0 && !selected().length) {
          errNeed.hidden = false;
          chips[0].focus();
          return;
        }
        show(idx + 1);
        const f = $('input, select, textarea', steps[idx]);
        if (f) f.focus({ preventScroll: true });
      }
      if (prev) show(idx - 1);
    });

    nameInput.addEventListener('input', () => {
      if (nameInput.value.trim()) { errName.hidden = true; nameInput.removeAttribute('aria-invalid'); }
      preview.textContent = message();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!nameInput.value.trim()) {
        errName.hidden = false;
        nameInput.setAttribute('aria-invalid', 'true');
        nameInput.focus();
        return;
      }
      const url = waUrl(message());
      window.open(url, '_blank', 'noopener');
      $('#wiz-retry').href = url;
      steps.forEach((s) => { s.hidden = true; });
      top.hidden = true;
      done.hidden = false;
      $('h3', done).setAttribute('tabindex', '-1');
      $('h3', done).focus({ preventScroll: true });
    });

    $('#wiz-reset').addEventListener('click', () => {
      form.reset();
      chips.forEach((c) => c.setAttribute('aria-pressed', 'false'));
      done.hidden = true;
      top.hidden = false;
      show(0);
    });

    show(0);
  }

  /* ------------------------------------------------------------------------
     VISOR DE FOTOS
  ------------------------------------------------------------------------ */
  function initLightbox() {
    const dlg = $('#lightbox');
    const buttons = $$('[data-lightbox]');
    if (!dlg || !buttons.length || typeof dlg.showModal !== 'function') return;

    const img = $('#lb-img');
    const cap = $('#lb-cap');
    let i = 0;

    const load = (n) => {
      i = (n + buttons.length) % buttons.length;
      const b = buttons[i];
      const src = $('img', b);
      img.src = src.dataset.full || src.src;
      img.alt = src.alt;
      cap.textContent = $('figcaption', b.parentElement).textContent;
    };

    buttons.forEach((b, n) => b.addEventListener('click', () => {
      load(n);
      dlg.showModal();
      scrollLock(true);
    }));
    $('#lb-close').addEventListener('click', () => dlg.close());
    $('#lb-prev').addEventListener('click', () => load(i - 1));
    $('#lb-next').addEventListener('click', () => load(i + 1));
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', () => scrollLock(false));
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') load(i - 1);
      if (e.key === 'ArrowRight') load(i + 1);
    });
  }

  /* ------------------------------------------------------------------------
     WHATSAPP FLOTANTE: mensaje de invitacion
  ------------------------------------------------------------------------ */
  function initFab() {
    const tip = $('#fab-tip');
    if (!tip) return;
    let seen = false;
    try { seen = sessionStorage.getItem('vab-tip') === '1'; } catch (e) { /* sin almacenamiento */ }
    const hide = () => {
      tip.hidden = true;
      try { sessionStorage.setItem('vab-tip', '1'); } catch (e) { /* sin almacenamiento */ }
    };
    $('#fab-tip-close').addEventListener('click', hide);
    if (seen) return;
    setTimeout(() => { tip.hidden = false; setTimeout(hide, 10000); }, 14000);
  }

  /* ------------------------------------------------------------------------
     ARRANQUE
  ------------------------------------------------------------------------ */
  function start() {
    initSmoothScroll();
    initHeader();

    if (fx) {
      const { gsap, ScrollTrigger } = window;
      heroIntro();
      heroScroll();
      heroParticles();
      initProgress();
      marquee();
      revealAll();
      manifest();
      counters();

      // Servicios y Obras (escritorio) se crean antes que Proceso y la ventana final
      // para que ScrollTrigger calcule los pines en el mismo orden de la pagina.
      const mm = gsap.matchMedia();
      mm.add('(min-width: 1024px)', () => {
        servicesStage();
        return workPin();
      });

      steps();
      openWindow();
      footerWord();
      magnetic();
      spotlight();

      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        if (location.hash.length > 1) {
          const t = document.getElementById(location.hash.slice(1));
          if (t) scrollToTarget(t, true);
        }
      });
    } else {
      staticFallback();
      heroParticles();
      if (location.hash.length > 1) {
        const t = document.getElementById(location.hash.slice(1));
        if (t) scrollToTarget(t, true);
      }
    }
  }

  function boot() {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (!location.hash) window.scrollTo(0, 0);

    initContent();
    initAnchors();
    initMenu();
    initAccordion();
    initWizard();
    initLightbox();
    initFab();

    if (fx) prepareFx();
    runLoader().then(start);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
