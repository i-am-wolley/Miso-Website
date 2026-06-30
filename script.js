/* Miso landing — scroll animations
   Requires GSAP 3 + ScrollTrigger (loaded in index.html) */

document.addEventListener('DOMContentLoaded', () => {
  gsap.registerPlugin(ScrollTrigger);

  const isMobile = window.innerWidth <= 768;

  // ─── SCENE 1: counter + text reveal ────────────────────────────────────
  (function initScene1() {
    const counter   = document.getElementById('js-counter');
    const lines     = document.querySelector('.hero-lines');
    const line1     = document.getElementById('js-hero-line1');
    const line2     = document.getElementById('js-hero-line2');
    const scrollCue = document.getElementById('js-scroll-cue');

    if (!counter) return;

    // Set initial states
    gsap.set([line1, line2], { opacity: 0, y: 20 });
    gsap.set(scrollCue, { opacity: 0 });

    const tl = gsap.timeline({ delay: 0.4 });

    // Count 0 → 156
    tl.to({ n: 0 }, {
      n: 156,
      duration: 1.6,
      ease: 'power2.inOut',
      onUpdate() { counter.textContent = Math.round(this.targets()[0].n); },
    });

    // Fade counter out, reveal lines
    tl.to(counter.parentElement, { opacity: 0, duration: 0.35, ease: 'power1.in' }, '+=0.25')
      .set(lines, { opacity: 1 })
      .to(line1, { opacity: 1, y: 0, duration: 0.65, ease: 'power2.out' })
      .to(line2, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' }, '-=0.25')
      .to(scrollCue, { opacity: 1, duration: 0.6 }, '-=0.1');
  })();


  // ─── SCENE 2: chip convergence (desktop only) ──────────────────────────
  (function initScene2() {
    const scene   = document.getElementById('scene-2');
    const card    = document.getElementById('js-reveal-card');
    const rtext1  = document.getElementById('js-rtext1');
    const rtext2  = document.getElementById('js-rtext2');
    const chips   = document.querySelectorAll('.ing-chip');

    if (!scene || !card || isMobile) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Initial chip positions: centered via xPercent/yPercent, scattered via x/y
    const scatter = [
      { x: -0.30 * vw, y: -0.22 * vh, rotation: -14 },
      { x:  0.27 * vw, y: -0.24 * vh, rotation:   9 },
      { x: -0.32 * vw, y:  0.14 * vh, rotation:  16 },
      { x:  0.26 * vw, y:  0.22 * vh, rotation:  -6 },
      { x: -0.04 * vw, y:  0.30 * vh, rotation:  11 },
    ];

    chips.forEach((chip, i) => {
      gsap.set(chip, {
        xPercent: -50,
        yPercent: -50,
        ...scatter[i],
        opacity: 0.18,
      });
    });

    // Card and texts start hidden
    gsap.set(card,   { xPercent: -50, yPercent: -50, opacity: 0, scale: 0.88 });
    gsap.set(rtext1, { opacity: 0, y: 16 });
    gsap.set(rtext2, { opacity: 0, y: 16 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: scene,
        pin: true,
        scrub: 1.8,
        start: 'top top',
        end: '+=380%',
        anticipatePin: 1,
      },
    });

    // 0 → 0.45 : chips converge
    chips.forEach((chip) => {
      tl.to(chip, {
        x: 0, y: 0, rotation: 0, opacity: 1,
        ease: 'power1.inOut', duration: 0.45,
      }, 0);
    });

    // 0.28 : text 1 in
    tl.to(rtext1, { opacity: 1, y: 0, duration: 0.18 }, 0.28);

    // 0.42 : card materialises
    tl.to(card, { opacity: 1, scale: 1, duration: 0.22, ease: 'power2.out' }, 0.42);

    // 0.50 : chips dissolve into card
    chips.forEach((chip) => {
      tl.to(chip, { opacity: 0, scale: 0.75, duration: 0.18 }, 0.50);
    });

    // 0.54 : text 1 out, text 2 in
    tl.to(rtext1, { opacity: 0, duration: 0.12 }, 0.54);
    tl.to(rtext2, { opacity: 1, y: 0, duration: 0.18 }, 0.56);

    // 0 → 1 : background warms to cream
    tl.to(scene, {
      backgroundColor: '#F2ECE0',
      duration: 1,
      ease: 'power1.inOut',
    }, 0);
  })();


  // ─── SCENE 3: pitch clause reveals (Intersection Observer) ────────────
  (function initScene3() {
    const groups = document.querySelectorAll('.pitch-group');
    if (!groups.length) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.25 });

    groups.forEach((g, i) => {
      g.style.transitionDelay = `${i * 0.14}s`;
      obs.observe(g);
    });
  })();


  // ─── SCENE 4: horizontal scroll (desktop only) ────────────────────────
  (function initScene4() {
    const scene    = document.getElementById('scene-4');
    const panels   = document.getElementById('js-how-panels');
    const fill     = document.getElementById('js-track-fill');
    const labels   = document.querySelectorAll('[data-panel-btn]');

    if (!scene || !panels) return;

    if (isMobile) {
      // On mobile: reveal each panel as it scrolls in
      document.querySelectorAll('.how-panel').forEach((panel, i) => {
        gsap.set(panel, { opacity: 0, y: 30 });
        ScrollTrigger.create({
          trigger: panel,
          start: 'top 85%',
          onEnter: () => gsap.to(panel, { opacity: 1, y: 0, duration: 0.6, delay: i * 0.1 }),
          once: true,
        });
      });
      // Mark all labels active on mobile (decorative only)
      labels.forEach(l => l.classList.add('is-active'));
      return;
    }

    // Desktop horizontal scroll
    const panelWidth  = window.innerWidth;
    const totalTravel = panelWidth * 2; // 3 panels − 1 viewport = 2 × vw

    function updateTrack(progress) {
      if (fill) fill.style.width = `${progress * 100}%`;
      const idx = Math.min(2, Math.round(progress * 2));
      labels.forEach((l, i) => l.classList.toggle('is-active', i === idx));
    }

    gsap.to(panels, {
      x: -totalTravel,
      ease: 'none',
      scrollTrigger: {
        trigger: scene,
        pin: true,
        scrub: 1,
        start: 'top top',
        end: `+=${totalTravel}`,
        anticipatePin: 1,
        onUpdate: self => updateTrack(self.progress),
      },
    });

    // Click labels to jump scroll position
    labels.forEach((label, i) => {
      label.addEventListener('click', () => {
        const st = ScrollTrigger.getById('how-pin') || ScrollTrigger.getAll().find(s => s.trigger === scene);
        if (!st) return;
        const target = st.start + (i / 2) * (st.end - st.start);
        window.scrollTo({ top: target, behavior: 'smooth' });
      });
    });
  })();


  // ─── SCENE 5: accordion ────────────────────────────────────────────────
  (function initScene5() {
    const triggers = document.querySelectorAll('.accordion-trigger');

    triggers.forEach(trigger => {
      trigger.addEventListener('click', () => {
        const card   = trigger.closest('.accordion-card');
        const isOpen = card.classList.contains('is-open');

        // Close all
        document.querySelectorAll('.accordion-card').forEach(c => {
          c.classList.remove('is-open');
          c.querySelector('.accordion-trigger').setAttribute('aria-expanded', 'false');
        });

        // Toggle clicked
        if (!isOpen) {
          card.classList.add('is-open');
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
    });
  })();


  // ─── GENERIC INTERSECTION OBSERVER for [data-reveal] and named targets ──
  (function initRevealObserver() {
    const targets = document.querySelectorAll([
      '[data-reveal]',
      '.section-eyebrow',
      '.accordion-card',
      '.nerd-image-wrap',
      '.nerd-rules',
      '.ai-headline',
      '.ai-row',
      '.ai-close',
      '.household-headline',
      '.household-screens',
      '.household-copy',
    ].join(','));

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });

    targets.forEach(el => obs.observe(el));
  })();


  // ─── Mobile Scene 2 fallback: simple reveal ────────────────────────────
  (function initScene2Mobile() {
    if (!isMobile) return;
    const card  = document.getElementById('js-reveal-card');
    const scene = document.getElementById('scene-2');
    if (!card || !scene) return;

    // Position card and texts using CSS defaults (xPercent via GSAP set)
    gsap.set(card,         { xPercent: -50, yPercent: -50, opacity: 0, scale: 0.92 });
    gsap.set('#js-rtext1', { opacity: 0, y: 12, xPercent: 0 });
    gsap.set('#js-rtext2', { opacity: 0, y: 12, xPercent: 0 });

    ScrollTrigger.create({
      trigger: scene,
      start: 'top 60%',
      onEnter: () => {
        gsap.to(card,           { opacity: 1, scale: 1, duration: 0.65, ease: 'power2.out' });
        gsap.to('#js-rtext1',   { opacity: 1, y: 0, duration: 0.55, delay: 0.2 });
        gsap.to('#js-rtext2',   { opacity: 1, y: 0, duration: 0.55, delay: 0.45 });
        gsap.to(scene,          { backgroundColor: '#F2ECE0', duration: 1.2, delay: 0.3 });
      },
      once: true,
    });
  })();


  // ─── Refresh ScrollTrigger on resize ───────────────────────────────────
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 250);
  });
});
