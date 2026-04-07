// ============================================
// LEVEL 5 — Quantum
// ============================================

class Level5 extends BaseLevel {
    constructor() {
        super();
        this.theme = {
            name: 'Quantum',
            skyTop: '#010108',
            skyMid: '#02020e',
            skyBot: '#030314',
            buildingBase: '#04040f',
            buildingLight: '#07071a',
            groundColor: '#03030a',
            lampColor: { r: 80, g: 140, b: 255 },
            lampIntensity: 0.6,
            moonColor: '#4466dd',
            starAlpha: 0.25,
            enemyCount: 0,
            enemySpeed: 0,
            enemyChaseSpeed: 0,
            fogAlpha: 0.08,
            isBossFight: true
        };

        // Level-owned state
        this.bossPortalSpawnTimer = 0;
    }

    generateCity() {
        // Boss arena — compact world
        CONFIG.worldWidth = 2400;
        platforms.length = 0;

        const groundY = CONFIG.worldHeight - 50;
        const arenaW  = CONFIG.worldWidth;

        // Ground
        platforms.push(new Platform(0, groundY, arenaW, 100, 'ground'));

        // Side walls
        platforms.push(new Platform(0,          groundY - 400, 120, 400, 'building'));
        platforms.push(new Platform(arenaW - 120, groundY - 400, 120, 400, 'building'));

        // Quantum platforms — 3 tiers
        platforms.push(new Platform(arenaW * 0.2  - 80,  groundY - 130, 200, 16, 'quantum'));
        platforms.push(new Platform(arenaW * 0.5  - 100, groundY - 130, 200, 16, 'quantum'));
        platforms.push(new Platform(arenaW * 0.8  - 80,  groundY - 130, 200, 16, 'quantum'));

        platforms.push(new Platform(arenaW * 0.15 - 70,  groundY - 260, 180, 16, 'quantum'));
        platforms.push(new Platform(arenaW * 0.5  - 90,  groundY - 260, 180, 16, 'quantum'));
        platforms.push(new Platform(arenaW * 0.85 - 70,  groundY - 260, 180, 16, 'quantum'));

        platforms.push(new Platform(arenaW * 0.35 - 80,  groundY - 390, 180, 16, 'quantum'));
        platforms.push(new Platform(arenaW * 0.65 - 80,  groundY - 390, 180, 16, 'quantum'));

        // Background buildings (decorative)
        platforms.push(new Platform(130,                    groundY - 350, 200, 350, 'building'));
        platforms.push(new Platform(arenaW * 0.45 - 100,   groundY - 300, 200, 300, 'building'));
        platforms.push(new Platform(arenaW - 330,           groundY - 350, 200, 350, 'building'));

        // Lamps
        for (let x = 200; x < arenaW - 100; x += 350)
            lamps.push(new Lamp(x, groundY - 100));

        // Stars (dense)
        for (let i = 0; i < 180; i++) stars.push(new Star());

        // Quantum particles
        for (let i = 0; i < 60; i++) particles.push(new Particle());

        // Boss
        quantumCat = new QuantumCat(arenaW * 0.65, groundY - 90);

        // Initial portal pair
        const p1 = new Portal(150, groundY - 165);
        const p2 = new Portal(arenaW - 180, groundY - 165);
        p1.linkedPortal = p2;
        p2.linkedPortal = p1;
        portals.push(p1, p2);

        // Intro timer
        bossIntroTimer = 300;

        // Spawn 3 starting orbs
        this._spawnOrb();
        this._spawnOrb();
        this._spawnOrb();
    }

    getElements() {
        return [
            { name: 'quantumCat', value: quantumCat }
        ];
    }

    // ── Boss-fight update ─────────────────────────────────
    updateExtras(state) {
        const { cat, ghosts, CatAudio } = state;
        let result = {};

        if (bossIntroTimer > 0) {
            bossIntroTimer--;
            return result;
        }

        // Update boss
        if (quantumCat && !quantumCat.defeated) {
            quantumCat.update(cat, platforms, portals);

            // Portal pair spawning
            this.bossPortalSpawnTimer++;
            const interval = quantumCat.phase === 1 ? 400
                           : quantumCat.phase === 2 ? 280 : 180;
            if (this.bossPortalSpawnTimer >= interval) {
                this.bossPortalSpawnTimer = 0;
                this._spawnPortalPair();
            }

            // Projectile damage
            if (quantumCat.checkProjectileHit(cat)) {
                if (cat.takeDamage()) {
                    ghosts.push(new GhostCat(cat.x + cat.width / 2, cat.y));
                    cat.vy = -7;
                    CatAudio.play('ouch', 0.45);
                    if (cat.lives <= 0) result.gameOver = true;
                }
            }

            // Body contact damage
            if (quantumCat.checkBodyHit(cat)) {
                if (cat.takeDamage()) {
                    ghosts.push(new GhostCat(cat.x + cat.width / 2, cat.y));
                    cat.vy = -9;
                    cat.vx = (cat.x > quantumCat.x) ? 7 : -7;
                    CatAudio.play('ouch', 0.45);
                    if (cat.lives <= 0) result.gameOver = true;
                }
            }
        }

        // Update portals
        for (let i = portals.length - 1; i >= 0; i--) {
            portals[i].update();
            if (!portals[i].active) portals.splice(i, 1);
        }

        // Cat teleport through portals
        for (const portal of portals) {
            if (portal.checkEntry(cat)) {
                if (portal.isVictory) {
                    portalBursts.push(new PortalBurst(
                        portal.x + portal.width / 2,
                        portal.y + portal.height / 2,
                        true
                    ));
                    portal.useCooldown = 60;
                    result.levelTransition = true;
                    result.score = (CONFIG.level * 200);
                    break;
                }
                const burstPos = portal.teleportCat(cat);
                portalBursts.push(new PortalBurst(burstPos.x, burstPos.y, false));

                if (quantumCat && !quantumCat.defeated) {
                    const exit = portal.linkedPortal;
                    if (exit) {
                        const exitCx = exit.x + exit.width / 2;
                        const bossCx = quantumCat.x + quantumCat.width / 2;
                        if (Math.abs(exitCx - bossCx) < 300) {
                            if (quantumCat.takeDamage()) {
                                this._spawnPortalPair();
                                portalBursts.push(new PortalBurst(
                                    quantumCat.x + quantumCat.width / 2,
                                    quantumCat.y + quantumCat.height / 2
                                ));
                            }
                        }
                    }
                }
                break;
            }
        }

        // Update portal bursts
        for (let i = portalBursts.length - 1; i >= 0; i--) {
            portalBursts[i].update();
            if (portalBursts[i].done) portalBursts.splice(i, 1);
        }

        // Quantum orbs
        for (let i = quantumOrbs.length - 1; i >= 0; i--) {
            const orb = quantumOrbs[i];
            orb.update(cat, quantumCat);

            if (!catHoldsOrb && orb.checkPickup(cat)) {
                orb.collected = true;
                catHoldsOrb   = true;
            }
            if (orb.hitBoss && quantumCat && !quantumCat.defeated) {
                if (quantumCat.takeDamage()) {
                    portalBursts.push(new PortalBurst(
                        quantumCat.x + quantumCat.width / 2,
                        quantumCat.y + quantumCat.height / 2
                    ));
                    result.score = (result.score || 0) + 50;
                }
            }
            if (!orb.active) {
                if (orb.collected) catHoldsOrb = false;
                quantumOrbs.splice(i, 1);
            }
        }

        // Respawn orbs if fewer than 2 on the ground
        const orbsOnGround = quantumOrbs.filter(o => !o.collected && !o.thrown && o.active).length;
        if (orbsOnGround < 2 && CONFIG.time % 180 === 0) this._spawnOrb();

        // Throw orb with SPACE / UP
        if (catHoldsOrb && (state.KEYS.space || state.KEYS.up)) {
            const held = quantumOrbs.find(o => o.collected && o.active);
            if (held && quantumCat && !quantumCat.defeated) {
                held.throwAt(cat, quantumCat);
                catHoldsOrb = false;
                CatAudio.play('ball_fire', 0.45);
            }
        }

        // Boss defeated → spawn victory portal
        if (quantumCat && quantumCat.defeated) {
            if (!portals.some(p => p.isVictory)) {
                const vPortal = new Portal(
                    quantumCat.x + quantumCat.width / 2 - 15,
                    quantumCat.y - 80
                );
                vPortal.isVictory    = true;
                vPortal.linkedPortal = null;
                vPortal.active       = true;
                portals.push(vPortal);
            }
        }

        return result;
    }

    drawExtras(ctx) {
        for (const portal of portals)      portal.draw(ctx);
        for (const pb of portalBursts)     pb.draw(ctx);
        for (const orb of quantumOrbs)     orb.draw(ctx);
        if (quantumCat)                    quantumCat.draw(ctx);
    }

    cleanup() {
        this.bossPortalSpawnTimer = 0;
    }

    // ── Private helpers ────────────────────────────────────

    _spawnPortalPair() {
        const groundY = CONFIG.worldHeight - 50;
        const arenaW  = CONFIG.worldWidth;
        const candidates = [
            { x: 160,              y: groundY - 165 },
            { x: arenaW * 0.2 - 80,  y: groundY - 165 },
            { x: arenaW * 0.5 - 100, y: groundY - 165 },
            { x: arenaW * 0.8 - 80,  y: groundY - 165 },
            { x: arenaW - 200,     y: groundY - 165 },
            { x: arenaW * 0.15 - 70, y: groundY - 295 },
            { x: arenaW * 0.5 - 90,  y: groundY - 295 },
            { x: arenaW * 0.85 - 70, y: groundY - 295 },
            { x: arenaW * 0.35 - 80, y: groundY - 425 },
            { x: arenaW * 0.65 - 80, y: groundY - 425 }
        ];
        const shuffled = candidates.sort(() => Math.random() - 0.5);
        const spot1 = shuffled[0];
        const spot2 = shuffled[1];
        const ttl = 300 + Math.floor(Math.random() * 200);
        const pa = new Portal(spot1.x, spot1.y);
        const pb = new Portal(spot2.x, spot2.y);
        pa.linkedPortal = pb;
        pb.linkedPortal = pa;
        pa.life = ttl;
        pb.life = ttl;
        portals.push(pa, pb);
    }

    _spawnOrb() {
        const groundY = CONFIG.worldHeight - 50;
        const arenaW  = CONFIG.worldWidth;
        const spots = [
            { x: arenaW * 0.12, y: groundY - 40 },
            { x: arenaW * 0.30, y: groundY - 40 },
            { x: arenaW * 0.55, y: groundY - 40 },
            { x: arenaW * 0.78, y: groundY - 40 },
            { x: arenaW * 0.2 - 60,  y: groundY - 170 },
            { x: arenaW * 0.5 - 80,  y: groundY - 170 },
            { x: arenaW * 0.8 - 60,  y: groundY - 170 },
            { x: arenaW * 0.15 - 50, y: groundY - 300 },
            { x: arenaW * 0.5 - 70,  y: groundY - 300 },
            { x: arenaW * 0.85 - 50, y: groundY - 300 }
        ];
        const free = spots.filter(s =>
            !quantumOrbs.some(o => o.active && !o.thrown && Math.abs(o.x - s.x) < 80)
        );
        const spot = free.length ? free[Math.floor(Math.random() * free.length)] : spots[0];
        quantumOrbs.push(new QuantumOrb(spot.x, spot.y));
    }
}
