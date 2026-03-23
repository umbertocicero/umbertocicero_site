// ============================================
// FIRE ESCAPE - Scale antincendio
// ============================================

class FireEscapeStructure {
    constructor(x, baseY, buildingHeight, floors) {
        this.x = x;
        this.baseY = baseY;
        this.buildingHeight = buildingHeight;
        this.floors = floors;
        this.platformWidth = 90;
        this.platformHeight = 12;
        this.floorHeight = 85;
        this.platforms = [];
        
        this.generatePlatforms();
    }
    
    generatePlatforms() {
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
        const topY = this.baseY - this.floors * this.floorHeight - 20;
        
        // Pilastri
        this.drawPillar(ctx, this.x - 5, topY, this.baseY - topY);
        this.drawPillar(ctx, this.x + this.platformWidth - 1, topY, this.baseY - topY);
        
        // Piani
        for (let i = 0; i < this.floors; i++) {
            const platform = this.platforms[i];
            
            this.drawPlatform(ctx, platform.x, platform.y, platform.width, platform.height);
            this.drawRailing(ctx, platform.x, platform.y - 35, platform.width, 35);
            
            if (i < this.floors - 1) {
                const nextPlatform = this.platforms[i + 1];
                this.drawStairs(ctx, platform.x, platform.y, nextPlatform.y, i % 2 === 0);
            }
        }
        
        // Scala dal terreno
        if (this.platforms.length > 0) {
            this.drawLadder(ctx, this.x + this.platformWidth/2 - 10, this.platforms[0].y + this.platformHeight, this.baseY);
        }
    }
    
    drawPillar(ctx, x, y, height) {
        const gradient = ctx.createLinearGradient(x, y, x + 6, y);
        gradient.addColorStop(0, '#5a5a5a');
        gradient.addColorStop(0.3, '#707070');
        gradient.addColorStop(0.7, '#606060');
        gradient.addColorStop(1, '#4a4a4a');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, 6, height);
        
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, 6, height);
        
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
        const gradient = ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, '#6a6a6a');
        gradient.addColorStop(0.3, '#5a5a5a');
        gradient.addColorStop(1, '#4a4a4a');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, width, height);
        
        // Griglia
        ctx.strokeStyle = '#7a7a7a';
        ctx.lineWidth = 1;
        
        for (let gy = y + 3; gy < y + height; gy += 3) {
            ctx.beginPath();
            ctx.moveTo(x + 2, gy);
            ctx.lineTo(x + width - 2, gy);
            ctx.stroke();
        }
        
        for (let gx = x + 6; gx < x + width - 4; gx += 6) {
            ctx.beginPath();
            ctx.moveTo(gx, y + 1);
            ctx.lineTo(gx, y + height - 1);
            ctx.stroke();
        }
        
        ctx.strokeStyle = '#8a8a8a';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        
        ctx.strokeStyle = '#9a9a9a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 1, y + 1);
        ctx.lineTo(x + width - 1, y + 1);
        ctx.stroke();
        
        // Supporti
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(x + 15, y + height, 4, 8);
        ctx.fillRect(x + width - 19, y + height, 4, 8);
        
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
        const postSpacing = 22;
        const posts = Math.floor(width / postSpacing);
        
        for (let i = 0; i <= posts; i++) {
            const px = x + i * postSpacing;
            if (px > x + width - 5) break;
            
            ctx.fillStyle = '#5a5a5a';
            ctx.fillRect(px, y, 3, height);
            
            ctx.fillStyle = '#7a7a7a';
            ctx.fillRect(px, y, 1, height);
        }
        
        ctx.fillStyle = '#6a6a6a';
        ctx.fillRect(x - 2, y - 3, width + 4, 5);
        ctx.strokeStyle = '#8a8a8a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - 2, y - 2);
        ctx.lineTo(x + width + 2, y - 2);
        ctx.stroke();
        
        ctx.fillStyle = '#5a5a5a';
        ctx.fillRect(x, y + height/2, width, 2);
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
        
        // Stringhe
        ctx.strokeStyle = '#5a5a5a';
        ctx.lineWidth = 4;
        
        ctx.beginPath();
        ctx.moveTo(startX, fromY);
        ctx.lineTo(startX + direction * stairWidth, toY + this.platformHeight);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(startX + direction * 15, fromY);
        ctx.lineTo(startX + direction * (stairWidth + 15), toY + this.platformHeight);
        ctx.stroke();
        
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
            
            const gradient = ctx.createLinearGradient(stepX, stepY, stepX, stepY + 4);
            gradient.addColorStop(0, '#6a6a6a');
            gradient.addColorStop(1, '#4a4a4a');
            ctx.fillStyle = gradient;
            
            const sw = 18;
            const actualX = goingRight ? stepX : stepX - sw;
            ctx.fillRect(actualX, stepY, sw, 4);
            
            ctx.strokeStyle = '#7a7a7a';
            ctx.lineWidth = 1;
            ctx.strokeRect(actualX, stepY, sw, 4);
        }
    }
    
    drawLadder(ctx, x, fromY, toY) {
        const ladderWidth = 20;
        const rungSpacing = 20;
        
        ctx.fillStyle = '#5a5a5a';
        ctx.fillRect(x, fromY, 3, toY - fromY);
        ctx.fillRect(x + ladderWidth - 3, fromY, 3, toY - fromY);
        
        ctx.fillStyle = '#6a6a6a';
        ctx.fillRect(x, fromY, 1, toY - fromY);
        ctx.fillRect(x + ladderWidth - 3, fromY, 1, toY - fromY);
        
        for (let ry = fromY + 15; ry < toY - 10; ry += rungSpacing) {
            ctx.fillStyle = '#5a5a5a';
            ctx.fillRect(x + 2, ry, ladderWidth - 4, 3);
            
            ctx.fillStyle = '#6a6a6a';
            ctx.fillRect(x + 2, ry, ladderWidth - 4, 1);
        }
    }
}
