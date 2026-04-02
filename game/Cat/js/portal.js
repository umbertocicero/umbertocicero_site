// ============================================
// PORTAL - Portali sci-fi per il Livello 5
// ============================================

class Portal {
    constructor(x, y, linkedPortal = null) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 70;
        this.linkedPortal = linkedPortal; // altro portale connesso
        this.active = true;
        this.useCooldown = 0;             // evita teletrasporto multiplo
        this.born = CONFIG.time;
        this.life = -1;                   // -1 = permanente, altrimenti frames
        this.isVictory = false;           // portale finale per vincere

        // Particelle interne
        this.particles = [];
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                angle: Math.random() * Math.PI * 2,
                speed: 0.03 + Math.random() * 0.04,
                r: 5 + Math.random() * 12,
                size: 1.5 + Math.random() * 2,
                alpha: 0.4 + Math.random() * 0.5
            });
        }
    }

    update() {
        if (!this.active) return;
        if (this.useCooldown > 0) this.useCooldown--;

        // Particelle orbitanti
        for (const p of this.particles) {
            p.angle += p.speed;
        }

        // Portali temporanei (spawned on boss hit)
        if (this.life > 0) {
            this.life--;
            if (this.life <= 0) this.active = false;
        }
    }

    // Controlla se il gatto entra nel portale
    checkEntry(cat) {
        if (!this.active || this.useCooldown > 0) return false;
        // Il portale vittoria non ha linkedPortal ma è comunque "entrabile"
        if (!this.isVictory && !this.linkedPortal) return false;
        if (!this.isVictory && !this.linkedPortal.active) return false;

        return cat.x + cat.width > this.x &&
               cat.x < this.x + this.width &&
               cat.y + cat.height > this.y &&
               cat.y < this.y + this.height;
    }

    // Teletrasporta il gatto all'uscita
    teleportCat(cat) {
        const exit = this.linkedPortal;
        if (!exit || !exit.active) return { x: this.x + this.width / 2, y: this.y + this.height / 2 };

        cat.x = exit.x + exit.width / 2 - cat.width / 2;
        cat.y = exit.y;
        cat.vy = -5;
        this.useCooldown = 30;
        exit.useCooldown = 30;

        return {
            x: exit.x + exit.width / 2,
            y: exit.y + exit.height / 2
        };
    }

    draw(ctx) {
        if (!this.active) return;
        const t = CONFIG.time;
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const age = t - this.born;

        // Alpha fade-in
        const fadeIn = Math.min(1, age / 30);
        // Fade-out se vita limitata
        const fadeOut = (this.life > 0 && this.life < 60) ? this.life / 60 : 1;
        const baseAlpha = fadeIn * fadeOut;

        ctx.save();

        // Colori: viola/azzurro per portali boss, ambra/verde per victory
        const col1 = this.isVictory
            ? [80, 255, 160]
            : [100, 160, 255];
        const col2 = this.isVictory
            ? [40, 200, 100]
            : [180, 80, 255];

        // Glow esterno
        const glowR = 80 + Math.sin(t * 0.07) * 15;
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
        glow.addColorStop(0, `rgba(${col1},${0.25 * baseAlpha})`);
        glow.addColorStop(0.5, `rgba(${col2},${0.1 * baseAlpha})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Ellisse portale (bordo)
        ctx.strokeStyle = `rgba(${col1},${0.9 * baseAlpha})`;
        ctx.lineWidth = 3 + Math.sin(t * 0.08) * 1;
        ctx.shadowBlur = 18;
        ctx.shadowColor = `rgba(${col1},0.8)`;
        ctx.beginPath();
        ctx.ellipse(cx, cy, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Bordo interno sfumato
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `rgba(${col2},${0.5 * baseAlpha})`;
        ctx.beginPath();
        ctx.ellipse(cx, cy, this.width / 2 - 5, this.height / 2 - 5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Interno: swirl gradient
        const inner = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.width / 2);
        inner.addColorStop(0, `rgba(${col2},${0.6 * baseAlpha})`);
        inner.addColorStop(0.5, `rgba(${col1},${0.3 * baseAlpha})`);
        inner.addColorStop(1, `rgba(${col2},${0.05 * baseAlpha})`);
        ctx.fillStyle = inner;
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, this.width / 2 - 2, this.height / 2 - 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Spirale interna
        ctx.save();
        ctx.globalAlpha = 0.5 * baseAlpha;
        ctx.strokeStyle = `rgba(${col1},0.7)`;
        ctx.lineWidth = 1.5;
        ctx.translate(cx, cy);
        ctx.rotate(t * 0.05);
        for (let arm = 0; arm < 3; arm++) {
            ctx.save();
            ctx.rotate((arm / 3) * Math.PI * 2);
            ctx.beginPath();
            for (let i = 0; i < 30; i++) {
                const angle = (i / 30) * Math.PI * 2;
                const r = (i / 30) * (this.width / 2 - 4);
                const px = Math.cos(angle) * r;
                const py = Math.sin(angle) * r * (this.height / this.width);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();

        // Particelle orbitanti
        for (const p of this.particles) {
            const px = cx + Math.cos(p.angle) * p.r;
            const py = cy + Math.sin(p.angle) * p.r * 0.4;
            ctx.fillStyle = `rgba(${col1},${p.alpha * baseAlpha})`;
            ctx.beginPath();
            ctx.arc(px, py, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Label (victory portal)
        if (this.isVictory) {
            ctx.globalAlpha = (0.6 + Math.sin(t * 0.1) * 0.3) * baseAlpha;
            ctx.fillStyle = '#afffcc';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('SFUGG!', cx, this.y - 8);
        }

        ctx.restore();
    }
}

// ============================================
// PORTAL BURST — Esplosione di particelle portale
// ============================================
class PortalBurst {
    constructor(x, y, isVictory = false) {
        this.x = x;
        this.y = y;
        this.isVictory = isVictory;
        this.particles = [];
        const count = isVictory ? 40 : 20;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 4;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 40 + Math.random() * 30,
                maxLife: 70,
                size: 2 + Math.random() * 4
            });
        }
        this.done = false;
    }

    update() {
        let alive = false;
        for (const p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.08;
            p.vx *= 0.97;
            p.life--;
            if (p.life > 0) alive = true;
        }
        if (!alive) this.done = true;
    }

    draw(ctx) {
        for (const p of this.particles) {
            if (p.life <= 0) continue;
            const t = p.life / p.maxLife;
            const col = this.isVictory ? '80,255,160' : '100,160,255';
            ctx.fillStyle = `rgba(${col},${t * 0.9})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * t, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
