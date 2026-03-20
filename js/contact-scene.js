/**
 * Contact Section — Lusion-style 2D physics scene (optimised)
 *
 * Pure Canvas 2D.  Emoji characters fall with gravity,
 * pile up at the bottom, and get repelled by the mouse cursor.
 *
 * Performance notes
 * -----------------
 *  • Every unique emoji is rasterised ONCE to a small offscreen canvas,
 *    then blitted each frame with drawImage (avoids costly fillText).
 *  • Spatial-hash grid turns O(n²) collision checks into ~O(n).
 *  • All emojis share the same radius  →  simpler / branchless maths.
 *  • Structure-of-Arrays (Float64Array) for positions & velocities
 *    →  cache-friendly, zero GC pressure.
 */
(function () {
  'use strict';

  /* ── config ─────────────────────────────────────────────── */
  var COUNT       = 55;
  var R           = 18;            // uniform collision radius (px)
  var EMOJI_PX    = 30;            // font-size used to rasterise each glyph
  var GRAVITY     = 420;           // px / s²
  var DAMPING     = 0.985;
  var MOUSE_R     = 140;
  var MOUSE_R2    = MOUSE_R * MOUSE_R;
  var MOUSE_STR   = 8000;
  var BOUNCE_WALL = 0.28;
  var BOUNCE_COL  = 0.12;
  var COL_ITERS   = 2;

  var GLYPHS = [
    '\uD83D\uDE00','\uD83D\uDE80','\uD83D\uDC8E','\u2764\uFE0F','\uD83C\uDFAE',
    '\u2B50','\uD83D\uDD25','\uD83C\uDFAF','\uD83D\uDCA1','\uD83C\uDFA8',
    '\uD83C\uDFC6','\uD83D\uDC7E','\uD83C\uDF1F','\uD83C\uDF55','\uD83C\uDFB5',
    '\uD83D\uDE0E','\uD83E\uDD16','\uD83C\uDF08','\uD83C\uDFB2','\uD83D\uDCBB',
    '\uD83E\uDDE0','\u2615','\uD83C\uDF0D','\uD83D\uDCF1','\uD83D\uDD27',
    '\uD83C\uDFB8','\u26BD','\uD83C\uDFC0','\uD83D\uDCA5','\u2728',
    '\uD83E\uDDBE','\uD83D\uDEF8','\uD83E\uDDE9'
  ];

  /* ── state ──────────────────────────────────────────────── */
  var canvas, ctx, container;
  var W = 0, H = 0, dpr = 1;
  var n = 0;                       // body count

  /* Structure-of-Arrays (cache-friendly, no GC) */
  var px, py, vx, vy;             // Float64Array[n]
  var ei;                          // Uint8Array[n]  – index into sprites[]

  var mouseX = -9999, mouseY = -9999;
  var lastT  = 0, raf = 0;

  /* ── emoji sprite cache ─────────────────────────────────── */
  var sprites = [];                // array of <canvas> elements
  var SPRITE_SZ = 0;               // pixel size of each sprite tile
  var DRAW_SZ  = 0;                // CSS-px size we blit at (= SPRITE_SZ / dpr)
  var HALF_DRAW = 0;

  function buildSprites () {
    SPRITE_SZ  = Math.ceil(EMOJI_PX * dpr * 1.35);
    DRAW_SZ    = SPRITE_SZ / dpr;
    HALF_DRAW  = DRAW_SZ * 0.5;

    sprites.length = 0;
    for (var i = 0; i < GLYPHS.length; i++) {
      var c  = document.createElement('canvas');
      c.width  = SPRITE_SZ;
      c.height = SPRITE_SZ;
      var g  = c.getContext('2d');
      g.textAlign    = 'center';
      g.textBaseline = 'middle';
      g.font = (EMOJI_PX * dpr) + 'px serif';
      g.fillText(GLYPHS[i], SPRITE_SZ * 0.5, SPRITE_SZ * 0.5);
      sprites.push(c);
    }
  }

  /* ── spatial hash ───────────────────────────────────────── */
  var CELL = 0, COLS = 0, ROWS = 0;
  var BCAP   = 8;                  // max bodies per cell
  var STRIDE = BCAP + 1;           // [count, id0, id1, …, id7]
  var grid;                        // Int16Array

  function resizeGrid () {
    CELL = (R * 2.2) | 0;
    if (CELL < 40) CELL = 40;
    COLS = (W / CELL | 0) + 2;
    ROWS = (H / CELL | 0) + 2;
    grid = new Int16Array(COLS * ROWS * STRIDE);
  }

  function clearGrid () {
    for (var k = 0, len = COLS * ROWS; k < len; k++) grid[k * STRIDE] = 0;
  }

  function insertAll () {
    for (var i = 0; i < n; i++) {
      var cx = (px[i] / CELL) | 0;
      var cy = (py[i] / CELL) | 0;
      if (cx < 0) cx = 0; else if (cx >= COLS) cx = COLS - 1;
      if (cy < 0) cy = 0; else if (cy >= ROWS) cy = ROWS - 1;
      var base = (cy * COLS + cx) * STRIDE;
      var cnt  = grid[base];
      if (cnt < BCAP) { grid[base + 1 + cnt] = i; grid[base] = cnt + 1; }
    }
  }

  /* ── init ───────────────────────────────────────────────── */
  function init () {
    container = document.getElementById('contact-scene');
    if (!container) return;

    canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;width:100%;height:100%';
    container.appendChild(canvas);
    ctx = canvas.getContext('2d');

    measure();
    buildSprites();
    spawn();
    resizeGrid();

    window.addEventListener('resize', onResize);
    container.addEventListener('mousemove',  onMouse);
    container.addEventListener('mouseleave', onLeave);
    container.addEventListener('touchmove',  onTouch, { passive: true });
    container.addEventListener('touchend',   onLeave);

    lastT = performance.now();
    raf   = requestAnimationFrame(tick);
  }

  var _rtimer = 0;
  function onResize () {
    clearTimeout(_rtimer);
    _rtimer = setTimeout(function () {
      measure(); buildSprites(); resizeGrid();
    }, 120);
  }

  function measure () {
    W   = container.clientWidth  || window.innerWidth;
    H   = container.clientHeight || window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = (W * dpr) | 0;
    canvas.height = (H * dpr) | 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ── spawn bodies ───────────────────────────────────────── */
  function spawn () {
    n  = COUNT;
    px = new Float64Array(n);
    py = new Float64Array(n);
    vx = new Float64Array(n);
    vy = new Float64Array(n);
    ei = new Uint8Array(n);

    for (var i = 0; i < n; i++) {
      px[i] = Math.random() * W;
      py[i] = -40 - Math.random() * H * 2;
      vx[i] = (Math.random() - 0.5) * 40;
      vy[i] = Math.random() * 50;
      ei[i] = i % GLYPHS.length;
    }
  }

  /* ── physics step ───────────────────────────────────────── */
  var DIA  = R + R;
  var DIA2 = DIA * DIA;
  var INV_MR = 1 / MOUSE_R;

  function step (dt) {
    var i, j, k, dx, dy, d2, d, ov, nx, ny, dot, imp, half;

    /* 1 — forces + integrate */
    for (i = 0; i < n; i++) {
      vy[i] += GRAVITY * dt;

      /* mouse repulsion (squared-distance early-out) */
      dx = px[i] - mouseX;
      dy = py[i] - mouseY;
      d2 = dx * dx + dy * dy;
      if (d2 < MOUSE_R2 && d2 > 1) {
        d = Math.sqrt(d2);
        var t = 1 - d * INV_MR;
        var f = MOUSE_STR * t * t * dt;
        var id = 1 / d;
        vx[i] += dx * id * f;
        vy[i] += dy * id * f;
      }

      vx[i] *= DAMPING;
      vy[i] *= DAMPING;
      px[i] += vx[i] * dt;
      py[i] += vy[i] * dt;
    }

    /* 2 — collisions (spatial hash, uniform radius) */
    clearGrid();
    insertAll();

    for (var it = 0; it < COL_ITERS; it++) {
      for (i = 0; i < n; i++) {
        var cx = (px[i] / CELL) | 0;
        var cy = (py[i] / CELL) | 0;
        if (cx < 0) cx = 0; else if (cx >= COLS) cx = COLS - 1;
        if (cy < 0) cy = 0; else if (cy >= ROWS) cy = ROWS - 1;

        var r0 = cy > 0        ? cy - 1 : 0;
        var r1 = cy < ROWS - 1 ? cy + 1 : ROWS - 1;
        var c0 = cx > 0        ? cx - 1 : 0;
        var c1 = cx < COLS - 1 ? cx + 1 : COLS - 1;

        for (var ry = r0; ry <= r1; ry++) {
          for (var rx = c0; rx <= c1; rx++) {
            var base = (ry * COLS + rx) * STRIDE;
            var cnt  = grid[base];
            for (k = 0; k < cnt; k++) {
              j = grid[base + 1 + k];
              if (j <= i) continue;

              dx = px[j] - px[i];
              dy = py[j] - py[i];
              d2 = dx * dx + dy * dy;

              if (d2 < DIA2 && d2 > 0.01) {
                d  = Math.sqrt(d2);
                ov = DIA - d;
                nx = dx / d;
                ny = dy / d;

                half = ov * 0.25;
                px[i] -= nx * half;
                py[i] -= ny * half;
                px[j] += nx * half;
                py[j] += ny * half;

                dot = (vx[i] - vx[j]) * nx + (vy[i] - vy[j]) * ny;
                if (dot > 0) {
                  imp = dot * (1 + BOUNCE_COL) * 0.5;
                  vx[i] -= imp * nx;  vy[i] -= imp * ny;
                  vx[j] += imp * nx;  vy[j] += imp * ny;
                }
              }
            }
          }
        }
      }
    }

    /* 3 — boundaries */
    for (i = 0; i < n; i++) {
      if (py[i] > H - R)  { py[i] = H - R;  if (vy[i] > 0) { vy[i] *= -BOUNCE_WALL; vx[i] *= 0.9; } }
      if (py[i] < -H)     { py[i] = -H;     if (vy[i] < 0) vy[i] *= -0.1; }
      if (px[i] < R)      { px[i] = R;       if (vx[i] < 0) vx[i] *= -BOUNCE_WALL; }
      if (px[i] > W - R)  { px[i] = W - R;   if (vx[i] > 0) vx[i] *= -BOUNCE_WALL; }
    }
  }

  /* ── draw (just blit cached sprites) ────────────────────── */
  function draw () {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < n; i++) {
      ctx.drawImage(sprites[ei[i]], px[i] - HALF_DRAW, py[i] - HALF_DRAW, DRAW_SZ, DRAW_SZ);
    }
  }

  /* ── loop ───────────────────────────────────────────────── */
  function tick (now) {
    raf = requestAnimationFrame(tick);
    var dt = (now - lastT) * 0.001;
    lastT = now;
    if (dt > 0.04) dt = 0.04;
    if (dt < 0.001) return;
    step(dt);
    draw();
  }

  /* ── events ─────────────────────────────────────────────── */
  function onMouse (e) {
    var r = container.getBoundingClientRect();
    mouseX = e.clientX - r.left;
    mouseY = e.clientY - r.top;
  }
  function onTouch (e) {
    if (e.touches.length) {
      var r = container.getBoundingClientRect();
      mouseX = e.touches[0].clientX - r.left;
      mouseY = e.touches[0].clientY - r.top;
    }
  }
  function onLeave () { mouseX = mouseY = -9999; }

  /* ── lifecycle (lazy via IntersectionObserver) ──────────── */
  function setup () {
    var el = document.getElementById('contact-scene');
    if (!el) return;
    var done = false;
    new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting && !done) { done = true; init(); }
      }
    }, { threshold: 0.05 }).observe(el);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
