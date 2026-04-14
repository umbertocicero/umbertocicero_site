/* ═══════════════════════════════════════════════════════
   GeoDominion — Map Renderer  (SVG Inline)
   Fetches the real-world SVG, injects it, colours territories,
   handles zoom/pan, hover/click, centroid computation.
   ═══════════════════════════════════════════════════════ */

const MapRenderer = (() => {
    /* ── refs ── */
    let svgEl      = null;   // the <svg> element in DOM
    let container   = null;   // #map-container
    let fxCanvas    = null;   // overlay for animations
    let fxCtx       = null;

    /* ── transform state ── */
    let scale     = 1;
    let panX      = 0;
    let panY      = 0;
    let dragging  = false;
    let dragStart = { x:0, y:0 };
    const MIN_ZOOM = 0.4;
    const MAX_ZOOM = 8;

    /* ── caches ── */
    const centroidCache = {};   // code → {x,y} in SVG coords
    const pathCache     = {};   // code → element(s)
    let   _ctmCache     = null; // cached getScreenCTM result
    let   _crCache      = null; // cached container bounding rect

    /* ── callbacks (set by UI) ── */
    let onTerritoryClick = null;
    let onTerritoryHover = null;
    let onTerritoryLeave = null;
    let onTerritoryTap   = null;   // mobile-only: single-tap (for tooltip)

    /* ════════════════ INIT ════════════════ */
    async function init() {
        container = document.getElementById('map-container');
        fxCanvas  = document.getElementById('fx-canvas');
        fxCtx     = fxCanvas.getContext('2d');

        resizeFx();
        window.addEventListener('resize', resizeFx);

        /* Fetch SVG and strip the embedded <style> block BEFORE inserting,
           so no CSS fill rule ever competes with our JS coloring. */
        const resp = await fetch('svg/BlankMap-World-Flattened.svg');
        let text = await resp.text();
        text = text.replace(/<style[\s\S]*?<\/style>/gi, '');

        /* Insert SVG via innerHTML — simpler and more reliable than
           DOMParser + adoptNode which can break ID lookups and .style access. */
        const wrapper = document.createElement('div');
        wrapper.id = 'svg-wrapper';
        wrapper.innerHTML = text;

        svgEl = wrapper.querySelector('svg');
        if (!svgEl) { console.error('SVG not found after innerHTML insert'); return; }

        /* Let viewBox drive the vector resolution — remove fixed pixel
           width/height attributes that constrain the rasterization size */
        svgEl.removeAttribute('width');
        svgEl.removeAttribute('height');
        svgEl.style.width  = '100%';
        svgEl.style.height = '100%';
        svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        container.insertBefore(wrapper, fxCanvas);

        /* Override the SVG internal styles for our dark theme */
        injectSVGStyles();

        /* Cache all territory elements */
        cacheElements();

        /* Bind interactions */
        bindMouse();
        bindTouch();

        /* Observe container resize for canvas (game-screen starts hidden) */
        observeResize();

        /* Initial colour pass (all neutral gray) */
        colourAllTerritories();

        /* Center the map nicely */
        resetView();
    }

    /* ════════════════ SVG STYLE OVERRIDE ════════════════ */
    function injectSVGStyles() {
        const defs = svgEl.querySelector('defs') || (() => {
            const d = document.createElementNS('http://www.w3.org/2000/svg','defs');
            svgEl.prepend(d); return d;
        })();

        /* Original <style> was already stripped from the SVG text before parsing.
           Inject our own styles (stroke, hover, selection — NO fill for .land). */
        const style = document.createElementNS('http://www.w3.org/2000/svg','style');
        style.textContent = `
            .ocean { fill: #0a1628 !important; stroke: none; }
            .land  {
                stroke: #0d1b2a; stroke-width: 0.5; cursor: pointer;
                transition: fill 0.3s ease, stroke 0.2s ease, stroke-width 0.2s ease;
            }
            .land path { transition: fill 0.3s ease; }
            .land:hover { stroke: #00e5ff; stroke-width: 1.4; opacity: 0.92; }
            .lake  { fill: #0e2240 !important; stroke: none; }
            .aq    { fill: #1a2a3a !important; stroke: #0d1b2a; stroke-width: 0.3; }
            .circle { display: none !important; }
            .circle.micro-island {
                display: block !important;
                opacity: 0.35;
                stroke: rgba(255,255,255,0.3);
                stroke-width: 0.5;
                cursor: pointer;
            }
            .circle.micro-island:hover { opacity: 0.55; stroke: #00e5ff; stroke-width: 1; }
            .territory-selected { stroke: #ffd700 !important; stroke-width: 2.5 !important; }
            @keyframes playerGlow {
                0%, 100% { stroke-opacity: 1; stroke-width: 1.8; }
                50%      { stroke-opacity: 0.65; stroke-width: 2.4; }
            }
            .territory-player path, path.territory-player {
                stroke: #00e5ff !important; stroke-width: 1.8 !important;
                animation: playerGlow 2.5s ease-in-out infinite;
            }
            .territory-player {
                stroke: #00e5ff !important; stroke-width: 1.8 !important;
                animation: playerGlow 2.5s ease-in-out infinite;
            }
            .garrison-overlay { will-change: transform; }
        `;
        defs.appendChild(style);
    }

    /* ════════════════ CACHE ELEMENTS ════════════════ */
    const idSet = new Set(SVG_IDS);  /* O(1) territory id lookups */

    const MICRO_ISLAND_THRESHOLD = 120; /* SVG area below which a territory is considered a micro-island */
    const microIslandSet = new Set();   /* codes of tiny island territories (no garrison marker) */

    function cacheElements() {
        let cached = 0;

        /* STRATEGY: Walk every <g> inside the SVG and check its id.
           This avoids querySelector/getElementById issues after
           DOMParser + adoptNode which can break ID lookup tables. */
        const allGroups = svgEl.querySelectorAll('g');

        allGroups.forEach(g => {
            const gId = g.getAttribute('id');
            if (gId && idSet.has(gId)) {
                pathCache[gId] = g;
                cached++;
                /* Set default fill so territories aren't black */
                g.setAttribute('fill', '#2a3a4a');
                g.querySelectorAll('path').forEach(p => p.setAttribute('fill', '#2a3a4a'));
                /* Remove any existing <title> to avoid native browser tooltip
                   (we use a custom tooltip via UI instead) */
                const existingTitle = g.querySelector('title');
                if (existingTitle) existingTitle.remove();

                /* Detect micro-islands: if the largest non-circle land path has
                   a tiny bounding box, show the .circle element so users can click */
                _detectMicroIsland(g);
            }
        });

        /* Also check for bare <path> elements with territory ids
           (some territories might not be wrapped in <g>) */
        const allPaths = svgEl.querySelectorAll('path');
        allPaths.forEach(p => {
            const pId = p.getAttribute('id');
            if (pId && idSet.has(pId) && !pathCache[pId]) {
                pathCache[pId] = p;
                cached++;
                p.setAttribute('fill', '#2a3a4a');
                /* Remove any existing <title> to avoid native browser tooltip */
                const existingTitleP = p.querySelector('title');
                if (existingTitleP) existingTitleP.remove();
            }
        });
    }

    /** For <g> territories with tiny land paths, un-hide the .circle element
     *  so users can actually click on small island territories. */
    function _detectMicroIsland(gEl) {
        const circlePath = gEl.querySelector('path.circle');
        if (!circlePath) return; /* no circle element → nothing to do */

        /* Measure the largest non-circle land path */
        let maxArea = 0;
        gEl.querySelectorAll('path.land').forEach(p => {
            try {
                const b = p.getBBox();
                maxArea = Math.max(maxArea, b.width * b.height);
            } catch {}
        });

        if (maxArea < MICRO_ISLAND_THRESHOLD) {
            /* This is a micro-island — show the circle marker */
            circlePath.classList.add('micro-island');
            const gId = gEl.getAttribute('id');
            if (gId) microIslandSet.add(gId);
        }
    }

    /* ════════════════ COLOURING ════════════════ */
    /** Set fill via attribute only — the embedded SVG <style> was already
     *  stripped during init, so no CSS specificity battle.  Skipping
     *  .style.fill halves the property write cost. */
    function forceFill(el, color) {
        el.setAttribute('fill', color);
    }

    /* Cache child <path> lists per territory to avoid querySelectorAll every frame */
    const childPathCache = {};
    /* Track last applied colour to skip no-ops */
    const lastColour = {};

    function colourTerritory(code, color) {
        if (lastColour[code] === color) return;  /* skip if unchanged */
        lastColour[code] = color;
        const el = pathCache[code];
        if (!el) return;
        const tag = (el.tagName || '').toLowerCase();
        if (tag === 'g') {
            forceFill(el, color);
            if (!childPathCache[code]) childPathCache[code] = [...el.querySelectorAll('path')];
            childPathCache[code].forEach(p => forceFill(p, color));
        } else {
            forceFill(el, color);
        }
    }

    /* Debounce colourAllTerritories — coalesces multiple calls into one rAF */
    let _colourRaf = 0;

    function colourAllTerritories() {
        if (_colourRaf) return;
        _colourRaf = requestAnimationFrame(_doColourAll);
    }

    /* Track which territories have the player class to avoid classList thrashing */
    const _playerClassSet = new Set();

    function _doColourAll() {
        _colourRaf = 0;
        if (typeof GameEngine === 'undefined') return;
        const state = GameEngine.getState();
        if (!state || !state.territories) return;

        const playerCode = state.player;

        for (const code of SVG_IDS) {
            const owner = state.territories[code];
            if (owner) {
                const n = state.nations[owner] || getNation(owner);
                colourTerritory(code, n.color);
                /* Only toggle classList when the state actually changed */
                if (owner === playerCode) {
                    if (!_playerClassSet.has(code)) {
                        const el = pathCache[code];
                        if (el) { el.classList.add('territory-player'); _playerClassSet.add(code); }
                    }
                } else {
                    if (_playerClassSet.has(code)) {
                        const el = pathCache[code];
                        if (el) { el.classList.remove('territory-player'); _playerClassSet.delete(code); }
                    }
                }
            } else {
                colourTerritory(code, '#2a3a4a');
            }
        }

        updateGarrisonOverlay();
    }

    /* ════════════════ SELECTION ════════════════ */
    let selectedCode = null;

    function selectTerritory(code) {
        /* Deselect previous */
        if (selectedCode && pathCache[selectedCode]) {
            pathCache[selectedCode].classList.remove('territory-selected');
        }
        selectedCode = code;
        if (code && pathCache[code]) {
            pathCache[code].classList.add('territory-selected');
        }
    }

    function getSelected() { return selectedCode; }

    /* ════════════════ CENTROIDS ════════════════ */

    /** Manual centroid overrides for territories whose bounding-box center
     *  falls outside their actual land area (concave, crescent-shaped, or
     *  split territories like Norway, Croatia, Chile, Malaysia, etc.).
     *  Values are { dx, dy } offsets applied to the computed bbox center,
     *  OR absolute { x, y } when prefixed with 'abs'. */
    const CENTROID_OFFSETS = {
        /* Norway: bbox center lands on Sweden because the mainland path
           spans wide (fjords + Svalbard); shift marker far left */
        no: { dx: -0.35, dy: 0.20 },
        /* Croatia: concave crescent shape — center falls in Bosnia */
        hr: { dx: -0.20, dy: -0.15 },
        /* Chile: very tall & thin — center okay horizontally but
           bbox may include distant islands; nudge slightly */
        cl: { dx: 0.10, dy: 0 },
        /* Malaysia: split between Malay Peninsula & Borneo */
        my: { dx: -0.25, dy: 0 },
        /* Indonesia: huge archipelago — center may land in the sea */
        id: { dx: -0.15, dy: 0 },
        /* USA: Alaska pulls bbox far left; nudge right to lower 48 */
        us: { dx: 0.15, dy: 0.20 },
        /* Eritrea: bbox center falls on Sudan; shift right to Red Sea coast */
        er: { dx: 0.35, dy: 0.15 },
    };

    function getCentroid(code) {
        if (centroidCache[code]) return centroidCache[code];
        const el = pathCache[code];
        if (!el) return null;
        try {
            const tag = (el.tagName || '').toLowerCase();
            let bestPath = el;

            /* For <g> with multiple <path> children, find the LARGEST path
               (mainland) to avoid the centroid landing in the ocean due to
               tiny far-away islands skewing the overall bounding box. */
            if (tag === 'g') {
                const paths = el.querySelectorAll('path');
                if (paths.length > 1) {
                    let maxArea = 0;
                    paths.forEach(p => {
                        try {
                            const b = p.getBBox();
                            const area = b.width * b.height;
                            if (area > maxArea) { maxArea = area; bestPath = p; }
                        } catch {}
                    });
                } else if (paths.length === 1) {
                    bestPath = paths[0];
                }
            }

            const bbox = bestPath.getBBox();
            let px = bbox.x + bbox.width / 2;
            let py = bbox.y + bbox.height / 2;

            /* Apply manual offset for problematic territories */
            const off = CENTROID_OFFSETS[code];
            if (off) {
                px += bbox.width  * (off.dx || 0);
                py += bbox.height * (off.dy || 0);
            }

            const pt = { x: px, y: py };
            centroidCache[code] = pt;
            return pt;
        } catch { return null; }
    }

    /** Convert SVG coordinate to screen pixel (for FX canvas).
     *  Uses a cached CTM to avoid forced-layout from repeated getScreenCTM(). */
    function svgToScreen(svgX, svgY) {
        if (!svgEl) return null;
        try {
            if (!_ctmCache) {
                _ctmCache = svgEl.getScreenCTM();
                _crCache  = container.getBoundingClientRect();
            }
            const ctm = _ctmCache;
            if (!ctm) return null;
            /* Manual matrix transform — avoids createSVGPoint overhead */
            const sx = ctm.a * svgX + ctm.c * svgY + ctm.e;
            const sy = ctm.b * svgX + ctm.d * svgY + ctm.f;
            const result = { x: sx - _crCache.left, y: sy - _crCache.top };
            if (isNaN(result.x) || isNaN(result.y)) return null;
            return result;
        } catch (e) {
            return null;
        }
    }

    /** Get screen position of a territory centroid (for animations) */
    function getTerritoryScreenPos(code) {
        const c = getCentroid(code);
        if (!c) return null;
        return svgToScreen(c.x, c.y);
    }

    /* ════════════════ ZOOM / PAN ════════════════ */
    function clampPan() {
        /* Prevent panning map completely off-screen:
           keep at least 30% of the map visible within the container */
        if (!container || !svgEl) return;
        const cRect = container.getBoundingClientRect();
        const mapW = cRect.width * scale;
        const mapH = cRect.height * scale;
        const margin = 0.3; // 30% must stay visible
        const minX = -(mapW * (1 - margin));
        const maxX = cRect.width * (1 - margin);
        const minY = -(mapH * (1 - margin));
        const maxY = cRect.height * (1 - margin);
        panX = Math.max(minX, Math.min(maxX, panX));
        panY = Math.max(minY, Math.min(maxY, panY));
    }

    let _rafRescale = 0;
    let _rasterTimer = 0;       // debounce for re-rasterization after zoom settles
    let _interacting = false;   // true while user is actively panning/zooming

    /** Promote wrapper to GPU layer for smooth interaction */
    function _beginInteraction() {
        if (_interacting) return;
        _interacting = true;
        const wrapper = document.getElementById('svg-wrapper');
        if (wrapper) wrapper.style.willChange = 'transform';
    }

    /** After interaction settles, remove will-change and force browser
     *  to re-rasterize the SVG at the current zoom level so paths stay
     *  crisp instead of being a scaled-up blurry texture.  */
    function _scheduleRasterize() {
        if (_rasterTimer) clearTimeout(_rasterTimer);
        _rasterTimer = setTimeout(() => {
            _rasterTimer = 0;
            _interacting = false;
            const wrapper = document.getElementById('svg-wrapper');
            if (!wrapper) return;
            /* Drop GPU layer hint — browser re-rasterizes at current size */
            wrapper.style.willChange = 'auto';
        }, 200);  // 200ms after last interaction
    }

    function applyTransform() {
        clampPan();
        /* Invalidate CTM cache — transform changed */
        _ctmCache = null;
        _crCache  = null;
        /* Promote to GPU layer while interacting */
        _beginInteraction();
        const wrapper = document.getElementById('svg-wrapper');
        if (wrapper) {
            wrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
            wrapper.style.transformOrigin = '0 0';
        }
        /* Schedule re-rasterization after interaction ends */
        _scheduleRasterize();
        /* Throttle garrison rescale to one per animation frame */
        if (!_rafRescale) {
            _rafRescale = requestAnimationFrame(() => {
                _rafRescale = 0;
                rescaleGarrisonOverlay();
            });
        }
    }

    function resetView() {
        scale = 1; panX = 0; panY = 0;
        applyTransform();
    }

    function zoomTo(newScale, cx, cy) {
        newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));
        const ratio = newScale / scale;
        panX = cx - ratio * (cx - panX);
        panY = cy - ratio * (cy - panY);
        scale = newScale;
        applyTransform();
    }

    /* ════════════════ MOUSE / TOUCH ════════════════ */
    function bindMouse() {
        container.addEventListener('wheel', e => {
            e.preventDefault();
            const rect = container.getBoundingClientRect();
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            zoomTo(scale * delta, cx, cy);
        }, { passive: false });

        container.addEventListener('mousedown', e => {
            if (e.button === 0) {
                dragging = true;
                dragStart = { x: e.clientX - panX, y: e.clientY - panY };
                container.style.cursor = 'grabbing';
            }
        });

        window.addEventListener('mousemove', e => {
            if (dragging) {
                panX = e.clientX - dragStart.x;
                panY = e.clientY - dragStart.y;
                applyTransform();
            }
        });

        window.addEventListener('mouseup', () => {
            dragging = false;
            if (container) container.style.cursor = 'grab';
        });

        /* Walk up from el through ancestor <g id="…"> elements and return
           the first id that belongs to idSet, or null. This handles SVG
           territories that contain nested <g> sub-groups (e.g. Greenland). */
        function _resolveTerritory(el) {
            if (!el) return null;
            let cur = el.closest('[id]');
            while (cur && svgEl.contains(cur)) {
                if (idSet.has(cur.id)) return cur.id;
                /* Move to next ancestor with an id */
                const parent = cur.parentElement;
                cur = parent ? parent.closest('[id]') : null;
            }
            return null;
        }

        /* Delegated click & hover on SVG paths */
        container.addEventListener('click', e => {
            /* Skip synthetic click from touch — handled via onTap */
            if (container._suppressNextClick) { container._suppressNextClick = false; return; }
            const finalCode = _resolveTerritory(e.target);
            if (finalCode) {
                if (onTerritoryClick) onTerritoryClick(finalCode, e);
            }
        });

        container.addEventListener('mousemove', e => {
            if (dragging) return;
            const code = _resolveTerritory(e.target);
            if (code) {
                if (onTerritoryHover) onTerritoryHover(code, e);
            } else {
                if (onTerritoryLeave) onTerritoryLeave();
            }
        });

        container.addEventListener('mouseleave', () => {
            if (onTerritoryLeave) onTerritoryLeave();
        });
    }

    function bindTouch() {
        let lastDist = 0;
        let lastMid  = { x:0, y:0 };
        /* Tap detection */
        let tapStartPos  = null;
        let tapStartTime = 0;
        let didDrag      = false;
        const TAP_THRESHOLD = 12;   // px
        const TAP_MAX_MS    = 300;  // max duration for a tap

        /** Check if a touch target is inside a scrollable overlay (e.g. map-legend) */
        function _isScrollableChild(el) {
            return el && el.closest('.map-legend');
        }

        container.addEventListener('touchstart', e => {
            if (_isScrollableChild(e.target)) return; // let legend scroll
            if (e.touches.length === 1) {
                dragging = true;
                didDrag  = false;
                dragStart = { x: e.touches[0].clientX - panX, y: e.touches[0].clientY - panY };
                tapStartPos  = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                tapStartTime = Date.now();
            } else if (e.touches.length === 2) {
                dragging = false;
                didDrag  = true;
                lastDist = Math.hypot(e.touches[1].clientX - e.touches[0].clientX,
                                      e.touches[1].clientY - e.touches[0].clientY);
                const cr = container.getBoundingClientRect();
                lastMid = {
                    x: (e.touches[0].clientX + e.touches[1].clientX) / 2 - cr.left,
                    y: (e.touches[0].clientY + e.touches[1].clientY) / 2 - cr.top
                };
            }
        }, { passive: true });

        container.addEventListener('touchmove', e => {
            if (_isScrollableChild(e.target)) return; // let legend scroll natively
            e.preventDefault();
            if (e.touches.length === 1 && dragging) {
                const dx = e.touches[0].clientX - (tapStartPos ? tapStartPos.x : 0);
                const dy = e.touches[0].clientY - (tapStartPos ? tapStartPos.y : 0);
                if (Math.abs(dx) > TAP_THRESHOLD || Math.abs(dy) > TAP_THRESHOLD) didDrag = true;
                panX = e.touches[0].clientX - dragStart.x;
                panY = e.touches[0].clientY - dragStart.y;
                applyTransform();
            } else if (e.touches.length === 2) {
                didDrag = true;
                const dist = Math.hypot(e.touches[1].clientX - e.touches[0].clientX,
                                        e.touches[1].clientY - e.touches[0].clientY);
                const pinchScale = dist / lastDist;
                lastDist = dist;
                const cr = container.getBoundingClientRect();
                const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - cr.left;
                const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - cr.top;
                zoomTo(scale * pinchScale, mx, my);
            }
        }, { passive: false });

        container.addEventListener('touchend', e => {
            dragging = false;
            /* Detect tap (short, no drag) */
            if (!didDrag && tapStartPos && (Date.now() - tapStartTime) < TAP_MAX_MS && e.changedTouches.length > 0) {
                const touch = e.changedTouches[0];
                const el = document.elementFromPoint(touch.clientX, touch.clientY);
                if (el) {
                    const finalCode = _resolveTerritory(el);
                    if (finalCode && onTerritoryTap) {
                        onTerritoryTap(finalCode, { clientX: touch.clientX, clientY: touch.clientY });
                        /* Suppress the synthetic click that would follow */
                        container._suppressNextClick = true;
                        setTimeout(() => { container._suppressNextClick = false; }, 400);
                    }
                }
            }
            tapStartPos = null;
        });
    }

    /* ════════════════ FX CANVAS ════════════════ */
    function resizeFx() {
        if (!fxCanvas || !container) return;
        /* Invalidate CTM cache on resize */
        _ctmCache = null;
        _crCache  = null;
        const w = container.clientWidth;
        const h = container.clientHeight;
        /* Only resize if dimensions actually changed — setting canvas.width/height
           clears the entire canvas content, which would erase in-flight animations */
        if (w > 0 && h > 0 && (fxCanvas.width !== w || fxCanvas.height !== h)) {
            fxCanvas.width  = w;
            fxCanvas.height = h;
        }
    }

    /* Start observing container size for when game screen becomes visible */
    function observeResize() {
        if (!container) return;
        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(() => resizeFx());
            ro.observe(container);
        }
    }

    function getFxCtx() { return fxCtx; }
    function getFxCanvas() { return fxCanvas; }

    /* ════════════════ HIGHLIGHT FLASH ════════════════ */
    function flashTerritory(code, color, duration = 600) {
        const el = pathCache[code];
        if (!el) return;
        const tag = (el.tagName || '').toLowerCase();
        const paths = tag === 'g' ? (childPathCache[code] || (childPathCache[code] = [...el.querySelectorAll('path')])) : [el];
        paths.forEach(p => forceFill(p, color));
        if (tag === 'g') forceFill(el, color);
        /* Invalidate colour cache so next colourTerritory actually applies */
        delete lastColour[code];
        setTimeout(() => {
            /* Re-read current owner color from game state (ownership may have changed during flash) */
            let restoreColor = '#2a3a4a';
            if (typeof GameEngine !== 'undefined') {
                const st = GameEngine.getState();
                if (st && st.territories[code]) {
                    const owner = st.territories[code];
                    const n = st.nations[owner] || getNation(owner);
                    restoreColor = n?.color || '#2a3a4a';
                }
            }
            colourTerritory(code, restoreColor);
        }, duration);
    }

    /* ════════════════ GARRISON OVERLAY — Clean & Simple ════════════════
       Show ONE clear emoji icon per territory with troop count.
       Bright, readable, child-friendly. No tiny SVG paths.
       ══════════════════════════════════════════════════════════════════ */
    const garrisonLayer = {};   // code → SVG <g> element

    /* Emoji icons by unit type — big, clear, universally recognizable */
    const UNIT_EMOJI = {
        infantry:        '🪖',
        tank:            '⚙️',
        artillery:       '💥',
        fighter:         '✈️',
        bomber:          '🛩️',
        drone:           '🤖',
        navy:            '🚢',
        submarine:       '🐟',
        cruiseMissile:   '🚀',
        ballisticMissile:'☄️',
        sam:             '📡',
        nuke:            '☢️'
    };

    /* Map unit types → local Twemoji SVG filenames for crisp rendering */
    const UNIT_SVG = {
        infantry:        'assets/emoji/1fa96.svg',
        tank:            'assets/emoji/1f69c.svg',
        artillery:       'assets/emoji/1f4a5.svg',
        fighter:         'assets/emoji/2708-fe0f.svg',
        bomber:          'assets/emoji/1f6e9-fe0f.svg',
        drone:           'assets/emoji/1f916.svg',
        navy:            'assets/emoji/1f6a2.svg',
        submarine:       'assets/emoji/1f41f.svg',
        cruiseMissile:   'assets/emoji/1f680.svg',
        ballisticMissile:'assets/emoji/2604-fe0f.svg',
        sam:             'assets/emoji/1f4e1.svg',
        nuke:            'assets/emoji/2622-fe0f.svg'
    };

    /** Return the best URL for a unit-type emoji SVG.
     *  If the global blob cache (warmed by UI._warmSvgBlobCache) has an
     *  in-memory blob: URL, use it — zero HTTP overhead.
     *  Otherwise fall back to the file path (browser cache). */
    function _unitSvgUrl(type) {
        const filePath = UNIT_SVG[type] || UNIT_SVG.infantry;
        const cache = window._svgBlobCache;
        if (cache) {
            const icon = filePath.slice(13).replace(/\.svg$/i, ''); // strip 'assets/emoji/' prefix
            const blob = cache.get(icon);
            if (blob) return blob;
        }
        return filePath;
    }

    /* Strength → background color (vibrant, high contrast) */
    const STRENGTH_COLORS = {
        heavy:  { bg: 'rgba(0,230,118,0.85)', ring: '#00e676', text: '#fff', stroke: 'rgba(0,0,0,0.6)' },  // bright green
        medium: { bg: 'rgba(255,215,64,0.85)', ring: '#ffd740', text: '#fff', stroke: 'rgba(0,0,0,0.7)' },  // gold
        light:  { bg: 'rgba(255,145,0,0.80)',  ring: '#ff9100', text: '#fff', stroke: 'rgba(0,0,0,0.6)' },  // orange
        none:   { bg: 'rgba(120,120,120,0.6)', ring: '#9e9e9e', text: '#fff', stroke: 'rgba(0,0,0,0.5)' }   // grey
    };

    /* Track last garrison state to skip unchanged territories.
       Key format: 'strength|roundedTotal|dominantType' — when this hasn't
       changed, we skip the entire DOM update (including href) so no
       browser re-fetches are triggered for the same <image> element. */
    const _lastGarrison = {};  // code → key string

    function updateGarrisonOverlay() {
        if (typeof GameEngine === 'undefined') return;
        const state = GameEngine.getState();
        if (!state) return;
        if (!svgEl) return;

        /* Gather all garrison data — uses cached getGarrisons per nation */
        const majorCodes = typeof NATIONS !== 'undefined' ? Object.keys(NATIONS) : [];
        const allGarrisons = {};
        for (let i = 0; i < majorCodes.length; i++) {
            const code = majorCodes[i];
            const n = state.nations[code];
            if (!n || !n.alive) continue;
            const g = GameEngine.getGarrisons(code);
            /* Inline Object.assign for performance */
            for (const k in g) allGarrisons[k] = g[k];
        }

        /* Collect removals first, then batch-remove outside the main loop
           to avoid interleaving DOM reads/writes */
        const toRemove = [];

        for (const code of SVG_IDS) {
            const garrison = allGarrisons[code];

            const isMicro = microIslandSet.has(code);
            const owner = state.territories[code];
            const skipGarrison = isMicro && owner && owner !== code;

            if (!garrison || garrison.total === 0 || skipGarrison) {
                if (garrisonLayer[code]) {
                    toRemove.push(code);
                }
                continue;
            }

            const centroid = getCentroid(code);
            if (!centroid) continue;

            /* Skip if unchanged since last update */
            const roundedTotal = Math.round(garrison.total);
            const key = `${garrison.strength}|${roundedTotal}|${garrison.dominant}`;
            if (_lastGarrison[code] === key && garrisonLayer[code]) continue;
            _lastGarrison[code] = key;

            const strength = garrison.strength || 'none';
            const colors = STRENGTH_COLORS[strength] || STRENGTH_COLORS.none;
            const sz = strength === 'heavy' ? 26 : strength === 'medium' ? 22 : 18;
            const emojiSize = sz * 1.1;
            const numSize = sz * 0.7;
            const cx = centroid.x;
            const cy = centroid.y;
            const badgeW = sz * 2.8;
            const badgeH = sz * 1.6;

            /* Resolve emoji URL once (may be blob: or file path) */
            const emojiSvg = _unitSvgUrl(garrison.dominant);

            let gEl = garrisonLayer[code];
            let badge, emojiImg, numText;

            if (!gEl) {
                /* Create new garrison element — set ALL static attributes once */
                gEl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                gEl.setAttribute('class', 'garrison-overlay');
                gEl.setAttribute('pointer-events', 'none');

                badge = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                badge.setAttribute('stroke-width', '1.5');

                emojiImg = document.createElementNS('http://www.w3.org/2000/svg', 'image');

                numText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                numText.setAttribute('text-anchor', 'middle');
                numText.setAttribute('font-family', 'Arial Black, sans-serif');
                numText.setAttribute('font-weight', '900');
                numText.setAttribute('paint-order', 'stroke');
                numText.setAttribute('stroke-width', '2.5');

                gEl.appendChild(badge);
                gEl.appendChild(emojiImg);
                gEl.appendChild(numText);
                svgEl.appendChild(gEl);
                garrisonLayer[code] = gEl;
            } else {
                badge = gEl.childNodes[0];
                emojiImg = gEl.childNodes[1];
                numText = gEl.childNodes[2];
            }

            gEl._cx = cx;
            gEl._cy = cy;

            /* Dynamic attributes — only what changes between updates */
            badge.setAttribute('x', cx - badgeW / 2);
            badge.setAttribute('y', cy - badgeH / 2);
            badge.setAttribute('width', badgeW);
            badge.setAttribute('height', badgeH);
            badge.setAttribute('rx', badgeH / 2);
            badge.setAttribute('ry', badgeH / 2);
            badge.setAttribute('fill', colors.bg);
            badge.setAttribute('stroke', colors.ring);

            if (emojiImg.getAttribute('href') !== emojiSvg) {
                emojiImg.setAttribute('href', emojiSvg);
            }
            emojiImg.setAttribute('x', cx - badgeW * 0.2 - emojiSize * 0.5);
            emojiImg.setAttribute('y', cy - emojiSize * 0.5);
            emojiImg.setAttribute('width', emojiSize);
            emojiImg.setAttribute('height', emojiSize);

            numText.setAttribute('x', cx + badgeW * 0.22);
            numText.setAttribute('y', cy + numSize * 0.4);
            numText.setAttribute('font-size', numSize);
            numText.setAttribute('fill', colors.text);
            numText.setAttribute('stroke', colors.stroke);
            numText.textContent = roundedTotal;
        }

        /* Batch DOM removals — avoids layout thrashing from interleaved add/remove */
        for (let i = 0; i < toRemove.length; i++) {
            const code = toRemove[i];
            garrisonLayer[code].remove();
            delete garrisonLayer[code];
            delete _lastGarrison[code];
        }

        rescaleGarrisonOverlay();
    }

    /**
     * Re-scale garrison badges so they grow/shrink proportionally with
     * the zoom level, but not 1:1 — a soft square-root factor keeps them
     * readable at every zoom without overwhelming the map.
     *
     * factor = 1 / sqrt(scale)
     *   • zoom-out (scale 0.5) → factor ≈ 1.41  → markers a bit bigger in SVG → visually OK
     *   • zoom 1x              → factor = 1      → baseline size
     *   • zoom-in  (scale 4)   → factor = 0.5    → markers shrink in SVG but zoom magnifies → net 2x bigger on screen
     */
    function rescaleGarrisonOverlay() {
        const f = 1 / Math.sqrt(scale);
        for (const code in garrisonLayer) {
            const gEl = garrisonLayer[code];
            const cx = gEl._cx;
            const cy = gEl._cy;
            if (cx == null || cy == null) continue;
            gEl.setAttribute('transform',
                `translate(${cx},${cy}) scale(${f}) translate(${-cx},${-cy})`);
        }
    }

    /** Remove all garrison overlays (call on game end or reset) */
    function clearGarrisonOverlay() {
        Object.values(garrisonLayer).forEach(el => el.remove());
        Object.keys(garrisonLayer).forEach(k => delete garrisonLayer[k]);
        Object.keys(_lastGarrison).forEach(k => delete _lastGarrison[k]);
    }

    /* ════════════════ PUBLIC API ════════════════ */
    return {
        init,
        colourTerritory,
        colourAllTerritories,
        selectTerritory,
        getSelected,
        getCentroid,
        getTerritoryScreenPos,
        svgToScreen,
        resetView,
        getFxCtx,
        getFxCanvas,
        flashTerritory,
        resizeFx,
        updateGarrisonOverlay,
        clearGarrisonOverlay,
        set onClick(fn)  { onTerritoryClick = fn; },
        set onHover(fn)  { onTerritoryHover = fn; },
        set onLeave(fn)  { onTerritoryLeave = fn; },
        set onTap(fn)    { onTerritoryTap   = fn; },
        get svgElement()  { return svgEl; },
        get scale()       { return scale; }
    };
})();
