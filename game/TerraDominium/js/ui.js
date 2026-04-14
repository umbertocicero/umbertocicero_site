/* ═══════════════════════════════════════════════════════
   GeoDominion — UI Controller  (v2 — SVG)
   All UI interactions, popups, HUD, event log
   ═══════════════════════════════════════════════════════ */

const UI = (() => {
    /* ── refs (cached after DOM ready) ── */
    let els = {};

    /** Parse flag emoji → Twemoji <img> for cross-platform rendering (esp. Windows)
     *  Uses LOCAL SVG assets (assets/emoji/) instead of CDN — zero network calls.
     *  A callback builds the src directly, no CDN fallback.
     *  OPTIMISATION 1: skip elements that have no unparsed emoji text nodes left,
     *  so repeated calls on the same DOM won't generate redundant <img> requests.
     *  OPTIMISATION 2: pre-fetched SVGs are stored as blob: URLs in _svgBlobCache,
     *  so the browser never re-requests the same file — zero HTTP overhead after
     *  initial load.  While the cache is warming, we fall back to the file path. */
    const _emojiBase = 'assets/emoji/';
    const _svgBlobCache = new Map();   // 'icon-code' → 'blob:…' URL
    let _blobCacheReady = false;

    const _emojiOpts = {
        callback: (icon) => {
            const cached = _svgBlobCache.get(icon);
            if (cached) return cached;
            /* Not yet cached — schedule a background fetch so FUTURE
               twemoji.parse() calls will use the blob URL.
               Do NOT patch existing <img> — changing src triggers a re-fetch. */
            if (_blobCacheReady && !_svgBlobCache.has(icon)) {
                _svgBlobCache.set(icon, '');  // mark as in-flight
                const url = _emojiBase + icon + '.svg';
                fetch(url).then(r => r.blob()).then(blob => {
                    _svgBlobCache.set(icon, URL.createObjectURL(blob));
                }).catch(() => _svgBlobCache.delete(icon));
            }
            return _emojiBase + icon + '.svg';
        },
        ext: '.svg'
    };
    const _emojiRe = /[\u{1F1E0}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1FA00}-\u{1FA9F}]/u;

    /** Check if any real Text node (not img alt) still contains emoji */
    function _hasUnparsedEmoji(el) {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        let node;
        while ((node = walker.nextNode())) {
            if (_emojiRe.test(node.nodeValue)) return true;
        }
        return false;
    }

    function parseEmoji(el) {
        if (typeof twemoji !== 'undefined' && el && _hasUnparsedEmoji(el)) {
            try { twemoji.parse(el, _emojiOpts); } catch(e) {}
        }
    }
    function parseEmojiIfNeeded(el) {
        if (typeof twemoji !== 'undefined' && el && _hasUnparsedEmoji(el)) {
            try { twemoji.parse(el, _emojiOpts); } catch(e) {}
        }
    }

    /** Pre-fetch all emoji SVGs from assets/emoji/ and store as blob: URLs.
     *  Called once after boot — scans the DOM for every <img.emoji> and
     *  garrison <image> to discover which icon codes are needed, then
     *  fetches each unique SVG once and stores the result as a blob: URL.
     *
     *  IMPORTANT: we do NOT replace existing DOM element src/href — that
     *  would trigger redundant browser re-fetches.  Instead, only NEW
     *  elements created after warm-up (via Twemoji callback or garrison
     *  overlay update) will automatically use blob: URLs.
     *
     *  Also exposed on window so MapRenderer can use it:
     *      window._svgBlobCache
     */
    function _warmSvgBlobCache() {
        /* Collect every unique emoji icon code currently in use */
        const icons = new Set();
        document.querySelectorAll('img.emoji').forEach(img => {
            const src = img.getAttribute('src') || '';
            if (src.startsWith(_emojiBase)) {
                icons.add(src.slice(_emojiBase.length).replace(/\.svg$/i, ''));
            }
        });
        /* Also include garrison overlay <image> hrefs */
        document.querySelectorAll('image[href^="assets/emoji/"]').forEach(img => {
            const href = img.getAttribute('href') || '';
            icons.add(href.slice(_emojiBase.length).replace(/\.svg$/i, ''));
        });

        /* Expose cache on window for MapRenderer */
        window._svgBlobCache = _svgBlobCache;

        if (icons.size === 0) { _blobCacheReady = true; return; }

        let done = 0;
        const total = icons.size;
        icons.forEach(icon => {
            if (_svgBlobCache.has(icon)) { if (++done >= total) _blobCacheReady = true; return; }
            const url = _emojiBase + icon + '.svg';
            fetch(url).then(r => r.blob()).then(blob => {
                _svgBlobCache.set(icon, URL.createObjectURL(blob));
            }).catch(() => {}).finally(() => {
                if (++done >= total) _blobCacheReady = true;
            });
        });
    }

    /* ════════════════ INIT ════════════════ */
    function init() {
        cacheElements();
        bindButtons();
        setupMapCallbacks();
        setupEventLog();
    }

    function cacheElements() {
        const ids = [
            'intro-screen','nation-select-screen','nation-grid','nation-preview',
            'preview-flag','preview-name','preview-stats','btn-start-game',
            'tutorial-overlay','game-screen','top-hud',
            'hud-nation-flag','hud-nation-name','hud-turn','hud-resources',
            'btn-end-turn','btn-tech-tree','btn-diplomacy','btn-production',
            'map-container','map-tooltip',
            'left-panel','panel-territory-name','panel-territory-owner',
            'panel-resources','panel-strategic','panel-military','panel-actions',
            'right-panel','event-log',
            'military-bar','bottom-panel',
            'battle-popup','battle-display','btn-close-battle',
            'tech-popup','tech-tree-display','btn-close-tech',
            'diplomacy-popup','diplomacy-display','btn-close-diplomacy',
            'production-popup','production-display','btn-close-production',
            'economy-popup','economy-display','btn-close-economy',
            'gameover-popup','gameover-title','gameover-text','gameover-stats','btn-restart',
            'spy-popup','spy-popup-title','spy-popup-display','btn-close-spy',
            'revolt-alert-popup','revolt-alert-display','btn-close-revolt-alert',
            'colonies-popup','colonies-display','btn-close-colonies',
            'peace-popup','peace-display'
        ];
        ids.forEach(id => { els[id] = document.getElementById(id); });
    }

    function bindButtons() {
        click('btn-new-game', showNationSelect);
        click('btn-back-to-intro', backToIntro);
        click('btn-how-to', () => show('tutorial-overlay'));
        click('btn-close-tutorial', () => hide('tutorial-overlay'));
        click('btn-start-game', startGameFromSelect);
        click('btn-end-turn', endTurn);
        click('btn-autoplay', startAutoPlay);
        click('btn-tech-tree', showTechTree);
        click('btn-diplomacy', showDiplomacy);
        click('btn-economy', showEconomy);
        click('btn-production', showProduction);
        click('btn-close-battle', () => hide('battle-popup'));
        click('btn-close-tech', () => hide('tech-popup'));
        click('btn-close-diplomacy', () => hide('diplomacy-popup'));
        click('btn-close-production', () => hide('production-popup'));
        click('btn-close-economy', () => hide('economy-popup'));
        click('btn-close-spy', () => hide('spy-popup'));
        click('btn-close-colonies', () => hide('colonies-popup'));
        click('btn-colonies', showColonies);
        click('btn-close-revolt-alert', () => hide('revolt-alert-popup'));
        click('btn-close-left', () => { hide('left-panel'); MapRenderer.selectTerritory(null); });
        click('btn-restart', () => location.reload());
        click('btn-view-map', () => {
            hide('gameover-popup');
            showVictoryBanner();
        });
    }

    function click(id, fn) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', fn);
    }

    function show(id) { const el = els[id] || document.getElementById(id); if (el) el.classList.remove('hidden'); }
    function hide(id) { const el = els[id] || document.getElementById(id); if (el) el.classList.add('hidden'); }

    /* ════════════════ MAP CALLBACKS ════════════════ */
    /* Track tooltip state for mobile tap interaction */
    let tooltipTerritoryCode = null;   // currently shown territory in tooltip
    let isMobile = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    function setupMapCallbacks() {
        /* Desktop click → open sidebar directly */
        MapRenderer.onClick = (code, e) => {
            hideTooltip();
            MapRenderer.selectTerritory(code);
            showTerritoryPanel(code);
        };

        /* Desktop hover → show tooltip */
        MapRenderer.onHover = (code, e) => {
            showTooltip(code, e, false);
        };

        MapRenderer.onLeave = () => {
            hideTooltip();
        };

        /* Mobile tap → show tooltip (interactive, with X close button) */
        MapRenderer.onTap = (code, e) => {
            if (tooltipTerritoryCode === code) {
                /* Tapping same territory again → open sidebar */
                hideTooltip();
                MapRenderer.selectTerritory(code);
                showTerritoryPanel(code);
            } else {
                showTooltip(code, e, true);
            }
        };

        /* Close tooltip when tapping outside on mobile */
        document.addEventListener('click', e => {
            if (!tooltipTerritoryCode) return;
            const tt = els['map-tooltip'];
            if (!tt) return;
            if (tt.contains(e.target)) return;  // click inside tooltip handled separately
            hideTooltip();
        });
        document.addEventListener('touchend', e => {
            if (!tooltipTerritoryCode) return;
            const tt = els['map-tooltip'];
            if (!tt || tt.classList.contains('hidden')) return;
            /* Give a small delay so the tap handler fires first */
            setTimeout(() => {
                if (!tooltipTerritoryCode) return;
                const touch = e.changedTouches?.[0];
                if (!touch) return;
                const el = document.elementFromPoint(touch.clientX, touch.clientY);
                if (el && (tt.contains(el) || el === tt)) return;
                /* Check if it's inside the SVG (territory tap handled by onTap) */
                const mapCont = els['map-container'];
                if (mapCont && mapCont.contains(el)) return;
                hideTooltip();
            }, 50);
        });
    }

    /* ════════════════ ATTACK CHAIN HELPER ════════════════ */
    /**
     * Build a visual "attack chain" showing numbered phases.
     * E.g.:  ① 🚀 Missili  →  ② ✈️ Aerei  →  ③ 🗺️ Fanteria
     * @param {object}  reach    — result from canReachTerritory()
     * @param {boolean} compact  — true for tooltip (inline), false for sidebar (rows)
     */
    function buildAttackChainHtml(reach, compact) {
        const phaseInfo = {
            land:          { icon: '🗺️', label: 'Terra' },
            sea_transport: { icon: '⚓',  label: 'Mare' },
            naval:         { icon: '⚓',  label: 'Mare' },
            air:           { icon: '✈️', label: 'Aereo' },
            missile:       { icon: '🚀', label: 'Missili' },
        };
        /* Build ordered phases: MAIN method first, then support */
        const phases = [];
        const main = phaseInfo[reach.method] || { icon: '⚔️', label: 'Attacco' };
        main._role = 'main';
        phases.push(main);
        if (reach.support && reach.support.length > 0) {
            reach.support.forEach(s => {
                const info = { ...(phaseInfo[s] || { icon: '❓', label: s }), _role: 'support' };
                phases.push(info);
            });
        }

        if (compact) {
            /* Tooltip: single-line chain with arrows */
            let chain = phases.map((p, i) => {
                const color = i === 0 ? '#00e676' : '#90caf9';
                return `<span style="color:${color}">${p.icon} ${p.label}</span>`;
            }).join(' <span style="color:#455a64">→</span> ');
            return `<div class="tt-res" style="color:#00e676;line-height:1.5;">✅ ${chain}</div>`;
        } else {
            /* Sidebar: vertical steps */
            let html = '';
            phases.forEach((p, i) => {
                const isMain = i === 0;
                const color = isMain ? '#00e676' : '#90caf9';
                const role = isMain ? 'Principale' : 'Supporto';
                html += `<div class="res-row" style="font-size:0.75rem;">`;
                html += `<span style="color:${color};font-weight:700;">${p.icon} ${p.label}</span>`;
                html += `<span class="val" style="color:var(--text-dim);font-size:0.6rem;">${role}</span>`;
                html += `</div>`;
                if (i < phases.length - 1) {
                    html += `<div style="text-align:center;color:#37474f;font-size:0.55rem;margin:-1px 0;">+</div>`;
                }
            });
            return html;
        }
    }

    /* ════════════════ TOOLTIP ════════════════ */
    /**
     * @param {string}  code        — territory code
     * @param {object}  e           — event with clientX/clientY
     * @param {boolean} interactive — true on mobile tap: adds close X, click-to-open-sidebar
     */
    function showTooltip(code, e, interactive) {
        const tt = els['map-tooltip'];
        if (!tt) return;
        const state = GameEngine.getState();
        if (!state) return;

        tooltipTerritoryCode = code;

        const owner = state.territories[code] || code;
        const n = state.nations[owner];
        const tBase = getNation(code);
        const isMyTerritory = owner === state.player;
        const atWar = GameEngine.isAtWar(state.player, owner);
        const isAlly = GameEngine.isAlly(state.player, owner);

        let html = '';

        /* Mobile close button */
        if (interactive) {
            html += `<button class="tt-close" id="tt-close-btn">✕</button>`;
        }

        html += `<div class="tt-body">`;
        html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">`;
        const ownerColor = n?.color || '#607d8b';
        html += `<div style="width:14px;height:14px;border-radius:50%;background:${ownerColor};border:2px solid rgba(255,255,255,0.25);flex-shrink:0;box-shadow:0 0 6px ${ownerColor}60;"></div>`;
        html += `<div class="tt-name">${tBase.flag || '🏳️'} ${tBase.name || code.toUpperCase()}</div>`;
        html += `</div>`;

        /* Ownership badge */
        if (isMyTerritory) {
            html += `<div class="tt-badge mine">👑 TUO TERRITORIO</div>`;
        } else if (atWar) {
            html += `<div class="tt-badge enemy">⚔️ NEMICO — ${n?.flag || ''} ${n?.name || owner.toUpperCase()}</div>`;
        } else if (isAlly) {
            html += `<div class="tt-badge ally-badge">🤝 ALLEATO — ${n?.flag || ''} ${n?.name || owner.toUpperCase()}</div>`;
        } else {
            html += `<div class="tt-owner">${n?.flag || ''} ${n?.name || owner.toUpperCase()}</div>`;
        }

        /* Show resources for own territories */
        if (isMyTerritory) {
            html += `<div class="tt-res" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">`;
            html += `<span>💰${n.res.money}</span><span>🛢️${n.res.oil}</span><span>🔩${n.res.steel}</span><span>🌾${n.res.food}</span>`;
            html += `</div>`;
        }

        /* Garrison info (all territories) */
        if (typeof GameEngine.getGarrison === 'function') {
            const g = GameEngine.getGarrison(code);
            if (g && g.total > 0) {
                const strengthColors = { heavy: '#00e5ff', medium: '#ffd740', light: '#ff9100', none: '#ff1744' };
                const sCol = strengthColors[g.strength] || '#607d8b';
                html += `<div class="tt-res" style="color:${sCol};margin-top:4px;">${g.icon} ${g.total.toFixed(0)} unità — <strong>${g.strength.toUpperCase()}</strong></div>`;
            } else {
                html += `<div class="tt-res" style="color:#ff1744;margin-top:4px;">⚠ SENZA GUARNIGIONE</div>`;
            }
        }

        /* Show military power for enemies */
        if (atWar && n) {
            const ePow = GameEngine.calcMilitary(owner, 'atk');
            html += `<div class="tt-res" style="color:#ff1744;">⚔️ ATK: ${ePow}</div>`;
        }

        /* Reachability indicator for enemy/neutral territories */
        if (!isMyTerritory && typeof canReachTerritory === 'function') {
            const playerN = state.nations[state.player];
            if (playerN && playerN.alive) {
                const reach = canReachTerritory(state.player, code, playerN.army);
                if (reach.reachable) {
                    html += buildAttackChainHtml(reach, true);
                } else {
                    html += `<div class="tt-res" style="color:#ff6e40;">🚫 Non raggiungibile</div>`;
                }
            }
        }

        /* Mobile hint to tap for details */
        if (interactive) {
            html += `<div class="tt-hint">👆 Tocca per i dettagli</div>`;
        }

        html += `</div>`; // close .tt-body

        tt.innerHTML = html;
        parseEmoji(tt);
        tt.classList.remove('hidden');

        /* Toggle interactive class for CSS pointer-events */
        if (interactive) {
            tt.classList.add('tt-interactive');
        } else {
            tt.classList.remove('tt-interactive');
        }

        /* Position tooltip */
        const rect = els['map-container'].getBoundingClientRect();
        let left = e.clientX - rect.left + 15;
        let top  = e.clientY - rect.top - 10;

        /* On mobile interactive tooltip, clamp position so it stays within the map */
        if (interactive) {
            const ttW = tt.offsetWidth || 200;
            const ttH = tt.offsetHeight || 120;
            if (left + ttW > rect.width - 10) left = rect.width - ttW - 10;
            if (left < 10) left = 10;
            if (top + ttH > rect.height - 10) top = rect.height - ttH - 10;
            if (top < 10) top = 10;
        }

        tt.style.left = left + 'px';
        tt.style.top  = top + 'px';

        /* Bind close button and body click for mobile */
        if (interactive) {
            const closeBtn = document.getElementById('tt-close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    hideTooltip();
                });
                closeBtn.addEventListener('touchend', (ev) => {
                    ev.stopPropagation();
                    ev.preventDefault();
                    hideTooltip();
                });
            }
            const ttBody = tt.querySelector('.tt-body');
            if (ttBody) {
                ttBody.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    const clickedCode = tooltipTerritoryCode;
                    hideTooltip();
                    if (clickedCode) {
                        MapRenderer.selectTerritory(clickedCode);
                        showTerritoryPanel(clickedCode);
                    }
                });
                ttBody.addEventListener('touchend', (ev) => {
                    ev.stopPropagation();
                    ev.preventDefault();
                    const clickedCode = tooltipTerritoryCode;
                    hideTooltip();
                    if (clickedCode) {
                        MapRenderer.selectTerritory(clickedCode);
                        showTerritoryPanel(clickedCode);
                    }
                });
            }
        }
    }

    function hideTooltip() {
        const tt = els['map-tooltip'];
        if (tt) {
            tt.classList.add('hidden');
            tt.classList.remove('tt-interactive');
        }
        tooltipTerritoryCode = null;
    }

    /* ════════════════ NATION SELECT ════════════════ */
    let selectedNation = null;

    function showNationSelect() {
        hide('intro-screen');
        show('nation-select-screen');
        renderNationGrid();
    }

    function backToIntro() {
        hide('nation-select-screen');
        hide('nation-preview');
        show('intro-screen');
    }

    function renderNationGrid() {
        const grid = els['nation-grid'];
        if (!grid) return;
        grid.innerHTML = '';

        Object.entries(NATIONS).forEach(([code, n]) => {
            const card = document.createElement('div');
            card.className = 'nation-card';
            card.dataset.code = code;
            card.innerHTML = `
                <div class="flag">${n.flag}</div>
                <div class="name">${n.name}</div>
                <div class="power-bar"><div class="power-fill" style="width:${n.power}%"></div></div>
            `;
            card.addEventListener('click', () => selectNationCard(code));
            grid.appendChild(card);
        });
        parseEmoji(grid);
    }

    function selectNationCard(code) {
        selectedNation = code;
        /* Highlight */
        document.querySelectorAll('.nation-card').forEach(c => c.classList.remove('selected'));
        document.querySelector(`.nation-card[data-code="${code}"]`)?.classList.add('selected');

        /* Show preview */
        const n = NATIONS[code];
        show('nation-preview');
        els['preview-flag'].innerHTML = n.flag;
        els['preview-name'].textContent = n.name;

        let statsHtml = '';
        statsHtml += statBox('Potenza', n.power);
        statsHtml += statBox('💰 Fondi', n.res.money);
        statsHtml += statBox('🛢️ Petrolio', n.res.oil);
        statsHtml += statBox('🔩 Acciaio', n.res.steel);
        statsHtml += statBox('🪖 Esercito', Object.values(n.army).reduce((a,b)=>a+b,0));
        statsHtml += statBox('Profilo', n.profile.toUpperCase());
        els['preview-stats'].innerHTML = statsHtml;
        parseEmoji(document.getElementById('nation-preview'));
    }

    function statBox(label, val) {
        return `<div class="preview-stat"><div class="label">${label}</div><div class="value">${val}</div></div>`;
    }

    /* ════════════════ START GAME ════════════════ */
    function startGameFromSelect() {
        if (!selectedNation) return;
        hide('nation-select-screen');
        show('game-screen');

        /* Init game engine */
        const state = GameEngine.newGame(selectedNation);
        GameEngine.setOnEvent(addEventToLog);

        /* Initial resource collection */
        GameEngine.collectResources(selectedNation);

        /* Ensure canvas is properly sized now that game screen is visible */
        requestAnimationFrame(() => {
            MapRenderer.resizeFx();
            /* Re-colour after layout settles */
            MapRenderer.colourAllTerritories();
        });

        /* Colour map (initial pass) */
        MapRenderer.colourAllTerritories();

        /* Also colour again after a short delay for safety */
        setTimeout(() => {
            MapRenderer.colourAllTerritories();
            MapRenderer.resizeFx();
        }, 300);

        /* Update HUD */
        updateHUD();
        updateMilitaryBar();

        /* Pre-fetch all emoji SVGs into blob cache (async, non-blocking).
           After this completes, every new <img.emoji> or SVG <image> will
           use in-memory blob: URLs — zero further file/network requests. */
        requestAnimationFrame(() => _warmSvgBlobCache());
    }

    /* ════════════════ HUD ════════════════ */
    function updateHUD() {
        const state = GameEngine.getState();
        if (!state) return;
        const n = state.nations[state.player];
        if (!n) return;

        els['hud-nation-flag'].textContent = n.flag;
        els['hud-nation-name'].textContent = n.name;

        const terrCount = GameEngine.getTerritoryCount(state.player);
        const year = 2025 + state.turn;
        els['hud-turn'].textContent = `Turno ${state.turn} (${year})  ·  🌍 ${terrCount}`;

        /* Calculate per-turn income from all owned territories */
        const income = GameEngine.calcIncome(state.player);

        /* Resources bar: show current + income */
        const topRes = ['money','oil','gas','rareEarth','steel','food','uranium','gold','silver','diamonds'];
        let resHtml = '';
        topRes.forEach(key => {
            const r = RESOURCES[key];
            const cur = n.res[key] || 0;
            const inc = income[key] || 0;
            const incStr = inc > 0 ? `<span class="res-inc">+${inc}</span>` : '';
            resHtml += `<div class="hud-res"><span class="res-icon">${r.icon}</span><span class="res-val">${cur}</span>${incStr}</div>`;
        });
        els['hud-resources'].innerHTML = resHtml;

        /* Update map legend */
        updateMapLegend();
        /* Only parse emoji for the flag element, not the entire HUD */
        parseEmojiIfNeeded(els['hud-nation-flag']);
    }

    let _lastLegendHtml = '';
    function updateMapLegend() {
        const state = GameEngine.getState();
        if (!state) return;

        let legend = document.getElementById('map-legend');
        if (!legend) {
            legend = document.createElement('div');
            legend.id = 'map-legend';
            legend.className = 'map-legend';
            const mapCont = els['map-container'];
            if (mapCont) mapCont.appendChild(legend);

            /* Delegate click on legend items */
            legend.addEventListener('click', (e) => {
                const item = e.target.closest('.legend-item[data-code]');
                if (item && !item.classList.contains('legend-dead')) {
                    showNationDetail(item.dataset.code);
                }
            });

            /* Prevent map pan/zoom from hijacking scroll on the legend */
            ['touchstart','touchmove','wheel'].forEach(evt => {
                legend.addEventListener(evt, (e) => e.stopPropagation(), { passive: true });
            });
        }

        /* Count territories per nation */
        const nationCounts = {};
        Object.values(state.territories).forEach(owner => {
            nationCounts[owner] = (nationCounts[owner] || 0) + 1;
        });

        /* All major nations sorted by territory count */
        const allNations = Object.keys(NATIONS)
            .map(code => ({ code, count: nationCounts[code] || 0, alive: state.nations[code]?.alive }))
            .sort((a, b) => b.count - a.count);

        /* Always show player first */
        const playerIdx = allNations.findIndex(n => n.code === state.player);
        if (playerIdx > 0) {
            const [p] = allNations.splice(playerIdx, 1);
            allNations.unshift(p);
        }

        let html = '<div class="legend-title">🗺️ NAZIONI</div>';

        allNations.forEach(({ code, count, alive }) => {
            const n = state.nations[code];
            if (!n) return;
            const isPlayer = code === state.player;
            const atWar = GameEngine.isAtWar(state.player, code);
            const isAlly = GameEngine.isAlly(state.player, code);
            let cls = !alive ? 'legend-dead' : isPlayer ? 'legend-player' : atWar ? 'legend-enemy' : isAlly ? 'legend-ally' : '';
            html += `<div class="legend-item ${cls}" data-code="${code}"><div class="legend-swatch" style="background:${n.color}"></div><span>${n.flag} ${n.name}</span><span class="legend-count">${count}</span></div>`;
        });

        /* Skip DOM write + Twemoji parse if nothing changed */
        if (html === _lastLegendHtml) return;
        _lastLegendHtml = html;
        legend.innerHTML = html;
        parseEmoji(legend);
    }
    function showNationDetail(code) {
        const state = GameEngine.getState();
        if (!state) return;
        const n = state.nations[code];
        if (!n) return;

        show('left-panel');

        const isPlayer = code === state.player;
        const atWar = GameEngine.isAtWar(state.player, code);
        const isAlly = GameEngine.isAlly(state.player, code);
        const rel = isPlayer ? '—' : GameEngine.getRelation(state.player, code);

        /* Header */
        els['panel-territory-name'].textContent = `${n.flag} ${n.name}`;

        let badge = '';
        if (isPlayer) badge = `<span class="ui-badge ui-badge-mine">👑 LA TUA NAZIONE</span>`;
        else if (!n.alive) badge = `<span class="ui-badge ui-badge-dead">💀 ELIMINATO</span>`;
        else if (atWar) badge = `<span class="ui-badge ui-badge-war">⚔️ IN GUERRA</span>`;
        else if (isAlly) badge = `<span class="ui-badge ui-badge-ally">🤝 ALLEATO</span>`;
        else badge = `<span class="ui-badge ui-badge-neutral">Relazione: ${rel}</span>`;
        els['panel-territory-owner'].innerHTML = badge;

        /* ── Territories ── */
        const myTerritories = [];
        Object.entries(state.territories).forEach(([tCode, owner]) => {
            if (owner === code) myTerritories.push(tCode);
        });

        let resHtml = `<h4>🌍 TERRITORI (${myTerritories.length})</h4>`;
        if (myTerritories.length === 0) {
            resHtml += `<div class="res-row"><span style="color:var(--text-dim)">Nessun territorio</span></div>`;
        } else {
            /* Group: homeland vs conquered */
            const homeland = n.homeland || code;

            /* Homeland */
            if (myTerritories.includes(homeland)) {
                const tb = getNation(homeland);
                let hGarDot = '';
                if (typeof GameEngine.getGarrison === 'function') {
                    const hg = GameEngine.getGarrison(homeland);
                    const hgColors = { heavy: '#00e5ff', medium: '#ffd740', light: '#ff9100', none: '#ff1744' };
                    const hgc = hgColors[hg?.strength] || '#ff1744';
                    hGarDot = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${hgc};box-shadow:0 0 5px ${hgc};margin-right:5px;vertical-align:middle;" title="Guarnigione: ${hg?.strength?.toUpperCase()||'NONE'}"></span>`;
                }
                resHtml += `<div style="font-size:0.6rem;color:var(--text-muted);margin:6px 0 3px;text-transform:uppercase;letter-spacing:1.5px;font-family:var(--font-title);font-weight:400;">🏠 Patria</div>`;
                resHtml += `<div class="res-row" style="font-size:0.72rem;padding:2px 0;cursor:pointer;border-radius:4px;transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background=''" onclick="UI.showTerritoryPanel('${homeland}')"><span>${hGarDot}${tb.flag||'🏳️'} ${tb.name||homeland.toUpperCase()}</span></div>`;
            }

            /* Conquered territories (with garrison dot + unrest info + clickable) */
            const conquered = myTerritories.filter(t => t !== homeland);
            if (conquered.length > 0) {
                resHtml += `<div style="font-size:0.6rem;color:var(--gold);margin:8px 0 3px;text-transform:uppercase;letter-spacing:1.5px;font-family:var(--font-title);font-weight:400;padding-top:4px;border-top:1px solid var(--border-subtle);">⚔ Conquistati (${conquered.length})</div>`;
                conquered.forEach(t => {
                    const tb = getNation(t);
                    /* Garrison strength dot */
                    let garDot = '';
                    if (typeof GameEngine.getGarrison === 'function') {
                        const g = GameEngine.getGarrison(t);
                        const gColors = { heavy: '#00e5ff', medium: '#ffd740', light: '#ff9100', none: '#ff1744' };
                        const gc = gColors[g?.strength] || '#ff1744';
                        garDot = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${gc};box-shadow:0 0 5px ${gc};margin-right:5px;vertical-align:middle;" title="Guarnigione: ${g?.strength?.toUpperCase()||'NONE'}"></span>`;
                    }
                    /* Unrest tag */
                    const unrest = typeof GameEngine.getUnrest === 'function' ? GameEngine.getUnrest(t) : 0;
                    let unrestTag = '';
                    if (unrest > 0) {
                        const uc = unrest >= 80 ? '#ff1744' : unrest >= 60 ? '#ff9100' : unrest >= 40 ? '#ffd740' : '#66bb6a';
                        unrestTag = ` <span style="font-size:0.58rem;color:${uc};font-weight:600;">(🔥${Math.round(unrest)}%)</span>`;
                    }
                    resHtml += `<div class="res-row" style="font-size:0.72rem;padding:2px 0;cursor:pointer;border-radius:4px;transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background=''" onclick="UI.showTerritoryPanel('${t}')"><span>${garDot}${tb.flag||'🏳️'} ${tb.name||t.toUpperCase()}${unrestTag}</span></div>`;
                });
            }
        }

        els['panel-resources'].innerHTML = resHtml;

        /* ── Resources ── */
        let stratHtml = `<h4>💰 RISORSE</h4>`;
        if (isPlayer || isAlly || atWar) {
            const rKeys = ['money','oil','steel','rareEarth','uranium','food'];
            rKeys.forEach(key => {
                const val = n.res[key] || 0;
                const r = RESOURCES[key];
                if (r) stratHtml += `<div class="res-row"><span>${r.icon} ${r.name}</span><span class="val">${val}</span></div>`;
            });
        } else {
            stratHtml += `<div class="res-row"><span style="color:var(--text-dim)">Intelligence non disponibile</span></div>`;
        }
        els['panel-strategic'].innerHTML = stratHtml;

        /* ── Military ── */
        let milHtml = `<h4>🪖 ESERCITO</h4>`;
        const totalAtk = GameEngine.calcMilitary(code, 'atk');
        const totalDef = GameEngine.calcMilitary(code, 'def');
        const totalUnits = Object.values(n.army).reduce((a,b) => a+b, 0);

        milHtml += `<div class="res-row" style="font-weight:600;"><span>⚔️ ATK: ${totalAtk} | 🛡️ DEF: ${totalDef} | 🪖 ${totalUnits}</span></div>`;

        if (isPlayer || atWar || isAlly) {
            Object.entries(UNIT_TYPES).forEach(([key, ut]) => {
                const count = n.army[key] || 0;
                if (count > 0) {
                    milHtml += `<div class="res-row" style="font-size:0.7rem;"><span>${ut.icon} ${ut.name}</span><span class="val">${count}</span></div>`;
                }
            });
        }
        els['panel-military'].innerHTML = milHtml;

        /* ── Actions (diplomacy shortcuts) ── */
        let actHtml = '';
        if (!isPlayer) {
            /* Attack cost for this nation detail panel too */
            const _ndAtkCost = GameEngine.getAttackCost ? GameEngine.getAttackCost(state.player) : null;
            const _ndCanAfford = GameEngine.canAffordAttack ? GameEngine.canAffordAttack(state.player) : { canAttack: true };
            let _ndCostLbl = '';
            if (_ndAtkCost && (_ndAtkCost.money > 0 || _ndAtkCost.infantry > 0)) {
                _ndCostLbl = ` (💰${_ndAtkCost.money}`;
                if (_ndAtkCost.infantry > 0) _ndCostLbl += ` 🪖${_ndAtkCost.infantry}`;
                _ndCostLbl += `)`;
            }
            let _ndFatLbl = (_ndAtkCost && _ndAtkCost.fatigue > 0) ? ` ⚡-${Math.round(_ndAtkCost.fatigue*100)}%` : '';
            const _ndAtkDis = !_ndCanAfford.canAttack ? ' disabled' : '';

            if (atWar) {
                actHtml += `<button class="btn-action btn-attack"${_ndAtkDis} onclick="UI.doAttack('${code}');">⚔️ Attacco Rapido${_ndCostLbl}${_ndFatLbl}</button>`;
                actHtml += `<button class="btn-action btn-move" onclick="UI.doPeace('${code}');">🕊️ Negozia Pace</button>`;
            } else if (isAlly) {
                actHtml += `<button class="btn-action btn-move" style="border-color:var(--accent3);color:var(--accent3)" onclick="UI.doBreakAlliance('${code}');">💔 Rompi Alleanza</button>`;
            } else {
                actHtml += `<button class="btn-action btn-build" onclick="UI.doAlly('${code}');">🤝 Alleanza (🥇10 💰30)</button>`;
                actHtml += `<button class="btn-action btn-attack" onclick="UI.doDeclareWar('${code}');">🔥 Dichiara Guerra</button>`;
                actHtml += `<button class="btn-action btn-attack"${_ndAtkDis} onclick="UI.doAttack('${code}');">⚔️ Attacco Rapido${_ndCostLbl}${_ndFatLbl}</button>`;
            }
            actHtml += `<button class="btn-action btn-move" onclick="UI.doSpyMission('${code}');">🕵️ Spia (30💰 2🥇)</button>`;
        }
        els['panel-actions'].innerHTML = actHtml;
        parseEmoji(els['left-panel']);
    }

    function updateMilitaryBar() {
        const state = GameEngine.getState();
        if (!state) return;
        const n = state.nations[state.player];
        if (!n) return;

        const totalAtk = GameEngine.calcMilitary(state.player, 'atk');
        const totalDef = GameEngine.calcMilitary(state.player, 'def');
        const totalUnits = Object.values(n.army).reduce((a,b) => a+b, 0);

        let html = `<div class="mil-unit mil-summary"><span>⚔️${totalAtk}</span><span>🛡️${totalDef}</span><span>🪖${totalUnits}</span></div>`;
        Object.entries(UNIT_TYPES).forEach(([key, ut]) => {
            const count = n.army[key] || 0;
            if (count > 0) {
                html += `<div class="mil-unit" title="${ut.name} — ATK:${ut.atk} DEF:${ut.def}"><span class="mil-icon">${ut.icon}</span><span class="mil-count">${count}</span></div>`;
            }
        });
        els['military-bar'].innerHTML = html;
    }

    /* ════════════════ TERRITORY PANEL ════════════════ */
    function showTerritoryPanel(code) {
        const state = GameEngine.getState();
        if (!state) return;

        show('left-panel');
        const owner = state.territories[code];
        const n = state.nations[owner];
        const tBase = getNation(code);
        const isMyTerritory = owner === state.player;
        const atWar = GameEngine.isAtWar(state.player, owner);
        const isAlly = GameEngine.isAlly(state.player, owner);
        const rel = GameEngine.getRelation(owner, state.player);  // how THEY see US (most relevant)

        els['panel-territory-name'].textContent = `${tBase.flag || '\u{1F3F3}'} ${tBase.name || code.toUpperCase()}`;

        /* Clear ownership badge */
        let ownerBadge = '';
        if (isMyTerritory) {
            ownerBadge = `<span class="ui-badge ui-badge-mine">\u{1F451} TUO TERRITORIO</span>`;
        } else if (atWar) {
            ownerBadge = `<span class="ui-badge ui-badge-war">\u2694\uFE0F IN GUERRA</span>`;
        } else if (isAlly) {
            ownerBadge = `<span class="ui-badge ui-badge-ally">\u{1F91D} ALLEATO</span>`;
        } else {
            const relIcon = rel > 20 ? '\u{1F60A}' : rel < -20 ? '\u{1F620}' : '\u{1F610}';
            ownerBadge = `<span class="ui-badge ui-badge-neutral">${n?.flag||''} ${n?.name||owner} ${relIcon} ${rel}</span>`;
        }
        els['panel-territory-owner'].innerHTML = ownerBadge;

        /* Colony indicator: compact inline badge matching ownership style */
        if (code !== owner && n) {
            const colonyBadge = `<div style="margin-top:6px;display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.72rem;padding:4px 8px;background:rgba(255,255,255,0.03);border-radius:6px;border:1px solid var(--border-subtle);transition:border-color 0.15s;" onmouseover="this.style.borderColor='var(--border)'" onmouseout="this.style.borderColor='var(--border-subtle)'" onclick="UI.showNationDetail('${owner}')">
                <span style="color:#ff9100;">👑</span>
                <div style="width:9px;height:9px;border-radius:50%;background:${n.color||'#607d8b'};flex-shrink:0;box-shadow:0 0 4px ${n.color||'#607d8b'}40;"></div>
                <span style="color:#ffd740;font-weight:600;">${n.flag||''} ${n.name||owner.toUpperCase()}</span>
                <span style="color:var(--text-dim);font-size:0.6rem;margin-left:auto;">→</span>
            </div>`;
            els['panel-territory-owner'].innerHTML += colonyBadge;
        }

        /* Resources */
        let resHtml = '<h4>RISORSE PRODOTTE</h4>';
        let hasRes = false;
        if (tBase.prod) {
            Object.entries(tBase.prod).forEach(([key, val]) => {
                if (val > 0) {
                    resHtml += `<div class="res-row"><span>${RESOURCES[key]?.icon || ''} ${RESOURCES[key]?.name || key}</span><span class="val">+${val}/turno</span></div>`;
                    hasRes = true;
                }
            });
        }
        if (!hasRes) resHtml += '<div class="res-row"><span style="color:var(--text-dim)">Nessuna produzione</span></div>';
        els['panel-resources'].innerHTML = resHtml;

        /* Strategic assets */
        let assetHtml = '<h4>ASSET STRATEGICI</h4>';
        const assets = tBase.assets || [];
        if (assets.length > 0) {
            assets.forEach(aId => {
                const a = STRATEGIC_ASSETS[aId];
                if (a) {
                    const bonusStr = Object.entries(a.bonus).map(([r,v]) => `+${v} ${RESOURCES[r]?.icon||r}`).join(' ');
                    assetHtml += `<div class="res-row"><span>${a.icon} ${a.name}</span><span class="val">${bonusStr}</span></div>`;
                }
            });
        } else {
            assetHtml += '<div class="res-row"><span style="color:var(--text-dim)">Nessuno</span></div>';
        }
        els['panel-strategic'].innerHTML = assetHtml;

        /* Military */
        let milHtml = '<h4>FORZE MILITARI</h4>';
        if (isMyTerritory) {
            let totalUnits = 0;
            Object.entries(n.army).forEach(([key, count]) => {
                if (count > 0) {
                    const ut = UNIT_TYPES[key];
                    milHtml += `<div class="res-row"><span>${ut.icon} ${ut.name}</span><span class="val">${count} <span style="color:var(--text-dim);font-size:0.65rem;">(ATK:${ut.atk*count} DEF:${ut.def*count})</span></span></div>`;
                    totalUnits += count;
                }
            });
            if (totalUnits === 0) milHtml += '<div class="res-row"><span style="color:var(--text-dim)">Nessuna unit\u00E0</span></div>';
            else {
                const totalAtk = GameEngine.calcMilitary(state.player, 'atk');
                const totalDef = GameEngine.calcMilitary(state.player, 'def');
                milHtml += `<div class="res-row" style="margin-top:6px;border-top:1px solid var(--border);padding-top:4px;"><span style="font-weight:700;">\u2694\uFE0F Totale</span><span class="val">ATK:${totalAtk} DEF:${totalDef}</span></div>`;
            }
        } else if (atWar || isAlly) {
            /* During war or alliance, show estimated power */
            const ePow = GameEngine.calcMilitary(owner, 'atk');
            const eDef = GameEngine.calcMilitary(owner, 'def');
            milHtml += `<div class="res-row"><span>\u2694\uFE0F Potenza Attacco</span><span class="val">${ePow}</span></div>`;
            milHtml += `<div class="res-row"><span>\u{1F6E1}\uFE0F Potenza Difesa</span><span class="val">${eDef}</span></div>`;
        } else {
            milHtml += '<div class="res-row"><span style="color:var(--text-dim)">Intelligence non disponibile</span></div>';
        }
        els['panel-military'].innerHTML = milHtml;

        /* Garrison card for this specific territory */
        let garHtml = '<h4>🏰 GUARNIGIONE</h4>';
        if (typeof GameEngine.getGarrison === 'function') {
            const g = GameEngine.getGarrison(code);
            if (g && g.total > 0) {
                const sColors = { heavy: '#00e5ff', medium: '#ffd740', light: '#ff9100', none: '#ff1744' };
                const sLabels = { heavy: 'HEAVY', medium: 'MEDIUM', light: 'LIGHT', none: 'NONE' };
                const sCol = sColors[g.strength] || '#607d8b';
                const defMod = g.strength === 'heavy' ? '+25%' : g.strength === 'medium' ? '+12%' : g.strength === 'light' ? '+5%' : '−10%';
                const defColor = g.strength === 'none' ? '#ff1744' : '#00e676';
                const unrestMod = g.strength === 'heavy' ? '−6' : g.strength === 'medium' ? '−4' : g.strength === 'light' ? '−2' : '+5';
                const unrestColor = g.strength === 'none' ? '#ff1744' : '#00e676';
                /* Meter: troops/20 capped at 100% */
                const meterPct = Math.min(100, Math.round(g.total / 20 * 100));

                garHtml += `<div class="gar-card">`;
                /* ─ Header: dot + label + troop count ─ */
                garHtml += `<div class="gar-header">`;
                garHtml += `<div class="gar-strength-dot" style="color:${sCol};background:${sCol};"></div>`;
                garHtml += `<span class="gar-strength-label" style="color:${sCol};">${sLabels[g.strength]}</span>`;
                garHtml += `<span class="gar-troops">${g.icon} ${g.total} unità</span>`;
                garHtml += `</div>`;
                /* ─ Meter bar ─ */
                garHtml += `<div class="gar-meter"><div class="gar-meter-fill" style="width:${meterPct}%;background:${sCol};"></div></div>`;
                /* ─ Stats 2×2 grid ─ */
                garHtml += `<div class="gar-stats">`;
                garHtml += `<div class="gar-stat"><span class="gar-stat-val" style="color:${defColor};">${defMod}</span><span class="gar-stat-lbl">🛡️ Difesa</span></div>`;
                garHtml += `<div class="gar-stat"><span class="gar-stat-val" style="color:${unrestColor};">${unrestMod}/t</span><span class="gar-stat-lbl">🔥 Malcont.</span></div>`;
                garHtml += `<div class="gar-stat"><span class="gar-stat-val">${g.icon}</span><span class="gar-stat-lbl">Dominante</span></div>`;
                const isHomeland = code === (n?.homeland || owner);
                const isFront = GameEngine.isAtWar && (() => {
                    const wars = GameEngine.getState()?.wars || [];
                    return wars.some(w => {
                        const enemy = w.attacker === owner ? w.defender : (w.defender === owner ? w.attacker : null);
                        if (!enemy) return false;
                        const nb = typeof getNeighborsOf === 'function' ? getNeighborsOf(code) : [];
                        return nb.some(nc => state.territories[nc] === enemy);
                    });
                })();
                const roleLabel = isHomeland ? '🏠 Patria' : isFront ? '⚔️ Fronte' : '🌍 Retro';
                const roleWeight = isHomeland ? '2×' : isFront ? '1.5×' : '1×';
                garHtml += `<div class="gar-stat"><span class="gar-stat-val">${roleWeight}</span><span class="gar-stat-lbl">${roleLabel}</span></div>`;
                garHtml += `</div>`; /* close gar-stats */

                /* ─ Unrest section (only for conquered territories) ─ */
                if (code !== owner && typeof GameEngine.getUnrest === 'function') {
                    const unrest = GameEngine.getUnrest(code);
                    const barColor = unrest >= 80 ? '#ff1744' : unrest >= 60 ? '#ff9100' : unrest >= 40 ? '#ffd740' : '#66bb6a';
                    const uLabel = unrest >= 80 ? 'CRITICO' : unrest >= 60 ? 'ALTO' : unrest >= 40 ? 'MEDIO' : 'BASSO';
                    garHtml += `<div class="gar-unrest">`;
                    garHtml += `<div class="gar-unrest-row"><span class="gar-unrest-label">🔥 Malcontento</span><span class="gar-unrest-val" style="color:${barColor};">${uLabel} ${Math.round(unrest)}%</span></div>`;
                    garHtml += `<div class="unrest-bar-mini"><div class="unrest-bar-mini-fill" style="width:${unrest}%;background:${barColor}"></div></div>`;
                    if (unrest >= 60) {
                        garHtml += `<div style="font-size:0.6rem;color:#ff9100;margin-top:3px;">⚠ Rivolta a 100% — rafforza la guarnigione!</div>`;
                    }
                    garHtml += `</div>`;
                }

                garHtml += `</div>`; /* close gar-card */
            } else {
                garHtml += `<div class="gar-card"><div class="gar-empty"><span class="gar-empty-icon">⚠</span><span>Nessuna guarnigione<br><small style="color:var(--text-dim);">Malcontento +5/turno · Difesa −10%</small></span></div></div>`;
            }
        } else {
            garHtml += '<div class="res-row"><span style="color:var(--text-dim)">Non disponibile</span></div>';
        }

        /* Insert garrison section after military */
        els['panel-military'].innerHTML += garHtml;

        /* Reachability indicator for non-own territories (same info as tooltip) */
        if (!isMyTerritory && typeof canReachTerritory === 'function') {
            const playerN = state.nations[state.player];
            if (playerN && playerN.alive) {
                let reachHtml = '<h4>📡 RAGGIUNGIBILITÀ</h4>';
                const reach = canReachTerritory(state.player, code, playerN.army);
                if (reach.reachable) {
                    reachHtml += buildAttackChainHtml(reach, false);
                } else {
                    reachHtml += `<div class="res-row"><span style="color:#ff6e40;">🚫 Non raggiungibile</span></div>`;
                }
                els['panel-military'].innerHTML += reachHtml;
            }
        }

        /* ── Actions ── */
        let actHtml = '';
        const notMyTurn = state.phase !== 'player';
        const _dis = notMyTurn ? ' disabled' : '';
        const _disCls = notMyTurn ? ' act-disabled' : '';

        if (notMyTurn) {
            actHtml += `<div style="text-align:center;padding:6px 10px;margin-bottom:8px;border-radius:6px;background:rgba(255,255,255,0.04);border:1px solid var(--border);font-size:0.7rem;color:var(--text-dim);letter-spacing:0.5px;">⏳ Attendi il tuo turno</div>`;
        }

        if (isMyTerritory) {
            /* OWN TERRITORY ACTIONS */
            actHtml += `<button class="btn-action btn-build${_disCls}" onclick="UI.showProduction()"${_dis}>\u{1F3ED} Produci Unit\u00E0</button>`;
            actHtml += `<button class="btn-action btn-move${_disCls}" onclick="UI.showTechTree()"${_dis}>\u{1F52C} Ricerca Tecnologica</button>`;
            actHtml += `<button class="btn-action btn-move${_disCls}" onclick="UI.showEconomy()"${_dis}>\u{1F4CA} Panoramica Economica</button>`;

            /* Suppress unrest button on conquered territories with unrest */
            if (code !== state.player && typeof GameEngine.getUnrest === 'function') {
                const unrestLvl = GameEngine.getUnrest(code);
                if (unrestLvl > 0) {
                    const playerN = state.nations[state.player];
                    const canDo = (playerN.res.money >= 15 && (playerN.army.infantry || 0) >= 2);
                    actHtml += `<div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin:8px 0 6px;">Controllo Territorio</div>`;
                    if (canDo) {
                        actHtml += `<button class="btn-action${_disCls}" style="border-color:#ff6e40;color:#ff6e40;background:rgba(255,110,64,0.08)" onclick="UI.doSuppressUnrest('${code}');"${_dis}>🛡️ Seda Rivolta (💰15 + 🪖2)</button>`;
                    } else {
                        actHtml += `<button class="btn-action${_disCls}" style="border-color:#ff6e40;color:#ff6e40;opacity:0.4;background:rgba(255,110,64,0.08)" disabled>🛡️ Seda Rivolta (💰15 + 🪖2)</button>`;
                    }
                }
            }
        } else {
            /* FOREIGN TERRITORY ACTIONS */
            actHtml += `<div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Azioni Militari</div>`;

            /* ── Attack cost & fatigue indicator ── */
            const _atkCost = GameEngine.getAttackCost ? GameEngine.getAttackCost(state.player) : null;
            const _atkNum = GameEngine.getAttacksThisTurn ? GameEngine.getAttacksThisTurn(state.player) : 0;
            const _canAfford = GameEngine.canAffordAttack ? GameEngine.canAffordAttack(state.player) : { canAttack: true };
            let _costLabel = '';
            if (_atkCost && (_atkCost.money > 0 || _atkCost.infantry > 0)) {
                _costLabel = ` (💰${_atkCost.money}`;
                if (_atkCost.infantry > 0) _costLabel += ` 🪖${_atkCost.infantry}`;
                _costLabel += `)`;
            }
            let _fatigueLabel = '';
            if (_atkCost && _atkCost.fatigue > 0) {
                _fatigueLabel = ` ⚡-${Math.round(_atkCost.fatigue*100)}%`;
            }
            const _atkDisabled = (!_canAfford.canAttack || notMyTurn) ? ' disabled' : '';
            const _atkDisCls   = (!_canAfford.canAttack || notMyTurn) ? ' act-disabled' : '';

            if (atWar) {
                actHtml += `<button class="btn-action btn-attack${_atkDisCls}" onclick="UI.doAttack('${code}');"${_atkDisabled}>\u2694\uFE0F Attacca${_costLabel}${_fatigueLabel}</button>`;
                if (_atkNum >= 2 && _atkCost) {
                    actHtml += `<div style="font-size:0.6rem;color:#ff9100;text-align:center;margin:-4px 0 4px;opacity:0.8;">⚡ ${_atkCost.attackNum}° attacco questo turno — truppe affaticate</div>`;
                }
                if ((state.nations[state.player]?.army?.nuke || 0) > 0) {
                    actHtml += `<button class="btn-action btn-attack${_disCls}" style="border-color:#ff00ff;color:#ff00ff;background:rgba(255,0,255,0.1)" onclick="UI.doNukeStrike('${code}');"${_dis}>\u2622\uFE0F Attacco Nucleare</button>`;
                }
                actHtml += `<button class="btn-action btn-move${_disCls}" onclick="UI.doPeaceFromPanel('${owner}');"${_dis}>\u{1F54A}\uFE0F Negozia Pace</button>`;
            } else {
                actHtml += `<button class="btn-action btn-attack${_disCls}" onclick="UI.doDeclareWar('${owner}');"${_dis}>\u{1F525} Dichiara Guerra</button>`;
                actHtml += `<button class="btn-action btn-attack${_atkDisCls}" onclick="UI.doAttack('${code}');"${_atkDisabled}>\u2694\uFE0F Attacco Rapido${_costLabel}${_fatigueLabel}</button>`;
                if (_atkNum >= 2 && _atkCost) {
                    actHtml += `<div style="font-size:0.6rem;color:#ff9100;text-align:center;margin:-4px 0 4px;opacity:0.8;">⚡ ${_atkCost.attackNum}° attacco questo turno — truppe affaticate</div>`;
                }
            }

            actHtml += `<div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin:8px 0 6px;">Diplomazia</div>`;

            if (!isAlly && !atWar) {
                actHtml += `<button class="btn-action btn-build${_disCls}" onclick="UI.doAllyFromPanel('${owner}');"${_dis}>\u{1F91D} Proponi Alleanza (🥇10 💰30)</button>`;
                actHtml += `<button class="btn-action btn-move${_disCls}" onclick="UI.doNonAggression('${owner}');"${_dis}>\u{1F4DD} Patto Non-Aggressione (🥈5 💰15)</button>`;
            }
            if (isAlly) {
                actHtml += `<button class="btn-action btn-move${_disCls}" style="border-color:var(--accent3);color:var(--accent3)" onclick="UI.doBreakAlliance('${owner}');"${_dis}>\u{1F494} Rompi Alleanza</button>`;
            }

            actHtml += `<div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin:8px 0 6px;">Economia</div>`;
            actHtml += `<button class="btn-action btn-move${_disCls}" onclick="UI.doTradeResources('${owner}');"${_dis}>\u{1F4B1} Scambia Risorse</button>`;
            actHtml += `<button class="btn-action btn-move${_disCls}" onclick="UI.doSanction('${owner}');"${_dis}>\u{1F6AB} Imponi Sanzioni</button>`;
            actHtml += `<button class="btn-action btn-move${_disCls}" style="border-color:var(--accent3);color:var(--accent3)" onclick="UI.doEmbargo('${owner}');"${_dis}>\u26D4 Embargo Commerciale</button>`;
            actHtml += `<button class="btn-action btn-move${_disCls}" onclick="UI.doDemandTribute('${owner}');"${_dis}>\u{1F4B0} Richiedi Tributo</button>`;

            /* Spy / Intel */
            actHtml += `<div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin:8px 0 6px;">Intelligence</div>`;
            actHtml += `<button class="btn-action btn-move${_disCls}" onclick="UI.doSpyMission('${owner}');"${_dis}>\u{1F575}\uFE0F Spionaggio (30💰 2🥇)</button>`;
        }

        els['panel-actions'].innerHTML = actHtml;
        parseEmoji(els['left-panel']);
    }
    function doAttack(targetTerritory) {
        const state = GameEngine.getState();
        if (!state || state.phase !== 'player') return;

        const owner = state.territories[targetTerritory];
        if (owner === state.player) return;

        /* Capture nation info BEFORE attack (ownership may change on conquest) */
        const atkNation = state.nations[state.player];
        const defNation = state.nations[owner];
        const atkInfo = { code: state.player, name: atkNation?.name, flag: atkNation?.flag, color: atkNation?.color };
        const defInfo = { code: owner, name: defNation?.name, flag: defNation?.flag, color: defNation?.color };

        /* Ensure war */
        if (!GameEngine.isAtWar(state.player, owner)) {
            GameEngine.ensureWar(state.player, owner);
        }

        const result = GameEngine.attack(state.player, targetTerritory);
        if (!result) {
            addEventToLog({ turn: state.turn, type:'game', msg:'❌ Non puoi attaccare questo territorio' });
            return;
        }

        /* Blocked by reachability OR insufficient funds: show detailed alert */
        if (result.blocked) {
            addEventToLog({ turn: state.turn, type:'game', msg: result.reason || '🚫 Attacco impossibile' });
            showReachabilityAlert(result.reason, defInfo);
            return;
        }

        /* Animations — launch from the actual origin territory, not always homeland */
        MapRenderer.resizeFx();
        const launchCode = result.launchFrom || state.player;
        Animations.spawnBattleFX(launchCode, targetTerritory, result.success, atkInfo, defInfo);
        if (result.conquered) {
            setTimeout(() => {
                Animations.spawnConquerFX(targetTerritory);
                MapRenderer.colourAllTerritories();
            }, 600);
        }

        /* Homeland siege: animate colony releases */
        if (result.homelandSiege && result.homelandSiege.releasedColonies.length > 0) {
            const siege = result.homelandSiege;
            siege.releasedColonies.forEach((colCode, i) => {
                setTimeout(() => {
                    Animations.spawnConquerFX(colCode);
                    const colName = typeof getNation !== 'undefined' ? (getNation(colCode)?.name || colCode.toUpperCase()) : colCode.toUpperCase();
                    Animations.spawnText(colCode, siege.survived ? `🏳️ Ceduto` : `💀 Collasso`, '#ff6e40', true);
                    MapRenderer.colourAllTerritories();
                }, 900 + i * 400);
            });
            if (siege.survived && siege.retreatedTo) {
                setTimeout(() => {
                    Animations.spawnText(siege.retreatedTo, '🛡️ Ritirata!', '#ffd740', true);
                }, 900 + siege.releasedColonies.length * 400 + 300);
            }
        }

        /* Always re-colour after attack */
        MapRenderer.colourAllTerritories();

        /* Show battle popup */
        showBattleResult(result);

        /* ── Mid-turn unrest check: spreading thin triggers revolts ── */
        if (result.conquered) {
            const midRevolts = GameEngine.checkMidTurnUnrest(state.player);
            if (midRevolts.length > 0) {
                MapRenderer.colourAllTerritories();
                midRevolts.forEach(r => {
                    Animations.spawnRevoltFX(r.territory);
                    addEventToLog({ turn: state.turn, type: 'battle',
                        msg: `🔥 <strong>RIVOLTA!</strong> ${state.nations[r.to]?.flag||''} ${state.nations[r.to]?.name||r.territory} si ribella — guarnigione troppo debole!`
                    });
                });
                /* ── REVOLT ALERT MODAL: interrupt the player with a warning ── */
                _showMidTurnRevoltAlert(midRevolts);
            }
        }

        /* Refresh */
        updateHUD();
        updateMilitaryBar();
        showTerritoryPanel(targetTerritory);
    }

    /**
     * Show a blocking modal when revolts happen mid-turn during attacks.
     * Different from showRevoltAlert (end-of-turn unrest overview):
     * this one specifically lists territories that JUST revolted.
     */
    function _showMidTurnRevoltAlert(revolts) {
        const state = GameEngine.getState();
        if (!state) return;
        const display = els['revolt-alert-display'];
        if (!display) return;

        const lostCount = revolts.length;
        const territoryNames = revolts.map(r => {
            const n = state.nations[r.to];
            return `${n?.flag||''} ${n?.name||r.territory}`;
        });

        /* Next attack cost preview */
        const nextCost = GameEngine.getAttackCost(state.player);
        const attackNum = GameEngine.getAttacksThisTurn(state.player);

        let html = `
            <div style="text-align:center;margin-bottom:12px;">
                <div style="font-size:2rem;margin-bottom:6px;">⚠️🔥</div>
                <div style="font-size:0.85rem;color:#ff6e40;font-weight:700;">
                    ${lostCount === 1 ? 'UN TERRITORIO SI È RIBELLATO!' : `${lostCount} TERRITORI SI SONO RIBELLATI!`}
                </div>
                <div style="font-size:0.72rem;color:#ffab91;margin-top:6px;line-height:1.4;">
                    Le tue truppe sono troppo sparse — le guarnigioni non riescono a mantenere il controllo.
                    Ogni conquista indebolisce le difese delle colonie esistenti!
                </div>
            </div>`;

        /* List revolted territories */
        html += `<div style="margin-bottom:12px;">`;
        revolts.forEach(r => {
            const n = state.nations[r.to];
            html += `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;margin:4px 0;
                        background:rgba(255,23,68,0.12);border-radius:6px;border-left:3px solid #ff1744;">
                <span style="font-size:1.1rem;">${n?.flag||'🏴'}</span>
                <span style="font-weight:600;font-size:0.8rem;color:#ff8a80;">${n?.name||r.territory.toUpperCase()}</span>
                <span style="margin-left:auto;font-size:0.65rem;color:#ff5252;">PERSO</span>
            </div>`;
        });
        html += `</div>`;

        /* War fatigue warning */
        if (attackNum >= 2) {
            html += `<div style="padding:8px 12px;background:rgba(255,152,0,0.12);border-radius:6px;
                        border-left:3px solid #ff9100;margin-bottom:10px;font-size:0.72rem;color:#ffd740;line-height:1.4;">
                <strong>⚡ FATICA BELLICA (${attackNum}° attacco)</strong><br>
                Le tue truppe sono stanche. Prossimo attacco:
                ${nextCost.money > 0 ? ` 💰${nextCost.money}` : ''}${nextCost.infantry > 0 ? ` 🪖${nextCost.infantry}` : ''}
                | Penalità potenza: <strong style="color:#ff6e40;">-${Math.round(nextCost.fatigue*100)}%</strong>
            </div>`;
        }

        display.innerHTML = html;
        parseEmoji(els['revolt-alert-popup']);
        show('revolt-alert-popup');
    }

    /* ── Reachability alert popup ── */
    let _reachAlertTimeout = 0;
    function showReachabilityAlert(reason, defInfo) {
        /* Reuse the battle popup but write to battle-display (not destroy the popup!) */
        const display = els['battle-display'];
        if (!display) { alert(reason); return; }
        show('battle-popup');

        const defName = defInfo?.name || '???';
        const defFlag = defInfo?.flag || '';

        display.innerHTML = `
            <div style="text-align:center">
                <div style="font-size:1.3rem;font-weight:800;color:#ff6e40;margin-bottom:8px">
                    🚫 ATTACCO IMPOSSIBILE
                </div>
                <div style="margin:8px 0;font-size:0.85rem;color:#e0e0e0">
                    Obiettivo: ${defFlag} <b>${defName}</b>
                </div>
                <div style="margin:10px 0;padding:10px;background:rgba(255,110,64,0.12);border-radius:8px;
                    border-left:3px solid #ff6e40;font-size:0.8rem;color:#ffd740;line-height:1.4;text-align:left">
                    ${reason}
                </div>
                <div style="margin-top:10px;font-size:0.7rem;color:#90a4ae;text-align:left">
                    💡 <b>Suggerimento:</b> Costruisci unità navali (🚢 Flotta, 🐟 Sottomarino) per trasporto via mare,
                    o unità aeree (✈️ Caccia, 🛩️ Bombardiere, 🤖 Drone) e missili (🚀) per attacchi a lunga distanza.
                </div>
            </div>`;
        parseEmoji(display);
        /* Auto-hide after 6s — cancel any previous timer */
        clearTimeout(_reachAlertTimeout);
        _reachAlertTimeout = setTimeout(() => { hide('battle-popup'); }, 6000);
    }

    /* ════════════════ COLONY OVERVIEW ════════════════ */
    function showColonies() {
        if (!GameEngine.getColonyList) return;
        const state = GameEngine.getState();
        if (!state) return;

        const colonies = GameEngine.getColonyList(state.player);
        const display = els['colonies-display'];
        if (!display) return;

        let html = '';

        if (colonies.length === 0) {
            html += `<div style="text-align:center;padding:20px;color:var(--text-dim);font-size:0.85rem;">
                <div style="font-size:2rem;margin-bottom:8px;">🗺️</div>
                Non possiedi ancora territori conquistati.<br>Attacca altre nazioni per espandere il tuo impero!
            </div>`;
        } else {
            /* Summary bar */
            const withUnrest = colonies.filter(c => c.unrest > 0).length;
            const critical   = colonies.filter(c => c.unrest >= 70).length;
            html += `<div class="colony-summary">`;
            html += `<span>🌍 ${colonies.length} colonie</span>`;
            if (withUnrest > 0) html += `<span style="color:#ff9100;">⚠️ ${withUnrest} instabili</span>`;
            if (critical > 0)   html += `<span style="color:#ff1744;">🔴 ${critical} critiche</span>`;
            html += `</div>`;

            /* "Seda Tutte" button — only if any territory has unrest ≥ 40 */
            const alertList = colonies.filter(c => c.unrest >= 40);
            if (alertList.length > 0) {
                const playerN = state.nations[state.player];
                const totalCostMoney = alertList.length * 15;
                const totalCostInf   = alertList.length * 2;
                const canAll = (playerN.res.money >= totalCostMoney && (playerN.army.infantry || 0) >= totalCostInf);
                html += `<div style="margin-bottom:12px;text-align:center;">
                    <button class="revolt-btn-suppress" style="width:100%;padding:8px 12px;font-size:0.85rem;" ${canAll ? '' : 'disabled'}
                        onclick="UI.doSuppressAllFromColonies()">
                        🛡️ SEDA TUTTE LE RIVOLTE (${alertList.length})
                    </button>
                    <div class="revolt-cost" style="margin-top:4px;">Costo totale: 💰${totalCostMoney} + 🪖${totalCostInf}</div>
                </div>`;
            }

            colonies.forEach(c => {
                const pct = Math.round(c.unrest);
                const garrison = GameEngine.getGarrison(c.territory);
                const garStr = garrison.total > 0 ? `🪖${garrison.total}` : '<span style="color:#ff6e40">Nessuna</span>';

                let statusClass = 'colony-stable';
                let statusLabel = '✅ Stabile';
                let statusColor = '#00e676';
                if (pct >= 80)      { statusClass = 'colony-critical'; statusLabel = '🔴 CRITICO';     statusColor = '#ff1744'; }
                else if (pct >= 60) { statusClass = 'colony-high';     statusLabel = '🟠 Alto';        statusColor = '#ff9100'; }
                else if (pct >= 40) { statusClass = 'colony-warning';  statusLabel = '🟡 Attenzione';  statusColor = '#ffd740'; }
                else if (pct > 0)   { statusClass = 'colony-low';      statusLabel = '🟢 Basso';       statusColor = '#69f0ae'; }

                const playerN = state.nations[state.player];
                const canSuppress = pct > 0 && (playerN.res.money >= 15 && (playerN.army.infantry || 0) >= 2);

                html += `<div class="colony-row ${statusClass}" id="colony-row-${c.territory}">`;
                html += `  <div class="colony-info">`;
                html += `    <div class="colony-name">${c.flag} ${c.name}</div>`;
                html += `    <div class="colony-meta">Guarnigione: ${garStr}</div>`;
                if (pct > 0) {
                    html += `    <div class="revolt-unrest-bar"><div class="revolt-unrest-fill" style="width:${pct}%;background:${statusColor}"></div></div>`;
                    html += `    <div style="display:flex;justify-content:space-between;align-items:center">`;
                    html += `      <span class="revolt-unrest-label" style="color:${statusColor}">${statusLabel} — ${pct}%</span>`;
                    html += `      <span class="revolt-gain">+${c.gain}/turno</span>`;
                    html += `    </div>`;
                } else {
                    html += `    <div class="colony-stable-label">${statusLabel}</div>`;
                }
                html += `  </div>`;
                html += `  <div class="colony-actions">`;
                if (pct > 0) {
                    html += `<button class="revolt-btn-suppress" ${canSuppress ? '' : 'disabled'} onclick="UI.doSuppressFromColonies('${c.territory}');">🛡️ SEDA</button>`;
                    html += `<div class="revolt-cost">💰15 + 🪖2</div>`;
                }
                html += `    <button class="colony-btn-view" onclick="UI.showTerritoryPanel('${c.territory}'); UI.hideColonies();">🔍</button>`;
                html += `  </div>`;
                html += `</div>`;
            });
        }

        display.innerHTML = html;
        parseEmoji(els['colonies-popup']);
        show('colonies-popup');
    }

    function hideColonies() { hide('colonies-popup'); }

    function doSuppressFromColonies(tCode) {
        const result = GameEngine.suppressUnrest(tCode);
        if (!result.success) {
            addEventToLog({ turn: GameEngine.getState().turn, type: 'game', msg: `❌ ${result.reason}` });
            return;
        }
        showColonies();   // refresh
        updateHUD();
        updateMilitaryBar();
        MapRenderer.colourAllTerritories();
        const sel = MapRenderer.getSelected && MapRenderer.getSelected();
        if (sel) showTerritoryPanel(sel);
    }

    function doSuppressAllFromColonies() {
        const state = GameEngine.getState();
        if (!state) return;
        const list = GameEngine.getColonyList(state.player).filter(c => c.unrest >= 40);
        let suppressed = 0;
        for (const c of list) {
            const result = GameEngine.suppressUnrest(c.territory);
            if (result.success) suppressed++;
            else break;
        }
        showColonies();   // refresh
        updateHUD();
        updateMilitaryBar();
        MapRenderer.colourAllTerritories();
        const sel = MapRenderer.getSelected && MapRenderer.getSelected();
        if (sel) showTerritoryPanel(sel);
        if (suppressed > 0) {
            addEventToLog({ turn: state.turn, type: 'game', msg: `🛡️ Sedate ${suppressed} rivolte dalle colonie` });
        }
    }

    /* ════════════════ REVOLT ALERT ════════════════ */
    /**
     * Show pre-revolt warning to the player at turn start.
     * Lists all conquered territories with unrest ≥ 40 (warning) or ≥ 70 (critical).
     * "Seda Rivolta" button lets player spend resources to quell.
     */
    function showRevoltAlert() {
        if (!GameEngine.getUnrestList) return;
        const state = GameEngine.getState();
        if (!state) return;
        const list = GameEngine.getUnrestList(state.player);
        /* Only alert for territories with unrest ≥ 40 */
        const alertList = list.filter(t => t.unrest >= 40);
        if (alertList.length === 0) return;

        const display = els['revolt-alert-display'];
        if (!display) return;

        let html = `<div style="font-size:0.75rem;color:#ffab91;margin-bottom:10px;">
            ⚠️ I seguenti territori conquistati mostrano segni di <strong>instabilità</strong>.<br>
            Se il malcontento raggiunge il 100%, scoppierà una rivolta!
        </div>`;

        /* "Seda Tutte" button */
        const playerN = state.nations[state.player];
        const totalCostMoney = alertList.length * 15;
        const totalCostInf   = alertList.length * 2;
        const canSuppressAll  = (playerN.res.money >= totalCostMoney && (playerN.army.infantry || 0) >= totalCostInf);
        html += `<div style="margin-bottom:12px;text-align:center;">
            <button class="revolt-btn-suppress" style="width:100%;padding:8px 12px;font-size:0.85rem;" ${canSuppressAll ? '' : 'disabled'}
                onclick="UI.doSuppressAllUnrest()">
                🛡️ SEDA TUTTE (${alertList.length})
            </button>
            <div class="revolt-cost" style="margin-top:4px;">Costo totale: 💰${totalCostMoney} + 🪖${totalCostInf}</div>
        </div>`;

        alertList.forEach(t => {
            const pct = Math.round(t.unrest);
            const barColor = pct >= 80 ? '#ff1744' : pct >= 60 ? '#ff9100' : '#ffd740';
            const urgency = pct >= 80 ? '🔴 CRITICO' : pct >= 60 ? '🟠 ALTO' : '🟡 ATTENZIONE';
            const canSuppress = (playerN.res.money >= 15 && (playerN.army.infantry || 0) >= 2);

            html += `<div class="revolt-territory" id="revolt-row-${t.territory}">
                <div class="revolt-info">
                    <div class="revolt-name">${t.flag} ${t.name}</div>
                    <div class="revolt-unrest-bar">
                        <div class="revolt-unrest-fill" style="width:${pct}%;background:${barColor}"></div>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <span class="revolt-unrest-label" style="color:${barColor}">${urgency} — ${pct}%</span>
                        <span class="revolt-gain">+${t.gain}/turno</span>
                    </div>
                </div>
                <div style="text-align:center">
                    <button class="revolt-btn-suppress" ${canSuppress ? '' : 'disabled'}
                        onclick="UI.doSuppressUnrest('${t.territory}')">
                        🛡️ SEDA
                    </button>
                    <div class="revolt-cost">💰15 + 🪖2</div>
                </div>
            </div>`;
        });

        display.innerHTML = html;
        parseEmoji(els['revolt-alert-popup']);
        show('revolt-alert-popup');
    }

    /** Suppress unrest from the revolt alert popup */
    function doSuppressUnrest(tCode) {
        const result = GameEngine.suppressUnrest(tCode);
        if (!result.success) {
            addEventToLog({ turn: GameEngine.getState().turn, type: 'game', msg: `❌ ${result.reason}` });
            return;
        }
        /* Refresh the popup and HUD */
        showRevoltAlert();
        updateHUD();
        updateMilitaryBar();
        MapRenderer.colourAllTerritories();
        /* Refresh left panel if the territory (or its owner) is selected */
        const sel = MapRenderer.getSelected && MapRenderer.getSelected();
        if (sel) showTerritoryPanel(sel);
        /* If no more alerts, auto-close */
        const state = GameEngine.getState();
        const remaining = (GameEngine.getUnrestList(state.player) || []).filter(t => t.unrest >= 40);
        if (remaining.length === 0) {
            hide('revolt-alert-popup');
            addEventToLog({ turn: state.turn, type: 'game', msg: '✅ Tutte le rivolte sono state sedate!' });
        }
    }

    /** Suppress unrest in ALL alerted territories at once */
    function doSuppressAllUnrest() {
        const state = GameEngine.getState();
        if (!state) return;
        const list = (GameEngine.getUnrestList(state.player) || []).filter(t => t.unrest >= 40);
        let suppressed = 0, failed = 0;
        for (const t of list) {
            const result = GameEngine.suppressUnrest(t.territory);
            if (result.success) suppressed++;
            else { failed++; break; }  // stop if we run out of resources
        }
        /* Refresh everything */
        showRevoltAlert();
        updateHUD();
        updateMilitaryBar();
        MapRenderer.colourAllTerritories();
        const sel = MapRenderer.getSelected && MapRenderer.getSelected();
        if (sel) showTerritoryPanel(sel);
        /* Check if all done */
        const remaining = (GameEngine.getUnrestList(state.player) || []).filter(t => t.unrest >= 40);
        if (remaining.length === 0) {
            hide('revolt-alert-popup');
            addEventToLog({ turn: state.turn, type: 'game', msg: `✅ Tutte le rivolte sono state sedate! (${suppressed} territori)` });
        } else if (failed > 0) {
            addEventToLog({ turn: state.turn, type: 'game', msg: `⚠️ Sedate ${suppressed} rivolte, risorse insufficienti per le restanti ${remaining.length}` });
        }
    }

    function showBattleResult(result) {
        clearTimeout(_reachAlertTimeout);  /* cancel any pending auto-hide from reachability alert */
        show('battle-popup');
        const state = GameEngine.getState();
        const atkN = state.nations[result.attacker];
        const defN = state.nations[result.defender];

        /* Build casualty rows from atkArmyBefore + casualties object */
        function unitRows(armyBefore, casualties) {
            let rows = [];
            let totalBefore = 0, totalLost = 0;
            Object.entries(UNIT_TYPES).forEach(([key, ut]) => {
                const before = armyBefore[key] || 0;
                const lost   = casualties[key] || 0;
                if (before > 0) {
                    totalBefore += before;
                    totalLost += lost;
                    rows.push({ icon: ut.icon, name: ut.name, before, lost, after: before - lost });
                }
            });
            return { rows, totalBefore, totalLost };
        }

        const atkBefore = result.atkArmyBefore || atkN.army;
        const defBefore = result.defArmyBefore || (defN ? defN.army : {});
        const atkCas = result.atkCasualties || {};
        const defCas = result.defCasualties || {};
        const atk = unitRows(atkBefore, atkCas);
        const def = unitRows(defBefore, defCas);

        /* Territory name */
        const tBase = getNation(result.territory);
        const tName = tBase.flag ? `${tBase.flag} ${tBase.name}` : result.territory.toUpperCase();

        /* Build structured layout: header → body → result → loot */
        let html = `<div class="btl-header"><h3>⚔️ BATTAGLIA</h3><div class="btl-territory">${tName}</div></div>`;
        html += `<div class="btl-body">`;
        html += `<div class="btl-grid">`;

        /* Attacker column */
        html += `<div class="btl-col btl-atk">`;
        html += `<div class="btl-nation">${atkN.flag} ${atkN.name}</div>`;
        html += `<div class="btl-units">`;
        atk.rows.forEach(r => {
            html += `<span class="btl-u">${r.icon}${r.before}`;
            if (r.lost > 0) html += `<em class="btl-dead">-${r.lost}</em>`;
            html += `</span>`;
        });
        html += `</div>`;
        html += `<div class="btl-pow">⚔ ${result.atkPow} <span class="btl-dead">☠️ −${atk.totalLost}</span></div>`;
        html += `</div>`;

        /* VS divider */
        html += `<div class="btl-vs">VS</div>`;

        /* Defender column */
        html += `<div class="btl-col btl-def">`;
        html += `<div class="btl-nation">${defN?.flag || '🏳️'} ${defN?.name || '?'}</div>`;
        html += `<div class="btl-units">`;
        def.rows.forEach(r => {
            html += `<span class="btl-u">${r.icon}${r.before}`;
            if (r.lost > 0) html += `<em class="btl-dead">-${r.lost}</em>`;
            html += `</span>`;
        });
        html += `</div>`;
        html += `<div class="btl-pow">🛡 ${result.defPow} <span class="btl-dead">☠️ −${def.totalLost}</span></div>`;
        html += `</div>`;

        html += `</div>`; /* close btl-grid */

        /* Result banner */
        html += `<div class="battle-result ${result.success ? 'win' : 'lose'}">`;
        if (result.success) {
            html += result.conquered ? '✅ VITTORIA — Territorio conquistato!' : '✅ VITTORIA';
        } else {
            html += '❌ SCONFITTA — Ritirata!';
        }
        html += `</div>`;

        /* ── Loot / Seized Resources (no captured units — destroyed in war) ── */
        const loot = result.loot || {};
        const hasLoot = Object.values(loot).some(v => v > 0);

        if (result.conquered && hasLoot) {
            html += `<div class="btl-loot">`;
            html += `<div class="btl-loot-title">📦 Bottino di guerra</div>`;
            html += `<div class="btl-loot-items">`;
            Object.entries(loot).forEach(([r, v]) => {
                if (v > 0) {
                    const ri = RESOURCES[r];
                    html += `<span class="btl-loot-item">${ri?.icon||r} +${v}</span>`;
                }
            });
            html += `</div>`;
            html += `</div>`;
        }

        /* ── Attack cost / fatigue info ── */
        if (result.attackCost && (result.attackCost.money > 0 || result.attackCost.infantry > 0 || result.attackCost.fatigue > 0)) {
            const ac = result.attackCost;
            html += `<div style="margin-top:6px;padding:5px 10px;background:rgba(255,152,0,0.10);border-radius:6px;
                        font-size:0.65rem;color:#ffd740;text-align:center;border:1px solid rgba(255,152,0,0.2);">`;
            html += `⚡ ${ac.attackNum}° attacco`;
            if (ac.money > 0 || ac.infantry > 0) html += ` — Costo: 💰${ac.money}`;
            if (ac.infantry > 0) html += ` 🪖${ac.infantry}`;
            if (result.fatiguePct > 0) html += ` | Fatica: <strong style="color:#ff6e40;">-${result.fatiguePct}%</strong> potenza`;
            html += `</div>`;
        }

        html += `</div>`; /* close btl-body */

        els['battle-display'].innerHTML = html;
        parseEmoji(els['battle-popup']);
    }

    /* ════════════════ SANCTION ════════════════ */  
    function doSanction(targetCode) {
        const state = GameEngine.getState();
        if (!state) return;
        GameEngine.addSanction(state.player, targetCode);
        const tn = state.nations[targetCode];
        addEventToLog({ turn: state.turn, type:'diplomacy', msg:`🚫 <span class="evt-action">Sanzioni su</span> ${fmtNation(tn)}` });
        updateHUD();
        hide('diplomacy-popup');
    }

    /* ════════════════ PRODUCTION ════════════════ */
    function showProduction() {
        show('production-popup');
        const state = GameEngine.getState();
        if (!state) return;
        const n = state.nations[state.player];

        /* Current army summary */
        let html = '<div class="prod-army-summary">';
        html += '<h4 style="color:var(--accent);font-family:var(--font-title);font-size:0.8rem;margin-bottom:8px;">🪖 ESERCITO ATTUALE</h4>';
        html += '<div class="prod-army-grid">';
        Object.entries(UNIT_TYPES).forEach(([key, ut]) => {
            const count = n.army[key] || 0;
            if (count > 0) {
                html += `<span class="prod-army-item">${ut.icon}${count}</span>`;
            }
        });
        const totalAtk = GameEngine.calcMilitary(state.player, 'atk');
        const totalDef = GameEngine.calcMilitary(state.player, 'def');
        html += `</div>`;
        html += `<div style="font-size:0.7rem;color:var(--text-dim);margin-top:6px;">Potenza: ⚔️${totalAtk} ATK | 🛡️${totalDef} DEF</div>`;
        html += '</div>';

        /* Available resources */
        html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0;padding:8px;background:var(--bg-panel-alt);border-radius:4px;font-family:var(--font-mono);font-size:0.75rem;">';
        ['money','oil','steel','rareEarth','uranium','food'].forEach(key => {
            html += `<span>${RESOURCES[key].icon}${n.res[key]||0}</span>`;
        });
        html += '</div>';

        /* Build options */
        html += '<h4 style="color:var(--accent);font-family:var(--font-title);font-size:0.8rem;margin-bottom:8px;">🏭 COSTRUISCI</h4>';
        html += '<div class="prod-grid">';
        Object.entries(UNIT_TYPES).forEach(([key, ut]) => {
            const canBuild = GameEngine.canBuild(state.player, key);
            const current = n.army[key] || 0;
            const costStr = Object.entries(ut.cost).map(([r,v]) => `${RESOURCES[r]?.icon||r}${v}`).join(' ');

            /* Determine WHY it's blocked */
            let lockReason = '';
            if (!canBuild) {
                if (ut.nuke && !n.techs.includes('nuclear_program')) {
                    lockReason = `<div style="font-size:0.55rem;color:#ff6e40;margin-top:3px">🔒 Richiede: ☢️ Programma Nucleare</div>`;
                } else {
                    const missing = Object.entries(ut.cost).filter(([r, v]) => (n.res[r] || 0) < v);
                    if (missing.length > 0) {
                        const resText = missing.map(([r, v]) => {
                            const have = n.res[r] || 0;
                            return `${RESOURCES[r]?.icon||r} ${have}/${v}`;
                        }).join(' ');
                        lockReason = `<div style="font-size:0.55rem;color:#ffa726;margin-top:3px">💰 ${resText}</div>`;
                    }
                }
            }

            html += `<div class="prod-card ${canBuild ? '' : 'disabled'}" onclick="${canBuild ? `UI.doBuild('${key}')` : ''}">`;
            html += `<div class="prod-icon">${ut.icon}</div>`;
            html += `<div class="prod-name">${ut.name}</div>`;
            html += `<div style="font-size:0.75rem;color:var(--gold);">${current > 0 ? `×${current}` : ''}</div>`;
            html += `<div class="prod-cost">${costStr}</div>`;
            html += `<div style="font-size:0.6rem;color:var(--text-dim)">⚔️${ut.atk} 🛡️${ut.def} | Raggio:${ut.rng}</div>`;
            if (ut.consumable) html += `<div style="font-size:0.55rem;color:var(--accent3)">⚡ Consumabile</div>`;
            if (ut.nuke) html += `<div style="font-size:0.55rem;color:#ff00ff">☢️ Nucleare</div>`;
            html += lockReason;
            html += `</div>`;
        });
        html += '</div>';
        els['production-display'].innerHTML = html;
    }

    function doBuild(unitType) {
        const state = GameEngine.getState();
        if (!state) return;
        GameEngine.buildUnit(state.player, unitType);
        showProduction(); // refresh
        updateHUD();
        updateMilitaryBar();
    }

    /* ════════════════ TECH TREE ════════════════ */
    function showTechTree() {
        show('tech-popup');
        const state = GameEngine.getState();
        if (!state) return;
        const n = state.nations[state.player];

        let html = '';

        /* Group into tiers based on prerequisites depth */
        const tiers = [
            { label: 'Base', techs: TECHNOLOGIES.filter(t => (t.prereq||[]).length === 0) },
            { label: 'Avanzate', techs: TECHNOLOGIES.filter(t => (t.prereq||[]).length === 1) },
            { label: 'Élite', techs: TECHNOLOGIES.filter(t => (t.prereq||[]).length >= 2) }
        ].filter(tier => tier.techs.length > 0);

        tiers.forEach(tier => {
            html += `<div class="tech-tier">`;
            html += `<div class="tech-tier-label">${tier.label}</div>`;
            html += `<div class="tech-tier-grid">`;
            tier.techs.forEach(tech => {
                const researched = n.techs.includes(tech.id);
                const canRes = GameEngine.canResearch(state.player, tech.id);
                const cls = researched ? 'researched' : (canRes ? 'available' : 'locked');
                const costStr = Object.entries(tech.cost).map(([r,v]) => `${RESOURCES[r]?.icon||r}${v}`).join(' ');

                /* Lock reason */
                let lockReason = '';
                if (!researched && !canRes) {
                    const missingPrereqs = (tech.prereq || []).filter(p => !n.techs.includes(p));
                    const missingRes = Object.entries(tech.cost).filter(([r, v]) => (n.res[r] || 0) < v);
                    if (missingPrereqs.length > 0) {
                        const prereqNames = missingPrereqs.map(p => {
                            const pt = TECHNOLOGIES.find(t => t.id === p);
                            return pt ? `${pt.icon} ${pt.name}` : p;
                        }).join(', ');
                        lockReason = `<div class="tech-lock">🔒 ${prereqNames}</div>`;
                    } else if (missingRes.length > 0) {
                        const resText = missingRes.map(([r, v]) => {
                            const have = n.res[r] || 0;
                            return `${RESOURCES[r]?.icon||r}${have}/${v}`;
                        }).join(' ');
                        lockReason = `<div class="tech-lock tech-lock-res">💰 ${resText}</div>`;
                    }
                }

                /* Status indicator */
                const statusIcon = researched ? '<span class="tech-status tech-done">✅</span>'
                                 : canRes    ? '<span class="tech-status tech-ready">●</span>'
                                 :             '<span class="tech-status tech-no">🔒</span>';

                html += `<div class="tech-card ${cls}" ${canRes ? `onclick="UI.doResearch('${tech.id}')"` : ''}>`;
                html +=   `<div class="tech-card-icon">${tech.icon}</div>`;
                html +=   `<div class="tech-card-body">`;
                html +=     `<div class="tech-card-header">`;
                html +=       `<span class="tech-name">${tech.name}</span>`;
                html +=       statusIcon;
                html +=     `</div>`;
                html +=     `<div class="tech-cost">${researched ? 'Ricercata' : costStr}</div>`;
                html +=     `<div class="tech-desc">${tech.desc}</div>`;
                if (tech.tip) html += `<div class="tech-tip">${tech.tip}</div>`;
                html +=     lockReason;
                html +=   `</div>`;
                html += `</div>`;
            });
            html += `</div></div>`;
        });

        els['tech-tree-display'].innerHTML = html;
    }

    function doResearch(techId) {
        GameEngine.research(GameEngine.getState().player, techId);
        showTechTree(); // refresh
        updateHUD();
    }

    /* ════════════════ DIPLOMACY ════════════════ */
    function showDiplomacy() {
        show('diplomacy-popup');
        const state = GameEngine.getState();
        if (!state) return;

        const majorNations = Object.keys(NATIONS).filter(c => c !== state.player && state.nations[c]?.alive);

        /* Group by status: wars first, then allies, then rest sorted by relation */
        const wars = majorNations.filter(c => GameEngine.isAtWar(state.player, c));
        const allies = majorNations.filter(c => GameEngine.isAlly(state.player, c) && !GameEngine.isAtWar(state.player, c));
        const others = majorNations.filter(c => !GameEngine.isAtWar(state.player, c) && !GameEngine.isAlly(state.player, c));
        others.sort((a, b) => GameEngine.getRelation(state.player, b) - GameEngine.getRelation(state.player, a));

        let html = '';

        /* Player summary */
        const pn = state.nations[state.player];
        const pTerr = GameEngine.getTerritoryCount(state.player);
        const pAtk = GameEngine.calcMilitary(state.player, 'atk');
        html += `<div class="diplo-player-summary">`;
        html += `<span style="font-size:2rem">${pn.flag}</span>`;
        html += `<div><strong>${pn.name}</strong><br><span style="font-size:0.7rem;color:var(--text-dim);">\ud83c\udf0d${pTerr} territori | \u2694\ufe0f${pAtk} potenza | \ud83e\udd1d${allies.length} alleati | \ud83d\udd25${wars.length} guerre</span></div>`;
        html += `</div>`;

        function renderSection(title, icon, color, list) {
            if (list.length === 0) return '';
            let s = `<div class="diplo-section-title" style="border-left:3px solid ${color};">${icon} ${title} (${list.length})</div>`;
            list.forEach(code => { s += renderNationCard(code); });
            return s;
        }

        function renderNationCard(code) {
            const n = state.nations[code];
            const rel = GameEngine.getRelation(state.player, code);
            const atWar = GameEngine.isAtWar(state.player, code);
            const ally = GameEngine.isAlly(state.player, code);
            const terrCount = GameEngine.getTerritoryCount(code);
            const atkPow = GameEngine.calcMilitary(code, 'atk');

            /* Determine relation color */
            const relColor = rel > 40 ? '#00e676' : rel > 10 ? '#69f0ae' : rel > -10 ? '#ffd740' : rel > -40 ? '#ff9100' : '#ff1744';
            const relPct = Math.round((rel + 100) / 2);

            /* Color swatch from nation color */
            const nColor = n.color || '#607d8b';

            let c = `<div class="diplo-card ${atWar ? 'diplo-card-war' : ally ? 'diplo-card-ally' : ''}">`;

            /* Top row: flag, name, status, color swatch */
            c += `<div class="diplo-card-header">`;
            c += `<div class="diplo-card-flag" style="border-color:${nColor}">${n.flag}</div>`;
            c += `<div class="diplo-card-info">`;
            c += `<div class="diplo-card-name">${n.name}</div>`;
            c += `<div class="diplo-card-stats">\ud83c\udf0d${terrCount} | \u2694\ufe0f${atkPow}</div>`;
            c += `</div>`;

            /* Status badge */
            if (atWar) {
                c += `<div class="diplo-badge diplo-badge-war">\u2694\ufe0f GUERRA</div>`;
            } else if (ally) {
                c += `<div class="diplo-badge diplo-badge-ally">\ud83e\udd1d ALLEATO</div>`;
            } else {
                c += `<div class="diplo-badge diplo-badge-neutral" style="color:${relColor}">${rel > 0 ? '\ud83d\ude0a' : rel < -20 ? '\ud83d\ude20' : '\ud83d\ude10'} ${rel}</div>`;
            }
            c += `</div>`;

            /* Relation bar */
            c += `<div class="diplo-rel-bar"><div class="diplo-rel-fill" style="width:${relPct}%;background:${relColor};"></div><div class="diplo-rel-marker" style="left:50%"></div></div>`;

            /* Action buttons */
            c += `<div class="diplo-card-actions">`;
            if (atWar) {
                c += `<button class="diplo-btn peace" onclick="UI.doPeace('${code}')">\ud83d\udd4a\ufe0f Negozia Pace</button>`;
            } else if (ally) {
                c += `<button class="diplo-btn betray" onclick="UI.doBreakAlliance('${code}')">\ud83d\udc94 Rompi Alleanza</button>`;
            } else {
                c += `<button class="diplo-btn ally" onclick="UI.doAlly('${code}')">\ud83e\udd1d Alleanza (\ud83e\udd4710 \ud83d\udcb030)</button>`;
                c += `<button class="diplo-btn war" onclick="UI.doDeclareWar('${code}')">\ud83d\udd25 Dichiara Guerra</button>`;
            }
            c += `<button class="diplo-btn sanction" onclick="UI.doSanction('${code}')">\ud83d\udeab Sanzioni</button>`;
            c += `<button class="diplo-btn trade" onclick="UI.doTradeResources('${code}')">\ud83d\udcb1 Scambio</button>`;
            c += `<button class="diplo-btn tribute" onclick="UI.doDemandTribute('${code}')">\ud83d\udcb0 Tributo</button>`;
            c += `<button class="diplo-btn spy" onclick="UI.doSpyMission('${code}')">\ud83d\udd75\ufe0f Spia</button>`;
            c += `</div>`;

            c += `</div>`;
            return c;
        }

        html += renderSection('IN GUERRA', '\ud83d\udd25', '#ff1744', wars);
        html += renderSection('ALLEATI', '\ud83e\udd1d', '#00e676', allies);
        html += renderSection('ALTRE NAZIONI', '\ud83c\udf0d', '#42a5f5', others);

        els['diplomacy-display'].innerHTML = html;
        parseEmoji(els['diplomacy-popup']);
    }

    function doPeace(code) {
        showPeaceNegotiation(code, 'diplomacy-popup');
    }

    function doAlly(code) {
        const state = GameEngine.getState();
        const pn = state.nations[state.player];
        const rel = GameEngine.getRelation(state.player, code);
        /* Alliance costs: 🥇10 gold + 💰30 as diplomatic gift */
        const goldCost = 10, moneyCost = 30;
        if ((pn.res.gold || 0) < goldCost || (pn.res.money || 0) < moneyCost) {
            addEventToLog({ turn: state.turn, type:'diplomacy', msg:`❌ Risorse insufficienti per alleanza (serve 🥇${goldCost} + 💰${moneyCost})` });
            hide('diplomacy-popup');
            return;
        }
        if (rel < -10) {
            addEventToLog({ turn: state.turn, type:'diplomacy', msg:`❌ ${fmtNation(state.nations[code])} <span class="evt-action">rifiuta alleanza (${rel})</span>` });
            hide('diplomacy-popup');
            return;
        }
        pn.res.gold -= goldCost;
        pn.res.money -= moneyCost;
        GameEngine.makeAlliance(state.player, code);
        addEventToLog({ turn: state.turn, type:'diplomacy', msg:`🤝 Alleanza con ${fmtNation(state.nations[code])} (🥇${goldCost} + 💰${moneyCost})` });
        hide('diplomacy-popup');
        updateHUD();
    }

    /* ══ NEW DIPLOMATIC ACTIONS ══ */
    function doDeclareWar(targetCode) {
        const state = GameEngine.getState();
        if (!state) return;
        if (GameEngine.isAtWar(state.player, targetCode)) {
            addEventToLog({ turn: state.turn, type:'game', msg:'⚠️ Siete già in guerra!' });
            return;
        }
        /* Break alliance first if exists */
        if (GameEngine.isAlly(state.player, targetCode)) {
            GameEngine.breakAlliance(state.player, targetCode);
        }
        GameEngine.ensureWar(state.player, targetCode);
        const tn = state.nations[targetCode];
        addEventToLog({ turn: state.turn, type:'battle', msg:`🔥 <span class="evt-action">Guerra dichiarata a</span> ${fmtNation(tn)}` });
        MapRenderer.colourAllTerritories();
        updateHUD();
        /* Refresh any open panel */
        const sel = MapRenderer.getSelected();
        if (sel) showTerritoryPanel(sel);
        hide('diplomacy-popup');
    }

    function doBreakAlliance(targetCode) {
        const state = GameEngine.getState();
        if (!state) return;
        GameEngine.breakAlliance(state.player, targetCode);
        addEventToLog({ turn: state.turn, type:'diplomacy', msg:`💔 <span class="evt-action">Alleanza rotta con</span> ${fmtNation(state.nations[targetCode])}` });
        hide('diplomacy-popup');
    }

    function doNonAggression(targetCode) {
        const state = GameEngine.getState();
        if (!state) return;
        const pn = state.nations[state.player];
        /* Non-aggression pact costs: 🥈5 silver + 💰15 */
        const silverCost = 5, moneyCost = 15;
        if ((pn.res.silver || 0) < silverCost || (pn.res.money || 0) < moneyCost) {
            addEventToLog({ turn: state.turn, type:'diplomacy', msg:`❌ Risorse insufficienti per patto (serve 🥈${silverCost} + 💰${moneyCost})` });
            hide('diplomacy-popup');
            return;
        }
        pn.res.silver -= silverCost;
        pn.res.money -= moneyCost;
        /* Simulate non-aggression pact as +15 relation boost */
        GameEngine.adjustRelation(state.player, targetCode, 15);
        GameEngine.adjustRelation(targetCode, state.player, 15);
        addEventToLog({ turn: state.turn, type:'diplomacy', msg:`📝 <span class="evt-action">Patto con</span> ${fmtNation(state.nations[targetCode])} <span class="evt-action">(🥈${silverCost} + 💰${moneyCost})</span>` });
        hide('diplomacy-popup');
    }

    function doEmbargo(targetCode) {
        const state = GameEngine.getState();
        if (!state) return;
        GameEngine.addSanction(state.player, targetCode);
        /* Embargo also reduces their production more */
        const n = state.nations[targetCode];
        if (n) {
            n.res.money = Math.max(0, n.res.money - 20);
            n.res.oil = Math.max(0, n.res.oil - 10);
        }
        addEventToLog({ turn: state.turn, type:'diplomacy', msg:`⛔ <span class="evt-action">Embargo su</span> ${fmtNation(state.nations[targetCode])} <span class="evt-action">(-20💰 -10🛢️)</span>` });
        updateHUD();
        hide('diplomacy-popup');
    }

    /* Track refused trades per nation per turn: { "turn:nation:idx": true } */
    const _tradeRefusals = {};

    function doTradeResources(targetCode) {
        const state = GameEngine.getState();
        if (!state) return;
        const pn = state.nations[state.player];
        const tn = state.nations[targetCode];
        if (!pn || !tn) return;

        /* Close diplomacy first, then show trade popup */
        hide('diplomacy-popup');
        show('trade-popup');
        let html = `<div style="text-align:center;margin-bottom:12px;"><span style="font-size:2rem">${pn.flag}</span> ↔️ <span style="font-size:2rem">${tn.flag}</span></div>`;
        html += `<div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:12px;text-align:center;">Scambia risorse con ${tn.name}. Il successo dipende dalla relazione.</div>`;
        html += '<div class="trade-grid">';

        const tradeOptions = [
            { give: 'money', giveAmt: 50, get: 'oil', getAmt: 10, label: '💰50 → 🛢️10' },
            { give: 'money', giveAmt: 50, get: 'steel', getAmt: 15, label: '💰50 → 🔩15' },
            { give: 'money', giveAmt: 80, get: 'rareEarth', getAmt: 8, label: '💰80 → ⚗️8' },
            { give: 'oil', giveAmt: 15, get: 'money', getAmt: 40, label: '🛢️15 → 💰40' },
            { give: 'money', giveAmt: 100, get: 'uranium', getAmt: 5, label: '💰100 → ☢️5' },
            { give: 'food', giveAmt: 20, get: 'money', getAmt: 30, label: '🌾20 → 💰30' },
            { give: 'gold', giveAmt: 10, get: 'money', getAmt: 60, label: '🥇10 → 💰60' },
            { give: 'silver', giveAmt: 10, get: 'money', getAmt: 35, label: '🥈10 → 💰35' },
            { give: 'diamonds', giveAmt: 5, get: 'money', getAmt: 80, label: '💎5 → 💰80' },
        ];

        tradeOptions.forEach((t, i) => {
            const canAfford = (pn.res[t.give] || 0) >= t.giveAmt && (tn.res[t.get] || 0) >= t.getAmt;
            const refusalKey = `${state.turn}:${targetCode}:${i}`;
            const refused = !!_tradeRefusals[refusalKey];
            const canTrade = canAfford && !refused;
            const refusedLabel = refused ? ' <span style="font-size:0.6rem;color:#ff5252;">🚫 rifiutato</span>' : '';
            html += `<div class="trade-option ${canTrade ? '' : 'disabled'}" onclick="${canTrade ? `UI.executeTrade('${targetCode}',${i})` : ''}">`;
            html += `<span>${t.label}${refusedLabel}</span>`;
            html += `</div>`;
        });

        html += '</div>';
        const tradePop = document.getElementById('trade-popup');
        if (tradePop) tradePop.querySelector('.trade-display').innerHTML = html;
    }

    const TRADE_OPTIONS = [
        { give: 'money', giveAmt: 50, get: 'oil', getAmt: 10 },
        { give: 'money', giveAmt: 50, get: 'steel', getAmt: 15 },
        { give: 'money', giveAmt: 80, get: 'rareEarth', getAmt: 8 },
        { give: 'oil', giveAmt: 15, get: 'money', getAmt: 40 },
        { give: 'money', giveAmt: 100, get: 'uranium', getAmt: 5 },
        { give: 'food', giveAmt: 20, get: 'money', getAmt: 30 },
        { give: 'gold', giveAmt: 10, get: 'money', getAmt: 60 },
        { give: 'silver', giveAmt: 10, get: 'money', getAmt: 35 },
        { give: 'diamonds', giveAmt: 5, get: 'money', getAmt: 80 },
    ];

    function executeTrade(targetCode, optionIdx) {
        const state = GameEngine.getState();
        if (!state) return;
        const t = TRADE_OPTIONS[optionIdx];
        const pn = state.nations[state.player];
        const tn = state.nations[targetCode];
        const rel = GameEngine.getRelation(state.player, targetCode);

        /* Trade acceptance: based on relations */
        const acceptChance = Math.max(0.1, (rel + 100) / 200 * 0.8 + 0.2);
        if (Math.random() > acceptChance) {
            /* Mark this trade as refused for this turn — no retries */
            _tradeRefusals[`${state.turn}:${targetCode}:${optionIdx}`] = true;
            addEventToLog({ turn: state.turn, type:'diplomacy', msg:`❌ ${fmtNation(tn)} <span class="evt-action">rifiuta scambio</span>` });
            /* Show inline refusal feedback, keep modal open */
            _showTradeFeedback(targetCode, false, `${tn.flag} ${tn.name} rifiuta lo scambio! (non riprovabile questo turno)`);
            return;
        }

        pn.res[t.give] -= t.giveAmt;
        pn.res[t.get] = (pn.res[t.get] || 0) + t.getAmt;
        tn.res[t.get] -= t.getAmt;
        tn.res[t.give] = (tn.res[t.give] || 0) + t.giveAmt;
        GameEngine.adjustRelation(state.player, targetCode, 5);
        GameEngine.adjustRelation(targetCode, state.player, 5);

        const ri = RESOURCES || {};
        const giveIcon = ri[t.give]?.icon || t.give;
        const getIcon  = ri[t.get]?.icon || t.get;
        addEventToLog({ turn: state.turn, type:'diplomacy', msg:`💱 <span class="evt-action">Scambio con</span> ${fmtNation(tn)}: ${giveIcon}${t.giveAmt} → ${getIcon}${t.getAmt} <span class="evt-action">(+5 rel.)</span>` });

        /* Show inline success feedback, refresh modal to update affordability */
        _showTradeFeedback(targetCode, true, `Scambio riuscito! ${giveIcon}${t.giveAmt} → ${getIcon}${t.getAmt}`);
        updateHUD();
    }

    /** Show trade feedback inline in the trade popup, then refresh the trade grid */
    function _showTradeFeedback(targetCode, success, msg) {
        const tradePop = document.getElementById('trade-popup');
        if (!tradePop) return;
        const display = tradePop.querySelector('.trade-display');
        if (!display) return;

        /* Flash a feedback bar above the grid */
        let fb = tradePop.querySelector('.trade-feedback');
        if (!fb) {
            fb = document.createElement('div');
            fb.className = 'trade-feedback';
            display.parentNode.insertBefore(fb, display);
        }
        fb.style.color = success ? '#00e676' : '#ff5252';
        fb.style.background = success ? 'rgba(0,230,118,0.10)' : 'rgba(255,82,82,0.10)';
        fb.style.border = success ? '1px solid rgba(0,230,118,0.3)' : '1px solid rgba(255,82,82,0.3)';
        fb.textContent = (success ? '✅ ' : '❌ ') + msg;
        fb.style.display = 'block';

        /* Auto-hide feedback after 2s */
        clearTimeout(fb._timer);
        fb._timer = setTimeout(() => { fb.style.display = 'none'; }, 2500);

        /* Refresh the trade grid (button affordability may have changed) */
        doTradeResources(targetCode);
    }

    function doDemandTribute(targetCode) {
        const state = GameEngine.getState();
        if (!state) return;
        const pn = state.nations[state.player];
        const tn = state.nations[targetCode];
        const rel = GameEngine.getRelation(targetCode, state.player);
        const myPow = GameEngine.calcMilitary(state.player, 'atk');
        const theirPow = GameEngine.calcMilitary(targetCode, 'def');

        /* Success based on power ratio and fear */
        const powerRatio = myPow / Math.max(1, theirPow);
        const successChance = Math.min(0.8, powerRatio * 0.3 + (rel < -30 ? 0.2 : 0));

        if (Math.random() < successChance) {
            const tribute = Math.round(20 + Math.random() * 30);
            pn.res.money += tribute;
            tn.res.money = Math.max(0, tn.res.money - tribute);
            GameEngine.adjustRelation(targetCode, state.player, -20);
            addEventToLog({ turn: state.turn, type:'diplomacy', msg:`💰 ${fmtNation(tn)} <span class="evt-action">paga ${tribute} fondi (-20)</span>` });
        } else {
            GameEngine.adjustRelation(targetCode, state.player, -15);
            addEventToLog({ turn: state.turn, type:'diplomacy', msg:`❌ ${fmtNation(tn)} <span class="evt-action">rifiuta tributo (-15)</span>` });
        }
        updateHUD();
        hide('diplomacy-popup');
    }

    function doSpyMission(targetCode) {
        const state = GameEngine.getState();
        if (!state) return;
        const pn = state.nations[state.player];
        const tn = state.nations[targetCode];

        /* Cost: 30 money + 2 gold */
        if (pn.res.money < 30 || (pn.res.gold || 0) < 2) {
            addEventToLog({ turn: state.turn, type:'game', msg:'❌ Risorse insufficienti per spionaggio (costo: 30💰 + 2🥇)' });
            return;
        }
        pn.res.money -= 30;
        pn.res.gold -= 2;

        /* Success chance: 60% base, +20% with cyberwarfare tech */
        let chance = 0.6;
        if (pn.techs.includes('cyberwarfare')) chance += 0.2;

        const spyDisplay = els['spy-popup-display'];
        const spyTitle = els['spy-popup-title'];

        if (Math.random() < chance) {
            /* SUCCESS — show intel popup */
            spyTitle.textContent = '🕵️ MISSIONE RIUSCITA';
            spyTitle.style.color = 'var(--accent, #00e5ff)';

            const totalUnits = Object.values(tn.army).reduce((a,b) => a+b, 0);
            const atkPow = GameEngine.calcMilitary(targetCode, 'atk');
            const defPow = GameEngine.calcMilitary(targetCode, 'def');
            const terrCount = GameEngine.getTerritoryCount(targetCode);

            /* Detailed resource list */
            let resHtml = '';
            const resKeys = ['money','oil','gas','steel','food','uranium','rareEarth','gold','silver','diamonds'];
            resKeys.forEach(k => {
                const val = tn.res[k] || 0;
                if (val > 0) resHtml += `<div class="spy-res">${RESOURCES[k]?.icon||''} ${RESOURCES[k]?.name||k}: <strong>${val}</strong></div>`;
            });

            /* Army breakdown */
            let armyHtml = '';
            Object.entries(tn.army).forEach(([utype, count]) => {
                if (count > 0) {
                    const ut = UNIT_TYPES[utype];
                    armyHtml += `<div class="spy-unit">${ut?.icon||'🔹'} ${ut?.name||utype}: <strong>${count}</strong></div>`;
                }
            });

            /* Techs */
            let techHtml = '';
            tn.techs.forEach(tid => {
                const t = TECHNOLOGIES.find(x => x.id === tid);
                if (t) techHtml += `<span class="spy-tech">${t.icon} ${t.name}</span> `;
            });

            /* Alliances & wars */
            let diploHtml = '';
            const allies = state.alliances.filter(a => a.a === targetCode || a.b === targetCode)
                .map(a => a.a === targetCode ? a.b : a.a);
            const wars = state.wars.filter(w => w.attacker === targetCode || w.defender === targetCode)
                .map(w => w.attacker === targetCode ? w.defender : w.attacker);
            if (allies.length) diploHtml += `<div>🤝 Alleati: ${allies.map(c => state.nations[c]?.name || c).join(', ')}</div>`;
            if (wars.length) diploHtml += `<div>⚔️ In guerra con: ${wars.map(c => state.nations[c]?.name || c).join(', ')}</div>`;

            spyDisplay.innerHTML = `
                <div class="spy-header">
                    <div class="spy-flag" style="background:${tn.color||'#607d8b'};width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.4rem;">${tn.flag||'🏳️'}</div>
                    <div>
                        <div class="spy-nation-name" style="font-size:1.2rem;font-weight:700;color:#fff;">${tn.name || targetCode.toUpperCase()}</div>
                        <div style="font-size:0.85rem;color:#90a4ae;">🌍 ${terrCount} territori · ⚔${atkPow} ATK · 🛡${defPow} DEF · 🪖${totalUnits} unità</div>
                    </div>
                </div>
                <div class="spy-section">
                    <h4>📦 Risorse</h4>
                    <div class="spy-grid">${resHtml || '<em>Nessuna risorsa rilevante</em>'}</div>
                </div>
                <div class="spy-section">
                    <h4>🪖 Esercito</h4>
                    <div class="spy-grid">${armyHtml || '<em>Nessuna unità</em>'}</div>
                </div>
                ${techHtml ? `<div class="spy-section"><h4>🔬 Tecnologie</h4><div>${techHtml}</div></div>` : ''}
                ${diploHtml ? `<div class="spy-section"><h4>🌐 Diplomazia</h4>${diploHtml}</div>` : ''}
            `;

            addEventToLog({ turn: state.turn, type:'tech', msg:`🕵️ <span class="evt-action">Intel ottenuta su</span> ${fmtNation(tn)}` });
            show('spy-popup');
            parseEmoji(els['spy-popup-display']);
        } else {
            /* FAILURE — captured */
            spyTitle.textContent = '🕵️ MISSIONE FALLITA';
            spyTitle.style.color = 'var(--red, #ff1744)';
            spyDisplay.innerHTML = `
                <div style="text-align:center;padding:20px;">
                    <div style="font-size:3rem;margin-bottom:12px;">🚨</div>
                    <div style="font-size:1.1rem;color:#ff1744;font-weight:600;">Agente catturato!</div>
                    <div style="margin-top:8px;color:#90a4ae;">La tua spia è stata intercettata in <strong>${tn.name}</strong>.</div>
                    <div style="margin-top:4px;color:#ff9800;">📉 Relazioni deteriorate (−25)</div>
                </div>
            `;
            GameEngine.adjustRelation(targetCode, state.player, -25);
            addEventToLog({ turn: state.turn, type:'diplomacy', msg:`❌ <span class="evt-action">Spia catturata in</span> ${fmtNation(tn)} <span class="evt-action">(-25)</span>` });
            show('spy-popup');
            parseEmoji(els['spy-popup-display']);
        }
        updateHUD();
        hide('diplomacy-popup');
    }

    function doNukeStrike(targetTerritory) {
        const state = GameEngine.getState();
        if (!state || state.phase !== 'player') return;

        /* Capture nation info BEFORE the nuke (ownership may change) */
        const atkN = state.nations[state.player];
        const defOwner = state.territories[targetTerritory];
        const defN = state.nations[defOwner];
        const atkInfo = { code: state.player, name: atkN?.name, flag: atkN?.flag, color: atkN?.color };
        const defInfo = { code: defOwner, name: defN?.name, flag: defN?.flag, color: defN?.color };

        const result = GameEngine.nukeStrike(state.player, targetTerritory);
        if (!result) {
            addEventToLog({ turn: state.turn, type:'game', msg:'❌ Attacco nucleare impossibile' });
            return;
        }
        Animations.spawnNukeFX(state.player, targetTerritory, atkInfo, defInfo);
        setTimeout(() => { MapRenderer.colourAllTerritories(); }, 600);

        /* ── Mid-turn unrest check after nuke conquest ── */
        if (result.conquered) {
            const midRevolts = GameEngine.checkMidTurnUnrest(state.player);
            if (midRevolts.length > 0) {
                setTimeout(() => {
                    MapRenderer.colourAllTerritories();
                    midRevolts.forEach(r => {
                        Animations.spawnRevoltFX(r.territory);
                        addEventToLog({ turn: state.turn, type: 'battle',
                            msg: `🔥 <strong>RIVOLTA!</strong> ${state.nations[r.to]?.flag||''} ${state.nations[r.to]?.name||r.territory} si ribella — guarnigione troppo debole!`
                        });
                    });
                }, 800);
            }
        }

        updateHUD();
        updateMilitaryBar();
        const sel = MapRenderer.getSelected();
        if (sel) showTerritoryPanel(sel);
    }

    function doPeaceFromPanel(ownerCode) {
        showPeaceNegotiation(ownerCode, null);
    }

    function doAllyFromPanel(ownerCode) {
        doAlly(ownerCode);
        const sel = MapRenderer.getSelected();
        if (sel) showTerritoryPanel(sel);
    }

    /* ════════════════ PEACE NEGOTIATION ════════════════ */
    /** Track which popup to close when peace is resolved */
    let _peaceOriginPopup = null;

    /**
     * Open the peace negotiation modal.
     * @param {string} enemyCode — nation code of the enemy
     * @param {string|null} originPopup — popup ID to hide when opening (e.g. 'diplomacy-popup')
     */
    function showPeaceNegotiation(enemyCode, originPopup) {
        const state = GameEngine.getState();
        if (!state) return;

        if (originPopup) hide(originPopup);
        _peaceOriginPopup = originPopup;

        const pn = state.nations[state.player];
        const en = state.nations[enemyCode];
        if (!pn || !en) return;

        const deal = GameEngine.calcPeaceDemands(state.player, enemyCode);
        if (!deal) return;

        const display = els['peace-display'];
        if (!display) return;

        let html = '';

        /* ── Header: flags + mood ── */
        html += `<div class="peace-header">`;
        html += `<span class="peace-flag">${pn.flag}</span>`;
        html += `<span class="peace-vs">⚔️ → 🕊️</span>`;
        html += `<span class="peace-flag">${en.flag}</span>`;
        html += `</div>`;
        html += `<div class="peace-mood peace-mood-${deal.mood}">${deal.moodLabel}</div>`;

        /* ── War situation summary ── */
        html += `<div class="peace-info-grid">`;
        html += `<div class="peace-info-item"><span class="peace-info-label">⏱️ Durata guerra</span><span class="peace-info-val">${deal.warInfo.turns} turni</span></div>`;
        html += `<div class="peace-info-item"><span class="peace-info-label">⚔️ Rapporto forze</span><span class="peace-info-val">${deal.warInfo.powerRatio > 1 ? '🔴 Nemico più forte' : deal.warInfo.powerRatio < 0.7 ? '🟢 Tu sei più forte' : '🟡 Equilibrato'}</span></div>`;
        html += `<div class="peace-info-item"><span class="peace-info-label">🏳️ Aggressore</span><span class="peace-info-val">${deal.warInfo.requesterIsAggressor ? 'Tu (penalità)' : en.name}</span></div>`;
        html += `<div class="peace-info-item"><span class="peace-info-label">😤 Stanchezza</span><span class="peace-info-val">${deal.warInfo.weariness}%</span></div>`;
        html += `</div>`;

        /* ── Enemy demands ── */
        html += `<div class="peace-demands-header">📜 ${en.name} chiede:</div>`;
        html += `<div class="peace-demands-list">`;

        let canAfford = true;
        deal.demands.forEach(d => {
            const playerHas = pn.res[d.resource] || 0;
            const affordable = playerHas >= d.amount;
            if (!affordable) canAfford = false;
            html += `<div class="peace-demand-row ${affordable ? '' : 'peace-demand-lacking'}">`;
            html += `<span class="peace-demand-res">${d.icon} ${d.name}</span>`;
            html += `<span class="peace-demand-amt">${d.amount}</span>`;
            html += `<span class="peace-demand-have" style="color:${affordable ? 'var(--text-dim)' : '#ff1744'};">(hai: ${playerHas})</span>`;
            html += `</div>`;
        });
        html += `</div>`;

        /* ── Warning if can't afford ── */
        if (!canAfford) {
            html += `<div class="peace-warning">⚠️ Non hai abbastanza risorse per soddisfare tutte le richieste!</div>`;
        }

        /* ── Action buttons ── */
        html += `<div class="peace-actions">`;
        html += `<button class="peace-btn peace-btn-accept ${canAfford ? '' : 'disabled'}" ${canAfford ? '' : 'disabled'} onclick="UI.acceptPeace('${enemyCode}');">`;
        html += `✅ Accetta e firma la pace</button>`;
        html += `<button class="peace-btn peace-btn-reject" onclick="UI.rejectPeace('${enemyCode}');">`;
        html += `❌ Rifiuta — continua la guerra</button>`;
        html += `</div>`;

        /* ── Flavour text ── */
        const flavour = deal.mood === 'generous' ? `${en.name} è disposta a condizioni vantaggiose. La guerra li ha indeboliti.`
                       : deal.mood === 'fair' ? `Le condizioni riflettono un equilibrio di potere. Un accordo ragionevole.`
                       : deal.mood === 'harsh' ? `${en.name} si sente in posizione di forza e pretende un prezzo alto.`
                       : `${en.name} vuole umiliarti. Queste condizioni sono quasi un'estorsione.`;
        html += `<div class="peace-flavour">💬 "${flavour}"</div>`;

        display.innerHTML = html;
        parseEmoji(els['peace-popup']);
        show('peace-popup');
    }

    function acceptPeace(enemyCode) {
        const state = GameEngine.getState();
        if (!state) return;

        const deal = GameEngine.calcPeaceDemands(state.player, enemyCode);
        if (!deal) return;

        const paid = GameEngine.applyPeaceDemands(state.player, enemyCode, deal.demands);
        if (!paid) {
            addEventToLog({ turn: state.turn, type: 'diplomacy', msg: '❌ Risorse insufficienti per pagare le condizioni di pace!' });
            return;
        }

        GameEngine.makePeace(state.player, enemyCode);

        /* Log the cost */
        const costStr = deal.demands.map(d => `${d.icon}${d.amount}`).join(' ');
        const en = state.nations[enemyCode];
        addEventToLog({ turn: state.turn, type: 'diplomacy',
            msg: `🕊️ Pace con ${fmtNation(en)} — Costo: ${costStr}` });

        hide('peace-popup');
        updateHUD();
        updateMilitaryBar();
        MapRenderer.colourAllTerritories();
        const sel = MapRenderer.getSelected && MapRenderer.getSelected();
        if (sel) showTerritoryPanel(sel);
    }

    function rejectPeace(enemyCode) {
        const state = GameEngine.getState();
        const en = state?.nations[enemyCode];
        GameEngine.adjustRelation(enemyCode, state.player, -10);
        addEventToLog({ turn: state.turn, type: 'diplomacy',
            msg: `❌ Pace rifiutata con ${fmtNation(en)} — La guerra continua! (-10 relazione)` });
        hide('peace-popup');
    }

    /* ════════════════ ECONOMY OVERVIEW ════════════════ */
    function showEconomy() {
        show('economy-popup');
        const state = GameEngine.getState();
        if (!state) return;
        const n = state.nations[state.player];
        const income = GameEngine.calcIncome(state.player);
        const terrCount = GameEngine.getTerritoryCount(state.player);

        let html = '';

        /* Current reserves */
        html += '<div class="econ-section"><h4>💰 RISERVE ATTUALI</h4><div class="econ-grid">';
        Object.entries(RESOURCES).forEach(([key, r]) => {
            const val = n.res[key] || 0;
            if (val > 0 || (income[key] || 0) > 0) {
                html += `<div class="econ-item"><span class="econ-icon">${r.icon}</span><span class="econ-name">${r.name}</span><span class="econ-val">${val}</span></div>`;
            }
        });
        html += '</div></div>';

        /* Per-turn income */
        html += '<div class="econ-section"><h4>📈 ENTRATE PER TURNO</h4>';
        html += `<div style="font-size:0.7rem;color:var(--text-dim);margin-bottom:8px;">Dai tuoi ${terrCount} territori. Territori conquistati producono il 70% delle risorse originali.</div>`;
        html += '<div class="econ-grid">';
        Object.entries(RESOURCES).forEach(([key, r]) => {
            const inc = income[key] || 0;
            if (inc > 0) {
                html += `<div class="econ-item"><span class="econ-icon">${r.icon}</span><span class="econ-name">${r.name}</span><span class="econ-val econ-pos">+${inc}/turno</span></div>`;
            }
        });
        html += '</div></div>';

        /* Sanctions impact */
        if (n.sanctions.length > 0) {
            html += '<div class="econ-section"><h4>⚠️ SANZIONI SUBITE</h4>';
            html += `<div style="font-size:0.75rem;color:var(--accent3)">${n.sanctions.length} nazioni ti sanzionano (-${n.sanctions.length * 5}% produzione)</div>`;
            html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">';
            n.sanctions.forEach(sc => {
                const sn = state.nations[sc];
                if (sn) html += `<span style="font-size:0.7rem;background:rgba(255,170,0,0.1);padding:2px 6px;border-radius:3px;">${sn.flag} ${sn.name}</span>`;
            });
            html += '</div></div>';
        }

        /* Strategic assets controlled */
        html += '<div class="econ-section"><h4>⚓ ASSET STRATEGICI</h4><div class="econ-grid">';
        let anyAsset = false;
        Object.entries(STRATEGIC_ASSETS).forEach(([id, asset]) => {
            const owned = asset.holders.some(h => state.territories[h] === state.player);
            if (owned) {
                const bonusStr = Object.entries(asset.bonus).map(([r,v]) => `+${v}${RESOURCES[r]?.icon||r}`).join(' ');
                html += `<div class="econ-item"><span class="econ-icon">${asset.icon}</span><span class="econ-name">${asset.name}</span><span class="econ-val econ-pos">${bonusStr}</span></div>`;
                anyAsset = true;
            }
        });
        if (!anyAsset) html += '<div style="color:var(--text-dim);font-size:0.75rem;">Nessun asset controllato</div>';
        html += '</div></div>';

        /* Army overview */
        html += '<div class="econ-section"><h4>🪖 FORZE ARMATE</h4><div class="econ-grid">';
        Object.entries(UNIT_TYPES).forEach(([key, ut]) => {
            const count = n.army[key] || 0;
            if (count > 0) {
                const upkeep = Math.round(Object.values(ut.cost).reduce((a,b) => a+b, 0) * 0.02);
                html += `<div class="econ-item"><span class="econ-icon">${ut.icon}</span><span class="econ-name">${ut.name} ×${count}</span><span class="econ-val">⚔️${ut.atk*count} 🛡️${ut.def*count}</span></div>`;
            }
        });
        const totalAtk = GameEngine.calcMilitary(state.player, 'atk');
        const totalDef = GameEngine.calcMilitary(state.player, 'def');
        html += `</div><div style="margin-top:6px;font-size:0.8rem;font-family:var(--font-mono);color:var(--gold);">Potenza Totale: ⚔️${totalAtk} ATK | 🛡️${totalDef} DEF</div></div>`;

        /* Technologies */
        html += '<div class="econ-section"><h4>🔬 TECNOLOGIE RICERCATE</h4>';
        if (n.techs.length > 0) {
            html += '<div style="display:flex;flex-wrap:wrap;gap:4px;">';
            n.techs.forEach(tid => {
                const t = TECHNOLOGIES.find(tt => tt.id === tid);
                if (t) html += `<span style="font-size:0.7rem;background:rgba(0,230,118,0.1);padding:2px 8px;border-radius:3px;color:var(--green);">${t.icon} ${t.name}</span>`;
            });
            html += '</div>';
        } else {
            html += '<div style="color:var(--text-dim);font-size:0.75rem;">Nessuna tecnologia ricercata</div>';
        }
        html += '</div>';

        els['economy-display'].innerHTML = html;
    }

    /* ════════════════ END TURN / AI PHASE ════════════════ */
    let aiTurnBusy = false;
    let autoPlayMode = false;   // true when auto-advancing (both alive or dead)
    let playerDead   = false;   // true when player lost all territories
    let autoPlayStop = false;   // true when user pauses or game ends

    /* Speed multiplier for delays: 1 = normal, 0.5 = autoplay */
    function dly(ms) { return delay(autoPlayMode ? Math.round(ms * 0.5) : ms); }

    async function endTurn() {
        const state = GameEngine.getState();
        if (!state || state.gameOver || aiTurnBusy) return;
        /* In normal mode, must be player phase; in autoplay, skip check */
        if (!autoPlayMode && state.phase !== 'player') return;
        aiTurnBusy = true;

        /* Close sidebar */
        hide('left-panel');

        /* Clear previous turn's missile trail traces */
        Animations.clearTurnTrails();

        GameEngine.endPlayerTurn();

        /* Log AI turn start */
        addEventToLog({ turn: state.turn, type:'game', msg:'🤖 <strong>TURNO AI — T' + state.turn + '</strong>' });

        /* Disable end-turn button during AI */
        const btnEnd = els['btn-end-turn'];
        if (btnEnd) { btnEnd.disabled = true; btnEnd.style.opacity = '0.4'; }

        /* Collect all AI actions */
        const allActions = await AI.processAllAI(() => {});

        /* Separate important actions from minor ones */
        const majorTypes = new Set(['attack','war_declare','nuke','alliance','betray','peace','revolt']);
        const majorActions = allActions.filter(a => majorTypes.has(a.type));
        const minorActions = allActions.filter(a => !majorTypes.has(a.type));

        /* Render minor actions in event log (no delay) */
        for (const act of minorActions) {
            logAIAction(act, state);
        }

        /* Render major actions with delays & live map animations */
        MapRenderer.resizeFx();
        for (const act of majorActions) {
            logAIAction(act, state);

            if (act.type === 'attack' && act.result) {
                const _aN = state.nations[act.result.attacker];
                const _dN = state.nations[act.result.defender];
                const _aI = { code: act.result.attacker, name: _aN?.name, flag: _aN?.flag, color: _aN?.color };
                const _dI = { code: act.result.defender, name: _dN?.name, flag: _dN?.flag, color: _dN?.color };
                const aiLaunchCode = act.result.launchFrom || act.nation;
                Animations.spawnBattleFX(aiLaunchCode, act.target, act.result.success, _aI, _dI);
                if (act.result.conquered) {
                    MapRenderer.colourAllTerritories();
                    Animations.spawnConquerFX(act.target);
                }
                /* Homeland siege colony releases */
                if (act.result.homelandSiege && act.result.homelandSiege.releasedColonies.length > 0) {
                    const siege = act.result.homelandSiege;
                    for (let ci = 0; ci < siege.releasedColonies.length; ci++) {
                        const colCode = siege.releasedColonies[ci];
                        Animations.spawnConquerFX(colCode);
                        Animations.spawnText(colCode, siege.survived ? '🏳️ Ceduto' : '💀', '#ff6e40', true);
                    }
                    MapRenderer.colourAllTerritories();
                    if (siege.survived && siege.retreatedTo) {
                        Animations.spawnText(siege.retreatedTo, '🛡️ Ritirata!', '#ffd740', true);
                    }
                }
                await dly(autoPlayMode ? 900 : 500);
            } else if (act.type === 'nuke' && act.result) {
                const _nkA = state.nations[act.result.attacker || act.nation];
                const _nkD = state.nations[act.result.defender || act.target];
                const _nkAI = { code: act.nation, name: _nkA?.name, flag: _nkA?.flag, color: _nkA?.color };
                const _nkDI = { code: act.target, name: _nkD?.name, flag: _nkD?.flag, color: _nkD?.color };
                Animations.spawnNukeFX(act.nation, act.target, _nkAI, _nkDI);
                MapRenderer.colourAllTerritories();
                await dly(autoPlayMode ? 1200 : 700);
            } else if (act.type === 'war_declare') {
                MapRenderer.flashTerritory(act.target, '#ff4400', autoPlayMode ? 400 : 500);
                await dly(autoPlayMode ? 500 : 300);
            } else if (act.type === 'alliance' || act.type === 'peace') {
                await dly(150);
            } else if (act.type === 'betray') {
                MapRenderer.flashTerritory(act.target, '#ff00ff', autoPlayMode ? 400 : 500);
                await dly(autoPlayMode ? 500 : 300);
            } else if (act.type === 'revolt') {
                Animations.spawnRevoltFX(act.target);
                MapRenderer.colourAllTerritories();
                await dly(autoPlayMode ? 600 : 400);
            } else {
                await dly(100);
            }
        }

        /* Final map colour update */
        MapRenderer.colourAllTerritories();
        await dly(300);

        /* DevLog: capture turn diagnostics for console analysis */
        if (typeof DevLog !== 'undefined') DevLog.onTurnEnd(allActions);

        /* Log summary in event log — single pass instead of 5 filter() calls */
        let attackCount = 0, warCount = 0, nukeCount = 0, conquests = 0, revoltCount = 0;
        for (let i = 0; i < allActions.length; i++) {
            const a = allActions[i];
            if (a.type === 'attack') { attackCount++; if (a.result?.conquered) conquests++; }
            else if (a.type === 'war_declare') warCount++;
            else if (a.type === 'nuke') nukeCount++;
            else if (a.type === 'revolt') revoltCount++;
        }
        let summary = `📊 <strong>RIEPILOGO T${state.turn}:</strong> ${allActions.length} azioni | ⚔️${attackCount} battaglie | 🏴${conquests} conquiste | 🔥${warCount} guerre | ☢️${nukeCount} nucleari`;
        if (revoltCount > 0) summary += ` | 🔥${revoltCount} rivolte`;
        addEventToLog({ turn: state.turn, type:'game', msg: summary });

        /* Check victory */
        const victor = GameEngine.checkVictory();
        if (victor) {
            showGameOver(victor);
            aiTurnBusy = false;
            autoPlayStop = true;
            return;
        }

        /* Check if player was eliminated this turn */
        if (!playerDead) {
            const playerTerr = GameEngine.getTerritoryCount(state.player);
            if (playerTerr === 0) {
                playerDead = true;
                addEventToLog({ turn: state.turn, type:'nuke',
                    msg: `💀 <strong>${state.nations[state.player]?.flag||''} ${state.nations[state.player]?.name||'Tu'} È STATO ELIMINATO!</strong> Modalità spettatore attiva.`
                });
                if (!autoPlayMode) startAutoPlay();
                else updateAutoPlayBanner();
            }
        }

        /* New turn */
        GameEngine.startNewTurn();
        updateHUD();
        updateMilitaryBar();
        MapRenderer.colourAllTerritories();

        /* Refresh the left sidebar if it was open — buttons go from disabled to active */
        if (!autoPlayMode && !playerDead) {
            const sel = MapRenderer.getSelected && MapRenderer.getSelected();
            if (sel && els['left-panel'] && !els['left-panel'].classList.contains('hidden')) {
                showTerritoryPanel(sel);
                _flashTurnNotice();
            }
        }

        /* Show revolt alert to player if any territory has high unrest */
        if (!autoPlayMode && !playerDead) {
            showRevoltAlert();
        }

        /* Refresh spectator/autoplay banner year */
        if (autoPlayMode) updateAutoPlayBanner();

        /* Re-enable end-turn button if not in autoplay */
        if (!autoPlayMode && btnEnd) { btnEnd.disabled = false; btnEnd.style.opacity = '1'; }

        aiTurnBusy = false;

        /* In autoplay mode, auto-advance to next turn */
        if (autoPlayMode && !autoPlayStop) {
            await delay(800);
            endTurn();
        }
    }

    /* ═══ AUTOPLAY: works both when alive and when dead ═══ */
    function startAutoPlay() {
        autoPlayMode = true;
        autoPlayStop = false;
        Animations.setSpeed(1.8);
        showAutoPlayBanner();

        /* Hide end-turn and autoplay buttons */
        const btnEnd = els['btn-end-turn'];
        if (btnEnd) btnEnd.style.display = 'none';
        const btnAuto = document.getElementById('btn-autoplay');
        if (btnAuto) btnAuto.style.display = 'none';

        /* If not already running, kick off a turn */
        if (!aiTurnBusy) endTurn();
    }

    function stopAutoPlay() {
        autoPlayMode = false;
        autoPlayStop = true;
        Animations.setSpeed(1);

        /* If player is still alive, restore controls */
        if (!playerDead) {
            const btnEnd = els['btn-end-turn'];
            if (btnEnd) { btnEnd.style.display = ''; btnEnd.disabled = false; btnEnd.style.opacity = '1'; }
            const btnAuto = document.getElementById('btn-autoplay');
            if (btnAuto) btnAuto.style.display = '';
        }

        hideAutoPlayBanner();
    }

    function showAutoPlayBanner() {
        let banner = document.getElementById('spectator-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'spectator-banner';
            document.body.appendChild(banner);
        }
        updateAutoPlayBanner();
        banner.classList.remove('hidden');
        document.body.classList.add('spectator-active');
    }

    function updateAutoPlayBanner() {
        const banner = document.getElementById('spectator-banner');
        if (!banner) return;

        const state = GameEngine.getState();
        const year = state ? 2025 + state.turn : '—';

        /* If the banner already has the correct mode, just update the year label */
        const existingLabel = banner.querySelector('.spectator-label');
        const needsDead = playerDead;
        const hasDead = banner.classList.contains('banner-dead');
        const hasAuto = banner.classList.contains('banner-auto');

        if ((needsDead && hasDead) || (!needsDead && hasAuto)) {
            /* Just refresh the year text */
            if (existingLabel) {
                if (needsDead) {
                    existingLabel.innerHTML = `<span style="opacity:0.85">💀</span> <strong>ELIMINATO</strong> <span style="opacity:0.5;margin:0 6px;">│</span> Modalità spettatore · Anno ${year}`;
                } else {
                    existingLabel.innerHTML = `⏩ <strong>AUTO-PLAY</strong> <span style="opacity:0.5;margin:0 6px;">│</span> Anno ${year}`;
                }
            }
            return;
        }

        /* Mode changed — full rebuild */
        banner.classList.remove('banner-dead', 'banner-auto', 'hidden');

        if (playerDead) {
            banner.classList.add('banner-dead');
            banner.innerHTML = `
                <span class="spectator-label"><span style="opacity:0.85">💀</span> <strong>ELIMINATO</strong> <span style="opacity:0.5;margin:0 6px;">│</span> Modalità spettatore · Anno ${year}</span>
                <div class="spectator-btns">
                    <button id="btn-auto-toggle" class="btn-sm">⏸ PAUSA</button>
                    <button id="btn-auto-restart" class="btn-sm btn-stop">🔄 RICOMINCIA</button>
                </div>`;
            document.getElementById('btn-auto-toggle').addEventListener('click', () => {
                autoPlayStop = !autoPlayStop;
                const btn = document.getElementById('btn-auto-toggle');
                if (autoPlayStop) {
                    btn.textContent = '▶ RIPRENDI';
                } else {
                    btn.textContent = '⏸ PAUSA';
                    endTurn();
                }
            });
            document.getElementById('btn-auto-restart').addEventListener('click', () => location.reload());
        } else {
            banner.classList.add('banner-auto');
            banner.innerHTML = `
                <span class="spectator-label">⏩ <strong>AUTO-PLAY</strong> <span style="opacity:0.5;margin:0 6px;">│</span> Anno ${year}</span>
                <div class="spectator-btns">
                    <button id="btn-auto-stop" class="btn-sm">⏹ TORNA A GIOCARE</button>
                </div>`;
            document.getElementById('btn-auto-stop').addEventListener('click', () => {
                stopAutoPlay();
            });
        }
    }

    function hideAutoPlayBanner() {
        const banner = document.getElementById('spectator-banner');
        if (banner) banner.classList.add('hidden');
        document.body.classList.remove('spectator-active');
    }

    /* ── Log AI actions directly to the event log (right panel) ── */
    /* Helper: wrap flag + name in styled spans for the event log */
    function fmtNation(n) {
        if (!n) return `<span class="evt-flag" style="background:#607d8b"></span><span class="evt-nation">?</span>`;
        return `<span class="evt-flag" style="background:${n.color||'#607d8b'}"></span><span class="evt-nation">${n.name}</span>`;
    }

    function logAIAction(action, state) {
        const n = state.nations[action.nation];
        if (!n) return;

        function tgt(code) {
            const dn = state.nations[code];
            if (dn) return fmtNation(dn);
            const ow = state.territories[code];
            const own = state.nations[ow];
            if (own) return fmtNation(own);
            return `<span class="evt-flag" style="background:#607d8b"></span><span class="evt-nation">${code.toUpperCase()}</span>`;
        }

        const me = fmtNation(n);
        let msg = '';
        let type = 'game';

        switch (action.type) {
            case 'attack': {
                const ok = action.result?.success;
                const icon = ok ? '✅' : '❌';
                const res = ok
                    ? `<span class="evt-result win">VITTORIA</span>`
                    : `<span class="evt-result lose">SCONFITTA</span>`;
                msg = `${icon} ${me} → ${tgt(action.target)} ${res}`;
                if (action.result?.conquered) msg += ' 🏴';
                type = 'battle';
                break;
            }
            case 'war_declare': {
                msg = `🔥 ${me} <span class="evt-action">dichiara guerra a</span> ${tgt(action.target)}`;
                type = 'diplomacy';
                break;
            }
            case 'alliance': {
                msg = `🤝 ${me} <span class="evt-action">alleanza con</span> ${tgt(action.target)}`;
                type = 'diplomacy';
                break;
            }
            case 'peace': {
                msg = `🕊️ ${me} <span class="evt-action">pace con</span> ${tgt(action.target)}`;
                type = 'diplomacy';
                break;
            }
            case 'nuke': {
                msg = `☢️ ${me} <span class="evt-action">nucleare su</span> ${tgt(action.target)}`;
                type = 'nuke';
                break;
            }
            case 'sanction': {
                msg = `🚫 ${me} <span class="evt-action">sanziona</span> ${tgt(action.target)}`;
                type = 'diplomacy';
                break;
            }
            case 'build': {
                const ut = UNIT_TYPES[action.unit];
                msg = `🏭 ${me} <span class="evt-action">+</span>${ut?.icon || ''} ${ut?.name || action.unit}`;
                type = 'resource';
                break;
            }
            case 'research': {
                const tech = TECHNOLOGIES.find(t => t.id === action.tech);
                msg = `🔬 ${me} <span class="evt-action">ricerca</span> ${tech?.icon || ''} ${tech?.name || action.tech}`;
                type = 'tech';
                break;
            }
            case 'betray': {
                msg = `💔 ${me} <span class="evt-action">tradisce</span> ${tgt(action.target)}`;
                type = 'diplomacy';
                break;
            }
            case 'revolt': {
                const fromN = state.nations[action.from];
                msg = `🔥 ${me} <span class="evt-action">RIVOLTA!</span> Territorio strappato a ${fromN ? fmtNation(fromN) : tgt(action.from)}`;
                type = 'battle';
                break;
            }
            case 'suppress_unrest': {
                msg = `🛡️ ${me} <span class="evt-action">seda rivolta in</span> ${tgt(action.target)}`;
                type = 'game';
                break;
            }
            default: {
                msg = `${me}: ${action.type}`;
            }
        }

        addEventToLog({ turn: state.turn, type, msg });

        /* Also auto-scroll to see eliminations */
        if (action.result?.conquered) {
            const defender = action.result.defender;
            const dN = state.nations[defender];
            const remaining = GameEngine.getTerritoryCount ? GameEngine.getTerritoryCount(defender) : -1;
            if (remaining === 0) {
                addEventToLog({ turn: state.turn, type:'battle',
                    msg: `💀 ${fmtNation(dN)} <span class="evt-action">è stata eliminata!</span>`
                });
            }
        }

        /* Homeland siege events: colony releases and retreat */
        if (action.result?.homelandSiege) {
            const siege = action.result.homelandSiege;
            const atkN = state.nations[action.result.attacker || action.nation];
            const defN = state.nations[action.result.defender];
            if (siege.releasedColonies.length > 0) {
                const colNames = siege.releasedColonies.map(c => {
                    const cn = typeof getNation !== 'undefined' ? getNation(c) : null;
                    return cn?.name || c.toUpperCase();
                }).join(', ');
                addEventToLog({ turn: state.turn, type:'battle',
                    msg: `🏳️ ${fmtNation(defN)} <span class="evt-action">cede ${siege.releasedColonies.length} colonie:</span> ${colNames}`
                });
            }
            if (siege.survived && siege.retreatedTo) {
                const retName = typeof getNation !== 'undefined' ? getNation(siege.retreatedTo)?.name : siege.retreatedTo.toUpperCase();
                addEventToLog({ turn: state.turn, type:'battle',
                    msg: `🛡️ ${fmtNation(defN)} <span class="evt-action">sopravvive! Si ritira a</span> ${retName || siege.retreatedTo.toUpperCase()}`
                });
            } else if (!siege.survived) {
                addEventToLog({ turn: state.turn, type:'battle',
                    msg: `💀 ${fmtNation(defN)} <span class="evt-action">COLLASSO TOTALE!</span> ${fmtNation(atkN)} conquista tutto`
                });
            }
        }
    }

    /* ════════════════ EVENT LOG ════════════════ */
    /**
     * Auto-follow system:
     * - `evtAutoScroll = true`  → every new event auto-scrolls to bottom. LIVE btn hidden.
     * - `evtAutoScroll = false` → user scrolled up to read history. LIVE btn visible.
     * - Clicking LIVE re-enables auto-follow.
     * - User-initiated scroll UP disables auto-follow.
     * - User-initiated scroll to bottom re-enables auto-follow.
     *
     * _pendingScroll is incremented before any DOM mutation that shifts
     * scrollTop (appendChild, removeChild) and decremented inside the
     * rAF that calls _scrollToBottom.  While _pendingScroll > 0 the
     * scroll listener ignores every event — no timers, no races.
     */
    let evtAutoScroll  = true;
    let _pendingScroll = 0;   // > 0 → ignore scroll events (DOM mutation in flight)

    function setupEventLog() {
        const log = els['event-log'];
        if (!log) return;

        /* Start with LIVE hidden (auto-follow is ON by default) */
        hideLiveBtn();

        log.addEventListener('scroll', () => {
            /* Ignore scroll events caused by our own DOM mutations / scrollTop writes */
            if (_pendingScroll > 0) return;

            const distFromBottom = log.scrollHeight - log.scrollTop - log.clientHeight;

            if (distFromBottom < 40) {
                /* User scrolled back to bottom → re-enable auto-follow */
                if (!evtAutoScroll) {
                    evtAutoScroll = true;
                    hideLiveBtn();
                }
            } else {
                /* User scrolled up → disable auto-follow, show LIVE */
                if (evtAutoScroll) {
                    evtAutoScroll = false;
                    showLiveBtn();
                }
            }
        }, { passive: true });

        /* LIVE button — re-enable auto-follow and snap to bottom */
        const btnLive = document.getElementById('btn-live');
        if (btnLive) {
            btnLive.addEventListener('click', () => {
                evtAutoScroll = true;
                _pendingScroll++;
                _scrollToBottom(log);
                /* Let the resulting scroll event fire, then re-enable listener */
                requestAnimationFrame(() => { _pendingScroll = 0; });
                hideLiveBtn();
            });
        }

        /* Fullscreen toggle */
        const btnFS = document.getElementById('btn-fullscreen-events');
        if (btnFS) {
            btnFS.addEventListener('click', () => {
                const panel = els['right-panel'];
                if (!panel) return;
                panel.classList.toggle('evt-fullscreen');
                btnFS.textContent = panel.classList.contains('evt-fullscreen') ? '✖' : '⛶';
            });
        }

        /* Panel toggle (collapse) */
        const btnToggle = document.getElementById('btn-toggle-right');
        const btnReopen = document.getElementById('btn-reopen-events');
        if (btnToggle) {
            btnToggle.addEventListener('click', () => {
                const panel = els['right-panel'];
                if (!panel) return;
                panel.classList.remove('evt-fullscreen');
                panel.classList.toggle('hidden');
                if (btnReopen) {
                    if (panel.classList.contains('hidden')) {
                        btnReopen.classList.remove('hidden');
                        document.body.classList.add('evt-minimized');
                    } else {
                        btnReopen.classList.add('hidden');
                        document.body.classList.remove('evt-minimized');
                    }
                }
            });
        }
        if (btnReopen) {
            btnReopen.addEventListener('click', () => {
                const panel = els['right-panel'];
                if (!panel) return;
                panel.classList.remove('hidden');
                btnReopen.classList.add('hidden');
                document.body.classList.remove('evt-minimized');
            });
        }
    }

    /** Programmatic scroll-to-bottom.
     *  Decrements _pendingScroll so the scroll listener re-activates
     *  only after all pending DOM mutations have been scrolled. */
    function _scrollToBottom(log) {
        log.scrollTop = log.scrollHeight;
    }

    function showLiveBtn() { const b = document.getElementById('btn-live'); if (b) b.classList.remove('hidden'); }
    function hideLiveBtn() { const b = document.getElementById('btn-live'); if (b) b.classList.add('hidden'); }

    /* Cached colony/ally names — refreshed once per turn */
    let _evtCacheTurn = -1;
    let _evtPlayerName = '';
    let _evtColonyNames = [];
    let _evtAllyNames = [];

    function _refreshEvtCache() {
        const state = GameEngine.getState();
        if (!state) return;
        if (_evtCacheTurn === state.turn) return;
        _evtCacheTurn = state.turn;
        const pn = state.nations[state.player];
        _evtPlayerName = pn?.name || '';
        _evtColonyNames = Object.entries(state.territories)
            .filter(([tCode, o]) => o === state.player && tCode !== state.player)
            .map(([tCode]) => getNation(tCode)?.name)
            .filter(Boolean);
        _evtAllyNames = [];
        const majorCodes = Object.keys(NATIONS);
        for (const c of majorCodes) {
            if (c !== state.player && GameEngine.isAlly(state.player, c)) {
                const an = state.nations[c];
                if (an) _evtAllyNames.push(an.name);
            }
        }
    }

    /* Deferred scroll — coalesces multiple addEventToLog calls into a single scroll */
    let _scrollRaf = 0;

    function addEventToLog(entry) {
        const log = els['event-log'];
        if (!log) return;

        const typeMap = {
            battle: 'evt-battle', resource: 'evt-resource', diplomacy: 'evt-diplomacy',
            tech: 'evt-tech', nuke: 'evt-nuke', game: ''
        };

        /* Classify using cached names (fast) */
        _refreshEvtCache();
        let ownerClass = '';
        const msg = entry.msg || '';
        if (_evtPlayerName && msg.includes(_evtPlayerName)) {
            ownerClass = 'evt-mine';
        } else if (_evtColonyNames.some(n => msg.includes(n))) {
            ownerClass = 'evt-mine';
        } else if (_evtAllyNames.some(n => msg.includes(n))) {
            ownerClass = 'evt-ally';
        }

        const div = document.createElement('div');
        div.className = `event-item ${typeMap[entry.type] || ''} ${ownerClass}`.trim();
        div.innerHTML = `<span class="evt-turn">T${entry.turn}</span> ${msg}`;
        parseEmojiIfNeeded(div);

        /* ── DOM mutations: guard with _pendingScroll so the scroll
           listener ignores any layout-induced scroll events ── */
        _pendingScroll++;

        /* Trim old entries BEFORE appending the new one */
        while (log.children.length >= 80) log.removeChild(log.firstChild);

        log.appendChild(div);

        /* Auto-scroll to bottom on next frame (coalesced).
           The rAF clears _pendingScroll AFTER scrolling, so the listener
           only re-activates once we're firmly at the bottom. */
        if (evtAutoScroll && !_scrollRaf) {
            _scrollRaf = requestAnimationFrame(() => {
                _scrollRaf = 0;
                if (log && evtAutoScroll) {
                    _scrollToBottom(log);
                }
                /* Release the guard — any scroll event after this is user-initiated */
                _pendingScroll = 0;
            });
        } else if (evtAutoScroll) {
            /* rAF already scheduled — it will handle this event too.
               _pendingScroll stays > 0 until the rAF fires. */
        } else {
            _pendingScroll = 0;  // not auto-scrolling, release guard
            showLiveBtn();
        }
    }

    /* ════════════════ GAME OVER ════════════════ */
    let _victoryVictor = null; // track for banner re-open

    function showGameOver(victor) {
        /* Hide autoplay banner if present */
        hideAutoPlayBanner();
        _victoryVictor = victor;

        show('gameover-popup');
        const state = GameEngine.getState();
        const n = state.nations[victor];
        const isPlayer = victor === state.player;

        /* Victory type labels */
        const VICTORY_LABELS = {
            military:  { icon: '⚔️', label: 'VITTORIA MILITARE',   desc: 'Dominazione territoriale (≥85% territori)' },
            economic:  { icon: '💰', label: 'VITTORIA ECONOMICA',  desc: 'Supremazia economica (≥50K fondi + ≥30% territori)' },
            strategic: { icon: '🎯', label: 'VITTORIA STRATEGICA', desc: 'Controllo di tutti gli asset strategici' }
        };
        const vt = VICTORY_LABELS[state.victoryType] || VICTORY_LABELS.military;

        if (isPlayer) {
            els['gameover-title'].textContent = '🏆 HAI VINTO!';
            els['gameover-title'].style.color = 'var(--gold)';
            els['gameover-text'].textContent = `${n.flag} ${n.name} domina il mondo!`;
        } else if (playerDead) {
            els['gameover-title'].textContent = `🏆 ${n.flag} ${n.name} HA VINTO!`;
            els['gameover-title'].style.color = 'var(--accent)';
            els['gameover-text'].textContent = `${n.flag} ${n.name} ha conquistato il dominio globale al turno ${state.turn}.`;
        } else {
            els['gameover-title'].textContent = '💀 HAI PERSO!';
            els['gameover-title'].style.color = 'var(--red)';
            els['gameover-text'].textContent = `${n.flag} ${n.name} ha conquistato il dominio globale.`;
        }

        const victorTerr = GameEngine.getTerritoryCount(victor);
        const totalTerr = SVG_IDS.length;
        els['gameover-stats'].innerHTML = `
            <div class="go-stat" style="grid-column:1/-1;background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.25);border-radius:8px;padding:8px;">
                <div class="label">${vt.icon} Tipo di Vittoria</div>
                <div class="val" style="font-size:1rem;color:var(--gold);">${vt.label}</div>
                <div style="font-size:0.65rem;color:#90a4ae;margin-top:2px;">${vt.desc}</div>
            </div>
            <div class="go-stat"><div class="label">Vincitore</div><div class="val">${n.flag} ${n.name}</div></div>
            <div class="go-stat"><div class="label">Turni</div><div class="val">${state.turn}</div></div>
            <div class="go-stat"><div class="label">Territori</div><div class="val">${victorTerr}/${totalTerr}</div></div>
            <div class="go-stat"><div class="label">Fondi</div><div class="val">💰${n.res.money}</div></div>
        `;
        parseEmoji(els['gameover-popup']);

        /* Build the persistent victory banner text */
        const bannerTitle = isPlayer
            ? `🏆 ${n.flag} ${n.name} — ${vt.label} al turno ${state.turn}!`
            : playerDead
                ? `🏆 ${n.flag} ${n.name} ha vinto — ${vt.label}`
                : `💀 ${n.flag} ${n.name} ha vinto — ${vt.label}`;

        const banner = document.getElementById('victory-banner');
        if (banner) {
            banner.innerHTML = `
                <span class="victory-banner-text">${bannerTitle}</span>
                <button class="btn-sm btn-details-sm" id="btn-banner-details">📊 Dettagli</button>
                <button class="btn-sm btn-restart-sm" id="btn-banner-restart">🔄 Ricomincia</button>
            `;
            /* Wire banner buttons */
            document.getElementById('btn-banner-restart').addEventListener('click', () => location.reload());
            document.getElementById('btn-banner-details').addEventListener('click', () => {
                hideVictoryBanner();
                show('gameover-popup');
            });
        }
    }

    function showVictoryBanner() {
        const banner = document.getElementById('victory-banner');
        if (banner) banner.classList.remove('hidden');
    }

    function hideVictoryBanner() {
        const banner = document.getElementById('victory-banner');
        if (banner) banner.classList.add('hidden');
    }

    /* ════════════════ TURN NOTICE (sidebar flash) ════════════════ */
    /**
     * Brief "It's your turn!" flash at the top of the left-panel actions.
     * Auto-removes after 3 s with a fade-out animation.
     */
    function _flashTurnNotice() {
        const container = els['panel-actions'];
        if (!container) return;
        /* Avoid duplicates */
        const existing = container.querySelector('.turn-notice');
        if (existing) existing.remove();

        const notice = document.createElement('div');
        notice.className = 'turn-notice';
        notice.innerHTML = '🎯 È il tuo turno!';
        container.prepend(notice);
        parseEmojiIfNeeded(notice);

        /* Fade out after 2.5 s, remove after 3.5 s */
        setTimeout(() => notice.classList.add('turn-notice-out'), 2500);
        setTimeout(() => notice.remove(), 3500);
    }

    /* ════════════════ HELPERS ════════════════ */
    function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    /* ════════════════ PUBLIC ════════════════ */
    return {
        init,
        updateHUD,
        updateMilitaryBar,
        showProduction,
        showTechTree,
        showEconomy,
        doAttack,
        doSanction,
        doBuild,
        doResearch,
        doPeace,
        doAlly,
        doDeclareWar,
        doBreakAlliance,
        doNonAggression,
        doEmbargo,
        doTradeResources,
        executeTrade,
        doDemandTribute,
        doSpyMission,
        doNukeStrike,
        doPeaceFromPanel,
        doAllyFromPanel,
        acceptPeace,
        rejectPeace,
        doSuppressUnrest,
        doSuppressAllUnrest,
        showColonies,
        hideColonies,
        doSuppressFromColonies,
        doSuppressAllFromColonies,
        showNationDetail,
        showTerritoryPanel,
        addEventToLog,
        startAutoPlay,
        stopAutoPlay
    };
})();
