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

    /* ── callbacks (set by UI) ── */
    let onTerritoryClick = null;
    let onTerritoryHover = null;
    let onTerritoryLeave = null;

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
                transition: fill 0.3s ease, stroke 0.2s ease, stroke-width 0.2s ease, opacity 0.2s;
            }
            .land path { transition: fill 0.3s ease; }
            .land:hover { stroke: #00e5ff; stroke-width: 1.4; filter: brightness(1.15); }
            .lake  { fill: #0e2240 !important; stroke: none; }
            .aq    { fill: #1a2a3a !important; stroke: #0d1b2a; stroke-width: 0.3; }
            .circle { display: none !important; }
            .territory-selected { stroke: #ffd700 !important; stroke-width: 2.5 !important;
                                  filter: drop-shadow(0 0 8px rgba(255,215,0,0.7)); }
            @keyframes playerGlow {
                0%, 100% { stroke-opacity: 1; filter: drop-shadow(0 0 4px rgba(0,229,255,0.6)); }
                50% { stroke-opacity: 0.7; filter: drop-shadow(0 0 8px rgba(0,229,255,0.9)); }
            }
            .territory-player path, path.territory-player {
                stroke: #00e5ff !important; stroke-width: 1.8 !important;
                animation: playerGlow 2.5s ease-in-out infinite;
            }
            .territory-player {
                stroke: #00e5ff !important; stroke-width: 1.8 !important;
                animation: playerGlow 2.5s ease-in-out infinite;
            }
        `;
        defs.appendChild(style);
    }

    /* ════════════════ CACHE ELEMENTS ════════════════ */
    function cacheElements() {
        let cached = 0;
        const idSet = new Set(SVG_IDS);

        /* STRATEGY: Walk every <g> inside the SVG and check its id.
           This avoids querySelector/getElementById issues after
           DOMParser + adoptNode which can break ID lookup tables. */
        const allGroups = svgEl.querySelectorAll('g');
        console.log(`[GeoDominion] Found ${allGroups.length} <g> elements in SVG`);

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

        console.log(`[GeoDominion] Cached ${cached}/${SVG_IDS.length} territory elements`);
    }

    /* ════════════════ COLOURING ════════════════ */
    function forceFill(el, color) {
        /* We stripped the SVG's embedded <style>, and our injected CSS has
           no 'fill' for .land — so the SVG 'fill' attribute wins.
           Also set inline style as belt-and-suspenders. */
        el.setAttribute('fill', color);
        /* Some SVG elements from DOMParser/adoptNode don't support .style
           correctly, so also set the style attribute directly: */
        const existing = el.getAttribute('style') || '';
        const cleaned = existing.replace(/fill\s*:[^;]+;?/gi, '').trim();
        const newStyle = (cleaned ? cleaned + '; ' : '') + 'fill: ' + color + ' !important';
        el.setAttribute('style', newStyle);
    }

    function colourTerritory(code, color) {
        const el = pathCache[code];
        if (!el) return;
        const tag = (el.tagName || '').toLowerCase();
        if (tag === 'g') {
            forceFill(el, color);
            el.querySelectorAll('path').forEach(p => forceFill(p, color));
        } else {
            forceFill(el, color);
        }
    }

    function colourAllTerritories() {
        if (typeof GameEngine === 'undefined') return;
        const state = GameEngine.getState();
        if (!state || !state.territories) return;

        resizeFx();

        for (const code of SVG_IDS) {
            const owner = state.territories[code];
            if (owner) {
                const n = state.nations[owner] || getNation(owner);
                colourTerritory(code, n.color);
                const el = pathCache[code];
                if (el) {
                    if (owner === state.player) {
                        el.classList.add('territory-player');
                    } else {
                        el.classList.remove('territory-player');
                    }
                }
            } else {
                colourTerritory(code, '#2a3a4a');
            }
        }

        /* Update garrison overlay after recolouring */
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
            const pt = { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };
            centroidCache[code] = pt;
            return pt;
        } catch { return null; }
    }

    /** Convert SVG coordinate to screen pixel (for FX canvas) */
    function svgToScreen(svgX, svgY) {
        if (!svgEl) return null;
        try {
            const pt = svgEl.createSVGPoint();
            pt.x = svgX; pt.y = svgY;
            const ctm = svgEl.getScreenCTM();
            if (!ctm) return null;
            const screen = pt.matrixTransform(ctm);
            const cr = container.getBoundingClientRect();
            const result = { x: screen.x - cr.left, y: screen.y - cr.top };
            /* Validate the result is within reasonable bounds */
            if (isNaN(result.x) || isNaN(result.y)) return null;
            return result;
        } catch (e) {
            return null;
        }
    }

    /** Get screen position of a territory centroid (for animations) */
    function getTerritoryScreenPos(code) {
        /* Ensure canvas is sized */
        resizeFx();
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

    function applyTransform() {
        clampPan();
        const wrapper = document.getElementById('svg-wrapper');
        if (wrapper) {
            wrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
            wrapper.style.transformOrigin = '0 0';
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

        /* Delegated click & hover on SVG paths */
        container.addEventListener('click', e => {
            const target = e.target.closest('[id]');
            if (!target) return;
            const code = target.id;
            /* Check if it's inside a <g> with a territory id */
            const gParent = target.closest('g.land');
            const finalCode = gParent ? gParent.id : code;
            if (SVG_IDS.includes(finalCode)) {
                if (onTerritoryClick) onTerritoryClick(finalCode, e);
            }
        });

        container.addEventListener('mousemove', e => {
            if (dragging) return;
            const target = e.target.closest('[id]');
            if (!target) { if (onTerritoryLeave) onTerritoryLeave(); return; }
            const gParent = target.closest('g.land');
            const code = gParent ? gParent.id : target.id;
            if (SVG_IDS.includes(code)) {
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

        container.addEventListener('touchstart', e => {
            if (e.touches.length === 1) {
                dragging = true;
                dragStart = { x: e.touches[0].clientX - panX, y: e.touches[0].clientY - panY };
            } else if (e.touches.length === 2) {
                dragging = false;
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
            e.preventDefault();
            if (e.touches.length === 1 && dragging) {
                panX = e.touches[0].clientX - dragStart.x;
                panY = e.touches[0].clientY - dragStart.y;
                applyTransform();
            } else if (e.touches.length === 2) {
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

        container.addEventListener('touchend', () => { dragging = false; });
    }

    /* ════════════════ FX CANVAS ════════════════ */
    function resizeFx() {
        if (!fxCanvas || !container) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w > 0 && h > 0) {
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
        const paths = tag === 'g' ? [...el.querySelectorAll('path')] : [el];
        paths.forEach(p => {
            const orig = p.getAttribute('fill') || '#2a3a4a';
            forceFill(p, color);
            setTimeout(() => forceFill(p, orig), duration);
        });
    }

    /* ════════════════ GARRISON OVERLAY — Military Unit Icons ════════════════
       Draw military unit icons on each territory using SVG paths.
       Icons based on the unit sketch: tanks, ships, planes, SAM, nukes, missiles.
       Renders the top 3 unit categories present for each territory.
       ══════════════════════════════════════════════════════════════════════ */
    const garrisonLayer = {};   // code → SVG <g> element

    /* ── SVG path data for military icons (all at 0,0, scale ~20px) ── */
    const UNIT_SVG = {
        /* Tank (top-down silhouette) */
        tank: {
            path: 'M-8,-4 L8,-4 L9,-2 L9,2 L8,4 L-8,4 L-9,2 L-9,-2 Z M-3,-6 L6,-6 L7,-4 L-3,-4 Z',
            color: '#8bc34a', label: '🛡️'
        },
        /* Fighter jet (top-down) */
        fighter: {
            path: 'M0,-8 L2,-5 L2,-1 L7,3 L7,5 L2,2 L2,5 L4,7 L4,8 L0,6.5 L-4,8 L-4,7 L-2,5 L-2,2 L-7,5 L-7,3 L-2,-1 L-2,-5 Z',
            color: '#29b6f6', label: '✈️'
        },
        /* Bomber (wider wings) */
        bomber: {
            path: 'M0,-7 L2,-4 L2,0 L9,4 L9,6 L2,3 L2,6 L4,8 L0,7 L-4,8 L-2,6 L-2,3 L-9,6 L-9,4 L-2,0 L-2,-4 Z',
            color: '#5c6bc0', label: '🛩️'
        },
        /* Drone (small quad shape) */
        drone: {
            path: 'M-5,-5 L-3,-5 L-1,-2 L1,-2 L3,-5 L5,-5 L5,-3 L2,-1 L2,1 L5,3 L5,5 L3,5 L1,2 L-1,2 L-3,5 L-5,5 L-5,3 L-2,1 L-2,-1 L-5,-3 Z',
            color: '#26a69a', label: '🤖'
        },
        /* Ship (side view) */
        navy: {
            path: 'M-9,0 L-7,-4 L-3,-4 L-3,-6 L-1,-6 L-1,-4 L7,-4 L9,0 L7,2 L-7,2 Z M-2,-8 L-1,-8 L-1,-6 L-2,-6 Z',
            color: '#42a5f5', label: '🚢'
        },
        /* Submarine */
        submarine: {
            path: 'M-8,0 L-6,-3 L6,-3 L8,0 L6,2 L-6,2 Z M0,-5 L1,-5 L1,-3 L0,-3 Z M-3,-5 L-2,-3 L-3,-3 Z',
            color: '#455a64', label: '🐟'
        },
        /* SAM launcher (radar dish + missile rail) */
        sam: {
            path: 'M-6,4 L6,4 L5,2 L-5,2 Z M-2,2 L-2,-4 L2,-4 L2,2 Z M-4,-4 L-1,-8 L1,-8 L4,-4 Z M-1,-8 L0,-10 L1,-8 Z',
            color: '#ff9800', label: '🛡️'
        },
        /* Cruise missile */
        cruiseMissile: {
            path: 'M-8,0 L-5,-2 L5,-2 L8,0 L5,2 L-5,2 Z M6,-1 L10,0 L6,1 Z M-6,-3 L-4,-2 M-6,3 L-4,2',
            color: '#ef5350', label: '🚀'
        },
        /* Ballistic missile (tall, pointed) */
        ballisticMissile: {
            path: 'M0,-10 L2,-6 L2,4 L4,7 L0,6 L-4,7 L-2,4 L-2,-6 Z',
            color: '#f44336', label: '☄️'
        },
        /* Nuke (radiation symbol simplified) */
        nuke: {
            path: 'M0,-9 L3,-3 L9,0 L3,3 L0,9 L-3,3 L-9,0 L-3,-3 Z',
            color: '#76ff03', label: '☢️'
        },
        /* Artillery */
        artillery: {
            path: 'M-7,3 L7,3 L6,1 L-6,1 Z M-2,1 L-2,-3 L2,-3 L2,1 Z M2,-3 L8,-7 L9,-6 L3,-2',
            color: '#ff7043', label: '💥'
        },
        /* Infantry (soldier silhouette) */
        infantry: {
            path: 'M0,-7 A3,3,0,1,1,0.01,-7 Z M-2,-3 L2,-3 L3,2 L1,2 L1,5 L-1,5 L-1,2 L-3,2 Z',
            color: '#a5d6a7', label: '🪖'
        }
    };

    /* Categories for grouping — determines which icons appear on each territory */
    const UNIT_CATEGORIES = {
        ground:  ['infantry', 'tank', 'artillery'],
        air:     ['fighter', 'bomber', 'drone'],
        sea:     ['navy', 'submarine'],
        missile: ['cruiseMissile', 'ballisticMissile'],
        defense: ['sam'],
        special: ['nuke']
    };

    /** Get per-territory detailed unit breakdown from garrison */
    function getUnitBreakdown(nationArmy, garrisonProportion) {
        const units = [];
        if (!nationArmy) return units;

        Object.entries(nationArmy).forEach(([utype, count]) => {
            if (count <= 0) return;
            const local = Math.round(count * garrisonProportion);
            if (local > 0 && UNIT_SVG[utype]) {
                units.push({ type: utype, count: local, svg: UNIT_SVG[utype] });
            }
        });

        /* Sort by count descending, return top categories */
        units.sort((a, b) => b.count - a.count);
        return units;
    }

    function updateGarrisonOverlay() {
        if (typeof GameEngine === 'undefined') return;
        const state = GameEngine.getState();
        if (!state) return;
        if (!svgEl) return;

        /* Gather all garrison data */
        const majorCodes = typeof NATIONS !== 'undefined' ? Object.keys(NATIONS) : [];
        const allGarrisons = {};
        majorCodes.forEach(code => {
            const n = state.nations[code];
            if (!n || !n.alive) return;
            const g = GameEngine.getGarrisons(code);
            Object.assign(allGarrisons, g);
        });

        /* Create or update overlay for every territory */
        for (const code of SVG_IDS) {
            const owner = state.territories[code];
            const garrison = allGarrisons[code];
            const centroid = getCentroid(code);

            if (!centroid || !garrison || garrison.total === 0) {
                if (garrisonLayer[code]) {
                    garrisonLayer[code].remove();
                    delete garrisonLayer[code];
                }
                continue;
            }

            const ownerN = state.nations[owner];
            if (!ownerN) continue;

            /* Calculate local proportion for unit breakdown */
            const totalArmy = Object.values(ownerN.army).reduce((a, b) => a + b, 0);
            const proportion = totalArmy > 0 ? garrison.total / totalArmy : 0;

            /* Get top units at this territory */
            const unitBreak = getUnitBreakdown(ownerN.army, proportion);
            if (unitBreak.length === 0) continue;

            /* Pick top 3 most significant unit types to display */
            const display = unitBreak.slice(0, 3);

            /* Size based on garrison strength */
            const scaleMap = { heavy: 1.1, medium: 0.85, light: 0.6, none: 0 };
            const baseScale = scaleMap[garrison.strength] || 0.7;

            let gEl = garrisonLayer[code];
            if (!gEl) {
                gEl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                gEl.setAttribute('class', 'garrison-overlay');
                gEl.setAttribute('pointer-events', 'none');
                svgEl.appendChild(gEl);
                garrisonLayer[code] = gEl;
            }
            gEl.innerHTML = '';

            const cx = centroid.x;
            const cy = centroid.y;
            const spacing = 18 * baseScale;

            /* Position icons side by side at centroid */
            const totalWidth = display.length * spacing;
            const startX = cx - totalWidth / 2 + spacing / 2;

            display.forEach((unit, idx) => {
                const ux = startX + idx * spacing;
                const uy = cy;

                /* Background dot */
                const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                bg.setAttribute('cx', ux);
                bg.setAttribute('cy', uy);
                bg.setAttribute('r', 10 * baseScale);
                bg.setAttribute('fill', 'rgba(0,0,0,0.55)');
                bg.setAttribute('stroke', unit.svg.color);
                bg.setAttribute('stroke-width', 1.2 * baseScale);
                gEl.appendChild(bg);

                /* Unit icon path */
                const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                iconPath.setAttribute('d', unit.svg.path);
                iconPath.setAttribute('fill', unit.svg.color);
                iconPath.setAttribute('fill-opacity', '0.9');
                iconPath.setAttribute('transform',
                    `translate(${ux},${uy}) scale(${baseScale * 0.8})`);
                gEl.appendChild(iconPath);
            });

            /* Troop count below icons */
            const numFontSize = 9 * baseScale;
            const numText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            numText.setAttribute('x', cx);
            numText.setAttribute('y', cy + 12 * baseScale + numFontSize);
            numText.setAttribute('text-anchor', 'middle');
            numText.setAttribute('font-size', numFontSize);
            numText.setAttribute('fill', '#e0e0e0');
            numText.setAttribute('font-family', 'Share Tech Mono, monospace');
            numText.setAttribute('paint-order', 'stroke');
            numText.setAttribute('stroke', '#000');
            numText.setAttribute('stroke-width', 2.5);
            numText.textContent = Math.round(garrison.total);
            gEl.appendChild(numText);
        }
    }

    /** Remove all garrison overlays (call on game end or reset) */
    function clearGarrisonOverlay() {
        Object.values(garrisonLayer).forEach(el => el.remove());
        Object.keys(garrisonLayer).forEach(k => delete garrisonLayer[k]);
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
        get svgElement()  { return svgEl; },
        get scale()       { return scale; }
    };
})();
