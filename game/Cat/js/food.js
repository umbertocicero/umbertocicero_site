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
        
        // Glow
        const glow = ctx.createRadialGradient(
            drawX + this.width/2, drawY + this.height/2, 0,
            drawX + this.width/2, drawY + this.height/2, 35
        );
        glow.addColorStop(0, `rgba(180, 150, 60, ${this.glowIntensity * 0.5})`);
        glow.addColorStop(0.5, `rgba(150, 130, 30, ${this.glowIntensity * 0.25})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(drawX + this.width/2, drawY + this.height/2, 35, 0, Math.PI * 2);
        ctx.fill();
        
        // Disegna il cibo in base al tipo
        switch(this.type) {
            case 'fish':
                this.drawFish(ctx, drawX, drawY);
                break;
            case 'fishbone':
                this.drawFishbone(ctx, drawX, drawY);
                break;
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
                const alpha = Math.min(0.5, sparkle.life / 15);
                ctx.fillStyle = `rgba(180, 180, 120, ${alpha})`;
                ctx.beginPath();
                ctx.arc(drawX + sparkle.x, drawY + sparkle.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    drawFish(ctx, x, y) {
        // Pesce argentato
        ctx.fillStyle = '#556672';
        
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
        ctx.fillStyle = '#4a5a6e';
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
        ctx.fillStyle = 'rgba(200, 200, 220, 0.2)';
        ctx.beginPath();
        ctx.ellipse(x + 15, y + 7, 6, 3, -0.3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawFishbone(ctx, x, y) {
        // Lisca di pesce
        ctx.strokeStyle = '#888877';
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
        ctx.fillStyle = '#888877';
        ctx.beginPath();
        ctx.arc(x + 28, y + 10, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Occhio
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(x + 29, y + 9, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Coda
        ctx.strokeStyle = '#888877';
        ctx.moveTo(x, y + 10);
        ctx.lineTo(x - 5, y + 16);
        ctx.stroke();
    }
    
    drawCan(ctx, x, y) {
        // Scatoletta di tonno
        const gradient = ctx.createLinearGradient(x, y, x + 30, y);
        gradient.addColorStop(0, '#2a3a4a');
        gradient.addColorStop(0.3, '#3a4a5a');
        gradient.addColorStop(0.7, '#304050');
        gradient.addColorStop(1, '#1a2a3a');
        
        // Corpo
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y + 2, 28, 16, 2);
        ctx.fill();
        
        // Top
        ctx.fillStyle = '#4a5a6a';
        ctx.beginPath();
        ctx.ellipse(x + 14, y + 3, 14, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Linguetta
        ctx.fillStyle = '#4a6a4a';
        ctx.beginPath();
        ctx.ellipse(x + 14, y + 3, 5, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Etichetta
        ctx.fillStyle = '#997722';
        ctx.fillRect(x + 4, y + 8, 20, 6);
        
        // Scritta etichetta
        ctx.fillStyle = '#553311';
        ctx.font = '5px Arial';
        ctx.fillText('TUNA', x + 6, y + 13);
    }
    
    drawMilk(ctx, x, y) {
        // Ciotola di latte
        ctx.fillStyle = '#4a4a5a';
        ctx.beginPath();
        ctx.ellipse(x + 15, y + 16, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#333348';
        ctx.beginPath();
        ctx.ellipse(x + 15, y + 14, 12, 4, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        
        // Latte
        ctx.fillStyle = '#bbbbcc';
        ctx.beginPath();
        ctx.ellipse(x + 15, y + 12, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Riflesso latte
        ctx.fillStyle = 'rgba(140, 160, 200, 0.3)';
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
            'can': 15,
            'milk': 20
        };
        return points[this.type] || 5;
    }
}

// Factory per generare cibo casuale
function createRandomFood(x, y) {
    const types = ['fish', 'fishbone', 'can', 'milk'];
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
