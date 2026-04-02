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
        
        this.isOneWay = (type === 'building' || type === 'fire-escape' || type === 'railing' || type === 'dumpster' || type === 'barrier' || type === 'steam-vent' || type === 'puddle' || type === 'quantum');
        this.roofOnly = (type === 'building');
    }

    getColor() {
        const colors = {
            'building': '#151520',
            'fire-escape': '#222228',
            'dumpster': '#0a0a0a',
            'railing': '#2a2a35',
            'barrier': '#1a1a0a',
            'steam-vent': '#cc5500',
            'puddle': '#0a0c14',
            'roof': '#0e0e18',
            'ground': '#141416',
            'quantum': '#0a1028'
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
        // Skip base rect for types that draw their own shape
        if (this.type !== 'steam-vent' && this.type !== 'barrier' && this.type !== 'puddle') {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);

            ctx.strokeStyle = '#0a0a14';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }

        switch(this.type) {
            case 'building':
                this.drawBuilding(ctx);
                break;
            case 'dumpster':
                this.drawDumpster(ctx);
                break;
            case 'barrier':
                this.drawBarrier(ctx);
                break;
            case 'steam-vent':
                this.drawSteamVent(ctx);
                break;
            case 'puddle':
                this.drawPuddle(ctx);
                break;
            case 'ground':
                this.drawGround(ctx);
                break;
            case 'quantum':
                this.drawQuantumPlatform(ctx);
                break;
        }
    }

    drawQuantumPlatform(ctx) {
        const t = CONFIG.time;
        const pulse = Math.sin(t * 0.06 + this.x * 0.01) * 0.5 + 0.5;

        // Corpo solido — lastra di metallo scuro
        const grad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        grad.addColorStop(0, `rgba(30, 60, 120, ${0.85 + pulse * 0.1})`);
        grad.addColorStop(0.4, `rgba(15, 30, 70, 0.9)`);
        grad.addColorStop(1, `rgba(8, 15, 40, 0.95)`);
        ctx.fillStyle = grad;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Bordo superiore luminoso — effetto neon
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgba(80, 160, 255, ${0.7 + pulse * 0.3})`;
        ctx.strokeStyle = `rgba(80, 160, 255, ${0.8 + pulse * 0.2})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.width, this.y);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Bordi laterali sottili
        ctx.strokeStyle = `rgba(40, 100, 200, 0.5)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.moveTo(this.x + this.width, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.stroke();

        // Circuiti decorativi sul top
        ctx.strokeStyle = `rgba(60, 140, 255, ${0.25 + pulse * 0.15})`;
        ctx.lineWidth = 1;
        const step = Math.max(20, Math.floor(this.width / 6));
        for (let sx = this.x + 10; sx < this.x + this.width - 10; sx += step) {
            ctx.beginPath();
            ctx.moveTo(sx, this.y + 4);
            ctx.lineTo(sx + 6, this.y + 4);
            ctx.lineTo(sx + 6, this.y + this.height - 2);
            ctx.stroke();
        }
    }

    drawBuilding(ctx) {
        // Livello 5: edifici in stile quantum neon
        if (CONFIG.level === 5) {
            this._drawQuantumBuilding(ctx);
            return;
        }

        // Gradiente edificio (tutti gli altri livelli)
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
        
        // Neve sui tetti (Livello 3 - Inverno)
        if (CONFIG.level === 3) {
            this.drawSnowLayer(ctx, this.x - 2, this.y - 10, this.width + 4, 10);
            // Ghiaccioli sotto la cornice
            ctx.fillStyle = '#bcc5d8';
            for (let ix = this.x + 8; ix < this.x + this.width - 8; ix += 12 + Math.sin(ix) * 5) {
                const icicleH = 6 + Math.sin(ix * 0.3) * 4;
                ctx.beginPath();
                ctx.moveTo(ix, this.y - 3);
                ctx.lineTo(ix + 2, this.y - 3);
                ctx.lineTo(ix + 1, this.y - 3 + icicleH);
                ctx.closePath();
                ctx.fill();
            }
        }
    }

    _drawQuantumBuilding(ctx) {
        const t = CONFIG.time;
        const pulse = Math.sin(t * 0.04 + this.x * 0.008) * 0.5 + 0.5;

        // Corpo — gradiente blu scuro
        const grad = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y + this.height);
        grad.addColorStop(0, '#05091a');
        grad.addColorStop(0.3, '#07101f');
        grad.addColorStop(0.7, '#050d1c');
        grad.addColorStop(1, '#030810');
        ctx.fillStyle = grad;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Bordi laterali sottili neon
        ctx.strokeStyle = `rgba(30,80,180,0.55)`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        // Cornice tetto neon
        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgba(60,140,255,${0.5 + pulse * 0.4})`;
        ctx.strokeStyle = `rgba(60,140,255,${0.6 + pulse * 0.35})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x - 2, this.y - 2);
        ctx.lineTo(this.x + this.width + 2, this.y - 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Dettagli tetto (antenna + piattaforma)
        ctx.fillStyle = '#0c1830';
        ctx.fillRect(this.x - 3, this.y - 8, this.width + 6, 9);
        ctx.fillStyle = `rgba(40,100,200,0.7)`;
        ctx.fillRect(this.x - 3, this.y - 9, this.width + 6, 2);

        // Antenna
        const antX = this.x + this.width * 0.75;
        ctx.fillStyle = '#1a3060';
        ctx.fillRect(antX - 2, this.y - 28, 3, 20);
        ctx.fillStyle = `rgba(80,180,255,${0.6 + pulse * 0.4})`;
        ctx.beginPath();
        ctx.arc(antX - 1, this.y - 29, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(80,180,255,0.9)';
        ctx.fill();
        ctx.shadowBlur = 0;

        // Finestre — stile blu neon
        for (const win of this.windows) {
            const wx = this.x + win.x;
            const wy = this.y + win.y;

            // Cornice
            ctx.fillStyle = '#060d20';
            ctx.fillRect(wx - 2, wy - 2, 34, 44);

            if (win.lit) {
                // Glow azzurro
                const glow = ctx.createRadialGradient(wx + 15, wy + 20, 0, wx + 15, wy + 20, 45);
                glow.addColorStop(0, 'rgba(60,140,255,0.2)');
                glow.addColorStop(0.5, 'rgba(40,100,220,0.06)');
                glow.addColorStop(1, 'transparent');
                ctx.fillStyle = glow;
                ctx.fillRect(wx - 18, wy - 14, 66, 66);

                // Vetro illuminato azzurro
                const wGrad = ctx.createLinearGradient(wx, wy, wx, wy + 40);
                wGrad.addColorStop(0, `rgba(80,160,255,${0.7 + pulse * 0.25})`);
                wGrad.addColorStop(0.4, `rgba(40,100,220,${0.5 + pulse * 0.2})`);
                wGrad.addColorStop(1, 'rgba(20,60,160,0.8)');
                ctx.fillStyle = wGrad;
                ctx.shadowBlur = 6;
                ctx.shadowColor = 'rgba(80,160,255,0.7)';
            } else {
                ctx.fillStyle = '#030a18';
                ctx.shadowBlur = 0;
            }
            ctx.fillRect(wx, wy, 30, 40);
            ctx.shadowBlur = 0;

            // Griglia finestra
            ctx.strokeStyle = 'rgba(20,60,140,0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(wx + 15, wy); ctx.lineTo(wx + 15, wy + 40);
            ctx.moveTo(wx, wy + 20); ctx.lineTo(wx + 30, wy + 20);
            ctx.stroke();

            // Cornice bordo
            ctx.strokeStyle = '#0d2050';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(wx, wy, 30, 40);
        }
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

    drawBarrier(ctx) {
        // Transenna da cantiere gialla e nera
        const bx = this.x;
        const by = this.y;
        const bw = this.width;
        const bh = this.height;
        
        // Ombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(bx + bw/2, by + bh + 4, bw/2 + 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Gambe della transenna (cavalletto a X)
        ctx.strokeStyle = '#806818';
        ctx.lineWidth = 4;
        // Gamba sinistra
        ctx.beginPath();
        ctx.moveTo(bx + 8, by + 6);
        ctx.lineTo(bx - 4, by + bh + 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx + 8, by + 6);
        ctx.lineTo(bx + 20, by + bh + 5);
        ctx.stroke();
        // Gamba destra
        ctx.beginPath();
        ctx.moveTo(bx + bw - 8, by + 6);
        ctx.lineTo(bx + bw + 4, by + bh + 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx + bw - 8, by + 6);
        ctx.lineTo(bx + bw - 20, by + bh + 5);
        ctx.stroke();
        
        // Barra orizzontale principale (la parte con strisce gialle/nere)
        const barH = 14;
        const barY = by;
        
        // Sfondo barra
        ctx.fillStyle = '#ccaa20';
        ctx.beginPath();
        ctx.roundRect(bx, barY, bw, barH, 2);
        ctx.fill();
        
        // Strisce diagonali nere
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(bx, barY, bw, barH, 2);
        ctx.clip();
        
        const stripeW = 12;
        ctx.fillStyle = '#111111';
        for (let sx = bx - barH; sx < bx + bw + barH; sx += stripeW * 2) {
            ctx.beginPath();
            ctx.moveTo(sx, barY);
            ctx.lineTo(sx + stripeW, barY);
            ctx.lineTo(sx + stripeW + barH, barY + barH);
            ctx.lineTo(sx + barH, barY + barH);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
        
        // Bordo metallico
        ctx.strokeStyle = '#aa8818';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(bx, barY, bw, barH, 2);
        ctx.stroke();
        
        // Highlight superiore
        ctx.strokeStyle = 'rgba(255, 220, 80, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx + 3, barY + 1);
        ctx.lineTo(bx + bw - 3, barY + 1);
        ctx.stroke();
        
        // Barra inferiore di rinforzo (più sottile)
        const bar2Y = by + bh - 6;
        const bar2H = 6;
        ctx.fillStyle = '#ccaa20';
        ctx.fillRect(bx + 10, bar2Y, bw - 20, bar2H);
        
        ctx.save();
        ctx.beginPath();
        ctx.rect(bx + 10, bar2Y, bw - 20, bar2H);
        ctx.clip();
        ctx.fillStyle = '#111111';
        for (let sx = bx - bar2H; sx < bx + bw + bar2H; sx += stripeW * 2) {
            ctx.beginPath();
            ctx.moveTo(sx, bar2Y);
            ctx.lineTo(sx + stripeW, bar2Y);
            ctx.lineTo(sx + stripeW + bar2H, bar2Y + bar2H);
            ctx.lineTo(sx + bar2H, bar2Y + bar2H);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
        
        // Catarifrangenti arancioni sui lati
        ctx.fillStyle = '#dd6600';
        ctx.beginPath();
        ctx.arc(bx + 5, barY + barH/2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx + bw - 5, barY + barH/2, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Riflesso catarifrangenti
        ctx.fillStyle = 'rgba(255, 150, 30, 0.3)';
        ctx.beginPath();
        ctx.arc(bx + 5, barY + barH/2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx + bw - 5, barY + barH/2, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    drawSteamVent(ctx) {
        // Comignolo arancione stile NYC (steam stack)
        const cx = this.x + this.width / 2;
        const by = this.y;
        const bh = this.height;
        const bw = this.width;
        
        // Ombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(cx, by + bh + 3, bw / 2 + 4, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Corpo conico — più largo in basso, stretto in alto
        const topW = bw * 0.45;
        const botW = bw;
        
        // Gradiente arancione
        const bodyGrad = ctx.createLinearGradient(cx - botW/2, by, cx + botW/2, by);
        bodyGrad.addColorStop(0, '#aa3800');
        bodyGrad.addColorStop(0.3, '#dd5500');
        bodyGrad.addColorStop(0.6, '#cc4a00');
        bodyGrad.addColorStop(1, '#993000');
        ctx.fillStyle = bodyGrad;
        
        ctx.beginPath();
        ctx.moveTo(cx - topW/2, by);
        ctx.lineTo(cx + topW/2, by);
        ctx.lineTo(cx + botW/2, by + bh);
        ctx.lineTo(cx - botW/2, by + bh);
        ctx.closePath();
        ctx.fill();
        
        // Bordo
        ctx.strokeStyle = '#882800';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Strisce bianche orizzontali (tipiche NYC)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        const stripes = 3;
        for (let i = 0; i < stripes; i++) {
            const sy = by + 8 + i * (bh / (stripes + 1));
            const t = (sy - by) / bh;  // 0..1 top to bottom
            const sw = topW + (botW - topW) * t;
            ctx.fillRect(cx - sw/2 + 2, sy, sw - 4, 4);
        }
        
        // Anello metallico in cima
        ctx.fillStyle = '#888888';
        ctx.fillRect(cx - topW/2 - 3, by - 3, topW + 6, 6);
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - topW/2 - 3, by - 3, topW + 6, 6);
        
        // Highlight
        ctx.fillStyle = 'rgba(255, 200, 150, 0.15)';
        ctx.beginPath();
        ctx.moveTo(cx - topW/2 + 3, by + 2);
        ctx.lineTo(cx - 2, by + 2);
        ctx.lineTo(cx - botW/4, by + bh - 3);
        ctx.lineTo(cx - botW/2 + 5, by + bh - 3);
        ctx.closePath();
        ctx.fill();
        
        // Base rinforzata
        ctx.fillStyle = '#882800';
        ctx.fillRect(cx - botW/2 - 2, by + bh - 5, botW + 4, 6);
    }

    // --- Pozza d'acqua (Livello 4 - La Fuga) ---
    drawPuddle(ctx) {
        const px = this.x;
        const py = this.y;
        const pw = this.width;
        const ph = this.height;

        // Forma ovale della pozza
        ctx.save();

        // Acqua scura con riflessi
        const waterGrad = ctx.createRadialGradient(
            px + pw / 2, py + ph / 2, 0,
            px + pw / 2, py + ph / 2, pw / 2
        );
        waterGrad.addColorStop(0, 'rgba(30, 40, 60, 0.7)');
        waterGrad.addColorStop(0.6, 'rgba(20, 30, 50, 0.5)');
        waterGrad.addColorStop(1, 'rgba(15, 20, 35, 0.3)');
        ctx.fillStyle = waterGrad;
        ctx.beginPath();
        ctx.ellipse(px + pw / 2, py + ph / 2, pw / 2, ph / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Riflesso luce (lampione riflesso nell'acqua)
        const refX = px + pw * 0.35 + Math.sin(CONFIG.time * 0.04) * 3;
        const refY = py + ph * 0.3;
        const refGrad = ctx.createRadialGradient(refX, refY, 0, refX, refY, pw * 0.25);
        refGrad.addColorStop(0, 'rgba(180, 160, 120, 0.15)');
        refGrad.addColorStop(0.5, 'rgba(140, 120, 80, 0.06)');
        refGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = refGrad;
        ctx.beginPath();
        ctx.ellipse(refX, refY, pw * 0.25, ph * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Increspature concentriche (animazione)
        ctx.strokeStyle = 'rgba(120, 140, 180, 0.12)';
        ctx.lineWidth = 1;
        const ripplePhase = CONFIG.time * 0.05;
        for (let r = 0; r < 3; r++) {
            const rr = ((ripplePhase + r * 0.8) % 2.4) / 2.4;  // 0..1 ciclo
            const rippleR = rr * pw * 0.4;
            const rippleA = (1 - rr) * 0.15;
            if (rippleA > 0.01) {
                ctx.strokeStyle = `rgba(120, 140, 180, ${rippleA})`;
                ctx.beginPath();
                ctx.ellipse(px + pw / 2, py + ph / 2, rippleR, rippleR * 0.4, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Bordo più scuro
        ctx.strokeStyle = 'rgba(10, 15, 25, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(px + pw / 2, py + ph / 2, pw / 2, ph / 2, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    // --- Neve sui tetti e a terra (Livello 3) ---
    drawSnowLayer(ctx, x, y, width, height) {
        // Strato di neve irregolare in cima
        ctx.fillStyle = '#d8dde8';
        ctx.beginPath();
        ctx.moveTo(x - 2, y + height);
        ctx.lineTo(x - 2, y + 3);
        // Bordo superiore ondulato
        const steps = Math.floor(width / 8);
        for (let i = 0; i <= steps; i++) {
            const sx = x + (i / steps) * width;
            const sy = y + Math.sin(i * 1.3 + x * 0.01) * 2;
            ctx.lineTo(sx, sy);
        }
        ctx.lineTo(x + width + 2, y + 3);
        ctx.lineTo(x + width + 2, y + height);
        ctx.closePath();
        ctx.fill();
        
        // Ombra leggera sotto
        ctx.fillStyle = 'rgba(150, 160, 180, 0.3)';
        ctx.fillRect(x, y + height - 2, width, 2);
        
        // Riflesso luce in cima
        ctx.fillStyle = 'rgba(240, 245, 255, 0.5)';
        for (let i = 0; i < steps; i += 2) {
            const sx = x + (i / steps) * width;
            ctx.fillRect(sx, y + 1, 6, 1);
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
        
        // Neve a terra (Livello 3 - Inverno)
        if (CONFIG.level === 3) {
            this.drawSnowLayer(ctx, this.x, this.y - 3, this.width, 8);
            // Cumuli di neve qua e là
            ctx.fillStyle = '#ccd2e0';
            for (let i = 80; i < this.width; i += 200 + Math.sin(i) * 50) {
                const moundW = 30 + Math.sin(i * 0.5) * 15;
                const moundH = 6 + Math.sin(i * 0.3) * 3;
                ctx.beginPath();
                ctx.ellipse(this.x + i, this.y - 1, moundW, moundH, 0, Math.PI, 0);
                ctx.fill();
            }
        }

        // Bagnato a terra (Livello 4 - La Fuga)
        if (CONFIG.level === 4) {
            // Sheen lucido sull'asfalto bagnato
            ctx.fillStyle = 'rgba(80, 100, 140, 0.06)';
            ctx.fillRect(this.x, this.y, this.width, 12);
            
            // Riflessi intermittenti (effetto bagnato)
            for (let i = 30; i < this.width; i += 60 + Math.sin(i * 0.2) * 30) {
                const rw = 20 + Math.sin(i * 0.5) * 10;
                const shimmer = Math.sin(CONFIG.time * 0.03 + i * 0.1) * 0.04 + 0.04;
                ctx.fillStyle = `rgba(120, 140, 180, ${shimmer})`;
                ctx.beginPath();
                ctx.ellipse(this.x + i, this.y + 3, rw, 2, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}
