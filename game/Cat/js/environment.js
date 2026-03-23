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
