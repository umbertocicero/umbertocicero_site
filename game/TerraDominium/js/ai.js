/* ═══════════════════════════════════════════════════════
   GeoDominion — Autonomous AI System  (v2)
   Every non-player nation acts independently each turn:
   evaluate → economy → diplomacy → military → chain reactions
   ═══════════════════════════════════════════════════════ */

const AI = (() => {
    /* Keep track of AI actions this turn for UI visualization */
    let turnActions = [];

    /* ════════════════ MAIN: PROCESS ALL AI ════════════════ */
    async function processAllAI(onActionCallback) {
        turnActions = [];
        const state = GameEngine.getState();
        if (!state || state.gameOver) return turnActions;

        const aiNations = GameEngine.getAINations();

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
        /* Tag revolt events as actions for UI animation */
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

        /* Step 3: Economy — build units */
        const buildActions = doEconomy(code, situation, profile);
        actions.push(...buildActions);

        /* Step 4: Diplomacy — alliances, sanctions, peace */
        const diploActions = doDiplomacy(code, situation, profile);
        actions.push(...diploActions);

        /* Step 5: Military — attack, defend, expand */
        const milActions = doMilitary(code, situation, profile);
        actions.push(...milActions);

        /* Step 6: Research */
        const techActions = doResearch(code, profile);
        actions.push(...techActions);

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

        const atWar = GameEngine.getWarsFor(code);
        const enemies = atWar.map(w => w.attacker === code ? w.defender : w.attacker);
        const allies  = state.alliances
            .filter(a => a.a === code || a.b === code)
            .map(a => a.a === code ? a.b : a.a);

        /* Find neighbors and their power */
        const neighborOwners = GameEngine.getNeighborOwners(code);
        const threats = [];
        const opportunities = [];

        neighborOwners.forEach(nc => {
            const nn = state.nations[nc];
            if (!nn || !nn.alive || nc === code) return;
            const nPow = GameEngine.calcMilitary(nc, 'atk');
            const nDefPow = GameEngine.calcMilitary(nc, 'def');
            const nTerr = GameEngine.getTerritoryCount(nc);
            const rel = GameEngine.getRelation(code, nc);

            if (nPow > myDefPow * 1.2 && rel < 0) {
                threats.push({ code: nc, power: nPow, relation: rel });
            }

            /* Easier opportunity threshold — especially in late game */
            const lateGameBonus = state.turn > 50 ? 0.2 : 0;
            const isAlly = GameEngine.isAlly(code, nc);
            if (!isAlly && myAtkPow > nDefPow * (1.0 + lateGameBonus)) {
                opportunities.push({ code: nc, power: nDefPow, relation: rel, terr: nTerr });
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
        const dominantThreat = maxTerr > SVG_IDS.length * 0.20; // lowered from 25% to 20%

        /* Late-game restlessness: scales from 0 at turn 50 to 1.0 at turn 200+ */
        const restlessness = Math.min(1.0, Math.max(0, (state.turn - 50) / 150));

        /* Homeland check: is our homeland occupied by someone else? */
        const homeland = n.homeland || code;
        const homelandOwner = state.territories[homeland];
        const homelandLost = homelandOwner && homelandOwner !== code;
        const homelandEnemy = homelandLost ? homelandOwner : null;

        return {
            myTerrCount, myAtkPow, myDefPow, myWealth,
            enemies, allies, threats, opportunities,
            dominant, dominantThreat, maxTerr,
            neighborOwners, atWar, restlessness,
            homelandLost, homelandEnemy, homeland
        };
    }

    /* ════════════════ ECONOMY ════════════════ */
    function doEconomy(code, situation, profile) {
        const actions = [];
        const state = GameEngine.getState();
        const n = state.nations[code];

        /* Decide what to build based on situation */
        let buildPriority = [];

        if (situation.threats.length > 0) {
            /* Defensive: SAM, infantry, tanks */
            buildPriority = ['sam','infantry','tank','fighter','drone'];
        } else if (situation.opportunities.length > 0 && profile.aggression > 0.4) {
            /* Offensive: tanks, fighters, drones */
            buildPriority = ['tank','fighter','drone','bomber','infantry','cruiseMissile'];
        } else {
            /* Balanced */
            buildPriority = ['infantry','tank','drone','fighter','sam','navy'];
        }

        /* Build up to 3 units per turn */
        let built = 0;
        for (const utype of buildPriority) {
            if (built >= 3) break;
            if (GameEngine.canBuild(code, utype)) {
                GameEngine.buildUnit(code, utype);
                actions.push({ type:'build', nation:code, unit:utype });
                built++;
            }
        }

        /* High tech nations occasionally build advanced units */
        if (profile.techFocus > 0.5 && Math.random() < profile.techFocus * 0.3) {
            const advUnits = ['drone','cruiseMissile','submarine'];
            for (const u of advUnits) {
                if (built >= 4) break;
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

        /* Coalition against dominant nation */
        if (situation.dominantThreat && situation.dominant !== code) {
            const dom = situation.dominant;
            /* Declare war on dominant — higher chance in late game */
            if (!GameEngine.isAtWar(code, dom) && profile.aggression > 0.2) {
                const coalitionChance = 0.3 + situation.restlessness * 0.3;
                if (Math.random() < coalitionChance) {
                    GameEngine.ensureWar(code, dom);
                    actions.push({ type:'war_declare', nation:code, target:dom });
                }
            }
            /* Seek alliance with other threatened nations */
            situation.neighborOwners.forEach(nc => {
                if (nc !== dom && !GameEngine.isAlly(code, nc) && state.nations[nc]?.alive) {
                    const ncRel = GameEngine.getRelation(nc, dom);
                    if (ncRel < -10 && Math.random() < profile.diplomacy * 0.4) {
                        GameEngine.makeAlliance(code, nc);
                        actions.push({ type:'alliance', nation:code, target:nc });
                    }
                }
            });
        }

        /* Seek allies among neighbors with good relations */
        if (profile.diplomacy > 0.5 && situation.allies.length < 3) {
            situation.neighborOwners.forEach(nc => {
                if (GameEngine.isAlly(code, nc) || GameEngine.isAtWar(code, nc)) return;
                const rel = GameEngine.getRelation(code, nc);
                if (rel > 20 && Math.random() < profile.diplomacy * 0.2) {
                    GameEngine.makeAlliance(code, nc);
                    actions.push({ type:'alliance', nation:code, target:nc });
                }
            });
        }

        /* Sanction aggressive nations */
        situation.threats.forEach(t => {
            const tn = state.nations[t.code];
            if (tn && tn.nukesUsed > 0 && Math.random() < 0.6) {
                GameEngine.addSanction(code, t.code);
                actions.push({ type:'sanction', nation:code, target:t.code });
            }
        });

        /* Peace proposals: tired of war — but harder in late game */
        situation.enemies.forEach(enemy => {
            /* NEVER make peace with homeland occupier */
            if (situation.homelandLost && enemy === situation.homelandEnemy) return;
            const war = state.wars.find(w =>
                (w.attacker === code && w.defender === enemy) ||
                (w.attacker === enemy && w.defender === code));
            /* War must last longer before peace: 5 turns early → 15+ late game */
            const minWarTurns = Math.round(5 + situation.restlessness * 10);
            if (war && (state.turn - war.turn) > minWarTurns && profile.diplomacy > 0.4) {
                /* Peace chance reduced in late game */
                const peaceChance = 0.25 * (1 - situation.restlessness * 0.6);
                if (Math.random() < peaceChance) {
                    GameEngine.makePeace(code, enemy);
                    actions.push({ type:'peace', nation:code, target:enemy });
                }
            }
        });

        /* ── ANTI-STALL: if at peace for too long, pick a fight ── */
        if (situation.enemies.length === 0 && state.turn > 10) {
            /* Check how many turns with no war */
            const myWars = state.wars.filter(w => w.attacker === code || w.defender === code);
            const lastWarTurn = myWars.length ? Math.max(...myWars.map(w => w.turn)) : 0;
            const peaceTurns = state.turn - lastWarTurn;
            /* After 8+ turns of peace, increasing chance to start a war */
            if (peaceTurns > 8 && Math.random() < 0.15 + situation.restlessness * 0.3) {
                const potVictims = situation.neighborOwners.filter(nc =>
                    !GameEngine.isAlly(code, nc) && !GameEngine.isAtWar(code, nc) && state.nations[nc]?.alive);
                if (potVictims.length > 0) {
                    potVictims.sort((a, b) => GameEngine.calcMilitary(a, 'def') - GameEngine.calcMilitary(b, 'def'));
                    const v = potVictims[0];
                    GameEngine.ensureWar(code, v);
                    actions.push({ type:'war_declare', nation:code, target:v });
                }
            }
        }

        /* Betrayal: opportunists may break alliances (more likely in late game) */
        const betrayChance = 0.05 + situation.restlessness * 0.1;
        if (profile.aggression > 0.3 && Math.random() < betrayChance) {
            const weakAlly = situation.allies.find(a => {
                const ap = GameEngine.calcMilitary(a, 'def');
                return ap < situation.myAtkPow * 0.6; // easier threshold (was 0.4)
            });
            if (weakAlly) {
                GameEngine.breakAlliance(code, weakAlly);
                actions.push({ type:'betray', nation:code, target:weakAlly });
            }
        }

        return actions;
    }

    /* ════════════════ MILITARY ════════════════ */
    function doMilitary(code, situation, profile) {
        const actions = [];
        const state = GameEngine.getState();
        const n = state.nations[code];
        const restless = situation.restlessness; // 0-1, grows over turns

        /* ── PRIORITY 0: Homeland reconquest ── */
        if (situation.homelandLost && situation.homelandEnemy) {
            const enemy = situation.homelandEnemy;
            /* Ensure at war with homeland occupier */
            if (!GameEngine.isAtWar(code, enemy)) {
                GameEngine.ensureWar(code, enemy);
                actions.push({ type:'war_declare', nation:code, target:enemy });
            }
            /* Try to attack homeland directly */
            const hlTargets = findAttackTargets(code, enemy);
            if (hlTargets.includes(situation.homeland)) {
                const result = GameEngine.attack(code, situation.homeland);
                if (result) actions.push({ type:'attack', nation:code, target:situation.homeland, result });
            } else if (hlTargets.length > 0) {
                /* Attack any adjacent territory to get closer to homeland */
                const result = GameEngine.attack(code, hlTargets[0]);
                if (result) actions.push({ type:'attack', nation:code, target:hlTargets[0], result });
            }
        }

        /* Already at war? Attack enemy territories (multiple attacks per turn!) */
        if (situation.enemies.length > 0) {
            const maxAttacks = 1 + Math.floor(restless * 2); // 1 early, up to 3 late
            let attacksMade = 0;

            for (const enemy of situation.enemies) {
                if (attacksMade >= maxAttacks) break;
                const targets = findAttackTargets(code, enemy);
                if (targets.length > 0 && situation.myAtkPow > 5) {
                    /* Pick best target: prefer weak defenders or strategic */
                    const target = targets[Math.floor(Math.random() * targets.length)];
                    const result = GameEngine.attack(code, target);
                    if (result) {
                        actions.push({ type:'attack', nation:code, target, result });
                        attacksMade++;
                    }
                }
            }
        }

        /* Expansion: attack weaker neighbors (main expansion driver) */
        const expansionChance = profile.expansion + restless * 0.4; // grows over time
        if (expansionChance > Math.random() && situation.opportunities.length > 0) {
            /* Sort by weakest first */
            situation.opportunities.sort((a, b) => a.power - b.power);
            const victim = situation.opportunities[0];

            /* Only attack if not ally */
            if (!GameEngine.isAlly(code, victim.code)) {
                const targets = findAttackTargets(code, victim.code);
                if (targets.length > 0) {
                    /* Declare war first */
                    if (!GameEngine.isAtWar(code, victim.code)) {
                        GameEngine.ensureWar(code, victim.code);
                        actions.push({ type:'war_declare', nation:code, target:victim.code });
                    }
                    const target = targets[0];
                    const result = GameEngine.attack(code, target);
                    if (result) {
                        actions.push({ type:'attack', nation:code, target, result });
                    }
                }
            }
        }

        /* Late-game aggression: even "peaceful" nations get aggressive over time */
        const warChance = (profile.aggression + restless * 0.35) * 0.25;
        if (situation.enemies.length < 2 && Math.random() < warChance) {
            /* Pick a neighbor — prefer those with negative relations, but accept any non-ally */
            const potentialTargets = situation.neighborOwners.filter(nc => {
                if (GameEngine.isAlly(code, nc) || GameEngine.isAtWar(code, nc)) return false;
                if (!state.nations[nc]?.alive) return false;
                /* In late game, attack even neutral neighbors */
                const rel = GameEngine.getRelation(code, nc);
                return rel < (30 - restless * 50); // threshold drops from 30 to -20 over time
            });
            if (potentialTargets.length > 0) {
                /* Prefer weaker targets */
                potentialTargets.sort((a, b) =>
                    GameEngine.calcMilitary(a, 'def') - GameEngine.calcMilitary(b, 'def'));
                const tgt = potentialTargets[0];
                GameEngine.ensureWar(code, tgt);
                actions.push({ type:'war_declare', nation:code, target:tgt });

                /* Immediately attack if possible */
                const targets = findAttackTargets(code, tgt);
                if (targets.length > 0) {
                    const result = GameEngine.attack(code, targets[0]);
                    if (result) {
                        actions.push({ type:'attack', nation:code, target:targets[0], result });
                    }
                }
            }
        }

        /* Nuclear option: only for unstable/desperate nations */
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

        return actions;
    }

    /* Find territories of enemy adjacent to attacker's territory */
    function findAttackTargets(attackerCode, enemyCode) {
        const state = GameEngine.getState();
        const myTerritories = new Set(
            Object.entries(state.territories)
                .filter(([, o]) => o === attackerCode).map(([c]) => c)
        );
        const enemyTerritories = Object.entries(state.territories)
            .filter(([, o]) => o === enemyCode).map(([c]) => c);

        /* Use global ADJACENCY map: an enemy territory is a valid target if
           any of our owned territories is its neighbor (symmetric check) */
        return enemyTerritories.filter(et => {
            const neighbors = getNeighborsOf(et);
            return neighbors.some(nb => myTerritories.has(nb));
        });
    }

    /* ════════════════ RESEARCH ════════════════ */
    function doResearch(code, profile) {
        const actions = [];
        if (Math.random() > profile.techFocus * 0.5) return actions;

        /* Pick a random affordable tech */
        const available = TECHNOLOGIES.filter(t => GameEngine.canResearch(code, t.id));
        if (available.length > 0) {
            const tech = available[Math.floor(Math.random() * available.length)];
            GameEngine.research(code, tech.id);
            actions.push({ type:'research', nation:code, tech:tech.id });
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
