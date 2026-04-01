// ============================================
// RIVAL CAT - Gatto rossiccio antagonista (Livello 4)
// Si muove su tetti, scale e a terra. Insegue il giocatore.
// ============================================

class RivalCat {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 42;
        this.height = 32;
        this.vx = 0;
        this.vy = 0;
        this.speed = 2.2;          // più lento del gatto nero (5)
        this.jumpForce = -13;
        this.pauseTimer = 0;        // pausa dopo aver toccato il giocatore
        this.onGround = false;
        this.facing = -1;          // parte guardando verso sinistra (verso il giocatore)
        this.animFrame = 0;
        this.animTimer = 0;
        this.state = 'idle';
        this.tailWag = 0;
        this.eyeBlink = 0;
        this.earTwitch = 0;

        // AI
        this.targetX = 0;
        this.targetY = 0;
        this.jumpCooldown = 0;
        this.stuckTimer = 0;
        this.lastX = x;
        this.thinkTimer = 0;       // intervallo decisionale
        this.aggroRange = 800;     // raggio di inseguimento
        this.isAggro = false;

        // Non ha vite — è invincibile
    }

    update(cat, platforms) {
        // Pausa dopo aver toccato il giocatore
        if (this.pauseTimer > 0) {
            this.pauseTimer--;
            this.vx = 0;
            this.state = 'idle';
            // Animazione e gravità continuano
            this.vy += CONFIG.gravity;
            if (this.vy > 15) this.vy = 15;
            this.y += this.vy;
            this.onGround = false;
            this.checkCollisionY(platforms);
            this.animTimer++;
            if (this.animTimer > 7) { this.animTimer = 0; this.animFrame = 0; }
            this.tailWag = Math.sin(CONFIG.time * 0.12) * 0.15;
            return;
        }

        // AI: decide cosa fare ogni pochi frame
        this.thinkTimer++;
        if (this.thinkTimer >= 10) {
            this.thinkTimer = 0;
            this.think(cat, platforms);
        }

        // Stuck detection — se non si muove, forza un salto
        if (Math.abs(this.x - this.lastX) < 0.3 && this.onGround) {
            this.stuckTimer++;
            if (this.stuckTimer > 40) {
                this.vy = this.jumpForce;
                this.onGround = false;
                this.stuckTimer = 0;
            }
        } else {
            this.stuckTimer = 0;
        }
        this.lastX = this.x;

        // Cooldown salto
        if (this.jumpCooldown > 0) this.jumpCooldown--;

        // Gravità
        this.vy += CONFIG.gravity;
        if (this.vy > 15) this.vy = 15;

        // Muovi
        this.x += this.vx;
        this.checkCollisionX(platforms);

        this.y += this.vy;
        this.onGround = false;
        this.checkCollisionY(platforms);

        // Limiti mondo
        this.x = Math.max(0, Math.min(this.x, CONFIG.worldWidth - this.width));
        this.y = Math.min(this.y, CONFIG.worldHeight - this.height);

        // Facing
        if (this.vx > 0.5) this.facing = 1;
        else if (this.vx < -0.5) this.facing = -1;

        // Stato animazione
        if (!this.onGround) {
            this.state = this.vy < 0 ? 'jump' : 'fall';
        } else if (Math.abs(this.vx) > 0.5) {
            this.state = 'walk';
        } else {
            this.state = 'idle';
        }

        // Animazione
        this.animTimer++;
        if (this.animTimer > 7) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 4;
        }
        this.tailWag = Math.sin(CONFIG.time * 0.12) * 0.35;
        if (Math.random() < 0.006) this.eyeBlink = 10;
        if (this.eyeBlink > 0) this.eyeBlink--;
        if (Math.random() < 0.012) this.earTwitch = 5;
        if (this.earTwitch > 0) this.earTwitch--;
    }

    // ────────────────────────────
    // AI: decide direzione e salti
    // ────────────────────────────
    think(cat, platforms) {
        const dx = cat.x - this.x;
        const dy = cat.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        this.isAggro = dist < this.aggroRange;

        if (!this.isAggro) {
            // Pattuglia lenta verso il giocatore
            this.vx = dx > 0 ? this.speed * 0.4 : -this.speed * 0.4;
            return;
        }

        // Insegui il giocatore
        const dir = dx > 0 ? 1 : -1;
        this.vx = dir * this.speed;

        // Se il gatto è sopra di noi, cerca di salire
        if (dy < -60 && this.onGround && this.jumpCooldown <= 0) {
            // Cerca una piattaforma raggiungibile sopra
            const canJumpTo = this.findPlatformAbove(platforms);
            if (canJumpTo || dy < -100) {
                this.vy = this.jumpForce;
                this.onGround = false;
                this.jumpCooldown = 30;
            }
        }

        // Se c'è un muro / ostacolo davanti, salta
        if (this.onGround && this.jumpCooldown <= 0) {
            const ahead = this.x + dir * 50;
            for (const p of platforms) {
                if (p.type === 'ground' || p.isOneWay) continue;
                if (ahead > p.x && ahead < p.x + p.width &&
                    this.y + this.height > p.y && this.y < p.y + p.height) {
                    this.vy = this.jumpForce;
                    this.onGround = false;
                    this.jumpCooldown = 25;
                    break;
                }
            }
        }

        // Se siamo a terra e il gatto è su un tetto, salta verso la scala più vicina
        if (this.onGround && dy < -80 && this.jumpCooldown <= 0) {
            this.vy = this.jumpForce;
            this.onGround = false;
            this.jumpCooldown = 35;
        }

        // Se c'è un vuoto davanti (bordo piattaforma), salta
        if (this.onGround && this.jumpCooldown <= 0) {
            const checkX = this.x + dir * 30;
            const feetY = this.y + this.height + 5;
            let hasFloor = false;
            for (const p of platforms) {
                if (checkX > p.x && checkX < p.x + p.width &&
                    feetY >= p.y && feetY <= p.y + p.height + 20) {
                    hasFloor = true;
                    break;
                }
            }
            if (!hasFloor) {
                this.vy = this.jumpForce * 0.8;
                this.onGround = false;
                this.jumpCooldown = 20;
            }
        }
    }

    findPlatformAbove(platforms) {
        // Cerca piattaforma raggiungibile in un raggio sopra
        const maxJumpH = 180;  // altezza max raggiungibile col salto
        for (const p of platforms) {
            if (p.type === 'ground') continue;
            if (p.y < this.y - maxJumpH) continue;
            if (p.y >= this.y) continue;
            if (Math.abs((p.x + p.width / 2) - this.x) < 200) {
                return p;
            }
        }
        return null;
    }

    // ────────────────────────────
    // Collisioni (uguale al cat)
    // ────────────────────────────
    checkCollisionX(platforms) {
        for (const platform of platforms) {
            if (platform.roofOnly) continue;
            if (platform.isOneWay) continue;
            if (this.collidesWith(platform)) {
                if (this.vx > 0) {
                    this.x = platform.x - this.width;
                } else if (this.vx < 0) {
                    this.x = platform.x + platform.width;
                }
                this.vx = 0;
            }
        }
    }

    checkCollisionY(platforms) {
        for (const platform of platforms) {
            if (platform.isOneWay || platform.roofOnly) {
                if (this.vy > 0) {
                    const feetY = this.y + this.height;
                    const prevFeetY = feetY - this.vy;
                    if (prevFeetY <= platform.y + 5 && feetY >= platform.y) {
                        if (this.x + this.width > platform.x + 5 && this.x < platform.x + platform.width - 5) {
                            this.y = platform.y - this.height;
                            this.vy = 0;
                            this.onGround = true;
                        }
                    }
                }
            } else {
                if (this.collidesWith(platform)) {
                    if (this.vy > 0) {
                        this.y = platform.y - this.height;
                        this.vy = 0;
                        this.onGround = true;
                    } else if (this.vy < 0) {
                        this.y = platform.y + platform.height;
                        this.vy = 0;
                    }
                }
            }
        }
    }

    collidesWith(obj) {
        return this.x < obj.x + obj.width &&
               this.x + this.width > obj.x &&
               this.y < obj.y + obj.height &&
               this.y + this.height > obj.y;
    }

    checkCollisionWithCat(cat) {
        if (cat.invincible) return false;
        return this.x < cat.x + cat.width &&
               this.x + this.width > cat.x &&
               this.y < cat.y + cat.height &&
               this.y + this.height > cat.y;
    }

    // ────────────────────────────
    // DRAW — Gatto rossiccio/marrone
    // ────────────────────────────
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.scale(this.facing, 1);
        ctx.translate(-this.width / 2, -this.height / 2);

        const fur     = '#7a4a2a';   // marrone rossiccio principale
        const furDark = '#5a3218';   // ombre
        const furLight= '#9a6040';   // highlight
        const belly   = '#b0784a';   // pancia chiara
        const nose    = '#aa4444';
        const earInner= '#6a3020';

        // Ombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(this.width / 2, this.height + 2, 15, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Glow caldo attorno al gatto
        const catGlow = ctx.createRadialGradient(this.width / 2, this.height / 2, 0, this.width / 2, this.height / 2, 50);
        catGlow.addColorStop(0, 'rgba(200, 160, 100, 0.1)');
        catGlow.addColorStop(0.5, 'rgba(180, 140, 80, 0.04)');
        catGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = catGlow;
        ctx.beginPath();
        ctx.arc(this.width / 2, this.height / 2, 50, 0, Math.PI * 2);
        ctx.fill();

        // Coda — lunga e fluffy
        ctx.save();
        ctx.translate(5, this.height / 2);
        ctx.rotate(this.tailWag + Math.sin(CONFIG.time * 0.15) * 0.25);
        ctx.fillStyle = fur;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-18, -22 + Math.sin(CONFIG.time * 0.1) * 6, -12, -38);
        ctx.quadraticCurveTo(-8, -44, -4, -38);
        ctx.quadraticCurveTo(-12, -18, 0, 5);
        ctx.fill();
        // Punta chiara
        ctx.fillStyle = furLight;
        ctx.beginPath();
        ctx.arc(-10, -38, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Corpo
        ctx.fillStyle = fur;
        ctx.beginPath();
        ctx.ellipse(this.width / 2, this.height / 2 + 5, 19, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        // Pancia chiara
        ctx.fillStyle = belly;
        ctx.beginPath();
        ctx.ellipse(this.width / 2 + 2, this.height / 2 + 8, 12, 6, 0, 0, Math.PI);
        ctx.fill();

        // Strisce tabby (sottili linee più scure sul dorso)
        ctx.strokeStyle = furDark;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
            const sx = this.width / 2 - 12 + i * 7;
            ctx.beginPath();
            ctx.moveTo(sx, this.height / 2 - 6);
            ctx.lineTo(sx + 2, this.height / 2 + 2);
            ctx.stroke();
        }

        // Zampe
        const legOffset = this.state === 'walk' ? Math.sin(this.animFrame * Math.PI / 2) * 3 : 0;
        ctx.fillStyle = furDark;
        ctx.fillRect(8, this.height - 8 + legOffset, 6, 10);
        ctx.fillRect(14, this.height - 8 - legOffset, 6, 10);
        ctx.fillRect(this.width - 18, this.height - 8 - legOffset, 6, 10);
        ctx.fillRect(this.width - 12, this.height - 8 + legOffset, 6, 10);
        // Piedini bianchi
        ctx.fillStyle = '#c8a080';
        ctx.fillRect(8, this.height + 0 + legOffset, 6, 3);
        ctx.fillRect(14, this.height + 0 - legOffset, 6, 3);
        ctx.fillRect(this.width - 18, this.height + 0 - legOffset, 6, 3);
        ctx.fillRect(this.width - 12, this.height + 0 + legOffset, 6, 3);

        // Testa
        ctx.fillStyle = fur;
        ctx.beginPath();
        ctx.ellipse(this.width - 8, this.height / 2 - 2, 14, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Macchia chiara sul muso
        ctx.fillStyle = belly;
        ctx.beginPath();
        ctx.ellipse(this.width - 2, this.height / 2 + 2, 6, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Orecchie
        const earOff = this.earTwitch > 0 ? 2 : 0;
        ctx.fillStyle = fur;
        ctx.beginPath();
        ctx.moveTo(this.width - 18, this.height / 2 - 10);
        ctx.lineTo(this.width - 22, this.height / 2 - 25 - earOff);
        ctx.lineTo(this.width - 12, this.height / 2 - 12);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(this.width - 2, this.height / 2 - 10);
        ctx.lineTo(this.width + 4, this.height / 2 - 25 + earOff);
        ctx.lineTo(this.width + 2, this.height / 2 - 12);
        ctx.fill();
        // Interno orecchie
        ctx.fillStyle = earInner;
        ctx.beginPath();
        ctx.moveTo(this.width - 17, this.height / 2 - 11);
        ctx.lineTo(this.width - 20, this.height / 2 - 20 - earOff);
        ctx.lineTo(this.width - 13, this.height / 2 - 13);
        ctx.fill();

        // Striscia tabby sulla fronte (M)
        ctx.strokeStyle = furDark;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(this.width - 16, this.height / 2 - 8);
        ctx.lineTo(this.width - 12, this.height / 2 - 13);
        ctx.lineTo(this.width - 8, this.height / 2 - 8);
        ctx.lineTo(this.width - 4, this.height / 2 - 13);
        ctx.lineTo(this.width, this.height / 2 - 8);
        ctx.stroke();

        // Occhi — verde/ambra, sguardo deciso
        if (this.eyeBlink < 3) {
            // Glow occhi
            const eyeGlow = ctx.createRadialGradient(this.width - 4, this.height / 2 - 3, 0, this.width - 4, this.height / 2 - 3, 14);
            eyeGlow.addColorStop(0, 'rgba(200, 150, 50, 0.4)');
            eyeGlow.addColorStop(0.5, 'rgba(180, 120, 30, 0.15)');
            eyeGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = eyeGlow;
            ctx.beginPath();
            ctx.arc(this.width - 4, this.height / 2 - 3, 14, 0, Math.PI * 2);
            ctx.fill();

            // Iride
            ctx.fillStyle = '#bb8820';
            ctx.beginPath();
            ctx.ellipse(this.width - 4, this.height / 2 - 3, 4, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            // Pupilla
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.ellipse(this.width - 3, this.height / 2 - 3, 2, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            // Riflesso
            ctx.fillStyle = 'rgba(255, 230, 180, 0.7)';
            ctx.beginPath();
            ctx.arc(this.width - 5, this.height / 2 - 5, 1.5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.strokeStyle = '#aa7720';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.width - 8, this.height / 2 - 3);
            ctx.lineTo(this.width, this.height / 2 - 3);
            ctx.stroke();
        }

        // Naso
        ctx.fillStyle = nose;
        ctx.beginPath();
        ctx.moveTo(this.width + 4, this.height / 2);
        ctx.lineTo(this.width + 1, this.height / 2 + 3);
        ctx.lineTo(this.width + 7, this.height / 2 + 3);
        ctx.fill();

        // Baffi
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const wy = this.height / 2 + 2 + i * 3;
            ctx.beginPath();
            ctx.moveTo(this.width + 5, wy);
            ctx.lineTo(this.width + 20, wy - 2 + i * 2);
            ctx.stroke();
        }

        ctx.restore();
    }
}
