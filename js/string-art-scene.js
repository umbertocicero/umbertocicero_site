/**
 * String Art — soft hanging strings with geometric shape pendants
 *
 * Each string is a chain of Verlet particles connected by distance constraints.
 * Top particle is pinned. Gravity pulls them down.
 * Mouse repels ALL particles (not just tips).
 * At each tip hangs a randomly chosen geometric shape (triangle, circle,
 * square, diamond, cross, plus) with a random rotation angle.
 * The container is transparent (no border / box).
 */
(function () {
  'use strict';

  /* ── Config ─────────────────────────────────────── */
  var STRING_COUNT    = 100;
  var SEGMENTS        = 20;
  var UNIFORM_RATIO   = 0.70;
  var GRAVITY         = -0.45;
  var FRICTION        = 0.97;
  var CONSTRAINT_ITER = 5;
  var MOUSE_RADIUS    = 90;
  var MOUSE_STRENGTH  = 2.4;
  var SHAPE_SIZE      = 7;        // base half-size of pendant shapes
  var LINE_COLOR      = 'rgba(50,50,50,0.5)';

  /* Shape fill: blue */
  var SHAPE_FILL = '#3a5cff';

  /* Available shape types */
  var SHAPE_TYPES = ['triangle', 'circle', 'square', 'diamond', 'cross', 'plus'];

  var canvas, ctx;
  var strings = [];
  var mouse = { x: -9999, y: -9999 };

  /* ── Particle ───────────────────────────────────── */
  function Pt(x, y, pinned) {
    this.x = x; this.y = y;
    this.ox = x; this.oy = y;
    this.pinned = !!pinned;
  }

  /* ── Build one string ───────────────────────────── */
  function makeString(anchorX, anchorY, totalLen, segLen, shapeType, rotation, shapeSize) {
    var pts = [];
    for (var i = 0; i <= SEGMENTS; i++) {
      // Particle 0 is at the bottom (pinned), rest go upward
      pts.push(new Pt(anchorX, anchorY - i * segLen, i === 0));
    }
    return {
      pts: pts,
      segLen: segLen,
      totalLen: totalLen,
      shapeType: shapeType,
      rotation: rotation,
      shapeSize: shapeSize
    };
  }

  /* ── Build all strings ──────────────────────────── */
  function buildStrings() {
    strings = [];
    var w = canvas.width;
    var h = canvas.height;
    var minH = h * 0.25;
    var maxH = h * 0.88;   // keep tips well inside the box

    for (var i = 0; i < STRING_COUNT; i++) {
      var x = (w / (STRING_COUNT + 1)) * (i + 1);

      /* More organic distribution: mix of short, medium, and tall */
      var r = Math.random();
      var len;
      if (r < 0.20) {
        /* short  15-35% */
        len = minH + Math.random() * h * 0.20;
      } else if (r < 0.55) {
        /* medium 35-60% */
        len = h * 0.35 + Math.random() * h * 0.25;
      } else if (r < 0.85) {
        /* tall   55-78% */
        len = h * 0.55 + Math.random() * h * 0.23;
      } else {
        /* very tall 70-88% */
        len = h * 0.70 + Math.random() * h * 0.18;
      }
      len = Math.max(minH, Math.min(len, maxH));

      var segLen    = len / SEGMENTS;
      var shapeType = SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)];
      var rotation  = Math.random() * Math.PI * 2;                // random rotation
      var size      = SHAPE_SIZE + (Math.random() - 0.5) * 5;     // size variation 4.5 – 9.5

      strings.push(makeString(x, h, len, segLen, shapeType, rotation, size));
    }
  }

  /* ── Physics ────────────────────────────────────── */
  function simulate() {
    for (var s = 0; s < strings.length; s++) {
      var pts = strings[s].pts;
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        if (p.pinned) continue;

        var vx = (p.x - p.ox) * FRICTION;
        var vy = (p.y - p.oy) * FRICTION;

        p.ox = p.x;
        p.oy = p.y;

        p.x += vx;
        p.y += vy + GRAVITY;

        /* Clamp inside canvas bounds */
        if (p.y < 0) { p.y = 0; p.oy = 0; }
        if (p.x < 0) p.x = 0;
        if (p.x > canvas.width) p.x = canvas.width;

        var dx = p.x - mouse.x;
        var dy = p.y - mouse.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS && dist > 0.1) {
          var force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS * MOUSE_STRENGTH;
          p.x += (dx / dist) * force;
          p.y += (dy / dist) * force;
        }
      }
    }

    for (var iter = 0; iter < CONSTRAINT_ITER; iter++) {
      for (var s = 0; s < strings.length; s++) {
        var str = strings[s];
        var pts = str.pts;
        var rest = str.segLen;

        for (var i = 0; i < pts.length - 1; i++) {
          var a = pts[i];
          var b = pts[i + 1];

          var dx = b.x - a.x;
          var dy = b.y - a.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 0.0001) continue;

          var diff = (rest - dist) / dist * 0.5;
          var ox = dx * diff;
          var oy = dy * diff;

          if (!a.pinned) { a.x -= ox; a.y -= oy; }
          if (!b.pinned) { b.x += ox; b.y += oy; }
        }
      }
    }
  }

  /* ── Shape drawing helpers ──────────────────────── */

  function drawTriangle(cx, cy, sz, rot) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, -sz);
    ctx.lineTo(-sz * 0.866, sz * 0.5);
    ctx.lineTo( sz * 0.866, sz * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawCircle(cx, cy, sz) {
    ctx.beginPath();
    ctx.arc(cx, cy, sz * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSquare(cx, cy, sz, rot) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    var half = sz * 0.75;
    ctx.beginPath();
    ctx.rect(-half, -half, half * 2, half * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawDiamond(cx, cy, sz, rot) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, -sz);
    ctx.lineTo(sz * 0.65, 0);
    ctx.lineTo(0, sz);
    ctx.lineTo(-sz * 0.65, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawCross(cx, cy, sz, rot) {
    /* × shape (rotated plus) */
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    var arm = sz * 0.85;
    var th  = sz * 0.25;
    ctx.beginPath();
    /* Horizontal bar */
    ctx.rect(-arm, -th, arm * 2, th * 2);
    /* Vertical bar */
    ctx.rect(-th, -arm, th * 2, arm * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPlus(cx, cy, sz, rot) {
    /* + shape */
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    var arm = sz * 0.85;
    var th  = sz * 0.22;
    ctx.beginPath();
    ctx.rect(-arm, -th, arm * 2, th * 2);
    ctx.rect(-th, -arm, th * 2, arm * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawShape(type, cx, cy, sz, rot) {
    ctx.fillStyle = SHAPE_FILL;
    switch (type) {
      case 'triangle': drawTriangle(cx, cy, sz, rot); break;
      case 'circle':   drawCircle(cx, cy, sz);        break;
      case 'square':   drawSquare(cx, cy, sz, rot);   break;
      case 'diamond':  drawDiamond(cx, cy, sz, rot);  break;
      case 'cross':    drawCross(cx, cy, sz, rot);    break;
      case 'plus':     drawPlus(cx, cy, sz, rot);     break;
    }
  }

  /* ── Draw ───────────────────────────────────────── */
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (var s = 0; s < strings.length; s++) {
      var str = strings[s];
      var pts = str.pts;

      /* String line */
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (var i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.strokeStyle = LINE_COLOR;
      ctx.lineWidth = 1;
      ctx.stroke();

      /* Pendant shape at tip */
      var tip = pts[pts.length - 1];
      drawShape(str.shapeType, tip.x, tip.y, str.shapeSize, str.rotation);
    }
  }

  /* ── Loop ───────────────────────────────────────── */
  function tick() {
    requestAnimationFrame(tick);
    simulate();
    draw();
  }

  /* ── Resize ─────────────────────────────────────── */
  function resize() {
    var section = document.getElementById('before-footer');
    if (!section || !canvas) return;
    var rect = section.getBoundingClientRect();
    canvas.width  = rect.width;
    canvas.height = rect.height;
    buildStrings();
  }

  /* ── Init ───────────────────────────────────────── */
  function init() {
    var section = document.getElementById('before-footer');
    if (!section) return;

    /* Make sure container is transparent – no border, no outline */
    section.style.position   = 'relative';
    section.style.overflow   = 'hidden';
    section.style.minHeight  = '380px';
    section.style.border     = 'none';
    section.style.outline    = 'none';
    section.style.boxShadow  = 'none';
    section.style.background = 'transparent';

    canvas = document.createElement('canvas');
    canvas.id = 'string-art-canvas';
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;border:none;outline:none;';
    section.appendChild(canvas);

    ctx = canvas.getContext('2d');
    resize();

    /* Mouse — listen on section so the pill button stays clickable */
    section.addEventListener('mousemove', function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    });
    section.addEventListener('mouseleave', function () {
      mouse.x = -9999; mouse.y = -9999;
    });

    /* Touch */
    function onTouchLeave() { mouse.x = -9999; mouse.y = -9999; }
    section.addEventListener('touchmove', function (e) {
      if (e.touches.length) {
        var r = canvas.getBoundingClientRect();
        var t = e.touches[0];
        mouse.x = t.clientX - r.left;
        mouse.y = t.clientY - r.top;
      } else {
        onTouchLeave();
      }
    }, { passive: true });
    section.addEventListener('touchend',    onTouchLeave);
    section.addEventListener('touchcancel', onTouchLeave);
    document.addEventListener('touchend',    onTouchLeave);
    document.addEventListener('touchcancel', onTouchLeave);

    window.addEventListener('resize', resize);
    tick();
  }

  window.addEventListener('load', init);
})();
