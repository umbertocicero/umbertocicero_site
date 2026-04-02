// ============================================
// ENVIRONMENT - Stelle, Luna, Particelle
// ============================================

class Star {
    constructor() {
        this.x = Math.random() * CONFIG.worldWidth;
        this.y = Math.random() * 300;
        this.size = Math.random() * 2 + 0.5;
        this.twinkle = Math.random() * Math.PI * 2;
        this.speed = Math.random() * 0.02 + 0.01;
    }

    update() {
        this.twinkle += this.speed;
    }

    draw(ctx, theme) {
        const baseAlpha = (theme && theme.starAlpha) || 0.15;
        const alpha = baseAlpha + Math.sin(this.twinkle) * baseAlpha;
        ctx.fillStyle = `rgba(180, 180, 200, ${alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Moon {
    constructor() {
        this.x = 300;
        this.y = 80;
        this.radius = 50;
    }

    draw(ctx, theme) {
        const moonColor = (theme && theme.moonColor) || '#9999aa';
        const isReddish = CONFIG.level === 4;
        const isQuantum = CONFIG.level === 5;
        
        // Glow
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 150);
        if (isReddish) {
            gradient.addColorStop(0, 'rgba(200, 100, 60, 0.2)');
            gradient.addColorStop(0.5, 'rgba(160, 70, 40, 0.08)');
            gradient.addColorStop(1, 'transparent');
        } else if (isQuantum) {
            const qPulse = 0.25 + Math.sin(CONFIG.time * 0.05) * 0.1;
            gradient.addColorStop(0, `rgba(60, 120, 255, ${qPulse})`);
            gradient.addColorStop(0.4, `rgba(80, 60, 220, ${qPulse * 0.5})`);
            gradient.addColorStop(1, 'transparent');
        } else {
            gradient.addColorStop(0, 'rgba(120, 120, 160, 0.15)');
            gradient.addColorStop(0.5, 'rgba(80, 80, 120, 0.05)');
            gradient.addColorStop(1, 'transparent');
        }
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 150, 0, Math.PI * 2);
        ctx.fill();

        // Luna
        ctx.fillStyle = moonColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Anello orbitale (solo livello 5)
        if (isQuantum) {
            const ringAngle = CONFIG.time * 0.02;
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(ringAngle);
            ctx.strokeStyle = `rgba(80,160,255,${0.4 + Math.sin(CONFIG.time * 0.07) * 0.2})`;
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 8;
            ctx.shadowColor = 'rgba(80,160,255,0.8)';
            ctx.beginPath();
            ctx.ellipse(0, 0, this.radius + 20, 8, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // Crateri
        ctx.fillStyle = isReddish ? '#994433' : (isQuantum ? '#223366' : '#777788');
        ctx.beginPath();
        ctx.arc(this.x - 15, this.y - 10, 8, 0, Math.PI * 2);
        ctx.arc(this.x + 20, this.y + 5, 12, 0, Math.PI * 2);
        ctx.arc(this.x - 5, this.y + 20, 6, 0, Math.PI * 2);
        ctx.arc(this.x + 10, this.y - 20, 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ============================================
// QUANTUM GRID - Griglia neon sci-fi (Livello 5)
// ============================================
class QuantumGrid {
    constructor() {
        this.cellW = 120;
        this.cellH = 80;
        this.cols = Math.ceil(CONFIG.worldWidth / this.cellW) + 2;
        this.rows = Math.ceil(CONFIG.worldHeight / this.cellH) + 2;
    }

    draw(ctx) {
        if (CONFIG.level !== 5) return;
        const t = CONFIG.time;
        const camX = CONFIG.cameraX;
        const camY = CONFIG.cameraY;

        ctx.save();
        ctx.globalAlpha = 0.07 + Math.sin(t * 0.03) * 0.02;
        ctx.strokeStyle = 'rgba(60, 120, 255, 1)';
        ctx.lineWidth = 0.8;

        const offX = -(camX % this.cellW);
        const offY = -(camY % this.cellH);

        for (let col = 0; col <= this.cols; col++) {
            const x = offX + col * this.cellW;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, CONFIG.canvasHeight);
            ctx.stroke();
        }
        for (let row = 0; row <= this.rows; row++) {
            const y = offY + row * this.cellH;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(CONFIG.canvasWidth, y);
            ctx.stroke();
        }
        ctx.restore();

        // Nodi luminosi agli incroci
        ctx.save();
        ctx.globalAlpha = 0.15;
        for (let col = 0; col <= this.cols; col++) {
            for (let row = 0; row <= this.rows; row++) {
                const nx = offX + col * this.cellW;
                const ny = offY + row * this.cellH;
                const pulse = Math.sin(t * 0.05 + col * 0.7 + row * 0.5) * 0.5 + 0.5;
                ctx.fillStyle = `rgba(80,180,255,${pulse * 0.5})`;
                ctx.beginPath();
                ctx.arc(nx, ny, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }
}

// Istanza globale della griglia quantum
let quantumGrid = null;

class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * CONFIG.worldWidth;
        this.y = Math.random() * CONFIG.worldHeight;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = Math.random() * 0.5 + 0.2;
        this.size = Math.random() * 2 + 1;
        this.alpha = Math.random() * 0.12 + 0.03;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        
        if (this.y > CONFIG.worldHeight) {
            this.reset();
            this.y = 0;
        }
    }

    draw(ctx) {
        ctx.fillStyle = `rgba(120, 120, 140, ${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ============================================
// SNOWFLAKE - Fiocchi di neve (Livello 3)
// ============================================
class Snowflake {
    constructor() {
        this.reset(true);
    }

    reset(initial) {
        this.x = Math.random() * CONFIG.worldWidth;
        this.y = initial ? Math.random() * CONFIG.worldHeight : -10 - Math.random() * 100;
        this.size = Math.random() * 3 + 1;
        this.fallSpeed = 0.4 + Math.random() * 0.8;     // caduta lenta
        this.windPhase = Math.random() * Math.PI * 2;
        this.windSpeed = 0.01 + Math.random() * 0.02;
        this.windAmp = 0.3 + Math.random() * 0.6;       // ondeggiamento laterale
        this.alpha = 0.3 + Math.random() * 0.5;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.03;
    }

    update() {
        this.windPhase += this.windSpeed;
        this.x += Math.sin(this.windPhase) * this.windAmp;
        this.y += this.fallSpeed;
        this.rotation += this.rotSpeed;

        if (this.y > CONFIG.worldHeight + 20) {
            this.reset(false);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.alpha;

        if (this.size > 2.5) {
            // Fiocco grande — disegna stella a 6 punte
            ctx.strokeStyle = '#dde4f0';
            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                const a = (i / 3) * Math.PI;
                const r = this.size;
                ctx.beginPath();
                ctx.moveTo(-Math.cos(a) * r, -Math.sin(a) * r);
                ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                ctx.stroke();
            }
            // Centro
            ctx.fillStyle = '#eef2ff';
            ctx.beginPath();
            ctx.arc(0, 0, 1, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Fiocco piccolo — semplice cerchio sfumato
            ctx.fillStyle = '#dde4f0';
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

// ============================================
// STEAM PARTICLE - Vapore dai comignoli (Livello 3)
// ============================================

// ============================================
// RAINDROP - Pioggia battente (Livello 4 - La Fuga)
// ============================================
class Raindrop {
    constructor() {
        this.reset(true);
    }

    reset(initial) {
        this.x = Math.random() * CONFIG.worldWidth;
        this.y = initial ? Math.random() * CONFIG.worldHeight : -10 - Math.random() * 200;
        this.length = 8 + Math.random() * 14;     // lunghezza striscia
        this.speed = 10 + Math.random() * 8;       // caduta veloce
        this.wind = -1.5 + Math.random() * -1.5;   // vento obliquo
        this.alpha = 0.15 + Math.random() * 0.25;
        this.thickness = 1 + Math.random() * 1.2;
    }

    update() {
        this.y += this.speed;
        this.x += this.wind;

        if (this.y > CONFIG.worldHeight + 30) {
            this.reset(false);
        }
    }

    draw(ctx) {
        ctx.strokeStyle = `rgba(170, 190, 220, ${this.alpha})`;
        ctx.lineWidth = this.thickness;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.wind * 0.6, this.y + this.length);
        ctx.stroke();
    }
}

// ============================================
// RAIN SPLASH - Schizzo quando la goccia tocca terra
// ============================================
class RainSplash {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.life = 6 + Math.random() * 4;
        this.maxLife = this.life;
        this.size = 2 + Math.random() * 3;
    }

    update() {
        this.life--;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        const t = 1 - this.life / this.maxLife;
        const r = this.size + t * 6;
        const a = (1 - t) * 0.3;
        ctx.strokeStyle = `rgba(170, 190, 220, ${a})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, r, r * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
}

class SteamParticle {
    constructor(x, y) {
        this.baseX = x;
        this.baseY = y;
        this.reset();
    }

    reset() {
        this.x = this.baseX + (Math.random() - 0.5) * 8;
        this.y = this.baseY;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = -(0.5 + Math.random() * 1.2);   // sale verso l'alto
        this.size = 3 + Math.random() * 5;
        this.alpha = 0.25 + Math.random() * 0.2;
        this.life = 80 + Math.random() * 60;
        this.maxLife = this.life;
        this.growing = 0.03 + Math.random() * 0.04;
    }

    update() {
        this.x += this.vx + Math.sin(CONFIG.time * 0.03 + this.baseX) * 0.15;
        this.y += this.vy;
        this.vy *= 0.995;                // rallenta
        this.size += this.growing;        // si espande
        this.life--;

        if (this.life <= 0) {
            this.reset();
        }
    }

    draw(ctx) {
        const fade = Math.min(1, this.life / (this.maxLife * 0.3));
        const a = this.alpha * fade;
        if (a <= 0.01) return;

        ctx.fillStyle = `rgba(200, 210, 220, ${a})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}
