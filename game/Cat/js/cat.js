// ============================================
// CAT - Il protagonista del gioco
// ============================================

class Cat {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.spawnX = x;
        this.spawnY = y;
        this.width = 40;
        this.height = 30;
        this.vx = 0;
        this.vy = 0;
        this.speed = 5;
        this.jumpForce = -14;
        this.onGround = false;
        this.facing = 1;
        this.animFrame = 0;
        this.animTimer = 0;
        this.state = 'idle';
        this.tailWag = 0;
        this.eyeBlink = 0;
        this.earTwitch = 0;
        
        // Vite
        this.lives = 9;
        this.invincible = false;
        this.invincibleTimer = 0;
        this.invincibleDuration = 120;
        
        // Salto
        this.coyoteTime = 0;
        this.coyoteTimeMax = 8;
        this.jumpBufferTime = 0;
        this.jumpBufferMax = 8;
    }

    update(platforms) {
        // Invincibilità dopo danno
        if (this.invincible) {
            this.invincibleTimer--;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
            }
        }
        
        // Coyote time
        if (this.onGround) {
            this.coyoteTime = this.coyoteTimeMax;
        } else if (this.coyoteTime > 0) {
            this.coyoteTime--;
        }
        
        // Jump buffer
        if (KEYS.space || KEYS.up) {
            this.jumpBufferTime = this.jumpBufferMax;
        } else if (this.jumpBufferTime > 0) {
            this.jumpBufferTime--;
        }
        
        // Movement
        if (KEYS.left) {
            this.vx = -this.speed;
            this.facing = -1;
            if (this.onGround) this.state = 'walk';
        } else if (KEYS.right) {
            this.vx = this.speed;
            this.facing = 1;
            if (this.onGround) this.state = 'walk';
        } else {
            this.vx *= CONFIG.friction;
            if (this.onGround && Math.abs(this.vx) < 0.5) this.state = 'idle';
        }

        // Jump
        const wantsToJump = this.jumpBufferTime > 0;
        
        if (wantsToJump && (this.onGround || this.coyoteTime > 0)) {
            this.vy = this.jumpForce;
            this.onGround = false;
            this.coyoteTime = 0;
            this.jumpBufferTime = 0;
            this.state = 'jump';
        }

        // Gravity
        this.vy += CONFIG.gravity;
        if (this.vy > 15) this.vy = 15;
        
        if (!this.onGround) {
            this.state = this.vy < 0 ? 'jump' : 'fall';
        }

        // Move and collide
        this.x += this.vx;
        this.checkCollisionX(platforms);
        
        this.y += this.vy;
        this.onGround = false;
        this.checkCollisionY(platforms);

        // Animation
        this.animTimer++;
        if (this.animTimer > 8) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 4;
        }

        this.tailWag = Math.sin(CONFIG.time * 0.1) * 0.3;
        
        if (Math.random() < 0.005) this.eyeBlink = 10;
        if (this.eyeBlink > 0) this.eyeBlink--;
        
        if (Math.random() < 0.01) this.earTwitch = 5;
        if (this.earTwitch > 0) this.earTwitch--;

        // Bounds
        this.x = Math.max(0, Math.min(this.x, CONFIG.worldWidth - this.width));
        this.y = Math.min(this.y, CONFIG.worldHeight - this.height);
    }

    takeDamage() {
        if (this.invincible) return false;
        
        this.lives--;
        this.invincible = true;
        this.invincibleTimer = this.invincibleDuration;
        
        return true;
    }

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

    draw(ctx) {
        // Lampeggio durante invincibilità
        if (this.invincible && Math.floor(this.invincibleTimer / 4) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }
        
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.scale(this.facing, 1);
        ctx.translate(-this.width/2, -this.height/2);

        // Ombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(this.width/2, this.height + 2, 15, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Glow contorno gatto - luce calda che illumina
        const catGlow = ctx.createRadialGradient(this.width/2, this.height/2, 0, this.width/2, this.height/2, 60);
        catGlow.addColorStop(0, 'rgba(255, 220, 150, 0.22)');
        catGlow.addColorStop(0.25, 'rgba(240, 200, 120, 0.12)');
        catGlow.addColorStop(0.5, 'rgba(220, 180, 100, 0.05)');
        catGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = catGlow;
        ctx.beginPath();
        ctx.arc(this.width/2, this.height/2, 60, 0, Math.PI * 2);
        ctx.fill();


        // Coda
        ctx.save();
        ctx.translate(5, this.height/2);
        ctx.rotate(this.tailWag + Math.sin(CONFIG.time * 0.15) * 0.2);
        ctx.fillStyle = '#333338';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-15, -20 + Math.sin(CONFIG.time * 0.1) * 5, -10, -35);
        ctx.quadraticCurveTo(-8, -40, -5, -35);
        ctx.quadraticCurveTo(-10, -15, 0, 5);
        ctx.fill();
        ctx.restore();

        // Corpo
        ctx.fillStyle = '#333338';
        ctx.beginPath();
        ctx.ellipse(this.width/2, this.height/2 + 5, 18, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Zampe
        const legOffset = this.state === 'walk' ? Math.sin(this.animFrame * Math.PI / 2) * 3 : 0;
        ctx.fillStyle = '#2d2d32';
        ctx.fillRect(8, this.height - 8 + legOffset, 6, 10);
        ctx.fillRect(14, this.height - 8 - legOffset, 6, 10);
        ctx.fillRect(this.width - 18, this.height - 8 - legOffset, 6, 10);
        ctx.fillRect(this.width - 12, this.height - 8 + legOffset, 6, 10);

        // Testa
        ctx.fillStyle = '#333338';
        ctx.beginPath();
        ctx.ellipse(this.width - 8, this.height/2 - 2, 14, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Orecchie
        const earOffset = this.earTwitch > 0 ? 2 : 0;
        ctx.beginPath();
        ctx.moveTo(this.width - 18, this.height/2 - 10);
        ctx.lineTo(this.width - 22, this.height/2 - 25 - earOffset);
        ctx.lineTo(this.width - 12, this.height/2 - 12);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(this.width - 2, this.height/2 - 10);
        ctx.lineTo(this.width + 4, this.height/2 - 25 + earOffset);
        ctx.lineTo(this.width + 2, this.height/2 - 12);
        ctx.fill();

        ctx.fillStyle = '#2e2020';
        ctx.beginPath();
        ctx.moveTo(this.width - 17, this.height/2 - 11);
        ctx.lineTo(this.width - 20, this.height/2 - 20 - earOffset);
        ctx.lineTo(this.width - 13, this.height/2 - 13);
        ctx.fill();

        // Occhi - glow ambra brillante
        if (this.eyeBlink < 3) {
            // Glow occhio - molto luminoso
            const eyeGlow = ctx.createRadialGradient(this.width - 4, this.height/2 - 3, 0, this.width - 4, this.height/2 - 3, 16);
            eyeGlow.addColorStop(0, 'rgba(255, 200, 0, 0.5)');
            eyeGlow.addColorStop(0.5, 'rgba(255, 160, 0, 0.2)');
            eyeGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = eyeGlow;
            ctx.beginPath();
            ctx.arc(this.width - 4, this.height/2 - 3, 16, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#ffbb00';
            ctx.beginPath();
            ctx.ellipse(this.width - 4, this.height/2 - 3, 4, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.ellipse(this.width - 3, this.height/2 - 3, 2, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.beginPath();
            ctx.arc(this.width - 5, this.height/2 - 5, 1.5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.strokeStyle = '#ddaa00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.width - 8, this.height/2 - 3);
            ctx.lineTo(this.width, this.height/2 - 3);
            ctx.stroke();
        }

        // Naso
        ctx.fillStyle = '#cc5555';
        ctx.beginPath();
        ctx.moveTo(this.width + 4, this.height/2);
        ctx.lineTo(this.width + 1, this.height/2 + 3);
        ctx.lineTo(this.width + 7, this.height/2 + 3);
        ctx.fill();

        // Baffi
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const y = this.height/2 + 2 + i * 3;
            ctx.beginPath();
            ctx.moveTo(this.width + 5, y);
            ctx.lineTo(this.width + 20, y - 2 + i * 2);
            ctx.stroke();
        }

        ctx.restore();
        ctx.globalAlpha = 1;
    }
}
