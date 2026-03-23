// ============================================
// ENEMY - Cani randagi che inseguono il gatto
// ============================================

class Enemy {
    constructor(x, y, patrolRange = 200) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 32;
        this.vx = 0;
        this.vy = 0;
        this.speed = 2;
        this.chaseSpeed = 3.5;
        this.facing = 1;
        this.animFrame = 0;
        this.animTimer = 0;
        this.state = 'patrol'; // patrol, chase, alert
        
        // Patrol
        this.patrolStartX = x;
        this.patrolRange = patrolRange;
        this.patrolDirection = 1;
        this.pauseTimer = 0;
        
        // Detection
        this.detectionRange = 250;
        this.detectionRangeY = 100;
        this.loseRange = 400;
        
        // Alert
        this.alertTimer = 0;
        this.alertDuration = 40;
        
        // Animazione
        this.tailWag = 0;
        this.earBob = 0;
        this.barkTimer = 0;
    }
    
    update(cat, platforms) {
        const dx = cat.x - this.x;
        const dy = cat.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // State machine
        switch(this.state) {
            case 'patrol':
                this.patrol();
                
                // Detecta il gatto
                if (dist < this.detectionRange && Math.abs(dy) < this.detectionRangeY && !cat.invincible) {
                    this.state = 'alert';
                    this.alertTimer = this.alertDuration;
                    this.facing = dx > 0 ? 1 : -1;
                }
                break;
                
            case 'alert':
                // Si ferma, drizza le orecchie, poi insegue
                this.vx = 0;
                this.alertTimer--;
                this.facing = dx > 0 ? 1 : -1;
                
                if (this.alertTimer <= 0) {
                    this.state = 'chase';
                }
                break;
                
            case 'chase':
                this.chase(cat);
                
                // Perde il gatto
                if (dist > this.loseRange || cat.invincible) {
                    this.state = 'patrol';
                    this.pauseTimer = 60;
                }
                
                // Bark timer
                this.barkTimer++;
                break;
        }
        
        // Gravity
        this.vy += CONFIG.gravity;
        if (this.vy > 15) this.vy = 15;
        
        // Move
        this.x += this.vx;
        this.y += this.vy;
        
        // Collisioni con piattaforme
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
        
        // Bounds
        this.x = Math.max(0, Math.min(this.x, CONFIG.worldWidth - this.width));
        
        // Animation
        this.animTimer++;
        const animSpeed = this.state === 'chase' ? 5 : 8;
        if (this.animTimer > animSpeed) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 4;
        }
        
        this.tailWag = Math.sin(CONFIG.time * 0.15) * 0.4;
        this.earBob = Math.sin(CONFIG.time * 0.2) * 2;
    }
    
    patrol() {
        if (this.pauseTimer > 0) {
            this.pauseTimer--;
            this.vx = 0;
            return;
        }
        
        this.vx = this.patrolDirection * this.speed;
        this.facing = this.patrolDirection;
        
        // Inverti direzione ai limiti
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
        this.facing = dx > 0 ? 1 : -1;
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
        
        // Ombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(this.width/2, this.height + 2, 18, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Coda
        ctx.save();
        ctx.translate(3, this.height/2 - 5);
        ctx.rotate(this.tailWag + (this.state === 'chase' ? Math.sin(CONFIG.time * 0.3) * 0.5 : 0));
        ctx.fillStyle = '#3a2218';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-10, -15, -5, -25);
        ctx.quadraticCurveTo(-3, -28, -1, -25);
        ctx.quadraticCurveTo(-5, -10, 0, 3);
        ctx.fill();
        ctx.restore();

        // Corpo
        ctx.fillStyle = '#3a2218';
        ctx.beginPath();
        ctx.ellipse(this.width/2, this.height/2 + 3, 22, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Pancia
        ctx.fillStyle = '#4a3228';
        ctx.beginPath();
        ctx.ellipse(this.width/2, this.height/2 + 8, 16, 8, 0, 0, Math.PI);
        ctx.fill();

        // Zampe
        const legOffset = this.vx !== 0 ? Math.sin(this.animFrame * Math.PI / 2) * 4 : 0;
        ctx.fillStyle = '#2a1810';
        ctx.fillRect(16, this.height - 8 - legOffset, 7, 12);
        ctx.fillRect(this.width - 22, this.height - 8 - legOffset, 7, 12);
        ctx.fillRect(this.width - 14, this.height - 8 + legOffset, 7, 12);

        // Testa
        ctx.fillStyle = '#3a2218';
        ctx.fill();
        
        // Muso
        ctx.fillStyle = '#4a3228';
        ctx.beginPath();
        ctx.ellipse(this.width + 6, this.height/2 + 2, 10, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Orecchie (pendenti)
        ctx.fillStyle = '#2a1810';
        ctx.beginPath();
        ctx.moveTo(this.width - 16, this.height/2 - 12);
        ctx.quadraticCurveTo(this.width - 24, this.height/2 - 6 + this.earBob, this.width - 20, this.height/2 + 5);
        ctx.quadraticCurveTo(this.width - 16, this.height/2 - 4, this.width - 12, this.height/2 - 10);
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(this.width - 2, this.height/2 - 14);
        ctx.quadraticCurveTo(this.width + 8, this.height/2 - 8 + this.earBob, this.width + 4, this.height/2 + 3);
        ctx.quadraticCurveTo(this.width, this.height/2 - 6, this.width - 4, this.height/2 - 12);
        ctx.fill();
        
        // Alert: orecchie dritte
        if (this.state === 'alert') {
            ctx.fillStyle = '#3a2218';
            ctx.lineTo(this.width - 10, this.height/2 - 12);
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(this.width - 2, this.height/2 - 14);
            ctx.lineTo(this.width + 4, this.height/2 - 30);
            ctx.lineTo(this.width + 2, this.height/2 - 12);
            ctx.fill();
        }

        // Occhi
        const eyeSize = this.state === 'chase' ? 4 : 3;
        ctx.fillStyle = '#cccccc';
        ctx.fill();
        
        // Pupilla
        ctx.fillStyle = '#2a1a0a';
        const pupilOffset = this.state === 'chase' ? 1 : 0;
        ctx.beginPath();
        ctx.arc(this.width - 1 + pupilOffset, this.height/2 - 5, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Occhio arrabbiato in chase
        if (this.state === 'chase') {
            ctx.strokeStyle = '#3a2a1a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.width - 6, this.height/2 - 9);
            ctx.lineTo(this.width + 2, this.height/2 - 7);
            ctx.stroke();
        }

        // Naso
        ctx.fillStyle = '#2a1a0a';
        ctx.beginPath();
        ctx.ellipse(this.width + 12, this.height/2 + 1, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Bocca
        ctx.strokeStyle = '#3a1a0a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(this.width + 12, this.height/2 + 4);
        ctx.quadraticCurveTo(this.width + 8, this.height/2 + 8, this.width + 4, this.height/2 + 6);
        ctx.stroke();
        
        // Bocca aperta se insegue (abbaia)
        if (this.state === 'chase' && this.barkTimer % 30 < 10) {
            ctx.fillStyle = '#5a1a10';
            ctx.beginPath();
            ctx.ellipse(this.width + 10, this.height/2 + 7, 7, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Lingua
            ctx.fillStyle = '#883333';
            ctx.beginPath();
            ctx.ellipse(this.width + 12, this.height/2 + 10, 3, 4, 0.2, 0, Math.PI * 2);
            ctx.fill();
            
            // Denti
            ctx.fillStyle = '#aaa';
            ctx.fillRect(this.width + 12, this.height/2 + 3, 3, 3);
        }
        
        // Esclamativo quando alert
        if (this.state === 'alert') {
            ctx.fillStyle = '#cc2222';
            ctx.font = 'bold 20px Arial';
            ctx.fillText('!', this.width/2 - 4, -10);
        }

        ctx.restore();
    }
}

// ============================================
// GHOST - Animazione fantasma del gatto
// ============================================

class GhostCat {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.startY = y;
        this.alpha = 1;
        this.speed = 2;
        this.wobble = 0;
        this.active = true;
        this.scale = 1;
    }
    
    update() {
        if (!this.active) return;
        
        // Sale verso il cielo
        this.y -= this.speed;
        this.speed *= 0.995; // Rallenta un po'
        
        // Oscillazione laterale
        this.wobble += 0.08;
        this.x += Math.sin(this.wobble) * 1.5;
        
        // Sbiadisce
        this.alpha -= 0.008;
        
        // Si rimpicciolisce leggermente
        this.scale *= 0.998;
        
        // Disattiva quando sparisce
        if (this.alpha <= 0 || this.y < this.startY - 400) {
            this.active = false;
        }
    }
    
    draw(ctx) {
        if (!this.active) return;
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        
        // Alone di luce eterea
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
        glow.addColorStop(0, 'rgba(180, 200, 255, 0.3)');
        glow.addColorStop(0.5, 'rgba(150, 180, 255, 0.1)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 40, 0, Math.PI * 2);
        ctx.fill();
        
        // Corpo fantasma (trasparente, bluastro)
        ctx.fillStyle = 'rgba(180, 200, 255, 0.6)';
        
        // Forma fantasma con ondulazione
        ctx.beginPath();
        ctx.ellipse(0, -5, 16, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Testa
        ctx.beginPath();
        ctx.ellipse(10, -8, 12, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Orecchie del gatto fantasma
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
        
        // Coda fantasma ondulata
        ctx.strokeStyle = 'rgba(180, 200, 255, 0.5)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-14, -5);
        const wave = Math.sin(CONFIG.time * 0.15) * 8;
        ctx.quadraticCurveTo(-25, -15 + wave, -20, -30 + wave);
        ctx.stroke();
        
        // Scia di particelle verso l'alto
        for (let i = 0; i < 5; i++) {
            const px = Math.sin(CONFIG.time * 0.1 + i * 1.2) * 10;
            const py = 15 + i * 10;
            const palpha = (1 - i / 5) * 0.5;
            
            ctx.fillStyle = `rgba(180, 200, 255, ${palpha})`;
            ctx.beginPath();
            ctx.arc(px, py, 3 - i * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}
