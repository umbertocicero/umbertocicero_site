/**
 * CV Scene — Gravity-based floating skill glyphs
 *
 * An interactive canvas scene for the CV page:
 *   • Minimalist geometric glyphs (brackets, gears, nodes, etc.) float upward
 *     with anti-gravity, gently colliding and drifting.
 *   • Mouse/touch pushes nearby particles away with a soft radial force.
 *   • Click spawns a burst of new particles at the cursor.
 *   • Spatial hash for O(n) separation.
 *   • Sprite cache + typed arrays for zero-GC rendering.
 *
 * Palette: muted blue/indigo tones to complement the CV page style.
 */
(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════
     CONFIG
     ═══════════════════════════════════════════════════════ */

  var GLYPHS = [
    /* coding */
    '{ }', '< />', '//', '()', '[]', '=>', '&&', '||', '!=', '++',
    '/**/', '#!', '<<', '>>', '::',
    /* math & logic */
    'λ', '∞', '∑', '∂', '∫', '∇', 'π', 'Ω', 'Δ', 'Θ',
    '√', '≈', '≠', '≤', '≥', '∈', '∉', '⊂', '∀', '∃',
    '⊕', '⊗', '⊻', '∧', '∨',
    /* CS & tech */
    '⚙', '⌘', '⟨⟩', '⊞', '⬡', '◎', '✦', '⬢', '◇',
    '▲', '●', '⏣', '⊛', '≡'
  ];

  /* Muted palette — indigo / slate / soft cyan */
  var COLORS = [
    'rgba(74, 85, 175, 0.7)',    // indigo
    'rgba(100, 120, 200, 0.6)',  // soft blue
    'rgba(130, 160, 220, 0.5)',  // slate blue
    'rgba(80, 200, 200, 0.45)',  // muted cyan
    'rgba(160, 140, 210, 0.55)', // lavender
    'rgba(60, 60, 120, 0.5)',    // dark indigo
    'rgba(140, 180, 255, 0.5)',  // light periwinkle
    'rgba(90, 100, 160, 0.6)'   // grey-blue
  ];

  var IS_MOBILE       = (window.innerWidth || 1024) < 768;
  var PARTICLE_COUNT  = IS_MOBILE ? 50 : 100;
  var R               = IS_MOBILE ? 12 : 16;
  var GLYPH_PX        = IS_MOBILE ? 16 : 22;
  var EMIT_RATE       = 30;
  var DAMPING         = 0.985;
  var BOUNCE_WALL     = 0.3;
  var SEP_DIST        = 1.1;
  var SEP_ITERS       = 2;
  var MOUSE_RADIUS    = 140;
  var MOUSE_PUSH      = 0.25;
  var MOUSE_VEL_MULT  = 0.8;
  var MAX_SPEED       = 400;
  var CLICK_BURST     = 8;

  /* Anti-gravity: particles float upward gently */
  function calcAntiGravity() {
    return IS_MOBILE ? -60 : -40;
  }
  var ANTI_GRAVITY = calcAntiGravity();

  /* Gentle horizontal drift */
  var DRIFT_STRENGTH = 8;
  var DRIFT_FREQ     = 0.0004; // oscillation frequency

  /* ═══════════════════════════════════════════════════════
     STATE
     ═══════════════════════════════════════════════════════ */
  var canvas, ctx, container;
  var W = 0, H = 0, dpr = 1;
  var BURST_POOL  = CLICK_BURST * 10;   // extra slots reserved for click bursts
  var n = 0, maxN = PARTICLE_COUNT + BURST_POOL;

  var px, py, vx, vy, pr;
  var pAlive, pGlyphIdx, pColorIdx, pRotation, pRotSpeed, pAlpha;

  var mouseX = -9999, mouseY = -9999;
  var prevMouseX = -9999, prevMouseY = -9999;
  var mouseVX = 0, mouseVY = 0;
  var lastTouchTs = 0;
  var TOUCH_MOUSE_GUARD_MS = 800;
  var lastT = 0, raf = 0, elapsed = 0;
  var spawnedSoFar = 0, emitting = true;

  /* ═══════════════════════════════════════════════════════
     SPRITE CACHE
     ═══════════════════════════════════════════════════════ */
  var sprites = [];       // [glyphIdx][colorIdx] → offscreen canvas
  var SPRITE_SZ = 0, DRAW_SZ = 0, HALF_DRAW = 0;

  function buildSprites() {
    SPRITE_SZ = Math.ceil(GLYPH_PX * dpr * 1.6);
    DRAW_SZ   = SPRITE_SZ / dpr;
    HALF_DRAW = DRAW_SZ * 0.5;

    sprites = [];
    for (var g = 0; g < GLYPHS.length; g++) {
      sprites[g] = [];
      for (var c = 0; c < COLORS.length; c++) {
        var cv = document.createElement('canvas');
        cv.width = cv.height = SPRITE_SZ;
        var gc = cv.getContext('2d');
        gc.textAlign    = 'center';
        gc.textBaseline = 'middle';
        gc.font = 'bold ' + (GLYPH_PX * dpr) + 'px "Saira Extra Condensed", monospace';
        gc.fillStyle = COLORS[c];
        gc.fillText(GLYPHS[g], SPRITE_SZ * 0.5, SPRITE_SZ * 0.52);
        sprites[g][c] = cv;
      }
    }
  }

  /* ═══════════════════════════════════════════════════════
     SPATIAL HASH
     ═══════════════════════════════════════════════════════ */
  var CELL, COLS, ROWS, BCAP = 8, STRIDE, grid;

  function resizeGrid() {
    CELL = (R * 2 * 2.2) | 0;
    if (CELL < 40) CELL = 40;
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

  /* ═══════════════════════════════════════════════════════
     INIT
     ═══════════════════════════════════════════════════════ */
  function init() {
    container = document.getElementById('math-scene');
    if (!container) return;

    /* The section parent receives pointer events;
       the canvas container is pointer-events:none so the
       go-to-top pill (sibling) stays clickable. */
    var section = container.closest('.cv-hero') || container.parentElement;

    canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;width:100%;height:100%';
    container.appendChild(canvas);
    ctx = canvas.getContext('2d');

    measure();
    buildSprites();
    allocate();
    resizeGrid();

    window.addEventListener('resize', onResize);
    section.addEventListener('mousemove',  onMouse);
    section.addEventListener('mouseleave', onLeave);
    section.addEventListener('touchmove',  onTouch, { passive: true });
    section.addEventListener('touchend',   onLeave);
    section.addEventListener('touchcancel', onLeave);
    document.addEventListener('touchend',    onLeave);
    document.addEventListener('touchcancel', onLeave);
    section.addEventListener('click',      onClick);

    lastT = performance.now();
    raf = requestAnimationFrame(tick);
  }

  var _rt = 0;
  function onResize() {
    clearTimeout(_rt);
    _rt = setTimeout(function () {
      IS_MOBILE = (window.innerWidth || 1024) < 768;
      ANTI_GRAVITY = calcAntiGravity();
      measure();
      buildSprites();
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

  /* ═══════════════════════════════════════════════════════
     ALLOCATE
     ═══════════════════════════════════════════════════════ */
  function allocate() {
    px        = new Float64Array(maxN);
    py        = new Float64Array(maxN);
    vx        = new Float64Array(maxN);
    vy        = new Float64Array(maxN);
    pr        = new Float64Array(maxN);
    pAlive    = new Uint8Array(maxN);
    pGlyphIdx = new Uint8Array(maxN);
    pColorIdx = new Uint8Array(maxN);
    pRotation = new Float64Array(maxN);
    pRotSpeed = new Float64Array(maxN);
    pAlpha    = new Float64Array(maxN);

    for (var i = 0; i < maxN; i++) {
      pr[i] = R + (Math.random() - 0.5) * 4;
      pGlyphIdx[i] = (Math.random() * GLYPHS.length) | 0;
      pColorIdx[i] = (Math.random() * COLORS.length) | 0;
      pRotation[i] = Math.random() * Math.PI * 2;
      pRotSpeed[i] = (Math.random() - 0.5) * 0.6;
      pAlpha[i]    = 0.5 + Math.random() * 0.5;
    }
    spawnedSoFar = 0;
    emitting = true;
    n = 0;
  }

  /* ═══════════════════════════════════════════════════════
     EMITTER
     ═══════════════════════════════════════════════════════ */
  function emit(dt) {
    if (!emitting) return;
    var toSpawn = Math.ceil(EMIT_RATE * dt);
    for (var k = 0; k < toSpawn; k++) {
      if (spawnedSoFar >= PARTICLE_COUNT) { emitting = false; return; }
      var i = spawnedSoFar;
      pAlive[i] = 1;
      px[i] = Math.random() * W;
      py[i] = H + pr[i] + Math.random() * H * 0.3; // spawn below
      vx[i] = (Math.random() - 0.5) * 30;
      vy[i] = -(60 + Math.random() * 40); // float upward
      n = i + 1;
      spawnedSoFar++;
    }
  }

  /* Click burst: spawn extra particles at cursor.
     First tries free slots; if none, recycles the farthest particles. */
  function spawnBurst(bx, by) {
    var slots = [];
    // 1. Collect free slots
    for (var i = 0; i < maxN && slots.length < CLICK_BURST; i++) {
      if (!pAlive[i]) slots.push(i);
    }
    // 2. If not enough free slots, steal the farthest alive particles from click point
    if (slots.length < CLICK_BURST) {
      var dists = [];
      for (var j = 0; j < maxN; j++) {
        if (!pAlive[j]) continue;
        var ddx = px[j] - bx, ddy = py[j] - by;
        dists.push({ idx: j, d2: ddx * ddx + ddy * ddy });
      }
      dists.sort(function (a, b) { return b.d2 - a.d2; }); // farthest first
      var need = CLICK_BURST - slots.length;
      for (var k = 0; k < need && k < dists.length; k++) {
        slots.push(dists[k].idx);
      }
    }
    // 3. Spawn into collected slots
    for (var s = 0; s < slots.length; s++) {
      var si = slots[s];
      pAlive[si] = 1;
      px[si] = bx + (Math.random() - 0.5) * 40;
      py[si] = by + (Math.random() - 0.5) * 40;
      var angle = Math.random() * Math.PI * 2;
      var speed = 80 + Math.random() * 120;
      vx[si] = Math.cos(angle) * speed;
      vy[si] = Math.sin(angle) * speed;
      pGlyphIdx[si] = (Math.random() * GLYPHS.length) | 0;
      pColorIdx[si] = (Math.random() * COLORS.length) | 0;
      pRotation[si] = Math.random() * Math.PI * 2;
      pRotSpeed[si] = (Math.random() - 0.5) * 1.2;
      pAlpha[si]    = 0.6 + Math.random() * 0.4;
      pr[si] = R + (Math.random() - 0.5) * 4;
    }
  }

  /* ═══════════════════════════════════════════════════════
     PHYSICS
     ═══════════════════════════════════════════════════════ */
  var MR2 = MOUSE_RADIUS * MOUSE_RADIUS;

  function step(dt) {
    MR2 = MOUSE_RADIUS * MOUSE_RADIUS;
    var i, j, k, dx, dy, d2, d, minD, ov, nx, ny;
    var time = elapsed;

    for (i = 0; i < maxN; i++) {
      if (!pAlive[i]) continue;

      // Anti-gravity (float up)
      vy[i] += ANTI_GRAVITY * dt;

      // Gentle sinusoidal horizontal drift (unique per particle)
      vx[i] += Math.sin(time * DRIFT_FREQ * 1000 + i * 1.7) * DRIFT_STRENGTH * dt;

      // Mouse repulsion
      dx = px[i] - mouseX;
      dy = py[i] - mouseY;
      d2 = dx * dx + dy * dy;
      if (d2 < MR2 && d2 > 0.5) {
        d = Math.sqrt(d2);
        var push = (MOUSE_RADIUS - d) / d * MOUSE_PUSH;
        px[i] += dx * push;
        py[i] += dy * push;
        vx[i] += (mouseVX * MOUSE_VEL_MULT - vx[i]) * 0.2;
        vy[i] += (mouseVY * MOUSE_VEL_MULT - vy[i]) * 0.2;
      }

      vx[i] *= DAMPING;
      vy[i] *= DAMPING;

      px[i] += vx[i] * dt;
      py[i] += vy[i] * dt;

      // Slow rotation
      pRotation[i] += pRotSpeed[i] * dt;

      // Velocity cap
      var spd2 = vx[i] * vx[i] + vy[i] * vy[i];
      if (spd2 > MAX_SPEED * MAX_SPEED) {
        var sc = MAX_SPEED / Math.sqrt(spd2);
        vx[i] *= sc;
        vy[i] *= sc;
      }
    }

    /* Separation */
    for (var iter = 0; iter < SEP_ITERS; iter++) {
      clearGrid();
      insertAll();

      for (i = 0; i < maxN; i++) {
        if (!pAlive[i]) continue;
        var cx0 = (px[i] / CELL) | 0;
        var cy0 = (py[i] / CELL) | 0;
        if (cx0 < 0) cx0 = 0; else if (cx0 >= COLS) cx0 = COLS - 1;
        if (cy0 < 0) cy0 = 0; else if (cy0 >= ROWS) cy0 = ROWS - 1;

        var r0 = cy0 > 0 ? cy0 - 1 : 0;
        var r1 = cy0 < ROWS - 1 ? cy0 + 1 : ROWS - 1;
        var c0 = cx0 > 0 ? cx0 - 1 : 0;
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
              minD = (pr[i] + pr[j]) * SEP_DIST;
              if (d2 < minD * minD && d2 > 0.01) {
                d  = Math.sqrt(d2);
                ov = 0.5 * (minD - d) / d;
                if (ov > 0.3) ov = 0.3;
                nx = dx * ov; ny = dy * ov;
                px[i] -= nx; py[i] -= ny;
                px[j] += nx; py[j] += ny;
              }
            }
          }
        }
      }
    }

    /* Boundaries — wrap vertically for endless float */
    for (i = 0; i < maxN; i++) {
      if (!pAlive[i]) continue;
      var ri = pr[i];
      // Wrap top → respawn at bottom
      if (py[i] < -ri * 2) {
        py[i] = H + ri;
        vx[i] = (Math.random() - 0.5) * 20;
        vy[i] = -(40 + Math.random() * 30);
      }
      // Wrap bottom → respawn at top
      if (py[i] > H + ri * 3) {
        py[i] = -ri;
        vy[i] = -(20 + Math.random() * 20);
      }
      // Soft wall bounce
      if (px[i] < ri)     { px[i] = ri;     if (vx[i] < 0) vx[i] *= -BOUNCE_WALL; }
      if (px[i] > W - ri) { px[i] = W - ri; if (vx[i] > 0) vx[i] *= -BOUNCE_WALL; }
    }
  }

  /* ═══════════════════════════════════════════════════════
     DRAW
     ═══════════════════════════════════════════════════════ */
  function draw() {
    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < maxN; i++) {
      if (!pAlive[i]) continue;
      var sprite = sprites[pGlyphIdx[i]][pColorIdx[i]];
      var rot = pRotation[i];
      var alpha = pAlpha[i];

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(px[i], py[i]);
      ctx.rotate(rot);
      ctx.drawImage(sprite, -HALF_DRAW, -HALF_DRAW, DRAW_SZ, DRAW_SZ);
      ctx.restore();
    }
  }

  /* ═══════════════════════════════════════════════════════
     LOOP
     ═══════════════════════════════════════════════════════ */
  function tick(now) {
    raf = requestAnimationFrame(tick);
    var dt = (now - lastT) * 0.001;
    lastT = now;
    if (dt > 0.04) dt = 0.04;
    if (dt < 0.001) return;
    elapsed += dt;

    if (prevMouseX > -9000) {
      mouseVX = (mouseX - prevMouseX) / dt * 0.4;
      mouseVY = (mouseY - prevMouseY) / dt * 0.4;
      var mSpd = Math.sqrt(mouseVX * mouseVX + mouseVY * mouseVY);
      if (mSpd > 600) { var ms = 600 / mSpd; mouseVX *= ms; mouseVY *= ms; }
    } else {
      mouseVX = mouseVY = 0;
    }
    prevMouseX = mouseX;
    prevMouseY = mouseY;

    emit(dt);
    step(dt);
    draw();
  }

  /* ═══════════════════════════════════════════════════════
     EVENTS
     ═══════════════════════════════════════════════════════ */
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
  function onClick(e) {
    if ((Date.now() - lastTouchTs) < TOUCH_MOUSE_GUARD_MS) return;
    // Don't spawn particles when clicking on the go-to-top pill or overlay links
    if (e.target.closest('.scroll-top-pill, .cv-hero__overlay a')) return;
    var r = container.getBoundingClientRect();
    spawnBurst(e.clientX - r.left, e.clientY - r.top);
  }

  /* ═══════════════════════════════════════════════════════
     LIFECYCLE — IntersectionObserver lazy init
     ═══════════════════════════════════════════════════════ */
  function setup() {
    var el = document.getElementById('math-scene');
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
