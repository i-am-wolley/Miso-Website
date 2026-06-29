/* ══════════════════════════════════════════
   MISO — CINEMATIC SCRIPT
   Lenis · GSAP · Canvas particles · Tilt
══════════════════════════════════════════ */

(function () {
  'use strict';

  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  gsap.registerPlugin(ScrollTrigger);

  /* ──────────────────────────────────────
     PRELOADER — pure CSS transition,
     no dependency on any other system
  ────────────────────────────────────── */
  function initPreloader() {
    const el = document.getElementById('preloader');
    if (!el) { lateInit(); return; }

    function dismiss() {
      el.classList.add('out');
      setTimeout(() => { el.style.display = 'none'; lateInit(); }, 750);
    }

    /* Run after CSS fill animation (1.25s) */
    setTimeout(dismiss, 1350);
  }

  /* ──────────────────────────────────────
     MOUSE TRACKING — CSS custom props
     drives cursor, glow, tilt
  ────────────────────────────────────── */
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;

  function initMouse() {
    document.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      document.documentElement.style.setProperty('--mx', mouseX + 'px');
      document.documentElement.style.setProperty('--my', mouseY + 'px');
    });

    /* Hide native cursor on enter */
    document.documentElement.style.cursor = 'none';
  }

  /* ──────────────────────────────────────
     CANVAS STEAM PARTICLES
  ────────────────────────────────────── */
  function initParticles() {
    if (RM) return;

    const canvas = document.getElementById('steam-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const COUNT = 90;
    let intensity = 0.4; /* 0–1, driven by scroll */

    /* Scroll updates particle intensity */
    window.addEventListener('scroll', () => {
      const pct = window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight);
      intensity = 0.25 + pct * 0.75;
    }, { passive: true });

    class Particle {
      constructor() { this.reset(true); }

      reset(initial = false) {
        this.x     = Math.random() * canvas.width;
        this.y     = initial ? Math.random() * canvas.height : canvas.height + 8;
        this.r     = Math.random() * 1.8 + 0.3;
        this.vy    = Math.random() * 0.7 + 0.25;
        this.vx    = (Math.random() - 0.5) * 0.2;
        this.phase = Math.random() * Math.PI * 2;
        this.freq  = Math.random() * 0.025 + 0.01;
        this.life  = initial ? Math.random() * 200 : 0;
        this.max   = 150 + Math.random() * 150;
        this.alpha = 0;
        this.peak  = Math.random() * 0.22 + 0.04;
      }

      step() {
        this.life++;
        this.phase += this.freq;
        this.x  += this.vx + Math.sin(this.phase) * 0.35;
        this.y  -= this.vy * (0.6 + intensity * 0.6);

        const t = this.life / this.max;
        if      (t < 0.2)  this.alpha = (t / 0.2)       * this.peak;
        else if (t > 0.75) this.alpha = ((1 - t) / 0.25) * this.peak;
        else               this.alpha = this.peak;

        if (this.life >= this.max || this.y < -10) this.reset();
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,169,110,${this.alpha.toFixed(3)})`;
        ctx.fill();
      }
    }

    const particles = Array.from({ length: COUNT }, () => new Particle());

    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) { p.step(); p.draw(); }
      requestAnimationFrame(tick);
    }
    tick();
  }

  /* ──────────────────────────────────────
     LENIS SMOOTH SCROLL
  ────────────────────────────────────── */
  let lenis;

  function initLenis() {
    lenis = new Lenis({
      duration:      1.35,
      easing:        t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel:   true,
      wheelMultiplier: 0.85,
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ──────────────────────────────────────
     TILT — mouse-reactive 3D on .app elements
  ────────────────────────────────────── */
  function initTilt() {
    if (RM) return;

    document.querySelectorAll('[data-tilt]').forEach(el => {
      const MAX_Y = 7, MAX_X = 5;
      let raf, bounds;
      let active = false;

      function onEnter() {
        bounds = el.getBoundingClientRect();
        active = true;
        scheduleTilt();
      }

      function scheduleTilt() {
        if (!active) return;
        raf = requestAnimationFrame(scheduleTilt);
        if (!bounds) return;

        const cx = bounds.left + bounds.width  / 2;
        const cy = bounds.top  + bounds.height / 2;
        const dx = (mouseX - cx) / (bounds.width  / 2);
        const dy = (mouseY - cy) / (bounds.height / 2);
        const rY = dx * MAX_Y;
        const rX = -dy * MAX_X;

        gsap.to(el, {
          rotateY: rY, rotateX: rX,
          duration: 0.5, ease: 'power2.out',
          transformPerspective: 1100,
        });
      }

      function onLeave() {
        active = false;
        cancelAnimationFrame(raf);
        bounds = null;
        gsap.to(el, { rotateY: 0, rotateX: 0, duration: 1.2, ease: 'power3.out' });
      }

      /* Watch for visibility changes (element enters viewport) */
      const io = new IntersectionObserver(entries => {
        if (!entries[0].isIntersecting) { active = false; cancelAnimationFrame(raf); }
      });
      io.observe(el);

      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mouseleave', onLeave);
    });
  }

  /* ──────────────────────────────────────
     FLASH TRANSITION HELPER
  ────────────────────────────────────── */
  function flash(color = '#FFF', dur = 0.12) {
    if (RM) return;
    const div = document.createElement('div');
    div.style.cssText = `position:fixed;inset:0;background:${color};
      z-index:9100;pointer-events:none;opacity:0;`;
    document.body.appendChild(div);
    gsap.to(div, {
      opacity: 1, duration: dur, yoyo: true, repeat: 1, ease: 'none',
      onComplete: () => div.remove(),
    });
  }

  /* ──────────────────────────────────────
     SCENE 1 — HERO
  ────────────────────────────────────── */
  function initHero() {
    const title   = document.getElementById('hero-title');
    const line    = document.getElementById('hero-line');
    const cta     = document.getElementById('hero-cta');
    const ind     = document.getElementById('scroll-ind');

    if (!title) return;

    /* Entrance */
    const tl = gsap.timeline({ delay: 0.1 });
    tl.to(title,  { opacity: 1, y: 0, duration: 1.4, ease: 'power3.out' }, 0)
      .to(line,   { opacity: 1, y: 0, duration: 1.0, ease: 'power2.out' }, 0.6)
      .to(cta,    { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' }, 0.9);

    gsap.set([title, line, cta], { y: 30 });

    setTimeout(() => {
      gsap.to(ind, { opacity: 1, duration: 1 });
    }, 3000);

    /* Parallax on scroll — text drifts up and fades */
    gsap.to('#hero-content', {
      y: -120, opacity: 0,
      scrollTrigger: {
        trigger: '#s-hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 1.2,
      }
    });

    /* Atmosphere intensifies on scroll */
    gsap.to('#hero-atm', {
      scale: 1.25, opacity: 1.3,
      scrollTrigger: {
        trigger: '#s-hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      }
    });
  }

  /* ──────────────────────────────────────
     SCENE 2 — PROBLEM
  ────────────────────────────────────── */
  function initProblem() {
    const lines   = document.querySelectorAll('.pl');
    const pivot   = document.getElementById('problem-pivot');
    const footer  = document.querySelector('.s-footer-label');
    const beam    = document.getElementById('fridge-beam');

    /* Fridge beam parallax */
    gsap.to(beam, {
      y: -40,
      scrollTrigger: {
        trigger: '#s-problem', start: 'top bottom', end: 'bottom top',
        scrub: true,
      }
    });

    /* Lines materialize */
    lines.forEach(line => {
      ScrollTrigger.create({
        trigger: line, start: 'top 80%', once: true,
        onEnter: () => {
          gsap.to(line, {
            opacity: 1, y: 0, duration: 1.0,
            ease: 'power3.out',
          });
        }
      });
    });

    /* Pivot — gold flash then text */
    ScrollTrigger.create({
      trigger: pivot, start: 'top 78%', once: true,
      onEnter: () => {
        flash('rgba(200,169,110,0.06)', 0.3);
        gsap.to(pivot, { opacity: 1, duration: 1.2, delay: 0.15, ease: 'power2.out' });
      }
    });

    /* Footer label */
    ScrollTrigger.create({
      trigger: '#s-problem', start: 'bottom 90%', once: true,
      onEnter: () => gsap.to(footer, { opacity: 1, duration: 1 })
    });
  }

  /* ──────────────────────────────────────
     SCENE 3 — REVEAL
  ────────────────────────────────────── */
  function initReveal() {
    const copy   = document.getElementById('reveal-copy');
    const appA   = document.getElementById('app-a');
    const stage  = document.getElementById('app-stage-a');

    /* White flash on section enter */
    ScrollTrigger.create({
      trigger: '#s-reveal', start: 'top 70%', once: true,
      onEnter: () => {
        flash('rgba(240,235,227,0.12)', 0.2);

        gsap.fromTo(copy,
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', delay: 0.1 }
        );

        /* App rises from below */
        gsap.fromTo(appA,
          { opacity: 0, y: 80, rotateX: 6 },
          { opacity: 1, y: 0, rotateX: 2, duration: 1.6, ease: 'power3.out', delay: 0.4 }
        );
      }
    });

    /* App parallax on scroll */
    gsap.to(stage, {
      y: -60,
      scrollTrigger: {
        trigger: '#s-reveal', start: 'top top', end: 'bottom top',
        scrub: 1,
      }
    });
  }

  /* ──────────────────────────────────────
     SCENE 4 — PLANNER FEATURE
  ────────────────────────────────────── */
  function initPlanner() {
    const appB  = document.getElementById('app-b');
    const copy  = document.getElementById('split-copy-planner');

    ScrollTrigger.create({
      trigger: '#s-planner', start: 'top 65%', once: true,
      onEnter: () => {
        gsap.fromTo(appB,
          { opacity: 0, x: -60 },
          { opacity: 1, x: 0, duration: 1.2, ease: 'power3.out' }
        );
        animateCopy(copy);

        /* Fill planner grid after a delay */
        setTimeout(fillPlannerGrid, 900);
      }
    });

    animateProofList('#proof-a');
  }

  /* Dinner/Lunch grid data */
  const PLANNER_DINNER = [
    { e:'🍛', n:'Tikka Masala', t:'35m' },
    { e:'🍝', n:'Pasta Arrabiata', t:'25m' },
    { e:'🍜', n:'Miso Ramen', t:'50m' },
    { e:'🫕', n:'Dahl & Rice', t:'20m' },
  ];
  const PLANNER_LUNCH = [
    { e:'🥗', n:'Quinoa Bowl', t:'10m' },
    { e:'🥙', n:'Chicken Wrap', t:'10m' },
    { e:'🥪', n:'Avo Toast', t:'10m' },
    { e:'🍱', n:'Bento Box', t:'15m' },
  ];

  function fillPlannerGrid() {
    const dRow = document.getElementById('planner-b-dinner');
    const lRow = document.getElementById('planner-b-lunch');
    if (!dRow || !lRow) return;

    /* Start empty */
    const dCells = buildEmptyCells(4, 'mc--dinner');
    const lCells = buildEmptyCells(4, 'mc--lunch');
    dRow.innerHTML = ''; lRow.innerHTML = '';
    dCells.forEach(c => dRow.appendChild(c));
    lCells.forEach(c => lRow.appendChild(c));

    /* Fill with delay per cell */
    PLANNER_DINNER.forEach((meal, i) => {
      setTimeout(() => fillCell(dCells[i], meal), i * 160);
    });
    PLANNER_LUNCH.forEach((meal, i) => {
      setTimeout(() => fillCell(lCells[i], meal), i * 160 + 640);
    });
  }

  function buildEmptyCells(n, cls) {
    return Array.from({ length: n }, () => {
      const d = document.createElement('div');
      d.className = `meal-card mc--add ${cls}`;
      d.textContent = '+ Add';
      return d;
    });
  }

  function fillCell(cell, meal) {
    gsap.to(cell, {
      scale: 0.92, duration: 0.08, ease: 'none', yoyo: true, repeat: 1,
      onComplete: () => {
        cell.className = `meal-card ${meal.cls || 'mc--dinner'}`;
        cell.innerHTML = `
          <div class="mc-top"><span class="mc-time">${meal.t}</span></div>
          <div class="mc-emoji">${meal.e}</div>
          <div class="mc-name">${meal.n}</div>`;
        gsap.from(cell, { opacity: 0, scale: 0.95, duration: 0.4, ease: 'power2.out' });
      }
    });
  }

  /* ──────────────────────────────────────
     SCENE 5 — SHOPPING
  ────────────────────────────────────── */
  function initShopping() {
    const appC   = document.getElementById('app-c');
    const copy   = document.getElementById('shop-copy');

    ScrollTrigger.create({
      trigger: '#s-shopping', start: 'top 65%', once: true,
      onEnter: () => {
        /* App drops in from above */
        gsap.fromTo(appC,
          { opacity: 0, y: -50 },
          {
            opacity: 1, y: 0, duration: 1.2, ease: 'power3.out',
            onComplete: () => {
              if (!RM) {
                gsap.to(appC, { y: 3, duration: 0.05, yoyo: true, repeat: 4, ease: 'none' });
              }
            }
          }
        );
        animateCopy(copy, 0.3);
      }
    });

    animateProofList('#proof-b');
  }

  /* ──────────────────────────────────────
     SCENE 6 — HOUSEHOLD
  ────────────────────────────────────── */
  function initHousehold() {
    const appD = document.getElementById('app-d');
    const appE = document.getElementById('app-e');
    const copy = document.getElementById('household-copy');

    ScrollTrigger.create({
      trigger: '#s-household', start: 'top 65%', once: true,
      onEnter: () => {
        gsap.fromTo(appD, { opacity: 0, x: -70 }, { opacity: 1, x: 0, duration: 1.1, ease: 'power3.out' });
        gsap.fromTo(appE, { opacity: 0, x:  70 }, { opacity: 1, x: 0, duration: 1.1, ease: 'power3.out', delay: 0.12 });
        animateCopy(copy, 0.2);
      }
    });

    animateProofList('#proof-c');
  }

  /* ──────────────────────────────────────
     SCENE 7 — AI
  ────────────────────────────────────── */
  function initAI() {
    const appF = document.getElementById('app-f');
    const copy = document.getElementById('ai-copy');

    ScrollTrigger.create({
      trigger: '#s-ai', start: 'top 65%', once: true,
      onEnter: () => {
        gsap.fromTo(appF,
          { opacity: 0, x: -50, y: 30 },
          { opacity: 1, x: 0, y: 0, duration: 1.3, ease: 'power3.out' }
        );
        animateCopy(copy, 0.35);
      }
    });

    animateProofList('#proof-d');
  }

  /* ──────────────────────────────────────
     SCENE 8 — SOCIAL PROOF
  ────────────────────────────────────── */
  function initProof() {
    const cards = document.querySelectorAll('.qcard');
    const trust = document.getElementById('trust-bar');

    /* Apply initial rotation */
    cards.forEach(c => {
      gsap.set(c, { rotate: parseFloat(c.dataset.r) || 0 });
    });

    ScrollTrigger.create({
      trigger: '#s-proof', start: 'top 65%', once: true,
      onEnter: () => {
        cards.forEach((c, i) => {
          const rot = parseFloat(c.dataset.r) || 0;
          gsap.fromTo(c,
            { opacity: 0, y: 50, rotate: rot + (i % 2 === 0 ? -10 : 10) },
            { opacity: 1, y: 0, rotate: rot, duration: 1.0, delay: i * 0.13, ease: 'power3.out' }
          );
        });
        gsap.to(trust, { opacity: 1, duration: 0.8, delay: 0.5 });
      }
    });
  }

  /* ──────────────────────────────────────
     SCENE 9 — CLOSE
  ────────────────────────────────────── */
  function initClose() {
    const title = document.getElementById('close-title');
    const sub   = document.getElementById('close-sub');
    const cta   = document.getElementById('close-cta');
    const fine  = document.getElementById('close-fine');
    const atm   = document.getElementById('close-atm');

    /* Slow parallax dolly on scroll */
    if (!RM) {
      gsap.to('#close-content', {
        y: -50, scale: 1.02,
        scrollTrigger: {
          trigger: '#s-close', start: 'top bottom', end: 'bottom bottom',
          scrub: 2,
        }
      });
    }

    ScrollTrigger.create({
      trigger: '#s-close', start: 'top 65%', once: true,
      onEnter: () => {
        gsap.to(title, { opacity: 1, y: 0, duration: 1.6, ease: 'power3.out' });
        gsap.set(title, { y: 40 });
        gsap.to(sub,   { opacity: 1, duration: 1.1, delay: 0.7,  ease: 'power2.out' });
        if (cta)  gsap.to(cta,  { opacity: 1, duration: 0.9, delay: 1.2, ease: 'power2.out' });
        gsap.to(fine,  { opacity: 1, duration: 0.8, delay: 1.6,  ease: 'power2.out' });
      }
    });
  }

  /* ──────────────────────────────────────
     SHARED: animate copy block
  ────────────────────────────────────── */
  function animateCopy(el, delay = 0) {
    if (!el) return;
    const title = el.querySelector('.feat-title, .reveal-title, .close-title');
    const sub   = el.querySelector('.feat-sub, .reveal-sub, .close-sub');
    if (title) gsap.to(title, { opacity: 1, duration: 1.0, delay, ease: 'power2.out' });
    if (sub)   gsap.to(sub,   { opacity: 0.7, duration: 0.9, delay: delay + 0.2, ease: 'power2.out' });
  }

  /* ──────────────────────────────────────
     SHARED: animate proof list
  ────────────────────────────────────── */
  function animateProofList(selector) {
    const items = document.querySelectorAll(`${selector} li`);
    items.forEach((li, i) => {
      ScrollTrigger.create({
        trigger: li, start: 'top 85%', once: true,
        onEnter: () => {
          gsap.to(li, {
            opacity: 1, x: 0,
            duration: 0.7, delay: i * 0.1,
            ease: 'power2.out',
          });
        }
      });
    });
  }

  /* ──────────────────────────────────────
     CTA smooth scroll
  ────────────────────────────────────── */
  function initCTAScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const target = document.querySelector(a.getAttribute('href'));
        if (target && lenis) {
          e.preventDefault();
          lenis.scrollTo(target, { duration: 2.0 });
        }
      });
    });
  }

  /* ──────────────────────────────────────
     PARALLAX BACKGROUNDS
  ────────────────────────────────────── */
  function initParallax() {
    if (RM) return;

    /* Fridge beam slow drift */
    gsap.to('.fridge-beam', {
      y: -30,
      scrollTrigger: {
        trigger: '#s-problem', start: 'top bottom', end: 'bottom top', scrub: true
      }
    });
  }

  /* ──────────────────────────────────────
     LATE INIT — runs after preloader out
  ────────────────────────────────────── */
  function lateInit() {
    initHero();
    initProblem();
    initReveal();
    initPlanner();
    initShopping();
    initHousehold();
    initAI();
    initProof();
    initClose();
    initParallax();
    initCTAScroll();
    initTilt();
  }

  /* ──────────────────────────────────────
     BOOT
  ────────────────────────────────────── */
  function boot() {
    initMouse();
    initParticles();
    try { initLenis(); } catch (e) { console.warn('Lenis:', e); }
    initPreloader();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
