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
            'building': '#151520',
            'fire-escape': '#222228',
            'dumpster': '#0a0a0a',
            'railing': '#2a2a35',
            'roof': '#0e0e18',
            'ground': '#141416'
        };
        return colors[this.type] || '#151520';
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
                        lit: Math.random() > 0.75,
                        color: Math.random() > 0.5 ? '#aa9955' : '#556688'
                    });
                }
            }
        }
        return windows;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.strokeStyle = '#0a0a14';
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
        buildingGradient.addColorStop(0, '#141420');
        buildingGradient.addColorStop(0.1, '#181825');
        buildingGradient.addColorStop(0.9, '#121220');
        buildingGradient.addColorStop(1, '#0e0e18');
        ctx.fillStyle = buildingGradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        ctx.fillStyle = '#0a0a15';
        ctx.fillRect(this.x, this.y, 3, this.height);
        
        ctx.fillStyle = '#1a1a28';
        ctx.fillRect(this.x + this.width - 2, this.y, 2, this.height);
        
        // Cornice tetto
        ctx.fillStyle = '#1e1e2a';
        ctx.fillRect(this.x - 3, this.y - 6, this.width + 6, 10);
        ctx.fillStyle = '#151520';
        ctx.fillRect(this.x - 2, this.y - 3, this.width + 4, 5);
        
        // Finestre
        for (const win of this.windows) {
            const wx = this.x + win.x;
            const wy = this.y + win.y;
            
            ctx.fillStyle = '#0a0a15';
            ctx.fillRect(wx - 2, wy - 2, 34, 44);
            
            if (win.lit) {
                const glowGradient = ctx.createRadialGradient(wx + 15, wy + 20, 0, wx + 15, wy + 20, 50);
                glowGradient.addColorStop(0, win.color + '20');
                glowGradient.addColorStop(0.5, win.color + '0a');
                glowGradient.addColorStop(1, 'transparent');
                ctx.fillStyle = glowGradient;
                ctx.fillRect(wx - 20, wy - 15, 70, 70);
                
                const windowGradient = ctx.createLinearGradient(wx, wy, wx, wy + 40);
                windowGradient.addColorStop(0, win.color);
                windowGradient.addColorStop(1, win.color === '#aa9955' ? '#776633' : '#334455');
                ctx.fillStyle = windowGradient;
            } else {
                const darkGradient = ctx.createLinearGradient(wx, wy, wx + 30, wy + 40);
                darkGradient.addColorStop(0, '#08081a');
                darkGradient.addColorStop(0.3, '#0c0c20');
                darkGradient.addColorStop(1, '#060615');
                ctx.fillStyle = darkGradient;
            }
            ctx.fillRect(wx, wy, 30, 40);
            
            if (!win.lit) {
                ctx.fillStyle = 'rgba(60, 60, 100, 0.06)';
                ctx.beginPath();
                ctx.moveTo(wx + 2, wy + 2);
                ctx.lineTo(wx + 12, wy + 2);
                ctx.lineTo(wx + 2, wy + 15);
                ctx.closePath();
                ctx.fill();
            }
            
            ctx.strokeStyle = '#2a2a35';
            ctx.lineWidth = 2;
            ctx.strokeRect(wx, wy, 30, 40);
            
            ctx.strokeStyle = '#1e1e28';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(wx + 15, wy);
            ctx.lineTo(wx + 15, wy + 40);
            ctx.moveTo(wx, wy + 20);
            ctx.lineTo(wx + 30, wy + 20);
            ctx.stroke();
            
            ctx.fillStyle = '#2a2a35';
            ctx.fillRect(wx - 3, wy + 40, 36, 4);
        }

        // Dettagli tetto
        if (this.height > 100) {
            ctx.fillStyle = '#111120';
            ctx.fillRect(this.x + 15, this.y - 20, 18, 22);
            ctx.fillStyle = '#0a0a15';
            ctx.fillRect(this.x + 14, this.y - 24, 20, 6);
            
            ctx.fillStyle = '#1e1e28';
            ctx.fillRect(this.x + this.width - 35, this.y - 30, 12, 32);
            ctx.fillStyle = '#2a2a35';
            ctx.fillRect(this.x + this.width - 38, this.y - 32, 18, 4);
        }
        
        ctx.fillStyle = '#1e1e28';
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
        bodyGradient.addColorStop(0, '#0a0a0a');
        bodyGradient.addColorStop(0.2, '#121212');
        bodyGradient.addColorStop(0.8, '#0e0e0e');
        bodyGradient.addColorStop(1, '#080808');
        ctx.fillStyle = bodyGradient;
        
        ctx.beginPath();
        ctx.moveTo(this.x + 3, this.y);
        ctx.lineTo(this.x + this.width - 3, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = '#1e1e1e';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Costole
        ctx.strokeStyle = '#111111';
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
        lidGradient.addColorStop(0, '#141414');
        lidGradient.addColorStop(0.5, '#0e0e0e');
        lidGradient.addColorStop(1, '#0a0a0a');
        ctx.fillStyle = lidGradient;
        
        ctx.beginPath();
        ctx.moveTo(this.x - 3, this.y);
        ctx.lineTo(this.x + this.width + 3, this.y);
        ctx.quadraticCurveTo(this.x + this.width + 5, this.y - 5, this.x + this.width + 2, this.y - 8);
        ctx.lineTo(this.x - 2, this.y - 8);
        ctx.quadraticCurveTo(this.x - 5, this.y - 5, this.x - 3, this.y);
        ctx.fill();
        
        ctx.strokeStyle = '#1e1e1e';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Maniglia
        ctx.fillStyle = '#1e1e1e';
        ctx.beginPath();
        ctx.roundRect(this.x + this.width/2 - 15, this.y - 12, 30, 6, 2);
        ctx.fill();
        
        // Ruote
        const wheelY = this.y + this.height + 2;
        for (const wheelX of [this.x + 12, this.x + this.width - 12]) {
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(wheelX - 4, this.y + this.height - 5, 8, 8);
            
            ctx.fillStyle = '#050505';
            ctx.beginPath();
            ctx.arc(wheelX, wheelY + 3, 7, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#141414';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    drawGround(ctx) {
        // Asfalto
        const asphaltGradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        asphaltGradient.addColorStop(0, '#131316');
        asphaltGradient.addColorStop(0.1, '#0e0e12');
        asphaltGradient.addColorStop(1, '#08080a');
        ctx.fillStyle = asphaltGradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Marciapiede
        const curbGradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + 12);
        curbGradient.addColorStop(0, '#2a2a30');
        curbGradient.addColorStop(0.5, '#1e1e24');
        curbGradient.addColorStop(1, '#141418');
        ctx.fillStyle = curbGradient;
        ctx.fillRect(this.x, this.y, this.width, 12);
        
        ctx.fillStyle = '#1e1e24';
        ctx.fillRect(this.x, this.y + 10, this.width, 2);
        
        // Tombini
        for (let i = 200; i < this.width; i += 500) {
            ctx.fillStyle = '#141418';
            ctx.fillRect(this.x + i, this.y + 20, 40, 30);
            
            ctx.fillStyle = '#08080a';
            ctx.fillRect(this.x + i + 3, this.y + 23, 34, 24);
            
            ctx.strokeStyle = '#141418';
            ctx.lineWidth = 2;
            for (let g = 0; g < 5; g++) {
                ctx.beginPath();
                ctx.moveTo(this.x + i + 6, this.y + 27 + g * 5);
                ctx.lineTo(this.x + i + 34, this.y + 27 + g * 5);
                ctx.stroke();
            }
        }
        
        // Strisce
        ctx.fillStyle = '#2a2a15';
        for (let i = 50; i < this.width; i += 150) {
            ctx.fillRect(this.x + i, this.y + 35, 50, 4);
        }
    }
}
