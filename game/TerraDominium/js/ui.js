/* ═══════════════════════════════════════════════════════
   GeoDominion — UI Controller  (v2 — SVG)
   All UI interactions, popups, HUD, event log
   ═══════════════════════════════════════════════════════ */

const UI = (() => {
    /* ── refs (cached after DOM ready) ── */
    let els = {};

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
            'btn-end-turn','btn-tech-tree','btn-diplomacy',
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
            'ai-turn-overlay',
            'spy-popup','spy-popup-title','spy-popup-display','btn-close-spy'
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
        click('btn-close-battle', () => hide('battle-popup'));
        click('btn-close-tech', () => hide('tech-popup'));
        click('btn-close-diplomacy', () => hide('diplomacy-popup'));
        click('btn-close-production', () => hide('production-popup'));
        click('btn-close-economy', () => hide('economy-popup'));
        click('btn-close-spy', () => hide('spy-popup'));
        click('btn-close-left', () => hide('left-panel'));
        click('btn-restart', () => location.reload());
    }

    function click(id, fn) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', fn);
    }

    function show(id) { const el = els[id] || document.getElementById(id); if (el) el.classList.remove('hidden'); }
    function hide(id) { const el = els[id] || document.getElementById(id); if (el) el.classList.add('hidden'); }

    /* ════════════════ MAP CALLBACKS ════════════════ */
    function setupMapCallbacks() {
        MapRenderer.onClick = (code, e) => {
            MapRenderer.selectTerritory(code);
            showTerritoryPanel(code);
        };

        MapRenderer.onHover = (code, e) => {
            showTooltip(code, e);
        };

        MapRenderer.onLeave = () => {
            hideTooltip();
        };
    }

    /* ════════════════ TOOLTIP ════════════════ */
    function showTooltip(code, e) {
        const tt = els['map-tooltip'];
        if (!tt) return;
        const state = GameEngine.getState();
        if (!state) return;

        const owner = state.territories[code] || code;
        const n = state.nations[owner];
        const tBase = getNation(code);
        const isMyTerritory = owner === state.player;
        const atWar = GameEngine.isAtWar(state.player, owner);
        const isAlly = GameEngine.isAlly(state.player, owner);

        let html = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">`;
        const ownerColor = n?.color || '#607d8b';
        html += `<div style="width:14px;height:14px;border-radius:50%;background:${ownerColor};border:2px solid rgba(255,255,255,0.3);flex-shrink:0;"></div>`;
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
            html += `<div class="tt-res">💰${n.res.money} 🛢️${n.res.oil} 🔩${n.res.steel} 🌾${n.res.food}</div>`;
        }

        /* Garrison info (all territories) */
        if (typeof GameEngine.getGarrison === 'function') {
            const g = GameEngine.getGarrison(code);
            if (g && g.total > 0) {
                const strengthColors = { heavy: '#00e5ff', medium: '#ffd740', light: '#ff9100', none: '#ff1744' };
                const sCol = strengthColors[g.strength] || '#607d8b';
                html += `<div class="tt-res" style="color:${sCol};">${g.icon} ${g.total.toFixed(0)} unità — ${g.strength.toUpperCase()}</div>`;
            } else {
                html += `<div class="tt-res" style="color:#ff1744;">⚠ SENZA GUARNIGIONE</div>`;
            }
        }

        /* Show military power for enemies */
        if (atWar && n) {
            const ePow = GameEngine.calcMilitary(owner, 'atk');
            html += `<div class="tt-res" style="color:#ff1744;">⚔️ ATK: ${ePow}</div>`;
        }

        tt.innerHTML = html;
        tt.classList.remove('hidden');
        const rect = els['map-container'].getBoundingClientRect();
        tt.style.left = (e.clientX - rect.left + 15) + 'px';
        tt.style.top  = (e.clientY - rect.top - 10) + 'px';
    }

    function hideTooltip() {
        const tt = els['map-tooltip'];
        if (tt) tt.classList.add('hidden');
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
    }

    function selectNationCard(code) {
        selectedNation = code;
        /* Highlight */
        document.querySelectorAll('.nation-card').forEach(c => c.classList.remove('selected'));
        document.querySelector(`.nation-card[data-code="${code}"]`)?.classList.add('selected');

        /* Show preview */
        const n = NATIONS[code];
        show('nation-preview');
        els['preview-flag'].textContent = n.flag;
        els['preview-name'].textContent = n.name;

        let statsHtml = '';
        statsHtml += statBox('Potenza', n.power);
        statsHtml += statBox('💰 Fondi', n.res.money);
        statsHtml += statBox('🛢️ Petrolio', n.res.oil);
        statsHtml += statBox('🔩 Acciaio', n.res.steel);
        statsHtml += statBox('🪖 Esercito', Object.values(n.army).reduce((a,b)=>a+b,0));
        statsHtml += statBox('Profilo', n.profile.toUpperCase());
        els['preview-stats'].innerHTML = statsHtml;
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
        els['hud-turn'].textContent = `Turno ${state.turn} (${year}) | 🌍${terrCount}`;

        /* Calculate per-turn income from all owned territories */
        const income = GameEngine.calcIncome(state.player);

        /* Resources bar: show current + income */
        const topRes = ['money','oil','gas','rareEarth','steel','food','uranium'];
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
    }

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

        legend.innerHTML = html;
    }

    /* ════════════════ NATION DETAIL (from legend click) ════════════════ */
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
        if (isPlayer) badge = `<span style="background:rgba(0,229,255,0.2);color:#00e5ff;padding:2px 8px;border-radius:3px;font-size:0.75rem;">👑 LA TUA NAZIONE</span>`;
        else if (atWar) badge = `<span style="background:rgba(255,23,68,0.2);color:#ff1744;padding:2px 8px;border-radius:3px;font-size:0.75rem;">⚔️ IN GUERRA</span>`;
        else if (isAlly) badge = `<span style="background:rgba(0,230,118,0.2);color:#00e676;padding:2px 8px;border-radius:3px;font-size:0.75rem;">🤝 ALLEATO</span>`;
        else badge = `<span style="color:var(--text-dim);font-size:0.75rem;">Relazione: ${rel}</span>`;
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
            /* Group: show original + conquered separately */
            const originalTerr = NATIONS[code]?.territories || [];
            const conquered = myTerritories.filter(t => !originalTerr.includes(t));
            const original = myTerritories.filter(t => originalTerr.includes(t));

            if (original.length > 0) {
                resHtml += `<div style="font-size:0.6rem;color:var(--text-dim);margin:4px 0 2px;text-transform:uppercase;letter-spacing:1px;">Originali (${original.length})</div>`;
                original.forEach(t => {
                    const tb = getNation(t);
                    resHtml += `<div class="res-row" style="font-size:0.7rem;padding:1px 0;"><span>${tb.flag||'🏳️'} ${tb.name||t.toUpperCase()}</span></div>`;
                });
            }
            if (conquered.length > 0) {
                resHtml += `<div style="font-size:0.6rem;color:var(--gold);margin:6px 0 2px;text-transform:uppercase;letter-spacing:1px;">⚔ Conquistati (${conquered.length})</div>`;
                conquered.forEach(t => {
                    const tb = getNation(t);
                    resHtml += `<div class="res-row" style="font-size:0.7rem;padding:1px 0;"><span>${tb.flag||'🏳️'} ${tb.name||t.toUpperCase()}</span></div>`;
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
            if (atWar) {
                actHtml += `<button class="btn-action btn-move" onclick="UI.doPeace('${code}');">🕊️ Negozia Pace</button>`;
            } else if (isAlly) {
                actHtml += `<button class="btn-action btn-move" style="border-color:var(--accent3);color:var(--accent3)" onclick="UI.doBreakAlliance('${code}');">💔 Rompi Alleanza</button>`;
            } else {
                actHtml += `<button class="btn-action btn-build" onclick="UI.doAlly('${code}');">🤝 Alleanza</button>`;
                actHtml += `<button class="btn-action btn-attack" onclick="UI.doDeclareWar('${code}');">🔥 Dichiara Guerra</button>`;
            }
            actHtml += `<button class="btn-action btn-move" onclick="UI.doSpyMission('${code}');">🕵️ Spia (30💰)</button>`;
        }
        els['panel-actions'].innerHTML = actHtml;
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
        const rel = GameEngine.getRelation(state.player, owner);

        els['panel-territory-name'].textContent = `${tBase.flag || '\u{1F3F3}'} ${tBase.name || code.toUpperCase()}`;

        /* Clear ownership badge */
        let ownerBadge = '';
        if (isMyTerritory) {
            ownerBadge = `<span style="background:rgba(0,229,255,0.2);color:#00e5ff;padding:2px 8px;border-radius:3px;font-size:0.75rem;">\u{1F451} TUO TERRITORIO</span>`;
        } else if (atWar) {
            ownerBadge = `<span style="background:rgba(255,23,68,0.2);color:#ff1744;padding:2px 8px;border-radius:3px;font-size:0.75rem;">\u2694\uFE0F IN GUERRA</span>`;
        } else if (isAlly) {
            ownerBadge = `<span style="background:rgba(0,230,118,0.2);color:#00e676;padding:2px 8px;border-radius:3px;font-size:0.75rem;">\u{1F91D} ALLEATO</span>`;
        } else {
            const relIcon = rel > 20 ? '\u{1F60A}' : rel < -20 ? '\u{1F620}' : '\u{1F610}';
            ownerBadge = `<span style="color:var(--text-dim);font-size:0.75rem;">${n?.flag||''} ${n?.name||owner} ${relIcon} ${rel}</span>`;
        }
        els['panel-territory-owner'].innerHTML = ownerBadge;

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

        /* Garrison on this specific territory */
        let garHtml = '<h4>🏰 GUARNIGIONE LOCALE</h4>';
        if (typeof GameEngine.getGarrison === 'function') {
            const g = GameEngine.getGarrison(code);
            if (g && g.total > 0) {
                const strengthColors = { heavy: '#00e5ff', medium: '#ffd740', light: '#ff9100', none: '#ff1744' };
                const sCol = strengthColors[g.strength] || '#607d8b';
                garHtml += `<div class="res-row"><span>Forza</span><span class="val" style="color:${sCol};">${g.strength.toUpperCase()} (${g.total.toFixed(0)} unità)</span></div>`;
                garHtml += `<div class="res-row"><span>Tipo Dominante</span><span class="val">${g.icon} ${g.dominant}</span></div>`;
                const revoltMod = g.strength === 'heavy' ? '-5%' : g.strength === 'medium' ? '-3%' : g.strength === 'light' ? '-1%' : '+4%';
                const revColor = g.strength === 'none' ? '#ff1744' : '#00e676';
                garHtml += `<div class="res-row"><span>Mod. Rivolta</span><span class="val" style="color:${revColor};">${revoltMod}</span></div>`;
            } else {
                garHtml += `<div class="res-row"><span style="color:#ff1744;">⚠ Nessuna guarnigione — rischio rivolta elevato (+4%)</span></div>`;
            }
        } else {
            garHtml += '<div class="res-row"><span style="color:var(--text-dim)">Non disponibile</span></div>';
        }
        /* Insert garrison section after military */
        els['panel-military'].innerHTML += garHtml;

        /* ── Actions ── */
        let actHtml = '';

        if (isMyTerritory) {
            /* OWN TERRITORY ACTIONS */
            actHtml += `<button class="btn-action btn-build" onclick="UI.showProduction()">\u{1F3ED} Produci Unit\u00E0</button>`;
            actHtml += `<button class="btn-action btn-move" onclick="UI.showTechTree()">\u{1F52C} Ricerca Tecnologica</button>`;
            actHtml += `<button class="btn-action btn-move" onclick="UI.showEconomy()">\u{1F4CA} Panoramica Economica</button>`;
        } else {
            /* FOREIGN TERRITORY ACTIONS */
            actHtml += `<div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Azioni Militari</div>`;

            if (atWar) {
                actHtml += `<button class="btn-action btn-attack" onclick="UI.doAttack('${code}');">\u2694\uFE0F Attacca Territorio</button>`;
                if ((state.nations[state.player]?.army?.nuke || 0) > 0) {
                    actHtml += `<button class="btn-action btn-attack" style="border-color:#ff00ff;color:#ff00ff;background:rgba(255,0,255,0.1)" onclick="UI.doNukeStrike('${code}');">\u2622\uFE0F Attacco Nucleare</button>`;
                }
                actHtml += `<button class="btn-action btn-move" onclick="UI.doPeaceFromPanel('${owner}');">\u{1F54A}\uFE0F Negozia Pace</button>`;
            } else {
                actHtml += `<button class="btn-action btn-attack" onclick="UI.doDeclareWar('${owner}');">\u{1F525} Dichiara Guerra</button>`;
                actHtml += `<button class="btn-action btn-attack" onclick="UI.doAttack('${code}');">\u2694\uFE0F Attacco Rapido</button>`;
            }

            actHtml += `<div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin:8px 0 6px;">Diplomazia</div>`;

            if (!isAlly && !atWar) {
                actHtml += `<button class="btn-action btn-build" onclick="UI.doAllyFromPanel('${owner}');">\u{1F91D} Proponi Alleanza</button>`;
                actHtml += `<button class="btn-action btn-move" onclick="UI.doNonAggression('${owner}');">\u{1F4DD} Patto Non-Aggressione</button>`;
            }
            if (isAlly) {
                actHtml += `<button class="btn-action btn-move" style="border-color:var(--accent3);color:var(--accent3)" onclick="UI.doBreakAlliance('${owner}');">\u{1F494} Rompi Alleanza</button>`;
            }

            actHtml += `<div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin:8px 0 6px;">Economia</div>`;
            actHtml += `<button class="btn-action btn-move" onclick="UI.doTradeResources('${owner}');">\u{1F4B1} Scambia Risorse</button>`;
            actHtml += `<button class="btn-action btn-move" onclick="UI.doSanction('${owner}');">\u{1F6AB} Imponi Sanzioni</button>`;
            actHtml += `<button class="btn-action btn-move" style="border-color:var(--accent3);color:var(--accent3)" onclick="UI.doEmbargo('${owner}');">\u26D4 Embargo Commerciale</button>`;
            actHtml += `<button class="btn-action btn-move" onclick="UI.doDemandTribute('${owner}');">\u{1F4B0} Richiedi Tributo</button>`;

            /* Spy / Intel */
            actHtml += `<div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin:8px 0 6px;">Intelligence</div>`;
            actHtml += `<button class="btn-action btn-move" onclick="UI.doSpyMission('${owner}');">\u{1F575}\uFE0F Missione di Spionaggio</button>`;
        }

        els['panel-actions'].innerHTML = actHtml;
    }

    /* ════════════════ ATTACK ════════════════ */
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

        /* Animations */
        MapRenderer.resizeFx(); /* Ensure canvas is sized */
        Animations.spawnBattleFX(state.player, targetTerritory, result.success, atkInfo, defInfo);
        if (result.conquered) {
            setTimeout(() => {
                Animations.spawnConquerFX(targetTerritory);
                MapRenderer.colourAllTerritories();
            }, 600);
        }

        /* Always re-colour after attack */
        MapRenderer.colourAllTerritories();

        /* Show battle popup */
        showBattleResult(result);

        /* Refresh */
        updateHUD();
        updateMilitaryBar();
        showTerritoryPanel(targetTerritory);
    }

    function showBattleResult(result) {
        show('battle-popup');
        const state = GameEngine.getState();
        const atkN = state.nations[result.attacker];
        const defN = state.nations[result.defender];

        /* Compact unit summary: returns { rows, totalBefore, totalLost } */
        function unitRows(armyBefore, armyAfter) {
            let rows = [];
            let totalBefore = 0, totalLost = 0;
            Object.entries(UNIT_TYPES).forEach(([key, ut]) => {
                const before = armyBefore[key] || 0;
                const after  = armyAfter[key]  || 0;
                if (before > 0) {
                    const lost = before - after;
                    totalBefore += before;
                    totalLost += lost;
                    rows.push({ icon: ut.icon, before, lost });
                }
            });
            return { rows, totalBefore, totalLost };
        }

        const atkBefore = result.atkArmyBefore || atkN.army;
        const defBefore = result.defArmyBefore || (defN ? defN.army : {});
        const atk = unitRows(atkBefore, atkN.army);
        const def = unitRows(defBefore, defN ? defN.army : {});

        /* Territory name */
        const tBase = getNation(result.territory);
        const tName = tBase.flag ? `${tBase.flag} ${tBase.name}` : result.territory.toUpperCase();

        /* Build compact two-column layout */
        let html = `<div class="btl-territory">${tName}</div>`;
        html += `<div class="btl-grid">`;

        /* Attacker column */
        html += `<div class="btl-col btl-atk">`;
        html += `<div class="btl-nation">${atkN.flag} ${atkN.name}</div>`;
        html += `<div class="btl-units">`;
        atk.rows.forEach(r => {
            html += `<span class="btl-u">${r.icon}${r.before}`;
            if (r.lost > 0) html += `<em>-${r.lost}</em>`;
            html += `</span>`;
        });
        html += `</div>`;
        html += `<div class="btl-pow">⚔ ${result.atkPow} <span class="btl-dim">| -${atk.totalLost}/${atk.totalBefore}</span></div>`;
        html += `</div>`;

        /* VS divider */
        html += `<div class="btl-vs">VS</div>`;

        /* Defender column */
        html += `<div class="btl-col btl-def">`;
        html += `<div class="btl-nation">${defN?.flag || '🏳️'} ${defN?.name || '?'}</div>`;
        html += `<div class="btl-units">`;
        def.rows.forEach(r => {
            html += `<span class="btl-u">${r.icon}${r.before}`;
            if (r.lost > 0) html += `<em>-${r.lost}</em>`;
            html += `</span>`;
        });
        html += `</div>`;
        html += `<div class="btl-pow">🛡 ${result.defPow} <span class="btl-dim">| -${def.totalLost}/${def.totalBefore}</span></div>`;
        html += `</div>`;

        html += `</div>`; /* close btl-grid */

        /* Result banner */
        html += `<div class="battle-result ${result.success ? 'win' : 'lose'}">`;
        html += result.success ? '✅ VITTORIA — Territorio conquistato!' : '❌ SCONFITTA — Ritirata!';
        html += `</div>`;

        els['battle-display'].innerHTML = html;
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
            html += `<div class="prod-card ${canBuild ? '' : 'disabled'}" onclick="${canBuild ? `UI.doBuild('${key}')` : ''}">`;
            html += `<div class="prod-icon">${ut.icon}</div>`;
            html += `<div class="prod-name">${ut.name}</div>`;
            html += `<div style="font-size:0.75rem;color:var(--gold);">${current > 0 ? `×${current}` : ''}</div>`;
            html += `<div class="prod-cost">${costStr}</div>`;
            html += `<div style="font-size:0.6rem;color:var(--text-dim)">⚔️${ut.atk} 🛡️${ut.def} | Raggio:${ut.rng}</div>`;
            if (ut.consumable) html += `<div style="font-size:0.55rem;color:var(--accent3)">⚡ Consumabile</div>`;
            if (ut.nuke) html += `<div style="font-size:0.55rem;color:#ff00ff">☢️ Nucleare</div>`;
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

        let html = '<div class="tech-grid">';
        TECHNOLOGIES.forEach(tech => {
            const researched = n.techs.includes(tech.id);
            const canRes = GameEngine.canResearch(state.player, tech.id);
            const cls = researched ? 'researched' : (canRes ? 'available' : '');
            const costStr = Object.entries(tech.cost).map(([r,v]) => `${RESOURCES[r]?.icon||r}${v}`).join(' ');

            html += `<div class="tech-card ${cls}" ${canRes ? `onclick="UI.doResearch('${tech.id}')"` : ''}>`;
            html += `<div class="tech-icon">${tech.icon}</div>`;
            html += `<div class="tech-name">${tech.name}</div>`;
            html += `<div class="tech-cost">${researched ? '✅' : costStr}</div>`;
            html += `<div style="font-size:0.6rem;color:var(--text-dim)">${tech.desc}</div>`;
            html += `</div>`;
        });
        html += '</div>';
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
                c += `<button class="diplo-btn ally" onclick="UI.doAlly('${code}')">\ud83e\udd1d Alleanza</button>`;
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
    }

    function doPeace(code) {
        const state = GameEngine.getState();
        GameEngine.makePeace(state.player, code);
        hide('diplomacy-popup');
        updateHUD();
        MapRenderer.colourAllTerritories();
    }

    function doAlly(code) {
        const state = GameEngine.getState();
        const rel = GameEngine.getRelation(state.player, code);
        if (rel < -10) {
            addEventToLog({ turn: state.turn, type:'diplomacy', msg:`❌ ${fmtNation(state.nations[code])} <span class="evt-action">rifiuta alleanza (${rel})</span>` });
            hide('diplomacy-popup');
            return;
        }
        GameEngine.makeAlliance(state.player, code);
        hide('diplomacy-popup');
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
        /* Simulate non-aggression pact as +15 relation boost */
        GameEngine.adjustRelation(state.player, targetCode, 15);
        GameEngine.adjustRelation(targetCode, state.player, 15);
        addEventToLog({ turn: state.turn, type:'diplomacy', msg:`📝 <span class="evt-action">Patto con</span> ${fmtNation(state.nations[targetCode])} <span class="evt-action">(+15)</span>` });
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
            { give: 'money', giveAmt: 80, get: 'rareEarth', getAmt: 8, label: '💰80 → 💎8' },
            { give: 'oil', giveAmt: 15, get: 'money', getAmt: 40, label: '🛢️15 → 💰40' },
            { give: 'money', giveAmt: 100, get: 'uranium', getAmt: 5, label: '💰100 → ☢️5' },
            { give: 'food', giveAmt: 20, get: 'money', getAmt: 30, label: '🌾20 → 💰30' },
        ];

        tradeOptions.forEach((t, i) => {
            const canTrade = (pn.res[t.give] || 0) >= t.giveAmt && (tn.res[t.get] || 0) >= t.getAmt;
            html += `<div class="trade-option ${canTrade ? '' : 'disabled'}" onclick="${canTrade ? `UI.executeTrade('${targetCode}',${i})` : ''}">`;
            html += `<span>${t.label}</span>`;
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
            addEventToLog({ turn: state.turn, type:'diplomacy', msg:`❌ ${fmtNation(tn)} <span class="evt-action">rifiuta scambio</span>` });
            hide('trade-popup');
            return;
        }

        pn.res[t.give] -= t.giveAmt;
        pn.res[t.get] = (pn.res[t.get] || 0) + t.getAmt;
        tn.res[t.get] -= t.getAmt;
        tn.res[t.give] = (tn.res[t.give] || 0) + t.giveAmt;
        GameEngine.adjustRelation(state.player, targetCode, 5);
        GameEngine.adjustRelation(targetCode, state.player, 5);

        addEventToLog({ turn: state.turn, type:'diplomacy', msg:`💱 <span class="evt-action">Scambio con</span> ${fmtNation(tn)} <span class="evt-action">(+5)</span>` });
        hide('trade-popup');
        updateHUD();
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

        /* Cost: 30 money */
        if (pn.res.money < 30) {
            addEventToLog({ turn: state.turn, type:'game', msg:'❌ Fondi insufficienti per la missione di spionaggio (costo: 30💰)' });
            return;
        }
        pn.res.money -= 30;

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
        }
        updateHUD();
        hide('diplomacy-popup');
    }

    function doNukeStrike(targetTerritory) {
        const state = GameEngine.getState();
        if (!state || state.phase !== 'player') return;
        const result = GameEngine.nukeStrike(state.player, targetTerritory);
        if (!result) {
            addEventToLog({ turn: state.turn, type:'game', msg:'❌ Attacco nucleare impossibile' });
            return;
        }
        Animations.spawnNukeFX(state.player, targetTerritory);
        setTimeout(() => { MapRenderer.colourAllTerritories(); }, 600);
        updateHUD();
        updateMilitaryBar();
        const sel = MapRenderer.getSelected();
        if (sel) showTerritoryPanel(sel);
    }

    function doPeaceFromPanel(ownerCode) {
        const state = GameEngine.getState();
        GameEngine.makePeace(state.player, ownerCode);
        updateHUD();
        MapRenderer.colourAllTerritories();
        const sel = MapRenderer.getSelected();
        if (sel) showTerritoryPanel(sel);
    }

    function doAllyFromPanel(ownerCode) {
        doAlly(ownerCode);
        const sel = MapRenderer.getSelected();
        if (sel) showTerritoryPanel(sel);
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
                MapRenderer.resizeFx();
                const _aN = state.nations[act.result.attacker];
                const _dN = state.nations[act.result.defender];
                const _aI = { code: act.result.attacker, name: _aN?.name, flag: _aN?.flag, color: _aN?.color };
                const _dI = { code: act.result.defender, name: _dN?.name, flag: _dN?.flag, color: _dN?.color };
                Animations.spawnBattleFX(act.nation, act.target, act.result.success, _aI, _dI);
                if (act.result.conquered) {
                    MapRenderer.colourAllTerritories();
                    Animations.spawnConquerFX(act.target);
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

        /* Log summary in event log */
        const attackCount = allActions.filter(a => a.type === 'attack').length;
        const warCount = allActions.filter(a => a.type === 'war_declare').length;
        const nukeCount = allActions.filter(a => a.type === 'nuke').length;
        const conquests = allActions.filter(a => a.type === 'attack' && a.result?.conquered).length;
        const revoltCount = allActions.filter(a => a.type === 'revolt').length;
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
                    existingLabel.textContent = `💀 ELIMINATO — Modalità spettatore · Anno ${year}`;
                } else {
                    existingLabel.textContent = `⏩ AUTO-PLAY attivo · Anno ${year}`;
                }
            }
            return;
        }

        /* Mode changed — full rebuild */
        banner.classList.remove('banner-dead', 'banner-auto', 'hidden');

        if (playerDead) {
            banner.classList.add('banner-dead');
            banner.innerHTML = `
                <span class="spectator-label">💀 ELIMINATO — Modalità spettatore · Anno ${year}</span>
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
                <span class="spectator-label">⏩ AUTO-PLAY attivo · Anno ${year}</span>
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
    }

    /* ════════════════ EVENT LOG ════════════════ */
    let evtAutoScroll = true;

    function setupEventLog() {
        const log = els['event-log'];
        if (!log) return;

        /* Scroll detection: if user scrolls up, pause auto-scroll */
        log.addEventListener('scroll', () => {
            const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
            if (atBottom && !evtAutoScroll) {
                evtAutoScroll = true;
                hideLiveBtn();
            } else if (!atBottom && evtAutoScroll) {
                evtAutoScroll = false;
                showLiveBtn();
            }
        });

        /* LIVE button */
        const btnLive = document.getElementById('btn-live');
        if (btnLive) {
            btnLive.addEventListener('click', () => {
                evtAutoScroll = true;
                log.scrollTop = log.scrollHeight;
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
                /* Show/hide the reopen button */
                if (btnReopen) {
                    if (panel.classList.contains('hidden')) {
                        btnReopen.classList.remove('hidden');
                    } else {
                        btnReopen.classList.add('hidden');
                    }
                }
            });
        }
        /* Reopen button: show event panel again */
        if (btnReopen) {
            btnReopen.addEventListener('click', () => {
                const panel = els['right-panel'];
                if (!panel) return;
                panel.classList.remove('hidden');
                btnReopen.classList.add('hidden');
            });
        }
    }

    function showLiveBtn() { const b = document.getElementById('btn-live'); if (b) b.classList.remove('hidden'); }
    function hideLiveBtn() { const b = document.getElementById('btn-live'); if (b) b.classList.add('hidden'); }

    function addEventToLog(entry) {
        const log = els['event-log'];
        if (!log) return;

        const typeMap = {
            battle: 'evt-battle', resource: 'evt-resource', diplomacy: 'evt-diplomacy',
            tech: 'evt-tech', nuke: 'evt-nuke', game: ''
        };

        /* Determine if event involves the player or an ally */
        let ownerClass = '';
        const state = GameEngine.getState();
        if (state && entry.msg) {
            const pn = state.nations[state.player];
            if (pn) {
                const pName = pn.name;
                if (entry.msg.includes(pName)) {
                    ownerClass = 'evt-mine';
                } else {
                    /* Check allies */
                    const majorCodes = Object.keys(NATIONS);
                    for (const c of majorCodes) {
                        if (c !== state.player && GameEngine.isAlly(state.player, c)) {
                            const an = state.nations[c];
                            if (an && entry.msg.includes(an.name)) {
                                ownerClass = 'evt-ally';
                                break;
                            }
                        }
                    }
                }
            }
        }

        const div = document.createElement('div');
        div.className = `event-item ${typeMap[entry.type] || ''} ${ownerClass}`.trim();
        div.innerHTML = `<span class="evt-turn">T${entry.turn}</span> ${entry.msg}`;
        log.appendChild(div);

        /* Auto-scroll only if in LIVE mode */
        if (evtAutoScroll) {
            log.scrollTop = log.scrollHeight;
        } else {
            showLiveBtn();
        }

        /* Keep max 150 entries */
        while (log.children.length > 150) log.removeChild(log.firstChild);
    }

    /* ════════════════ GAME OVER ════════════════ */
    function showGameOver(victor) {
        /* Hide autoplay banner if present */
        hideAutoPlayBanner();

        show('gameover-popup');
        const state = GameEngine.getState();
        const n = state.nations[victor];
        const isPlayer = victor === state.player;

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
            <div class="go-stat"><div class="label">Vincitore</div><div class="val">${n.flag} ${n.name}</div></div>
            <div class="go-stat"><div class="label">Turni</div><div class="val">${state.turn}</div></div>
            <div class="go-stat"><div class="label">Territori</div><div class="val">${victorTerr}/${totalTerr}</div></div>
            <div class="go-stat"><div class="label">Fondi</div><div class="val">💰${n.res.money}</div></div>
        `;
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
        addEventToLog,
        startAutoPlay,
        stopAutoPlay
    };
})();
