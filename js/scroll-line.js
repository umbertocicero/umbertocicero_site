/**
 * Scroll-driven decorative line — Lusion-style
 *
 * Thick blue curved SVG line that draws itself with scroll.
 * Parallax effect: the line scrolls with the page but slower (like a background element).
 * Fades out as the user continues scrolling down.
 */
(function () {
  'use strict';

  var LINE_COLOR   = '#4747ff';
  var CYAN_COLOR   = '#35e6ff';
  var STROKE_WIDTH = 22;
  var PARALLAX_FACTOR = 0.35;  // 0 = fixed, 1 = scrolls with page

  var container;
  var svg, mainPath;
  var pathLength = 0;
  var currentDraw = 0;    // smoothed draw ratio
  var currentFade = 1;    // smoothed opacity

  /* ================================================================
   *  BUILD SVG
   * ================================================================ */
  function buildSVG() {
    container = document.getElementById('scroll-line-container');
    if (!container) return false;

    var vw = window.innerWidth;
    var vh = window.innerHeight;

    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', '0 0 ' + vw + ' ' + vh);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';

    var w = vw, h = vh;

        /*  Path:
         *  - più morbido (meno angoli/kink)
         *  - più alto in escursione verticale dall'ingresso all'uscita
         *  - loop ovale più pulito
         *  - onda finale con discesa, risalita alta, uscita a destra
         */

        // Loop ovale schiacciato (più morbido)
        var lx = w * 0.27;   // center X
        var ly = h * 0.69;   // center Y
        var rx = w * 0.12;   // radius X
        var ry = h * 0.16;   // radius Y (schiacciato)

        // Punto di ingresso/uscita del loop
        var crossX = lx + rx * 0.28;
        var crossY = ly - ry * 0.88;

        var d = 'M ' + (-w * 0.05) + ' ' + (h * 0.40)

          // 1) Ingresso quasi orizzontale da sinistra
          + ' C ' + (w * 0.06) + ' ' + (h * 0.39) + ', '
            + (w * 0.16) + ' ' + (h * 0.39) + ', '
            + crossX + ' ' + crossY

          // 2) Loop ovale morbido (clockwise) con tangenti più continue
          + ' C ' + (crossX + w * 0.14) + ' ' + (crossY + h * 0.16) + ', '
            + (lx + rx * 1.02) + ' ' + (ly + ry * 0.18) + ', '
            + (lx + rx * 0.76) + ' ' + (ly + ry * 0.66)
          + ' C ' + (lx + rx * 0.50) + ' ' + (ly + ry * 1.08) + ', '
            + (lx - rx * 0.35) + ' ' + (ly + ry * 1.00) + ', '
            + (lx - rx * 0.66) + ' ' + (ly + ry * 0.34)
          + ' C ' + (lx - rx * 0.97) + ' ' + (ly - ry * 0.32) + ', '
            + (crossX - w * 0.06) + ' ' + (crossY - h * 0.03) + ', '
            + crossX + ' ' + crossY

          // 3) Verso destra: prima scende (più altezza totale), più morbido nel raccordo
          + ' C ' + (crossX + w * 0.06) + ' ' + (crossY + h * 0.03) + ', '
            + (w * 0.52) + ' ' + (h * 0.78) + ', '
            + (w * 0.66) + ' ' + (h * 0.88)

          // 4) Onda alta: risale e poi ridiscende dolcemente
          + ' C ' + (w * 0.76) + ' ' + (h * 0.95) + ', '
            + (w * 0.86) + ' ' + (h * 0.86) + ', '
            + (w * 0.95) + ' ' + (h * 0.90)

          // 5) Uscita a destra leggermente in diagonale arrotondata
          + ' C ' + (w * 1.02) + ' ' + (h * 0.93) + ', '
            + (w * 1.07) + ' ' + (h * 0.97) + ', '
            + (w * 1.14) + ' ' + (h * 0.95);

    // No glow/halo: intentionally keep only the main stroke

    // Main line
    mainPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    mainPath.setAttribute('d', d);
    mainPath.setAttribute('fill', 'none');
    mainPath.setAttribute('stroke', LINE_COLOR);
    mainPath.setAttribute('stroke-width', String(STROKE_WIDTH));
    mainPath.setAttribute('stroke-linecap', 'round');
    mainPath.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(mainPath);

    // Dash setup
    pathLength = mainPath.getTotalLength();
    mainPath.style.strokeDasharray  = String(pathLength);
    mainPath.style.strokeDashoffset = String(pathLength);
    // no secondary glow path

    container.appendChild(svg);
    return true;
  }

  /* ================================================================
   *  SCROLL COMPUTATIONS — all live, no caching
   * ================================================================
   *
   *  drawRatio:  0 → 1  line draws in progressively
   *    Starts when #init-line bottom reaches viewport bottom
   *    Completes when first .resume-section bottom reaches viewport center
   *
   *  fadeRatio:  1 → 0  line fades out as user keeps scrolling
   *    Starts fading after line is fully drawn
   *    Fully gone about 1 viewport-height later
   *
   *  parallaxY:  vertical offset for parallax (px)
   *    The line shifts upward slower than the page scroll
   * ================================================================ */
  function getScrollState() {
    var initLine = document.getElementById('init-line');
    var sect     = document.querySelector('.resume-section');
    if (!initLine || !sect) return { draw: 0, fade: 1, parallaxY: 0 };

    var vh = window.innerHeight;
    var scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;

    // --- DRAW ratio ---
    var initTop = initLine.getBoundingClientRect().top;
    var sectBottom = sect.getBoundingClientRect().bottom;

    // Absolute positions
    var absInitTop = initTop + scrollY;
    var absSectBottom = sectBottom + scrollY;

    // Draw starts lower in the viewport (around 78% height)
    var drawStart = absInitTop - vh + vh * 0.22;
    // Draw ends when section bottom reaches viewport center
    var drawEnd = absSectBottom - vh * 0.5;

    if (scrollY < drawStart) {
      return { draw: 0, fade: 1, parallaxY: 0 };
    }

    var drawRange = drawEnd - drawStart;
    var draw = 0;
    if (drawRange > 0) {
      draw = (scrollY - drawStart) / drawRange;
      draw = Math.max(0, Math.min(1, draw));
    }

    // --- FADE ratio ---
    // Fade starts when line is ~80% drawn, fully gone 1.5 viewports after drawEnd
    var fadeStart = drawEnd;
    var fadeEnd   = drawEnd + vh * 1.5;
    var fade = 1;
    if (scrollY > fadeStart) {
      fade = 1 - (scrollY - fadeStart) / (fadeEnd - fadeStart);
      fade = Math.max(0, Math.min(1, fade));
    }

    // --- PARALLAX ---
    // How far we've scrolled past the init-line
    var scrollPastInit = Math.max(0, scrollY - drawStart);
    var parallaxY = -scrollPastInit * PARALLAX_FACTOR;

    return { draw: draw, fade: fade, parallaxY: parallaxY };
  }

  /* ================================================================
   *  UPDATE VISUALS
   * ================================================================ */
  function blendHexColor(hexA, hexB, t) {
    var a = hexA.replace('#', '');
    var b = hexB.replace('#', '');
    var ar = parseInt(a.substring(0, 2), 16);
    var ag = parseInt(a.substring(2, 4), 16);
    var ab = parseInt(a.substring(4, 6), 16);
    var br = parseInt(b.substring(0, 2), 16);
    var bg = parseInt(b.substring(2, 4), 16);
    var bb = parseInt(b.substring(4, 6), 16);

    var r = Math.round(ar + (br - ar) * t);
    var g = Math.round(ag + (bg - ag) * t);
    var bl = Math.round(ab + (bb - ab) * t);

    var rr = r.toString(16).padStart(2, '0');
    var gg = g.toString(16).padStart(2, '0');
    var bbHex = bl.toString(16).padStart(2, '0');
    return '#' + rr + gg + bbHex;
  }

  function updateLine(drawRatio, fadeRatio, parallaxY) {
    if (!mainPath || pathLength <= 0 || !container) return;

    // Dash offset for progressive reveal
    var offset = pathLength * (1 - drawRatio);
    mainPath.style.strokeDashoffset = String(offset);

    // Color transition: blue -> cyan as line advances
    var colorMix = Math.max(0, Math.min(1, drawRatio));
    mainPath.setAttribute('stroke', blendHexColor(LINE_COLOR, CYAN_COLOR, colorMix));

    // Opacity fade
    container.style.opacity = String(fadeRatio);

    // Parallax transform
    container.style.transform = 'translateY(' + parallaxY + 'px)';
  }

  /* ================================================================
   *  ANIMATION LOOP
   * ================================================================ */
  function tick() {
    requestAnimationFrame(tick);
    var state = getScrollState();

    // Smooth interpolation
    currentDraw += (state.draw - currentDraw) * 0.12;
    currentFade += (state.fade - currentFade) * 0.10;

    var easedDraw = Math.sqrt(currentDraw);
    updateLine(easedDraw, currentFade, state.parallaxY);
  }

  /* ================================================================
   *  RESIZE
   * ================================================================ */
  function onResize() {
    if (!container) return;
    container.innerHTML = '';
    currentDraw = 0;
    currentFade = 1;
    buildSVG();
  }

  /* ================================================================
   *  INIT
   * ================================================================ */
  function init() {
    if (!buildSVG()) return;
    window.addEventListener('resize', onResize);
    tick();
  }

  window.addEventListener('load', init);
})();
