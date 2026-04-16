/* ═══════════════════════════════════════════════════════
   GeoDominion — Game Engine  (v2 — SVG territories)
   Turn system, resources, combat, production, victory
   ═══════════════════════════════════════════════════════ */

const GameEngine = (() => {
    /* ── Game state ── */
    let state = null;
    let onEvent = null;     // callback for UI log

    /** i18n helper: use global I18n if available, fallback to key */
    function _t(key, params) {
        return (typeof I18n !== 'undefined') ? I18n.t(key, params) : key;
    }

    /* ── Territory count cache: nationCode → count.
       Updated incrementally on every ownership change.
       Avoids O(n) full scans of state.territories. ── */
    const _terrCountCache = {};

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
            revoltCooldown: {},     // territoryCode → turns remaining (grace period after revolt)
            gameOver: false,
            victor: null,
            log: []
        };

        /* Assign territory ownership: every SVG id is owned by itself initially */
        SVG_IDS.forEach(code => { state.territories[code] = code; });

        /* Build initial territory count cache */
        Object.keys(_terrCountCache).forEach(k => delete _terrCountCache[k]);
        SVG_IDS.forEach(code => {
            _terrCountCache[code] = (_terrCountCache[code] || 0) + 1;
        });

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

        emit('game',`⚔️ ${_t('ge_game_start')}`);
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

        /* Purge sanctions from dead/conquered nations before calculating income */
        purgeSanctions(nationCode);

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
        /* Build events are intentionally NOT emitted to keep the log clean */
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
        emit('tech', `${n.flag} ${n.name} ${_t('ge_researches')} ${tech.icon} ${tech.name}`);
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
    /* ════════════════ ATTACK COST & FATIGUE ════════════════
     * Each attack in the same turn gets progressively more expensive.
     * This prevents carpet-bombing: conquering 15 nations in a single turn.
     *
     * Attack #  | Money | Infantry | Fatigue (ATK power penalty)
     * ──────────┼───────┼──────────┼─────────────────────────────
     *     1     |   0   |    0     |   0%
     *     2     |   5   |    0     |   5%
     *     3     |  15   |    1     |  12%
     *     4     |  30   |    2     |  20%
     *     5     |  50   |    3     |  30%
     *     6+    |  75+  |    4+    |  42%+
     */

    /** How many attacks has this nation performed this turn? */
    function getAttacksThisTurn(nationCode) {
        if (!state._attacksThisTurn) state._attacksThisTurn = {};
        return state._attacksThisTurn[nationCode] || 0;
    }

    /** Get cost for the NEXT attack this turn.
     *  Returns { money, infantry, fatigue (0-1), attackNum } */
    function getAttackCost(nationCode) {
        const n = getAttacksThisTurn(nationCode);
        const money    = n === 0 ? 0
                       : n === 1 ? 5
                       : n === 2 ? 15
                       : n === 3 ? 30
                       : n === 4 ? 50
                       : 50 + (n - 4) * 25;     // 75, 100, 125...
        const infantry = n <= 1 ? 0
                       : n === 2 ? 1
                       : n === 3 ? 2
                       : Math.min(6, n - 1);     // 3, 4, 5, 6 cap
        /* Fatigue: power penalty that grows with each attack */
        const fatigue  = n === 0 ? 0
                       : n === 1 ? 0.05
                       : n === 2 ? 0.12
                       : n === 3 ? 0.20
                       : n === 4 ? 0.30
                       : Math.min(0.60, 0.30 + (n - 4) * 0.12); // up to 60%
        return { money, infantry, fatigue, attackNum: n + 1 };
    }

    /** Check if a nation can afford the next attack.
     *  Returns { canAttack, cost, reason } */
    function canAffordAttack(nationCode) {
        const cost = getAttackCost(nationCode);
        const n = state.nations[nationCode];
        if (!n) return { canAttack: false, cost, reason: 'Nazione non valida' };
        if (cost.money > 0 && (n.res.money || 0) < cost.money) {
            return { canAttack: false, cost, reason: `Fondi insufficienti per ${cost.attackNum}° attacco: servono 💰${cost.money} (hai 💰${n.res.money||0})` };
        }
        if (cost.infantry > 0 && (n.army.infantry || 0) < cost.infantry) {
            return { canAttack: false, cost, reason: `Fanteria insufficiente per ${cost.attackNum}° attacco: servono 🪖${cost.infantry} (hai 🪖${n.army.infantry||0})` };
        }
        return { canAttack: true, cost };
    }

    function attack(attackerCode, defenderTerritoryCode) {
        const defender = state.territories[defenderTerritoryCode];
        if (!defender || defender === attackerCode) return null;

        const atk = state.nations[attackerCode];
        const def = state.nations[defender];
        if (!atk || !def || !atk.alive || !def.alive) return null;

        /* ── Attack cost check (escalating) ── */
        const affordCheck = canAffordAttack(attackerCode);
        if (!affordCheck.canAttack) {
            return { blocked: true, reason: affordCheck.reason };
        }
        const attackCost = affordCheck.cost;

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

        /* Pay attack cost (AFTER all checks pass) */
        if (attackCost.money > 0)    atk.res.money    = (atk.res.money || 0) - attackCost.money;
        if (attackCost.infantry > 0) atk.army.infantry = Math.max(0, (atk.army.infantry || 0) - attackCost.infantry);

        /* Track attacks this turn */
        if (!state._attacksThisTurn) state._attacksThisTurn = {};
        state._attacksThisTurn[attackerCode] = (state._attacksThisTurn[attackerCode] || 0) + 1;

        /* Snapshot armies BEFORE combat for loss display */
        const atkArmyBefore = { ...atk.army };
        const defArmyBefore = { ...def.army };

        const atkPow = calcMilitary(attackerCode, 'atk');
        const defPow = calcMilitary(defender, 'def');

        /* ── War fatigue: penalty for repeated attacks in the same turn ── */
        const fatigueMult = 1 - attackCost.fatigue;   // e.g. 0.88 for 3rd attack

        /* Terrain bonus +20% defender */
        let defTotal = defPow * 1.2;

        /* ── Homeland defense bonus ──
         * Defending your own homeland is MUCH harder to crack.
         * Scales with nation power rating:
         *   power ≥80 (superpower)  → +100% defense (×2.0)
         *   power ≥60 (major power) → +70% defense  (×1.7)
         *   power ≥40 (regional)    → +45% defense  (×1.45)
         *   power ≥20 (minor+)      → +20% defense  (×1.2)
         * This makes it nearly impossible to one-shot a superpower.
         */
        const defHomelandCode = def.homeland || defender;
        const isDefendingHomeland = (defenderTerritoryCode === defHomelandCode);
        if (isDefendingHomeland) {
            const defPower = def.power || 5;
            const homelandBonus = defPower >= 80 ? 2.00
                                : defPower >= 60 ? 1.70
                                : defPower >= 40 ? 1.45
                                : defPower >= 20 ? 1.20
                                : 1.0;
            defTotal *= homelandBonus;
        }

        /* Local garrison bonus: heavy garrison on the specific territory gives extra defense */
        const localGarrison = getGarrison(defenderTerritoryCode);
        if (localGarrison) {
            const garrisonMult = localGarrison.strength === 'heavy' ? 1.25
                               : localGarrison.strength === 'medium' ? 1.12
                               : localGarrison.strength === 'light' ? 1.05
                               : 0.90; /* No garrison: defender is 10% weaker */
            defTotal *= garrisonMult;
        }

        /* Random factor ±30%, reduced by fatigue */
        const rng = 0.7 + Math.random() * 0.6;
        const atkTotal = atkPow * rng * fatigueMult;

        const success = atkTotal > defTotal;

        /* ═══ CASUALTIES ═══
         * Both sides always suffer losses. The loser loses much more.
         * The combat ratio determines intensity: a close fight = heavy losses on both sides.
         * A dominant victory = fewer attacker losses, more defender losses.
         */
        const ratio = defTotal > 0 ? atkTotal / defTotal : 10;
        /* Winner loses 15-30%, loser loses 40-70%. Close fights hurt both more. */
        const closeness = 1 - Math.min(1, Math.abs(ratio - 1)); // 0=dominant, 1=very close
        const atkLossRate = success
            ? (0.15 + closeness * 0.15 + Math.random() * 0.10)  // win: 15-40%
            : (0.40 + closeness * 0.15 + Math.random() * 0.15); // lose: 40-70%
        const defLossRate = success
            ? (0.40 + closeness * 0.15 + Math.random() * 0.15)  // lose: 40-70%
            : (0.15 + closeness * 0.15 + Math.random() * 0.10); // win: 15-40%

        const atkCasualties = applyLosses(attackerCode, atkLossRate);
        const defCasualties = applyLosses(defender, defLossRate);

        /* ═══ CONQUEST & RESOURCE SEIZURE ═══ */
        let conquered = false;
        let homelandSiege = null;
        let loot = {};           // {resourceKey: amount} — seized resources
        const capturedUnits = {};  // always empty — enemy equipment destroyed in war

        if (success) {
            /* How many territories does the defender own (BEFORE this conquest)? */
            const defTerritories = Object.entries(state.territories)
                .filter(([, owner]) => owner === defender)
                .map(([tCode]) => tCode);
            const defTerrCount = defTerritories.length;

            /* Check if this is an attack on the defender's homeland */
            const defHomeland = def.homeland || defender;
            const isHomelandAttack = (defenderTerritoryCode === defHomeland);
            const hasColonies = defTerritories.filter(t => t !== defenderTerritoryCode).length > 0;

            if (isHomelandAttack && hasColonies) {
                /* ════ HOMELAND SIEGE ════ */
                _setTerritoryOwner(defenderTerritoryCode, attackerCode);
                delete state.unrest[defenderTerritoryCode];
                conquered = true;

                homelandSiege = handleHomelandSiege(defender, attackerCode);

                if (homelandSiege.survived) {
                    /* Reduced loot — only the homeland's share */
                    const share = 1 / Math.max(1, defTerrCount);
                    const lootMult = 0.7 + Math.random() * 0.2; // 70-90% of share
                    Object.keys(def.res).forEach(r => {
                        const amt = Math.floor(def.res[r] * share * lootMult);
                        if (amt > 0) { loot[r] = (loot[r]||0) + amt; atk.res[r] = (atk.res[r]||0) + amt; def.res[r] -= amt; }
                    });
                } else {
                    /* Total collapse — seize ALL resources, destroy remaining army */
                    Object.keys(def.res).forEach(r => {
                        const amt = def.res[r];
                        if (amt > 0) { loot[r] = (loot[r]||0) + amt; atk.res[r] = (atk.res[r]||0) + amt; def.res[r] = 0; }
                    });
                    /* Enemy army destroyed in battle — no capture */
                    Object.keys(def.army).forEach(utype => { def.army[utype] = 0; });
                }
            } else {
                /* ════ NORMAL CONQUEST ════
                 * Territory's proportional share of the nation's resources is seized.
                 * If the defender only has 1 territory left → we take EVERYTHING.
                 */
                _setTerritoryOwner(defenderTerritoryCode, attackerCode);
                delete state.unrest[defenderTerritoryCode];
                conquered = true;

                const share = 1 / Math.max(1, defTerrCount); // e.g. 1/3 if they had 3 territories
                const lootMult = 0.8 + Math.random() * 0.2;  // 80-100% of the share

                /* Seize proportional resources */
                Object.keys(def.res).forEach(r => {
                    const amt = Math.floor(def.res[r] * share * lootMult);
                    if (amt > 0) {
                        loot[r] = (loot[r] || 0) + amt;
                        atk.res[r] = (atk.res[r] || 0) + amt;
                        def.res[r] -= amt;
                    }
                });

                /* Also add the territory's base production as a one-time bonus (war spoils) */
                const tBase = getNation(defenderTerritoryCode);
                const tProd = tBase?.prod || {};
                Object.entries(tProd).forEach(([r, v]) => {
                    if (v > 0) {
                        const bonus = Math.round(v * (2 + Math.random()));  // 2-3 turns worth
                        loot[r] = (loot[r] || 0) + bonus;
                        atk.res[r] = (atk.res[r] || 0) + bonus;
                    }
                });

                /* Enemy forces defending the territory are destroyed in battle */
                const destroyRate = 0.05 + Math.random() * 0.10;  // 5-15% additional losses
                Object.keys(def.army).forEach(utype => {
                    const lost = Math.floor(def.army[utype] * destroyRate);
                    if (lost > 0) def.army[utype] -= lost;
                });

                /* Log the loot */
                const lootParts = [];
                Object.entries(loot).forEach(([r, v]) => {
                    if (v > 0) lootParts.push(`${RESOURCES[r]?.icon||r}${v}`);
                });
                if (lootParts.length) {
                    emit('battle', `🏴 ${atk.flag} ${atk.name} ${_t('ge_loots')} ${def.flag} ${def.name}: 📦 ${lootParts.join(' ')}`);
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
            launchFrom,
            attackMethod,
            atkPowRaw: Math.round(atkPow),
            defPowRaw: Math.round(defPow),
            atkPow: Math.round(atkTotal),
            defPow: Math.round(defTotal),
            atkArmyBefore,
            defArmyBefore,
            atkCasualties,       // {infantry:5, tank:2,...}
            defCasualties,       // {infantry:8, tank:3,...}
            conquered,
            loot,                // {money:120, oil:30,...}
            capturedUnits,       // {infantry:3,...}
            homelandSiege,
            attackCost,          // {money, infantry, fatigue, attackNum}
            fatiguePct: Math.round(attackCost.fatigue * 100),
            /* Combat modifier details for UI transparency */
            modifiers: {
                rngPct: Math.round(rng * 100),        // 70-130
                fatiguePct: Math.round(attackCost.fatigue * 100),
                terrainMult: 1.2,                     // always ×1.2
                isHomeland: isDefendingHomeland,
                homelandMult: isDefendingHomeland ? (def.power >= 80 ? 2.0 : def.power >= 60 ? 1.7 : def.power >= 40 ? 1.45 : def.power >= 20 ? 1.2 : 1.0) : 1.0,
                garrisonStr: localGarrison?.strength || 'none',
                garrisonMult: localGarrison ? (localGarrison.strength === 'heavy' ? 1.25 : localGarrison.strength === 'medium' ? 1.12 : localGarrison.strength === 'light' ? 1.05 : 0.90) : 1.0
            }
        };

        const icon = success ? '✅' : '❌';
        const atkDeadTotal = Object.values(atkCasualties).reduce((s,v)=>s+v, 0);
        const defDeadTotal = Object.values(defCasualties).reduce((s,v)=>s+v, 0);
        const costTag = (attackCost.money > 0 || attackCost.infantry > 0)
            ? ` [${attackCost.attackNum}° att. 💰${attackCost.money} 🪖${attackCost.infantry}]` : '';
        /* Show territory flag+name being attacked, not the owner nation */
        const terrNation = getNation(defenderTerritoryCode);
        const terrFlag = terrNation?.flag || def.flag;
        const terrName = terrNation?.name || defenderTerritoryCode.toUpperCase();
        const outcomeColor = success ? '#4caf50' : '#ff1744';
        const outcomeLabel = success ? _t('ge_victory') : _t('ge_defeat');

        /* Show detailed stats only if player is involved; hide AI-vs-AI intel */
        const playerCode = state.player;
        const playerInvolved = (attackerCode === playerCode || defender === playerCode);

        let battleMsg;
        if (playerInvolved) {
            battleMsg = `${icon} ${atk.flag} ${atk.name} ${_t('ge_attacks')} ${terrFlag} ${terrName} — ` +
                `⚔️${result.atkPow} vs 🛡️${result.defPow} → ` +
                `<span style="color:${outcomeColor};font-weight:700">${outcomeLabel}</span> ` +
                `(☠️ ${atkDeadTotal} vs ${defDeadTotal})${costTag}`;
        } else {
            battleMsg = `${icon} ${atk.flag} ${atk.name} ${_t('ge_attacks')} ${terrFlag} ${terrName} → ` +
                `<span style="color:${outcomeColor};font-weight:700">${outcomeLabel}</span> ` +
                `(☠️ ${atkDeadTotal} vs ${defDeadTotal})`;
        }
        emit('battle', battleMsg);

        /* Check elimination */
        checkElimination(defender);
        checkElimination(attackerCode);

        return result;
    }

    /**
     * Apply combat losses to a nation's army.
     * Returns a detailed casualties object: { unitType: lostCount, ... }
     *
     * Only a fraction of the army is "engaged" in any single battle.
     * Larger empires commit fewer troops per battle.
     *
     * @param {string} nationCode
     * @param {number} rate - base loss intensity (0-1)
     * @param {number} [engagedFraction] - override engagement ratio
     * @returns {Object} casualties per unit type
     */
    function applyLosses(nationCode, rate, engagedFraction) {
        const n = state.nations[nationCode];
        const casualties = {};
        if (!n) return casualties;

        /* Engagement: larger empires commit fewer troops per battle.
         * ALSO: powerful nations (superpowers) have a LOWER engagement ceiling
         * even with only 1 territory — their military is too large and organized
         * to be fully destroyed in a single battle.
         *   power ≥80 → max 25% engaged (superpowers)
         *   power ≥60 → max 35% engaged (major powers)
         *   power ≥40 → max 45% engaged (regional powers)
         *   others   → max 60% engaged (default)
         */
        const terrCount = getTerritoryCount(nationCode);
        const nationPower = n.power || 5;
        const engageCeiling = nationPower >= 80 ? 0.25
                            : nationPower >= 60 ? 0.35
                            : nationPower >= 40 ? 0.45
                            : 0.60;
        const engaged = engagedFraction || Math.min(engageCeiling, Math.max(0.08, 1.0 / Math.max(1, terrCount)));

        const effectiveRate = rate * engaged;

        Object.keys(n.army).forEach(utype => {
            if (n.army[utype] <= 0) { casualties[utype] = 0; return; }
            const lost = Math.max(0, Math.round(n.army[utype] * effectiveRate));
            /* Always keep at least 1 unit of each type if nation had >3 */
            const floor = n.army[utype] > 3 ? 1 : 0;
            const actualLost = Math.min(lost, n.army[utype] - floor);
            n.army[utype] -= actualLost;
            casualties[utype] = actualLost;
        });

        return casualties;
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
        _setTerritoryOwner(defenderTerritoryCode, attackerCode);
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
            `☢️ ${atk.flag} ${atk.name} ${_t('ge_nuke_launch')} ${defenderTerritoryCode.toUpperCase()}! ` +
            `${_t('ge_global_stability')}: ${state.globalStability}%`);

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
        /* Auto-lift mutual sanctions on peace */
        const nA = state.nations[codeA], nB = state.nations[codeB];
        if (nA) nA.sanctions = nA.sanctions.filter(s => s !== codeB);
        if (nB) nB.sanctions = nB.sanctions.filter(s => s !== codeA);
        emit('diplomacy', `🕊️ ${state.nations[codeA]?.flag || ''} ${codeA.toUpperCase()} ${_t('ge_and')} ${state.nations[codeB]?.flag || ''} ${codeB.toUpperCase()} ${_t('ge_sign_peace')}`);
    }

    /**
     * PEACE NEGOTIATION ALGORITHM
     * Calculates what the enemy demands to accept peace.
     *
     * Factors (board-game design):
     *  1. Power balance — who has the stronger military right now?
     *  2. War outcome — who conquered more territories during this war?
     *  3. War duration — longer wars → war weariness → lower demands
     *  4. Aggressor penalty — the one who declared war pays extra
     *  5. Relation depth — deep hatred → higher demands
     *  6. Resource scarcity — the enemy demands resources they lack most
     *  7. Territory count — a large empire demands more than a small one
     *
     * Returns { demands: [{resource, amount, icon, name}], totalValue,
     *           mood, moodLabel, chanceAccept, warInfo }
     *   mood: 'generous' | 'fair' | 'harsh' | 'humiliating'
     */
    function calcPeaceDemands(requesterCode, enemyCode) {
        const req = state.nations[requesterCode];
        const enemy = state.nations[enemyCode];
        if (!req || !enemy) return null;

        /* ── War record ── */
        const war = state.wars.find(w =>
            (w.attacker === requesterCode && w.defender === enemyCode) ||
            (w.attacker === enemyCode && w.defender === requesterCode));
        const warTurns = war ? Math.max(1, state.turn - war.turn) : 1;
        const requesterIsAggressor = war ? war.attacker === requesterCode : false;

        /* ── Military power ratio (enemy vs requester) ── */
        const reqAtk = calcMilitary(requesterCode, 'atk');
        const reqDef = calcMilitary(requesterCode, 'def');
        const eneAtk = calcMilitary(enemyCode, 'atk');
        const eneDef = calcMilitary(enemyCode, 'def');
        const reqPow = reqAtk + reqDef;
        const enePow = eneAtk + eneDef;
        const powerRatio = enePow / Math.max(1, reqPow);  // >1 = enemy stronger

        /* ── Territory balance: who controls more land? ── */
        const reqTerr = getTerritoryCount(requesterCode);
        const eneTerr = getTerritoryCount(enemyCode);
        const terrRatio = eneTerr / Math.max(1, reqTerr);  // >1 = enemy has more

        /* ── War weariness: reduces demands over time ── */
        const weariness = Math.min(0.5, warTurns * 0.06);  // up to 50% reduction after ~8 turns

        /* ── Base demand multiplier ── */
        // Power advantage + territory advantage, reduced by weariness
        let baseMul = (0.4 * powerRatio + 0.3 * terrRatio + 0.3) * (1 - weariness);

        // Aggressor penalty: if requester started the war, enemy demands more
        if (requesterIsAggressor) baseMul *= 1.35;

        // Relation: deeper hatred → higher demands (-100 → +40% demands)
        const rel = getRelation(enemyCode, requesterCode);
        const hatredBonus = Math.max(0, (-rel - 20) * 0.004);  // 0 to ~0.32
        baseMul *= (1 + hatredBonus);

        // Enemy empire size scale: larger empires expect more
        const empireScale = Math.min(1.5, 0.7 + eneTerr * 0.04);
        baseMul *= empireScale;

        // Clamp multiplier: minimum 0.3, max 3.0
        baseMul = Math.max(0.3, Math.min(3.0, baseMul));

        /* ── Determine mood from multiplier ── */
        let mood, moodLabel;
        if (baseMul <= 0.5)      { mood = 'generous';    moodLabel = '🕊️ Generoso'; }
        else if (baseMul <= 1.0) { mood = 'fair';        moodLabel = '⚖️ Equo'; }
        else if (baseMul <= 1.8) { mood = 'harsh';       moodLabel = '💢 Duro'; }
        else                     { mood = 'humiliating'; moodLabel = '🔥 Umiliante'; }

        /* ── Pick which resources to demand ── */
        // Enemy prefers resources they are LOW on (scarcity-driven strategy)
        const resKeys = ['money','oil','gas','rareEarth','steel','food','uranium'];
        const resScarcity = {};  // lower = enemy wants it more
        resKeys.forEach(k => {
            const enemyHas = enemy.res[k] || 0;
            const reqHas   = req.res[k] || 0;
            // Scarcity score: how much the enemy lacks it vs what requester has
            resScarcity[k] = enemyHas / Math.max(1, reqHas);
        });

        // Sort by scarcity (lowest first = enemy wants most)
        const sortedRes = [...resKeys].sort((a, b) => resScarcity[a] - resScarcity[b]);

        /* ── Calculate demand amounts ── */
        // Base demand "budget" scales with game stage and multiplier
        const baseBudget = (30 + state.turn * 5) * baseMul;
        const demands = [];

        // Always demand money
        const moneyDemand = Math.round(Math.max(10, baseBudget * 0.5));
        if (moneyDemand > 0 && (req.res.money || 0) > 0) {
            demands.push({
                resource: 'money',
                amount: Math.min(moneyDemand, Math.round((req.res.money || 0) * 0.6)),
                icon: RESOURCES.money.icon,
                name: RESOURCES.money.name
            });
        }

        // Pick 1-3 additional scarce resources
        const extraCount = mood === 'generous' ? 1 : mood === 'fair' ? 2 : 3;
        let picked = 0;
        for (const rk of sortedRes) {
            if (rk === 'money') continue;
            if (picked >= extraCount) break;
            const reqHas = req.res[rk] || 0;
            if (reqHas <= 0) continue;

            // Demand scales with budget and what requester has
            const weight = mood === 'humiliating' ? 0.4 : mood === 'harsh' ? 0.3 : 0.2;
            let amt = Math.round(baseBudget * weight * 0.15);
            amt = Math.max(1, Math.min(amt, Math.round(reqHas * 0.5)));

            demands.push({
                resource: rk,
                amount: amt,
                icon: RESOURCES[rk]?.icon || '❓',
                name: RESOURCES[rk]?.name || rk
            });
            picked++;
        }

        // Ensure at least money is demanded if nothing else
        if (demands.length === 0) {
            demands.push({ resource: 'money', amount: 10, icon: '💰', name: 'Fondi' });
        }

        /* ── Chance enemy accepts even if we can't pay fully ── */
        // Higher when enemy is weak, war is long, or requester is strong
        const chanceAccept = Math.min(0.95, Math.max(0.1,
            0.5 - (baseMul - 1) * 0.2 + weariness * 0.3
        ));

        /* ── Total "value" for display ── */
        const totalValue = demands.reduce((sum, d) => sum + d.amount * (d.resource === 'money' ? 1 : 5), 0);

        return {
            demands,
            totalValue,
            mood,
            moodLabel,
            chanceAccept,
            warInfo: {
                turns: warTurns,
                requesterIsAggressor,
                powerRatio: Math.round(powerRatio * 100) / 100,
                weariness: Math.round(weariness * 100)
            }
        };
    }

    /**
     * Apply peace demands: deduct resources from payer, give to receiver.
     * Returns true if the payer has enough.
     */
    function applyPeaceDemands(payerCode, receiverCode, demands) {
        const payer = state.nations[payerCode];
        const receiver = state.nations[receiverCode];
        if (!payer || !receiver) return false;

        // Check if payer can afford all demands
        for (const d of demands) {
            if ((payer.res[d.resource] || 0) < d.amount) return false;
        }

        // Transfer resources
        for (const d of demands) {
            payer.res[d.resource] -= d.amount;
            receiver.res[d.resource] = (receiver.res[d.resource] || 0) + d.amount;
        }
        return true;
    }

    function addSanction(fromCode, toCode, silent) {
        const n = state.nations[toCode];
        if (!n) return;
        if (!n.sanctions.includes(fromCode)) {
            n.sanctions.push(fromCode);
            adjustRelation(toCode, fromCode, -15);
            if (!silent) emit('diplomacy', `🚫 ${state.nations[fromCode]?.flag} ${fromCode.toUpperCase()} ${_t('ge_sanctions')} ${n.flag} ${toCode.toUpperCase()}`);
        }
    }

    /**
     * Remove sanctions from nations that are dead or conquered by the sanctioned nation.
     * A conquered nation cannot maintain sanctions against its conqueror.
     */
    function purgeSanctions(nationCode) {
        const n = state.nations[nationCode];
        if (!n) return;
        const before = n.sanctions.length;
        n.sanctions = n.sanctions.filter(sc => {
            const sn = state.nations[sc];
            /* Remove if sanctioner is dead */
            if (!sn || !sn.alive) return false;
            /* Remove if sanctioner's homeland is now owned by the sanctioned nation */
            if (state.territories[sc] === nationCode) return false;
            return true;
        });
        const removed = before - n.sanctions.length;
        if (removed > 0) {
            emit('game', `📜 ${n.flag} ${n.name}: ${removed} ${_t('ge_sanctions_revoked')}`);
        }
    }

    function makeAlliance(codeA, codeB) {
        const exists = state.alliances.some(a =>
            (a.a === codeA && a.b === codeB) || (a.a === codeB && a.b === codeA));
        if (!exists) {
            state.alliances.push({ a: codeA, b: codeB, turn: state.turn });
            adjustRelation(codeA, codeB, 30);
            adjustRelation(codeB, codeA, 30);
            /* Auto-lift mutual sanctions: allies don't sanction each other */
            const nA = state.nations[codeA], nB = state.nations[codeB];
            if (nA) nA.sanctions = nA.sanctions.filter(s => s !== codeB);
            if (nB) nB.sanctions = nB.sanctions.filter(s => s !== codeA);
            emit('diplomacy', `🤝 ${state.nations[codeA]?.flag} ${codeA.toUpperCase()} ${_t('ge_and')} ${state.nations[codeB]?.flag} ${codeB.toUpperCase()} ${_t('ge_form_alliance')}`);
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
        emit('diplomacy', `💔 ${_t('ge_alliance_broken')} ${codeA.toUpperCase()} ${_t('ge_and')} ${codeB.toUpperCase()}`);
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
            _setTerritoryOwner(colony.code, attackerCode);
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
                `🏳️ ${def.flag} ${def.name} ${_t('ge_cedes')} ${getNation(colony.code)?.name || colony.code.toUpperCase()} ${_t('ge_to')} ${atk.flag} ${atk.name}`);
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
                    `🛡️ ${def.flag} ${def.name} ${_t('ge_loses_homeland_survives')} ` +
                    `${_t('ge_retreats_to')} ${getNation(retreatTo)?.name || retreatTo.toUpperCase()} ` +
                    `(${released.length} ${_t('ge_colonies_ceded')}, +${troopsWithdrawn} ${_t('ge_troops_withdrawn')})`);
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
                _setTerritoryOwner(tCode, attackerCode);
                delete state.unrest[tCode];  // fresh start
                if (!released.includes(tCode)) released.push(tCode);
            });

            emit('battle',
                `💀 ${def.flag} ${def.name}: ${_t('ge_total_collapse')} ` +
                `${atk.flag} ${atk.name} ${_t('ge_conquers_all')} (${released.length} ${_t('ge_territories')})`);
            return { survived: false, releasedColonies: released, retreatedTo: null };
        }
    }

    function checkElimination(nationCode) {
        const n = state.nations[nationCode];
        if (!n || !n.alive) return;
        const owned = getTerritoryCount(nationCode);
        if (owned === 0) {
            n.alive = false;
            /* Event logged by UI with translated text (evt_ai_eliminated) */
        }
    }

    function checkVictory() {
        if (state.gameOver) return state.victor;
        const totalTerr = SVG_IDS.length;
        const rankedAlive = Object.keys(state.nations)
            .filter(code => state.nations[code]?.alive)
            .map(code => ({ code, owned: getTerritoryCount(code) }))
            .sort((a, b) => b.owned - a.owned);
        const leader = rankedAlive[0] || null;
        const second = rankedAlive[1] || { code: null, owned: 0 };

        for (const code of Object.keys(state.nations)) {
            const n = state.nations[code];
            if (!n.alive) continue;
            const owned = getTerritoryCount(code);
            const pct = owned / totalTerr;

            /* Military victory: 85% territories */
            if (pct >= 0.85) {
                state.gameOver = true;
                state.victor = code;
                state.victoryType = 'military';
                emit('game', `🏆 ${n.flag} ${n.name} ${_t('ge_military_victory')} (${Math.round(pct*100)}% ${_t('ge_territories')})`);
                return code;
            }

            /* Hegemony victory: late-game dominant lead over #2 */
            const isLeader = leader && leader.code === code;
            const leadGap = isLeader ? (leader.owned - second.owned) : 0;
            const leadRatio = isLeader ? (leader.owned / Math.max(1, second.owned)) : 0;
            if (
                isLeader &&
                state.turn >= 60 &&
                pct >= 0.35 &&
                leadGap >= 20 &&
                leadRatio >= 2.5
            ) {
                state.gameOver = true;
                state.victor = code;
                state.victoryType = 'hegemony';
                emit('game',
                    `🏆 ${n.flag} ${n.name} ${_t('ge_hegemony_victory')} ` +
                    `(${leader.owned}-${second.owned}, ${Math.round(pct * 100)}% ${_t('ge_territories')})`);
                return code;
            }

            /* Economic victory: 50K funds + 30% territories */
            if (n.res.money >= 50000 && pct >= 0.30) {
                state.gameOver = true;
                state.victor = code;
                state.victoryType = 'economic';
                emit('game', `🏆 ${n.flag} ${n.name} ${_t('ge_economic_victory')} (💰${n.res.money}, ${Math.round(pct*100)}% ${_t('ge_territories')})`);
                return code;
            }

            /* Strategic victory: all strategic assets */
            const allAssets = Object.values(STRATEGIC_ASSETS).every(asset =>
                asset.holders.some(h => state.territories[h] === code));
            if (allAssets) {
                state.gameOver = true;
                state.victor = code;
                state.victoryType = 'strategic';
                emit('game', `🏆 ${n.flag} ${n.name} ${_t('ge_strategic_victory')}`);
                return code;
            }
        }
        return null;
    }

    /* ════════════════ TURN MANAGEMENT ════════════════ */
    function endPlayerTurn() {
        state.phase = 'ai';
    }

    function startNewTurn(skipPlayerCollect) {
        state.turn++;
        state.phase = 'player';
        /* Reset per-turn attack counters */
        state._attacksThisTurn = {};
        /* Collect resources for player (skip if AI already handled it in autoplay) */
        if (!skipPlayerCollect) collectResources(state.player);

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

        emit('game', `📅 ${_t('hud_turn')} ${state.turn}`);
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

    /* Get nation territory count — O(1) via cache */
    function getTerritoryCount(code) {
        return _terrCountCache[code] || 0;
    }

    /** Helper: transfer territory ownership and update the count cache.
     *  MUST be used for ALL ownership changes so cache stays consistent. */
    function _setTerritoryOwner(tCode, newOwner) {
        const prev = state.territories[tCode];
        if (prev === newOwner) return;
        if (prev) _terrCountCache[prev] = Math.max(0, (_terrCountCache[prev] || 0) - 1);
        state.territories[tCode] = newOwner;
        _terrCountCache[newOwner] = (_terrCountCache[newOwner] || 0) + 1;
    }

    /* Get neighbors who own adjacent territories */
    function getNeighborOwners(code) {
        const n = state.nations[code];
        if (!n) return [];
        const owners = new Set();

        /* Gather ALL territories this nation currently owns (direct loop) */
        const myTerritories = [];
        for (const tCode of SVG_IDS) {
            if (state.territories[tCode] === code) myTerritories.push(tCode);
        }

        /* For each owned territory, use global ADJACENCY map */
        for (let i = 0; i < myTerritories.length; i++) {
            const neighbors = getNeighborsOf(myTerritories[i]);
            for (let j = 0; j < neighbors.length; j++) {
                const owner = state.territories[neighbors[j]];
                if (owner && owner !== code) owners.add(owner);
            }
        }

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
        /* Revolt cooldown: territory recently reconquered gets grace period */
        const cooldown = state.revoltCooldown?.[tCode] || 0;
        if (cooldown > 0) return 0;
        let gain = 2;                                           // base +2 per turn (was 3)
        if (originalNation.alive) gain += 2;                    // original nation alive → +2 (was 4)
        const occupierWars = state.wars.filter(w => w.attacker === owner || w.defender === owner).length;
        gain += Math.min(3, occupierWars);                      // +1 per war, max +3 (was 4)
        /* Garrison reduces unrest accumulation */
        const garrison = getGarrison(tCode);
        if (garrison.strength === 'heavy')       gain -= 6;
        else if (garrison.strength === 'medium') gain -= 4;
        else if (garrison.strength === 'light')  gain -= 2;
        if (garrison.total === 0)                gain += 3;     // no garrison → unrest (was +5)
        return Math.max(0, gain);
    }

    /** Get unrest level for a territory (0-100) */
    function getUnrest(tCode) {
        return state.unrest[tCode] || 0;
    }

    /** Get ALL conquered territories (colonies) for a nation, sorted by unrest desc */
    function getColonyList(nationCode) {
        const list = [];
        Object.entries(state.territories).forEach(([tCode, owner]) => {
            if (owner !== nationCode) return;
            if (tCode === owner) return;        // homeland
            const orig = state.nations[tCode];
            const u = state.unrest[tCode] || 0;
            list.push({
                territory: tCode,
                name: orig?.name || tCode.toUpperCase(),
                flag: orig?.flag || '',
                unrest: u,
                gain: calcUnrestGain(tCode, owner)
            });
        });
        list.sort((a, b) => b.unrest - a.unrest);
        return list;
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
        emit('game', `🛡️ ${_t('ge_revolt_suppressed')} ${state.nations[tCode]?.flag||''} ${state.nations[tCode]?.name||tCode}! (-💰15, -🪖2)`);
        return { success: true };
    }

    /* ════════════════ RANDOM EVENTS ════════════════ */

    /**
     * Mid-turn unrest check — called after EVERY conquest.
     * When a nation conquers a territory, its army spreads thinner.
     * Colonies with weak garrisons get an immediate unrest spike.
     * If unrest reaches 100 → instant revolt during the player's turn.
     *
     * This prevents the "blitz exploit": conquering many territories in
     * one turn and only facing unrest consequences at the end.
     *
     * @param {string} conquerorCode — the nation that just conquered
     * @returns {Array} revolt events [{territory, from, to}]
     */
    function checkMidTurnUnrest(conquerorCode) {
        if (!state) return [];
        const n = state.nations[conquerorCode];
        if (!n || !n.alive) return [];

        const revoltEvents = [];

        /* Recalculate garrisons (live — reflects new territory count) */
        const garrisons = getGarrisons(conquerorCode);

        Object.entries(state.territories).forEach(([tCode, owner]) => {
            if (owner !== conquerorCode) return;
            if (tCode === owner) return;       // homeland — no unrest
            if (tCode === conquerorCode) return; // own capital

            const g = garrisons[tCode];
            if (!g) return;

            /* Immediate unrest spike based on garrison weakness */
            let spike = 0;
            if (g.strength === 'none')       spike = 12;  // unguarded → big spike
            else if (g.strength === 'light') spike = 6;   // thin garrison → moderate spike
            else if (g.strength === 'medium') spike = 2;  // adequate → minor spike
            /* heavy garrison → no spike */

            if (spike <= 0) return;

            /* Apply spike (original nation alive amplifies it) */
            const originalNation = state.nations[tCode];
            if (originalNation && originalNation.alive) spike = Math.round(spike * 1.4);

            state.unrest[tCode] = Math.min(100, (state.unrest[tCode] || 0) + spike);

            /* Instant revolt if unrest hits 100 */
            if (state.unrest[tCode] >= 100) {
                _setTerritoryOwner(tCode, tCode);
                delete state.unrest[tCode];
                if (originalNation && !originalNation.alive) {
                    originalNation.alive = true;
                    originalNation.army.infantry = Math.max(originalNation.army.infantry || 0, 3);
                    originalNation.res.money = Math.max(originalNation.res.money || 0, 20);
                }
                revoltEvents.push({ territory: tCode, from: conquerorCode, to: tCode });
                emit('battle', `🔥 ${_t('ge_instant_revolt')} ${originalNation?.flag||''} ${originalNation?.name||tCode}! ${_t('ge_garrison_weak')} — ${_t('ge_rebels_against')} ${n.flag} ${n.name}!`);
                adjustRelation(tCode, conquerorCode, -30);
                if (!state.revoltCooldown) state.revoltCooldown = {};
                state.revoltCooldown[tCode] = 5;
            }
        });

        return revoltEvents;
    }

    function rollRandomEvents() {
        /* ── Revolt cooldown tick-down ── */
        if (state.revoltCooldown) {
            Object.keys(state.revoltCooldown).forEach(tCode => {
                state.revoltCooldown[tCode]--;
                if (state.revoltCooldown[tCode] <= 0) delete state.revoltCooldown[tCode];
            });
        }

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
                _setTerritoryOwner(tCode, tCode);
                delete state.unrest[tCode];
                /* If original nation was dead, revive it */
                if (!originalNation.alive) {
                    originalNation.alive = true;
                    originalNation.army.infantry = Math.max(originalNation.army.infantry || 0, 3);
                    originalNation.res.money = Math.max(originalNation.res.money || 0, 20);
                }
                revoltEvents.push({ territory: tCode, from: owner, to: tCode });
                emit('battle', `🔥 ${_t('ge_revolt_in')} ${originalNation.flag} ${originalNation.name}! ${_t('ge_rebels_against')} ${state.nations[owner]?.flag||''} ${state.nations[owner]?.name||owner}`);
                adjustRelation(tCode, owner, -30);
                /* Cooldown: if this territory is reconquered, give 5 turns grace */
                if (!state.revoltCooldown) state.revoltCooldown = {};
                state.revoltCooldown[tCode] = 5;
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
            emit('game', `🌍 ${_t('ge_earthquake')} ${n.flag} ${n.name}!`);
        } else if (roll < 0.08) {
            /* Oil crisis */
            Object.values(state.nations).forEach(n => {
                if (n.alive) n.res.oil = Math.max(0, Math.round(n.res.oil * 0.85));
            });
            emit('game', `🛢️ ${_t('ge_oil_crisis')}`);
        } else if (roll < 0.10) {
            /* Tech breakthrough for random nation */
            const alive = Object.keys(state.nations).filter(c => state.nations[c].alive);
            const lucky = alive[Math.floor(Math.random() * alive.length)];
            const n = state.nations[lucky];
            n.res.money += 50;
            emit('game', `🔬 ${_t('ge_tech_breakthrough')} ${n.flag} ${n.name}! +50 💰`);
        } else if (roll < 0.12) {
            /* Pandemic scare */
            Object.values(state.nations).forEach(n => {
                if (n.alive) n.res.food = Math.max(0, n.res.food - 5);
            });
            emit('game', `🦠 ${_t('ge_pandemic')}`);
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
     *
     * CACHE: Results are cached per nation+turn+armyHash. The cache
     * is invalidated when the turn changes or army composition changes.
     */
    const _garrisonCache = {};  // nationCode → { key, data }

    function getGarrisons(nationCode) {
        if (!state) return {};
        const n = state.nations[nationCode];
        if (!n || !n.alive) return {};

        /* Build a lightweight cache key from turn + army hash + territory count */
        const totalUnits = Object.values(n.army).reduce((a, b) => a + b, 0);
        const terrCount  = getTerritoryCount(nationCode);
        const cacheKey = `${state.turn}|${terrCount}|${totalUnits}`;
        const cached = _garrisonCache[nationCode];
        if (cached && cached.key === cacheKey) return cached.data;

        const ownedTerr = Object.entries(state.territories)
            .filter(([, o]) => o === nationCode).map(([c]) => c);
        if (ownedTerr.length === 0) return {};

        if (totalUnits === 0) {
            const empty = {};
            ownedTerr.forEach(c => { empty[c] = { total: 0, dominant: null, icon: '', strength: 'none' }; });
            _garrisonCache[nationCode] = { key: cacheKey, data: empty };
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

        _garrisonCache[nationCode] = { key: cacheKey, data: garrisons };
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

        /* Purge stale sanctions for accurate display */
        purgeSanctions(nationCode);

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
        calcPeaceDemands,
        applyPeaceDemands,
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
        checkMidTurnUnrest,
        emit,
        getGarrisons,
        getGarrison,
        getUnrest,
        getUnrestList,
        getColonyList,
        suppressUnrest,
        getAttackCost,
        canAffordAttack,
        getAttacksThisTurn
    };
})();
