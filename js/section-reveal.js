/**
 * Scroll reveal — clean & uniform.
 *
 * Every card gets the SAME animation:
 *   • Scale up from 0.88 → 1.0
 *   • Fade in from 0 → 1
 *   • Subtle slide up from 40px → 0
 *   • Damped interpolation for buttery smoothness
 *   • Smooth reverse when scrolling back out
 */
(function () {
  'use strict';

  /* ─── Easing ─────────────────────────────────────────────────────────── */
  function expoOut(t) {
    return t === 0 ? 0 : t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }
  function circOut(t) {
    return Math.sqrt(1 - Math.pow(t - 1, 2));
  }
  function silkyOut(t) {
    return expoOut(t) * 0.7 + circOut(t) * 0.3;
  }

  /* math.fit */
  function fit(value, inMin, inMax, outMin, outMax, easeFn) {
    var t = (value - inMin) / (inMax - inMin);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    if (easeFn) t = easeFn(t);
    return outMin + (outMax - outMin) * t;
  }

  /* Exponential damping */
  function damp(cur, target, lambda, dt) {
    return cur + (target - cur) * (1 - Math.exp(-lambda * dt));
  }

  /* ─── Tuning ─────────────────────────────────────────────────────────── */
  var SHOW_DUR    = 2.0;    // reveal duration (seconds of showTime)
  var HIDE_SPEED  = 0.6;    // how fast showTime decreases on exit
  var LAMBDA      = 4;      // damping stiffness (lower = silkier)
  var START_SCALE = 0.88;   // initial scale
  var SLIDE_PX    = 40;     // upward slide distance in px

  /* ─── State ──────────────────────────────────────────────────────────── */
  var cards    = [];
  var lastTime = 0;
  var running  = false;

  /* ─── Set initial hidden pose (same for every card) ──────────────────── */
  function hide(s) {
    var el = s.el;
    el.style.willChange               = 'transform, opacity';
    el.style.backfaceVisibility       = 'hidden';
    el.style.webkitBackfaceVisibility = 'hidden';
    el.style.transform                = 'translate3d(0,' + SLIDE_PX + 'px,0) scale(' + START_SCALE + ')';
    el.style.opacity                  = '0';
  }

  /* ─── Target values from showTime (identical for all cards) ──────────── */
  function target(s) {
    var t       = s.showTime;
    var scale   = fit(t, 0, SHOW_DUR, START_SCALE, 1, silkyOut);
    var ty      = fit(t, 0, SHOW_DUR, SLIDE_PX, 0, silkyOut);
    var opacity = fit(t, 0, SHOW_DUR, 0, 1, silkyOut);
    return { scale: scale, ty: ty, opacity: opacity };
  }

  /* ─── Write damped values to DOM ─────────────────────────────────────── */
  function paint(s) {
    var v  = s.v;
    var el = s.el;
    el.style.transform = 'translate3d(0,' + v.ty.toFixed(2) + 'px,0) scale(' + v.scale.toFixed(4) + ')';
    el.style.opacity   = v.opacity.toFixed(4);
  }

  /* ─── RAF loop ───────────────────────────────────────────────────────── */
  function tick(now) {
    if (!running) return;

    var dt = (now - lastTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    lastTime = now;

    for (var i = 0; i < cards.length; i++) {
      var s = cards[i];

      if (s.active) {
        s.showTime += dt;
      } else {
        s.showTime -= dt * HIDE_SPEED;
        if (s.showTime < 0) s.showTime = 0;
      }

      var tgt = target(s);

      if (!s.v) {
        s.v = { scale: tgt.scale, ty: tgt.ty, opacity: tgt.opacity };
      } else {
        s.v.scale   = damp(s.v.scale,   tgt.scale,   LAMBDA, dt);
        s.v.ty      = damp(s.v.ty,      tgt.ty,      LAMBDA, dt);
        s.v.opacity = damp(s.v.opacity,  tgt.opacity, LAMBDA, dt);
      }

      if (s.showTime === 0 && s.v.opacity < 0.001) continue;

      paint(s);
    }

    requestAnimationFrame(tick);
  }

  /* ─── Init ───────────────────────────────────────────────────────────── */
  function init() {
    var els = Array.prototype.slice.call(
      document.querySelectorAll('section.resume-section')
    );
    if (!els.length) return;

    els.forEach(function (el, i) {
      var s = { el: el, index: i, showTime: 0, active: false, v: null };
      cards.push(s);
      hide(s);
    });

    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          for (var j = 0; j < cards.length; j++) {
            if (cards[j].el === entry.target) {
              cards[j].active = entry.isIntersecting;
              break;
            }
          }
        });
      }, { threshold: 0.05 });
      els.forEach(function (el) { obs.observe(el); });
    } else {
      cards.forEach(function (s) { s.active = true; });
    }

    running  = true;
    lastTime = performance.now();
    requestAnimationFrame(tick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
