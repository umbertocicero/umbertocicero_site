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
        
        // Glow
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 150);
        gradient.addColorStop(0, 'rgba(120, 120, 160, 0.15)');
        gradient.addColorStop(0.5, 'rgba(80, 80, 120, 0.05)');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 150, 0, Math.PI * 2);
        ctx.fill();

        // Luna
        ctx.fillStyle = moonColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Crateri
        ctx.fillStyle = '#777788';
        ctx.beginPath();
        ctx.arc(this.x - 15, this.y - 10, 8, 0, Math.PI * 2);
        ctx.arc(this.x + 20, this.y + 5, 12, 0, Math.PI * 2);
        ctx.arc(this.x - 5, this.y + 20, 6, 0, Math.PI * 2);
        ctx.arc(this.x + 10, this.y - 20, 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

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
