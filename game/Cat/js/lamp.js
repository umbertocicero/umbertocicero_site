// ============================================
// LAMP - Lampioni stradali
// ============================================

class Lamp {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.flicker = 0;
        this.intensity = 0.5 + Math.random() * 0.15;
    }

    update() {
        if (Math.random() < 0.02) {
            this.flicker = 5;
        }
        if (this.flicker > 0) this.flicker--;
    }

    draw(ctx) {
        const brightness = this.flicker > 0 ? 0.4 : this.intensity;
        
        // Cono di luce - più luminoso
        const coneHeight = 220;
        const coneTopWidth = 25;
        const coneBottomWidth = 160;
        
        const gradient = ctx.createLinearGradient(this.x, this.y + 25, this.x, this.y + 25 + coneHeight);
        gradient.addColorStop(0, `rgba(220, 180, 120, ${brightness * 0.7})`);
        gradient.addColorStop(0.15, `rgba(200, 160, 100, ${brightness * 0.45})`);
        gradient.addColorStop(0.4, `rgba(180, 140, 80, ${brightness * 0.2})`);
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(this.x - coneTopWidth, this.y + 25);
        ctx.lineTo(this.x + coneTopWidth, this.y + 25);
        ctx.lineTo(this.x + coneBottomWidth, this.y + 25 + coneHeight);
        ctx.lineTo(this.x - coneBottomWidth, this.y + 25 + coneHeight);
        ctx.closePath();
        ctx.fill();
        
        // Alone terreno
        const groundGlow = ctx.createRadialGradient(
            this.x, this.y + 25 + coneHeight - 30, 0, 
            this.x, this.y + 25 + coneHeight - 30, coneBottomWidth + 20
        );
        groundGlow.addColorStop(0, `rgba(200, 170, 110, ${brightness * 0.3})`);
        groundGlow.addColorStop(0.4, `rgba(180, 150, 90, ${brightness * 0.15})`);
        groundGlow.addColorStop(0.7, `rgba(160, 130, 70, ${brightness * 0.06})`);
        groundGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = groundGlow;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 25 + coneHeight - 10, coneBottomWidth + 20, 40, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ombra palo
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x + 5, this.y + 105, 12, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Base
        const baseGradient = ctx.createLinearGradient(this.x - 15, this.y + 95, this.x + 15, this.y + 95);
        baseGradient.addColorStop(0, '#151515');
        baseGradient.addColorStop(0.3, '#282828');
        baseGradient.addColorStop(0.7, '#202020');
        baseGradient.addColorStop(1, '#0a0a0a');
        ctx.fillStyle = baseGradient;
        
        ctx.fillRect(this.x - 14, this.y + 100, 28, 8);
        ctx.fillRect(this.x - 11, this.y + 93, 22, 8);
        ctx.fillRect(this.x - 8, this.y + 88, 16, 6);
        
        // Palo
        const poleGradient = ctx.createLinearGradient(this.x - 5, this.y, this.x + 5, this.y);
        poleGradient.addColorStop(0, '#0a0a0a');
        poleGradient.addColorStop(0.2, '#1e1e1e');
        poleGradient.addColorStop(0.5, '#282828');
        poleGradient.addColorStop(0.8, '#1e1e1e');
        poleGradient.addColorStop(1, '#0a0a0a');
        ctx.fillStyle = poleGradient;
        ctx.fillRect(this.x - 4, this.y + 30, 8, 60);
        
        // Anelli
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(this.x - 6, this.y + 35, 12, 3);
        ctx.fillRect(this.x - 6, this.y + 75, 12, 3);
        ctx.fillStyle = '#333333';
        ctx.fillRect(this.x - 6, this.y + 36, 12, 1);
        ctx.fillRect(this.x - 6, this.y + 76, 12, 1);
        
        // Braccio
        ctx.fillStyle = '#141414';
        ctx.lineTo(this.x + 3, this.y + 30);
        ctx.lineTo(this.x + 3, this.y + 5);
        ctx.quadraticCurveTo(this.x + 3, this.y, this.x, this.y);
        ctx.quadraticCurveTo(this.x - 3, this.y, this.x - 3, this.y + 5);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = '#1e1e1e';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(this.x, this.y + 5, 8, Math.PI, 0);
        ctx.stroke();
        
        // Lanterna
        const lanternGradient = ctx.createLinearGradient(this.x - 18, this.y, this.x + 18, this.y);
        lanternGradient.addColorStop(0, '#0a0a0a');
        lanternGradient.addColorStop(0.2, '#1e1e1e');
        lanternGradient.addColorStop(0.5, '#282828');
        lanternGradient.addColorStop(0.8, '#1e1e1e');
        lanternGradient.addColorStop(1, '#0a0a0a');
        ctx.fillStyle = lanternGradient;
        
        // Cappello
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
        ctx.strokeStyle = '#333333';
        ctx.beginPath();
        ctx.moveTo(this.x - 2, this.y - 5);
        ctx.lineTo(this.x + 2, this.y - 5);
        ctx.lineTo(this.x, this.y - 12);
        ctx.closePath();
        ctx.fill();
        
        // Corpo lanterna
        ctx.fillStyle = '#141414';
        ctx.fillRect(this.x - 16, this.y + 8, 32, 18);
        
        // Vetro illuminato
        if (this.flicker <= 0) {
            const glassGlow = ctx.createRadialGradient(this.x, this.y + 17, 0, this.x, this.y + 17, 25);
            glassGlow.addColorStop(0, `rgba(255, 230, 180, ${Math.min(1, brightness * 1.2)})`);
            glassGlow.addColorStop(0.4, `rgba(220, 190, 140, ${brightness * 0.7})`);
            glassGlow.addColorStop(1, `rgba(180, 150, 100, ${brightness * 0.3})`);
            ctx.fillStyle = glassGlow;
        } else {
            ctx.fillStyle = 'rgba(180, 130, 70, 0.2)';
        }
        ctx.fillRect(this.x - 14, this.y + 10, 28, 14);
        
        // Divisori vetro
        ctx.strokeStyle = '#141414';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x - 5, this.y + 8);
        ctx.lineTo(this.x - 5, this.y + 26);
        ctx.moveTo(this.x + 5, this.y + 8);
        ctx.lineTo(this.x + 5, this.y + 26);
        ctx.moveTo(this.x - 16, this.y + 17);
        ctx.lineTo(this.x + 16, this.y + 17);
        ctx.stroke();
        
        // Base lanterna
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(this.x - 18, this.y + 26, 36, 4);
        ctx.fillStyle = '#282828';
        ctx.fillRect(this.x - 18, this.y + 26, 36, 1);
        
        // Decorazione sotto
        ctx.fillStyle = '#141414';
        ctx.beginPath();
        ctx.moveTo(this.x - 8, this.y + 30);
        ctx.lineTo(this.x + 8, this.y + 30);
        ctx.lineTo(this.x, this.y + 36);
        ctx.closePath();
        ctx.fill();
        
        // Riflesso
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(this.x - 13, this.y + 11, 4, 12);
    }
}
