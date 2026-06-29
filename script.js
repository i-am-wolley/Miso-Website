/* ─────────────────────────────────────────
   MISO — CINEMATIC WEBSITE
   Main script: Lenis + GSAP + Three.js
───────────────────────────────────────── */

(function () {
  'use strict';

  /* ─── Reduced motion check ─── */
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─── Register GSAP plugins ─── */
  gsap.registerPlugin(ScrollTrigger, TextPlugin);

  /* ─── Lenis smooth scroll ─── */
  let lenis;

  function initLenis() {
    lenis = new Lenis({
      duration: 1.4,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.85,
    });

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ─────────────────────────────
     STEAM PARTICLE SYSTEM (Three.js)
  ───────────────────────────────── */
  function initSteam() {
    const canvas = document.getElementById('steam-canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(
      -window.innerWidth / 2, window.innerWidth / 2,
      window.innerHeight / 2, -window.innerHeight / 2,
      0.1, 100
    );
    camera.position.z = 10;

    /* ── Particle geometry ── */
    const COUNT = reducedMotion ? 0 : 120;
    const positions = new Float32Array(COUNT * 3);
    const velocities = [];
    const lifetimes = [];
    const maxLife = [];

    for (let i = 0; i < COUNT; i++) {
      resetParticle(i, positions, velocities, lifetimes, maxLife, true);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      size: 2.5,
      color: 0xE8DDD0,
      transparent: true,
      opacity: 0.18,
      sizeAttenuation: false,
    });

    const particles = new THREE.Points(geo, mat);
    scene.add(particles);

    /* ── State ── */
    let steamIntensity = 0.4; // 0–1, driven by scroll position

    /* ── Scroll drives intensity ── */
    window.addEventListener('scroll', () => {
      const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      steamIntensity = 0.3 + pct * 0.7;
    }, { passive: true });

    /* ── Animate ── */
    function animate() {
      requestAnimationFrame(animate);
      if (reducedMotion) { renderer.render(scene, camera); return; }

      const pos = geo.attributes.position.array;

      for (let i = 0; i < COUNT; i++) {
        const ix = i * 3;
        lifetimes[i] += 0.016 * (0.5 + steamIntensity * 0.5);

        if (lifetimes[i] >= maxLife[i]) {
          resetParticle(i, pos, velocities, lifetimes, maxLife, false);
          continue;
        }

        const progress = lifetimes[i] / maxLife[i];

        pos[ix]     += velocities[i].x + Math.sin(lifetimes[i] * 1.2 + i) * 0.3;
        pos[ix + 1] += velocities[i].y * (0.6 + steamIntensity * 0.4);
        pos[ix + 2]  = 0;

        /* Fade in / out */
        const alpha = progress < 0.2
          ? progress / 0.2
          : progress > 0.7
          ? 1 - (progress - 0.7) / 0.3
          : 1;

        /* We can't per-particle opacity in PointsMaterial,
           so we vary size as a proxy for visibility */
        /* (opacity is uniform — that's fine, particles feel cohesive) */
      }

      mat.opacity = 0.08 + steamIntensity * 0.14;
      geo.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
    }

    animate();

    /* ── Resize ── */
    window.addEventListener('resize', () => {
      camera.left   = -window.innerWidth / 2;
      camera.right  =  window.innerWidth / 2;
      camera.top    =  window.innerHeight / 2;
      camera.bottom = -window.innerHeight / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  function resetParticle(i, pos, velocities, lifetimes, maxLife, initial) {
    const ix = i * 3;
    pos[ix]     = (Math.random() - 0.5) * window.innerWidth;
    pos[ix + 1] = initial
      ? (Math.random() - 0.5) * window.innerHeight
      : -window.innerHeight / 2 - 20;
    pos[ix + 2] = 0;

    velocities[i] = {
      x: (Math.random() - 0.5) * 0.4,
      y: 0.5 + Math.random() * 1.0,
    };
    maxLife[i]   = 4 + Math.random() * 6;
    lifetimes[i] = initial ? Math.random() * maxLife[i] : 0;
  }

  /* ─────────────────────────────
     PRELOADER
  ───────────────────────────────── */
  function initPreloader() {
    const preloader = document.getElementById('preloader');
    if (!preloader) { initScene1(); return; }

    function dismiss() {
      preloader.style.transition = 'opacity 0.6s ease';
      preloader.style.opacity = '0';
      setTimeout(() => {
        preloader.style.display = 'none';
        initScene1();
      }, 650);
    }

    /* GSAP path — preferred */
    gsap.to(preloader, {
      opacity: 0,
      duration: 0.6,
      delay: 1.3,
      ease: 'power2.inOut',
      onComplete: () => {
        preloader.style.display = 'none';
        initScene1();
      }
    });

    /* Hard fallback: if GSAP stalls for any reason, CSS transition takes over */
    setTimeout(dismiss, 2200);
  }

  /* ─────────────────────────────
     SCENE 1 — THE HOOK
  ───────────────────────────────── */
  function initScene1() {
    const question   = document.getElementById('hero-question');
    const sub        = document.getElementById('hero-sub');
    const cta        = document.getElementById('hero-cta');
    const nudge      = document.getElementById('scroll-nudge');
    const scene1     = document.getElementById('scene-1');

    if (!question) return;

    /* Character-by-character reveal */
    const text = question.textContent;
    question.textContent = '';
    question.style.opacity = '1';

    const chars = text.split('').map(char => {
      const span = document.createElement('span');
      span.textContent = char === ' ' ? ' ' : char;
      span.style.opacity = '0';
      span.style.display = 'inline-block';
      question.appendChild(span);
      return span;
    });

    /* Stagger each character */
    gsap.to(chars, {
      opacity: 1,
      duration: 0.05,
      stagger: 0.06,
      ease: 'none',
      delay: 0.2,
    });

    /* Question mark bounce */
    const lastChar = chars[chars.length - 1];
    gsap.from(lastChar, {
      y: -12,
      duration: 0.5,
      ease: 'bounce.out',
      delay: 0.2 + chars.length * 0.06 + 0.1,
    });

    /* Sub headline */
    gsap.to(sub, {
      opacity: 1,
      duration: 0.8,
      delay: 0.2 + chars.length * 0.06 + 0.5,
      ease: 'power2.out',
    });

    /* CTA */
    gsap.to(cta, {
      opacity: 1,
      duration: 0.8,
      delay: 0.2 + chars.length * 0.06 + 1.0,
      ease: 'power2.out',
    });

    /* Slow dolly-in: camera drifts toward text */
    if (!reducedMotion) {
      gsap.to(scene1, {
        '--scale': 1.04,
        duration: 8,
        ease: 'none',
        repeat: -1,
        yoyo: true,
      });

      gsap.to(question, {
        scale: 1.04,
        duration: 8,
        ease: 'linear',
        repeat: -1,
        yoyo: true,
      });
    }

    /* Nudge arrow after 6s */
    gsap.to(nudge, {
      opacity: 0.4,
      duration: 0.6,
      delay: 6,
    });

    /* Scene 1 exit: flash to black */
    ScrollTrigger.create({
      trigger: '#scene-2',
      start: 'top 80%',
      once: true,
      onEnter: () => {
        const flash = document.createElement('div');
        flash.style.cssText = `
          position: fixed; inset: 0; background: #0D0D0D;
          z-index: 100; pointer-events: none; opacity: 0;
        `;
        document.body.appendChild(flash);
        gsap.to(flash, {
          opacity: 1, duration: 0.08, yoyo: true, repeat: 2, ease: 'none',
          onComplete: () => flash.remove()
        });
      }
    });
  }

  /* ─────────────────────────────
     SCENE 2 — THE PROBLEM
  ───────────────────────────────── */
  function initScene2() {
    const lines      = document.querySelectorAll('.problem-line');
    const conclusion = document.querySelectorAll('.conclusion-line');
    const footer     = document.querySelector('.scene-footer-label');
    const env        = document.getElementById('kitchen-env');

    /* Problem lines stagger in on scroll */
    lines.forEach(line => {
      ScrollTrigger.create({
        trigger: line,
        start: 'top 78%',
        once: true,
        onEnter: () => {
          gsap.to(line, {
            opacity: 1,
            y: 0,
            duration: 0.9,
            delay: parseFloat(line.dataset.delay) * 0.4,
            ease: 'power3.out',
          });
        }
      });
    });

    /* Conclusion */
    ScrollTrigger.create({
      trigger: '.problem-conclusion',
      start: 'top 75%',
      once: true,
      onEnter: () => {
        /* Flash of gold before conclusion */
        const flash = document.createElement('div');
        flash.style.cssText = `
          position: fixed; inset: 0;
          background: linear-gradient(135deg, rgba(200,169,110,0.08), transparent);
          z-index: 10; pointer-events: none; opacity: 0;
        `;
        document.body.appendChild(flash);

        gsap.to(flash, {
          opacity: 1, duration: 0.2, yoyo: true, repeat: 1, ease: 'none',
          onComplete: () => flash.remove()
        });

        gsap.to(conclusion, {
          opacity: 1,
          duration: 0.8,
          stagger: 0.25,
          ease: 'power2.out',
        });
      }
    });

    /* Footer label */
    ScrollTrigger.create({
      trigger: '#scene-2',
      start: 'bottom 85%',
      once: true,
      onEnter: () => {
        gsap.to(footer, { opacity: 0.7, duration: 0.8, ease: 'power2.out' });
      }
    });

    /* Mouse parallax on kitchen environment */
    if (!reducedMotion && env) {
      document.addEventListener('mousemove', e => {
        const x = (e.clientX / window.innerWidth  - 0.5) * 6;
        const y = (e.clientY / window.innerHeight - 0.5) * 4;
        gsap.to(env, {
          rotateY: x,
          rotateX: -y,
          duration: 1.2,
          ease: 'power2.out',
          transformPerspective: 1000,
        });
      });
    }
  }

  /* ─────────────────────────────
     SCENE 3 — THE REVEAL
  ───────────────────────────────── */
  function initScene3() {
    const title  = document.querySelector('.reveal-title');
    const sub    = document.querySelector('.reveal-sub');
    const screen = document.getElementById('screenshot-a');

    ScrollTrigger.create({
      trigger: '#scene-3',
      start: 'top 60%',
      once: true,
      onEnter: () => {
        gsap.to(title, { opacity: 1, duration: 1.2, ease: 'power3.out' });
        gsap.to(sub,   { opacity: 0.8, duration: 1.0, delay: 0.4, ease: 'power2.out' });

        /* Screenshot rises from below */
        gsap.fromTo(screen,
          { opacity: 0, y: 80, rotateX: 8 },
          { opacity: 1, y: 0, rotateX: 2, duration: 1.4, delay: 0.7, ease: 'power3.out' }
        );
      }
    });
  }

  /* ─────────────────────────────
     SCENE 4 — THE PLANNER
  ───────────────────────────────── */
  function initScene4() {
    const title  = document.querySelector('#scene-4 .cluster-title');
    const sub    = document.querySelector('#scene-4 .cluster-sub');
    const screen = document.getElementById('screenshot-b');
    const grid   = document.getElementById('planner-grid');

    /* Build planner grid */
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const empty = ['', 'Pasta', '', 'Soup', '', ''];
    const full  = [
      ['Tikka Masala', 'Quinoa Bowl'],
      ['Pasta Arrabiata', 'Salad'],
      ['Miso Ramen', 'Stir Fry'],
      ['Dahl &amp; Rice', 'Soup'],
      ['Soba Noodles', 'Veg Curry'],
      ['✦ Suggest', 'Roast'],
      ['Shakshuka', 'Bread &amp; Soup'],
    ];

    if (grid) {
      days.forEach((day, i) => {
        const col = document.createElement('div');
        col.className = 'ui-day';
        col.innerHTML = `<div class="ui-day-label">${day}</div>
          <div class="ui-meal ui-meal--empty" id="pm-${i}-0">+ Add</div>
          <div class="ui-meal ui-meal--empty" id="pm-${i}-1">+ Add</div>`;
        grid.appendChild(col);
      });
    }

    ScrollTrigger.create({
      trigger: '#scene-4',
      start: 'top 60%',
      once: true,
      onEnter: () => {
        gsap.to(screen, { opacity: 1, duration: 1.0, ease: 'power2.out' });
        gsap.to(title,  { opacity: 1, duration: 0.9, delay: 0.2, ease: 'power2.out' });
        gsap.to(sub,    { opacity: 0.7, duration: 0.9, delay: 0.4, ease: 'power2.out' });

        /* Animate planner from empty → full */
        setTimeout(() => {
          days.forEach((_, i) => {
            full[i].forEach((meal, j) => {
              const cell = document.getElementById(`pm-${i}-${j}`);
              if (!cell) return;
              setTimeout(() => {
                cell.innerHTML = meal;
                cell.className = 'ui-meal ' + (meal.startsWith('✦') ? 'ui-meal--ai' : 'ui-meal--filled');
              }, i * 120 + j * 60);
            });
          });
        }, 800);
      }
    });

    /* Proof points */
    initProofPoints('#proof-a');
  }

  /* ─────────────────────────────
     SCENE 5 — SHOPPING LIST
  ───────────────────────────────── */
  function initScene5() {
    const screen = document.getElementById('screenshot-c');
    const title  = document.querySelector('#scene-5 .cluster-title');
    const sub5   = document.querySelector('#scene-5 .cluster-sub');

    ScrollTrigger.create({
      trigger: '#scene-5',
      start: 'top 60%',
      once: true,
      onEnter: () => {
        /* Screenshot drops from above */
        gsap.fromTo(screen,
          { opacity: 0, y: -60 },
          { opacity: 1, y: 0, duration: 1.0, ease: 'power3.out',
            onComplete: () => {
              /* Thud: tiny camera shake */
              if (!reducedMotion) {
                gsap.to(screen, { y: 4, duration: 0.04, yoyo: true, repeat: 3, ease: 'none' });
              }
            }
          }
        );
        gsap.to(title, { opacity: 1, duration: 0.9, delay: 0.5, ease: 'power2.out' });
      }
    });

    initProofPoints('#proof-b');
  }

  /* ─────────────────────────────
     SCENE 6 — HOUSEHOLD
  ───────────────────────────────── */
  function initScene6() {
    const left  = document.getElementById('screenshot-d');
    const right = document.getElementById('screenshot-e');
    const title = document.querySelector('#scene-6 .cluster-title');
    const sub   = document.querySelector('#scene-6 .cluster-sub');

    ScrollTrigger.create({
      trigger: '#scene-6',
      start: 'top 65%',
      once: true,
      onEnter: () => {
        gsap.fromTo(left,
          { opacity: 0, x: -60 },
          { opacity: 1, x: 0, duration: 1.0, ease: 'power3.out' }
        );
        gsap.fromTo(right,
          { opacity: 0, x: 60 },
          { opacity: 1, x: 0, duration: 1.0, delay: 0.15, ease: 'power3.out' }
        );
        gsap.to(title, { opacity: 1, duration: 0.9, delay: 0.3, ease: 'power2.out' });
        gsap.to(sub,   { opacity: 0.7, duration: 0.9, delay: 0.5, ease: 'power2.out' });
      }
    });

    initProofPoints('#proof-c');
  }

  /* ─────────────────────────────
     SCENE 7 — INTELLIGENCE
  ───────────────────────────────── */
  function initScene7() {
    const screen = document.getElementById('screenshot-f');
    const title  = document.querySelector('.intelligence-title');
    const sub    = document.querySelector('#scene-7 .cluster-sub');

    ScrollTrigger.create({
      trigger: '#scene-7',
      start: 'top 65%',
      once: true,
      onEnter: () => {
        gsap.fromTo(screen,
          { opacity: 0, x: -40, y: 30 },
          { opacity: 1, x: 0, y: 0, duration: 1.2, ease: 'power3.out' }
        );
        gsap.to(title, { opacity: 1, duration: 1.0, delay: 0.3, ease: 'power2.out' });
        gsap.to(sub,   { opacity: 0.7, duration: 0.9, delay: 0.5, ease: 'power2.out' });
      }
    });

    initProofPoints('#proof-d');
  }

  /* ─────────────────────────────
     SCENE 8 — SOCIAL PROOF
  ───────────────────────────────── */
  function initScene8() {
    const cards  = document.querySelectorAll('.quote-card');
    const trust  = document.querySelector('.trust-signals');

    cards.forEach(card => {
      const rot = parseFloat(card.dataset.rot) || 0;
      card.style.transform = `rotate(${rot}deg)`;
    });

    ScrollTrigger.create({
      trigger: '#scene-8',
      start: 'top 65%',
      once: true,
      onEnter: () => {
        cards.forEach((card, i) => {
          const rot = parseFloat(card.dataset.rot) || 0;
          gsap.fromTo(card,
            { opacity: 0, y: 40, rotate: rot + (i % 2 === 0 ? -8 : 8) },
            { opacity: 1, y: 0, rotate: rot, duration: 0.9,
              delay: i * 0.15, ease: 'power3.out' }
          );
        });
        gsap.to(trust, { opacity: 0.6, duration: 0.8, delay: 0.6 });
      }
    });
  }

  /* ─────────────────────────────
     SCENE 9 — THE CLOSE
  ───────────────────────────────── */
  function initScene9() {
    const title = document.querySelector('.close-title');
    const sub   = document.querySelector('.close-sub');
    const cta9  = document.querySelector('#scene-9 .cta-primary');
    const fine  = document.querySelector('.close-fine');

    /* Long slow dolly camera move via scroll */
    if (!reducedMotion) {
      gsap.to('#scene-9 .scene-inner', {
        scale: 1.06,
        scrollTrigger: {
          trigger: '#scene-9',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        }
      });
    }

    ScrollTrigger.create({
      trigger: '#scene-9',
      start: 'top 65%',
      once: true,
      onEnter: () => {
        gsap.to(title, { opacity: 1, duration: 1.4, ease: 'power2.out' });
        gsap.to(sub,   { opacity: 1, duration: 1.0, delay: 0.8, ease: 'power2.out' });

        if (cta9) {
          gsap.to(cta9,  { opacity: 1, duration: 0.8, delay: 1.4, ease: 'power2.out' });
        }
        gsap.to(fine,  { opacity: 0.4, duration: 0.8, delay: 1.8, ease: 'power2.out' });
      }
    });
  }

  /* ─────────────────────────────
     SHARED: Proof points
  ───────────────────────────────── */
  function initProofPoints(selector) {
    const points = document.querySelectorAll(`${selector} .proof-point`);
    points.forEach(pt => {
      ScrollTrigger.create({
        trigger: pt,
        start: 'top 82%',
        once: true,
        onEnter: () => {
          const d = parseFloat(pt.dataset.delay) || 0;
          gsap.to(pt, {
            opacity: 1,
            x: 0,
            duration: 0.7,
            delay: d,
            ease: 'power2.out',
          });
        }
      });
    });
  }

  /* ─────────────────────────────
     TILT EFFECT on screenshots
  ───────────────────────────────── */
  function initTilt() {
    if (reducedMotion) return;

    document.querySelectorAll('[data-tilt]').forEach(el => {
      let bounds;
      const MAX = 6; /* degrees */

      el.addEventListener('mouseenter', () => {
        bounds = el.getBoundingClientRect();
      });

      el.addEventListener('mousemove', e => {
        if (!bounds) bounds = el.getBoundingClientRect();
        const x = (e.clientX - bounds.left) / bounds.width  - 0.5;
        const y = (e.clientY - bounds.top)  / bounds.height - 0.5;

        gsap.to(el, {
          rotateY: x * MAX * 2,
          rotateX: -y * MAX,
          duration: 0.4,
          ease: 'power2.out',
          transformPerspective: 1000,
        });
      });

      el.addEventListener('mouseleave', () => {
        gsap.to(el, {
          rotateY: 0,
          rotateX: 0,
          duration: 0.8,
          ease: 'power3.out',
        });
        bounds = null;
      });
    });
  }

  /* ─────────────────────────────
     CTA smooth scroll
  ───────────────────────────────── */
  function initCTAScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', e => {
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target && lenis) {
          e.preventDefault();
          lenis.scrollTo(target, { duration: 1.8 });
        }
      });
    });
  }

  /* ─────────────────────────────
     INIT
  ───────────────────────────────── */
  function init() {
    /* Preloader must always fire — run it before anything that might throw */
    initPreloader();

    /* Optional enhancements — failures here must not block the preloader */
    try { initLenis(); } catch (e) { console.warn('Lenis failed to init:', e); }
    try { initSteam(); } catch (e) { console.warn('Steam particles failed:', e); }

    initScene2();
    initScene3();
    initScene4();
    initScene5();
    initScene6();
    initScene7();
    initScene8();
    initScene9();
    initTilt();
    initCTAScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
