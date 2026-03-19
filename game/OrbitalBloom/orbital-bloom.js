/**
 * Orbital Bloom — Gravity Sandbox
 * A single-sun N-body gravity playground built on Canvas 2D.
 *
 * Architecture
 * ────────────
 *  CONFIG   → read-only simulation & visual constants
 *  State    → mutable runtime state (planets, particles, etc.)
 *  Physics  → gravAccel · stepVerlet · resolveCollisions · updateTrails
 *  Renderer → drawBackground · drawGravField · drawSun · drawPlanets · …
 *  Input    → pointer (mouse + touch) and keyboard handlers
 *  App      → init · loop · overlay helpers · bootstrap
 */

'use strict';

(function () {

  // ─────────────────────────────────────────────────────
  //  CONFIG
  // ─────────────────────────────────────────────────────

  /** @readonly */
  const CONFIG = Object.freeze({
    // Physics
    G:                5000,
    SUN_GM:           12000,
    SUN_R:            38,
    VERLET_SUBSTEPS:  8,
    DT_CAP:           0.033,   // seconds — prevents spiral-death on tab-switch
    SOFTENING_FACTOR: 0.5,     // eps = SUN_R * factor (anti-singularity only)
    RESTITUTION:      0.6,     // planet-planet collision energy retention
    TRAIL_LENGTH:     50,      // trail history points per planet
    OFFSCREEN_PAD:    300,     // px beyond viewport before a planet is culled

    // Spawning
    MIN_PLANET_R:     8,
    MAX_PLANET_R:     40,
    HOLD_MAX_S:       2.0,     // seconds to reach MAX_PLANET_R
    MIN_ORBIT_FACTOR: 3.5,     // min spawn dist = SUN_R * factor
    SPEED_NUDGE:      0.04,    // ±2% from circular orbit for slight ellipticity

    // Visual
    STAR_COUNT:       180,
    GRAV_FIELD_STEP:  72,
    AMBIENT_RATE:     0.8,     // ambients spawned per second (prob * dt)
    AMBIENT_SPEED:    55,
    HINT_HIDE_MS:     5500,

    // Sun colours
    SUN_INNER:        '#fff7d0',
    SUN_MID:          '#ffb347',
    SUN_OUTER:        '#e05a00',

    // Planet palette
    PLANET_COLORS: [
      '#4fc3f7', '#81d4fa', '#a5d6a7', '#ffcc80', '#ef9a9a',
      '#ce93d8', '#80cbc4', '#fff59d', '#f48fb1', '#b0bec5',
    ],

    /** Weighted shape pool — circle appears twice to be most common */
    PLANET_SHAPES: ['circle', 'circle', 'rocky', 'ring'],

    ROCKY_VERTICES:   11,
    ROCKY_MIN_SCALE:  0.72,
  });

  // ─────────────────────────────────────────────────────
  //  STATE
  // ─────────────────────────────────────────────────────

  const State = {
    /** @type {'intro'|'play'|'pause'} */
    phase: 'intro',

    /** @type {Planet[]} */
    planets: [],

    /** @type {Particle[]} */
    particles: [],

    /** @type {Ambient[]} */
    ambients: [],

    /** @type {Sun|null} */
    sun: null,

    sessionTime: 0,
    lastTs:      0,

    hold: {
      active: false,
      startMs: 0,
      x: 0,
      y: 0,
    },
  };

  // ─────────────────────────────────────────────────────
  //  CANVAS
  // ─────────────────────────────────────────────────────

  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('c'));
  const ctx    = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));

  // Star field — positions are normalised [0,1] and scaled at draw time
  const STARS = Array.from({ length: CONFIG.STAR_COUNT }, () => ({
    nx: Math.random(),
    ny: Math.random(),
    r:  0.3 + Math.random() * 1.0,
    a:  0.15 + Math.random() * 0.55,
  }));

  // ─────────────────────────────────────────────────────
  //  TYPE FACTORIES
  // ─────────────────────────────────────────────────────

  /**
   * @typedef {{ x:number, y:number, r:number, gm:number,
   *             inner:string, mid:string, outer:string }} Sun
   * @typedef {{ x:number, y:number, vx:number, vy:number,
   *             r:number, mass:number, col:string,
   *             trail:{x:number,y:number}[], alive:boolean,
   *             age:number, flash:number,
   *             shape:'circle'|'rocky'|'ring',
   *             spikes:number[]|null, ringAngle:number,
   *             _ax:number, _ay:number }} Planet
   * @typedef {{ x:number, y:number, vx:number, vy:number,
   *             life:number, col:string, sz:number }} Particle
   * @typedef {{ x:number, y:number, col:string,
   *             r:number, maxR:number, alpha:number }} Ambient
   */

  /** @returns {Sun} */
  function makeSun() {
    return {
      x:     canvas.width  / 2,
      y:     canvas.height / 2,
      r:     CONFIG.SUN_R,
      gm:    CONFIG.SUN_GM,
      inner: CONFIG.SUN_INNER,
      mid:   CONFIG.SUN_MID,
      outer: CONFIG.SUN_OUTER,
    };
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} r
   * @returns {Planet}
   */
  function makePlanet(x, y, r) {
    const sun  = State.sun;
    let dx     = x - sun.x;
    let dy     = y - sun.y;
    let dist   = Math.hypot(dx, dy) || 1;

    // clamp to minimum safe orbital radius
    const minDist = sun.r * CONFIG.MIN_ORBIT_FACTOR;
    if (dist < minDist) {
      const scale = minDist / dist;
      dx *= scale; dy *= scale; dist = minDist;
      x = sun.x + dx; y = sun.y + dy;
    }

    const vc    = Math.sqrt(CONFIG.G * sun.gm / dist);
    const speed = vc * (1 - CONFIG.SPEED_NUDGE / 2 + Math.random() * CONFIG.SPEED_NUDGE);

    // CCW tangent direction
    const vx = (dy / dist) * speed;
    const vy = -(dx / dist) * speed;

    const col       = CONFIG.PLANET_COLORS[Math.floor(Math.random() * CONFIG.PLANET_COLORS.length)];
    const shape     = CONFIG.PLANET_SHAPES[Math.floor(Math.random() * CONFIG.PLANET_SHAPES.length)];
    const spikes    = shape === 'rocky'
      ? Array.from({ length: CONFIG.ROCKY_VERTICES }, () =>
          CONFIG.ROCKY_MIN_SCALE + Math.random() * (1 - CONFIG.ROCKY_MIN_SCALE))
      : null;

    return {
      x, y, vx, vy,
      r, mass: r * r * 0.05, col,
      trail: [], alive: true, age: 0, flash: 1,
      shape, spikes,
      ringAngle: Math.random() * Math.PI,
      _ax: 0, _ay: 0,
    };
  }

  // ─────────────────────────────────────────────────────
  //  PHYSICS
  // ─────────────────────────────────────────────────────

  /**
   * Gravitational acceleration of planet toward the sun.
   * Uses Plummer softening to avoid singularity at exact overlap.
   * @param {Planet} p
   * @returns {{ ax:number, ay:number }}
   */
  function gravAccel(p) {
    const sun = State.sun;
    const dx  = sun.x - p.x;
    const dy  = sun.y - p.y;
    const eps = sun.r * CONFIG.SOFTENING_FACTOR;
    const d2s = dx * dx + dy * dy + eps * eps;
    const d   = Math.sqrt(d2s);
    const f   = CONFIG.G * sun.gm / d2s;
    return { ax: (dx / d) * f, ay: (dy / d) * f };
  }

  /**
   * Advance one planet by substep h using Velocity-Verlet.
   * @param {Planet} p
   * @param {number} h  substep size in seconds
   */
  function stepVerlet(p, h) {
    // half-kick → drift → recompute accel → half-kick
    p.vx += p._ax * h * 0.5;
    p.vy += p._ay * h * 0.5;
    p.x  += p.vx * h;
    p.y  += p.vy * h;

    const { ax, ay } = gravAccel(p);
    p._ax = ax; p._ay = ay;

    p.vx += ax * h * 0.5;
    p.vy += ay * h * 0.5;

    // Hard-surface constraint: push out radially, preserve velocity
    // (velocity tangency around the sun creates natural slingshot assists)
    const sun = State.sun;
    const ddx = p.x - sun.x;
    const ddy = p.y - sun.y;
    const dd  = Math.hypot(ddx, ddy) || 1;
    const min = sun.r + p.r;
    if (dd < min) {
      p.x   = sun.x + (ddx / dd) * min;
      p.y   = sun.y + (ddy / dd) * min;
      p._ax = 0; p._ay = 0;
    }
  }

  /**
   * Elastic collision response between two planets.
   * @param {Planet} a
   * @param {Planet} b
   */
  function resolveCollision(a, b) {
    const dx   = b.x - a.x;
    const dy   = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist >= a.r + b.r) return;

    const nx  = dx / dist, ny = dy / dist;
    const dvn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    if (dvn >= 0) return; // already separating

    const imp = -(1 + CONFIG.RESTITUTION) * dvn / (1 / a.mass + 1 / b.mass);
    a.vx += (imp / a.mass) * nx;  a.vy += (imp / a.mass) * ny;
    b.vx -= (imp / b.mass) * nx;  b.vy -= (imp / b.mass) * ny;

    // positional correction to prevent overlap tunnelling
    const corr = (a.r + b.r - dist) / 2 + 0.5;
    a.x -= nx * corr; a.y -= ny * corr;
    b.x += nx * corr; b.y += ny * corr;
  }

  /**
   * Spawn a burst of particles at (x, y).
   * @param {number} x
   * @param {number} y
   * @param {string} col
   * @param {number} count
   * @param {number} speed
   */
  function spawnBurst(x, y, col, count, speed) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const s     = (0.4 + Math.random()) * speed;
      State.particles.push({
        x, y,
        vx: Math.cos(angle) * s,
        vy: Math.sin(angle) * s,
        life: 1, col,
        sz: 1.5 + Math.random() * 2.5,
      });
    }
  }

  /**
   * Advance the full simulation by dt seconds.
   * @param {number} dt
   */
  function tickPhysics(dt) {
    dt = Math.min(dt, CONFIG.DT_CAP);
    const h = dt / CONFIG.VERLET_SUBSTEPS;

    for (let s = 0; s < CONFIG.VERLET_SUBSTEPS; s++) {
      State.planets.forEach(p => { if (p.alive) stepVerlet(p, h); });
    }

    // Collision pass (once per frame — after all substeps)
    const live = State.planets.filter(p => p.alive);
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i], b = live[j];
        if (Math.hypot(b.x - a.x, b.y - a.y) < a.r + b.r) {
          resolveCollision(a, b);
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          spawnBurst(mx, my, '#ffffff', 12, 4);
          spawnBurst(mx, my, a.col, 5, 2);
        }
      }
    }

    // Trail, flash, age, and off-screen cull
    State.planets.forEach(p => {
      if (!p.alive) return;
      p.age   += dt;
      p.flash  = Math.max(0, p.flash - dt * 2.5);
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > CONFIG.TRAIL_LENGTH) p.trail.shift();
      const pad = CONFIG.OFFSCREEN_PAD;
      if (p.x < -pad || p.x > canvas.width  + pad ||
          p.y < -pad || p.y > canvas.height + pad) {
        p.alive = false;
      }
    });

    // Keep recently-dead planets briefly (for fade-out trails)
    State.planets = State.planets.filter(p => p.alive || p.age < 0.3);
  }

  // ─────────────────────────────────────────────────────
  //  RENDERER
  // ─────────────────────────────────────────────────────

  /** Convert #rrggbb to "r,g,b" string for use inside rgba(). */
  function hexToRgb(hex) {
    if (!hex || hex[0] !== '#') return '200,200,200';
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ].join(',');
  }

  function drawBackground() {
    ctx.fillStyle = '#060a1c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawStars() {
    STARS.forEach(s => {
      ctx.save();
      ctx.globalAlpha = s.a;
      ctx.fillStyle   = '#fff';
      ctx.beginPath();
      ctx.arc(s.nx * canvas.width, s.ny * canvas.height, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawGravField() {
    const sun  = State.sun;
    if (!sun) return;
    const step = CONFIG.GRAV_FIELD_STEP;
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.strokeStyle = '#a7c0ff';
    ctx.lineWidth   = 0.7;
    for (let x = step / 2; x < canvas.width; x += step) {
      for (let y = step / 2; y < canvas.height; y += step) {
        const dx = sun.x - x, dy = sun.y - y;
        const d  = Math.sqrt(dx * dx + dy * dy) || 1;
        // normalise arrow length to 11px regardless of field strength
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (dx / d) * 11, y + (dy / d) * 11);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawSun() {
    const sun = State.sun;
    if (!sun) return;
    const pulse = (Math.sin(Date.now() * 0.0018) + 1) / 2;
    const midRGB = hexToRgb(sun.mid);

    // corona glow
    const cR = sun.r * 4 + pulse * 10;
    const cg = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, cR);
    cg.addColorStop(0,    `rgba(${midRGB},0.30)`);
    cg.addColorStop(0.45, `rgba(${hexToRgb(sun.outer)},0.10)`);
    cg.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, cR, 0, Math.PI * 2);
    ctx.fill();

    // body
    const bg = ctx.createRadialGradient(
      sun.x - sun.r * 0.3, sun.y - sun.r * 0.3, 0,
      sun.x, sun.y, sun.r
    );
    bg.addColorStop(0,    sun.inner);
    bg.addColorStop(0.55, sun.mid);
    bg.addColorStop(1,    sun.outer);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, sun.r, 0, Math.PI * 2);
    ctx.fill();

    // animated pulse ring
    ctx.save();
    ctx.globalAlpha = 0.16 + pulse * 0.14;
    ctx.strokeStyle = sun.mid;
    ctx.lineWidth   = 1.2;
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, sun.r + 4 + pulse * 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Trace the planet's shape path onto ctx (caller applies fillStyle + fill).
   * @param {Planet} p
   */
  function tracePlanetPath(p) {
    ctx.beginPath();
    if (p.shape === 'rocky' && p.spikes) {
      const n = p.spikes.length;
      for (let i = 0; i <= n; i++) {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        const rr    = p.r * p.spikes[i % n];
        const px    = p.x + Math.cos(angle) * rr;
        const py    = p.y + Math.sin(angle) * rr;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else {
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    }
  }

  function drawPlanets() {
    State.planets.forEach(p => {
      if (!p.alive) return;
      const R = hexToRgb(p.col);

      // motion trail
      p.trail.forEach((pt, i) => {
        const f   = i / p.trail.length;
        const rad = Math.max(0, p.r * 0.45 * f);
        ctx.save();
        ctx.globalAlpha = f * 0.28;
        ctx.fillStyle   = `rgba(${R},${f * 0.28})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // outer glow
      const gg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.8);
      gg.addColorStop(0, `rgba(${R},0.38)`);
      gg.addColorStop(1, `rgba(${R},0)`);
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 2.8, 0, Math.PI * 2);
      ctx.fill();

      // body
      const pg = ctx.createRadialGradient(
        p.x - p.r * 0.3, p.y - p.r * 0.3, 0,
        p.x, p.y, p.r
      );
      pg.addColorStop(0,   '#fff');
      pg.addColorStop(0.4, p.col);
      pg.addColorStop(1,   `rgba(${R},0.5)`);
      ctx.fillStyle = pg;
      tracePlanetPath(p);
      ctx.fill();

      // Saturn ring (rendered after body so it overlaps correctly)
      if (p.shape === 'ring') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.ringAngle);
        ctx.scale(1, 0.32);
        ctx.strokeStyle = `rgba(${R},0.55)`;
        ctx.lineWidth   = Math.max(2, p.r * 0.4);
        ctx.beginPath();
        ctx.arc(0, 0, p.r * 1.8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // spawn flash ring (fades out over ~0.4 s)
      if (p.flash > 0) {
        ctx.save();
        ctx.globalAlpha = p.flash * 0.8;
        ctx.strokeStyle = p.col;
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + (1 - p.flash) * 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    });
  }

  /** @param {number} dt */
  function drawParticles(dt) {
    // update
    State.particles.forEach(p => {
      p.x    += p.vx; p.y += p.vy;
      p.vx   *= 0.96; p.vy *= 0.96;
      p.life -= dt * 1.9;
    });
    State.particles = State.particles.filter(p => p.life > 0);

    // draw
    State.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life * 0.85);
      ctx.fillStyle   = p.col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0, p.sz * p.life), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  /** @param {number} dt */
  function drawAmbients(dt) {
    const sun = State.sun;
    if (!sun) return;

    // probabilistically spawn a new ambient flare
    if (Math.random() < dt * CONFIG.AMBIENT_RATE) {
      const angle = Math.random() * Math.PI * 2;
      const d     = sun.r * (1.1 + Math.random() * 0.8);
      State.ambients.push({
        x: sun.x + Math.cos(angle) * d,
        y: sun.y + Math.sin(angle) * d,
        col: sun.mid,
        r: 0, maxR: 25 + Math.random() * 30,
        alpha: 0.45,
      });
    }

    State.ambients = State.ambients.filter(b => b.alpha > 0.003);
    State.ambients.forEach(b => {
      b.r     = Math.min(b.r + dt * CONFIG.AMBIENT_SPEED, b.maxR);
      b.alpha = Math.max(0, b.alpha - dt * 0.9);
      const gg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      gg.addColorStop(0, `rgba(${hexToRgb(b.col)},${b.alpha * 1.3})`);
      gg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawHoldPreview() {
    const hold = State.hold;
    if (!hold.active || State.phase !== 'play') return;

    const frac = Math.min(
      (Date.now() - hold.startMs) / 1000 / CONFIG.HOLD_MAX_S, 1
    );
    const r = CONFIG.MIN_PLANET_R + (CONFIG.MAX_PLANET_R - CONFIG.MIN_PLANET_R) * frac;

    ctx.save();
    ctx.globalAlpha = 0.3 + frac * 0.4;
    ctx.strokeStyle = '#a7c0ff';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(hold.x, hold.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    document.getElementById('size-fill').style.width = `${frac * 100}%`;
    document.getElementById('size-ind').classList.remove('hidden');
  }

  // ─────────────────────────────────────────────────────
  //  OVERLAY HELPERS
  // ─────────────────────────────────────────────────────

  const OVERLAY_IDS = ['ov-intro', 'ov-pause'];

  /** Show one overlay, hide all others. @param {string} id */
  function showOverlay(id) {
    OVERLAY_IDS.forEach(o =>
      document.getElementById(o).classList.toggle('hidden', o !== id)
    );
  }

  function hideAllOverlays() {
    OVERLAY_IDS.forEach(o =>
      document.getElementById(o).classList.add('hidden')
    );
  }

  // ─────────────────────────────────────────────────────
  //  APP
  // ─────────────────────────────────────────────────────

  function initGame() {
    State.planets     = [];
    State.particles   = [];
    State.ambients    = [];
    State.sessionTime = 0;
    State.sun         = makeSun();
  }

  /** Main render + physics loop. */
  function loop(ts) {
    requestAnimationFrame(loop);
    const dt     = Math.min((ts - State.lastTs) / 1000, 0.05);
    State.lastTs = ts;

    drawBackground();
    drawStars();
    drawGravField();
    drawAmbients(dt);
    drawParticles(dt);
    drawSun();
    drawPlanets();
    drawHoldPreview();

    if (State.phase === 'play') {
      tickPhysics(dt);
      State.sessionTime += dt;
    }
  }

  function startGame() {
    initGame();
    State.phase = 'play';
    hideAllOverlays();
    setTimeout(
      () => document.getElementById('hint').classList.add('hidden'),
      CONFIG.HINT_HIDE_MS
    );
  }

  // ─────────────────────────────────────────────────────
  //  INPUT
  // ─────────────────────────────────────────────────────

  /** @param {number} px @param {number} py */
  function onPointerDown(px, py) {
    if (State.phase !== 'play') return;
    State.hold = { active: true, startMs: Date.now(), x: px, y: py };
  }

  /** @param {number} px @param {number} py */
  function onPointerUp(px, py) {
    const hold = State.hold;
    if (!hold.active) return;

    document.getElementById('size-ind').classList.add('hidden');
    hold.active = false;

    if (State.phase !== 'play') return;

    const frac = Math.min((Date.now() - hold.startMs) / 1000 / CONFIG.HOLD_MAX_S, 1);
    const r    = Math.round(
      CONFIG.MIN_PLANET_R + (CONFIG.MAX_PLANET_R - CONFIG.MIN_PLANET_R) * frac
    );
    State.planets.push(makePlanet(hold.x, hold.y, r));
  }

  canvas.addEventListener('mousedown',  e => onPointerDown(e.clientX, e.clientY));
  canvas.addEventListener('mouseup',    e => onPointerUp(e.clientX, e.clientY));
  canvas.addEventListener('mouseleave', e => onPointerUp(e.clientX, e.clientY));

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    onPointerUp(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
  }, { passive: false });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if      (State.phase === 'play')  { State.phase = 'pause'; showOverlay('ov-pause'); }
      else if (State.phase === 'pause') { State.phase = 'play';  hideAllOverlays(); }
    }
    if ((e.key === 'r' || e.key === 'R') && State.phase !== 'intro') {
      startGame();
    }
  });

  document.getElementById('btn-start').addEventListener('click',  () => startGame());
  document.getElementById('btn-pause').addEventListener('click',  () => {
    if (State.phase === 'play') { State.phase = 'pause'; showOverlay('ov-pause'); }
  });
  document.getElementById('btn-resume').addEventListener('click', () => {
    State.phase = 'play'; hideAllOverlays();
  });
  document.getElementById('btn-rp').addEventListener('click', () => startGame());

  // ─────────────────────────────────────────────────────
  //  RESIZE
  // ─────────────────────────────────────────────────────

  function onResize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    // Recentre the sun only while not playing (mid-game it would snap orbits)
    if (State.phase === 'intro') State.sun = makeSun();
  }
  window.addEventListener('resize', onResize);

  // ─────────────────────────────────────────────────────
  //  BOOTSTRAP
  // ─────────────────────────────────────────────────────

  onResize();
  requestAnimationFrame(ts => { State.lastTs = ts; loop(ts); });

})();
