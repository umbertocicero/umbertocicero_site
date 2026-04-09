/* ═══════════════════════════════════════════════════════
   GeoDominion — DevLog  (Console Diagnostics)
   Structured logging for debugging AI behaviour,
   economy balance, stall detection, and game flow.
   
   Usage:
     DevLog.enable()    — start logging each turn
     DevLog.disable()   — stop logging
     DevLog.dump()      — print full world snapshot NOW
     DevLog.dumpJSON()  — copy-paste-ready JSON snapshot
     DevLog.top(n)      — leaderboard of top n nations
     DevLog.nation('us')— deep-dive on a specific nation
     DevLog.wars()      — active wars summary
     DevLog.stall()     — stall detection report
     DevLog.history()   — accumulated turn-by-turn data
   ═══════════════════════════════════════════════════════ */

const DevLog = (() => {
    let enabled = false;
    const history = [];          // array of per-turn snapshots
    const STYLE_HEADER  = 'color:#00e5ff;font-weight:bold;font-size:13px;';
    const STYLE_SUB     = 'color:#ffd740;font-weight:bold;';
    const STYLE_DIM     = 'color:#78909c;';
    const STYLE_WARN    = 'color:#ff9100;font-weight:bold;';
    const STYLE_RED     = 'color:#ff1744;font-weight:bold;';
    const STYLE_GREEN   = 'color:#00e676;font-weight:bold;';

    /* ════════════════ HELPERS ════════════════ */
    function getState() { return GameEngine.getState(); }

    /** Compact resource string: only non-zero values */
    function resStr(res) {
        if (!res) return '—';
        const parts = [];
        const icons = { money:'💰', oil:'🛢', gas:'🔥', rareEarth:'⚗', gold:'🥇',
                        silver:'🥈', diamonds:'💎', uranium:'☢', steel:'🔩', food:'🌾' };
        for (const [k, v] of Object.entries(res)) {
            if (v > 0) parts.push(`${icons[k]||k}${v}`);
        }
        return parts.join(' ') || '(vuoto)';
    }

    /** Compact army string: only non-zero units */
    function armyStr(army) {
        if (!army) return '—';
        const parts = [];
        for (const [k, v] of Object.entries(army)) {
            if (v > 0) {
                const ut = typeof UNIT_TYPES !== 'undefined' ? UNIT_TYPES[k] : null;
                parts.push(`${ut?.icon||k}×${v}`);
            }
        }
        return parts.join(' ') || '(nessun esercito)';
    }

    /** Get nation ranking sorted by territory count */
    function getRanking() {
        const state = getState();
        if (!state) return [];
        const counts = {};
        Object.values(state.territories).forEach(owner => {
            counts[owner] = (counts[owner] || 0) + 1;
        });
        return Object.keys(state.nations)
            .filter(c => state.nations[c].alive)
            .map(c => {
                const n = state.nations[c];
                return {
                    code: c,
                    name: n.name,
                    terr: counts[c] || 0,
                    money: n.res.money || 0,
                    oil: n.res.oil || 0,
                    atk: GameEngine.calcMilitary(c, 'atk'),
                    def: GameEngine.calcMilitary(c, 'def'),
                    totalUnits: Object.values(n.army).reduce((a,b) => a+b, 0),
                    techs: n.techs.length,
                    wars: GameEngine.getWarsFor(c).length,
                    allies: state.alliances.filter(a => a.a === c || a.b === c).length,
                    profile: n.profile
                };
            })
            .sort((a, b) => b.terr - a.terr);
    }

    /* ════════════════ TURN SNAPSHOT ════════════════ */
    function captureTurnSnapshot(actions) {
        const state = getState();
        if (!state) return null;

        const ranking = getRanking();
        const aliveCount = ranking.length;
        const totalTerr = SVG_IDS.length;
        const activeWars = state.wars.length;
        const activeAlliances = state.alliances.length;

        /* Aggregate action counts */
        const actionCounts = {};
        (actions || []).forEach(a => {
            actionCounts[a.type] = (actionCounts[a.type] || 0) + 1;
        });

        /* Economy analysis: top 10 nations money and income */
        const econData = ranking.slice(0, 15).map(r => {
            const n = state.nations[r.code];
            const income = GameEngine.calcIncome(r.code);
            return {
                code: r.code,
                name: r.name,
                terr: r.terr,
                money: n.res.money,
                income_money: income.money || 0,
                income_oil: income.oil || 0,
                atk: r.atk,
                def: r.def,
                units: r.totalUnits,
                techs: r.techs,
                wars: r.wars
            };
        });

        /* Stall metrics */
        const conquests = (actions || []).filter(a => a.type === 'attack' && a.result?.conquered).length;
        const attacks = actionCounts.attack || 0;
        const warDecls = actionCounts.war_declare || 0;
        const revolts = actionCounts.revolt || 0;
        const peaces = actionCounts.peace || 0;
        const top1pct = ranking.length > 0 ? Math.round(ranking[0].terr / totalTerr * 100) : 0;

        const snapshot = {
            turn: state.turn,
            year: 2025 + state.turn,
            alive: aliveCount,
            wars: activeWars,
            alliances: activeAlliances,
            stability: state.globalStability,
            top1: ranking[0] ? `${ranking[0].name} (${ranking[0].terr}t, ${top1pct}%)` : '—',
            actions: actionCounts,
            conquests,
            revolts,
            econData,
            stall: {
                attacks,
                conquests,
                warDecls,
                peaces,
                revolts,
                noActivity: attacks === 0 && warDecls === 0 && conquests === 0,
                topStagnant: ranking.length >= 2 && Math.abs(ranking[0].terr - ranking[1].terr) < 3
            }
        };

        history.push(snapshot);
        return snapshot;
    }

    /* ════════════════ CONSOLE OUTPUT ════════════════ */
    function logTurnSummary(snapshot) {
        if (!snapshot) return;
        const s = snapshot;

        console.group(
            `%c═══ TURNO ${s.turn} (Anno ${s.year}) ═══  ` +
            `%c${s.alive} nazioni | ${s.wars} guerre | ${s.alliances} alleanze | ` +
            `Stabilità: ${s.stability}%  %c${s.stall.noActivity ? '⚠️ NESSUNA ATTIVITÀ' : ''}`,
            STYLE_HEADER, STYLE_DIM, STYLE_WARN
        );

        /* ── Leaderboard ── */
        console.groupCollapsed('%c📊 CLASSIFICA (top 10)', STYLE_SUB);
        const table = s.econData.slice(0, 10).map((e, i) => ({
            '#': i + 1,
            Nazione: e.name,
            Terr: e.terr,
            '💰': e.money,
            'Income💰': e.income_money,
            '⚔ATK': e.atk,
            '🛡DEF': e.def,
            '🪖Units': e.units,
            '🔬Tech': e.techs,
            'Guerre': e.wars
        }));
        console.table(table);
        console.groupEnd();

        /* ── Actions ── */
        if (Object.keys(s.actions).length > 0) {
            console.groupCollapsed('%c⚡ AZIONI TURNO', STYLE_SUB);
            const actSummary = Object.entries(s.actions)
                .map(([type, count]) => `${type}: ${count}`)
                .join(' | ');
            console.log(`%c${actSummary}`, STYLE_DIM);
            if (s.conquests > 0) console.log(`%c🏴 ${s.conquests} territori conquistati`, STYLE_GREEN);
            if (s.revolts > 0) console.log(`%c🔥 ${s.revolts} rivolte interne`, STYLE_WARN);
            console.groupEnd();
        }

        /* ── Stall Warning ── */
        if (s.stall.noActivity) {
            console.log('%c⚠️ STALLO RILEVATO: nessun attacco, guerra o conquista questo turno!', STYLE_RED);
        }
        if (s.stall.topStagnant) {
            console.log(`%c⚠️ TOP 2 NAZIONI quasi pari — possibile equilibrio stabile`, STYLE_WARN);
        }

        /* ── Quick econ check: hoarding nations ── */
        const hoarders = s.econData.filter(e => e.money > 500 && e.units < 20);
        if (hoarders.length > 0) {
            console.groupCollapsed('%c💰 ACCUMULATORI (soldi alti, truppe basse)', STYLE_WARN);
            hoarders.forEach(h => {
                console.log(`%c${h.name}: 💰${h.money} ma solo 🪖${h.units} unità (income: +${h.income_money}/turno)`, STYLE_DIM);
            });
            console.groupEnd();
        }

        console.groupEnd(); // close main group
    }

    /* ════════════════ PUBLIC: ON-DEMAND COMMANDS ════════════════ */

    /** Full world snapshot printed in console */
    function dump() {
        const state = getState();
        if (!state) { console.warn('Nessuna partita attiva'); return; }
        const ranking = getRanking();

        console.group('%c🌍 GEODOMINION — STATO COMPLETO (Turno ' + state.turn + ')', STYLE_HEADER);

        /* Leaderboard */
        console.group('%c📊 CLASSIFICA COMPLETA', STYLE_SUB);
        const fullTable = ranking.map((r, i) => {
            const n = state.nations[r.code];
            const income = GameEngine.calcIncome(r.code);
            return {
                '#': i + 1,
                Code: r.code,
                Nazione: r.name,
                Profilo: r.profile,
                Terr: r.terr,
                '💰Money': n.res.money,
                'Inc💰': income.money || 0,
                '🛢Oil': n.res.oil,
                '🔩Steel': n.res.steel,
                '☢Uran': n.res.uranium,
                '🌾Food': n.res.food,
                '⚔ATK': r.atk,
                '🛡DEF': r.def,
                '🪖Units': r.totalUnits,
                '🔬Techs': r.techs,
                'Guerre': r.wars,
                'Alleanze': r.allies
            };
        });
        console.table(fullTable);
        console.groupEnd();

        /* Active wars */
        if (state.wars.length > 0) {
            console.group(`%c⚔️ GUERRE ATTIVE (${state.wars.length})`, STYLE_SUB);
            state.wars.forEach(w => {
                const an = state.nations[w.attacker];
                const dn = state.nations[w.defender];
                const duration = state.turn - w.turn;
                console.log(`%c${an?.name||w.attacker} ⚔ ${dn?.name||w.defender} — ${duration} turni (dal T${w.turn})`, STYLE_DIM);
            });
            console.groupEnd();
        }

        /* Alliances */
        if (state.alliances.length > 0) {
            console.group(`%c🤝 ALLEANZE (${state.alliances.length})`, STYLE_SUB);
            state.alliances.forEach(a => {
                const an = state.nations[a.a];
                const bn = state.nations[a.b];
                console.log(`%c${an?.name||a.a} 🤝 ${bn?.name||a.b} (dal T${a.turn})`, STYLE_DIM);
            });
            console.groupEnd();
        }

        /* Dead nations */
        const dead = Object.values(state.nations).filter(n => !n.alive);
        if (dead.length > 0) {
            console.groupCollapsed(`%c💀 NAZIONI ELIMINATE (${dead.length})`, STYLE_RED);
            console.log(dead.map(n => n.name).join(', '));
            console.groupEnd();
        }

        console.groupEnd();
    }

    /** Copy-paste-ready JSON for analysis */
    function dumpJSON() {
        const state = getState();
        if (!state) { console.warn('Nessuna partita attiva'); return; }
        const ranking = getRanking();

        const snapshot = {
            turn: state.turn,
            year: 2025 + state.turn,
            alive: ranking.length,
            globalStability: state.globalStability,
            wars: state.wars.map(w => ({
                attacker: w.attacker,
                attackerName: state.nations[w.attacker]?.name,
                defender: w.defender,
                defenderName: state.nations[w.defender]?.name,
                since: w.turn,
                duration: state.turn - w.turn
            })),
            alliances: state.alliances.map(a => ({
                a: a.a, aName: state.nations[a.a]?.name,
                b: a.b, bName: state.nations[a.b]?.name,
                since: a.turn
            })),
            nations: ranking.map(r => {
                const n = state.nations[r.code];
                const income = GameEngine.calcIncome(r.code);
                return {
                    code: r.code,
                    name: n.name,
                    profile: n.profile,
                    territories: r.terr,
                    resources: { ...n.res },
                    income: income,
                    army: { ...n.army },
                    atkPower: r.atk,
                    defPower: r.def,
                    totalUnits: r.totalUnits,
                    techs: [...n.techs],
                    wars: r.wars,
                    allies: r.allies,
                    sanctions: n.sanctions.length,
                    nukesUsed: n.nukesUsed,
                    homelandLost: state.territories[n.homeland] !== r.code
                };
            })
        };

        const json = JSON.stringify(snapshot, null, 2);
        console.log('%c📋 JSON SNAPSHOT — copia sotto:', STYLE_HEADER);
        console.log(json);
        return snapshot;
    }

    /** Deep-dive on a specific nation */
    function nation(code) {
        const state = getState();
        if (!state) { console.warn('Nessuna partita attiva'); return; }
        const n = state.nations[code];
        if (!n) { console.warn(`Nazione "${code}" non trovata`); return; }

        const terrCount = GameEngine.getTerritoryCount(code);
        const income = GameEngine.calcIncome(code);
        const atk = GameEngine.calcMilitary(code, 'atk');
        const def = GameEngine.calcMilitary(code, 'def');
        const wars = GameEngine.getWarsFor(code);
        const allies = state.alliances.filter(a => a.a === code || a.b === code);
        const homelandOwner = state.territories[n.homeland];

        console.group(`%c🔍 ${n.flag} ${n.name} (${code}) — Turno ${state.turn}`, STYLE_HEADER);
        console.log(`%cProfilo AI: ${n.profile} | Stato: ${n.alive ? '✅ Vivo' : '💀 Eliminato'} | Territori: ${terrCount}`, STYLE_DIM);
        console.log(`%cHomeland: ${n.homeland} → ${homelandOwner === code ? '✅ Sotto controllo' : `❌ Occupato da ${state.nations[homelandOwner]?.name || homelandOwner}`}`, homelandOwner === code ? STYLE_GREEN : STYLE_RED);

        console.group('%c📦 Risorse', STYLE_SUB);
        console.log(`%cScorte:  ${resStr(n.res)}`, STYLE_DIM);
        console.log(`%cIncome:  ${resStr(income)}`, STYLE_DIM);
        console.groupEnd();

        console.group('%c🪖 Esercito', STYLE_SUB);
        console.log(`%c${armyStr(n.army)}`, STYLE_DIM);
        console.log(`%c⚔ ATK: ${atk}  |  🛡 DEF: ${def}`, STYLE_DIM);
        console.groupEnd();

        if (n.techs.length > 0) {
            console.log(`%c🔬 Tecnologie: ${n.techs.join(', ')}`, STYLE_DIM);
        }

        if (wars.length > 0) {
            console.group(`%c⚔️ Guerre (${wars.length})`, STYLE_RED);
            wars.forEach(w => {
                const enemy = w.attacker === code ? w.defender : w.attacker;
                const en = state.nations[enemy];
                console.log(`%cvs ${en?.name||enemy} — ${state.turn - w.turn} turni`, STYLE_DIM);
            });
            console.groupEnd();
        }

        if (allies.length > 0) {
            console.group(`%c🤝 Alleanze (${allies.length})`, STYLE_GREEN);
            allies.forEach(a => {
                const other = a.a === code ? a.b : a.a;
                const on = state.nations[other];
                console.log(`%c${on?.name||other}`, STYLE_DIM);
            });
            console.groupEnd();
        }

        /* Relations with neighbors */
        const neighbors = GameEngine.getNeighborOwners(code);
        if (neighbors.length > 0) {
            console.groupCollapsed(`%c🌐 Relazioni vicini (${neighbors.length})`, STYLE_SUB);
            neighbors.forEach(nc => {
                const rel = GameEngine.getRelation(code, nc);
                const nn = state.nations[nc];
                const color = rel > 20 ? STYLE_GREEN : rel < -20 ? STYLE_RED : STYLE_DIM;
                console.log(`%c${nn?.name||nc}: ${rel > 0 ? '+' : ''}${rel}`, color);
            });
            console.groupEnd();
        }

        console.groupEnd();
    }

    /** Wars summary */
    function wars() {
        const state = getState();
        if (!state) return;
        console.group(`%c⚔️ GUERRE — Turno ${state.turn}`, STYLE_HEADER);
        if (state.wars.length === 0) {
            console.log('%c🕊️ Nessuna guerra attiva — possibile stallo!', STYLE_WARN);
        } else {
            const table = state.wars.map(w => {
                const an = state.nations[w.attacker];
                const dn = state.nations[w.defender];
                return {
                    Attaccante: an?.name || w.attacker,
                    '⚔ATK': GameEngine.calcMilitary(w.attacker, 'atk'),
                    Difensore: dn?.name || w.defender,
                    '🛡DEF': GameEngine.calcMilitary(w.defender, 'def'),
                    'Durata': state.turn - w.turn,
                    'Dal turno': w.turn
                };
            });
            console.table(table);
        }
        console.groupEnd();
    }

    /** Stall detection report */
    function stall() {
        console.group('%c🔍 STALL DETECTION — Analisi ultimi 10 turni', STYLE_HEADER);

        if (history.length === 0) {
            console.log('%cNessun dato storico. Abilita DevLog e gioca qualche turno.', STYLE_WARN);
            console.groupEnd();
            return;
        }

        const recent = history.slice(-10);
        const avgConquests = recent.reduce((sum, s) => sum + s.conquests, 0) / recent.length;
        const avgAttacks = recent.reduce((sum, s) => sum + (s.actions.attack || 0), 0) / recent.length;
        const avgWars = recent.reduce((sum, s) => sum + (s.actions.war_declare || 0), 0) / recent.length;
        const noActivityTurns = recent.filter(s => s.stall.noActivity).length;
        const stagnantTurns = recent.filter(s => s.stall.topStagnant).length;

        console.log(`%cTurni analizzati: ${recent[0].turn} — ${recent[recent.length-1].turn}`, STYLE_DIM);
        console.log(`%cMedia conquiste/turno: ${avgConquests.toFixed(1)}`, avgConquests < 0.5 ? STYLE_RED : STYLE_GREEN);
        console.log(`%cMedia attacchi/turno: ${avgAttacks.toFixed(1)}`, avgAttacks < 1 ? STYLE_RED : STYLE_DIM);
        console.log(`%cMedia guerre dichiarate/turno: ${avgWars.toFixed(1)}`, STYLE_DIM);
        console.log(`%cTurni senza attività: ${noActivityTurns}/${recent.length}`, noActivityTurns > 3 ? STYLE_RED : STYLE_GREEN);
        console.log(`%cTurni con top 2 stagnante: ${stagnantTurns}/${recent.length}`, stagnantTurns > 5 ? STYLE_WARN : STYLE_DIM);

        /* Check for hoarding pattern */
        const state = getState();
        if (state) {
            const ranking = getRanking();
            const hoarders = ranking.filter(r => {
                const n = state.nations[r.code];
                return n.res.money > 300 && r.totalUnits < 15;
            });
            if (hoarders.length > 0) {
                console.log(`%c⚠️ ${hoarders.length} nazioni accumulano soldi senza produrre truppe:`, STYLE_WARN);
                hoarders.forEach(h => console.log(`%c  ${h.name}: 💰${state.nations[h.code].res.money}, 🪖${h.totalUnits}`, STYLE_DIM));
            }

            /* Check for perpetual peace */
            if (state.wars.length === 0) {
                console.log('%c🚨 ZERO GUERRE ATTIVE — il gioco è in stallo!', STYLE_RED);
            }
        }

        console.groupEnd();
    }

    /** Return accumulated history for external analysis */
    function getHistory() {
        return history;
    }

    /** Print a compact per-turn evolution table */
    function historyTable() {
        if (history.length === 0) {
            console.warn('Nessun dato storico disponibile.');
            return;
        }
        console.group('%c📈 EVOLUZIONE STORICA', STYLE_HEADER);
        const table = history.map(s => ({
            T: s.turn,
            Anno: s.year,
            Vive: s.alive,
            Guerre: s.wars,
            Alleanze: s.alliances,
            Attacchi: s.actions.attack || 0,
            Conquiste: s.conquests,
            Rivolte: s.revolts,
            'Guerre Dich.': s.actions.war_declare || 0,
            Paci: s.actions.peace || 0,
            '#1': s.top1,
            Stallo: s.stall.noActivity ? '⚠️' : '✅'
        }));
        console.table(table);
        console.groupEnd();
    }

    /* ════════════════ HOOK: called by UI after each turn ════════════════ */
    function onTurnEnd(actions) {
        const snapshot = captureTurnSnapshot(actions);
        if (enabled && snapshot) {
            logTurnSummary(snapshot);
        }
    }

    /* ════════════════ TOGGLE ════════════════ */
    function enable() {
        enabled = true;
        console.log('%c✅ DevLog ATTIVATO — i log appariranno alla fine di ogni turno', STYLE_GREEN);
        console.log('%cComandi disponibili: DevLog.dump() | DevLog.dumpJSON() | DevLog.top(10) | DevLog.nation("us") | DevLog.wars() | DevLog.stall() | DevLog.history()', STYLE_DIM);
    }
    function disable() {
        enabled = false;
        console.log('%c🔴 DevLog DISATTIVATO', STYLE_RED);
    }

    function top(n = 10) {
        const ranking = getRanking();
        console.group(`%c🏆 TOP ${n} NAZIONI`, STYLE_HEADER);
        const table = ranking.slice(0, n).map((r, i) => {
            const nat = getState().nations[r.code];
            const income = GameEngine.calcIncome(r.code);
            return {
                '#': i + 1,
                Nazione: r.name,
                Code: r.code,
                Terr: r.terr,
                '%Map': Math.round(r.terr / SVG_IDS.length * 100) + '%',
                '💰': nat.res.money,
                'Inc💰': income.money || 0,
                '⚔ATK': r.atk,
                '🛡DEF': r.def,
                '🪖': r.totalUnits,
                '🔬': r.techs,
                Profilo: r.profile
            };
        });
        console.table(table);
        console.groupEnd();
    }

    /* ════════════════ PUBLIC ════════════════ */
    return {
        enable,
        disable,
        onTurnEnd,
        dump,
        dumpJSON,
        nation,
        wars,
        stall,
        top,
        history: historyTable,
        getHistory,
        isEnabled: () => enabled
    };
})();
