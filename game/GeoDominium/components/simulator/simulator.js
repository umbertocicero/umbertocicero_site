/* ═══════════════════════════════════════════════════════
   GeoDominium — AI Simulator Logic
   ═══════════════════════════════════════════════════════ */

(() => {
    /* ── DOM refs ── */
    const $simCount    = document.getElementById('simCount');
    const $useTurnLimit= document.getElementById('useTurnLimit');
    const $maxTurns    = document.getElementById('maxTurns');
    const $btnRun      = document.getElementById('btnRun');
    const $btnClear    = document.getElementById('btnClear');
    const $progressWrap= document.getElementById('progressWrap');
    const $progressBar = document.getElementById('progressBar');
    const $results     = document.getElementById('results');
    const $aggregate   = document.getElementById('aggregate');

    /* ── Victory type filter ── */
    const activeFilters = new Set(['military','hegemony','economic','strategic','timeout']);
    document.getElementById('filterBar').addEventListener('click', e => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        const vtype = chip.dataset.vtype;
        if (activeFilters.has(vtype)) { activeFilters.delete(vtype); chip.classList.remove('active'); }
        else { activeFilters.add(vtype); chip.classList.add('active'); }
        applyFilters();
    });
    function applyFilters() {
        document.querySelectorAll('.sim-card').forEach(card => {
            const vtype = card.dataset.victoryType || '';
            card.style.display = activeFilters.has(vtype) ? '' : 'none';
        });
    }

    /* ── Flag helper (same logic as ui.js _flagAssetForCode) ── */
    function flagAsset(code) {
        const cc = String(code || '').trim().toUpperCase();
        if (!/^[A-Z]{2}$/.test(cc)) return '';
        return Array.from(cc).map(ch => (0x1F1E6 + ch.charCodeAt(0) - 65).toString(16)).join('-');
    }
    function flagImg(code, size) {
        const a = flagAsset(code);
        if (!a) return '';
        const s = size || 16;
        return `<img src="assets/emoji/${a}.svg" width="${s}" height="${s}" alt="${code}" loading="lazy" decoding="async" style="vertical-align:middle">`;
    }

    /* ── Tag color for victory type ── */
    function victoryTag(type) {
        const t = (type || 'timeout').toLowerCase();
        return `<span class="tag tag-${t}">${t.toUpperCase()}</span>`;
    }

    /* ── Aggregate data ── */
    let allResults = [];

    /* ── Run simulations ── */
    $btnRun.addEventListener('click', () => startSimulations());
    $btnClear.addEventListener('click', () => {
        $results.innerHTML = '';
        $aggregate.innerHTML = '';
        allResults = [];
    });

    async function startSimulations() {
        const count    = Math.max(1, Math.min(100, parseInt($simCount.value) || 10));
        const useLimit = $useTurnLimit.checked;
        const maxT     = parseInt($maxTurns.value) || 200;

        $btnRun.disabled = true;
        $progressWrap.style.display = 'block';
        allResults = [];
        $results.innerHTML = '';
        $aggregate.innerHTML = '';

        const nationCodes = Object.keys(NATIONS);

        for (let i = 0; i < count; i++) {
            const pct = Math.round(((i) / count) * 100);
            $progressBar.style.width = pct + '%';
            $progressBar.textContent = `${i}/${count}`;

            await new Promise(r => setTimeout(r, 0));

            const result = runOneSim(nationCodes, useLimit, maxT, i + 1);
            allResults.push(result);
            $results.appendChild(buildCard(result));
        }

        $progressBar.style.width = '100%';
        $progressBar.textContent = `${count}/${count} ✓`;
        $btnRun.disabled = false;

        renderAggregate();
    }

    /* ── Single simulation ── */
    function runOneSim(nationCodes, useLimit, maxTurns, simNum) {
        const playerCode = nationCodes[Math.floor(Math.random() * nationCodes.length)];
        GameEngine.newGame(playerCode);

        let state = GameEngine.getState();
        const limit = useLimit ? maxTurns : 9999;
        const nukeEvents = [];

        while (!state.gameOver && state.turn <= limit) {
            try {
                GameEngine.startNewTurn(true);
                const terrSnap = { ...state.territories };
                processAllAISync(state);
                if (typeof AI.getTurnActions === 'function') {
                    const actions = AI.getTurnActions();
                    for (const a of actions) {
                        if (a.type === 'nuke' && a.target) {
                            const tOwner = terrSnap[a.target] || '??';
                            nukeEvents.push({
                                turn: state.turn,
                                attacker: a.nation,
                                attackerName: state.nations[a.nation]?.name || a.nation,
                                target: a.target,
                                targetOwner: tOwner,
                                targetOwnerName: state.nations[tOwner]?.name || tOwner
                            });
                        }
                    }
                }
                GameEngine.checkVictory();
                state = GameEngine.getState();
            } catch (e) {
                console.warn(`Sim #${simNum} error at turn ${state.turn}:`, e);
                break;
            }
        }

        state = GameEngine.getState();

        let victor = state.victor;
        let victoryType = state.victoryType || 'timeout';
        if (!state.gameOver || !victor) {
            victoryType = 'timeout';
            let bestCode = null, bestCount = 0;
            for (const c of Object.keys(state.nations)) {
                if (!state.nations[c].alive) continue;
                const tc = GameEngine.getTerritoryCount(c);
                if (tc > bestCount) { bestCount = tc; bestCode = c; }
            }
            victor = bestCode;
        }

        const survivors = [];
        for (const c of Object.keys(state.nations)) {
            const n = state.nations[c];
            if (!n.alive) continue;
            const tc = GameEngine.getTerritoryCount(c);
            survivors.push({
                code: c, name: n.name, flag: n.flag, color: n.color,
                territories: tc,
                pct: ((tc / SVG_IDS.length) * 100).toFixed(1),
                money: n.res?.money || 0,
                atk: GameEngine.calcMilitary(c, 'atk'),
                def: GameEngine.calcMilitary(c, 'def'),
                units: Object.values(n.army || {}).reduce((a, b) => a + b, 0),
                techs: (n.techs || []).length,
                nukesUsed: n.nukesUsed || 0
            });
        }
        survivors.sort((a, b) => b.territories - a.territories);

        const terrMap = {};
        for (const tCode of SVG_IDS) { terrMap[tCode] = state.territories[tCode]; }

        const nukeUsers = survivors.filter(s => s.nukesUsed > 0);
        const victorData = survivors.find(s => s.code === victor) || survivors[0] || {};

        return {
            simNum, turn: state.turn, victor, victoryType,
            victorData, survivors, nukeUsers, nukeEvents, terrMap,
            nationColors: Object.fromEntries(
                Object.entries(state.nations).map(([c, n]) => [c, n.color])
            )
        };
    }

    /* ── Synchronous AI processing ── */
    function processAllAISync(state) {
        const aiNations = GameEngine.getAINations();
        if (state.player && state.nations[state.player]?.alive) {
            aiNations.push(state.player);
        }
        for (let i = aiNations.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [aiNations[i], aiNations[j]] = [aiNations[j], aiNations[i]];
        }
        for (const code of aiNations) {
            if (!state.nations[code]?.alive) continue;
            try { GameEngine.collectResources(code); } catch (e) { /* skip */ }
        }
        try { AI.processAllAI(null, true); } catch(e) { console.warn('AI error:', e); }
        GameEngine.rollRandomEvents();
    }

    /* ── Build result card ── */
    function buildCard(r) {
        const card = document.createElement('div');
        card.className = 'sim-card';
        card.dataset.victoryType = (r.victoryType || 'timeout').toLowerCase();
        const borderColor = r.victorData.color || '#00e5ff';
        card.style.borderColor = borderColor;

        const totalTerr = SVG_IDS.length;
        const vd = r.victorData;

        let html = `
        <div class="card-head">
            <span class="sim-num">#${r.simNum}</span>
            ${flagImg(r.victor, 28)}
            <span class="winner-name">${vd.name || r.victor}</span>
            <span class="winner-code">${r.victor}</span>
            ${victoryTag(r.victoryType)}
        </div>
        <div class="stats-row">
            <span class="stat">🏁 Turno <b>${r.turn}</b></span>
            <span class="stat">📅 Anno <b>${2025 + r.turn}</b></span>
            <span class="stat">🗺️ <b>${vd.territories}</b> terr. (${vd.pct}%)</span>
            <span class="stat">💰 <b>${vd.money}</b></span>
            <span class="stat">⚔️ ATK <b>${vd.atk}</b></span>
            <span class="stat">🛡️ DEF <b>${vd.def}</b></span>
            <span class="stat">👥 <b>${vd.units}</b> unità</span>
            <span class="stat">🔬 <b>${vd.techs}</b> tech</span>
        </div>`;

        /* Nuke report */
        if (r.nukeEvents && r.nukeEvents.length > 0) {
            html += `<div class="nuke-box">`;
            html += `<div class="nuke-box-title">☢️ Attacchi Nucleari (${r.nukeEvents.length})</div>`;
            for (const ne of r.nukeEvents) {
                html += `<div class="nuke-box-entry">`;
                html += `T${ne.turn}: ${flagImg(ne.attacker)} <b>${ne.attackerName}</b> → 💥 ${flagImg(ne.targetOwner)} <b>${ne.targetOwnerName}</b> <span style="color:#64748b">(${ne.target})</span>`;
                html += `</div>`;
            }
            html += `</div>`;
        }

        /* Survivors table */
        html += `<table class="surv-table"><tr><th></th><th>Nazione</th><th>Terr.</th><th>%</th><th>💰</th></tr>`;
        for (const s of r.survivors.slice(0, 15)) {
            const hl = s.code === r.victor ? ' class="highlight"' : '';
            html += `<tr${hl}><td>${flagImg(s.code)}</td><td>${s.name}</td>
                     <td>${s.territories}</td><td>${s.pct}%</td><td>${s.money}</td></tr>`;
        }
        if (r.survivors.length > 15) {
            html += `<tr><td colspan="5" style="color:#64748b;font-style:italic">…e altre ${r.survivors.length - 15} nazioni</td></tr>`;
        }
        html += `</table>`;

        /* Territory grid — only show territories owned by nations NOT in the top 15 table */
        const shownCodes = new Set(r.survivors.slice(0, 15).map(s => s.code));
        const hiddenTerritories = SVG_IDS.filter(tCode => !shownCodes.has(r.terrMap[tCode]));
        if (hiddenTerritories.length > 0) {
            html += `<details><summary style="cursor:pointer;color:#64748b;font-size:.75rem;margin-top:6px">🗺️ Territori altre nazioni (${hiddenTerritories.length})</summary><div class="terr-grid">`;
            for (const tCode of hiddenTerritories) {
                const owner = r.terrMap[tCode];
                const bgColor = (r.nationColors[owner] || '#333') + '26';
                html += `<div class="terr-cell" style="background:${bgColor}" title="${tCode} → ${owner}">${flagImg(owner, 16)}</div>`;
            }
            html += `</div></details>`;
        }

        card.innerHTML = html;
        return card;
    }

    /* ── Aggregate statistics ── */
    function renderAggregate() {
        if (allResults.length === 0) { $aggregate.innerHTML = ''; return; }

        const total = allResults.length;
        let html = '';

        /* 🏆 Win leaderboard */
        const wins = {};
        allResults.forEach(r => {
            if (!r.victor) return;
            if (!wins[r.victor]) wins[r.victor] = { code: r.victor, name: r.victorData.name, count: 0, fastestTurn: Infinity, types: {} };
            wins[r.victor].count++;
            wins[r.victor].fastestTurn = Math.min(wins[r.victor].fastestTurn, r.turn);
            const vt = r.victoryType || 'timeout';
            wins[r.victor].types[vt] = (wins[r.victor].types[vt] || 0) + 1;
        });
        const ranked = Object.values(wins).sort((a, b) => b.count - a.count);

        html += `<div class="agg-section"><h2>🏆 Classifica Vincitori</h2>
        <table class="agg-table"><tr><th>#</th><th></th><th>Nazione</th><th>Vittorie</th><th>Win %</th><th>Più veloce</th><th>Tipo più comune</th></tr>`;
        ranked.forEach((w, i) => {
            const topType = Object.entries(w.types).sort((a, b) => b[1] - a[1])[0];
            html += `<tr><td>${i + 1}</td><td>${flagImg(w.code, 18)}</td>
                     <td>${w.name}</td><td class="agg-highlight">${w.count}</td>
                     <td>${((w.count / total) * 100).toFixed(1)}%</td>
                     <td>T${w.fastestTurn}</td><td>${victoryTag(topType[0])}</td></tr>`;
        });
        html += `</table></div>`;

        /* ☢️ Nuke stats */
        let nukeGames = 0;
        const nukeTotals = {};
        const nukeTargets = {};
        allResults.forEach(r => {
            if (r.nukeEvents && r.nukeEvents.length > 0) nukeGames++;
            (r.nukeEvents || []).forEach(ne => {
                if (!nukeTotals[ne.attacker]) nukeTotals[ne.attacker] = { code: ne.attacker, name: ne.attackerName, total: 0 };
                nukeTotals[ne.attacker].total++;
                const key = `${ne.attacker}→${ne.targetOwner}`;
                if (!nukeTargets[key]) nukeTargets[key] = { attacker: ne.attacker, attackerName: ne.attackerName, target: ne.targetOwner, targetName: ne.targetOwnerName, count: 0 };
                nukeTargets[key].count++;
            });
            if ((!r.nukeEvents || r.nukeEvents.length === 0) && r.nukeUsers?.length > 0) {
                nukeGames++;
                r.nukeUsers.forEach(n => {
                    if (!nukeTotals[n.code]) nukeTotals[n.code] = { code: n.code, name: n.name, total: 0 };
                    nukeTotals[n.code].total += n.nukesUsed;
                });
            }
        });
        const topNuker = Object.values(nukeTotals).sort((a, b) => b.total - a.total)[0];
        const nukeHits = Object.values(nukeTargets).sort((a, b) => b.count - a.count);
        html += `<div class="agg-section"><h2>☢️ Uso Nucleare</h2>
            <p>Partite con nuke: <b class="agg-highlight">${nukeGames}</b> / ${total} (${((nukeGames / total) * 100).toFixed(1)}%)</p>`;
        if (topNuker) {
            html += `<p>Top nuke user: ${flagImg(topNuker.code)} <b>${topNuker.name}</b> — ${topNuker.total} testate totali</p>`;
        }
        if (nukeHits.length > 0) {
            html += `<div style="margin-top:8px;font-size:.8rem">`;
            for (const nh of nukeHits.slice(0, 10)) {
                html += `<div class="nuke-box-entry">${flagImg(nh.attacker)} <b>${nh.attackerName}</b> → 💥 ${flagImg(nh.target)} <b>${nh.targetName}</b>: ${nh.count}×</div>`;
            }
            html += `</div>`;
        }
        html += `</div>`;

        /* ⏱️ Duration */
        const turns = allResults.map(r => r.turn);
        const avg = (turns.reduce((a, b) => a + b, 0) / turns.length).toFixed(1);
        const min = Math.min(...turns);
        const max = Math.max(...turns);
        html += `<div class="agg-section"><h2>⏱️ Durata Partite</h2>
            <p>Media: <b class="agg-highlight">${avg}</b> turni · Min: <b>${min}</b> · Max: <b>${max}</b></p></div>`;

        /* 📊 Victory types */
        const vtCounts = {};
        allResults.forEach(r => { const vt = r.victoryType || 'timeout'; vtCounts[vt] = (vtCounts[vt] || 0) + 1; });
        html += `<div class="agg-section"><h2>📊 Tipi di Vittoria</h2><div class="breakdown">`;
        for (const [vt, c] of Object.entries(vtCounts).sort((a, b) => b[1] - a[1])) {
            html += `<div>${victoryTag(vt)} <b>${c}</b> (${((c / total) * 100).toFixed(1)}%)</div>`;
        }
        html += `</div></div>`;

        $aggregate.innerHTML = html;
    }
})();
