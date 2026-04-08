/* ═══════════════════════════════════════════════════════
   TerraDominium — Game Engine  (v2 — SVG territories)
   Turn system, resources, combat, production, victory
   ═══════════════════════════════════════════════════════ */

const GameEngine = (() => {
    /* ── Game state ── */
    let state = null;
    let onEvent = null;     // callback for UI log

    /* ════════════════ INIT ════════════════ */
    function newGame(playerCode) {
        state = {
            player: playerCode,
            turn: 1,
            phase: 'player',        // player | ai | events
            territories: {},        // code → owner code
            nations: {},            // owner code → runtime data {res,army,tech,sanctions,relations,...}
            wars: [],               // {attacker, defender, turn}
            alliances: [],          // {a, b, turn}
            globalStability: 100,   // 0-100, nukes lower this
            gameOver: false,
            victor: null,
            log: []
        };

        /* Assign territory ownership: every SVG id is owned by itself initially */
        SVG_IDS.forEach(code => { state.territories[code] = code; });

        /* Build runtime data for all nations */
        const allCodes = new Set(SVG_IDS);
        allCodes.forEach(code => {
            const base = getNation(code);
            state.nations[code] = {
                code,
                name: base.name,
                flag: base.flag,
                color: base.color,
                profile: base.profile,
                res: { ...emptyRes(), ...base.res },
                prod: { ...emptyProd(), ...base.prod },
                army: { ...emptyArmy(), ...base.army },
                techs: [],
                sanctions: [],      // codes that sanction this nation
                relations: {},      // code → number (-100 to +100)
                assets: base.assets || [],
                neighbors: base.neighbors || [],
                power: base.power || 5,
                alive: true,
                nukesUsed: 0,
                territoriesOwned: [code]
            };
        });

        emit('game','⚔️ La partita inizia! Turno 1');
        return state;
    }

    /* ── Helpers ── */
    function emptyRes() {
        const r = {};
        Object.keys(RESOURCES).forEach(k => r[k] = 0);
        return r;
    }
    function emptyProd() {
        const r = {};
        Object.keys(RESOURCES).forEach(k => r[k] = 0);
        return r;
    }
    function emptyArmy() {
        const r = {};
        Object.keys(UNIT_TYPES).forEach(k => r[k] = 0);
        return r;
    }

    function emit(type, msg) {
        if (!state) return;
        const entry = { turn: state.turn, type, msg, ts: Date.now() };
        state.log.push(entry);
        if (onEvent) onEvent(entry);
    }

    /* ════════════════ RESOURCE PHASE ════════════════ */
    function collectResources(nationCode) {
        const n = state.nations[nationCode];
        if (!n || !n.alive) return;

        /* Base production from all owned territories */
        const ownedCodes = Object.entries(state.territories)
            .filter(([, owner]) => owner === nationCode)
            .map(([code]) => code);

        const prodMultiplier = 1.0;
        ownedCodes.forEach(tCode => {
            const tBase = getNation(tCode);
            const tProd = tBase.prod || {};
            Object.keys(tProd).forEach(res => {
                let amount = tProd[res] || 0;
                /* Occupied territories produce 70% */
                if (tCode !== nationCode && tBase.profile !== 'minor') amount *= 0.7;
                /* Sanctions penalty: -5% per sanctioning nation */
                const sanctionPen = Math.max(0, 1 - n.sanctions.length * 0.05);
                amount *= sanctionPen * prodMultiplier;
                /* Tech bonuses */
                if (res === 'money' && n.techs.includes('green_energy')) amount += 20;
                if (['oil','gas','gold','silver','diamonds','uranium','rareEarth'].includes(res)
                    && n.techs.includes('deep_mining')) amount *= 1.3;
                n.res[res] = (n.res[res] || 0) + Math.round(amount);
            });
        });

        /* Strategic asset bonuses */
        Object.entries(STRATEGIC_ASSETS).forEach(([assetId, asset]) => {
            const holderOwners = asset.holders.map(h => state.territories[h]);
            if (holderOwners.some(o => o === nationCode)) {
                Object.entries(asset.bonus).forEach(([res, amt]) => {
                    n.res[res] = (n.res[res] || 0) + amt;
                });
            }
        });

        /* Update territories owned list */
        n.territoriesOwned = ownedCodes;
    }

    /* ════════════════ PRODUCTION (Build Units) ════════════════ */
    function canBuild(nationCode, unitType) {
        const n = state.nations[nationCode];
        if (!n || !n.alive) return false;
        const ut = UNIT_TYPES[unitType];
        if (!ut) return false;
        /* Nuclear requires tech */
        if (ut.nuke && !n.techs.includes('nuclear_program')) return false;
        /* Check resources */
        for (const [res, cost] of Object.entries(ut.cost)) {
            if ((n.res[res] || 0) < cost) return false;
        }
        return true;
    }

    function buildUnit(nationCode, unitType) {
        if (!canBuild(nationCode, unitType)) return false;
        const n = state.nations[nationCode];
        const ut = UNIT_TYPES[unitType];
        for (const [res, cost] of Object.entries(ut.cost)) {
            n.res[res] -= cost;
        }
        n.army[unitType] = (n.army[unitType] || 0) + 1;
        emit('resource', `${n.flag} ${n.name} produce ${ut.icon} ${ut.name}`);
        return true;
    }

    /* ════════════════ TECHNOLOGY ════════════════ */
    function canResearch(nationCode, techId) {
        const n = state.nations[nationCode];
        if (!n || !n.alive) return false;
        if (n.techs.includes(techId)) return false;
        const tech = TECHNOLOGIES.find(t => t.id === techId);
        if (!tech) return false;
        /* Check prereqs */
        if (tech.prereq.some(p => !n.techs.includes(p))) return false;
        /* Check cost */
        for (const [res, cost] of Object.entries(tech.cost)) {
            if ((n.res[res] || 0) < cost) return false;
        }
        return true;
    }

    function research(nationCode, techId) {
        if (!canResearch(nationCode, techId)) return false;
        const n = state.nations[nationCode];
        const tech = TECHNOLOGIES.find(t => t.id === techId);
        for (const [res, cost] of Object.entries(tech.cost)) {
            n.res[res] -= cost;
        }
        n.techs.push(techId);
        emit('tech', `${n.flag} ${n.name} ricerca ${tech.icon} ${tech.name}`);
        return true;
    }

    /* ════════════════ COMBAT ════════════════ */
    function getTechBonus(nationCode, unitType, stat) {
        const n = state.nations[nationCode];
        if (!n) return 0;
        let bonus = 0;
        const techs = n.techs;
        /* Per-unit bonuses */
        TECHNOLOGIES.forEach(t => {
            if (!techs.includes(t.id)) return;
            const eff = t.effect;
            if (eff === 'all_atk+3' && stat === 'atk') bonus += 3;
            if (eff === 'def+5_all' && stat === 'def') bonus += 5;
            const match = eff.match(/^(\w+)_(atk|def)\+(\d+)$/);
            if (match && match[1] === unitType && match[2] === stat) bonus += parseInt(match[3]);
        });
        return bonus;
    }

    function calcMilitary(nationCode, stat) {
        const n = state.nations[nationCode];
        if (!n) return 0;
        let total = 0;
        Object.entries(n.army).forEach(([utype, count]) => {
            if (count <= 0) return;
            const ut = UNIT_TYPES[utype];
            if (!ut) return;
            const base = ut[stat] || 0;
            const techB = getTechBonus(nationCode, utype, stat);
            total += (base + techB) * count;
        });
        return total;
    }

    /**
     * Attack: attacker → defender territory
     * Returns { success, atkLosses, defLosses, conquered, nukeUsed }
     */
    function attack(attackerCode, defenderTerritoryCode) {
        const defender = state.territories[defenderTerritoryCode];
        if (!defender || defender === attackerCode) return null;

        const atk = state.nations[attackerCode];
        const def = state.nations[defender];
        if (!atk || !def || !atk.alive || !def.alive) return null;

        /* Snapshot armies BEFORE combat for loss display */
        const atkArmyBefore = { ...atk.army };
        const defArmyBefore = { ...def.army };

        const atkPow = calcMilitary(attackerCode, 'atk');
        const defPow = calcMilitary(defender, 'def');

        /* Terrain bonus +20% defender */
        const defTotal = defPow * 1.2;
        /* Random factor ±30% */
        const rng = 0.7 + Math.random() * 0.6;
        const atkTotal = atkPow * rng;

        const success = atkTotal > defTotal;

        /* Losses */
        const ratio = defTotal > 0 ? atkTotal / defTotal : 10;
        const atkLossRate = success ? (0.2 + Math.random() * 0.2) : (0.5 + Math.random() * 0.3);
        const defLossRate = success ? (0.5 + Math.random() * 0.3) : (0.2 + Math.random() * 0.2);

        applyLosses(attackerCode, atkLossRate);
        applyLosses(defender, defLossRate);

        let conquered = false;
        if (success) {
            /* Transfer territory */
            state.territories[defenderTerritoryCode] = attackerCode;
            conquered = true;

            /* ── LOOT: seize surviving army + resources from defender ── */
            /* Capture a portion of defender's remaining army (survivors join attacker) */
            const captureRate = 0.4 + Math.random() * 0.3; // 40-70% of remaining troops
            let capturedUnits = [];
            Object.keys(def.army).forEach(utype => {
                const captured = Math.floor(def.army[utype] * captureRate);
                if (captured > 0) {
                    atk.army[utype] = (atk.army[utype] || 0) + captured;
                    def.army[utype] -= captured;
                    capturedUnits.push(`${captured} ${UNIT_TYPES[utype]?.name || utype}`);
                }
            });

            /* Seize a portion of defender's resources */
            const lootRate = 0.3 + Math.random() * 0.2; // 30-50% of resources
            let lootedRes = [];
            Object.keys(def.res).forEach(r => {
                const loot = Math.floor(def.res[r] * lootRate);
                if (loot > 0) {
                    atk.res[r] = (atk.res[r] || 0) + loot;
                    def.res[r] -= loot;
                    if (r === 'money' && loot > 0) lootedRes.push(`💰${loot}`);
                    else if (loot >= 5) lootedRes.push(`${loot} ${r}`);
                }
            });

            /* Log the loot */
            const lootMsg = [];
            if (capturedUnits.length) lootMsg.push(`🎖️ ${capturedUnits.join(', ')}`);
            if (lootedRes.length) lootMsg.push(`📦 ${lootedRes.join(', ')}`);
            if (lootMsg.length) {
                emit('battle', `🏴 ${atk.flag} ${atk.name} saccheggia ${def.flag} ${def.name}: ${lootMsg.join(' | ')}`);
            }

            /* Declare war if not already */
            ensureWar(attackerCode, defender);
            /* Relation drop */
            adjustRelation(defender, attackerCode, -40);
            /* Neighbors fear */
            (def.neighbors || []).forEach(nb => {
                if (nb !== attackerCode) adjustRelation(nb, attackerCode, -10);
            });
        }

        const result = {
            success,
            attacker: attackerCode,
            defender,
            territory: defenderTerritoryCode,
            atkPow: Math.round(atkTotal),
            defPow: Math.round(defTotal),
            atkArmyBefore,
            defArmyBefore,
            conquered
        };

        const icon = success ? '✅' : '❌';
        emit('battle',
            `${icon} ${atk.flag} ${atk.name} attacca ${def.flag} ${def.name} a ${defenderTerritoryCode.toUpperCase()} — ` +
            `ATK:${result.atkPow} vs DEF:${result.defPow} → ${success ? 'VITTORIA' : 'SCONFITTA'}`);

        /* Check elimination */
        checkElimination(defender);
        checkElimination(attackerCode);

        return result;
    }

    function applyLosses(nationCode, rate) {
        const n = state.nations[nationCode];
        if (!n) return;
        Object.keys(n.army).forEach(utype => {
            if (n.army[utype] > 0) {
                const lost = Math.max(1, Math.round(n.army[utype] * rate));
                n.army[utype] = Math.max(0, n.army[utype] - lost);
            }
        });
    }

    /** Nuclear strike — devastating but global consequences */
    function nukeStrike(attackerCode, defenderTerritoryCode) {
        const atk = state.nations[attackerCode];
        if (!atk || (atk.army.nuke || 0) <= 0) return null;

        const defender = state.territories[defenderTerritoryCode];
        const def = state.nations[defender];
        if (!def) return null;

        /* Use one nuke */
        atk.army.nuke--;
        atk.nukesUsed++;

        /* Devastate defender */
        applyLosses(defender, 0.7 + Math.random() * 0.2);

        /* Transfer territory */
        state.territories[defenderTerritoryCode] = attackerCode;

        /* Global consequences */
        state.globalStability = Math.max(0, state.globalStability - 25);

        /* Universal sanctions */
        Object.keys(state.nations).forEach(code => {
            if (code !== attackerCode && state.nations[code].alive) {
                if (!atk.sanctions.includes(code)) atk.sanctions.push(code);
                adjustRelation(code, attackerCode, -50);
            }
        });

        emit('nuke',
            `☢️ ${atk.flag} ${atk.name} lancia TESTATA NUCLEARE su ${defenderTerritoryCode.toUpperCase()}! ` +
            `Stabilità globale: ${state.globalStability}%`);

        checkElimination(defender);
        return { success: true, nukeUsed: true, territory: defenderTerritoryCode };
    }

    /* ════════════════ DIPLOMACY ════════════════ */
    function adjustRelation(codeA, codeB, delta) {
        const nA = state.nations[codeA];
        if (!nA) return;
        nA.relations[codeB] = Math.max(-100, Math.min(100, (nA.relations[codeB] || 0) + delta));
    }

    function getRelation(codeA, codeB) {
        const nA = state.nations[codeA];
        return nA ? (nA.relations[codeB] || 0) : 0;
    }

    function ensureWar(codeA, codeB) {
        const exists = state.wars.some(w =>
            (w.attacker === codeA && w.defender === codeB) ||
            (w.attacker === codeB && w.defender === codeA));
        if (!exists) {
            state.wars.push({ attacker: codeA, defender: codeB, turn: state.turn });
            adjustRelation(codeA, codeB, -60);
            adjustRelation(codeB, codeA, -60);
        }
    }

    function isAtWar(codeA, codeB) {
        return state.wars.some(w =>
            (w.attacker === codeA && w.defender === codeB) ||
            (w.attacker === codeB && w.defender === codeA));
    }

    function makePeace(codeA, codeB) {
        state.wars = state.wars.filter(w =>
            !((w.attacker === codeA && w.defender === codeB) ||
              (w.attacker === codeB && w.defender === codeA)));
        adjustRelation(codeA, codeB, 20);
        adjustRelation(codeB, codeA, 20);
        emit('diplomacy', `🕊️ ${state.nations[codeA]?.flag || ''} ${codeA.toUpperCase()} e ${state.nations[codeB]?.flag || ''} ${codeB.toUpperCase()} firmano la pace`);
    }

    function addSanction(fromCode, toCode) {
        const n = state.nations[toCode];
        if (!n) return;
        if (!n.sanctions.includes(fromCode)) {
            n.sanctions.push(fromCode);
            adjustRelation(toCode, fromCode, -15);
            emit('diplomacy', `🚫 ${state.nations[fromCode]?.flag} ${fromCode.toUpperCase()} sanziona ${n.flag} ${toCode.toUpperCase()}`);
        }
    }

    function makeAlliance(codeA, codeB) {
        const exists = state.alliances.some(a =>
            (a.a === codeA && a.b === codeB) || (a.a === codeB && a.b === codeA));
        if (!exists) {
            state.alliances.push({ a: codeA, b: codeB, turn: state.turn });
            adjustRelation(codeA, codeB, 30);
            adjustRelation(codeB, codeA, 30);
            emit('diplomacy', `🤝 ${state.nations[codeA]?.flag} ${codeA.toUpperCase()} e ${state.nations[codeB]?.flag} ${codeB.toUpperCase()} formano un'alleanza`);
        }
    }

    function isAlly(codeA, codeB) {
        return state.alliances.some(a =>
            (a.a === codeA && a.b === codeB) || (a.a === codeB && a.b === codeA));
    }

    function breakAlliance(codeA, codeB) {
        state.alliances = state.alliances.filter(a =>
            !((a.a === codeA && a.b === codeB) || (a.a === codeB && a.b === codeA)));
        adjustRelation(codeA, codeB, -25);
        adjustRelation(codeB, codeA, -25);
        emit('diplomacy', `💔 Alleanza rotta tra ${codeA.toUpperCase()} e ${codeB.toUpperCase()}`);
    }

    /* ════════════════ ELIMINATION / VICTORY ════════════════ */
    function checkElimination(nationCode) {
        const n = state.nations[nationCode];
        if (!n || !n.alive) return;
        const owned = Object.values(state.territories).filter(o => o === nationCode).length;
        if (owned === 0) {
            n.alive = false;
            emit('battle', `💀 ${n.flag} ${n.name} è stata eliminata!`);
        }
    }

    function checkVictory() {
        if (state.gameOver) return state.victor;
        const totalTerr = SVG_IDS.length;

        for (const code of Object.keys(state.nations)) {
            const n = state.nations[code];
            if (!n.alive) continue;
            const owned = Object.values(state.territories).filter(o => o === code).length;
            const pct = owned / totalTerr;

            /* Military victory: 70% territories */
            if (pct >= 0.70) {
                state.gameOver = true;
                state.victor = code;
                emit('game', `🏆 ${n.flag} ${n.name} DOMINA IL MONDO! (${Math.round(pct*100)}% territori)`);
                return code;
            }

            /* Economic victory: 50K funds + 30% territories */
            if (n.res.money >= 50000 && pct >= 0.30) {
                state.gameOver = true;
                state.victor = code;
                emit('game', `🏆 ${n.flag} ${n.name} VITTORIA ECONOMICA! (💰${n.res.money}, ${Math.round(pct*100)}% territori)`);
                return code;
            }

            /* Strategic victory: all strategic assets */
            const allAssets = Object.values(STRATEGIC_ASSETS).every(asset =>
                asset.holders.some(h => state.territories[h] === code));
            if (allAssets) {
                state.gameOver = true;
                state.victor = code;
                emit('game', `🏆 ${n.flag} ${n.name} controlla tutti gli asset strategici!`);
                return code;
            }
        }
        return null;
    }

    /* ════════════════ TURN MANAGEMENT ════════════════ */
    function endPlayerTurn() {
        state.phase = 'ai';
    }

    function startNewTurn() {
        state.turn++;
        state.phase = 'player';
        /* Collect resources for player */
        collectResources(state.player);

        /* Relations decay: positive relations slowly drift toward 0 every 5 turns
           This prevents permanent peace stalemates */
        if (state.turn % 5 === 0) {
            Object.keys(state.nations).forEach(code => {
                const n = state.nations[code];
                if (!n || !n.alive) return;
                Object.keys(n.relations).forEach(other => {
                    const r = n.relations[other];
                    if (r > 5) n.relations[other] = Math.max(0, r - 3);
                    /* Negative relations also slowly recover unless at war */
                    else if (r < -5 && !isAtWar(code, other)) {
                        n.relations[other] = Math.min(0, r + 2);
                    }
                });
            });
        }

        emit('game', `📅 Turno ${state.turn}`);
    }

    /* Get all alive non-player nation codes (for AI processing) */
    function getAINations() {
        return Object.keys(state.nations)
            .filter(c => c !== state.player && state.nations[c].alive);
    }

    /* Get wars involving a nation */
    function getWarsFor(code) {
        return state.wars.filter(w => w.attacker === code || w.defender === code);
    }

    /* Get nation territory count */
    function getTerritoryCount(code) {
        return Object.values(state.territories).filter(o => o === code).length;
    }

    /* Get neighbors who own adjacent territories */
    function getNeighborOwners(code) {
        const n = state.nations[code];
        if (!n) return [];
        const owners = new Set();

        /* Gather ALL territories this nation currently owns */
        const myTerritories = Object.entries(state.territories)
            .filter(([, o]) => o === code).map(([c]) => c);

        /* For each owned territory, use global ADJACENCY map */
        myTerritories.forEach(tCode => {
            const neighbors = getNeighborsOf(tCode);
            neighbors.forEach(nb => {
                const owner = state.territories[nb];
                if (owner && owner !== code) owners.add(owner);
            });
        });

        return [...owners];
    }

    /* ════════════════ RANDOM EVENTS ════════════════ */
    function rollRandomEvents() {
        const roll = Math.random();
        if (roll < 0.05) {
            /* Earthquake */
            const alive = Object.keys(state.nations).filter(c => state.nations[c].alive);
            const victim = alive[Math.floor(Math.random() * alive.length)];
            const n = state.nations[victim];
            n.res.money = Math.max(0, n.res.money - 30);
            n.res.steel = Math.max(0, n.res.steel - 10);
            emit('game', `🌍 Terremoto in ${n.flag} ${n.name}! Danni economici.`);
        } else if (roll < 0.08) {
            /* Oil crisis */
            Object.values(state.nations).forEach(n => {
                if (n.alive) n.res.oil = Math.max(0, Math.round(n.res.oil * 0.85));
            });
            emit('game', `🛢️ Crisi petrolifera globale! -15% scorte petrolio per tutti.`);
        } else if (roll < 0.10) {
            /* Tech breakthrough for random nation */
            const alive = Object.keys(state.nations).filter(c => state.nations[c].alive);
            const lucky = alive[Math.floor(Math.random() * alive.length)];
            const n = state.nations[lucky];
            n.res.money += 50;
            emit('game', `🔬 Scoperta scientifica in ${n.flag} ${n.name}! +50 fondi.`);
        } else if (roll < 0.12) {
            /* Pandemic scare */
            Object.values(state.nations).forEach(n => {
                if (n.alive) n.res.food = Math.max(0, n.res.food - 5);
            });
            emit('game', `🦠 Allarme pandemico globale! -5 cibo per tutti.`);
        }
    }

    /* ════════════════ STATE ACCESS ════════════════ */
    function getState() { return state; }
    function setOnEvent(fn) { onEvent = fn; }

    /** Calculate per-turn income for a nation (without actually adding it) */
    function calcIncome(nationCode) {
        if (!state) return {};
        const n = state.nations[nationCode];
        if (!n || !n.alive) return {};

        const income = {};
        Object.keys(RESOURCES).forEach(k => income[k] = 0);

        const ownedCodes = Object.entries(state.territories)
            .filter(([, owner]) => owner === nationCode)
            .map(([code]) => code);

        ownedCodes.forEach(tCode => {
            const tBase = getNation(tCode);
            const tProd = tBase.prod || {};
            Object.keys(tProd).forEach(res => {
                let amount = tProd[res] || 0;
                if (tCode !== nationCode && tBase.profile !== 'minor') amount *= 0.7;
                const sanctionPen = Math.max(0, 1 - n.sanctions.length * 0.05);
                amount *= sanctionPen;
                if (res === 'money' && n.techs.includes('green_energy')) amount += (20 / Math.max(1, ownedCodes.length));
                if (['oil','gas','gold','silver','diamonds','uranium','rareEarth'].includes(res)
                    && n.techs.includes('deep_mining')) amount *= 1.3;
                income[res] = (income[res] || 0) + Math.round(amount);
            });
        });

        /* Strategic asset bonuses */
        Object.entries(STRATEGIC_ASSETS).forEach(([assetId, asset]) => {
            const holderOwners = asset.holders.map(h => state.territories[h]);
            if (holderOwners.some(o => o === nationCode)) {
                Object.entries(asset.bonus).forEach(([res, amt]) => {
                    income[res] = (income[res] || 0) + amt;
                });
            }
        });

        return income;
    }

    /* ════════════════ PUBLIC ════════════════ */
    return {
        newGame,
        getState,
        setOnEvent,
        collectResources,
        calcIncome,
        canBuild,
        buildUnit,
        canResearch,
        research,
        calcMilitary,
        attack,
        nukeStrike,
        adjustRelation,
        getRelation,
        ensureWar,
        isAtWar,
        makePeace,
        addSanction,
        makeAlliance,
        isAlly,
        breakAlliance,
        checkVictory,
        endPlayerTurn,
        startNewTurn,
        getAINations,
        getWarsFor,
        getTerritoryCount,
        getNeighborOwners,
        rollRandomEvents,
        emit
    };
})();
