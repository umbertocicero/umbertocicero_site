/**
 * right-scroll-line — scroll-driven decorative cyan line
 * Same architecture as left-scroll-line.js, mirrored (enters from right),
 * with cyan colour palette that gets lighter as it progresses.
 */
(function () {
  'use strict';

  /* ── Same .buf file as left-scroll-line ─────────────────── */
  var LINE_BUF_URL = 'js/buf/line_reel.buf';

  /* ── Colours: cyan start → lighter cyan end ────────── */
  var LINE_COLOR_START = '#00d4ff';
  var LINE_COLOR_END   = '#c8faff';
  var COLOR_TRANSITION_POWER = 0.62;
  var STROKE_WIDTH = 22;

  /* ── Scroll factors (tuned for the #projects section) ─ */
  var SHOW_FACTOR_START = 0.65;
  var SHOW_FACTOR_RANGE = 0.8;

  var container;
  var svg, mainPath, gradientStopEnd;
  var pathLength = 0;
  var currentDraw = 0;
  var currentOpacity = 0;
  var linePoints = null;

  /* ── Utility functions (identical to left-scroll-line.js) ── */
  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function easeQuadInOut(value) {
    var t = clamp01(value);
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function unpackValue(storageType, rawValue, from, delta) {
    var ratio;
    if (storageType === 'Int16Array') {
      ratio = (rawValue + 32768) / 65535;
    } else if (storageType === 'Uint16Array') {
      ratio = rawValue / 65535;
    } else if (storageType === 'Uint8Array') {
      ratio = rawValue / 255;
    } else {
      ratio = rawValue;
    }
    return from + delta * ratio;
  }

  function getTypeSize(storageType) {
    if (storageType === 'Int16Array' || storageType === 'Uint16Array') return 2;
    if (storageType === 'Uint8Array') return 1;
    return 4;
  }

  function readTypedRaw(dataView, offset, storageType) {
    if (storageType === 'Int16Array') return dataView.getInt16(offset, true);
    if (storageType === 'Uint16Array') return dataView.getUint16(offset, true);
    if (storageType === 'Uint8Array') return dataView.getUint8(offset);
    return dataView.getFloat32(offset, true);
  }

  function parseLineBuffer(arrayBuffer) {
    var view = new DataView(arrayBuffer);
    var headerLength = view.getInt32(0, true);
    var headerBytes = new Uint8Array(arrayBuffer, 4, headerLength);
    var headerText = new TextDecoder().decode(headerBytes);
    var header = JSON.parse(headerText);
    var offset = 4 + headerLength;
    var attributes = {};

    for (var attrIndex = 0; attrIndex < header.attributes.length; attrIndex++) {
      var attr = header.attributes[attrIndex];
      var count = (attr.id === 'indices' ? header.indexCount : header.vertexCount) * attr.componentSize;
      var values = new Float32Array(count);
      var typeSize = getTypeSize(attr.storageType);

      for (var i = 0; i < count; i++) {
        var raw = readTypedRaw(view, offset + i * typeSize, attr.storageType);
        if (attr.needsPack && attr.packedComponents) {
          var packed = attr.packedComponents[i % attr.componentSize];
          values[i] = unpackValue(attr.storageType, raw, packed.from, packed.delta);
        } else {
          values[i] = raw;
        }
      }

      offset += count * typeSize;
      attributes[attr.id] = values;
    }

    var cp = attributes.CP;
    var position = attributes.position;
    var result = [];

    for (var vertex = 0; vertex < header.vertexCount; vertex += 2) {
      var cpIndex = vertex * 3;
      var posIndex = vertex * 3 + 2;
      result.push({
        x: cp[cpIndex],
        y: cp[cpIndex + 1],
        ratio: clamp01(position[posIndex])
      });
    }

    return result;
  }

  /**
   * Build the SVG path — MIRRORED horizontally compared to left-scroll-line.js
   * so the curve enters from the RIGHT side.
   */
  function buildPathFromPoints(points, containerWidth, containerHeight) {
    if (!points || !points.length) return '';
    var minX = Infinity, maxX = -Infinity;
    var minY = Infinity, maxY = -Infinity;

    for (var k = 0; k < points.length; k++) {
      if (points[k].x < minX) minX = points[k].x;
      if (points[k].x > maxX) maxX = points[k].x;
      if (points[k].y < minY) minY = points[k].y;
      if (points[k].y > maxY) maxY = points[k].y;
    }

    var xRange = Math.max(1e-6, maxX - minX);
    var yRange = Math.max(1e-6, maxY - minY);

    /* Mirror: xFrom/xTo flipped so line enters from the right */
    var xFrom = containerWidth * 1.06;
    var xTo   = -containerWidth * 0.14;
    var yFrom = containerHeight * 0.05;
    var yTo   = containerHeight * 0.95;
    var d = '';

    for (var i = 0; i < points.length; i++) {
      var xNorm = (points[i].x - minX) / xRange;
      var yNorm = (points[i].y - minY) / yRange;

      var px = xFrom + (xTo - xFrom) * xNorm;
      var py = yFrom + (yTo - yFrom) * (1 - yNorm);
      d += (i === 0 ? 'M ' : ' L ') + px + ' ' + py;
    }

    return d;
  }

  function blendHexColor(hexA, hexB, ratio) {
    var t = clamp01(ratio);
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

    var rr = ('0' + r.toString(16)).slice(-2);
    var gg = ('0' + g.toString(16)).slice(-2);
    var bbHex = ('0' + bl.toString(16)).slice(-2);
    return '#' + rr + gg + bbHex;
  }

  function getColorMixRatio(drawRatio) {
    return clamp01(Math.pow(clamp01(drawRatio), COLOR_TRANSITION_POWER));
  }

  /* ── Build the SVG inside the section container ───── */
  function buildSVG() {
    container = document.querySelector('#projects .projects-editorial__line-reel');
    if (!container || !linePoints || !linePoints.length) return false;

    var section = document.getElementById('projects');
    var cw = section.offsetWidth;
    var ch = section.offsetHeight;

    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', '0 0 ' + cw + ' ' + ch);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';

    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    var gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'projects-line-gradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '0%');

    var stopA = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stopA.setAttribute('offset', '0%');
    stopA.setAttribute('stop-color', LINE_COLOR_START);
    gradient.appendChild(stopA);

    gradientStopEnd = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    gradientStopEnd.setAttribute('offset', '100%');
    gradientStopEnd.setAttribute('stop-color', LINE_COLOR_START);
    gradient.appendChild(gradientStopEnd);

    defs.appendChild(gradient);
    svg.appendChild(defs);

    var d = buildPathFromPoints(linePoints, cw, ch);
    if (!d) return false;

    mainPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    mainPath.setAttribute('d', d);
    mainPath.setAttribute('fill', 'none');
    mainPath.setAttribute('stroke', 'url(#projects-line-gradient)');
    mainPath.setAttribute('stroke-width', String(STROKE_WIDTH));
    mainPath.setAttribute('stroke-linecap', 'round');
    mainPath.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(mainPath);

    pathLength = mainPath.getTotalLength();
    mainPath.style.strokeDasharray  = String(pathLength);
    mainPath.style.strokeDashoffset = String(pathLength);

    container.innerHTML = '';
    container.appendChild(svg);
    return true;
  }

  /* ── Scroll state — based on #projects position ───── */
  function getScrollState() {
    var section = document.getElementById('projects');
    if (!section) return { draw: 0, opacity: 1 };

    var vh = window.innerHeight;
    var screenY = section.getBoundingClientRect().top;

    var rawShow = (-(screenY - SHOW_FACTOR_START * vh)) / (SHOW_FACTOR_RANGE * vh);
    var draw = easeQuadInOut(clamp01(rawShow));

    /* Once drawn, stays anchored — no fade-out */
    return { draw: draw, opacity: 1 };
  }

  /* ── Update line each frame ───────────────────────── */
  function updateLine(drawRatio, opacityRatio) {
    if (!mainPath || !gradientStopEnd || pathLength <= 0 || !container) return;

    var colorMix = getColorMixRatio(drawRatio);
    var dynamicEndColor = blendHexColor(LINE_COLOR_START, LINE_COLOR_END, colorMix);
    gradientStopEnd.setAttribute('stop-color', dynamicEndColor);

    var offset = pathLength * (1 - drawRatio);
    mainPath.style.strokeDashoffset = String(offset);

    container.style.opacity = String(opacityRatio);
    container.style.transform = 'translate3d(0,0,0)';
  }

  function tick() {
    requestAnimationFrame(tick);
    var state = getScrollState();

    currentDraw    += (state.draw    - currentDraw)    * 0.12;
    currentOpacity += (state.opacity - currentOpacity) * 0.14;

    updateLine(currentDraw, currentOpacity);
  }

  function onResize() {
    if (!container) return;
    container.innerHTML = '';
    currentDraw = 0;
    currentOpacity = 0;
    buildSVG();
  }

  function loadLinePoints() {
    return fetch(LINE_BUF_URL)
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.arrayBuffer();
      })
      .then(function (buffer) {
        linePoints = parseLineBuffer(buffer);
      });
  }

  function init() {
    loadLinePoints()
      .then(function () {
        if (!buildSVG()) return;
        window.addEventListener('resize', onResize);
        tick();
      })
      .catch(function () {
      });
  }

  window.addEventListener('load', init);
})();
