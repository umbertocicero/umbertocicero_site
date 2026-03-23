// ============================================
// NIGHT CAT - Indie Platformer Game
// Un gatto nero esplora la città di notte
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Canvas setup
canvas.width = 1200;
canvas.height = 700;

// ============================================
// GAME STATE
// ============================================
const game = {
    gravity: 0.5,
    friction: 0.8,
    cameraX: 0,
    cameraY: 0,
    worldWidth: 4000,
    worldHeight: 1500,
    time: 0
};

// ============================================
// INPUT HANDLING
// ============================================
const keys = {
    left: false,
    right: false,
    up: false,
    down: false,
    space: false
};

document.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'ArrowLeft': keys.left = true; break;
        case 'ArrowRight': keys.right = true; break;
        case 'ArrowUp': keys.up = true; break;
        case 'ArrowDown': keys.down = true; break;
        case 'Space': keys.space = true; e.preventDefault(); break;
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'ArrowLeft': keys.left = false; break;
        case 'ArrowRight': keys.right = false; break;
        case 'ArrowUp': keys.up = false; break;
        case 'ArrowDown': keys.down = false; break;
        case 'Space': keys.space = false; break;
    }
});

// ============================================
// CAT CLASS - Il protagonista
// ============================================
class Cat {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 30;
        this.vx = 0;
        this.vy = 0;
        this.speed = 5;
        this.jumpForce = -14;
        this.onGround = false;
        this.facing = 1; // 1 = destra, -1 = sinistra
        this.animFrame = 0;
        this.animTimer = 0;
        this.state = 'idle'; // idle, walk, jump, fall, climb, wallslide
        this.tailWag = 0;
        this.eyeBlink = 0;
        this.earTwitch = 0;
        
        // Nuove abilità
        this.canDoubleJump = true;
        this.hasDoubleJumped = false;
        this.onWall = false;
        this.wallDirection = 0; // -1 sinistra, 1 destra
        this.isClimbing = false;
        this.climbSpeed = 3;
        this.wallJumpForce = -12;
        this.wallJumpPush = 8;
        this.coyoteTime = 0; // tempo extra per saltare dopo aver lasciato una piattaforma
        this.coyoteTimeMax = 8;
        this.jumpBufferTime = 0;
        this.jumpBufferMax = 8;
    }

    update() {
        // Coyote time (permette di saltare poco dopo aver lasciato una piattaforma)
        if (this.onGround) {
            this.coyoteTime = this.coyoteTimeMax;
            this.hasDoubleJumped = false;
        } else if (this.coyoteTime > 0) {
            this.coyoteTime--;
        }
        
        // Jump buffer (registra il salto premuto prima di atterrare)
        if (keys.space || keys.up) {
            this.jumpBufferTime = this.jumpBufferMax;
        } else if (this.jumpBufferTime > 0) {
            this.jumpBufferTime--;
        }
        
        // Check wall contact
        this.checkWallContact();
        
        // Input movement
        if (keys.left) {
            if (!this.isClimbing) this.vx = -this.speed;
            this.facing = -1;
            if (this.onGround) this.state = 'walk';
        } else if (keys.right) {
            if (!this.isClimbing) this.vx = this.speed;
            this.facing = 1;
            if (this.onGround) this.state = 'walk';
        } else {
            this.vx *= game.friction;
            if (this.onGround && Math.abs(this.vx) < 0.5) this.state = 'idle';
        }
        
        // Wall climbing
        if (this.onWall && !this.onGround) {
            // Arrampicata tenendo premuto verso il muro
            if ((keys.left && this.wallDirection === -1) || (keys.right && this.wallDirection === 1)) {
                this.isClimbing = true;
                this.vy *= 0.8; // Rallenta la caduta
                
                if (keys.up) {
                    this.vy = -this.climbSpeed;
                    this.state = 'climb';
                } else if (keys.down) {
                    this.vy = this.climbSpeed;
                    this.state = 'climb';
                } else {
                    // Wall slide - scivola lentamente
                    if (this.vy > 2) this.vy = 2;
                    this.state = 'wallslide';
                }
            } else {
                this.isClimbing = false;
            }
        } else {
            this.isClimbing = false;
        }

        // Jump logic
        const wantsToJump = this.jumpBufferTime > 0;
        
        if (wantsToJump) {
            if (this.onGround || this.coyoteTime > 0) {
                // Salto normale
                this.vy = this.jumpForce;
                this.onGround = false;
                this.coyoteTime = 0;
                this.jumpBufferTime = 0;
                this.state = 'jump';
            } else if (this.onWall && !this.onGround) {
                // Wall jump
                this.vy = this.wallJumpForce;
                this.vx = -this.wallDirection * this.wallJumpPush;
                this.facing = -this.wallDirection;
                this.onWall = false;
                this.isClimbing = false;
                this.jumpBufferTime = 0;
                this.hasDoubleJumped = false; // Reset doppio salto dopo wall jump
                this.state = 'jump';
            } else if (this.canDoubleJump && !this.hasDoubleJumped) {
                // Doppio salto
                this.vy = this.jumpForce * 0.85;
                this.hasDoubleJumped = true;
                this.jumpBufferTime = 0;
                this.state = 'jump';
            }
        }

        // Gravity (ridotta durante climb/wallslide)
        if (this.isClimbing) {
            this.vy += game.gravity * 0.3;
        } else if (this.onWall && this.vy > 0) {
            this.vy += game.gravity * 0.5;
        } else {
            this.vy += game.gravity;
        }
        
        // Limita velocità di caduta
        if (this.vy > 15) this.vy = 15;
        
        // State based on velocity
        if (!this.onGround && !this.isClimbing && this.state !== 'wallslide') {
            this.state = this.vy < 0 ? 'jump' : 'fall';
        }

        // Move and check collisions
        this.x += this.vx;
        this.checkCollisionX();
        
        this.y += this.vy;
        this.onGround = false;
        this.checkCollisionY();

        // Animation
        this.animTimer++;
        if (this.animTimer > 8) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 4;
        }

        // Tail wagging
        this.tailWag = Math.sin(game.time * 0.1) * 0.3;
        
        // Eye blinking
        if (Math.random() < 0.005) this.eyeBlink = 10;
        if (this.eyeBlink > 0) this.eyeBlink--;
        
        // Ear twitching
        if (Math.random() < 0.01) this.earTwitch = 5;
        if (this.earTwitch > 0) this.earTwitch--;

        // Keep in world bounds
        this.x = Math.max(0, Math.min(this.x, game.worldWidth - this.width));
        this.y = Math.min(this.y, game.worldHeight - this.height);
    }

    checkCollisionX() {
        for (const platform of platforms) {
            // Gli edifici non bloccano orizzontalmente (ci passi davanti)
            if (platform.roofOnly) continue;
            // Le piattaforme one-way non bloccano orizzontalmente
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

    checkCollisionY() {
        for (const platform of platforms) {
            // Per le piattaforme one-way e i tetti: solidi solo quando cadi dall'alto
            if (platform.isOneWay || platform.roofOnly) {
                // Controlla se stai cadendo (vy > 0) e sei sopra la piattaforma
                if (this.vy > 0) {
                    const feetY = this.y + this.height;
                    const prevFeetY = feetY - this.vy;
                    
                    // Collisione solo se i piedi attraversano il top della piattaforma
                    if (prevFeetY <= platform.y + 5 && feetY >= platform.y) {
                        if (this.x + this.width > platform.x + 5 && this.x < platform.x + platform.width - 5) {
                            this.y = platform.y - this.height;
                            this.vy = 0;
                            this.onGround = true;
                        }
                    }
                }
            } else {
                // Collisione normale per il terreno (asfalto)
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
    
    checkWallContact() {
        this.onWall = false;
        this.wallDirection = 0;
        
        // Solo controlla muri se non è a terra
        if (this.onGround) return;
        
        const margin = 5;
        
        for (const platform of platforms) {
            // Gli edifici non sono muri (ci passi attraverso)
            // Solo fire-escape possono essere usate per wall climb
            if (platform.type !== 'fire-escape') continue;
            
            // Controlla se siamo accanto a un muro (non sopra o sotto)
            const verticalOverlap = this.y + this.height > platform.y + 5 && 
                                   this.y < platform.y + platform.height - 5;
            
            if (!verticalOverlap) continue;
            
            // Muro a destra
            if (this.x + this.width >= platform.x - margin && 
                this.x + this.width <= platform.x + margin &&
                platform.height > 10) {
                this.onWall = true;
                this.wallDirection = 1;
                break;
            }
            
            // Muro a sinistra
            if (this.x <= platform.x + platform.width + margin && 
                this.x >= platform.x + platform.width - margin &&
                platform.height > 10) {
                this.onWall = true;
                this.wallDirection = -1;
                break;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        
        // Rotazione durante wall slide/climb
        if (this.state === 'wallslide' || this.state === 'climb') {
            ctx.rotate(this.wallDirection * 0.2);
        }
        
        ctx.scale(this.facing, 1);
        ctx.translate(-this.width/2, -this.height/2);

        // Ombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(this.width/2, this.height + 2, 15, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Coda
        ctx.save();
        ctx.translate(5, this.height/2);
        ctx.rotate(this.tailWag + Math.sin(game.time * 0.15) * 0.2);
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-15, -20 + Math.sin(game.time * 0.1) * 5, -10, -35);
        ctx.quadraticCurveTo(-8, -40, -5, -35);
        ctx.quadraticCurveTo(-10, -15, 0, 5);
        ctx.fill();
        ctx.restore();

        // Corpo
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.ellipse(this.width/2, this.height/2 + 5, 18, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Zampe posteriori
        const legOffset = this.state === 'walk' ? Math.sin(this.animFrame * Math.PI / 2) * 3 : 0;
        ctx.fillStyle = '#151515';
        ctx.fillRect(8, this.height - 8 + legOffset, 6, 10);
        ctx.fillRect(14, this.height - 8 - legOffset, 6, 10);

        // Zampe anteriori
        ctx.fillRect(this.width - 18, this.height - 8 - legOffset, 6, 10);
        ctx.fillRect(this.width - 12, this.height - 8 + legOffset, 6, 10);

        // Testa
        ctx.fillStyle = '#1a1a1a';
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

        // Interno orecchie
        ctx.fillStyle = '#3a2a2a';
        ctx.beginPath();
        ctx.moveTo(this.width - 17, this.height/2 - 11);
        ctx.lineTo(this.width - 20, this.height/2 - 20 - earOffset);
        ctx.lineTo(this.width - 13, this.height/2 - 13);
        ctx.fill();

        // Occhi
        if (this.eyeBlink < 3) {
            // Occhio aperto con riflesso
            ctx.fillStyle = '#ffdd00';
            ctx.beginPath();
            ctx.ellipse(this.width - 4, this.height/2 - 3, 4, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Pupilla
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.ellipse(this.width - 3, this.height/2 - 3, 2, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Riflesso
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(this.width - 5, this.height/2 - 5, 1.5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Occhio chiuso
            ctx.strokeStyle = '#ffdd00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.width - 8, this.height/2 - 3);
            ctx.lineTo(this.width, this.height/2 - 3);
            ctx.stroke();
        }

        // Naso
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.moveTo(this.width + 4, this.height/2);
        ctx.lineTo(this.width + 1, this.height/2 + 3);
        ctx.lineTo(this.width + 7, this.height/2 + 3);
        ctx.fill();

        // Baffi
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const y = this.height/2 + 2 + i * 3;
            ctx.beginPath();
            ctx.moveTo(this.width + 5, y);
            ctx.lineTo(this.width + 20, y - 2 + i * 2);
            ctx.stroke();
        }

        ctx.restore();
    }
}

// ============================================
// FIRE ESCAPE STRUCTURE CLASS - Scala antincendio completa
// ============================================
class FireEscapeStructure {
    constructor(x, baseY, buildingHeight, floors) {
        this.x = x;
        this.baseY = baseY;
        this.buildingHeight = buildingHeight;
        this.floors = floors;
        this.platformWidth = 90;
        this.platformHeight = 12;
        this.floorHeight = 85; // Distanza tra i piani (raggiungibile con un salto)
        this.platforms = [];
        
        this.generatePlatforms();
    }
    
    generatePlatforms() {
        // Genera piattaforme per ogni piano
        for (let i = 0; i < this.floors; i++) {
            const py = this.baseY - (i + 1) * this.floorHeight;
            this.platforms.push({
                x: this.x,
                y: py,
                width: this.platformWidth,
                height: this.platformHeight
            });
        }
    }
    
    getPlatforms() {
        return this.platforms;
    }
    
    draw(ctx) {
        // Pilastri verticali principali
        const pillarWidth = 6;
        const topY = this.baseY - this.floors * this.floorHeight - 20;
        
        // Pilastro sinistro
        this.drawPillar(ctx, this.x - 5, topY, this.baseY - topY);
        // Pilastro destro
        this.drawPillar(ctx, this.x + this.platformWidth - 1, topY, this.baseY - topY);
        
        // Disegna ogni piano
        for (let i = 0; i < this.floors; i++) {
            const platform = this.platforms[i];
            const isTop = i === this.floors - 1;
            
            // Piattaforma
            this.drawPlatform(ctx, platform.x, platform.y, platform.width, platform.height);
            
            // Ringhiera
            this.drawRailing(ctx, platform.x, platform.y - 35, platform.width, 35);
            
            // Scale tra i piani (tranne l'ultimo)
            if (i < this.floors - 1) {
                const nextPlatform = this.platforms[i + 1];
                this.drawStairs(ctx, platform.x, platform.y, nextPlatform.y, i % 2 === 0);
            }
        }
        
        // Scala dal terreno alla prima piattaforma
        if (this.platforms.length > 0) {
            this.drawLadder(ctx, this.x + this.platformWidth/2 - 10, this.platforms[0].y + this.platformHeight, this.baseY);
        }
    }
    
    drawPillar(ctx, x, y, height) {
        // Pilastro principale con gradiente
        const gradient = ctx.createLinearGradient(x, y, x + 6, y);
        gradient.addColorStop(0, '#5a5a5a');
        gradient.addColorStop(0.3, '#707070');
        gradient.addColorStop(0.7, '#606060');
        gradient.addColorStop(1, '#4a4a4a');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, 6, height);
        
        // Bordi
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, 6, height);
        
        // Bulloni/giunture ogni 80px
        ctx.fillStyle = '#4a4a4a';
        for (let by = y + 40; by < y + height - 20; by += 80) {
            ctx.beginPath();
            ctx.arc(x + 3, by, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#5a5a5a';
            ctx.stroke();
        }
    }
    
    drawPlatform(ctx, x, y, width, height) {
        // Base della piattaforma
        const gradient = ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, '#6a6a6a');
        gradient.addColorStop(0.3, '#5a5a5a');
        gradient.addColorStop(1, '#4a4a4a');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, width, height);
        
        // Superficie grigliata
        ctx.strokeStyle = '#7a7a7a';
        ctx.lineWidth = 1;
        
        // Linee orizzontali
        for (let gy = y + 3; gy < y + height; gy += 3) {
            ctx.beginPath();
            ctx.moveTo(x + 2, gy);
            ctx.lineTo(x + width - 2, gy);
            ctx.stroke();
        }
        
        // Linee verticali
        for (let gx = x + 6; gx < x + width - 4; gx += 6) {
            ctx.beginPath();
            ctx.moveTo(gx, y + 1);
            ctx.lineTo(gx, y + height - 1);
            ctx.stroke();
        }
        
        // Bordo metallico
        ctx.strokeStyle = '#8a8a8a';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        
        // Highlight superiore
        ctx.strokeStyle = '#9a9a9a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 1, y + 1);
        ctx.lineTo(x + width - 1, y + 1);
        ctx.stroke();
        
        // Supporti sotto la piattaforma
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(x + 15, y + height, 4, 8);
        ctx.fillRect(x + width - 19, y + height, 4, 8);
        
        // Traverse diagonali di supporto
        ctx.strokeStyle = '#5a5a5a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 2, y + height);
        ctx.lineTo(x + 17, y + height + 8);
        ctx.moveTo(x + width - 2, y + height);
        ctx.lineTo(x + width - 17, y + height + 8);
        ctx.stroke();
    }
    
    drawRailing(ctx, x, y, width, height) {
        const railColor = '#5a5a5a';
        const highlightColor = '#7a7a7a';
        
        // Montanti verticali
        const postSpacing = 22;
        const posts = Math.floor(width / postSpacing);
        
        for (let i = 0; i <= posts; i++) {
            const px = x + i * postSpacing;
            if (px > x + width - 5) break;
            
            // Montante
            ctx.fillStyle = railColor;
            ctx.fillRect(px, y, 3, height);
            
            // Highlight
            ctx.fillStyle = highlightColor;
            ctx.fillRect(px, y, 1, height);
        }
        
        // Corrimano superiore
        ctx.fillStyle = '#6a6a6a';
        ctx.fillRect(x - 2, y - 3, width + 4, 5);
        ctx.strokeStyle = '#8a8a8a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - 2, y - 2);
        ctx.lineTo(x + width + 2, y - 2);
        ctx.stroke();
        
        // Barra orizzontale centrale
        ctx.fillStyle = '#5a5a5a';
        ctx.fillRect(x, y + height/2, width, 2);
        
        // Barra orizzontale inferiore
        ctx.fillRect(x, y + height - 3, width, 2);
    }
    
    drawStairs(ctx, x, fromY, toY, goingRight) {
        const stairWidth = this.platformWidth - 20;
        const stairHeight = fromY - toY - this.platformHeight;
        const steps = 8;
        const stepHeight = stairHeight / steps;
        const stepWidth = stairWidth / steps;
        
        const startX = goingRight ? x + 10 : x + this.platformWidth - 10;
        const direction = goingRight ? 1 : -1;
        
        // Stringhe laterali (supporti inclinati)
        ctx.strokeStyle = '#5a5a5a';
        ctx.lineWidth = 4;
        
        // Stringa sinistra
        ctx.beginPath();
        ctx.moveTo(startX, fromY);
        ctx.lineTo(startX + direction * stairWidth, toY + this.platformHeight);
        ctx.stroke();
        
        // Stringa destra
        ctx.beginPath();
        ctx.moveTo(startX + direction * 15, fromY);
        ctx.lineTo(startX + direction * (stairWidth + 15), toY + this.platformHeight);
        ctx.stroke();
        
        // Highlight stringhe
        ctx.strokeStyle = '#7a7a7a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(startX + 1, fromY);
        ctx.lineTo(startX + direction * stairWidth + 1, toY + this.platformHeight);
        ctx.stroke();
        
        // Gradini
        for (let i = 0; i < steps; i++) {
            const stepX = startX + direction * (i * stepWidth);
            const stepY = fromY - (i + 1) * stepHeight;
            
            // Gradino
            const gradient = ctx.createLinearGradient(stepX, stepY, stepX, stepY + 4);
            gradient.addColorStop(0, '#6a6a6a');
            gradient.addColorStop(1, '#4a4a4a');
            ctx.fillStyle = gradient;
            
            const sw = 18;
            const actualX = goingRight ? stepX : stepX - sw;
            ctx.fillRect(actualX, stepY, sw, 4);
            
            // Bordo gradino
            ctx.strokeStyle = '#7a7a7a';
            ctx.lineWidth = 1;
            ctx.strokeRect(actualX, stepY, sw, 4);
        }
    }
    
    drawLadder(ctx, x, fromY, toY) {
        const ladderWidth = 20;
        const rungSpacing = 20;
        
        // Montanti verticali della scala
        ctx.fillStyle = '#5a5a5a';
        ctx.fillRect(x, fromY, 3, toY - fromY);
        ctx.fillRect(x + ladderWidth - 3, fromY, 3, toY - fromY);
        
        // Highlight
        ctx.fillStyle = '#6a6a6a';
        ctx.fillRect(x, fromY, 1, toY - fromY);
        ctx.fillRect(x + ladderWidth - 3, fromY, 1, toY - fromY);
        
        // Pioli
        for (let ry = fromY + 15; ry < toY - 10; ry += rungSpacing) {
            ctx.fillStyle = '#5a5a5a';
            ctx.fillRect(x + 2, ry, ladderWidth - 4, 3);
            
            // Highlight piolo
            ctx.fillStyle = '#6a6a6a';
            ctx.fillRect(x + 2, ry, ladderWidth - 4, 1);
        }
    }
}

// ============================================
// PLATFORM CLASS
// ============================================
class Platform {
    constructor(x, y, width, height, type = 'building') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
        this.color = this.getColor();
        this.windows = this.generateWindows();
        
        // One-way platforms: solide solo dall'alto quando si cade
        // I palazzi sono solidi SOLO sul tetto
        this.isOneWay = (type === 'building' || type === 'fire-escape' || type === 'railing' || type === 'dumpster');
        this.roofOnly = (type === 'building'); // Solo il tetto è solido per gli edifici
    }

    getColor() {
        const colors = {
            'building': '#2a2a3a',
            'fire-escape': '#3a3a3a',
            'dumpster': '#1a1a1a',
            'railing': '#4a4a5a',
            'roof': '#1a1a2a',
            'ground': '#2a2a2a'
        };
        return colors[this.type] || '#2a2a3a';
    }

    generateWindows() {
        if (this.type !== 'building' || this.height < 100) return [];
        const windows = [];
        const cols = Math.floor(this.width / 50);
        const rows = Math.floor(this.height / 60);
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (Math.random() > 0.3) {
                    windows.push({
                        x: 20 + col * 50,
                        y: 30 + row * 60,
                        lit: Math.random() > 0.6,
                        color: Math.random() > 0.5 ? '#ffeeaa' : '#aaeeff'
                    });
                }
            }
        }
        return windows;
    }

    draw(ctx) {
        // Main shape
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Border
        ctx.strokeStyle = '#1a1a2a';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        // Type-specific decorations
        switch(this.type) {
            case 'building':
                this.drawBuilding(ctx);
                break;
            case 'fire-escape':
                this.drawFireEscape(ctx);
                break;
            case 'dumpster':
                this.drawDumpster(ctx);
                break;
            case 'railing':
                this.drawRailing(ctx);
                break;
            case 'ground':
                this.drawGround(ctx);
                break;
        }
    }
    
    drawGround(ctx) {
        // Asfalto con gradiente di profondità
        const asphaltGradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        asphaltGradient.addColorStop(0, '#252528');
        asphaltGradient.addColorStop(0.1, '#1e1e22');
        asphaltGradient.addColorStop(1, '#151518');
        ctx.fillStyle = asphaltGradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Marciapiede/bordo
        const curbGradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + 12);
        curbGradient.addColorStop(0, '#4a4a50');
        curbGradient.addColorStop(0.5, '#3a3a40');
        curbGradient.addColorStop(1, '#2a2a30');
        ctx.fillStyle = curbGradient;
        ctx.fillRect(this.x, this.y, this.width, 12);
        
        // Linea bianca del marciapiede
        ctx.fillStyle = '#3a3a40';
        ctx.fillRect(this.x, this.y + 10, this.width, 2);
        
        // Texture dell'asfalto - piccole variazioni
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        for (let i = 0; i < this.width; i += 40) {
            for (let j = 15; j < this.height - 10; j += 20) {
                if (Math.random() > 0.5) {
                    ctx.fillRect(this.x + i + Math.random() * 30, this.y + j, 2 + Math.random() * 3, 1);
                }
            }
        }
        
        // Crepe nell'asfalto
        ctx.strokeStyle = '#1a1a1d';
        ctx.lineWidth = 1;
        for (let i = 0; i < this.width; i += 250) {
            ctx.beginPath();
            ctx.moveTo(this.x + i + 80, this.y + 15);
            ctx.lineTo(this.x + i + 90 + Math.random() * 10, this.y + 30);
            ctx.lineTo(this.x + i + 85, this.y + 45);
            ctx.stroke();
            
            // Crepa secondaria
            ctx.beginPath();
            ctx.moveTo(this.x + i + 88, this.y + 28);
            ctx.lineTo(this.x + i + 100, this.y + 35);
            ctx.stroke();
        }
        
        // Tombini
        for (let i = 200; i < this.width; i += 500) {
            // Cornice tombino
            ctx.fillStyle = '#2a2a2e';
            ctx.fillRect(this.x + i, this.y + 20, 40, 30);
            
            // Griglia tombino
            ctx.fillStyle = '#151518';
            ctx.fillRect(this.x + i + 3, this.y + 23, 34, 24);
            
            // Linee della griglia
            ctx.strokeStyle = '#2a2a2e';
            ctx.lineWidth = 2;
            for (let g = 0; g < 5; g++) {
                ctx.beginPath();
                ctx.moveTo(this.x + i + 6, this.y + 27 + g * 5);
                ctx.lineTo(this.x + i + 34, this.y + 27 + g * 5);
                ctx.stroke();
            }
        }
        
        // Strisce stradali gialle (intermittenti)
        ctx.fillStyle = '#5a5a30';
        for (let i = 50; i < this.width; i += 150) {
            ctx.fillRect(this.x + i, this.y + 35, 50, 4);
        }
    }

    drawBuilding(ctx) {
        // Gradiente per profondità edificio
        const buildingGradient = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y);
        buildingGradient.addColorStop(0, '#2a2a3a');
        buildingGradient.addColorStop(0.1, '#323242');
        buildingGradient.addColorStop(0.9, '#282838');
        buildingGradient.addColorStop(1, '#222232');
        ctx.fillStyle = buildingGradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Bordo sinistro scuro (profondità)
        ctx.fillStyle = '#1a1a28';
        ctx.fillRect(this.x, this.y, 3, this.height);
        
        // Bordo destro più chiaro
        ctx.fillStyle = '#353545';
        ctx.fillRect(this.x + this.width - 2, this.y, 2, this.height);
        
        // Cornice del tetto
        ctx.fillStyle = '#3a3a4a';
        ctx.fillRect(this.x - 3, this.y - 6, this.width + 6, 10);
        ctx.fillStyle = '#2a2a3a';
        ctx.fillRect(this.x - 2, this.y - 3, this.width + 4, 5);
        
        // Windows
        for (const win of this.windows) {
            const wx = this.x + win.x;
            const wy = this.y + win.y;
            
            // Incavo finestra (profondità)
            ctx.fillStyle = '#1a1a28';
            ctx.fillRect(wx - 2, wy - 2, 34, 44);
            
            if (win.lit) {
                // Glow esterno
                const glowGradient = ctx.createRadialGradient(
                    wx + 15, wy + 20, 0,
                    wx + 15, wy + 20, 50
                );
                glowGradient.addColorStop(0, win.color + '30');
                glowGradient.addColorStop(0.5, win.color + '15');
                glowGradient.addColorStop(1, 'transparent');
                ctx.fillStyle = glowGradient;
                ctx.fillRect(wx - 20, wy - 15, 70, 70);
                
                // Vetro illuminato con gradiente
                const windowGradient = ctx.createLinearGradient(wx, wy, wx, wy + 40);
                windowGradient.addColorStop(0, win.color);
                windowGradient.addColorStop(1, win.color === '#ffeeaa' ? '#ddcc88' : '#88ccdd');
                ctx.fillStyle = windowGradient;
            } else {
                // Vetro scuro con riflesso
                const darkGradient = ctx.createLinearGradient(wx, wy, wx + 30, wy + 40);
                darkGradient.addColorStop(0, '#1a1a2a');
                darkGradient.addColorStop(0.3, '#222235');
                darkGradient.addColorStop(1, '#151525');
                ctx.fillStyle = darkGradient;
            }
            ctx.fillRect(wx, wy, 30, 40);
            
            // Riflesso sul vetro
            if (!win.lit) {
                ctx.fillStyle = 'rgba(100, 100, 150, 0.1)';
                ctx.beginPath();
                ctx.moveTo(wx + 2, wy + 2);
                ctx.lineTo(wx + 12, wy + 2);
                ctx.lineTo(wx + 2, wy + 15);
                ctx.closePath();
                ctx.fill();
            }
            
            // Cornice finestra
            ctx.strokeStyle = '#4a4a5a';
            ctx.lineWidth = 2;
            ctx.strokeRect(wx, wy, 30, 40);
            
            // Divisori finestra
            ctx.strokeStyle = '#3a3a4a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(wx + 15, wy);
            ctx.lineTo(wx + 15, wy + 40);
            ctx.moveTo(wx, wy + 20);
            ctx.lineTo(wx + 30, wy + 20);
            ctx.stroke();
            
            // Davanzale
            ctx.fillStyle = '#4a4a5a';
            ctx.fillRect(wx - 3, wy + 40, 36, 4);
        }

        // Dettagli sul tetto
        if (this.height > 100) {
            // Camino
            ctx.fillStyle = '#252535';
            ctx.fillRect(this.x + 15, this.y - 20, 18, 22);
            ctx.fillStyle = '#1a1a28';
            ctx.fillRect(this.x + 14, this.y - 24, 20, 6);
            
            // Antenna/condotto aria
            ctx.fillStyle = '#3a3a4a';
            ctx.fillRect(this.x + this.width - 35, this.y - 30, 12, 32);
            ctx.fillStyle = '#4a4a5a';
            ctx.fillRect(this.x + this.width - 38, this.y - 32, 18, 4);
            
            // Tubature sul tetto
            ctx.strokeStyle = '#3a3a4a';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.x + 40, this.y - 2);
            ctx.lineTo(this.x + 80, this.y - 2);
            ctx.stroke();
        }
        
        // Grondaia
        ctx.fillStyle = '#3a3a4a';
        ctx.fillRect(this.x - 2, this.y + this.height - 8, this.width + 4, 3);
    }

    drawFireEscape(ctx) {
        // Piattaforma principale con gradiente metallico
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        gradient.addColorStop(0, '#5a5a6a');
        gradient.addColorStop(0.5, '#4a4a5a');
        gradient.addColorStop(1, '#3a3a4a');
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Superficie grigliata
        ctx.strokeStyle = '#6a6a7a';
        ctx.lineWidth = 1;
        const gridSize = 8;
        for (let gx = this.x + 4; gx < this.x + this.width - 4; gx += gridSize) {
            ctx.beginPath();
            ctx.moveTo(gx, this.y + 2);
            ctx.lineTo(gx, this.y + this.height - 2);
            ctx.stroke();
        }
        for (let gy = this.y + 3; gy < this.y + this.height; gy += 4) {
            ctx.beginPath();
            ctx.moveTo(this.x + 2, gy);
            ctx.lineTo(this.x + this.width - 2, gy);
            ctx.stroke();
        }
        
        // Bordi metallici lucidi
        ctx.strokeStyle = '#7a7a8a';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // Highlight superiore
        ctx.strokeStyle = '#8a8a9a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x + 1, this.y + 1);
        ctx.lineTo(this.x + this.width - 1, this.y + 1);
        ctx.stroke();
        
        // Supporti laterali (staffe)
        ctx.fillStyle = '#4a4a5a';
        ctx.fillRect(this.x - 4, this.y + 2, 6, this.height - 2);
        ctx.fillRect(this.x + this.width - 2, this.y + 2, 6, this.height - 2);
        
        // Bulloni decorativi
        ctx.fillStyle = '#6a6a7a';
        ctx.beginPath();
        ctx.arc(this.x + 6, this.y + this.height/2, 2, 0, Math.PI * 2);
        ctx.arc(this.x + this.width - 6, this.y + this.height/2, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    drawDumpster(ctx) {
        // Ombra del cassonetto
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x + this.width/2, this.y + this.height + 5, this.width/2 + 5, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Corpo del cassonetto con gradiente
        const bodyGradient = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y);
        bodyGradient.addColorStop(0, '#1a1a1a');
        bodyGradient.addColorStop(0.2, '#252525');
        bodyGradient.addColorStop(0.8, '#202020');
        bodyGradient.addColorStop(1, '#151515');
        ctx.fillStyle = bodyGradient;
        
        // Forma del cassonetto (leggermente rastremato)
        ctx.beginPath();
        ctx.moveTo(this.x + 3, this.y);
        ctx.lineTo(this.x + this.width - 3, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        
        // Bordi metallici lucidi
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Costole verticali del cassonetto
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
            const rx = this.x + (this.width / 4) * i;
            ctx.beginPath();
            ctx.moveTo(rx, this.y + 5);
            ctx.lineTo(rx + (i < 2 ? -1 : 1), this.y + this.height - 3);
            ctx.stroke();
        }
        
        // Fascia superiore
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(this.x + 2, this.y + 3, this.width - 4, 8);
        
        // Coperchio con gradiente
        const lidGradient = ctx.createLinearGradient(this.x, this.y - 10, this.x, this.y);
        lidGradient.addColorStop(0, '#2a2a2a');
        lidGradient.addColorStop(0.5, '#222222');
        lidGradient.addColorStop(1, '#1a1a1a');
        ctx.fillStyle = lidGradient;
        
        // Forma coperchio arrotondata
        ctx.beginPath();
        ctx.moveTo(this.x - 3, this.y);
        ctx.lineTo(this.x + this.width + 3, this.y);
        ctx.quadraticCurveTo(this.x + this.width + 5, this.y - 5, this.x + this.width + 2, this.y - 8);
        ctx.lineTo(this.x - 2, this.y - 8);
        ctx.quadraticCurveTo(this.x - 5, this.y - 5, this.x - 3, this.y);
        ctx.fill();
        
        // Bordo coperchio
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Highlight sul coperchio
        ctx.strokeStyle = '#404040';
        ctx.beginPath();
        ctx.moveTo(this.x + 5, this.y - 6);
        ctx.lineTo(this.x + this.width - 5, this.y - 6);
        ctx.stroke();
        
        // Maniglia del coperchio
        ctx.fillStyle = '#3a3a3a';
        ctx.beginPath();
        ctx.roundRect(this.x + this.width/2 - 15, this.y - 12, 30, 6, 2);
        ctx.fill();
        ctx.strokeStyle = '#4a4a4a';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Ruote dettagliate
        const wheelY = this.y + this.height + 2;
        for (const wheelX of [this.x + 12, this.x + this.width - 12]) {
            // Supporto ruota
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(wheelX - 4, this.y + this.height - 5, 8, 8);
            
            // Ruota
            ctx.fillStyle = '#0a0a0a';
            ctx.beginPath();
            ctx.arc(wheelX, wheelY + 3, 7, 0, Math.PI * 2);
            ctx.fill();
            
            // Cerchione
            ctx.strokeStyle = '#2a2a2a';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Centro ruota
            ctx.fillStyle = '#2a2a2a';
            ctx.beginPath();
            ctx.arc(wheelX, wheelY + 3, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawRailing(ctx) {
        // Base della ringhiera
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        gradient.addColorStop(0, '#6a6a7a');
        gradient.addColorStop(1, '#4a4a5a');
        
        // Corrimano superiore (più spesso)
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(this.x - 2, this.y - 2, this.width + 4, 6, 2);
        ctx.fill();
        
        // Highlight sul corrimano
        ctx.strokeStyle = '#8a8a9a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 1);
        ctx.lineTo(this.x + this.width, this.y - 1);
        ctx.stroke();
        
        // Barra inferiore
        ctx.fillStyle = '#5a5a6a';
        ctx.fillRect(this.x, this.y + this.height - 3, this.width, 3);
        
        // Barre verticali decorative
        ctx.strokeStyle = '#5a5a6a';
        ctx.lineWidth = 2;
        const barSpacing = 12;
        const barCount = Math.floor(this.width / barSpacing);
        
        for (let i = 0; i <= barCount; i++) {
            const bx = this.x + 4 + i * barSpacing;
            if (bx > this.x + this.width - 4) break;
            
            // Barra principale
            ctx.beginPath();
            ctx.moveTo(bx, this.y + 3);
            ctx.lineTo(bx, this.y + this.height - 3);
            ctx.stroke();
            
            // Piccolo ornamento al centro
            if (i % 2 === 0) {
                ctx.fillStyle = '#6a6a7a';
                ctx.beginPath();
                ctx.arc(bx, this.y + this.height/2, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Pilastri agli estremi
        ctx.fillStyle = '#5a5a6a';
        ctx.fillRect(this.x - 3, this.y - 4, 5, this.height + 6);
        ctx.fillRect(this.x + this.width - 2, this.y - 4, 5, this.height + 6);
        
        // Top dei pilastri
        ctx.fillStyle = '#7a7a8a';
        ctx.beginPath();
        ctx.arc(this.x, this.y - 4, 4, 0, Math.PI * 2);
        ctx.arc(this.x + this.width, this.y - 4, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ============================================
// LAMP CLASS
// ============================================
class Lamp {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.flicker = 0;
        this.intensity = 0.8 + Math.random() * 0.2;
    }

    update() {
        // Flickering effect
        if (Math.random() < 0.02) {
            this.flicker = 5;
        }
        if (this.flicker > 0) this.flicker--;
    }

    draw(ctx) {
        const brightness = this.flicker > 0 ? 0.3 : this.intensity;
        
        // Cono di luce verso il basso
        const coneHeight = 200;
        const coneTopWidth = 20;
        const coneBottomWidth = 140;
        
        // Gradient per il cono di luce principale
        const gradient = ctx.createLinearGradient(this.x, this.y + 25, this.x, this.y + 25 + coneHeight);
        gradient.addColorStop(0, `rgba(255, 220, 150, ${brightness * 0.6})`);
        gradient.addColorStop(0.2, `rgba(255, 200, 120, ${brightness * 0.4})`);
        gradient.addColorStop(0.5, `rgba(255, 180, 100, ${brightness * 0.2})`);
        gradient.addColorStop(1, 'transparent');
        
        // Disegna il cono di luce
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(this.x - coneTopWidth, this.y + 25);
        ctx.lineTo(this.x + coneTopWidth, this.y + 25);
        ctx.lineTo(this.x + coneBottomWidth, this.y + 25 + coneHeight);
        ctx.lineTo(this.x - coneBottomWidth, this.y + 25 + coneHeight);
        ctx.closePath();
        ctx.fill();
        
        // Alone di luce sul terreno (ellisse)
        const groundGlow = ctx.createRadialGradient(
            this.x, this.y + 25 + coneHeight - 30, 0, 
            this.x, this.y + 25 + coneHeight - 30, coneBottomWidth + 20
        );
        groundGlow.addColorStop(0, `rgba(255, 210, 130, ${brightness * 0.25})`);
        groundGlow.addColorStop(0.4, `rgba(255, 190, 100, ${brightness * 0.15})`);
        groundGlow.addColorStop(0.7, `rgba(255, 170, 80, ${brightness * 0.05})`);
        groundGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = groundGlow;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 25 + coneHeight - 10, coneBottomWidth + 20, 40, 0, 0, Math.PI * 2);
        ctx.fill();

        // === PALO DEL LAMPIONE ===
        
        // Ombra del palo
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x + 5, this.y + 105, 12, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Base del lampione (piedistallo)
        const baseGradient = ctx.createLinearGradient(this.x - 15, this.y + 95, this.x + 15, this.y + 95);
        baseGradient.addColorStop(0, '#2a2a2a');
        baseGradient.addColorStop(0.3, '#4a4a4a');
        baseGradient.addColorStop(0.7, '#3a3a3a');
        baseGradient.addColorStop(1, '#1a1a1a');
        ctx.fillStyle = baseGradient;
        
        // Piedistallo a gradini
        ctx.fillRect(this.x - 14, this.y + 100, 28, 8);
        ctx.fillRect(this.x - 11, this.y + 93, 22, 8);
        ctx.fillRect(this.x - 8, this.y + 88, 16, 6);
        
        // Palo principale con gradiente
        const poleGradient = ctx.createLinearGradient(this.x - 5, this.y, this.x + 5, this.y);
        poleGradient.addColorStop(0, '#1a1a1a');
        poleGradient.addColorStop(0.2, '#3a3a3a');
        poleGradient.addColorStop(0.5, '#4a4a4a');
        poleGradient.addColorStop(0.8, '#3a3a3a');
        poleGradient.addColorStop(1, '#1a1a1a');
        ctx.fillStyle = poleGradient;
        ctx.fillRect(this.x - 4, this.y + 30, 8, 60);
        
        // Anelli decorativi sul palo
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(this.x - 6, this.y + 35, 12, 3);
        ctx.fillRect(this.x - 6, this.y + 75, 12, 3);
        ctx.fillStyle = '#5a5a5a';
        ctx.fillRect(this.x - 6, this.y + 36, 12, 1);
        ctx.fillRect(this.x - 6, this.y + 76, 12, 1);
        
        // === TESTA DEL LAMPIONE ===
        
        // Braccio che regge la lanterna
        ctx.fillStyle = '#2a2a2a';
        ctx.beginPath();
        ctx.moveTo(this.x - 3, this.y + 30);
        ctx.lineTo(this.x + 3, this.y + 30);
        ctx.lineTo(this.x + 3, this.y + 5);
        ctx.quadraticCurveTo(this.x + 3, this.y, this.x, this.y);
        ctx.quadraticCurveTo(this.x - 3, this.y, this.x - 3, this.y + 5);
        ctx.closePath();
        ctx.fill();
        
        // Parte superiore curva
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(this.x, this.y + 5, 8, Math.PI, 0);
        ctx.stroke();
        
        // Lanterna - corpo esterno
        const lanternGradient = ctx.createLinearGradient(this.x - 18, this.y, this.x + 18, this.y);
        lanternGradient.addColorStop(0, '#1a1a1a');
        lanternGradient.addColorStop(0.2, '#3a3a3a');
        lanternGradient.addColorStop(0.5, '#4a4a4a');
        lanternGradient.addColorStop(0.8, '#3a3a3a');
        lanternGradient.addColorStop(1, '#1a1a1a');
        ctx.fillStyle = lanternGradient;
        
        // Cappello della lanterna
        ctx.beginPath();
        ctx.moveTo(this.x - 22, this.y + 8);
        ctx.lineTo(this.x + 22, this.y + 8);
        ctx.lineTo(this.x + 18, this.y + 3);
        ctx.lineTo(this.x - 18, this.y + 3);
        ctx.closePath();
        ctx.fill();
        
        // Tettuccio
        ctx.beginPath();
        ctx.moveTo(this.x - 20, this.y + 3);
        ctx.lineTo(this.x, this.y - 5);
        ctx.lineTo(this.x + 20, this.y + 3);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#5a5a5a';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Pinnacolo
        ctx.fillStyle = '#4a4a4a';
        ctx.beginPath();
        ctx.moveTo(this.x - 2, this.y - 5);
        ctx.lineTo(this.x + 2, this.y - 5);
        ctx.lineTo(this.x, this.y - 12);
        ctx.closePath();
        ctx.fill();
        
        // Corpo della lanterna (vetro)
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(this.x - 16, this.y + 8, 32, 18);
        
        // Vetro illuminato
        if (this.flicker <= 0) {
            const glassGlow = ctx.createRadialGradient(this.x, this.y + 17, 0, this.x, this.y + 17, 20);
            glassGlow.addColorStop(0, `rgba(255, 240, 200, ${brightness})`);
            glassGlow.addColorStop(0.5, `rgba(255, 220, 150, ${brightness * 0.7})`);
            glassGlow.addColorStop(1, `rgba(255, 200, 100, ${brightness * 0.3})`);
            ctx.fillStyle = glassGlow;
        } else {
            ctx.fillStyle = 'rgba(255, 180, 100, 0.3)';
        }
        ctx.fillRect(this.x - 14, this.y + 10, 28, 14);
        
        // Divisori del vetro (stile lanterna)
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x - 5, this.y + 8);
        ctx.lineTo(this.x - 5, this.y + 26);
        ctx.moveTo(this.x + 5, this.y + 8);
        ctx.lineTo(this.x + 5, this.y + 26);
        ctx.moveTo(this.x - 16, this.y + 17);
        ctx.lineTo(this.x + 16, this.y + 17);
        ctx.stroke();
        
        // Base della lanterna
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(this.x - 18, this.y + 26, 36, 4);
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(this.x - 18, this.y + 26, 36, 1);
        
        // Decorazione sotto la lanterna
        ctx.fillStyle = '#2a2a2a';
        ctx.beginPath();
        ctx.moveTo(this.x - 8, this.y + 30);
        ctx.lineTo(this.x + 8, this.y + 30);
        ctx.lineTo(this.x, this.y + 36);
        ctx.closePath();
        ctx.fill();
        
        // Riflesso sulla lanterna
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(this.x - 13, this.y + 11, 4, 12);
    }
}

// ============================================
// STAR CLASS
// ============================================
class Star {
    constructor() {
        this.x = Math.random() * game.worldWidth;
        this.y = Math.random() * 300;
        this.size = Math.random() * 2 + 0.5;
        this.twinkle = Math.random() * Math.PI * 2;
        this.speed = Math.random() * 0.02 + 0.01;
    }

    update() {
        this.twinkle += this.speed;
    }

    draw(ctx) {
        const alpha = 0.3 + Math.sin(this.twinkle) * 0.3;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ============================================
// MOON CLASS
// ============================================
class Moon {
    constructor() {
        this.x = 300;
        this.y = 80;
        this.radius = 50;
    }

    draw(ctx) {
        // Glow
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 150);
        gradient.addColorStop(0, 'rgba(200, 200, 255, 0.3)');
        gradient.addColorStop(0.5, 'rgba(150, 150, 200, 0.1)');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 150, 0, Math.PI * 2);
        ctx.fill();

        // Moon
        ctx.fillStyle = '#eeeeff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Craters
        ctx.fillStyle = '#ccccdd';
        ctx.beginPath();
        ctx.arc(this.x - 15, this.y - 10, 8, 0, Math.PI * 2);
        ctx.arc(this.x + 20, this.y + 5, 12, 0, Math.PI * 2);
        ctx.arc(this.x - 5, this.y + 20, 6, 0, Math.PI * 2);
        ctx.arc(this.x + 10, this.y - 20, 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ============================================
// PARTICLE CLASS (for ambient effects)
// ============================================
class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * game.worldWidth;
        this.y = Math.random() * game.worldHeight;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = Math.random() * 0.5 + 0.2;
        this.size = Math.random() * 2 + 1;
        this.alpha = Math.random() * 0.3 + 0.1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        
        if (this.y > game.worldHeight) {
            this.reset();
            this.y = 0;
        }
    }

    draw(ctx) {
        ctx.fillStyle = `rgba(200, 200, 220, ${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ============================================
// GAME INITIALIZATION
// ============================================
const cat = new Cat(200, 500);
const platforms = [];
const lamps = [];
const stars = [];
const particles = [];
const fireEscapes = [];
const moon = new Moon();

// Ground - Asfalto
platforms.push(new Platform(0, game.worldHeight - 50, game.worldWidth, 100, 'ground'));

// Generate city
function generateCity() {
    // Buildings - posizionati per essere raggiungibili
    const buildingData = [
        { x: 0, width: 180, height: 350 },
        { x: 220, width: 200, height: 450 },
        { x: 460, width: 220, height: 380 },
        { x: 720, width: 200, height: 500 },
        { x: 960, width: 180, height: 420 },
        { x: 1180, width: 220, height: 550 },
        { x: 1440, width: 200, height: 400 },
        { x: 1680, width: 210, height: 480 },
        { x: 1930, width: 190, height: 520 },
        { x: 2160, width: 220, height: 440 },
        { x: 2420, width: 200, height: 500 },
        { x: 2660, width: 210, height: 380 },
        { x: 2910, width: 200, height: 460 },
        { x: 3150, width: 220, height: 520 },
        { x: 3410, width: 190, height: 400 },
        { x: 3640, width: 200, height: 480 }
    ];

    for (const b of buildingData) {
        platforms.push(new Platform(
            b.x, 
            game.worldHeight - 50 - b.height, 
            b.width, 
            b.height, 
            'building'
        ));
    }

    // Dumpsters - primo punto di salto
    const dumpsterPositions = [100, 500, 900, 1350, 1800, 2300, 2750, 3200, 3600];
    for (const x of dumpsterPositions) {
        platforms.push(new Platform(x, game.worldHeight - 100, 80, 50, 'dumpster'));
    }

    // Scale antincendio complete (strutture)
    const fireEscapeData = [
        { x: 160, buildingIndex: 0, floors: 4 },   // Edificio 1
        { x: 400, buildingIndex: 1, floors: 5 },   // Edificio 2
        { x: 640, buildingIndex: 2, floors: 4 },   // Edificio 3
        { x: 880, buildingIndex: 3, floors: 5 },   // Edificio 4
        { x: 1100, buildingIndex: 4, floors: 5 },  // Edificio 5
        { x: 1360, buildingIndex: 5, floors: 6 },  // Edificio 6
        { x: 1600, buildingIndex: 6, floors: 4 },  // Edificio 7
        { x: 1850, buildingIndex: 7, floors: 5 },  // Edificio 8
        { x: 2080, buildingIndex: 8, floors: 6 },  // Edificio 9
        { x: 2340, buildingIndex: 9, floors: 5 },  // Edificio 10
        { x: 2580, buildingIndex: 10, floors: 5 }, // Edificio 11
        { x: 2830, buildingIndex: 11, floors: 4 }, // Edificio 12
        { x: 3070, buildingIndex: 12, floors: 5 }, // Edificio 13
        { x: 3330, buildingIndex: 13, floors: 6 }, // Edificio 14
        { x: 3560, buildingIndex: 14, floors: 4 }, // Edificio 15
        { x: 3800, buildingIndex: 15, floors: 5 }  // Edificio 16
    ];
    
    for (const fe of fireEscapeData) {
        const building = buildingData[fe.buildingIndex];
        if (building) {
            const fireEscape = new FireEscapeStructure(
                fe.x,
                game.worldHeight - 50,
                building.height,
                fe.floors
            );
            fireEscapes.push(fireEscape);
            
            // Aggiungi le piattaforme della scala al sistema di collisioni
            for (const platform of fireEscape.getPlatforms()) {
                const p = new Platform(platform.x, platform.y, platform.width, platform.height, 'fire-escape');
                platforms.push(p);
            }
        }
    }

    // Lamps
    for (let x = 100; x < game.worldWidth; x += 350) {
        lamps.push(new Lamp(x, game.worldHeight - 150));
    }

    // Stars
    for (let i = 0; i < 100; i++) {
        stars.push(new Star());
    }

    // Particles (dust/leaves)
    for (let i = 0; i < 30; i++) {
        particles.push(new Particle());
    }
}

generateCity();

// ============================================
// CAMERA
// ============================================
function updateCamera() {
    const targetX = cat.x - canvas.width / 2 + cat.width / 2;
    const targetY = cat.y - canvas.height / 2 + cat.height / 2;
    
    game.cameraX += (targetX - game.cameraX) * 0.08;
    game.cameraY += (targetY - game.cameraY) * 0.08;
    
    // Clamp camera
    game.cameraX = Math.max(0, Math.min(game.cameraX, game.worldWidth - canvas.width));
    game.cameraY = Math.max(0, Math.min(game.cameraY, game.worldHeight - canvas.height));
}

// ============================================
// DRAW BACKGROUND
// ============================================
function drawBackground() {
    // Night sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(0.5, '#1a1a2a');
    gradient.addColorStop(1, '#2a2a3a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Parallax moon
    ctx.save();
    ctx.translate(-game.cameraX * 0.1, -game.cameraY * 0.1);
    moon.draw(ctx);
    ctx.restore();

    // Parallax stars
    ctx.save();
    ctx.translate(-game.cameraX * 0.2, -game.cameraY * 0.2);
    for (const star of stars) {
        star.draw(ctx);
    }
    ctx.restore();
}

// ============================================
// MAIN GAME LOOP
// ============================================
function gameLoop() {
    game.time++;

    // Update
    cat.update();
    updateCamera();
    
    for (const lamp of lamps) lamp.update();
    for (const star of stars) star.update();
    for (const particle of particles) particle.update();

    // Draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawBackground();
    
    ctx.save();
    ctx.translate(-game.cameraX, -game.cameraY);
    
    // Draw ground first (asfalto)
    for (const platform of platforms) {
        if (platform.type === 'ground') platform.draw(ctx);
    }
    
    // Draw buildings (behind everything when cat is on ground)
    for (const platform of platforms) {
        if (platform.type === 'building') platform.draw(ctx);
    }
    
    // Draw fire escape structures (scale antincendio complete)
    for (const fireEscape of fireEscapes) {
        fireEscape.draw(ctx);
    }
    
    // Draw lamps
    for (const lamp of lamps) lamp.draw(ctx);
    
    // Draw other platforms (railings, dumpsters) - NOT fire-escape (già disegnate)
    for (const platform of platforms) {
        if (platform.type !== 'building' && platform.type !== 'ground' && platform.type !== 'fire-escape') {
            platform.draw(ctx);
        }
    }
    
    // Draw particles
    for (const particle of particles) particle.draw(ctx);
    
    // Draw cat (always in front of buildings)
    cat.draw(ctx);
    
    ctx.restore();

    // Vignette effect
    const vignette = ctx.createRadialGradient(
        canvas.width/2, canvas.height/2, canvas.height/3,
        canvas.width/2, canvas.height/2, canvas.height
    );
    vignette.addColorStop(0, 'transparent');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop();

console.log('🐱 Night Cat - Frecce per muoversi, Spazio/↑ per saltare, Doppio salto in aria, Arrampicati sui muri!');
