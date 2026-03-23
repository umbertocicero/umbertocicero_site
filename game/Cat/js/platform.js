// ============================================
// PLATFORM - Piattaforme e edifici
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
        
        this.isOneWay = (type === 'building' || type === 'fire-escape' || type === 'railing' || type === 'dumpster');
        this.roofOnly = (type === 'building');
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
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.strokeStyle = '#1a1a2a';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        switch(this.type) {
            case 'building':
                this.drawBuilding(ctx);
                break;
            case 'dumpster':
                this.drawDumpster(ctx);
                break;
            case 'ground':
                this.drawGround(ctx);
                break;
        }
    }

    drawBuilding(ctx) {
        // Gradiente edificio
        const buildingGradient = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y);
        buildingGradient.addColorStop(0, '#2a2a3a');
        buildingGradient.addColorStop(0.1, '#323242');
        buildingGradient.addColorStop(0.9, '#282838');
        buildingGradient.addColorStop(1, '#222232');
        ctx.fillStyle = buildingGradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        ctx.fillStyle = '#1a1a28';
        ctx.fillRect(this.x, this.y, 3, this.height);
        
        ctx.fillStyle = '#353545';
        ctx.fillRect(this.x + this.width - 2, this.y, 2, this.height);
        
        // Cornice tetto
        ctx.fillStyle = '#3a3a4a';
        ctx.fillRect(this.x - 3, this.y - 6, this.width + 6, 10);
        ctx.fillStyle = '#2a2a3a';
        ctx.fillRect(this.x - 2, this.y - 3, this.width + 4, 5);
        
        // Finestre
        for (const win of this.windows) {
            const wx = this.x + win.x;
            const wy = this.y + win.y;
            
            ctx.fillStyle = '#1a1a28';
            ctx.fillRect(wx - 2, wy - 2, 34, 44);
            
            if (win.lit) {
                const glowGradient = ctx.createRadialGradient(wx + 15, wy + 20, 0, wx + 15, wy + 20, 50);
                glowGradient.addColorStop(0, win.color + '30');
                glowGradient.addColorStop(0.5, win.color + '15');
                glowGradient.addColorStop(1, 'transparent');
                ctx.fillStyle = glowGradient;
                ctx.fillRect(wx - 20, wy - 15, 70, 70);
                
                const windowGradient = ctx.createLinearGradient(wx, wy, wx, wy + 40);
                windowGradient.addColorStop(0, win.color);
                windowGradient.addColorStop(1, win.color === '#ffeeaa' ? '#ddcc88' : '#88ccdd');
                ctx.fillStyle = windowGradient;
            } else {
                const darkGradient = ctx.createLinearGradient(wx, wy, wx + 30, wy + 40);
                darkGradient.addColorStop(0, '#1a1a2a');
                darkGradient.addColorStop(0.3, '#222235');
                darkGradient.addColorStop(1, '#151525');
                ctx.fillStyle = darkGradient;
            }
            ctx.fillRect(wx, wy, 30, 40);
            
            if (!win.lit) {
                ctx.fillStyle = 'rgba(100, 100, 150, 0.1)';
                ctx.beginPath();
                ctx.moveTo(wx + 2, wy + 2);
                ctx.lineTo(wx + 12, wy + 2);
                ctx.lineTo(wx + 2, wy + 15);
                ctx.closePath();
                ctx.fill();
            }
            
            ctx.strokeStyle = '#4a4a5a';
            ctx.lineWidth = 2;
            ctx.strokeRect(wx, wy, 30, 40);
            
            ctx.strokeStyle = '#3a3a4a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(wx + 15, wy);
            ctx.lineTo(wx + 15, wy + 40);
            ctx.moveTo(wx, wy + 20);
            ctx.lineTo(wx + 30, wy + 20);
            ctx.stroke();
            
            ctx.fillStyle = '#4a4a5a';
            ctx.fillRect(wx - 3, wy + 40, 36, 4);
        }

        // Dettagli tetto
        if (this.height > 100) {
            ctx.fillStyle = '#252535';
            ctx.fillRect(this.x + 15, this.y - 20, 18, 22);
            ctx.fillStyle = '#1a1a28';
            ctx.fillRect(this.x + 14, this.y - 24, 20, 6);
            
            ctx.fillStyle = '#3a3a4a';
            ctx.fillRect(this.x + this.width - 35, this.y - 30, 12, 32);
            ctx.fillStyle = '#4a4a5a';
            ctx.fillRect(this.x + this.width - 38, this.y - 32, 18, 4);
        }
        
        ctx.fillStyle = '#3a3a4a';
        ctx.fillRect(this.x - 2, this.y + this.height - 8, this.width + 4, 3);
    }

    drawDumpster(ctx) {
        // Ombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x + this.width/2, this.y + this.height + 5, this.width/2 + 5, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Corpo
        const bodyGradient = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y);
        bodyGradient.addColorStop(0, '#1a1a1a');
        bodyGradient.addColorStop(0.2, '#252525');
        bodyGradient.addColorStop(0.8, '#202020');
        bodyGradient.addColorStop(1, '#151515');
        ctx.fillStyle = bodyGradient;
        
        ctx.beginPath();
        ctx.moveTo(this.x + 3, this.y);
        ctx.lineTo(this.x + this.width - 3, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Costole
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
            const rx = this.x + (this.width / 4) * i;
            ctx.beginPath();
            ctx.moveTo(rx, this.y + 5);
            ctx.lineTo(rx + (i < 2 ? -1 : 1), this.y + this.height - 3);
            ctx.stroke();
        }
        
        // Coperchio
        const lidGradient = ctx.createLinearGradient(this.x, this.y - 10, this.x, this.y);
        lidGradient.addColorStop(0, '#2a2a2a');
        lidGradient.addColorStop(0.5, '#222222');
        lidGradient.addColorStop(1, '#1a1a1a');
        ctx.fillStyle = lidGradient;
        
        ctx.beginPath();
        ctx.moveTo(this.x - 3, this.y);
        ctx.lineTo(this.x + this.width + 3, this.y);
        ctx.quadraticCurveTo(this.x + this.width + 5, this.y - 5, this.x + this.width + 2, this.y - 8);
        ctx.lineTo(this.x - 2, this.y - 8);
        ctx.quadraticCurveTo(this.x - 5, this.y - 5, this.x - 3, this.y);
        ctx.fill();
        
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Maniglia
        ctx.fillStyle = '#3a3a3a';
        ctx.beginPath();
        ctx.roundRect(this.x + this.width/2 - 15, this.y - 12, 30, 6, 2);
        ctx.fill();
        
        // Ruote
        const wheelY = this.y + this.height + 2;
        for (const wheelX of [this.x + 12, this.x + this.width - 12]) {
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(wheelX - 4, this.y + this.height - 5, 8, 8);
            
            ctx.fillStyle = '#0a0a0a';
            ctx.beginPath();
            ctx.arc(wheelX, wheelY + 3, 7, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#2a2a2a';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    drawGround(ctx) {
        // Asfalto
        const asphaltGradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        asphaltGradient.addColorStop(0, '#252528');
        asphaltGradient.addColorStop(0.1, '#1e1e22');
        asphaltGradient.addColorStop(1, '#151518');
        ctx.fillStyle = asphaltGradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Marciapiede
        const curbGradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + 12);
        curbGradient.addColorStop(0, '#4a4a50');
        curbGradient.addColorStop(0.5, '#3a3a40');
        curbGradient.addColorStop(1, '#2a2a30');
        ctx.fillStyle = curbGradient;
        ctx.fillRect(this.x, this.y, this.width, 12);
        
        ctx.fillStyle = '#3a3a40';
        ctx.fillRect(this.x, this.y + 10, this.width, 2);
        
        // Tombini
        for (let i = 200; i < this.width; i += 500) {
            ctx.fillStyle = '#2a2a2e';
            ctx.fillRect(this.x + i, this.y + 20, 40, 30);
            
            ctx.fillStyle = '#151518';
            ctx.fillRect(this.x + i + 3, this.y + 23, 34, 24);
            
            ctx.strokeStyle = '#2a2a2e';
            ctx.lineWidth = 2;
            for (let g = 0; g < 5; g++) {
                ctx.beginPath();
                ctx.moveTo(this.x + i + 6, this.y + 27 + g * 5);
                ctx.lineTo(this.x + i + 34, this.y + 27 + g * 5);
                ctx.stroke();
            }
        }
        
        // Strisce
        ctx.fillStyle = '#5a5a30';
        for (let i = 50; i < this.width; i += 150) {
            ctx.fillRect(this.x + i, this.y + 35, 50, 4);
        }
    }
}
