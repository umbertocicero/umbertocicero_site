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

    draw(ctx) {
        const alpha = 0.3 + Math.sin(this.twinkle) * 0.3;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
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

        // Luna
        ctx.fillStyle = '#eeeeff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Crateri
        ctx.fillStyle = '#ccccdd';
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
        this.alpha = Math.random() * 0.3 + 0.1;
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
        ctx.fillStyle = `rgba(200, 200, 220, ${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}
