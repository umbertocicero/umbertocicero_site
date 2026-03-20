/**
 * Contact Section — Lusion-style 2D physics scene (emoji edition)
 *
 * Lusion.co-inspired footer animation with emoji characters:
 *   • Uniform-size emoji glyphs rain from the top with gravity.
 *   • Mouse cursor displaces nearby particles (position push + velocity).
 *   • Spatial-hash grid for O(n) particle–particle separation.
 *   • Particles pile up at the floor, pushed by gravity.
 *
 * Performance:
 *   • Each unique emoji is pre-rasterised once to an offscreen canvas.
 *   • Typed arrays (Float64Array) for positions & velocities — zero GC.
 *   • Spatial hash avoids O(n²) pair checks.
 */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     CONFIG
     ══════════════════════════════════════════════════════════ */

  /* Emoji glyphs — all rendered at the same size */
  var GLYPHS = [
    '\uD83E\uDD4E',  // 🥎 pallina da softball
    '\u26BD',         // ⚽ soccer ball
    '\uD83C\uDFC0',  // 🏀 basketball
    '\uD83D\uDCBB',  // 💻 laptop
    '\uD83D\uDCF1',  // 📱 mobile phone
    '\uD83D\uDE0E',  // 😎 cool face
    '\uD83D\uDE80',  // 🚀 rocket
    '\uD83E\uDD16',  // 🤖 robot
    '\uD83E\uDDE0',  // 🧠 brain
    '\uD83D\uDCA1',  // 💡 lightbulb
    '\uD83D\uDD27',  // 🔧 wrench
    '\u2699\uFE0F',  // ⚙️ gear
    '\uD83D\uDCBE',  // 💾 floppy disk
    '\uD83D\uDDA5\uFE0F', // 🖥️ desktop computer
    '\uD83C\uDFAE',  // 🎮 game controller
    '\uD83D\uDC7E',  // 👾 alien monster
    '\uD83C\uDFC6',  // 🏆 trophy
    '\u2615',         // ☕ coffee
    '\uD83C\uDF0D',  // 🌍 globe
    '\u2B50',         // ⭐ star
    '\u2728',         // ✨ sparkles
    '\uD83D\uDD25',  // 🔥 fire
    '\uD83C\uDFAF',  // 🎯 dart
    '\uD83C\uDFCB\uFE0F', // 🏋️ weight lifter (gym)
    '\uD83C\uDFA8',  // 🎨 palette
    '\uD83E\uDDBE',  // 🦾 mechanical arm
    '\uD83D\uDEF8',  // 🛸 ufo
    '\uD83C\uDF55'  // 🍕 pizza (Italian!)
  ];

  /* Responsive particle count: double on desktop, normal on mobile */
  var IS_MOBILE       = (window.innerWidth || 1024) < 768;
  var PARTICLE_COUNT  = IS_MOBILE ? 50 : 240;
  var R               = 16;        // uniform collision radius for every particle
  var EMOJI_PX        = 28;        // font-size used to rasterise each glyph
  var EMIT_RATE       = 40;        // particles per second during spawn phase
  var DAMPING         = 0.992;
  var BOUNCE_WALL     = 0.25;
  var SEPARATION_DIST = 1.05;      // factor of (rA + rB) for separation push
  var SEP_ITERS       = 3;
  var MOUSE_RADIUS    = 90;       // px
  var MOUSE_PUSH      = 1.2;       // position push strength
  var MOUSE_VEL_MULT  = 3.0;       // velocity transfer multiplier
  var MAX_SPEED       = 600;       // hard velocity cap (px/s) — prevents missiles

  /* Gravity — responsive: stronger on mobile, softer on desktop */
  function calcGravity() {
    var w = window.innerWidth || 1024;
    // Map viewport 320→2560 to gravity 650→250
    var t = Math.max(0, Math.min(1, (w - 320) / (2560 - 320)));
    return 650 - t * 400;
  }
  var GRAVITY = calcGravity();

  /* ══════════════════════════════════════════════════════════
     STATE
     ══════════════════════════════════════════════════════════ */
  var canvas, ctx, container;
  var W = 0, H = 0, dpr = 1;
  var n = 0;                        // active particle count
  var maxN = PARTICLE_COUNT;

  /* SoA particle data */
  var px, py, vx, vy;               // Float64Array
  var pr;                            // Float64Array — radius
  var pAlive;                        // Uint8Array — 1 = alive

  var mouseX = -9999, mouseY = -9999;
  var prevMouseX = -9999, prevMouseY = -9999;
  var mouseVX = 0, mouseVY = 0;
  var lastTouchTs = 0;
  var TOUCH_MOUSE_GUARD_MS = 800;
  var lastT = 0, raf = 0;
  var spawnedSoFar = 0;
  var emitting = true;

  /* ══════════════════════════════════════════════════════════
     SPRITE CACHE — pre-rasterise each unique emoji once
     ══════════════════════════════════════════════════════════ */
  var glyphSprites = [];   // one offscreen canvas per unique glyph
  var SPRITE_SZ    = 0;    // pixel size of each sprite tile
  var DRAW_SZ      = 0;    // CSS-px blit size
  var HALF_DRAW    = 0;
  var pGlyphIdx;           // Uint8Array[maxN] — which glyph each particle uses

  function buildGlyphSprites() {
    SPRITE_SZ = Math.ceil(EMOJI_PX * dpr * 1.35);
    DRAW_SZ   = SPRITE_SZ / dpr;
    HALF_DRAW = DRAW_SZ * 0.5;

    glyphSprites = [];
    for (var i = 0; i < GLYPHS.length; i++) {
      var c = document.createElement('canvas');
      c.width = c.height = SPRITE_SZ;
      var g = c.getContext('2d');
      g.textAlign    = 'center';
      g.textBaseline = 'middle';
      g.font = (EMOJI_PX * dpr) + 'px serif';
      g.fillText(GLYPHS[i], SPRITE_SZ * 0.5, SPRITE_SZ * 0.5);
      glyphSprites.push(c);
    }
  }

  /* ══════════════════════════════════════════════════════════
     SPATIAL HASH
     ══════════════════════════════════════════════════════════ */
  var CELL, COLS, ROWS;
  var BCAP = 10, STRIDE;
  var grid;

  function resizeGrid() {
    CELL = (R * 2 * 2.2) | 0;
    if (CELL < 48) CELL = 48;
    COLS = ((W / CELL) | 0) + 2;
    ROWS = ((H / CELL) | 0) + 2;
    STRIDE = BCAP + 1;
    grid = new Int16Array(COLS * ROWS * STRIDE);
  }

  function clearGrid() {
    for (var k = 0, len = COLS * ROWS; k < len; k++) grid[k * STRIDE] = 0;
  }

  function insertAll() {
    for (var i = 0; i < maxN; i++) {
      if (!pAlive[i]) continue;
      var cx = (px[i] / CELL) | 0;
      var cy = (py[i] / CELL) | 0;
      if (cx < 0) cx = 0; else if (cx >= COLS) cx = COLS - 1;
      if (cy < 0) cy = 0; else if (cy >= ROWS) cy = ROWS - 1;
      var base = (cy * COLS + cx) * STRIDE;
      var cnt = grid[base];
      if (cnt < BCAP) { grid[base + 1 + cnt] = i; grid[base] = cnt + 1; }
    }
  }

  /* ══════════════════════════════════════════════════════════
     INIT
     ══════════════════════════════════════════════════════════ */
  function init() {
    container = document.getElementById('contact-scene');
    if (!container) return;

    canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;width:100%;height:100%';
    container.appendChild(canvas);
    ctx = canvas.getContext('2d');

    measure();
    buildGlyphSprites();
    allocate();
    resizeGrid();

    window.addEventListener('resize', onResize);
    container.addEventListener('mousemove',  onMouse);
    container.addEventListener('mouseleave', onLeave);
    container.addEventListener('touchmove',  onTouch, { passive: true });
    container.addEventListener('touchend',   onLeave);
    container.addEventListener('touchcancel', onLeave);
    document.addEventListener('touchend',    onLeave);
    document.addEventListener('touchcancel', onLeave);

    lastT = performance.now();
    raf   = requestAnimationFrame(tick);
  }

  var _rt = 0;
  function onResize() {
    clearTimeout(_rt);
    _rt = setTimeout(function () {
      measure();
      GRAVITY = calcGravity();
      buildGlyphSprites();
      resizeGrid();
    }, 150);
  }

  function measure() {
    W   = container.clientWidth  || window.innerWidth;
    H   = container.clientHeight || window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = (W * dpr) | 0;
    canvas.height = (H * dpr) | 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ══════════════════════════════════════════════════════════
     ALLOCATE PARTICLE ARRAYS
     ══════════════════════════════════════════════════════════ */
  function allocate() {
    px       = new Float64Array(maxN);
    py       = new Float64Array(maxN);
    vx       = new Float64Array(maxN);
    vy       = new Float64Array(maxN);
    pr       = new Float64Array(maxN);
    pAlive   = new Uint8Array(maxN);
    pGlyphIdx = new Uint8Array(maxN);

    for (var i = 0; i < maxN; i++) {
      pr[i] = R;
      pGlyphIdx[i] = i % GLYPHS.length;
    }
    // All start dead; emitter brings them to life
    spawnedSoFar = 0;
    emitting = true;
    n = 0;
  }

  /* ══════════════════════════════════════════════════════════
     EMITTER — spawn particles from top, like Lusion
     ══════════════════════════════════════════════════════════ */
  function emit(dt) {
    if (!emitting) return;
    var toSpawn = Math.ceil(EMIT_RATE * dt);
    for (var k = 0; k < toSpawn; k++) {
      if (spawnedSoFar >= maxN) { emitting = false; return; }
      var i = spawnedSoFar;
      pAlive[i] = 1;
      px[i] = Math.random() * W;
      py[i] = -pr[i] - Math.random() * H * 0.3;  // above viewport
      // Slight random horizontal drift + strong downward
      vx[i] = (Math.random() - 0.5) * 40;
      vy[i] = (30 + Math.random() * 60) * (GRAVITY / 400);
      n = i + 1;
      spawnedSoFar++;
    }
  }

  /* ══════════════════════════════════════════════════════════
     PHYSICS STEP
     ══════════════════════════════════════════════════════════ */
  var MR2 = MOUSE_RADIUS * MOUSE_RADIUS;

  function step(dt) {
    var i, j, k, dx, dy, d2, d, minD, ov, nx, ny, push;
    MR2 = MOUSE_RADIUS * MOUSE_RADIUS;

    /* ─── 1. Forces + integrate ─── */
    for (i = 0; i < maxN; i++) {
      if (!pAlive[i]) continue;

      // Gravity
      vy[i] += GRAVITY * dt;

      // Mouse repulsion (Lusion style: position displacement + velocity blend)
      dx = px[i] - mouseX;
      dy = py[i] - mouseY;
      d2 = dx * dx + dy * dy;
      if (d2 < MR2 && d2 > 0.5) {
        d = Math.sqrt(d2);
        push = (MOUSE_RADIUS - d) / d * MOUSE_PUSH;
        px[i] += dx * push;
        py[i] += dy * push;
        // Blend mouse velocity in (not overwrite) to avoid sudden jumps
        vx[i] += (mouseVX * MOUSE_VEL_MULT - vx[i]) * 0.5;
        vy[i] += (mouseVY * MOUSE_VEL_MULT - vy[i]) * 0.5;
      }

      // Damping
      vx[i] *= DAMPING;
      vy[i] *= DAMPING;

      // Euler integration
      px[i] += vx[i] * dt;
      py[i] += vy[i] * dt;

      // Hard velocity cap — prevent missiles
      var spd2 = vx[i] * vx[i] + vy[i] * vy[i];
      if (spd2 > MAX_SPEED * MAX_SPEED) {
        var sc = MAX_SPEED / Math.sqrt(spd2);
        vx[i] *= sc;
        vy[i] *= sc;
      }
    }

    /* ─── 2. Particle separation (spatial hash) ─── */
    for (var iter = 0; iter < SEP_ITERS; iter++) {
      clearGrid();
      insertAll();

      for (i = 0; i < maxN; i++) {
        if (!pAlive[i]) continue;

        var cx0 = (px[i] / CELL) | 0;
        var cy0 = (py[i] / CELL) | 0;
        if (cx0 < 0) cx0 = 0; else if (cx0 >= COLS) cx0 = COLS - 1;
        if (cy0 < 0) cy0 = 0; else if (cy0 >= ROWS) cy0 = ROWS - 1;

        var r0 = cy0 > 0        ? cy0 - 1 : 0;
        var r1 = cy0 < ROWS - 1 ? cy0 + 1 : ROWS - 1;
        var c0 = cx0 > 0        ? cx0 - 1 : 0;
        var c1 = cx0 < COLS - 1 ? cx0 + 1 : COLS - 1;

        for (var ry = r0; ry <= r1; ry++) {
          for (var rx = c0; rx <= c1; rx++) {
            var base = (ry * COLS + rx) * STRIDE;
            var cnt  = grid[base];
            for (k = 0; k < cnt; k++) {
              j = grid[base + 1 + k];
              if (j <= i || !pAlive[j]) continue;

              dx = px[j] - px[i];
              dy = py[j] - py[i];
              d2 = dx * dx + dy * dy;
              minD = (pr[i] + pr[j]) * SEPARATION_DIST;

              if (d2 < minD * minD && d2 > 0.01) {
                d  = Math.sqrt(d2);
                ov = 0.5 * (minD - d) / d;  // Lusion formula
                // Cap overlap push to prevent explosive separation
                if (ov > 0.4) ov = 0.4;
                nx = dx * ov;
                ny = dy * ov;

                px[i] -= nx;
                py[i] -= ny;
                px[j] += nx;
                py[j] += ny;

                // Small velocity exchange for natural bounce
                var relDot = (vx[i] - vx[j]) * dx / d + (vy[i] - vy[j]) * dy / d;
                if (relDot > 0) {
                  var imp = relDot * 0.15;
                  vx[i] -= imp * dx / d;
                  vy[i] -= imp * dy / d;
                  vx[j] += imp * dx / d;
                  vy[j] += imp * dy / d;
                }
              }
            }
          }
        }
      }
    }

    /* ─── 3. Boundaries ─── */
    for (i = 0; i < maxN; i++) {
      if (!pAlive[i]) continue;
      var ri = pr[i];

      // Floor
      if (py[i] > H - ri) {
        py[i] = H - ri;
        if (vy[i] > 0) { vy[i] *= -BOUNCE_WALL; vx[i] *= 0.92; }
      }
      // Ceiling — clamp tightly so particles can't fly away and come back as missiles
      if (py[i] < -ri * 3) {
        py[i] = -ri * 3;
        if (vy[i] < 0) vy[i] = 0;
      }
      // Walls
      if (px[i] < ri)     { px[i] = ri;     if (vx[i] < 0) vx[i] *= -BOUNCE_WALL; }
      if (px[i] > W - ri) { px[i] = W - ri; if (vx[i] > 0) vx[i] *= -BOUNCE_WALL; }
    }
  }

  /* ══════════════════════════════════════════════════════════
     DRAW
     ══════════════════════════════════════════════════════════ */
  function draw() {
    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < maxN; i++) {
      if (!pAlive[i]) continue;
      ctx.drawImage(
        glyphSprites[pGlyphIdx[i]],
        px[i] - HALF_DRAW,
        py[i] - HALF_DRAW,
        DRAW_SZ,
        DRAW_SZ
      );
    }
  }

  /* ══════════════════════════════════════════════════════════
     LOOP
     ══════════════════════════════════════════════════════════ */
  function tick(now) {
    raf = requestAnimationFrame(tick);
    var dt = (now - lastT) * 0.001;
    lastT = now;
    if (dt > 0.04) dt = 0.04;  // cap to prevent spiral-of-death
    if (dt < 0.001) return;

    // Mouse velocity (smoothed + clamped)
    if (prevMouseX > -9000) {
      mouseVX = (mouseX - prevMouseX) / dt * 0.4;
      mouseVY = (mouseY - prevMouseY) / dt * 0.4;
      // Clamp mouse velocity to sane range
      var mSpd = Math.sqrt(mouseVX * mouseVX + mouseVY * mouseVY);
      if (mSpd > 800) { var ms = 800 / mSpd; mouseVX *= ms; mouseVY *= ms; }
    } else {
      mouseVX = mouseVY = 0;
    }
    prevMouseX = mouseX;
    prevMouseY = mouseY;

    emit(dt);
    step(dt);
    draw();
  }

  /* ══════════════════════════════════════════════════════════
     EVENTS
     ══════════════════════════════════════════════════════════ */
  function onMouse(e) {
    if ((Date.now() - lastTouchTs) < TOUCH_MOUSE_GUARD_MS) return;
    var r = container.getBoundingClientRect();
    mouseX = e.clientX - r.left;
    mouseY = e.clientY - r.top;
  }
  function onTouch(e) {
    lastTouchTs = Date.now();
    if (e.touches.length) {
      var r = container.getBoundingClientRect();
      mouseX = e.touches[0].clientX - r.left;
      mouseY = e.touches[0].clientY - r.top;
    } else {
      onLeave();
    }
  }
  function onLeave() { mouseX = mouseY = prevMouseX = prevMouseY = -9999; }

  /* ══════════════════════════════════════════════════════════
     LIFECYCLE — lazy init via IntersectionObserver
     ══════════════════════════════════════════════════════════ */
  function setup() {
    var el = document.getElementById('contact-scene');
    if (!el) return;
    var done = false;
    new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting && !done) {
          done = true;
          init();
        }
      }
    }, { threshold: 0.05 }).observe(el);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
