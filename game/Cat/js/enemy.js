// ============================================
// ENEMY - Doberman cattivi
// ============================================

class Enemy {
    constructor(x, y, patrolRange = 200) {
        this.x = x;
        this.y = y;
        this.width = 55;
        this.height = 36;
        this.vx = 0;
        this.vy = 0;
        this.speed = 2;
        this.chaseSpeed = 3.5;
        this.facing = 1;
        this.animFrame = 0;
        this.animTimer = 0;
        this.state = 'patrol';
        
        this.patrolStartX = x;
        this.patrolRange = patrolRange;
        this.patrolDirection = 1;
        this.pauseTimer = 0;
        
        this.detectionRange = 250;
        this.detectionRangeY = 100;
        this.loseRange = 400;
        
        this.alertTimer = 0;
        this.alertDuration = 40;
        
        this.tailWag = 0;
        this.barkTimer = 0;
        this.growlPhase = 0;
        
        // Anti-flicker: cooldown per evitare inversioni rapide di direzione
        this.facingCooldown = 0;
    }
    
    update(cat, platforms) {
        const dx = cat.x - this.x;
        const dy = cat.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        this.growlPhase += 0.1;
        if (this.facingCooldown > 0) this.facingCooldown--;
        
        switch(this.state) {
            case 'patrol':
                this.patrol();
                if (dist < this.detectionRange && Math.abs(dy) < this.detectionRangeY && !cat.invincible && cat.stillTimer < 480) {
                    this.state = 'alert';
                    this.alertTimer = this.alertDuration;
                    this.facing = dx > 0 ? 1 : -1;
                }
                break;
                
            case 'alert':
                this.vx = 0;
                this.alertTimer--;
                this.facing = dx > 0 ? 1 : -1;
                if (this.alertTimer <= 0) {
                    this.state = 'chase';
                }
                break;
                
            case 'chase':
                this.chase(cat);
                if (dist > this.loseRange || cat.invincible || cat.stillTimer >= 480) {
                    this.state = 'patrol';
                    this.pauseTimer = 60;
                }
                this.barkTimer++;
                break;
        }
        
        // Gravity
        this.vy += CONFIG.gravity;
        if (this.vy > 15) this.vy = 15;
        
        this.x += this.vx;
        this.y += this.vy;
        
        // Collisioni
        this.onGround = false;
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
            } else if (platform.type === 'ground') {
                if (this.y + this.height > platform.y && this.y < platform.y + platform.height) {
                    this.y = platform.y - this.height;
                    this.vy = 0;
                    this.onGround = true;
                }
            }
        }
        
        this.x = Math.max(0, Math.min(this.x, CONFIG.worldWidth - this.width));
        
        // Animation
        this.animTimer++;
        const animSpeed = this.state === 'chase' ? 5 : 8;
        if (this.animTimer > animSpeed) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 4;
        }
        
        this.tailWag = Math.sin(CONFIG.time * 0.15) * 0.4;
    }
    
    patrol() {
        if (this.pauseTimer > 0) {
            this.pauseTimer--;
            this.vx = 0;
            return;
        }
        this.vx = this.patrolDirection * this.speed;
        this.facing = this.patrolDirection;
        if (this.x > this.patrolStartX + this.patrolRange) {
            this.patrolDirection = -1;
            this.pauseTimer = 30 + Math.random() * 60;
        } else if (this.x < this.patrolStartX - this.patrolRange) {
            this.patrolDirection = 1;
            this.pauseTimer = 30 + Math.random() * 60;
        }
    }
    
    chase(cat) {
        const dx = cat.x - this.x;
        // Dead zone: non invertire se il gatto è quasi alla stessa X
        // + cooldown: almeno 20 frame tra un'inversione e l'altra
        const deadZone = 25;
        if (this.facingCooldown <= 0) {
            const newFacing = dx > deadZone ? 1 : dx < -deadZone ? -1 : this.facing;
            if (newFacing !== this.facing) {
                this.facing = newFacing;
                this.facingCooldown = 20; // ~0.33 sec prima di poter reinvertire
            }
        }
        this.vx = this.facing * this.chaseSpeed;
    }
    
    checkCollisionWithCat(cat) {
        if (cat.invincible) return false;
        return this.x < cat.x + cat.width &&
               this.x + this.width > cat.x &&
               this.y < cat.y + cat.height &&
               this.y + this.height > cat.y;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.scale(this.facing, 1);
        ctx.translate(-this.width/2, -this.height/2);
        
        const isChasing = this.state === 'chase';
        const isAlert = this.state === 'alert';
        const isAggro = isChasing || isAlert;
        
        // Colori Doberman: nero con focature ruggine/tan - più visibili
        const black = '#1a1410';
        const blackLight = '#2a2018';
        const blackDark = '#0a0804';
        const tan = '#a05828';       // focature muso/sopracciglia
        const tanLight = '#bb6a30';   // focature chiare
        const tanDark = '#6a3815';    // focature scure
        const chest = '#8a4820';      // petto
        
        // Glow rosso quando aggressivo
        if (isAggro) {
            const aggroGlow = ctx.createRadialGradient(this.width/2, this.height/2, 5, this.width/2, this.height/2, 50);
            aggroGlow.addColorStop(0, 'rgba(200, 50, 30, 0.15)');
            aggroGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = aggroGlow;
            ctx.beginPath();
            ctx.arc(this.width/2, this.height/2, 50, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Ombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(this.width/2, this.height + 3, 22, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // === CODA (corta, docked - tipica doberman) ===
        ctx.save();
        ctx.translate(2, this.height/2 - 6);
        const tailAngle = isAggro ? 0.8 + Math.sin(CONFIG.time * 0.4) * 0.1 : 0.3;
        ctx.rotate(tailAngle);
        ctx.fillStyle = black;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-5, -8, -3, -14);
        ctx.quadraticCurveTo(-1, -16, 1, -14);
        ctx.quadraticCurveTo(0, -6, 2, 2);
        ctx.fill();
        ctx.restore();

        // === CORPO - snello e muscoloso ===
        // Corpo principale
        ctx.fillStyle = black;
        ctx.beginPath();
        ctx.ellipse(this.width/2 - 2, this.height/2 + 2, 24, 13, -0.05, 0, Math.PI * 2);
        ctx.fill();
        
        // Muscolatura dorso
        ctx.fillStyle = blackLight;
        ctx.beginPath();
        ctx.ellipse(this.width/2 - 5, this.height/2 - 3, 18, 6, -0.1, Math.PI, Math.PI * 2);
        ctx.fill();
        
        // Pelo rizzato se aggressivo
        if (isAggro) {
            ctx.fillStyle = blackDark;
            for (let i = 0; i < 6; i++) {
                const sx = 8 + i * 7;
                const spH = 3 + Math.sin(CONFIG.time * 0.25 + i) * 1;
                ctx.beginPath();
                ctx.moveTo(sx, this.height/2 - 9);
                ctx.lineTo(sx + 1.5, this.height/2 - 9 - spH);
                ctx.lineTo(sx + 3, this.height/2 - 9);
                ctx.fill();
            }
        }
        
        // Petto - focatura tan
        ctx.fillStyle = chest;
        ctx.beginPath();
        ctx.ellipse(this.width - 10, this.height/2 + 6, 10, 7, 0, 0, Math.PI);
        ctx.fill();

        // === ZAMPE - lunghe e sottili (Doberman) ===
        const legOffset = this.vx !== 0 ? Math.sin(this.animFrame * Math.PI / 2) * 5 : 0;
        
        // Zampe posteriori
        ctx.fillStyle = black;
        ctx.fillRect(6, this.height - 6 + legOffset, 6, 14);
        ctx.fillRect(14, this.height - 6 - legOffset, 6, 14);
        // Focature tan sulle zampe posteriori
        ctx.fillStyle = tanDark;
        ctx.fillRect(6, this.height + 2 + legOffset, 6, 5);
        ctx.fillRect(14, this.height + 2 - legOffset, 6, 5);
        
        // Zampe anteriori
        ctx.fillStyle = black;
        ctx.fillRect(this.width - 22, this.height - 6 - legOffset, 6, 14);
        ctx.fillRect(this.width - 14, this.height - 6 + legOffset, 6, 14);
        // Focature tan sulle zampe anteriori
        ctx.fillStyle = tanDark;
        ctx.fillRect(this.width - 22, this.height + 2 - legOffset, 6, 5);
        ctx.fillRect(this.width - 14, this.height + 2 + legOffset, 6, 5);
        
        // Piedi
        ctx.fillStyle = blackDark;
        const pawPos = [[6, legOffset], [14, -legOffset], [this.width-22, -legOffset], [this.width-14, legOffset]];
        for (const [px, po] of pawPos) {
            ctx.fillRect(px - 1, this.height + 7 + po, 8, 3);
        }

        // === TESTA - lunga e appuntita (Doberman) ===
        // Cranio
        ctx.fillStyle = black;
        ctx.beginPath();
        ctx.ellipse(this.width - 2, this.height/2 - 4, 16, 13, -0.1, 0, Math.PI * 2);
        ctx.fill();
        
        // Focatura sopracciglia (macchie tan sopra gli occhi) 
        ctx.fillStyle = tan;
        ctx.beginPath();
        ctx.ellipse(this.width - 6, this.height/2 - 10, 5, 3, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(this.width + 2, this.height/2 - 10, 4, 2.5, 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Muso lungo e stretto (tipico Doberman)
        ctx.fillStyle = black;
        ctx.beginPath();
        ctx.moveTo(this.width + 5, this.height/2 - 6);
        ctx.lineTo(this.width + 22, this.height/2);
        ctx.lineTo(this.width + 22, this.height/2 + 4);
        ctx.lineTo(this.width + 5, this.height/2 + 6);
        ctx.quadraticCurveTo(this.width + 2, this.height/2, this.width + 5, this.height/2 - 6);
        ctx.fill();
        
        // Focatura muso - striscia tan sui lati
        ctx.fillStyle = tan;
        ctx.beginPath();
        ctx.moveTo(this.width + 6, this.height/2 + 2);
        ctx.lineTo(this.width + 18, this.height/2 + 3);
        ctx.lineTo(this.width + 18, this.height/2 + 5);
        ctx.lineTo(this.width + 6, this.height/2 + 5);
        ctx.closePath();
        ctx.fill();
        
        // Focatura sotto il muso
        ctx.fillStyle = tanLight;
        ctx.beginPath();
        ctx.ellipse(this.width + 8, this.height/2 + 7, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // === ORECCHIE DRITTE (cropped - tipiche Doberman) ===
        // Sempre dritte e triangolari!
        const earTwitch = isAggro ? Math.sin(CONFIG.time * 0.4) * 1 : 0;
        
        // Orecchio sinistro
        ctx.fillStyle = black;
        ctx.beginPath();
        ctx.moveTo(this.width - 14, this.height/2 - 14);
        ctx.lineTo(this.width - 18, this.height/2 - 36 + earTwitch);
        ctx.lineTo(this.width - 6, this.height/2 - 14);
        ctx.closePath();
        ctx.fill();
        // Interno orecchio (rosa scuro)
        ctx.fillStyle = '#3a1818';
        ctx.beginPath();
        ctx.moveTo(this.width - 13, this.height/2 - 15);
        ctx.lineTo(this.width - 16, this.height/2 - 30 + earTwitch);
        ctx.lineTo(this.width - 8, this.height/2 - 15);
        ctx.closePath();
        ctx.fill();
        
        // Orecchio destro
        ctx.fillStyle = black;
        ctx.beginPath();
        ctx.moveTo(this.width + 2, this.height/2 - 14);
        ctx.lineTo(this.width + 5, this.height/2 - 37 - earTwitch);
        ctx.lineTo(this.width + 8, this.height/2 - 13);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#3a1818';
        ctx.beginPath();
        ctx.moveTo(this.width + 3, this.height/2 - 15);
        ctx.lineTo(this.width + 5, this.height/2 - 31 - earTwitch);
        ctx.lineTo(this.width + 7, this.height/2 - 14);
        ctx.closePath();
        ctx.fill();

        // === OCCHI ===
        const eyeX = this.width + 1;
        const eyeY = this.height/2 - 5;
        
        if (isAggro) {
            // Occhi stretti, cattivi, rossi
            ctx.fillStyle = '#661515';
            ctx.beginPath();
            ctx.ellipse(eyeX, eyeY, 4.5, 2.5, 0.1, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#200500';
            ctx.beginPath();
            ctx.ellipse(eyeX + 1, eyeY, 3, 2, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Riflesso rosso sinistro
            ctx.fillStyle = 'rgba(255, 40, 20, 0.6)';
            ctx.beginPath();
            ctx.arc(eyeX - 1, eyeY - 1, 1, 0, Math.PI * 2);
            ctx.fill();
            
            // Sopracciglio corrugato
            ctx.strokeStyle = black;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(eyeX - 6, eyeY - 5);
            ctx.lineTo(eyeX + 3, eyeY - 2);
            ctx.stroke();
            
            // Secondo occhio
            const eye2X = this.width - 8;
            const eye2Y = eyeY + 1;
            ctx.fillStyle = '#661515';
            ctx.beginPath();
            ctx.ellipse(eye2X, eye2Y, 3.5, 2, -0.1, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#200500';
            ctx.beginPath();
            ctx.ellipse(eye2X + 0.5, eye2Y, 2.5, 1.5, 0, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = black;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(eye2X - 4, eye2Y - 2);
            ctx.lineTo(eye2X + 3, eye2Y - 4);
            ctx.stroke();
        } else {
            // Occhi normali - ambra scuro (tipico Doberman)
            ctx.fillStyle = '#8a6530';
            ctx.beginPath();
            ctx.ellipse(eyeX, eyeY, 4, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#1a0800';
            ctx.beginPath();
            ctx.arc(eyeX, eyeY, 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Riflesso
            ctx.fillStyle = 'rgba(255, 200, 100, 0.3)';
            ctx.beginPath();
            ctx.arc(eyeX - 1, eyeY - 1, 1, 0, Math.PI * 2);
            ctx.fill();
            
            // Sopracciglio basso (sempre un po' minaccioso)
            ctx.strokeStyle = black;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(eyeX - 5, eyeY - 4);
            ctx.lineTo(eyeX + 3, eyeY - 5);
            ctx.stroke();
        }

        // === NASO ===
        ctx.fillStyle = '#1a0800';
        ctx.beginPath();
        ctx.ellipse(this.width + 21, this.height/2 + 1, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Narici
        ctx.fillStyle = '#0a0400';
        ctx.beginPath();
        ctx.arc(this.width + 19.5, this.height/2 + 2, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.width + 22.5, this.height/2 + 2, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // === BOCCA / RINGHIO ===
        if (isAggro) {
            // Labbro tirato su - ringhio Doberman
            ctx.fillStyle = '#2a0a08';
            ctx.beginPath();
            ctx.moveTo(this.width + 6, this.height/2 + 5);
            ctx.quadraticCurveTo(this.width + 14, this.height/2 + 3, this.width + 21, this.height/2 + 5);
            ctx.quadraticCurveTo(this.width + 16, this.height/2 + 7, this.width + 6, this.height/2 + 5);
            ctx.fill();
            
            // Cavità bocca
            ctx.fillStyle = '#150303';
            ctx.beginPath();
            ctx.ellipse(this.width + 14, this.height/2 + 8, 10, 5.5, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Gengive
            ctx.fillStyle = '#3a1010';
            ctx.beginPath();
            ctx.moveTo(this.width + 5, this.height/2 + 5);
            ctx.lineTo(this.width + 23, this.height/2 + 5);
            ctx.lineTo(this.width + 22, this.height/2 + 7);
            ctx.lineTo(this.width + 6, this.height/2 + 7);
            ctx.closePath();
            ctx.fill();
            
            // Zanne grandi (Doberman ha morso potente)
            ctx.fillStyle = '#ddd0c0';
            // Zanna sinistra
            ctx.beginPath();
            ctx.moveTo(this.width + 7, this.height/2 + 5);
            ctx.lineTo(this.width + 8, this.height/2 + 12);
            ctx.lineTo(this.width + 10, this.height/2 + 5);
            ctx.fill();
            // Zanna destra
            ctx.beginPath();
            ctx.moveTo(this.width + 17, this.height/2 + 5);
            ctx.lineTo(this.width + 18, this.height/2 + 13);
            ctx.lineTo(this.width + 20, this.height/2 + 5);
            ctx.fill();
            // Denti piccoli
            ctx.fillStyle = '#bbaa99';
            for (let t = 0; t < 3; t++) {
                ctx.fillRect(this.width + 11 + t * 2, this.height/2 + 5, 1.5, 4);
            }
            // Denti inferiori
            for (let t = 0; t < 2; t++) {
                ctx.fillRect(this.width + 10 + t * 5, this.height/2 + 11, 1.5, -3);
            }
            
            // Lingua
            if (isChasing && this.barkTimer % 30 < 10) {
                ctx.fillStyle = '#551818';
                ctx.beginPath();
                ctx.ellipse(this.width + 15, this.height/2 + 13, 4, 5, 0.15, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Saliva
            if (isChasing && this.barkTimer % 40 < 8) {
                ctx.fillStyle = 'rgba(180, 180, 190, 0.35)';
                const dripY = this.height/2 + 14 + (this.barkTimer % 40) * 0.5;
                ctx.beginPath();
                ctx.ellipse(this.width + 19, dripY, 1.5, 2.5, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Grinze ringhio
            ctx.strokeStyle = blackDark;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.width + 4, this.height/2 + 3);
            ctx.quadraticCurveTo(this.width + 2, this.height/2 + 6, this.width + 4, this.height/2 + 9);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.width + 3, this.height/2 + 1);
            ctx.quadraticCurveTo(this.width, this.height/2 + 4, this.width + 2, this.height/2 + 8);
            ctx.stroke();
        } else {
            // Bocca chiusa - linea dura
            ctx.strokeStyle = '#1a0800';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(this.width + 21, this.height/2 + 4);
            ctx.lineTo(this.width + 6, this.height/2 + 5);
            ctx.stroke();
            
            // Zanna che spunta anche a riposo
            ctx.fillStyle = '#ddd0c0';
            ctx.beginPath();
            ctx.moveTo(this.width + 16, this.height/2 + 4);
            ctx.lineTo(this.width + 17, this.height/2 + 8);
            ctx.lineTo(this.width + 18, this.height/2 + 4);
            ctx.fill();
        }
        
        // === ESCLAMATIVO ===
        if (isAlert) {
            ctx.fillStyle = '#cc2222';
            ctx.font = 'bold 22px Arial';
            ctx.fillText('!', this.width/2 - 5, -20);
        }
        
        // === ONDE RINGHIO ===
        if (isChasing && this.barkTimer % 30 < 10) {
            ctx.strokeStyle = 'rgba(200, 60, 40, 0.3)';
            ctx.lineWidth = 1.5;
            for (let w = 0; w < 3; w++) {
                const wr = 10 + w * 9 + Math.sin(CONFIG.time * 0.5) * 2;
                ctx.beginPath();
                ctx.arc(this.width + 22, this.height/2 + 2, wr, -0.5, 0.5);
                ctx.stroke();
            }
        }

        ctx.restore();
    }
}

// ============================================
// GHOST - Fantasma del gatto che sale in alto
// ============================================

class GhostCat {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.startY = y;
        this.alpha = 1;
        this.speed = 2.5;
        this.wobble = 0;
        this.active = true;
        this.scale = 1;
    }
    
    update() {
        if (!this.active) return;
        
        // Sale verso il cielo - più in alto, più veloce all'inizio
        this.y -= this.speed;
        this.speed *= 0.997;
        
        // Oscillazione laterale
        this.wobble += 0.06;
        this.x += Math.sin(this.wobble) * 1.2;
        
        // Sbiadisce lentamente
        this.alpha -= 0.004;
        
        // Si rimpicciolisce leggermente
        this.scale *= 0.999;
        
        // Disattiva quando sparisce - sale molto più in alto (800px)
        if (this.alpha <= 0 || this.y < this.startY - 800) {
            this.active = false;
        }
    }
    
    draw(ctx) {
        if (!this.active) return;
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        
        // Alone eterea ampio
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 50);
        glow.addColorStop(0, 'rgba(180, 200, 255, 0.25)');
        glow.addColorStop(0.3, 'rgba(150, 180, 255, 0.12)');
        glow.addColorStop(0.7, 'rgba(120, 140, 220, 0.04)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 50, 0, Math.PI * 2);
        ctx.fill();
        
        // Corpo fantasma
        ctx.fillStyle = 'rgba(180, 200, 255, 0.5)';
        ctx.beginPath();
        ctx.ellipse(0, -5, 16, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Bordo ondulato sotto (effetto fantasma)
        ctx.fillStyle = 'rgba(160, 180, 240, 0.35)';
        ctx.beginPath();
        ctx.moveTo(-16, 0);
        for (let i = 0; i <= 8; i++) {
            const wx = -16 + i * 4;
            const wy = 5 + Math.sin(CONFIG.time * 0.2 + i * 0.8) * 4;
            ctx.lineTo(wx, wy);
        }
        ctx.lineTo(16, 0);
        ctx.closePath();
        ctx.fill();
        
        // Testa
        ctx.fillStyle = 'rgba(180, 200, 255, 0.55)';
        ctx.beginPath();
        ctx.ellipse(10, -8, 12, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Orecchie
        ctx.beginPath();
        ctx.moveTo(3, -15);
        ctx.lineTo(-1, -28);
        ctx.lineTo(8, -17);
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(15, -16);
        ctx.lineTo(20, -28);
        ctx.lineTo(18, -14);
        ctx.fill();
        
        // Occhi luminosi
        ctx.fillStyle = 'rgba(220, 240, 255, 0.9)';
        ctx.beginPath();
        ctx.ellipse(8, -10, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(14, -10, 2.5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Coda fantasma ondulata
        ctx.strokeStyle = 'rgba(180, 200, 255, 0.4)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-14, -5);
        const wave = Math.sin(CONFIG.time * 0.12) * 10;
        ctx.quadraticCurveTo(-25, -18 + wave, -18, -35 + wave);
        ctx.stroke();
        
        // Scia di particelle più lunga
        for (let i = 0; i < 8; i++) {
            const px = Math.sin(CONFIG.time * 0.08 + i * 1.0) * 12;
            const py = 12 + i * 12;
            const palpha = (1 - i / 8) * 0.4;
            const psize = 3 - i * 0.3;
            
            ctx.fillStyle = `rgba(160, 180, 240, ${palpha})`;
            ctx.beginPath();
            ctx.arc(px, py, Math.max(0.5, psize), 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}
