/**
 * Scroll-driven decorative line
 */
(function () {
  'use strict';

  var LINE_BUF_URL = 'js/buf/line_reel.buf';
  var LINE_COLOR_START = '#2a38ee';
  var LINE_COLOR_END   = '#8fe9ff';
  var COLOR_TRANSITION_POWER = 0.62;
  var STROKE_WIDTH = 22;
  var SHOW_FACTOR_START = 0.4;
  var SHOW_FACTOR_RANGE = 1.3;
  var TARGET_SELECTOR = '[data-left-line]';

  var instances = [];
  var gradientCounter = 0;
  var linePoints = null;

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

  function buildPathFromPoints(points, containerWidth, containerHeight) {
    if (!points || !points.length) return '';
    var minX = Infinity;
    var maxX = -Infinity;
    var minY = Infinity;
    var maxY = -Infinity;

    for (var k = 0; k < points.length; k++) {
      if (points[k].x < minX) minX = points[k].x;
      if (points[k].x > maxX) maxX = points[k].x;
      if (points[k].y < minY) minY = points[k].y;
      if (points[k].y > maxY) maxY = points[k].y;
    }

    var xRange = Math.max(1e-6, maxX - minX);
    var yRange = Math.max(1e-6, maxY - minY);

    /* Map to the section area where the line should live
       (roughly the About → Domains region of the page) */
    var xFrom = -containerWidth * 0.06;
    var xTo = containerWidth * 1.14;
    var yFrom = containerHeight * 0.10;
    var yTo   = containerHeight * 0.42;
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

  function buildSVG(instance) {
    if (!instance.container || !linePoints || !linePoints.length) return false;

    /* Use the track element dimensions when available, otherwise parent */
    var parent = instance.trackElement || instance.container.parentElement;
    var cw = parent ? parent.offsetWidth  : window.innerWidth;
    var ch = parent ? parent.offsetHeight : window.innerHeight;
    if (cw <= 0 || ch <= 0) return false;

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', '0 0 ' + cw + ' ' + ch);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';

    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    var gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    var gradientId = 'left-scroll-line-gradient-' + (++gradientCounter);
    gradient.setAttribute('id', gradientId);
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '0%');

    var stopA = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stopA.setAttribute('offset', '0%');
    stopA.setAttribute('stop-color', LINE_COLOR_START);
    gradient.appendChild(stopA);

    var gradientStopEnd = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    gradientStopEnd.setAttribute('offset', '100%');
    gradientStopEnd.setAttribute('stop-color', LINE_COLOR_START);
    gradient.appendChild(gradientStopEnd);

    defs.appendChild(gradient);
    svg.appendChild(defs);

    var d = buildPathFromPoints(linePoints, cw, ch);
    if (!d) return false;

    var mainPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    mainPath.setAttribute('d', d);
    mainPath.setAttribute('fill', 'none');
    mainPath.setAttribute('stroke', 'url(#' + gradientId + ')');
    mainPath.setAttribute('stroke-width', String(STROKE_WIDTH));
    mainPath.setAttribute('stroke-linecap', 'round');
    mainPath.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(mainPath);

    var pathLength = mainPath.getTotalLength();
    mainPath.style.strokeDasharray  = String(pathLength);
    mainPath.style.strokeDashoffset = String(pathLength);

    instance.container.innerHTML = '';
    instance.container.appendChild(svg);
    instance.svg = svg;
    instance.mainPath = mainPath;
    instance.gradientStopEnd = gradientStopEnd;
    instance.pathLength = pathLength;
    return true;
  }

  function getScrollState(instance) {
    if (!instance.scrollTarget) return { draw: 0, opacity: 1 };

    var vh = window.innerHeight;
    var screenY = instance.scrollTarget.getBoundingClientRect().top;

    var rawShow = (-(screenY - SHOW_FACTOR_START * vh)) / (SHOW_FACTOR_RANGE * vh);
    var draw = easeQuadInOut(clamp01(rawShow));

    /* Once drawn, stays anchored — no fade-out */
    return { draw: draw, opacity: 1 };
  }

  function updateLine(instance, drawRatio, opacityRatio) {
    if (!instance.mainPath || !instance.gradientStopEnd || instance.pathLength <= 0 || !instance.container) return;

    var colorMix = getColorMixRatio(drawRatio);
    var dynamicEndColor = blendHexColor(LINE_COLOR_START, LINE_COLOR_END, colorMix);
    instance.gradientStopEnd.setAttribute('stop-color', dynamicEndColor);

    var offset = instance.pathLength * (1 - drawRatio);
    instance.mainPath.style.strokeDashoffset = String(offset);

    instance.container.style.opacity = String(opacityRatio);
  }

  function tick() {
    requestAnimationFrame(tick);
    for (var i = 0; i < instances.length; i++) {
      var instance = instances[i];
      var state = getScrollState(instance);
      instance.currentDraw += (state.draw - instance.currentDraw) * 0.12;
      instance.currentOpacity += (state.opacity - instance.currentOpacity) * 0.14;
      updateLine(instance, instance.currentDraw, instance.currentOpacity);
    }
  }

  function onResize() {
    for (var i = 0; i < instances.length; i++) {
      var instance = instances[i];
      if (!instance.container) continue;
      instance.currentDraw = 0;
      instance.currentOpacity = 0;
      buildSVG(instance);
    }
  }

  function resolveLegacyTargets() {
    var legacyContainer = document.getElementById('left-scroll-line-container');
    if (!legacyContainer) return [];
    return [legacyContainer];
  }

  function resolveTargets() {
    var matches = document.querySelectorAll(TARGET_SELECTOR);
    if (matches.length) return matches;
    return resolveLegacyTargets();
  }

  function buildInstances() {
    instances = [];
    var targets = resolveTargets();

    for (var i = 0; i < targets.length; i++) {
      var container = targets[i];
      var trackSelector = container.getAttribute('data-left-line-track');
      var trackElement = trackSelector ? document.querySelector(trackSelector) : (container.parentElement || container);
      var scrollSelector = container.getAttribute('data-left-line-scroll-target');
      var scrollTarget = scrollSelector ? document.querySelector(scrollSelector) : document.getElementById('init-line');

      var instance = {
        container: container,
        trackElement: trackElement,
        scrollTarget: scrollTarget,
        svg: null,
        mainPath: null,
        gradientStopEnd: null,
        pathLength: 0,
        currentDraw: 0,
        currentOpacity: 0
      };

      if (buildSVG(instance)) instances.push(instance);
    }
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
        buildInstances();
        if (!instances.length) return;
        window.addEventListener('resize', onResize);
        tick();
      })
      .catch(function () {
      });
  }

  window.addEventListener('load', init);
})();
