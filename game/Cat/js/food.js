// ============================================
// FOOD - Cibo da raccogliere
// ============================================

class Food {
    constructor(x, y, type = 'fish') {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 20;
        this.type = type;
        this.collected = false;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.glowIntensity = 0;
        this.sparkles = [];
        
        // Genera sparkle iniziali
        for (let i = 0; i < 3; i++) {
            this.sparkles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                life: Math.random() * 30
            });
        }
    }

    update() {
        if (this.collected) return;
        
        // Animazione fluttuante
        this.bobOffset += 0.05;
        this.glowIntensity = 0.3 + Math.sin(this.bobOffset) * 0.2;
        
        // Aggiorna sparkles
        for (const sparkle of this.sparkles) {
            sparkle.life--;
            if (sparkle.life <= 0) {
                sparkle.x = Math.random() * this.width;
                sparkle.y = Math.random() * this.height;
                sparkle.life = 30 + Math.random() * 20;
            }
        }
    }

    draw(ctx) {
        if (this.collected) return;
        
        const bobY = Math.sin(this.bobOffset) * 3;
        const drawX = this.x;
        const drawY = this.y + bobY;
        
        // Glow - più visibile e brillante
        const glow = ctx.createRadialGradient(
            drawX + this.width/2, drawY + this.height/2, 0,
            drawX + this.width/2, drawY + this.height/2, 50
        );
        glow.addColorStop(0, `rgba(255, 220, 80, ${this.glowIntensity * 0.8})`);
        glow.addColorStop(0.3, `rgba(255, 200, 60, ${this.glowIntensity * 0.5})`);
        glow.addColorStop(0.6, `rgba(200, 160, 40, ${this.glowIntensity * 0.2})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(drawX + this.width/2, drawY + this.height/2, 50, 0, Math.PI * 2);
        ctx.fill();
        
        // Disegna il cibo in base al tipo
        switch(this.type) {
            case 'fish':
                this.drawFish(ctx, drawX, drawY);
                break;
            case 'fishbone':
                this.drawFishbone(ctx, drawX, drawY);
                break;
            case 'yarn':
            case 'can':
                this.drawCan(ctx, drawX, drawY);
                break;
            case 'milk':
                this.drawMilk(ctx, drawX, drawY);
                break;
        }
        
        // Sparkles
        ctx.fillStyle = '#fff';
        for (const sparkle of this.sparkles) {
            if (sparkle.life > 0) {
                const alpha = Math.min(0.8, sparkle.life / 12);
                ctx.fillStyle = `rgba(255, 240, 160, ${alpha})`;
                ctx.beginPath();
                ctx.arc(drawX + sparkle.x, drawY + sparkle.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    drawFish(ctx, x, y) {
        // Pesce argentato - più luminoso
        ctx.fillStyle = '#7a8ea0';
        
        // Corpo
        ctx.beginPath();
        ctx.ellipse(x + 15, y + 10, 12, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Coda
        ctx.beginPath();
        ctx.moveTo(x + 3, y + 10);
        ctx.lineTo(x - 5, y + 3);
        ctx.lineTo(x - 5, y + 17);
        ctx.closePath();
        ctx.fill();
        
        // Pinna
        ctx.fillStyle = '#6a7a9e';
        ctx.beginPath();
        ctx.moveTo(x + 12, y + 5);
        ctx.lineTo(x + 15, y - 2);
        ctx.lineTo(x + 20, y + 5);
        ctx.closePath();
        ctx.fill();
        
        // Occhio
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(x + 22, y + 8, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Riflesso
        ctx.fillStyle = 'rgba(200, 200, 220, 0.4)';
        ctx.beginPath();
        ctx.ellipse(x + 15, y + 7, 6, 3, -0.3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawFishbone(ctx, x, y) {
        // Lisca di pesce - più luminosa
        ctx.strokeStyle = '#aaa899';
        ctx.beginPath();
        ctx.moveTo(x, y + 10);
        ctx.lineTo(x + 30, y + 10);
        ctx.stroke();
        
        // Costole
        for (let i = 5; i < 25; i += 4) {
            ctx.beginPath();
            ctx.moveTo(x + i, y + 10);
            ctx.lineTo(x + i - 2, y + 3);
            ctx.moveTo(x + i, y + 10);
            ctx.lineTo(x + i - 2, y + 17);
            ctx.stroke();
        }
        
        // Testa (cerchio)
        ctx.fillStyle = '#aaa899';
        ctx.beginPath();
        ctx.arc(x + 28, y + 10, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Occhio
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(x + 29, y + 9, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Coda
        ctx.strokeStyle = '#aaa899';
        ctx.moveTo(x, y + 10);
        ctx.lineTo(x - 5, y + 16);
        ctx.stroke();
    }
    
    drawCan(ctx, x, y) {
        // Gomitolo di lana
        const cx = x + 15;
        const cy = y + 10;
        const r = 10;
        
        // Corpo gomitolo
        const gradient = ctx.createRadialGradient(cx - 2, cy - 2, 0, cx, cy, r);
        gradient.addColorStop(0, '#dd5577');
        gradient.addColorStop(0.5, '#bb3355');
        gradient.addColorStop(1, '#882244');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Linee di filo avvolto
        ctx.strokeStyle = 'rgba(255, 120, 150, 0.5)';
        ctx.lineWidth = 1;
        // Filo orizzontale
        ctx.beginPath();
        ctx.ellipse(cx, cy, r - 1, 4, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Filo diagonale
        ctx.beginPath();
        ctx.ellipse(cx, cy, r - 1, 4, 0.8, 0, Math.PI * 2);
        ctx.stroke();
        // Filo diagonale 2
        ctx.beginPath();
        ctx.ellipse(cx, cy, r - 1, 4, -0.8, 0, Math.PI * 2);
        ctx.stroke();
        // Filo verticale
        ctx.beginPath();
        ctx.ellipse(cx, cy, 4, r - 1, 0, 0, Math.PI * 2);
        ctx.stroke();
        
        // Riflesso
        ctx.fillStyle = 'rgba(255, 200, 210, 0.35)';
        ctx.beginPath();
        ctx.ellipse(cx - 3, cy - 4, 4, 3, -0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Filo che esce
        ctx.strokeStyle = '#cc4466';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx + r - 2, cy + 3);
        ctx.quadraticCurveTo(cx + r + 8, cy - 2, cx + r + 5, cy + 10);
        ctx.quadraticCurveTo(cx + r + 2, cy + 15, cx + r + 8, cy + 12);
        ctx.stroke();
    }
    
    drawMilk(ctx, x, y) {
        // Ciotola di latte
        ctx.fillStyle = '#6a6a7a';
        ctx.beginPath();
        ctx.ellipse(x + 15, y + 16, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#505068';
        ctx.beginPath();
        ctx.ellipse(x + 15, y + 14, 12, 4, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        
        // Latte
        ctx.fillStyle = '#dddde8';
        ctx.beginPath();
        ctx.ellipse(x + 15, y + 12, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Riflesso latte
        ctx.fillStyle = 'rgba(180, 200, 240, 0.5)';
        ctx.beginPath();
        ctx.ellipse(x + 12, y + 11, 4, 2, -0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    checkCollision(cat) {
        if (this.collected) return false;
        
        return cat.x < this.x + this.width &&
               cat.x + cat.width > this.x &&
               cat.y < this.y + this.height &&
               cat.y + cat.height > this.y;
    }

    collect() {
        this.collected = true;
        CONFIG.score += this.getPoints();
        return this.getPoints();
    }
    
    getPoints() {
        const points = {
            'fish': 10,
            'fishbone': 5,
            'yarn': 15,
            'can': 15,
            'milk': 20
        };
        return points[this.type] || 5;
    }
}

// Factory per generare cibo casuale
function createRandomFood(x, y) {
    const types = ['fish', 'fishbone', 'yarn', 'milk'];
    const weights = [0.35, 0.35, 0.2, 0.1]; // Probabilità
    
    let random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < types.length; i++) {
        cumulative += weights[i];
        if (random <= cumulative) {
            return new Food(x, y, types[i]);
        }
    }
    
    return new Food(x, y, 'fishbone');
}
