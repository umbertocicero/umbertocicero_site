/* ═══════════════════════════════════════════════════════
   GeoDominion — Autonomous AI System  (v3 — Strategic)
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
        const overextended = colonyCount > 0 && (totalUnits / Math.max(1, colonyCount)) < 8;

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

            if (hasLongRange) {
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
        const dominantThreat = maxTerr > SVG_IDS.length * 0.20;

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
    function _scoreAllTargets(code, state, n, enemies, allies) {
        const atkArmy = n.army || {};
        const scored = [];  // {territory, owner, score, breakdown}

        /* All territories not owned by us */
        const myTerritories = new Set();
        const enemyTerritories = [];
        for (const tCode of SVG_IDS) {
            if (state.territories[tCode] === code) myTerritories.add(tCode);
            else enemyTerritories.push(tCode);
        }

        /* Pre-compute: which owners are we at war with? */
        const atWarWith = new Set(enemies);

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

        /* Only score reachable territories */
        for (const tCode of enemyTerritories) {
            const owner = state.territories[tCode];
            const ownerNation = state.nations[owner];
            if (!ownerNation || !ownerNation.alive) continue;
            if (GameEngine.isAlly(code, owner)) continue;

            /* Reachability check */
            let reachable = false;
            if (typeof canReachTerritory === 'function') {
                const reach = canReachTerritory(code, tCode, atkArmy);
                reachable = reach.reachable;
            } else {
                const neighbors = getNeighborsOf(tCode);
                reachable = neighbors.some(nb => myTerritories.has(nb));
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
                score += assetVal * 3;  // strategic assets are highly valuable
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
            if (ownerTerr <= 2) {
                breakdown.elimination = 25;
                score += 25;  // finishing off a nation is very valuable
            }

            /* 10. Penalize attacking dominant nation's homeland (dangerous!) */
            const defHomeland = ownerNation.homeland || owner;
            if (tCode === defHomeland && (ownerNation.power || 0) >= 60) {
                breakdown.homelandPenalty = -40;
                score -= 40;
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
                buildPriority = ['tank','infantry','fighter','infantry','drone','bomber','infantry','cruiseMissile'];
                break;
            case 'consolidate':
                /* Mostly defensive + some infantry for garrison */
                buildPriority = ['infantry','sam','infantry','infantry','tank','infantry'];
                break;
            case 'defend':
                buildPriority = ['infantry','sam','tank','infantry','fighter','drone','infantry'];
                break;
            case 'warfight':
                /* Active war: balanced offense */
                buildPriority = ['infantry','tank','fighter','infantry','drone','infantry','bomber','cruiseMissile'];
                break;
            case 'dominate':
                /* Late-game domination: heavy firepower */
                buildPriority = ['tank','fighter','bomber','drone','infantry','cruiseMissile','navy','submarine'];
                break;
            default: /* expand */
                /* Need projection: mix of mobile + cheap */
                if (situation.scoredTargets.length > 0) {
                    /* Check if top targets are overseas (need navy/air) */
                    const topTarget = situation.scoredTargets[0];
                    const needsSea = topTarget && !situation.neighborOwners.includes(topTarget.owner);
                    if (needsSea && (n.army.navy || 0) < 3) {
                        buildPriority = ['navy','infantry','fighter','infantry','drone','infantry','submarine'];
                    } else {
                        buildPriority = ['infantry','tank','fighter','infantry','drone','infantry','infantry','bomber'];
                    }
                } else {
                    buildPriority = ['infantry','infantry','tank','drone','infantry','fighter','sam','navy'];
                }
                break;
        }

        /* Build scaling: more units for richer nations */
        const maxBuilds = Math.min(10, 3 + Math.floor(money / 200));
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

        /* ── Coalition against dominant nation ── */
        if (situation.dominantThreat && situation.dominant !== code) {
            const dom = situation.dominant;
            if (!GameEngine.isAtWar(code, dom) && profile.aggression > 0.2) {
                const coalitionChance = 0.3 + situation.restlessness * 0.3;
                if (Math.random() < coalitionChance) {
                    GameEngine.ensureWar(code, dom);
                    actions.push({ type:'war_declare', nation:code, target:dom });
                }
            }
            /* Seek alliances against the dominant */
            (situation.reachableOwners || situation.neighborOwners).forEach(nc => {
                if (nc !== dom && !GameEngine.isAlly(code, nc) && state.nations[nc]?.alive) {
                    const ncRel = GameEngine.getRelation(nc, dom);
                    if (ncRel < -10 && Math.random() < profile.diplomacy * 0.4) {
                        GameEngine.makeAlliance(code, nc);
                        actions.push({ type:'alliance', nation:code, target:nc });
                    }
                }
            });
        }

        /* ── Seek allies among neighbors ── */
        if (profile.diplomacy > 0.3 && situation.allies.length < 3) {
            situation.neighborOwners.forEach(nc => {
                if (GameEngine.isAlly(code, nc) || GameEngine.isAtWar(code, nc)) return;
                if (!state.nations[nc]?.alive) return;
                const rel = GameEngine.getRelation(code, nc);
                if (rel > 5 && Math.random() < profile.diplomacy * 0.35) {
                    GameEngine.makeAlliance(code, nc);
                    actions.push({ type:'alliance', nation:code, target:nc });
                }
            });
        }

        /* ── Enemy-of-my-enemy ── */
        if (situation.enemies.length > 0 && situation.allies.length < 4) {
            situation.enemies.forEach(enemy => {
                const enemyWars = GameEngine.getWarsFor(enemy);
                enemyWars.forEach(w => {
                    const otherFighter = w.attacker === enemy ? w.defender : w.attacker;
                    if (otherFighter === code) return;
                    if (!state.nations[otherFighter]?.alive) return;
                    if (GameEngine.isAlly(code, otherFighter) || GameEngine.isAtWar(code, otherFighter)) return;
                    if (Math.random() < 0.3 * profile.diplomacy) {
                        GameEngine.makeAlliance(code, otherFighter);
                        actions.push({ type:'alliance', nation:code, target:otherFighter });
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
                    /* Join ally's war with moderate probability */
                    if (Math.random() < 0.25 * profile.aggression) {
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
        situation.enemies.forEach(enemy => {
            if (situation.homelandLost && enemy === situation.homelandEnemy) return;
            const war = state.wars.find(w =>
                (w.attacker === code && w.defender === enemy) ||
                (w.attacker === enemy && w.defender === code));
            const minWarTurns = Math.round(5 + situation.restlessness * 10);
            if (war && (state.turn - war.turn) > minWarTurns && profile.diplomacy > 0.4) {
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

        /* ── Anti-stall: if at peace too long, start a strategic war ── */
        if (situation.enemies.length === 0 && state.turn > 10) {
            const myWars = state.wars.filter(w => w.attacker === code || w.defender === code);
            const lastWarTurn = myWars.length ? Math.max(...myWars.map(w => w.turn)) : 0;
            const peaceTurns = state.turn - lastWarTurn;
            if (peaceTurns > 8 && Math.random() < 0.15 + situation.restlessness * 0.3) {
                /* Use scored targets to pick the BEST victim, not just weakest */
                if (situation.scoredTargets.length > 0) {
                    const bestTarget = situation.scoredTargets[0];
                    const victim = bestTarget.owner;
                    if (!GameEngine.isAlly(code, victim) && !GameEngine.isAtWar(code, victim)) {
                        GameEngine.ensureWar(code, victim);
                        actions.push({ type:'war_declare', nation:code, target:victim });
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

        /* ── Skip expansion if consolidating ── */
        if (situation.goal === 'consolidate') {
            /* Only attack if already at war (defensive actions) */
            if (situation.enemies.length > 0) {
                const targets = situation.scoredTargets.filter(t => situation.enemies.includes(t.owner));
                if (targets.length > 0 && situation.myAtkPow > 5) {
                    const result = GameEngine.attack(code, targets[0].territory);
                    if (result) actions.push({ type:'attack', nation:code, target:targets[0].territory, result });
                }
            }
            return actions;
        }

        /* ── PRIORITY 0: Homeland reconquest ── */
        if (situation.homelandLost && situation.homelandEnemy) {
            const enemy = situation.homelandEnemy;
            if (!GameEngine.isAtWar(code, enemy)) {
                GameEngine.ensureWar(code, enemy);
                actions.push({ type:'war_declare', nation:code, target:enemy });
            }
            /* Homeland will be scored highest (200 pts), so it'll be first in scoredTargets */
            const homelandTarget = situation.scoredTargets.find(t => t.territory === situation.homeland);
            if (homelandTarget) {
                const result = GameEngine.attack(code, situation.homeland);
                if (result) actions.push({ type:'attack', nation:code, target:situation.homeland, result });
            } else {
                /* Can't reach homeland directly — attack any territory of occupier */
                const pathTargets = situation.scoredTargets.filter(t => t.owner === enemy);
                if (pathTargets.length > 0) {
                    const result = GameEngine.attack(code, pathTargets[0].territory);
                    if (result) actions.push({ type:'attack', nation:code, target:pathTargets[0].territory, result });
                }
            }
        }

        /* ── Active war: use scored targets to pick the best territory to attack ── */
        if (situation.enemies.length > 0 && situation.myAtkPow > 5) {
            const maxAttacks = 1 + Math.floor(restless * 2); // 1 early, up to 3 late
            let attacksMade = 0;

            /* Filter scored targets to only those owned by current enemies */
            const warTargets = situation.scoredTargets.filter(t => situation.enemies.includes(t.owner));

            for (const tgt of warTargets) {
                if (attacksMade >= maxAttacks) break;
                const result = GameEngine.attack(code, tgt.territory);
                if (result) {
                    actions.push({ type:'attack', nation:code, target:tgt.territory, result });
                    attacksMade++;
                    /* If we lost badly, stop attacking */
                    if (result.blocked || !result.success) break;
                }
            }
        }

        /* ── Strategic expansion: declare war on highest-value target ── */
        const expansionChance = profile.expansion + restless * 0.4;
        if (expansionChance > Math.random() && !situation.overextended) {
            /* Find best non-war target from scored list */
            const expansionTarget = situation.scoredTargets.find(t =>
                !situation.enemies.includes(t.owner) &&
                !GameEngine.isAlly(code, t.owner) &&
                state.nations[t.owner]?.alive
            );

            if (expansionTarget && expansionTarget.score > 15) {
                const victim = expansionTarget.owner;
                if (!GameEngine.isAtWar(code, victim)) {
                    GameEngine.ensureWar(code, victim);
                    actions.push({ type:'war_declare', nation:code, target:victim });
                }
                const result = GameEngine.attack(code, expansionTarget.territory);
                if (result) {
                    actions.push({ type:'attack', nation:code, target:expansionTarget.territory, result });
                }
            }
        }

        /* ── Late-game aggression: restless nations attack more ── */
        const warChance = (profile.aggression + restless * 0.35) * 0.25;
        if (situation.enemies.length < 2 && Math.random() < warChance && !situation.overextended) {
            const potentialTargets = situation.scoredTargets.filter(t =>
                !GameEngine.isAlly(code, t.owner) &&
                !GameEngine.isAtWar(code, t.owner) &&
                state.nations[t.owner]?.alive
            );
            if (potentialTargets.length > 0) {
                const best = potentialTargets[0];
                GameEngine.ensureWar(code, best.owner);
                actions.push({ type:'war_declare', nation:code, target:best.owner });
                const result = GameEngine.attack(code, best.territory);
                if (result) {
                    actions.push({ type:'attack', nation:code, target:best.territory, result });
                }
            }
        }

        /* ── Nuclear option ── */
        if (profile.nukeTolerance > 0 && (n.army.nuke || 0) > 0) {
            const desperate = situation.myTerrCount < 3 || situation.threats.length > 3;
            if (desperate && Math.random() < profile.nukeTolerance * 0.2) {
                if (situation.enemies.length > 0) {
                    const enemy = situation.enemies[0];
                    const targets = findAttackTargets(code, enemy);
                    if (targets.length > 0) {
                        const result = GameEngine.nukeStrike(code, targets[0]);
                        if (result) {
                            actions.push({ type:'nuke', nation:code, target:targets[0], result });
                        }
                    }
                }
            }
        }

        /* ── Opportunistic: finish off defenseless nations ── */
        (situation.reachableOwners || situation.neighborOwners).forEach(nc => {
            if (GameEngine.isAlly(code, nc) || nc === code) return;
            const nn = state.nations[nc];
            if (!nn || !nn.alive) return;
            const nDefPow = GameEngine.calcMilitary(nc, 'def');
            if (nDefPow < 5 && situation.myAtkPow > 10) {
                const targets = findAttackTargets(code, nc);
                if (targets.length > 0) {
                    if (!GameEngine.isAtWar(code, nc)) {
                        GameEngine.ensureWar(code, nc);
                        actions.push({ type:'war_declare', nation:code, target:nc });
                    }
                    const result = GameEngine.attack(code, targets[0]);
                    if (result) {
                        actions.push({ type:'attack', nation:code, target:targets[0], result });
                    }
                }
            }
        });

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
            return enemyTerritories.filter(et => {
                const reach = canReachTerritory(attackerCode, et, atkArmy);
                return reach.reachable;
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
        if (Math.random() > profile.techFocus * 0.5) return actions;

        const available = TECHNOLOGIES.filter(t => GameEngine.canResearch(code, t.id));
        if (available.length === 0) return actions;

        /* ── Prioritize techs based on goal ── */
        const goalPriority = {
            reconquest:  ['ai_warfare','hypersonic','stealth_tech','carrier_fleet','advanced_drones'],
            warfight:    ['ai_warfare','stealth_tech','advanced_drones','missile_defense','hypersonic'],
            defend:      ['missile_defense','bio_defense','sam','cyberwarfare'],
            expand:      ['carrier_fleet','advanced_drones','green_energy','deep_mining'],
            consolidate: ['green_energy','deep_mining','bio_defense','cyberwarfare'],
            dominate:    ['nuclear_program','hypersonic','ai_warfare','stealth_tech','space_recon']
        };
        const preferred = goalPriority[situation.goal] || goalPriority.expand;

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
