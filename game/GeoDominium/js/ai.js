/* ═══════════════════════════════════════════════════════
   GeoDominium — Autonomous AI System  (v3 — Strategic)
   ──────────────────────────────────────────────────────
   Design principles (game-design expert approach):
   1. GOAL-DRIVEN expansion — each nation pursues concrete
      strategic objectives, not random attacks.
   2. TERRITORY SCORING — every attackable territory is
      scored by: resource value, strategic-asset control,
      garrison weakness, border consolidation, cutting
      enemy in half, and homeland reconquest priority.
   3. RISK MANAGEMENT — AI checks unrest load and colony
      count before expanding; superpowers consolidate,
      minors are scrappy.
   4. COORDINATED WARS — allies try to dogpile the same
      enemy; enemy-of-my-enemy logic is stronger.
   5. ADAPTIVE BUILD — build orders respond to the
      immediate strategic goal (defense, sea projection,
      conquest, consolidation).
   6. SMART PEACE — AI only sues for peace when losing or
      overstretched, never when winning.
   ═══════════════════════════════════════════════════════ */

const AI = (() => {
    /* Keep track of AI actions this turn for UI visualization */
    let turnActions = [];

    /* ════════════════ MAIN: PROCESS ALL AI ════════════════ */
    async function processAllAI(onActionCallback, includePlayer) {
        turnActions = [];
        const state = GameEngine.getState();
        if (!state || state.gameOver) return turnActions;

        const aiNations = GameEngine.getAINations();

        /* In autoplay mode, the player is also controlled by the AI */
        if (includePlayer && state.player && state.nations[state.player]?.alive) {
            aiNations.push(state.player);
        }

        /* Shuffle to avoid order bias */
        shuffle(aiNations);

        for (const code of aiNations) {
            const n = state.nations[code];
            if (!n || !n.alive) continue;

            const actions = processNation(code);
            turnActions.push(...actions);

            /* Callback per-action for UI animation delays */
            if (onActionCallback) {
                for (const act of actions) {
                    onActionCallback(act);
                }
            }

            /* Mid-turn victory check: stop immediately if someone won */
            if (GameEngine.checkVictory()) break;
        }

        /* Random events at end of AI phase */
        const revoltResults = GameEngine.rollRandomEvents();
        if (revoltResults && revoltResults.length > 0) {
            revoltResults.forEach(r => {
                turnActions.push({ type: 'revolt', nation: r.to, target: r.territory, from: r.from });
            });
        }

        /* Check victory after all AI moves */
        GameEngine.checkVictory();

        return turnActions;
    }

    /* ════════════════ PROCESS SINGLE NATION ════════════════ */
    function processNation(code) {
        const actions = [];
        const state = GameEngine.getState();
        const n = state.nations[code];
        const profile = AI_PROFILES[n.profile] || AI_PROFILES.minor;

        /* Step 1: Collect resources */
        GameEngine.collectResources(code);

        /* Step 2: Evaluate strategic situation */
        const situation = evaluateSituation(code);

        /* Step 3: Economy — build units, adapted to current goal */
        const buildActions = doEconomy(code, situation, profile);
        actions.push(...buildActions);

        /* Step 4: Diplomacy — alliances, sanctions, peace */
        const diploActions = doDiplomacy(code, situation, profile);
        actions.push(...diploActions);

        /* Step 5: Military — goal-driven strategic attacks */
        const milActions = doMilitary(code, situation, profile);
        actions.push(...milActions);

        /* Step 5b: Mid-turn unrest — conquests thin garrisons */
        const hasConquest = milActions.some(a => a.type === 'attack' && a.result?.conquered);
        if (hasConquest) {
            const midRevolts = GameEngine.checkMidTurnUnrest(code);
            midRevolts.forEach(r => {
                actions.push({ type: 'revolt', nation: r.to, target: r.territory, from: r.from });
            });
        }

        /* Step 6: Research — goal-aware tech selection */
        const techActions = doResearch(code, situation, profile);
        actions.push(...techActions);

        /* Step 7: Suppress unrest in restless territories */
        const unrestActions = doSuppressUnrest(code);
        actions.push(...unrestActions);

        return actions;
    }

    /* ════════════════ EVALUATE SITUATION ════════════════ */
    function evaluateSituation(code) {
        const state = GameEngine.getState();
        const n = state.nations[code];

        const myTerrCount = GameEngine.getTerritoryCount(code);
        const myAtkPow    = GameEngine.calcMilitary(code, 'atk');
        const myDefPow    = GameEngine.calcMilitary(code, 'def');
        const myWealth    = n.res.money || 0;
        const totalUnits  = Object.values(n.army).reduce((a,b) => a+b, 0);

        const atWar = GameEngine.getWarsFor(code);
        const enemies = atWar.map(w => w.attacker === code ? w.defender : w.attacker);
        const allies  = state.alliances
            .filter(a => a.a === code || a.b === code)
            .map(a => a.a === code ? a.b : a.a);

        /* Count colonies and unrest burden */
        const homeland = n.homeland || code;
        let colonyCount = 0;
        let criticalUnrest = 0;
        if (GameEngine.getUnrestList) {
            const unrestList = GameEngine.getUnrestList(code);
            colonyCount = unrestList.length;
            criticalUnrest = unrestList.filter(t => t.unrest >= 60).length;
        }

        /* Overextended? Too many colonies with too few troops = danger */
        const overextended = colonyCount > 0 && (totalUnits / Math.max(1, colonyCount)) < 1.5;

        /* Find neighbors: land adjacency + sea/air/missile reachable nations */
        const neighborOwners = GameEngine.getNeighborOwners(code);
        const threats = [];
        const opportunities = [];

        const reachableOwners = new Set(neighborOwners);
        if (typeof canReachTerritory === 'function') {
            const atkArmy = n.army || {};
            const hasNavy = (atkArmy.navy || 0) > 0 || (atkArmy.submarine || 0) > 0;
            const hasAir  = (atkArmy.bomber || 0) > 0 || (atkArmy.drone || 0) > 0 || (atkArmy.fighter || 0) > 0;
            const hasMissiles = (atkArmy.cruiseMissile || 0) > 0 || (atkArmy.ballisticMissile || 0) > 0;
            const hasLongRange = hasNavy || hasAir || hasMissiles;

            /* Only scan global targets if nation has meaningful military.
               Prevents minor nations with 1 drone from attacking the whole world.
               Also: in the first 5 turns, restrict to land neighbors only —
               no intercontinental attacks at game start. */
            const minLongRangePower = 100;
            const earlyTurnCutoff = 5;
            const currentTurn = state.turn || 0;
            if (hasLongRange && myAtkPow > minLongRangePower && currentTurn > earlyTurnCutoff) {
                Object.keys(state.nations).forEach(nc => {
                    if (nc === code || reachableOwners.has(nc)) return;
                    const nn = state.nations[nc];
                    if (!nn || !nn.alive) return;
                    const enemyTerr = Object.entries(state.territories)
                        .filter(([, o]) => o === nc).map(([c]) => c);
                    const sample = enemyTerr.length <= 5 ? enemyTerr : enemyTerr.slice(0, 5);
                    for (const et of sample) {
                        const reach = canReachTerritory(code, et, atkArmy);
                        if (reach.reachable) { reachableOwners.add(nc); break; }
                    }
                });
            }
        }

        reachableOwners.forEach(nc => {
            const nn = state.nations[nc];
            if (!nn || !nn.alive || nc === code) return;
            const nPow = GameEngine.calcMilitary(nc, 'atk');
            const nDefPow = GameEngine.calcMilitary(nc, 'def');
            const rel = GameEngine.getRelation(code, nc);

            if (nPow > myDefPow * 1.2 && rel < 0) {
                threats.push({ code: nc, power: nPow, relation: rel });
            }

            const lateGameBonus = state.turn > 50 ? 0.2 : 0;
            const isAlly = GameEngine.isAlly(code, nc);
            if (!isAlly && myAtkPow > nDefPow * (1.0 + lateGameBonus)) {
                opportunities.push({ code: nc, power: nDefPow, relation: rel, terr: GameEngine.getTerritoryCount(nc) });
            }
        });

        /* Find dominant nation (potential coalition target) */
        let dominant = null;
        let maxTerr = 0;
        Object.keys(state.nations).forEach(c => {
            if (c === code || !state.nations[c].alive) return;
            const t = GameEngine.getTerritoryCount(c);
            if (t > maxTerr) { maxTerr = t; dominant = c; }
        });
        const dominantThreat = maxTerr > SVG_IDS.length * 0.25;

        /* Late-game restlessness */
        const restlessness = Math.min(1.0, Math.max(0, (state.turn - 50) / 150));

        /* Homeland check */
        const homelandOwner = state.territories[homeland];
        const homelandLost = homelandOwner && homelandOwner !== code;
        const homelandEnemy = homelandLost ? homelandOwner : null;

        /* ── Strategic goal: what should this nation pursue right now? ── */
        let goal = 'expand';  // default
        if (homelandLost) goal = 'reconquest';
        else if (overextended || criticalUnrest >= 3) goal = 'consolidate';
        else if (threats.length > enemies.length + allies.length) goal = 'defend';
        else if (enemies.length > 0) goal = 'warfight';
        else if (myTerrCount >= SVG_IDS.length * 0.3) goal = 'dominate';
        else goal = 'expand';

        /* ── Score all attackable territories (for smart target selection) ── */
        const scoredTargets = _scoreAllTargets(code, state, n, enemies, allies);

        return {
            myTerrCount, myAtkPow, myDefPow, myWealth, totalUnits,
            enemies, allies, threats, opportunities,
            dominant, dominantThreat, maxTerr,
            neighborOwners, reachableOwners: [...reachableOwners],
            atWar, restlessness,
            homelandLost, homelandEnemy, homeland,
            colonyCount, criticalUnrest, overextended,
            goal, scoredTargets
        };
    }

    /* ══════════════════════════════════════════════════════
       TERRITORY SCORING — the heart of smart AI
       Each reachable enemy territory gets a composite score:
       • resourceValue:      sum of production yields
       • strategicAsset:     huge bonus if territory holds a chokepoint
       • garrisonWeakness:   weaker garrison = easier pick
       • borderConsolidation: connects our territory cluster
       • cutEnemy:           isolates enemy territories
       • homelandPriority:   massive bonus for reconquering homeland
       • allyCoordination:   bonus if an ally borders the target too
       ══════════════════════════════════════════════════════ */
    /**
     * Sanity check: can this nation realistically fight that target?
     * Prevents Cyprus → Russia scenarios.
     */
    function _canRealisticallyFight(code, targetCode, state) {
        const n = state.nations[code];
        const t = state.nations[targetCode];
        if (!n || !t || !t.alive) return false;
        const myPow  = GameEngine.calcMilitary(code, 'atk');
        const tDef   = GameEngine.calcMilitary(targetCode, 'def');
        const myUnits = Object.values(n.army).reduce((a,b) => a+b, 0);
        const tUnits  = Object.values(t.army).reduce((a,b) => a+b, 0);
        /* Absolute floor: need a real army to start wars */
        const unitFloor = (state.turn || 0) > 50 ? 8 : 15;
        if (myUnits < unitFloor) return false;
        /* Coalition bonus: if target is already at war with others, be braver */
        const warsOnTarget = state.wars.filter(w => w.attacker === targetCode || w.defender === targetCode).length;
        const coalitionBravery = Math.min(0.25, warsOnTarget * 0.08); // up to 25% more brave
        /* Don't attack nations with 4x+ your units (relaxed in coalitions) */
        const unitMultCap = 4 + warsOnTarget;
        if (tUnits > myUnits * unitMultCap) return false;
        /* Power-ratio gate (relaxed in late game and coalitions) */
        const basePowerRatio = (state.turn || 0) > 50 ? 0.40 : 0.55;
        const powerRatio = Math.max(0.20, basePowerRatio - coalitionBravery);
        if (myPow < tDef * powerRatio) return false;
        /* Early game: only fight if reasonable parity */
        if ((state.turn || 0) <= 10 && myPow < tDef * 0.75) return false;
        return true;
    }

    function _scoreAllTargets(code, state, n, enemies, allies) {
        const atkArmy = n.army || {};
        const scored = [];  // {territory, owner, score, breakdown}
        const isEarlyGame = (state.turn || 0) <= 12;

        const territoryEconomicValue = (tCode) => {
            const tBase = NATIONS[tCode];
            if (!tBase) return 0;
            const prodVal = Object.values(tBase.prod || {}).reduce((a, b) => a + (b || 0), 0);
            let assetVal = 0;
            if (typeof STRATEGIC_ASSETS !== 'undefined') {
                Object.values(STRATEGIC_ASSETS).forEach(asset => {
                    if ((asset.holders || []).includes(tCode)) {
                        assetVal += Object.values(asset.bonus || {}).reduce((s, v) => s + (v || 0), 0);
                    }
                });
            }
            return prodVal + assetVal;
        };

        /* All territories not owned by us */
        const myTerritories = new Set();
        const enemyTerritories = [];
        for (const tCode of SVG_IDS) {
            if (state.territories[tCode] === code) myTerritories.add(tCode);
            else enemyTerritories.push(tCode);
        }

        /* Pre-compute: which owners are we at war with? */
        const atWarWith = new Set(enemies);

        const ownerTerritories = {};
        Object.entries(state.territories).forEach(([tCode, owner]) => {
            if (!ownerTerritories[owner]) ownerTerritories[owner] = [];
            ownerTerritories[owner].push(tCode);
        });

        /* Strategic asset lookup: territory → asset bonuses */
        const assetMap = {};
        if (typeof STRATEGIC_ASSETS !== 'undefined') {
            Object.entries(STRATEGIC_ASSETS).forEach(([id, asset]) => {
                (asset.holders || []).forEach(h => {
                    if (!assetMap[h]) assetMap[h] = [];
                    assetMap[h].push({ id, bonus: asset.bonus });
                });
            });
        }

        const ownerEconomicTotal = {};
        const territoryBaseValue = {};
        Object.keys(state.territories).forEach(tCode => {
            territoryBaseValue[tCode] = territoryEconomicValue(tCode);
        });
        Object.entries(ownerTerritories).forEach(([owner, terr]) => {
            ownerEconomicTotal[owner] = terr.reduce((sum, tCode) => sum + (territoryBaseValue[tCode] || 0), 0);
        });

        /* Only score reachable territories */
        for (const tCode of enemyTerritories) {
            const owner = state.territories[tCode];
            const ownerNation = state.nations[owner];
            if (!ownerNation || !ownerNation.alive) continue;
            if (GameEngine.isAlly(code, owner)) continue;

            /* Reachability check */
            let reachable = false;
            const _nb = typeof getNeighborsOf === 'function' ? getNeighborsOf(tCode) : [];
            const isLandAdjacent = _nb.some(nb => myTerritories.has(nb));
            const _turn = state.turn || 0;
            if (_turn <= 5) {
                /* Early game: only land-adjacent attacks */
                reachable = isLandAdjacent;
            } else if (typeof canReachTerritory === 'function') {
                const reach = canReachTerritory(code, tCode, atkArmy);
                reachable = reach.reachable;
            } else {
                reachable = isLandAdjacent;
            }
            if (!reachable) continue;

            /* ── Score components ── */
            let score = 0;
            const breakdown = {};

            /* 1. Resource value of territory (from NATIONS base data) */
            const tBase = NATIONS[tCode];
            if (tBase && tBase.prod) {
                const rv = Object.values(tBase.prod).reduce((a,b) => a+b, 0);
                breakdown.resource = rv;
                score += rv * 0.5;
            }

            /* 2. Strategic asset control */
            if (assetMap[tCode]) {
                const assetVal = assetMap[tCode].reduce((sum, a) => {
                    return sum + Object.values(a.bonus).reduce((s,v) => s+v, 0);
                }, 0);
                breakdown.asset = assetVal;
                score += assetVal * 0.8;  // assets add value but don't dominate targeting
            }

            /* 3. Garrison weakness (weaker = easier to conquer) */
            if (typeof GameEngine.getGarrison === 'function') {
                const g = GameEngine.getGarrison(tCode);
                const garStr = g ? g.total : 0;
                const weakness = Math.max(0, 20 - garStr);
                breakdown.garrison = weakness;
                score += weakness * 1.5;
            }

            /* 4. Border consolidation: how many of OUR territories border this one? */
            const neighbors = typeof getNeighborsOf === 'function' ? getNeighborsOf(tCode) : [];
            const myBorders = neighbors.filter(nb => myTerritories.has(nb)).length;
            breakdown.consolidation = myBorders;
            score += myBorders * 8;  // strong bonus for filling gaps in our territory

            /* 5. Cut enemy: if conquering this splits enemy territory */
            const enemyNeighborCount = neighbors.filter(nb => state.territories[nb] === owner).length;
            const totalEnemyNeighbors = neighbors.length;
            /* If this territory is a bridge (many enemy neighbors, few other connections) */
            if (enemyNeighborCount >= 2 && totalEnemyNeighbors >= 3) {
                const cutScore = enemyNeighborCount * 5;
                breakdown.cut = cutScore;
                score += cutScore;
            }

            /* 6. Homeland reconquest — massive priority */
            const ourHomeland = n.homeland || code;
            if (tCode === ourHomeland) {
                breakdown.homeland = 200;
                score += 200;
            }

            /* 7. Target is already at war with us → bonus (active front) */
            if (atWarWith.has(owner)) {
                breakdown.activeWar = 20;
                score += 20;
            }

            /* 7b. Anti-dogpile: penalize piling onto an owner already under attack.
               Much stronger in early game to prevent T1 avalanches. */
            if (!atWarWith.has(owner)) {
                const warsOnOwner = state.wars.reduce((count, w) => {
                    return count + ((w.attacker === owner || w.defender === owner) ? 1 : 0);
                }, 0);
                if (warsOnOwner >= 2) {
                    const perWarPenalty = isEarlyGame ? 25 : 6;
                    const dogpilePenalty = Math.min(80, (warsOnOwner - 1) * perWarPenalty);
                    breakdown.antiDogpile = -dogpilePenalty;
                    score -= dogpilePenalty;
                }
            }

            /* 8. Ally coordination: an ally also borders this territory */
            for (const allyCode of allies) {
                if (!state.nations[allyCode]?.alive) continue;
                for (const nb of neighbors) {
                    if (state.territories[nb] === allyCode) {
                        breakdown.allyCoord = 10;
                        score += 10;
                        break;
                    }
                }
                if (breakdown.allyCoord) break;
            }

            /* 9. Weak owner bonus: owner with few territories = about to be eliminated */
            const ownerTerr = GameEngine.getTerritoryCount(owner);
            const gameTurn = state.turn || 0;
            const lateElim = gameTurn >= 60 ? 1.8 : gameTurn >= 40 ? 1.4 : 1.0;
            if (ownerTerr <= 5) {
                const baseElim = ownerTerr === 1 ? 80 : ownerTerr === 2 ? 65 : ownerTerr === 3 ? 45 : ownerTerr === 4 ? 30 : 20;
                const elimBonus = Math.round(baseElim * lateElim);
                breakdown.elimination = elimBonus;
                score += elimBonus;
            }

            /* 9b. P1 FOCUS FIRE: concentrate attacks on the weakest current enemy.
               If we're at war with multiple nations, strongly prefer the one closest to elimination.
               This prevents spreading attacks across too many fronts. */
            if (atWarWith.has(owner) && atWarWith.size > 1) {
                let weakestEnemy = null, weakestTerr = Infinity;
                for (const e of atWarWith) {
                    if (!state.nations[e]?.alive) continue;
                    const et = GameEngine.getTerritoryCount(e);
                    if (et < weakestTerr) { weakestTerr = et; weakestEnemy = e; }
                }
                if (owner === weakestEnemy) {
                    const focusBonus = Math.min(60, Math.round(30 + (10 - Math.min(10, weakestTerr)) * 4));
                    breakdown.focusFire = focusBonus;
                    score += focusBonus;
                }
            }

            /* 10. Penalize attacking dominant nation's homeland (dangerous!) */
            const defHomeland = ownerNation.homeland || owner;
            const homelandPowerThreshold = isEarlyGame ? 50 : 60;
            if (tCode === defHomeland && (ownerNation.power || 0) >= homelandPowerThreshold) {
                breakdown.homelandPenalty = -55;
                score -= 55;
            }

            /* 11. Homeland strike opportunity:
               attacking homeland can trigger colony cession/collapse, so prefer it
               only when expected nation-level value is better than a single colony. */
            const ownerTerrList = ownerTerritories[owner] || [];
            if (tCode === defHomeland && ownerTerrList.length > 1) {
                const targetTerrValue = territoryBaseValue[tCode] || 0;
                const totalNationValue = ownerEconomicTotal[owner] || targetTerrValue;
                const colonyValue = Math.max(0, totalNationValue - targetTerrValue);
                const valueDelta = colonyValue - targetTerrValue;
                if (valueDelta > 0) {
                    const ownerPower = ownerNation.power || 0;
                    const conversionFactor = Math.max(0.25, 0.65 - ownerPower / 220);
                    const expectedNationGain = valueDelta * conversionFactor;
                    const homelandStrikeBonus = Math.min(40, Math.round(expectedNationGain * 0.6));
                    if (homelandStrikeBonus > 0) {
                        breakdown.homelandStrike = homelandStrikeBonus;
                        score += homelandStrikeBonus;
                    }
                }
            }

            scored.push({ territory: tCode, owner, score, breakdown });
        }

        /* Sort by score descending */
        scored.sort((a, b) => b.score - a.score);
        return scored;
    }

    /* ════════════════ ECONOMY ════════════════ */
    function doEconomy(code, situation, profile) {
        const actions = [];
        const state = GameEngine.getState();
        const n = state.nations[code];

        const totalUnits = Object.values(n.army).reduce((a, b) => a + b, 0);
        const money = n.res.money || 0;

        /* ── Adaptive build priority based on strategic goal ── */
        let buildPriority = [];

        switch (situation.goal) {
            case 'reconquest':
                /* All-in offense to retake homeland */
                buildPriority = ['tank','infantry','fighter','infantry','drone','bomber','infantry','cruiseMissile','nuke'];
                break;
            case 'consolidate':
                /* Mostly defensive + some infantry for garrison */
                buildPriority = ['infantry','sam','infantry','infantry','tank','infantry','nuke'];
                break;
            case 'defend':
                buildPriority = ['infantry','sam','tank','infantry','fighter','drone','infantry','nuke'];
                break;
            case 'warfight':
                /* Active war: balanced offense */
                buildPriority = ['tank','fighter','infantry','drone','bomber','cruiseMissile','infantry','nuke','tank','fighter'];
                break;
            case 'dominate':
                /* Late-game domination: heavy firepower */
                buildPriority = ['tank','fighter','bomber','drone','nuke','cruiseMissile','navy','submarine','nuke','tank','bomber'];
                break;
            default: /* expand */
                /* Need projection: mix of mobile + cheap */
                if (situation.scoredTargets.length > 0) {
                    /* Check if top targets are overseas (need navy/air) */
                    const topTarget = situation.scoredTargets[0];
                    const needsSea = topTarget && !situation.neighborOwners.includes(topTarget.owner);
                    if (needsSea && (n.army.navy || 0) < 3) {
                        buildPriority = ['navy','infantry','fighter','infantry','drone','infantry','submarine','nuke'];
                    } else {
                        buildPriority = ['infantry','tank','fighter','infantry','drone','infantry','infantry','bomber','nuke'];
                    }
                } else {
                    buildPriority = ['infantry','infantry','tank','drone','infantry','fighter','sam','navy','nuke'];
                }
                break;
        }

        /* Build scaling: more units for richer nations, but save for economic victory */
        const savingForEcon = (money > 40000 && situation.myTerrCount >= SVG_IDS.length * 0.25);
        /* Minor nations cap builds — they shouldn't mass-produce armies like superpowers */
        const isMinorProfile = (profile.aggression <= 0.2);
        const maxBuilds = savingForEcon 
            ? Math.min(8, 3 + Math.floor(money / 300))
            : isMinorProfile
                ? Math.min(6, 2 + Math.floor(money / 200))
                : Math.min(25, 4 + Math.floor(money / 80));
        let built = 0;

        /* Emergency: if army is tiny, spam infantry */
        if (totalUnits < 10 && money >= 50) {
            while (built < maxBuilds && GameEngine.canBuild(code, 'infantry')) {
                GameEngine.buildUnit(code, 'infantry');
                actions.push({ type:'build', nation:code, unit:'infantry' });
                built++;
            }
        }

        for (const utype of buildPriority) {
            if (built >= maxBuilds) break;
            if (GameEngine.canBuild(code, utype)) {
                GameEngine.buildUnit(code, utype);
                actions.push({ type:'build', nation:code, unit:utype });
                built++;
            }
        }

        /* Repeat build priority if still rich — spend the money! */
        if (money > 2000 && built < maxBuilds) {
            for (const utype of buildPriority) {
                if (built >= maxBuilds) break;
                if (GameEngine.canBuild(code, utype)) {
                    GameEngine.buildUnit(code, utype);
                    actions.push({ type:'build', nation:code, unit:utype });
                    built++;
                }
            }
        }

        /* High-tech nations: occasionally build advanced units */
        if (profile.techFocus > 0.5 && Math.random() < profile.techFocus * 0.3) {
            const advUnits = ['drone','cruiseMissile','submarine'];
            for (const u of advUnits) {
                if (built >= maxBuilds + 1) break;
                if (GameEngine.canBuild(code, u)) {
                    GameEngine.buildUnit(code, u);
                    actions.push({ type:'build', nation:code, unit:u });
                    built++;
                    break;
                }
            }
        }

        return actions;
    }

    /* ════════════════ DIPLOMACY ════════════════ */
    function doDiplomacy(code, situation, profile) {
        const actions = [];
        const state = GameEngine.getState();
        const n = state.nations[code];

        /* Hard alliance cap — never exceed 3 active alliances */
        const ALLIANCE_CAP = 3;
        const currentAllyCount = () => state.alliances.filter(a => a.a === code || a.b === code).length;
        const canAlly = () => currentAllyCount() < ALLIANCE_CAP;
        /* Max 2 new alliances formed per turn to reduce noise */
        let alliancesFormedThisTurn = 0;
        const MAX_NEW_ALLIANCES_PER_TURN = 2;
        const tryAlliance = (a, b) => {
            if (!canAlly() || alliancesFormedThisTurn >= MAX_NEW_ALLIANCES_PER_TURN) return false;
            if (GameEngine.isAlly(a, b) || GameEngine.isAtWar(a, b)) return false;
            /* Rivalry: two major powers (both >10% territories) can NEVER ally */
            const totalTerr = (typeof SVG_IDS !== 'undefined') ? SVG_IDS.length : 231;
            const aPct = GameEngine.getTerritoryCount(a) / totalTerr;
            const bPct = GameEngine.getTerritoryCount(b) / totalTerr;
            if (aPct > 0.15 && bPct > 0.15) return false;
            /* Also check partner's alliance count */
            const partnerAllies = state.alliances.filter(al => al.a === b || al.b === b).length;
            if (partnerAllies >= ALLIANCE_CAP) return false;
            GameEngine.makeAlliance(a, b);
            alliancesFormedThisTurn++;
            return true;
        };

        /* ── Alliance decay: long peace erodes alliances ──
           Without wars, nations drift apart. Max 3 allies sustained;
           beyond that, weakest alliances dissolve each turn. */
        if (situation.allies.length > 3) {
            const excess = situation.allies.length - 3;
            const allyByStrength = situation.allies
                .map(a => ({ code: a, def: GameEngine.calcMilitary(a, 'def') }))
                .sort((a, b) => a.def - b.def);
            for (let i = 0; i < excess; i++) {
                if (Math.random() < 0.3 + situation.restlessness * 0.4) {
                    GameEngine.breakAlliance(code, allyByStrength[i].code);
                    actions.push({ type:'alliance_decay', nation:code, target:allyByStrength[i].code });
                }
            }
        }

        /* ── Coalition against dominant nation ── */
        if (situation.dominantThreat && situation.dominant !== code) {
            const dom = situation.dominant;
            const domTerr = GameEngine.getTerritoryCount(dom);
            const totalTerr = (typeof SVG_IDS !== 'undefined') ? SVG_IDS.length : 231;
            const domPct = domTerr / totalTerr;
            /* The stronger the dominant, the higher the coalition urgency */
            const urgency = Math.min(1.0, domPct * 4); // 12%→0.48, 25%→1.0

            if (!GameEngine.isAtWar(code, dom)) {
                /* Coalition war: weaker against superpowers */
                const domPower = state.nations[dom]?.power || 0;
                const superpowerPenalty = domPower >= 80 ? 0.5 : domPower >= 60 ? 0.7 : 1.0;
                const coalitionChance = (0.15 + urgency * 0.35) * superpowerPenalty;
                if (Math.random() < coalitionChance) {
                    GameEngine.ensureWar(code, dom);
                    actions.push({ type:'war_declare', nation:code, target:dom });
                }
            }
            /* Aggressively seek alliances against the dominant — ignore normal cap */
            const allAlive = Object.keys(state.nations).filter(c => c !== code && c !== dom && state.nations[c]?.alive);
            allAlive.forEach(nc => {
                if (GameEngine.isAlly(code, nc) || GameEngine.isAtWar(code, nc)) return;
                /* Anyone not allied with the dominant is a potential coalition partner */
                if (GameEngine.isAlly(nc, dom)) return;
                const ncDomRel = GameEngine.getRelation(nc, dom);
                const allianceChance = 0.08 + urgency * 0.25 + (ncDomRel < -20 ? 0.15 : 0);
                if (Math.random() < allianceChance) {
                    /* Bypass normal alliance cap for anti-dominant coalitions */
                    if (!GameEngine.isAlly(code, nc)) {
                        GameEngine.makeAlliance(code, nc);
                        alliancesFormedThisTurn++;
                        actions.push({ type:'coalition_alliance', nation:code, target:nc });
                    }
                }
            });
        }

        /* ── Seek allies among neighbors ── */
        if (profile.diplomacy > 0.3 && canAlly()) {
            situation.neighborOwners.forEach(nc => {
                if (!canAlly()) return;
                if (GameEngine.isAlly(code, nc) || GameEngine.isAtWar(code, nc)) return;
                if (!state.nations[nc]?.alive) return;
                const rel = GameEngine.getRelation(code, nc);
                if (rel > 5 && Math.random() < profile.diplomacy * 0.35) {
                    if (tryAlliance(code, nc)) {
                        actions.push({ type:'alliance', nation:code, target:nc });
                    }
                }
            });
        }

        /* ── Enemy-of-my-enemy ── */
        if (situation.enemies.length > 0 && canAlly()) {
            situation.enemies.forEach(enemy => {
                if (!canAlly()) return;
                const enemyWars = GameEngine.getWarsFor(enemy);
                enemyWars.forEach(w => {
                    if (!canAlly()) return;
                    const otherFighter = w.attacker === enemy ? w.defender : w.attacker;
                    if (otherFighter === code) return;
                    if (!state.nations[otherFighter]?.alive) return;
                    if (GameEngine.isAlly(code, otherFighter) || GameEngine.isAtWar(code, otherFighter)) return;
                    if (Math.random() < 0.3 * profile.diplomacy) {
                        if (tryAlliance(code, otherFighter)) {
                            actions.push({ type:'alliance', nation:code, target:otherFighter });
                        }
                    }
                });
            });
        }

        /* ── Coordinate with allies: declare war on the same enemy ── */
        if (situation.allies.length > 0 && situation.enemies.length === 0 && profile.aggression > 0.3) {
            for (const allyCode of situation.allies) {
                const allyWars = GameEngine.getWarsFor(allyCode);
                for (const w of allyWars) {
                    const allyEnemy = w.attacker === allyCode ? w.defender : w.attacker;
                    if (allyEnemy === code) continue;
                    if (GameEngine.isAlly(code, allyEnemy) || GameEngine.isAtWar(code, allyEnemy)) continue;
                    if (!state.nations[allyEnemy]?.alive) continue;
                    if ((state.turn || 0) <= 6 && !(situation.reachableOwners || []).includes(allyEnemy)) continue;
                    if (!_canRealisticallyFight(code, allyEnemy, state)) continue;
                    /* Join ally's war with moderate probability */
                    const joinBase = (state.turn || 0) <= 6 ? 0.08 : 0.20;
                    if (Math.random() < joinBase * profile.aggression) {
                        GameEngine.ensureWar(code, allyEnemy);
                        actions.push({ type:'war_declare', nation:code, target:allyEnemy });
                        break;
                    }
                }
                if (actions.some(a => a.type === 'war_declare')) break;
            }
        }

        /* ── Sanctions ── */
        situation.threats.forEach(t => {
            const tn = state.nations[t.code];
            if (tn && tn.nukesUsed > 0 && Math.random() < 0.6) {
                GameEngine.addSanction(code, t.code);
                actions.push({ type:'sanction', nation:code, target:t.code });
            }
        });

        /* ── Smart peace: only when losing or overstretched, NEVER when winning ── */
        /* Pre-compute reachable enemy set for peace decisions */
        const reachableEnemies = new Set(
            situation.scoredTargets.filter(t => situation.enemies.includes(t.owner)).map(t => t.owner)
        );
        const isMinorForPeace = (profile.aggression <= 0.2);
        situation.enemies.forEach(enemy => {
            if (situation.homelandLost && enemy === situation.homelandEnemy) return;
            const war = state.wars.find(w =>
                (w.attacker === code && w.defender === enemy) ||
                (w.attacker === enemy && w.defender === code));
            const minWarTurns = Math.round(5 + situation.restlessness * 10);
            if (war && (state.turn - war.turn) > minWarTurns && profile.diplomacy > 0.4) {
                /* Make peace with unreachable enemies (pointless wars) */
                if (!reachableEnemies.has(enemy)) {
                    GameEngine.makePeace(code, enemy);
                    actions.push({ type:'peace', nation:code, target:enemy });
                    return;
                }

                /* War fatigue: minor nations eagerly seek peace after long wars */
                const warDuration = state.turn - war.turn;
                if (isMinorForPeace && warDuration >= 5) {
                    GameEngine.makePeace(code, enemy);
                    actions.push({ type:'peace', nation:code, target:enemy });
                    return;
                }

                /* Only seek peace if we're weaker or overstretched */
                const enemyPow = GameEngine.calcMilitary(enemy, 'atk');
                const losing = enemyPow > situation.myAtkPow * 1.1;
                const stretched = situation.overextended && situation.criticalUnrest >= 2;
                if (losing || stretched) {
                    const peaceChance = 0.3 * (1 - situation.restlessness * 0.5);
                    if (Math.random() < peaceChance) {
                        GameEngine.makePeace(code, enemy);
                        actions.push({ type:'peace', nation:code, target:enemy });
                    }
                }
            }
        });

        /* ── Anti-stall: if at peace too long OR enemies unreachable, start a strategic war ── */
        const reachableEnemyTerr = situation.scoredTargets.filter(t => situation.enemies.includes(t.owner)).length;
        const enemiesUnreachable = situation.enemies.length > 0 && reachableEnemyTerr === 0;
        if ((situation.enemies.length === 0 || enemiesUnreachable) && state.turn > 10) {
            const myWars = state.wars.filter(w => w.attacker === code || w.defender === code);
            const lastWarTurn = myWars.length ? Math.max(...myWars.map(w => w.turn)) : 0;
            const peaceTurns = state.turn - lastWarTurn;
            /* Probability ramps up with peace duration: guaranteed after 10 turns */
            const stallProb = peaceTurns <= 5 ? 0
                            : peaceTurns <= 8 ? 0.30 + situation.restlessness * 0.3
                            : peaceTurns <= 10 ? 0.60 + situation.restlessness * 0.3
                            : 1.0;  /* 10+ turns = MUST attack */
            if (Math.random() < stallProb) {
                /* First try: non-ally targets from scored list */
                let target = situation.scoredTargets.find(t =>
                    !GameEngine.isAlly(code, t.owner) && !GameEngine.isAtWar(code, t.owner)
                );

                /* Fallback A: if scoredTargets empty, pick ANY neighbor not allied */
                if (!target) {
                    const neighbors = situation.neighborOwners.filter(nc =>
                        nc !== code && !GameEngine.isAlly(code, nc) && state.nations[nc]?.alive
                    );
                    if (neighbors.length > 0) {
                        /* Pick weakest neighbor */
                        const weakest = neighbors
                            .map(nc => ({ code: nc, def: GameEngine.calcMilitary(nc, 'def') }))
                            .sort((a, b) => a.def - b.def)[0];
                        /* Find any territory of theirs to attack */
                        const victimTerr = Object.entries(state.territories)
                            .find(([, o]) => o === weakest.code);
                        if (victimTerr) {
                            target = { territory: victimTerr[0], owner: weakest.code };
                        }
                    }
                }

                /* Fallback B: if ALL neighbors are allies, betray the weakest */
                if (!target && peaceTurns > 15) {
                    const allyNeighbors = situation.neighborOwners.filter(nc =>
                        nc !== code && GameEngine.isAlly(code, nc) && state.nations[nc]?.alive
                    );
                    if (allyNeighbors.length > 0) {
                        const weakest = allyNeighbors
                            .map(a => ({ code: a, def: GameEngine.calcMilitary(a, 'def') }))
                            .sort((a, b) => a.def - b.def)[0];
                        GameEngine.breakAlliance(code, weakest.code);
                        actions.push({ type:'betray', nation:code, target:weakest.code });
                        const victimTerr = Object.entries(state.territories)
                            .find(([, o]) => o === weakest.code);
                        if (victimTerr) {
                            target = { territory: victimTerr[0], owner: weakest.code };
                        }
                    }
                }

                /* Execute attack */
                if (target) {
                    /* After very long peace we can be bolder, but never fully suicidal */
                    let canFight = _canRealisticallyFight(code, target.owner, state);
                    if (!canFight && peaceTurns > 15) {
                        const myPow = GameEngine.calcMilitary(code, 'atk');
                        const targetDef = GameEngine.calcMilitary(target.owner, 'def');
                        const myUnits = Object.values((state.nations[code]?.army || {})).reduce((a, b) => a + b, 0);
                        const targetUnits = Object.values((state.nations[target.owner]?.army || {})).reduce((a, b) => a + b, 0);
                        const hasMinimumForce = myUnits >= 18;
                        const acceptableParity = myPow >= targetDef * 0.65;
                        const notHopelesslyOutnumbered = targetUnits <= myUnits * 2;
                        canFight = hasMinimumForce && acceptableParity && notHopelesslyOutnumbered;
                    }
                    if (canFight) {
                        const result = GameEngine.attack(code, target.territory);
                        if (result && !result.blocked) actions.push({ type:'attack', nation:code, target:target.territory, result });
                    }
                }
            }
        }

        /* ── Betrayal ── */
        const betrayChance = 0.05 + situation.restlessness * 0.1;
        if (profile.aggression > 0.3 && Math.random() < betrayChance) {
            const weakAlly = situation.allies.find(a => {
                const ap = GameEngine.calcMilitary(a, 'def');
                return ap < situation.myAtkPow * 0.6;
            });
            if (weakAlly) {
                GameEngine.breakAlliance(code, weakAlly);
                actions.push({ type:'betray', nation:code, target:weakAlly });
            }
        }

        return actions;
    }

    /* ════════════════ MILITARY (GOAL-DRIVEN) ════════════════ */
    function doMilitary(code, situation, profile) {
        const actions = [];
        const state = GameEngine.getState();
        const n = state.nations[code];
        const restless = situation.restlessness;

        /* ── GLOBAL ATTACK BUDGET: max attacks this nation can do this turn ── */
        const gameTurn = state.turn || 0;
        const isSuper = (profile.aggression >= 0.6);
        const isMajor = (profile.aggression >= 0.4);
        /* Early game: fewer attacks. Late game: ramp up slightly. */
        let maxTotalAttacks;
        if (isSuper) {
            maxTotalAttacks = gameTurn <= 3 ? 3 : gameTurn <= 10 ? 4 : Math.min(6, 3 + Math.floor(restless * 2));
        } else if (isMajor) {
            maxTotalAttacks = gameTurn <= 3 ? 2 : gameTurn <= 10 ? 3 : Math.min(4, 2 + Math.floor(restless * 1.5));
        } else {
            maxTotalAttacks = gameTurn <= 5 ? 1 : Math.min(3, 1 + Math.floor(restless * 1));
        }
        let totalAttacksMade = 0;

        /* ── Skip expansion if consolidating ── */
        if (situation.goal === 'consolidate') {
            /* Only attack if already at war (defensive actions) */
            if (situation.enemies.length > 0) {
                const targets = situation.scoredTargets.filter(t => situation.enemies.includes(t.owner));
                if (targets.length > 0 && situation.myAtkPow > 5) {
                    const result = GameEngine.attack(code, targets[0].territory);
                    if (result && !result.blocked) actions.push({ type:'attack', nation:code, target:targets[0].territory, result });
                }
            }
            /* But if peace has lasted too long, break out of consolidation */
            const myWars = state.wars.filter(w => w.attacker === code || w.defender === code);
            const lastWarT = myWars.length ? Math.max(...myWars.map(w => w.turn)) : 0;
            if (state.turn - lastWarT <= 12) return actions;
            /* Fall through to normal military logic after 12 turns of peace */
        }

        /* ── Skip military action if army is too small (< 10 units) ── */
        const totalArmyUnits = Object.values(n.army).reduce((a, b) => a + b, 0);
        if (totalArmyUnits < 10 && !situation.homelandLost) {
            return actions; /* Too weak to attack — save units for defense */
        }

        /* ── MINOR NATIONS: passive unless provoked ── */
        /* Minor/neutral/defensive nations don't attack unprovoked in early game.
           They only fight if already at war or homeland is lost. */
        const isPassiveProfile = (profile.aggression <= 0.2);
        const earlyGamePeace = gameTurn <= 3 && !isSuper && !isMajor;
        if ((isPassiveProfile || earlyGamePeace) && situation.enemies.length === 0 && !situation.homelandLost) {
            return actions; /* Stay peaceful — build up economy and army */
        }

        /* ── WAR FATIGUE for minor/passive nations ── */
        /* If a minor nation has been at war but keeps losing (more defeats
           than victories in recent history), skip attacks and try to seek
           peace instead.  This prevents tiny nations with big empires from
           endlessly throwing infantry at stronger enemies. */
        if (isPassiveProfile && !situation.homelandLost && situation.enemies.length > 0) {
            const myWars = state.wars.filter(w => w.attacker === code || w.defender === code);
            const oldestWarTurn = myWars.length ? Math.min(...myWars.map(w => w.turn)) : gameTurn;
            const warDuration = gameTurn - oldestWarTurn;
            /* After 5+ turns of war, minor nations lose willingness to attack */
            if (warDuration >= 5 && !isMajor && !isSuper) {
                return actions; /* War fatigue — stop attacking, diplomacy will seek peace */
            }
        }

        /* ── PRIORITY 0: Homeland reconquest ── */
        if (situation.homelandLost && situation.homelandEnemy) {
            const enemy = situation.homelandEnemy;
            /* attack() calls ensureWar() internally — no need for explicit declaration */
            /* Homeland will be scored highest (200 pts), so it'll be first in scoredTargets */
            const homelandTarget = situation.scoredTargets.find(t => t.territory === situation.homeland);
            if (homelandTarget) {
                const result = GameEngine.attack(code, situation.homeland);
                if (result && !result.blocked) actions.push({ type:'attack', nation:code, target:situation.homeland, result });
            } else {
                /* Can't reach homeland directly — attack any territory of occupier */
                const pathTargets = situation.scoredTargets.filter(t => t.owner === enemy);
                if (pathTargets.length > 0) {
                    const result = GameEngine.attack(code, pathTargets[0].territory);
                    if (result && !result.blocked) actions.push({ type:'attack', nation:code, target:pathTargets[0].territory, result });
                }
            }
        }

        /* ── Active war: use scored targets to pick the best territory to attack ── */
        let hasReachableWarTargets = false;
        if (situation.enemies.length > 0 && situation.myAtkPow > 5) {
            const maxAttacks = Math.min(maxTotalAttacks - totalAttacksMade, 3 + Math.floor(restless * 3));
            let attacksMade = 0;

            /* Filter scored targets to only those owned by current enemies */
            const warTargets = situation.scoredTargets.filter(t => situation.enemies.includes(t.owner));
            hasReachableWarTargets = warTargets.length > 0;

            for (const tgt of warTargets) {
                if (attacksMade >= maxAttacks) break;
                const result = GameEngine.attack(code, tgt.territory);
                if (result) {
                    if (result.blocked) break; /* Can't afford / can't reach — stop */
                    actions.push({ type:'attack', nation:code, target:tgt.territory, result });
                    attacksMade++;
                    totalAttacksMade++;
                    /* If we lost, stop attacking immediately */
                    if (!result.success) break;
                }
            }
        }

        /* ── Strategic expansion: declare war on highest-value target ── */
        if (totalAttacksMade >= maxTotalAttacks) return actions;
        /* Also expand if we have enemies but can't reach any of their territories */
        const unreachableWars = situation.enemies.length > 0 && !hasReachableWarTargets;
        const expansionChance = unreachableWars ? 1.0 : (profile.expansion + restless * 0.4);
        if (expansionChance > Math.random() && !situation.overextended) {
            /* Find best non-war target from scored list (include existing enemies if none reachable) */
            let expansionTarget = situation.scoredTargets.find(t =>
                (unreachableWars || !situation.enemies.includes(t.owner)) &&
                !GameEngine.isAlly(code, t.owner) &&
                state.nations[t.owner]?.alive
            );

            /* Fallback: if scoredTargets is empty, pick weakest non-ally neighbor */
            if (!expansionTarget) {
                const neighbors = situation.neighborOwners.filter(nc =>
                    nc !== code && !GameEngine.isAlly(code, nc) &&
                    !situation.enemies.includes(nc) && state.nations[nc]?.alive
                );
                if (neighbors.length > 0) {
                    const weakest = neighbors
                        .map(nc => ({ code: nc, def: GameEngine.calcMilitary(nc, 'def') }))
                        .sort((a, b) => a.def - b.def)[0];
                    const victimTerr = Object.entries(state.territories)
                        .find(([, o]) => o === weakest.code);
                    if (victimTerr) {
                        expansionTarget = { territory: victimTerr[0], owner: weakest.code, score: 20 };
                    }
                }
            }

            const isEarlyWarWindow = (state.turn || 0) <= 8;
            const minExpansionScore = isEarlyWarWindow ? 20 : 8;
            if (expansionTarget && expansionTarget.score > minExpansionScore
                && _canRealisticallyFight(code, expansionTarget.owner, state)) {
                const victim = expansionTarget.owner;
                const victimDefPow = GameEngine.calcMilitary(victim, 'def');
                const requiredAdvantage = isEarlyWarWindow ? 1.25 : 1.0;
                if (situation.myAtkPow > victimDefPow * requiredAdvantage) {
                    /* attack() calls ensureWar() internally — no redundant declaration */
                    const result = GameEngine.attack(code, expansionTarget.territory);
                    if (result && !result.blocked) {
                        actions.push({ type:'attack', nation:code, target:expansionTarget.territory, result });
                        totalAttacksMade++;
                    }
                }
            }
        }

        if (totalAttacksMade >= maxTotalAttacks) return actions;

        /* ── Late-game aggression: restless nations attack more ── */
        /* P1: reduce new war chance if we already have a weak enemy to finish */
        const hasWeakEnemy = situation.enemies.some(e => 
            state.nations[e]?.alive && GameEngine.getTerritoryCount(e) <= 5);
        const focusPenalty = hasWeakEnemy ? 0.3 : 1.0;
        const warChance = (profile.aggression + restless * 0.5) * 0.4 * focusPenalty;
        if ((state.turn || 0) > 6 && (situation.enemies.length < 2 || unreachableWars) && Math.random() < warChance && !situation.overextended) {
            const potentialTargets = situation.scoredTargets.filter(t =>
                !GameEngine.isAlly(code, t.owner) &&
                !GameEngine.isAtWar(code, t.owner) &&
                state.nations[t.owner]?.alive
            );
            if (potentialTargets.length > 0) {
                const best = potentialTargets[0];
                if (!_canRealisticallyFight(code, best.owner, state)) { /* skip */ }
                else {
                /* attack() calls ensureWar() internally — no redundant declaration */
                const result = GameEngine.attack(code, best.territory);
                if (result && !result.blocked) {
                    actions.push({ type:'attack', nation:code, target:best.territory, result });
                    totalAttacksMade++;
                }
                }
            }
        }

        if (totalAttacksMade >= maxTotalAttacks) return actions;

        /* ── Nuclear option (stalemate breaker) ── */
        if (profile.nukeTolerance > 0 && (n.army.nuke || 0) > 0) {
            const gameTurn = state.turn || 0;
            const desperate = situation.myTerrCount < 8 || situation.threats.length > 1;
            const atWarAndStrong = situation.enemies.length > 0;
            const enemyIsTough = situation.enemies.some(e => GameEngine.calcMilitary(e, 'def') > situation.myAtkPow * 0.5);
            const lateGame = gameTurn > 30;
            const veryLateGame = gameTurn > 60;
            const stalemateTurn = gameTurn > 80;

            /* Stalemate detection: if dominant nation isn't growing, escalate.
               Trigger EARLIER (turn 60+) and with lower threshold (35%). */
            const dominantTerr = Math.max(...Object.keys(state.nations)
                .filter(c => state.nations[c]?.alive)
                .map(c => GameEngine.getTerritoryCount(c)));
            const stalemate = veryLateGame && dominantTerr < SVG_IDS.length * 0.35;
            const deepStalemate = stalemateTurn && dominantTerr < SVG_IDS.length * 0.45;

            /* Count alive nations — many survivors late = stalemate */
            const aliveCount = Object.values(state.nations).filter(nn => nn.alive).length;
            const crowdedLate = gameTurn > 50 && aliveCount > 6;

            /* Use nuke: much more permissive triggers */
            const useNuke = desperate
                || (atWarAndStrong && enemyIsTough)
                || (lateGame && atWarAndStrong)
                || stalemate || deepStalemate || crowdedLate
                || (gameTurn > 40 && situation.enemies.length === 0 && situation.myTerrCount < SVG_IDS.length * 0.3);

            /* Escalating probability: ramps faster */
            let nukeProb;
            if (deepStalemate)    nukeProb = 0.95;   /* turn 80+: near certain */
            else if (stalemateTurn) nukeProb = 0.90;
            else if (stalemate)   nukeProb = 0.80;   /* turn 60+, no clear winner */
            else if (crowdedLate) nukeProb = 0.70;   /* too many survivors */
            else if (desperate)   nukeProb = 0.70;
            else if (veryLateGame) nukeProb = 0.65;
            else if (lateGame)    nukeProb = 0.50;
            else                  nukeProb = 0.30;

            /* Late-game tolerance boost: even peaceful nations get desperate.
               Much stronger boost so ALL nations will eventually nuke. */
            const toleranceBoost = deepStalemate ? 0.6 : veryLateGame ? 0.45 : lateGame ? 0.25 : 0;
            const effectiveTolerance = Math.min(1.0, profile.nukeTolerance + toleranceBoost + 0.35);

            if (useNuke && Math.random() < nukeProb * effectiveTolerance) {
                /* Pick strongest enemy */
                const sortedEnemies = situation.enemies
                    .filter(e => state.nations[e]?.alive)
                    .sort((a, b) => GameEngine.calcMilitary(b, 'def') - GameEngine.calcMilitary(a, 'def'));
                let nukeUsed = false;
                for (const enemy of sortedEnemies) {
                    const targets = findAttackTargets(code, enemy);
                    if (targets.length > 0) {
                        const result = GameEngine.nukeStrike(code, targets[0]);
                        if (result) {
                            actions.push({ type:'nuke', nation:code, target:targets[0], result });
                            nukeUsed = true;
                            break;
                        }
                    }
                }
                /* Proactive nuke: target dominant rival even if NOT at war.
                   Triggers earlier and more aggressively. */
                if (!nukeUsed && (stalemate || crowdedLate || gameTurn > 50) && (n.army.nuke || 0) > 0) {
                    const rivals = Object.keys(state.nations)
                        .filter(c => c !== code && state.nations[c]?.alive && !GameEngine.isAlly(code, c))
                        .sort((a, b) => GameEngine.getTerritoryCount(b) - GameEngine.getTerritoryCount(a));
                    for (const rival of rivals) {
                        const targets = findAttackTargets(code, rival);
                        if (targets.length > 0) {
                            /* Nuke + declare war in one move */
                            const result = GameEngine.nukeStrike(code, targets[0]);
                            if (result) {
                                actions.push({ type:'nuke', nation:code, target:targets[0], result });
                                /* Follow up with a conventional attack on the weakened territory */
                                if ((n.army.nuke || 0) > 0) {
                                    const followUp = findAttackTargets(code, rival);
                                    if (followUp.length > 0) {
                                        const atkResult = GameEngine.attack(code, followUp[0]);
                                        if (atkResult && !atkResult.blocked) actions.push({ type:'attack', nation:code, target:followUp[0], result:atkResult });
                                    }
                                }
                                break;
                            }
                        }
                    }
                }
            }
        }

        /* ── Opportunistic: finish off defenseless nations ── */
        /* Aggressively eliminate weak nations — key to reducing survivor count */
        if (situation.myAtkPow > 5) {
            (situation.reachableOwners || situation.neighborOwners).forEach(nc => {
                if (GameEngine.isAlly(code, nc) || nc === code) return;
                const nn = state.nations[nc];
                if (!nn || !nn.alive) return;
                const nDefPow = GameEngine.calcMilitary(nc, 'def');
                const nTerrCount = GameEngine.getTerritoryCount(nc);
                const isWeak = nDefPow < situation.myAtkPow * 0.4 || nTerrCount <= 2;  
                if (isWeak && totalAttacksMade < maxTotalAttacks) {
                    const targets = findAttackTargets(code, nc);
                    if (targets.length > 0) {
                        const result = GameEngine.attack(code, targets[0]);
                        if (result && !result.blocked) {
                            actions.push({ type:'attack', nation:code, target:targets[0], result });
                            totalAttacksMade++;
                        }
                    }
                }
            });
        }



        return actions;
    }

    /* Find territories of enemy reachable by attacker */
    function findAttackTargets(attackerCode, enemyCode) {
        const state = GameEngine.getState();
        const atk = state.nations[attackerCode];
        const atkArmy = atk ? atk.army : {};

        const myTerritories = new Set(
            Object.entries(state.territories)
                .filter(([, o]) => o === attackerCode).map(([c]) => c)
        );
        const enemyTerritories = Object.entries(state.territories)
            .filter(([, o]) => o === enemyCode).map(([c]) => c);

        if (typeof canReachTerritory === 'function') {
            const myAtkPow = GameEngine.calcMilitary(attackerCode, 'atk');
            return enemyTerritories.filter(et => {
                const reach = canReachTerritory(attackerCode, et, atkArmy);
                if (!reach.reachable) return false;
                /* Block weak nations from long-range attacks (air/missile only) */
                if ((reach.method === 'air' || reach.method === 'missile') && myAtkPow < 100) return false;
                return true;
            });
        }
        return enemyTerritories.filter(et => {
            const neighbors = getNeighborsOf(et);
            return neighbors.some(nb => myTerritories.has(nb));
        });
    }

    /* ════════════════ RESEARCH (GOAL-AWARE) ════════════════ */
    function doResearch(code, situation, profile) {
        const actions = [];
        if (Math.random() > profile.techFocus * 0.8 + 0.2) return actions;

        const available = TECHNOLOGIES.filter(t => GameEngine.canResearch(code, t.id));
        if (available.length === 0) return actions;

        /* ── Prioritize techs based on goal ── */
        const goalPriority = {
            reconquest:  ['ai_warfare','hypersonic','stealth_tech','carrier_fleet','advanced_drones','nuclear_program'],
            warfight:    ['ai_warfare','stealth_tech','advanced_drones','missile_defense','nuclear_program','hypersonic'],
            defend:      ['missile_defense','bio_defense','nuclear_program','cyberwarfare'],
            expand:      ['carrier_fleet','advanced_drones','missile_defense','nuclear_program','green_energy','deep_mining'],
            consolidate: ['green_energy','deep_mining','missile_defense','nuclear_program','bio_defense','cyberwarfare'],
            dominate:    ['nuclear_program','missile_defense','hypersonic','ai_warfare','stealth_tech','space_recon']
        };
        let preferred = goalPriority[situation.goal] || goalPriority.expand;

        /* Late-game escalation: after turn 40, prioritize nuclear program as tiebreaker */
        const gameTurn = GameEngine.getState()?.turn || 0;
        if (gameTurn > 40 && !state.nations[code]?.techs?.includes('nuclear_program')) {
            /* Push nuclear prereq (missile_defense) and nuclear_program to the front */
            preferred = ['missile_defense', 'nuclear_program', ...preferred.filter(t => t !== 'missile_defense' && t !== 'nuclear_program')];
        }

        /* Try preferred techs first */
        for (const techId of preferred) {
            const tech = available.find(t => t.id === techId);
            if (tech) {
                GameEngine.research(code, tech.id);
                actions.push({ type:'research', nation:code, tech:tech.id });
                return actions;
            }
        }

        /* Fallback: pick any available tech */
        const tech = available[Math.floor(Math.random() * available.length)];
        GameEngine.research(code, tech.id);
        actions.push({ type:'research', nation:code, tech:tech.id });
        return actions;
    }

    /* ════════════════ SUPPRESS UNREST ════════════════ */
    function doSuppressUnrest(code) {
        const actions = [];
        if (!GameEngine.getUnrestList || !GameEngine.suppressUnrest) return actions;

        const unrestList = GameEngine.getUnrestList(code);
        const critical = unrestList.filter(t => t.unrest >= 65);
        for (const t of critical) {
            const result = GameEngine.suppressUnrest(t.territory);
            if (result.success) {
                actions.push({ type: 'suppress_unrest', nation: code, target: t.territory });
            } else {
                break;
            }
        }
        return actions;
    }

    /* ════════════════ HELPERS ════════════════ */
    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    /* ════════════════ PUBLIC ════════════════ */
    return {
        processAllAI,
        getTurnActions: () => turnActions
    };
})();
