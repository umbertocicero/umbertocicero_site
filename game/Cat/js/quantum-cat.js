// ============================================
// QUANTUM CAT - Boss finale Livello 5
// Gatto quantistico che teleporta, si clona, spara proiettili.
// 3 fasi di salute. Sconfitto raccogliendo ORB e lanciandole.
// ============================================

// ============================================
// QUANTUM ORB — pickup da raccogliere e lanciare
// ============================================
class QuantumOrb {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 26;
        this.height = 26;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.collected = false;
        this.active = true;
        this.lifetime = 900;  // ~15 sec, poi respawn
        this.timer = 0;
        // Proiettile lanciato
        this.thrown = false;
        this.tx = 0; this.ty = 0;   // posizione quando è in volo
        this.tvx = 0; this.tvy = 0;
        this.trailPoints = [];
        this.hitBoss = false;
    }

    update(cat, quantumCat) {
        if (!this.active) return;

        if (this.thrown) {
            // Volo del proiettile
            this.trailPoints.push({ x: this.tx, y: this.ty });
            if (this.trailPoints.length > 12) this.trailPoints.shift();
            this.tx += this.tvx;
            this.ty += this.tvy;
            this.tvy += 0.12; // piccola gravità
            this.timer++;
            if (this.timer > 180 || this.ty > CONFIG.worldHeight) {
                this.active = false; // scomparsa
                return;
            }
            // Colpisce il boss
            if (quantumCat && !quantumCat.defeated && !this.hitBoss) {
                const bx = quantumCat.x + quantumCat.width / 2;
                const by = quantumCat.y + quantumCat.height / 2;
                const dx = this.tx - bx;
                const dy = this.ty - by;
                if (Math.sqrt(dx * dx + dy * dy) < 35) {
                    this.hitBoss = true;
                    this.active = false;
                    return;
                }
            }
            return;
        }

        if (this.collected) return; // tenuta dal gatto

        this.bobOffset += 0.06;
        this.timer++;
        if (this.timer >= this.lifetime) this.active = false;
    }

    // Il gatto la raccoglie
    checkPickup(cat) {
        if (this.collected || this.thrown || !this.active) return false;
        return cat.x < this.x + this.width &&
               cat.x + cat.width > this.x &&
               cat.y < this.y + this.height &&
               cat.y + cat.height > this.y;
    }

    // Lancia l'orb verso il boss
    throwAt(cat, quantumCat) {
        if (!quantumCat) return;
        this.collected = false;
        this.thrown = true;
        this.timer = 0;
        this.trailPoints = [];
        this.hitBoss = false;
        // Posizione di partenza: mani del gatto
        this.tx = cat.x + cat.width / 2;
        this.ty = cat.y + cat.height * 0.3;
        // Direzione verso il boss con velocità
        const bx = quantumCat.x + quantumCat.width / 2;
        const by = quantumCat.y + quantumCat.height / 2;
        const dx = bx - this.tx;
        const dy = by - this.ty;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 12;
        this.tvx = (dx / dist) * speed;
        this.tvy = (dy / dist) * speed;
    }

    draw(ctx) {
        if (!this.active) return;
        const t = CONFIG.time;

        if (this.thrown) {
            // Trail
            for (let i = 0; i < this.trailPoints.length; i++) {
                const pct = i / this.trailPoints.length;
                ctx.fillStyle = `rgba(80,220,255,${pct * 0.5})`;
                ctx.beginPath();
                ctx.arc(this.trailPoints[i].x, this.trailPoints[i].y, 8 * pct, 0, Math.PI * 2);
                ctx.fill();
            }
            // Orb in volo
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'rgba(80,220,255,1)';
            const g = ctx.createRadialGradient(this.tx, this.ty, 0, this.tx, this.ty, 14);
            g.addColorStop(0, 'rgba(200,240,255,1)');
            g.addColorStop(0.4, 'rgba(80,200,255,0.9)');
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(this.tx, this.ty, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            return;
        }

        if (this.collected) return; // non disegnare: è tenuta dal gatto

        const bobY = Math.sin(this.bobOffset) * 4;
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2 + bobY;
        const pulse = 0.6 + Math.sin(t * 0.1 + this.bobOffset) * 0.35;
        const fade = this.timer > this.lifetime - 120 ? (this.lifetime - this.timer) / 120 : 1;

        // Glow esterno
        ctx.shadowBlur = 0;
        const outerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40);
        outerGlow.addColorStop(0, `rgba(60,200,255,${pulse * 0.35 * fade})`);
        outerGlow.addColorStop(0.5, `rgba(40,140,220,${pulse * 0.12 * fade})`);
        outerGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, 40, 0, Math.PI * 2);
        ctx.fill();

        // Sfera
        ctx.shadowBlur = 12;
        ctx.shadowColor = `rgba(80,200,255,${pulse})`;
        const orbGrad = ctx.createRadialGradient(cx - 4, cy - 4, 0, cx, cy, 13);
        orbGrad.addColorStop(0, `rgba(200,240,255,${fade})`);
        orbGrad.addColorStop(0.35, `rgba(80,180,255,${0.95 * fade})`);
        orbGrad.addColorStop(0.75, `rgba(40,100,220,${0.85 * fade})`);
        orbGrad.addColorStop(1, `rgba(20,60,180,${0.7 * fade})`);
        ctx.fillStyle = orbGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Anello orbitante
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t * 0.07);
        ctx.strokeStyle = `rgba(120,220,255,${0.6 * pulse * fade})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Etichetta
        ctx.fillStyle = `rgba(180,230,255,${0.7 * fade})`;
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ORB', cx, cy - 20);
        ctx.textAlign = 'left';
    }
}

class QuantumProjectile {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = 5;
        this.life = 120;
        this.active = true;
        this.trail = [];
    }

    update() {
        if (!this.active) return;
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 8) this.trail.shift();
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.05; // leggera gravità
        this.life--;
        if (this.life <= 0) this.active = false;
    }

    checkHit(cat) {
        if (!this.active || cat.invincible) return false;
        const dx = (cat.x + cat.width / 2) - this.x;
        const dy = (cat.y + cat.height / 2) - this.y;
        return Math.sqrt(dx * dx + dy * dy) < this.radius + 18;
    }

    draw(ctx) {
        if (!this.active) return;

        // Trail
        for (let i = 0; i < this.trail.length; i++) {
            const t = i / this.trail.length;
            ctx.fillStyle = `rgba(100,160,255,${t * 0.4})`;
            ctx.beginPath();
            ctx.arc(this.trail[i].x, this.trail[i].y, this.radius * t, 0, Math.PI * 2);
            ctx.fill();
        }

        // Core
        const pulse = 0.8 + Math.sin(CONFIG.time * 0.3) * 0.2;
        ctx.shadowBlur = 14;
        ctx.shadowColor = 'rgba(100,200,255,0.9)';
        const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 2);
        g.addColorStop(0, 'rgba(220,240,255,0.95)');
        g.addColorStop(0.4, `rgba(100,180,255,${pulse})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// ────────────────────────────────────────────
class QuantumCat {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 45;
        this.height = 35;
        this.vx = 0;
        this.vy = 0;
        this.facing = -1;
        this.onGround = false;

        // ── Salute e fasi ──
        this.maxHp = 9;                  // 3 hp per fase
        this.hp = this.maxHp;
        this.phase = 1;                  // 1, 2, 3
        this.hitCooldown = 0;            // invincibilità temporanea dopo un colpo
        this.hitFlash = 0;
        this.defeated = false;

        // ── Portali spawned sul boss ──
        this.portalHitsThisPhase = 0;    // quanti portali sono stati usati per colpirlo

        // ── Teletrasporto ──
        this.teleportTimer = 0;
        this.teleportInterval = 300;     // ogni 5 sec (fase 1)
        this.isTeleporting = false;
        this.teleportFade = 0;           // 0→1 fade out, 1→0 fade in
        this.teleportTarget = null;

        // ── Proiettili ──
        this.shootTimer = 0;
        this.shootInterval = 180;        // ogni 3 sec (fase 1)
        this.projectiles = [];

        // ── Cloni (fase 2+) ──
        this.clones = [];                // array di { x, y, vx, facing, life }
        this.spawnCloneTimer = 0;
        this.spawnCloneInterval = 400;

        // ── Movimento ──
        this.speed = 2.8;
        this.jumpForce = -14;
        this.jumpCooldown = 0;
        this.stuckTimer = 0;
        this.lastX = x;
        this.thinkTimer = 0;

        // ── Animazione ──
        this.animFrame = 0;
        this.animTimer = 0;
        this.state = 'idle';
        this.tailWag = 0;
        this.eyeBlink = 0;
        this.earTwitch = 0;

        // ── Luce pulsante blu ──
        this.glowPhase = Math.random() * Math.PI * 2;

        // ── Intro delay ──
        this.introTimer = 180; // 3 sec prima di iniziare ad attaccare
    }

    // ──────────────────────────────────────────
    // UPDATE
    // ──────────────────────────────────────────
    update(cat, platforms, portals) {
        if (this.defeated) return;

        // Intro
        if (this.introTimer > 0) {
            this.introTimer--;
            this._applyGravity(platforms);
            this._animate();
            return;
        }

        // Flash invincibilità
        if (this.hitCooldown > 0) this.hitCooldown--;
        if (this.hitFlash > 0) this.hitFlash--;

        // Teletrasporto
        this.teleportTimer++;
        if (this.teleportTimer >= this.teleportInterval && !this.isTeleporting) {
            this._startTeleport(cat, platforms);
        }
        if (this.isTeleporting) {
            this._updateTeleport();
        }

        // Proiettili
        this.shootTimer++;
        if (this.shootTimer >= this.shootInterval) {
            this._shoot(cat);
            this.shootTimer = 0;
        }

        // Cloni (fase 2+)
        if (this.phase >= 2) {
            this.spawnCloneTimer++;
            if (this.spawnCloneTimer >= this.spawnCloneInterval) {
                this._spawnClone();
                this.spawnCloneTimer = 0;
            }
            // Aggiorna cloni
            for (let i = this.clones.length - 1; i >= 0; i--) {
                const c = this.clones[i];
                c.life--;
                c.x += c.vx;
                c.vx *= 0.98;
                if (c.life <= 0) this.clones.splice(i, 1);
            }
        }

        // Fase 3: teletrasporto più frenetico
        if (this.phase === 3) {
            // Lancio orizzontale veloce
            this.speed = 4.0;
        }

        // AI movimento
        if (!this.isTeleporting) {
            this.thinkTimer++;
            if (this.thinkTimer >= 12) {
                this.thinkTimer = 0;
                this._think(cat, platforms);
            }

            // Stuck detection
            if (Math.abs(this.x - this.lastX) < 0.5 && this.onGround) {
                this.stuckTimer++;
                if (this.stuckTimer > 45) {
                    this.vy = this.jumpForce;
                    this.onGround = false;
                    this.stuckTimer = 0;
                }
            } else {
                this.stuckTimer = 0;
            }
            this.lastX = this.x;

            this._applyGravity(platforms);
        }

        // Aggiorna proiettili
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            this.projectiles[i].update();
            if (!this.projectiles[i].active) this.projectiles.splice(i, 1);
        }

        this._animate();
        this.glowPhase += 0.07;
    }

    // ──────────────────────────────────────────
    // AI
    // ──────────────────────────────────────────
    _think(cat, platforms) {
        const dx = cat.x - this.x;
        const dy = cat.y - this.y;

        const dir = dx > 0 ? 1 : -1;
        this.facing = dir;
        this.vx = dir * this.speed;

        // Salta verso il gatto se è più in alto
        if (dy < -80 && this.onGround && this.jumpCooldown <= 0) {
            this.vy = this.jumpForce;
            this.onGround = false;
            this.jumpCooldown = 30;
        }

        // Ostacolo davanti → salta
        if (this.onGround && this.jumpCooldown <= 0) {
            const ahead = this.x + dir * 55;
            for (const p of platforms) {
                if (p.type === 'ground' || p.isOneWay) continue;
                if (ahead > p.x && ahead < p.x + p.width &&
                    this.y + this.height > p.y && this.y < p.y + p.height) {
                    this.vy = this.jumpForce;
                    this.onGround = false;
                    this.jumpCooldown = 20;
                    break;
                }
            }
        }

        // Bordo piattaforma → salta per non cadere
        if (this.onGround && this.jumpCooldown <= 0) {
            const checkX = this.x + dir * 35;
            const feetY = this.y + this.height + 5;
            let hasFloor = false;
            for (const p of platforms) {
                if (checkX > p.x && checkX < p.x + p.width &&
                    feetY >= p.y && feetY <= p.y + p.height + 20) {
                    hasFloor = true; break;
                }
            }
            if (!hasFloor) {
                this.vy = this.jumpForce * 0.75;
                this.onGround = false;
                this.jumpCooldown = 22;
            }
        }

        if (this.jumpCooldown > 0) this.jumpCooldown--;
    }

    // ──────────────────────────────────────────
    // TELETRASPORTO
    // ──────────────────────────────────────────
    _startTeleport(cat, platforms) {
        // Scegli destinazione: vicino al gatto ma non sopra
        const candidates = [];
        for (const p of platforms) {
            if (p.type === 'building' || (p.isOneWay && p.type !== 'ground')) {
                const tx = p.x + 20 + Math.random() * Math.max(10, p.width - 40);
                const ty = p.y - this.height;
                const dx = cat.x - tx;
                const dy = cat.y - ty;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 120 && dist < 500) {
                    candidates.push({ x: tx, y: ty });
                }
            }
        }
        if (candidates.length === 0) {
            // Fallback: teletrasportati al lato opposto del gatto
            const tx = cat.x > CONFIG.worldWidth / 2
                ? Math.random() * 300 + 100
                : CONFIG.worldWidth - 400 + Math.random() * 300;
            candidates.push({ x: tx, y: CONFIG.worldHeight - 120 });
        }
        this.teleportTarget = candidates[Math.floor(Math.random() * candidates.length)];
        this.isTeleporting = true;
        this.teleportFade = 0;
        this.teleportTimer = 0;
    }

    _updateTeleport() {
        this.teleportFade += 0.05;
        if (this.teleportFade >= 1) {
            // Teletrasporta!
            this.x = this.teleportTarget.x;
            this.y = this.teleportTarget.y;
            this.vx = 0;
            this.vy = 0;
        }
        if (this.teleportFade >= 2) {
            this.isTeleporting = false;
            this.teleportFade = 0;
        }
    }

    // ──────────────────────────────────────────
    // SPARO
    // ──────────────────────────────────────────
    _shoot(cat) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 3;
        const dx = (cat.x + cat.width / 2) - cx;
        const dy = (cat.y + cat.height / 2) - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = 4 + this.phase * 1.5;

        const vx = (dx / dist) * speed;
        const vy = (dy / dist) * speed;

        const count = this.phase; // 1 proiettile in fase 1, 2 in fase 2, 3 in fase 3
        for (let i = 0; i < count; i++) {
            const spread = (i - (count - 1) / 2) * 0.25;
            this.projectiles.push(new QuantumProjectile(cx, cy, vx + spread, vy));
        }
    }

    // ──────────────────────────────────────────
    // CLONI (fase 2+)
    // ──────────────────────────────────────────
    _spawnClone() {
        const maxClones = this.phase === 2 ? 2 : 3;
        if (this.clones.length >= maxClones) return;
        this.clones.push({
            x: this.x,
            y: this.y,
            vx: (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random() * 2),
            facing: Math.random() > 0.5 ? 1 : -1,
            life: 200 + Math.random() * 100,
            maxLife: 300,
            animFrame: 0,
            animTimer: 0
        });
    }

    // ──────────────────────────────────────────
    // FISICA
    // ──────────────────────────────────────────
    _applyGravity(platforms) {
        this.vy += CONFIG.gravity;
        if (this.vy > 15) this.vy = 15;

        this.x += this.vx;
        this.y += this.vy;
        this.onGround = false;

        for (const p of platforms) {
            if (p.isOneWay || p.roofOnly) {
                if (this.vy > 0) {
                    const feetY = this.y + this.height;
                    const prevFeet = feetY - this.vy;
                    if (prevFeet <= p.y + 5 && feetY >= p.y &&
                        this.x + this.width > p.x + 5 && this.x < p.x + p.width - 5) {
                        this.y = p.y - this.height;
                        this.vy = 0;
                        this.onGround = true;
                    }
                }
            } else if (p.type === 'ground') {
                if (this.y + this.height > p.y && this.y < p.y + p.height) {
                    this.y = p.y - this.height;
                    this.vy = 0;
                    this.onGround = true;
                }
            } else {
                // Collisione X con edifici
                if (this.x < p.x + p.width && this.x + this.width > p.x &&
                    this.y < p.y + p.height && this.y + this.height > p.y) {
                    if (this.vx > 0) this.x = p.x - this.width;
                    else if (this.vx < 0) this.x = p.x + p.width;
                    this.vx = -this.vx * 0.3;
                }
            }
        }

        this.x = Math.max(0, Math.min(this.x, CONFIG.worldWidth - this.width));
        this.y = Math.min(this.y, CONFIG.worldHeight - this.height);
    }

    // ──────────────────────────────────────────
    // ANIMAZIONE
    // ──────────────────────────────────────────
    _animate() {
        this.animTimer++;
        const spd = this.state === 'idle' ? 14 : 7;
        if (this.animTimer > spd) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 4;
        }
        this.tailWag = Math.sin(CONFIG.time * 0.1) * 0.4;
        if (Math.random() < 0.004) this.eyeBlink = 8;
        if (this.eyeBlink > 0) this.eyeBlink--;
        if (Math.random() < 0.008) this.earTwitch = 5;
        if (this.earTwitch > 0) this.earTwitch--;

        if (!this.onGround) {
            this.state = this.vy < 0 ? 'jump' : 'fall';
        } else if (Math.abs(this.vx) > 0.5) {
            this.state = 'walk';
        } else {
            this.state = 'idle';
        }
    }

    // ──────────────────────────────────────────
    // DANNO DA PORTALE
    // ──────────────────────────────────────────
    takeDamage() {
        if (this.hitCooldown > 0 || this.defeated) return false;
        this.hp--;
        this.hitCooldown = 90;  // 1.5 sec di invincibilità
        this.hitFlash = 20;

        // Avanza di fase
        if (this.hp <= 6 && this.phase === 1) {
            this.phase = 2;
            this._onPhaseChange(2);
        } else if (this.hp <= 3 && this.phase === 2) {
            this.phase = 3;
            this._onPhaseChange(3);
        }

        if (this.hp <= 0) {
            this.defeated = true;
            this.hp = 0;
        }
        return true;
    }

    _onPhaseChange(newPhase) {
        // Teletrasporto immediato + reset timer per permettere respiro al giocatore
        this.teleportTimer = 0;
        this.shootTimer = 0;
        // Aumenta difficoltà
        if (newPhase === 2) {
            this.teleportInterval = 200;  // ogni ~3.3 sec
            this.shootInterval = 120;     // ogni 2 sec
            this.speed = 3.5;
        } else if (newPhase === 3) {
            this.teleportInterval = 120;  // ogni 2 sec
            this.shootInterval = 75;      // ogni 1.25 sec
            this.speed = 4.5;
        }
    }

    // Collisione proiettili → cat
    checkProjectileHit(cat) {
        for (const proj of this.projectiles) {
            if (proj.checkHit(cat)) {
                proj.active = false;
                return true;
            }
        }
        return false;
    }

    // Collisione corpo del boss → cat (danno da contatto)
    checkBodyHit(cat) {
        if (this.hitCooldown > 0) return false;
        return this.x < cat.x + cat.width &&
               this.x + this.width > cat.x &&
               this.y < cat.y + cat.height &&
               this.y + this.height > cat.y;
    }

    // ──────────────────────────────────────────
    // DRAW
    // ──────────────────────────────────────────
    draw(ctx) {
        if (this.defeated) return;

        const t = CONFIG.time;
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        // Fade durante teletrasporto
        let alpha = 1;
        if (this.isTeleporting) {
            alpha = this.teleportFade < 1
                ? 1 - this.teleportFade
                : this.teleportFade - 1;
        }
        if (alpha <= 0.02) return;

        ctx.save();
        ctx.globalAlpha = alpha;

        // ── GLOW PULSANTE BLU ──
        const glowBrightness = 0.5 + Math.sin(this.glowPhase) * 0.35;
        const glowSize = 100 + Math.sin(this.glowPhase * 0.7) * 30;

        const phaseColors = [
            null,
            { r: '80,160,255', glow: '100,180,255' },   // fase 1: blu elettrico
            { r: '160,80,255', glow: '180,100,255' },    // fase 2: viola energetico
            { r: '255,80,160', glow: '255,120,180' }     // fase 3: rosa/rosso critico
        ];
        const pc = phaseColors[this.phase] || phaseColors[1];

        if (this.hitFlash > 0 && Math.floor(this.hitFlash / 3) % 2 === 0) {
            // Flash bianco al danno
            ctx.fillStyle = `rgba(255,255,255,0.7)`;
            ctx.beginPath();
            ctx.arc(cx, cy, glowSize * 0.6, 0, Math.PI * 2);
            ctx.fill();
        } else {
            const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize);
            glow.addColorStop(0, `rgba(${pc.glow},${glowBrightness * 0.5})`);
            glow.addColorStop(0.4, `rgba(${pc.r},${glowBrightness * 0.2})`);
            glow.addColorStop(0.7, `rgba(${pc.r},${glowBrightness * 0.07})`);
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(cx, cy, glowSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── DISEGNO GATTO ──
        ctx.save();
        ctx.translate(cx, this.y + this.height / 2);
        ctx.scale(this.facing, 1);
        ctx.translate(-this.width / 2, -this.height / 2);

        // Ombra
        ctx.fillStyle = `rgba(0,0,0,0.4)`;
        ctx.beginPath();
        ctx.ellipse(this.width / 2, this.height + 3, 20, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Corpo principale — colore che varia con la fase e pulsa
        const bodyPulse = Math.sin(this.glowPhase) * 20;
        let bodyR, bodyG, bodyB;
        if (this.phase === 1) { bodyR = 20 + bodyPulse * 0.3; bodyG = 30 + bodyPulse; bodyB = 80 + bodyPulse; }
        else if (this.phase === 2) { bodyR = 50 + bodyPulse; bodyG = 20; bodyB = 80 + bodyPulse; }
        else { bodyR = 80 + bodyPulse; bodyG = 20; bodyB = 60 + bodyPulse * 0.5; }

        const bodyColor = `rgb(${Math.round(bodyR)},${Math.round(bodyG)},${Math.round(bodyB)})`;
        const bodyLight = `rgb(${Math.round(bodyR + 30)},${Math.round(bodyG + 20)},${Math.round(bodyB + 40)})`;
        const bodyDark = `rgb(${Math.round(bodyR - 10)},${Math.round(bodyG - 10)},${Math.round(bodyB - 20)})`;

        // === CODA ===
        ctx.save();
        ctx.translate(2, this.height / 2 - 4);
        const tailAngle = 0.4 + this.tailWag;
        ctx.strokeStyle = bodyLight;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-12, -10, -18 + Math.sin(tailAngle) * 6, -22 + Math.cos(tailAngle) * 4);
        ctx.stroke();
        ctx.restore();

        // === ZAMPE POSTERIORI ===
        const walkOffset = this.state === 'walk' ? Math.sin(this.animFrame * 1.5) * 4 : 0;
        ctx.strokeStyle = bodyDark;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.width * 0.25, this.height);
        ctx.lineTo(this.width * 0.1, this.height + 6 + walkOffset * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(this.width * 0.35, this.height);
        ctx.lineTo(this.width * 0.2, this.height + 6 - walkOffset * 0.5);
        ctx.stroke();

        // === CORPO ===
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(this.width / 2, this.height * 0.55, this.width * 0.45, this.height * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ventre chiaro
        ctx.fillStyle = bodyLight;
        ctx.beginPath();
        ctx.ellipse(this.width * 0.52, this.height * 0.58, this.width * 0.22, this.height * 0.24, 0, 0, Math.PI * 2);
        ctx.fill();

        // === TESTA ===
        const headX = this.width * 0.65;
        const headY = this.height * 0.3;
        const headR = this.width * 0.3;

        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(headX, headY, headR, 0, Math.PI * 2);
        ctx.fill();

        // === ORECCHIE ===
        const earTwitch = this.earTwitch > 0 ? 0.1 : 0;
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.moveTo(headX - headR * 0.3, headY - headR * 0.7);
        ctx.lineTo(headX - headR * 0.7 - earTwitch, headY - headR * 1.4);
        ctx.lineTo(headX + headR * 0.1, headY - headR * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = `rgba(${Math.round(bodyR + 60)},${Math.round(bodyG + 60)},${Math.round(bodyB + 80)},0.7)`;
        ctx.beginPath();
        ctx.moveTo(headX - headR * 0.25, headY - headR * 0.75);
        ctx.lineTo(headX - headR * 0.55, headY - headR * 1.2);
        ctx.lineTo(headX + headR * 0.05, headY - headR * 0.82);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.moveTo(headX + headR * 0.3, headY - headR * 0.7);
        ctx.lineTo(headX + headR * 0.7 + earTwitch, headY - headR * 1.4);
        ctx.lineTo(headX + headR * 0.85, headY - headR * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = `rgba(${Math.round(bodyR + 60)},${Math.round(bodyG + 60)},${Math.round(bodyB + 80)},0.7)`;
        ctx.beginPath();
        ctx.moveTo(headX + headR * 0.28, headY - headR * 0.72);
        ctx.lineTo(headX + headR * 0.6, headY - headR * 1.2);
        ctx.lineTo(headX + headR * 0.72, headY - headR * 0.6);
        ctx.closePath();
        ctx.fill();

        // === OCCHI — brillano col glow blu ===
        const eyeY = headY - headR * 0.1;
        const eyeSize = this.eyeBlink > 0 ? 1.5 : 5;
        const eyeScaleY = this.eyeBlink > 0 ? 0.15 : 1;

        // Occhi che pulsano con il colore di fase
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgba(${pc.glow}, 1)`;
        ctx.fillStyle = `rgba(${pc.glow}, 0.9)`;
        ctx.save();
        ctx.translate(headX - headR * 0.3, eyeY);
        ctx.scale(1, eyeScaleY);
        ctx.beginPath();
        ctx.ellipse(0, 0, eyeSize, eyeSize, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(headX + headR * 0.3, eyeY);
        ctx.scale(1, eyeScaleY);
        ctx.beginPath();
        ctx.ellipse(0, 0, eyeSize, eyeSize, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.shadowBlur = 0;

        // Pupille verticali
        ctx.fillStyle = '#000';
        if (this.eyeBlink <= 0) {
            ctx.beginPath();
            ctx.ellipse(headX - headR * 0.3, eyeY, 1.5, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(headX + headR * 0.3, eyeY, 1.5, 4, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // === BAFFI ===
        ctx.strokeStyle = `rgba(${pc.glow}, 0.6)`;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 6;
        ctx.shadowColor = `rgba(${pc.glow}, 0.8)`;
        // Sinistra
        for (let w = 0; w < 3; w++) {
            ctx.beginPath();
            ctx.moveTo(headX - headR * 0.1, headY + headR * 0.15 + w * 2.5 - 2.5);
            ctx.lineTo(headX - headR * 0.85, headY + (w - 1) * 3);
            ctx.stroke();
        }
        // Destra
        for (let w = 0; w < 3; w++) {
            ctx.beginPath();
            ctx.moveTo(headX + headR * 0.1, headY + headR * 0.15 + w * 2.5 - 2.5);
            ctx.lineTo(headX + headR * 0.85, headY + (w - 1) * 3);
            ctx.stroke();
        }
        ctx.shadowBlur = 0;

        // === ZAMPE ANTERIORI ===
        ctx.strokeStyle = bodyDark;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(this.width * 0.65, this.height * 0.75);
        ctx.lineTo(this.width * 0.8, this.height + 5 + walkOffset);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(this.width * 0.75, this.height * 0.75);
        ctx.lineTo(this.width * 0.92, this.height + 5 - walkOffset);
        ctx.stroke();

        // === STRISCE QUANTISTICHE (circuiti sul corpo) ===
        ctx.strokeStyle = `rgba(${pc.glow}, 0.35)`;
        ctx.lineWidth = 1;
        const stripePulse = Math.sin(t * 0.15 + this.glowPhase) * 0.3 + 0.3;
        ctx.globalAlpha = stripePulse;
        for (let s = 0; s < 3; s++) {
            const sx = this.width * 0.2 + s * 8;
            ctx.beginPath();
            ctx.moveTo(sx, this.height * 0.35);
            ctx.lineTo(sx + 4, this.height * 0.55);
            ctx.lineTo(sx, this.height * 0.75);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        ctx.restore(); // fine flip speculare

        // ── CLONI ──
        this._drawClones(ctx);

        // ── PROIETTILI ──
        for (const proj of this.projectiles) proj.draw(ctx);

        ctx.restore(); // fine globalAlpha
    }

    _drawClones(ctx) {
        for (const c of this.clones) {
            const fade = c.life / c.maxLife;
            ctx.save();
            ctx.globalAlpha = fade * 0.5;

            const cx = c.x + this.width / 2;
            const cy = c.y + this.height / 2;

            // Glow clone
            const cloneGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 55);
            cloneGlow.addColorStop(0, 'rgba(100,160,255,0.3)');
            cloneGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = cloneGlow;
            ctx.beginPath();
            ctx.arc(cx, cy, 55, 0, Math.PI * 2);
            ctx.fill();

            // Silhouette clone
            ctx.fillStyle = `rgba(80,120,220,0.6)`;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(c.facing, 1);
            ctx.translate(-this.width / 2, -this.height / 2);
            ctx.beginPath();
            ctx.ellipse(this.width / 2, this.height * 0.55, this.width * 0.4, this.height * 0.33, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(this.width * 0.65, this.height * 0.3, this.width * 0.28, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            ctx.restore();
        }
    }

    // ──────────────────────────────────────────
    // DRAW HEALTH BAR — cuori blu a destra
    // ──────────────────────────────────────────
    drawHealthBar(ctx) {
        if (this.defeated) return;

        const t = CONFIG.time;
        const vw = CONFIG.canvasWidth;
        const isMobile = IS_MOBILE;

        const panelW = isMobile ? 180 : 260;
        const panelH = isMobile ? 42 : 55;
        const pad = isMobile ? 6 : 10;
        const panelX = vw - panelW - pad;
        const panelY = pad;

        // Sfondo panel (speculare a quello del giocatore)
        ctx.fillStyle = 'rgba(0, 0, 10, 0.75)';
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelW, panelH, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(60,120,255,0.18)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label boss
        ctx.fillStyle = '#5577bb';
        ctx.font = isMobile ? 'bold 9px Arial' : 'bold 11px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('QUANTUM CAT — FASE ' + this.phase + '/3', panelX + panelW - pad, panelY + (isMobile ? 11 : 13));

        // Cuori boss — disegnati come forme canvas, allineati a destra
        const heartSize = isMobile ? 7 : 10;   // raggio (stesso sistema del player HUD)
        const heartSpacing = isMobile ? 16 : 20;
        const totalHearts = this.maxHp;
        const phaseColors = ['#4488ff', '#aa44ff', '#ff4488'];
        const activeColor = phaseColors[this.phase - 1];

        // Punto di ancoraggio: bordo destro del pannello
        const rowRightX = panelX + panelW - pad - heartSize;
        const heartBaseY = panelY + (isMobile ? 22 : 27);

        for (let i = 0; i < totalHearts; i++) {
            // Cuori allineati a destra → i=0 è il più a destra
            const hx = rowRightX - i * heartSpacing;
            const hy = heartBaseY;
            const filled = (totalHearts - i) <= this.hp;
            const s = heartSize;

            ctx.save();
            ctx.translate(hx, hy);

            if (filled) {
                ctx.shadowBlur = isMobile ? 4 : 7;
                ctx.shadowColor = activeColor;
            }

            ctx.beginPath();
            ctx.moveTo(0, s * 0.4);
            ctx.bezierCurveTo(-s * 0.2, s * 0.05, -s, -s * 0.15, -s, -s * 0.6);
            ctx.bezierCurveTo(-s, -s * 1.1, -s * 0.4, -s * 1.2, 0, -s * 0.85);
            ctx.bezierCurveTo(s * 0.4, -s * 1.2, s, -s * 1.1, s, -s * 0.6);
            ctx.bezierCurveTo(s, -s * 0.15, s * 0.2, s * 0.05, 0, s * 0.4);
            ctx.closePath();

            if (filled) {
                ctx.fillStyle = activeColor;
                ctx.fill();
                // piccolo riflesso
                ctx.shadowBlur = 0;
                ctx.fillStyle = 'rgba(255,255,255,0.25)';
                ctx.beginPath();
                ctx.ellipse(-s * 0.3, -s * 0.65, s * 0.25, s * 0.15, -0.4, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = 'rgba(20,30,60,0.8)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(60,100,180,0.2)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            ctx.restore();
        }
        ctx.shadowBlur = 0;

        // Hint fase in basso
        ctx.fillStyle = isMobile ? 'rgba(0,0,0,0)' : '#334466';
        ctx.font = isMobile ? '9px Arial' : '10px Arial';
        const hintTexts = ['Raccogli ORB e premi SPAZIO', 'Sempre più veloce!', '⚠ Fase critica!'];
        ctx.fillText(hintTexts[this.phase - 1], panelX + panelW - pad, panelY + (isMobile ? 37 : 45));

        ctx.textAlign = 'left';
    }
}
