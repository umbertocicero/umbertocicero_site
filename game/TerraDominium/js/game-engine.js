/* ═══════════════════════════════════════════════════════
   GeoDominion — Game Engine  (v2 — SVG territories)
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
            unrest: {},             // territoryCode → 0-100, revolt at ≥100
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

            /* Apply ±5-15% uncertainty to resources and army at game start
               so every playthrough feels slightly different */
            const fuzz = (val) => {
                if (!val || val <= 0) return val;
                const pct = 0.05 + Math.random() * 0.10;  // 5-15%
                const sign = Math.random() < 0.5 ? -1 : 1;
                return Math.max(0, Math.round(val * (1 + sign * pct)));
            };
            const fuzzedRes = { ...emptyRes(), ...base.res };
            Object.keys(fuzzedRes).forEach(k => { fuzzedRes[k] = fuzz(fuzzedRes[k]); });
            const fuzzedArmy = { ...emptyArmy(), ...base.army };
            Object.keys(fuzzedArmy).forEach(k => { fuzzedArmy[k] = fuzz(fuzzedArmy[k]); });

            state.nations[code] = {
                code,
                name: base.name,
                flag: base.flag,
                color: base.color,
                profile: base.profile,
                res: fuzzedRes,
                prod: { ...emptyProd(), ...base.prod },
                army: fuzzedArmy,
                techs: [],
                sanctions: [],      // codes that sanction this nation
                relations: {},      // code → number (-100 to +100)
                assets: base.assets || [],
                neighbors: base.neighbors || [],
                power: base.power || 5,
                alive: true,
                nukesUsed: 0,
                territoriesOwned: [code],
                homeland: code      // original territory for reconquest AI
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

        /* ── Reachability check ── */
        let attackMethod = 'land';
        let launchFrom = attackerCode;  // default: launch from homeland
        if (typeof canReachTerritory === 'function') {
            const reach = canReachTerritory(attackerCode, defenderTerritoryCode, atk.army);
            if (!reach.reachable) {
                return { blocked: true, reason: reach.reason };
            }
            attackMethod = reach.method || 'land';
            launchFrom = reach.launchFrom || attackerCode;
        }

        /* Snapshot armies BEFORE combat for loss display */
        const atkArmyBefore = { ...atk.army };
        const defArmyBefore = { ...def.army };

        const atkPow = calcMilitary(attackerCode, 'atk');
        const defPow = calcMilitary(defender, 'def');

        /* Terrain bonus +20% defender */
        let defTotal = defPow * 1.2;

        /* Local garrison bonus: heavy garrison on the specific territory gives extra defense */
        const localGarrison = getGarrison(defenderTerritoryCode);
        if (localGarrison) {
            const garrisonMult = localGarrison.strength === 'heavy' ? 1.25
                               : localGarrison.strength === 'medium' ? 1.12
                               : localGarrison.strength === 'light' ? 1.05
                               : 0.90; /* No garrison: defender is 10% weaker */
            defTotal *= garrisonMult;
        }

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
        let homelandSiege = null;  // track homeland siege events for UI/animations
        if (success) {
            /* Check if this is an attack on the defender's homeland */
            const defHomeland = def.homeland || defender;
            const isHomelandAttack = (defenderTerritoryCode === defHomeland);

            /* Count colonies BEFORE transferring this territory */
            const defTerritoriesBefore = Object.entries(state.territories)
                .filter(([tCode, owner]) => owner === defender && tCode !== defenderTerritoryCode)
                .map(([tCode]) => tCode);
            const hasColonies = defTerritoriesBefore.length > 0;

            if (isHomelandAttack && hasColonies) {
                /* ════ HOMELAND SIEGE: defender may survive by sacrificing colonies ════ */
                /* Transfer the homeland first */
                state.territories[defenderTerritoryCode] = attackerCode;
                delete state.unrest[defenderTerritoryCode];  // fresh start
                conquered = true;

                /* Trigger the siege mechanism */
                homelandSiege = handleHomelandSiege(defender, attackerCode);

                if (homelandSiege.survived) {
                    /* Defender survived — reduced loot (only from homeland, not full army) */
                    const lootRate = 0.15 + Math.random() * 0.1; // 15-25% (less than normal)
                    Object.keys(def.res).forEach(r => {
                        const loot = Math.floor(def.res[r] * lootRate);
                        if (loot > 0) {
                            atk.res[r] = (atk.res[r] || 0) + loot;
                            def.res[r] -= loot;
                        }
                    });
                } else {
                    /* Total collapse — loot everything */
                    const captureRate = 0.6 + Math.random() * 0.3;
                    Object.keys(def.army).forEach(utype => {
                        const captured = Math.floor(def.army[utype] * captureRate);
                        if (captured > 0) {
                            atk.army[utype] = (atk.army[utype] || 0) + captured;
                            def.army[utype] -= captured;
                        }
                    });
                    Object.keys(def.res).forEach(r => {
                        const loot = Math.floor(def.res[r] * 0.6);
                        if (loot > 0) {
                            atk.res[r] = (atk.res[r] || 0) + loot;
                            def.res[r] -= loot;
                        }
                    });
                }
            } else {
                /* ════ NORMAL CONQUEST (not homeland, or no colonies) ════ */
                /* Transfer territory */
                state.territories[defenderTerritoryCode] = attackerCode;
                delete state.unrest[defenderTerritoryCode];  // fresh start
                conquered = true;

                /* ── LOOT: seize surviving army + resources from defender ── */
                const captureRate = 0.4 + Math.random() * 0.3;
                let capturedUnits = [];
                Object.keys(def.army).forEach(utype => {
                    const captured = Math.floor(def.army[utype] * captureRate);
                    if (captured > 0) {
                        atk.army[utype] = (atk.army[utype] || 0) + captured;
                        def.army[utype] -= captured;
                        capturedUnits.push(`${captured} ${UNIT_TYPES[utype]?.name || utype}`);
                    }
                });

                const lootRate = 0.3 + Math.random() * 0.2;
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

                const lootMsg = [];
                if (capturedUnits.length) lootMsg.push(`🎖️ ${capturedUnits.join(', ')}`);
                if (lootedRes.length) lootMsg.push(`📦 ${lootedRes.join(', ')}`);
                if (lootMsg.length) {
                    emit('battle', `🏴 ${atk.flag} ${atk.name} saccheggia ${def.flag} ${def.name}: ${lootMsg.join(' | ')}`);
                }
            } /* end normal conquest vs homeland siege */

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
            launchFrom,         // territory code from which the attack actually originates
            attackMethod,       // 'land' | 'sea_transport' | 'air' | 'missile'
            atkPow: Math.round(atkTotal),
            defPow: Math.round(defTotal),
            atkArmyBefore,
            defArmyBefore,
            conquered,
            homelandSiege
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

    /**
     * Apply combat losses to a nation's army.
     * IMPORTANT: losses are proportional to the BATTLE, not the entire army.
     * Only a fraction of the army is "engaged" in any single territory battle.
     * The engaged fraction depends on how many territories the nation controls.
     *
     * @param {string} nationCode
     * @param {number} rate - base loss intensity (0-1)
     * @param {number} [engagedFraction] - what % of army fights (default: calculated)
     */
    function applyLosses(nationCode, rate, engagedFraction) {
        const n = state.nations[nationCode];
        if (!n) return;

        /* Calculate engagement: larger empires commit fewer troops per battle */
        const terrCount = Object.values(state.territories).filter(o => o === nationCode).length;
        const engaged = engagedFraction || Math.min(0.6, Math.max(0.08, 1.0 / Math.max(1, terrCount)));

        /* Only the engaged portion takes losses */
        const effectiveRate = rate * engaged;

        Object.keys(n.army).forEach(utype => {
            if (n.army[utype] <= 0) return;
            const lost = Math.max(0, Math.round(n.army[utype] * effectiveRate));
            /* Always keep at least 1 unit of each type if nation had >3 */
            const floor = n.army[utype] > 3 ? 1 : 0;
            n.army[utype] = Math.max(floor, n.army[utype] - lost);
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

        /* Check if this is a nuke on homeland with colonies */
        const defHomeland = def.homeland || defender;
        const isHomelandNuke = (defenderTerritoryCode === defHomeland);
        const defColonies = Object.entries(state.territories)
            .filter(([tCode, owner]) => owner === defender && tCode !== defenderTerritoryCode)
            .map(([tCode]) => tCode);

        /* Transfer territory */
        state.territories[defenderTerritoryCode] = attackerCode;
        delete state.unrest[defenderTerritoryCode];  // fresh start

        /* If homeland nuked with colonies: trigger siege (nukes are overwhelming, 
           so demand is very high — unlikely to survive unless very large empire) */
        let homelandSiege = null;
        if (isHomelandNuke && defColonies.length > 0) {
            homelandSiege = handleHomelandSiege(defender, attackerCode);
        }

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

    /**
     * Homeland Siege Mechanism
     * ────────────────────────
     * When a nation loses its homeland in battle, it doesn't instantly die
     * IF it still controls colonies (other territories).
     *
     * Logic:
     * 1. Calculate the attacker's "demand" (proportional to attack power).
     * 2. The defender releases colonies to satisfy the demand:
     *    - Colonies go to the ATTACKER (spoils of war).
     *    - Dead original nations DON'T get revived (they can't play).
     *    - For each colony released, the defender withdraws some troops.
     * 3. If enough colonies are released to satisfy the demand:
     *    → Defender SURVIVES, retreating to the best remaining colony.
     *    → Homeland still falls to attacker.
     * 4. If colonies aren't rich enough to cover the demand:
     *    → TOTAL COLLAPSE: attacker takes everything.
     *
     * Returns: { survived, releasedColonies[], retreatedTo }
     */
    function handleHomelandSiege(defenderCode, attackerCode) {
        const def = state.nations[defenderCode];
        const atk = state.nations[attackerCode];
        if (!def || !atk) return { survived: false, releasedColonies: [], retreatedTo: null };

        const homeland = def.homeland || defenderCode;

        /* Gather all colonies (territories owned that are NOT the homeland) */
        const colonies = Object.entries(state.territories)
            .filter(([tCode, owner]) => owner === defenderCode && tCode !== homeland)
            .map(([tCode]) => tCode);

        if (colonies.length === 0) {
            /* No colonies — nothing to sacrifice, total collapse */
            return { survived: false, releasedColonies: [], retreatedTo: null };
        }

        /* Calculate "demand" — how much the attacker requires to be satisfied.
           Based on attacker's military power scaled down. Higher power = higher demand. */
        const atkMil = calcMilitary(attackerCode, 'atk');
        const demand = Math.max(50, Math.round(atkMil * 0.6));

        /* Calculate each colony's economic value (production sum + resource stockpile fraction) */
        function colonyValue(tCode) {
            const tBase = getNation(tCode);
            const tProd = tBase.prod || {};
            let val = 0;
            Object.values(tProd).forEach(v => val += (v || 0));
            /* Add a base value per territory (even minor ones have strategic worth) */
            val += 15;
            return val;
        }

        /* Sort colonies: cheapest first (sacrifice less valuable ones first) */
        const sortedColonies = colonies
            .map(c => ({ code: c, value: colonyValue(c) }))
            .sort((a, b) => a.value - b.value);

        let accumulated = 0;
        const released = [];
        let troopsWithdrawn = 0;

        for (const colony of sortedColonies) {
            if (accumulated >= demand) break; /* Enough paid */

            /* Release colony to attacker */
            state.territories[colony.code] = attackerCode;
            delete state.unrest[colony.code];  // fresh start
            accumulated += colony.value;
            released.push(colony.code);

            /* Defender withdraws some troops from the colony (gets a small boost) */
            const withdrawnInfantry = Math.floor(Math.random() * 3) + 1;
            def.army.infantry = (def.army.infantry || 0) + withdrawnInfantry;
            troopsWithdrawn += withdrawnInfantry;

            /* Seize colony resources for attacker */
            const colBase = getNation(colony.code);
            const colProd = colBase.prod || {};
            Object.keys(colProd).forEach(r => {
                const loot = Math.round((colProd[r] || 0) * 2); // 2 turns worth
                if (loot > 0) atk.res[r] = (atk.res[r] || 0) + loot;
            });

            emit('battle',
                `🏳️ ${def.flag} ${def.name} cede ${getNation(colony.code)?.name || colony.code.toUpperCase()} a ${atk.flag} ${atk.name} per difendere la patria`);
        }

        /* Did we accumulate enough? */
        if (accumulated >= demand) {
            /* Defender survives! Retreats to the BEST remaining colony */
            const remaining = Object.entries(state.territories)
                .filter(([tCode, owner]) => owner === defenderCode && tCode !== homeland)
                .map(([tCode]) => ({ code: tCode, value: colonyValue(tCode) }))
                .sort((a, b) => b.value - a.value);

            if (remaining.length > 0) {
                const retreatTo = remaining[0].code;
                emit('battle',
                    `🛡️ ${def.flag} ${def.name} perde la patria ma SOPRAVVIVE! ` +
                    `Si ritira a ${getNation(retreatTo)?.name || retreatTo.toUpperCase()} ` +
                    `(cedute ${released.length} colonie, +${troopsWithdrawn} truppe ritirate)`);
                return { survived: true, releasedColonies: released, retreatedTo: retreatTo };
            } else {
                /* Released all colonies and somehow nothing left — shouldn't happen, but fallback */
                return { survived: false, releasedColonies: released, retreatedTo: null };
            }
        } else {
            /* Not enough colonies to cover demand — TOTAL COLLAPSE */
            /* Give ALL remaining territories to attacker */
            const allRemaining = Object.entries(state.territories)
                .filter(([tCode, owner]) => owner === defenderCode)
                .map(([tCode]) => tCode);

            allRemaining.forEach(tCode => {
                state.territories[tCode] = attackerCode;
                delete state.unrest[tCode];  // fresh start
                if (!released.includes(tCode)) released.push(tCode);
            });

            emit('battle',
                `💀 ${def.flag} ${def.name}: le colonie non bastano a resistere! ` +
                `${atk.flag} ${atk.name} conquista TUTTO (${released.length} territori)`);
            return { survived: false, releasedColonies: released, retreatedTo: null };
        }
    }

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

        /* ── Dynamic global stability ──
           Wars drag it down, peace slowly restores it.
           More wars = faster decline. Nukes already -25 per use. */
        const warCount = state.wars.length;
        const aliveCount = Object.values(state.nations).filter(n => n.alive).length;
        const warRatio = aliveCount > 0 ? warCount / aliveCount : 0;
        /* Each turn: wars pull stability down, baseline drifts up */
        const warDrag = Math.min(8, warRatio * 6);      // 0-8% drop per turn from wars
        const peaceDrift = warCount === 0 ? 3 : 0.5;    // recovers faster if no wars at all
        state.globalStability = Math.max(0, Math.min(100,
            state.globalStability - warDrag + peaceDrift));

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

    /* ════════════════ UNREST SYSTEM ════════════════ */
    /**
     * Calculate per-turn unrest gain for a conquered territory.
     * Returns a number 0-15 (unrest points added this turn).
     */
    function calcUnrestGain(tCode, owner) {
        const originalNation = state.nations[tCode];
        if (!originalNation) return 0;
        let gain = 3;                                           // base +3 per turn
        if (originalNation.alive) gain += 4;                    // original nation alive → +4
        const occupierWars = state.wars.filter(w => w.attacker === owner || w.defender === owner).length;
        gain += Math.min(4, occupierWars);                      // +1 per war, max +4
        /* Garrison reduces unrest accumulation */
        const garrison = getGarrison(tCode);
        if (garrison.strength === 'heavy')       gain -= 6;
        else if (garrison.strength === 'medium') gain -= 4;
        else if (garrison.strength === 'light')  gain -= 2;
        if (garrison.total === 0)                gain += 5;     // no garrison → rapid unrest
        return Math.max(0, gain);
    }

    /** Get unrest level for a territory (0-100) */
    function getUnrest(tCode) {
        return state.unrest[tCode] || 0;
    }

    /** Get all territories with unrest for a nation, sorted by urgency */
    function getUnrestList(nationCode) {
        const list = [];
        Object.entries(state.territories).forEach(([tCode, owner]) => {
            if (owner !== nationCode) return;
            if (tCode === owner) return;        // homeland = no unrest
            const u = state.unrest[tCode] || 0;
            if (u > 0) {
                const orig = state.nations[tCode];
                list.push({
                    territory: tCode,
                    name: orig?.name || tCode.toUpperCase(),
                    flag: orig?.flag || '',
                    unrest: u,
                    gain: calcUnrestGain(tCode, owner)
                });
            }
        });
        list.sort((a, b) => b.unrest - a.unrest);
        return list;
    }

    /**
     * Suppress unrest in a territory.
     * Cost: 💰15 + 2 infantry consumed to quell unrest.
     * Reduces unrest by 40 points.
     * Returns { success, reason? }
     */
    function suppressUnrest(tCode) {
        const owner = state.territories[tCode];
        if (!owner) return { success: false, reason: 'Territorio non trovato' };
        const n = state.nations[owner];
        if (!n || !n.alive) return { success: false, reason: 'Nazione non valida' };
        /* Check cost */
        if ((n.res.money || 0) < 15) return { success: false, reason: 'Fondi insufficienti (servono 💰15)' };
        if ((n.army.infantry || 0) < 2) return { success: false, reason: 'Fanteria insufficiente (servono 🪖2 unità)' };
        /* Pay cost */
        n.res.money -= 15;
        n.army.infantry -= 2;
        /* Reduce unrest */
        state.unrest[tCode] = Math.max(0, (state.unrest[tCode] || 0) - 40);
        emit('game', `🛡️ Rivolta sedata in ${state.nations[tCode]?.flag||''} ${state.nations[tCode]?.name||tCode}! (-💰15, -🪖2)`);
        return { success: true };
    }

    /* ════════════════ RANDOM EVENTS ════════════════ */
    function rollRandomEvents() {
        /* ── Unrest accumulation & Revolts ── */
        const revoltEvents = [];
        Object.entries(state.territories).forEach(([tCode, owner]) => {
            /* Only conquered territories accumulate unrest */
            if (tCode === owner) {
                delete state.unrest[tCode];   // cleanup
                return;
            }
            const originalNation = state.nations[tCode];
            if (!originalNation) return;

            /* Accumulate unrest */
            const gain = calcUnrestGain(tCode, owner);
            state.unrest[tCode] = Math.min(100, (state.unrest[tCode] || 0) + gain);

            /* Revolt triggers when unrest reaches 100 */
            if (state.unrest[tCode] >= 100) {
                /* Revolt! Territory returns to original nation */
                state.territories[tCode] = tCode;
                delete state.unrest[tCode];
                /* If original nation was dead, revive it */
                if (!originalNation.alive) {
                    originalNation.alive = true;
                    originalNation.army.infantry = Math.max(originalNation.army.infantry || 0, 3);
                    originalNation.res.money = Math.max(originalNation.res.money || 0, 20);
                }
                revoltEvents.push({ territory: tCode, from: owner, to: tCode });
                emit('battle', `🔥 RIVOLTA in ${originalNation.flag} ${originalNation.name}! Il territorio si ribella a ${state.nations[owner]?.flag||''} ${state.nations[owner]?.name||owner}`);
                adjustRelation(tCode, owner, -30);
            }
        });

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

        return revoltEvents;
    }

    /* ════════════════ STATE ACCESS ════════════════ */
    function getState() { return state; }
    function setOnEvent(fn) { onEvent = fn; }

    /**
     * Garrison System: compute per-territory troop distribution.
     * Army is shared across all owned territories with weighting:
     *   - Homeland gets 2× weight
     *   - Territories at war borders get 1.5× weight
     *   - Others get 1× weight
     * Returns { [territoryCode]: { total, dominant, icon, strength } }
     *   total     = estimated troop equivalents on this territory
     *   dominant  = key of the most numerous unit type in national army
     *   icon      = emoji of dominant unit
     *   strength  = 'heavy' | 'medium' | 'light' | 'none'
     */
    function getGarrisons(nationCode) {
        if (!state) return {};
        const n = state.nations[nationCode];
        if (!n || !n.alive) return {};

        const ownedTerr = Object.entries(state.territories)
            .filter(([, o]) => o === nationCode).map(([c]) => c);
        if (ownedTerr.length === 0) return {};

        /* Total army units */
        const totalUnits = Object.values(n.army).reduce((a, b) => a + b, 0);
        if (totalUnits === 0) {
            const empty = {};
            ownedTerr.forEach(c => { empty[c] = { total: 0, dominant: null, icon: '', strength: 'none' }; });
            return empty;
        }

        /* Find dominant unit type */
        let dominant = 'infantry', maxCount = 0;
        Object.entries(n.army).forEach(([utype, count]) => {
            if (count > maxCount) { maxCount = count; dominant = utype; }
        });
        const domIcon = UNIT_TYPES[dominant]?.icon || '🪖';

        /* Calculate weights per territory */
        const enemyNeighborSet = new Set();
        state.wars.forEach(w => {
            const enemy = w.attacker === nationCode ? w.defender : (w.defender === nationCode ? w.attacker : null);
            if (enemy) {
                /* Find our territories that border this enemy */
                ownedTerr.forEach(tc => {
                    const nb = getNeighborsOf(tc);
                    if (nb.some(n => state.territories[n] === enemy)) {
                        enemyNeighborSet.add(tc);
                    }
                });
            }
        });

        let totalWeight = 0;
        const weights = {};
        ownedTerr.forEach(tc => {
            let w = 1.0;
            if (tc === (n.homeland || nationCode)) w = 2.0;       // homeland bonus
            if (enemyNeighborSet.has(tc)) w = Math.max(w, 1.5);   // front-line bonus
            weights[tc] = w;
            totalWeight += w;
        });

        /* Distribute units proportionally */
        const garrisons = {};
        ownedTerr.forEach(tc => {
            const proportion = weights[tc] / totalWeight;
            const troops = Math.round(totalUnits * proportion);
            let strength = 'none';
            if (troops >= 15) strength = 'heavy';
            else if (troops >= 6) strength = 'medium';
            else if (troops >= 1) strength = 'light';
            garrisons[tc] = { total: troops, dominant, icon: domIcon, strength };
        });

        return garrisons;
    }

    /** Quick garrison lookup for a single territory */
    function getGarrison(territoryCode) {
        const owner = state?.territories[territoryCode];
        if (!owner) return { total: 0, dominant: null, icon: '', strength: 'none' };
        const all = getGarrisons(owner);
        return all[territoryCode] || { total: 0, dominant: null, icon: '', strength: 'none' };
    }

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
        emit,
        getGarrisons,
        getGarrison,
        getUnrest,
        getUnrestList,
        suppressUnrest
    };
})();
