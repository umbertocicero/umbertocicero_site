// ============================================
// LAMP - Lampioni stradali
// ============================================

class Lamp {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.flicker = 0;
        this.flickerAlpha = 0;
        this.intensity = 0.55 + Math.random() * 0.15;
        // Subtle halo pulse offset per lamp
        this._phase = Math.random() * Math.PI * 2;
    }

    update() {
        // Occasional flicker
        if (Math.random() < 0.005) {
            this.flicker = 3 + Math.floor(Math.random() * 6);
        }
        if (this.flicker > 0) {
            this.flicker--;
            this.flickerAlpha = Math.random() * 0.5;
        } else {
            this.flickerAlpha = 0;
        }
    }

    draw(ctx) {
        const x = this.x;
        const y = this.y;   // top of the lantern head
        const b = this.flicker > 0
            ? this.intensity * (0.3 + this.flickerAlpha)
            : this.intensity;

        // ── Coordinate helpers ──
        // The lamp occupies roughly y to y+120:
        //   y+0   → top of lantern finial
        //   y+8   → lantern cap rim
        //   y+30  → bottom of lantern body / top of arm
        //   y+30→y+90 → pole (tapered)
        //   y+90→y+108 → decorative base pedestal
        //   y+108 → ground level

        ctx.save();

        // ════════════════════════════════════
        // 1.  LIGHT CONE  (drawn first, behind structure)
        // ════════════════════════════════════
        const coneY    = y + 22;           // cone apex just below lantern
        const coneH    = 200;
        const coneTopW = 18;
        const coneBotW = 160;

        // Soft cone — clip to trapezoid, fill with vertical gradient
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x - coneTopW, coneY);
        ctx.lineTo(x + coneTopW, coneY);
        ctx.lineTo(x + coneBotW, coneY + coneH);
        ctx.lineTo(x - coneBotW, coneY + coneH);
        ctx.closePath();
        ctx.clip();

        const coneGrad = ctx.createLinearGradient(x, coneY, x, coneY + coneH);
        coneGrad.addColorStop(0,    `rgba(240,200,120,${b * 0.65})`);
        coneGrad.addColorStop(0.12, `rgba(220,175, 95,${b * 0.42})`);
        coneGrad.addColorStop(0.35, `rgba(195,155, 75,${b * 0.18})`);
        coneGrad.addColorStop(0.65, `rgba(170,130, 60,${b * 0.07})`);
        coneGrad.addColorStop(1,    'transparent');
        ctx.fillStyle = coneGrad;
        ctx.fillRect(x - coneBotW, coneY, coneBotW * 2, coneH);
        ctx.restore();

        // Ground pool
        const poolY = coneY + coneH - 15;
        const poolGrad = ctx.createRadialGradient(x, poolY, 0, x, poolY, coneBotW + 10);
        poolGrad.addColorStop(0,   `rgba(215,175,100,${b * 0.28})`);
        poolGrad.addColorStop(0.4, `rgba(190,150, 80,${b * 0.13})`);
        poolGrad.addColorStop(0.75,`rgba(160,120, 55,${b * 0.05})`);
        poolGrad.addColorStop(1,   'transparent');
        ctx.fillStyle = poolGrad;
        ctx.beginPath();
        ctx.ellipse(x, poolY, coneBotW + 10, 36, 0, 0, Math.PI * 2);
        ctx.fill();

        // ════════════════════════════════════
        // 2.  POLE  (tapered, cast-iron look)
        // ════════════════════════════════════
        // Pole tapers from w=9 at top (y+30) to w=7 at bottom (y+90)
        const poleTopY = y + 32;
        const poleBotY = y + 92;
        const poleTopHW = 4.5;
        const poleBotHW = 3.5;

        // Shadow ellipse on ground
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(x + 4, poleBotY + 16, 10, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pole body
        const poleGrad = ctx.createLinearGradient(x - poleTopHW - 2, 0, x + poleTopHW + 2, 0);
        poleGrad.addColorStop(0,    '#080808');
        poleGrad.addColorStop(0.18, '#1a1a1a');
        poleGrad.addColorStop(0.45, '#2e2e2e');
        poleGrad.addColorStop(0.72, '#1c1c1c');
        poleGrad.addColorStop(1,    '#060606');
        ctx.fillStyle = poleGrad;
        ctx.beginPath();
        ctx.moveTo(x - poleTopHW, poleTopY);
        ctx.lineTo(x + poleTopHW, poleTopY);
        ctx.lineTo(x + poleBotHW, poleBotY);
        ctx.lineTo(x - poleBotHW, poleBotY);
        ctx.closePath();
        ctx.fill();

        // Highlight streak on pole
        ctx.fillStyle = 'rgba(80,70,55,0.18)';
        ctx.beginPath();
        ctx.moveTo(x + 1, poleTopY + 4);
        ctx.lineTo(x + 2.5, poleTopY + 4);
        ctx.lineTo(x + 2.0, poleBotY - 4);
        ctx.lineTo(x + 0.5, poleBotY - 4);
        ctx.closePath();
        ctx.fill();

        // Decorative rings on pole
        for (const ry of [poleTopY + 10, poleTopY + 30, poleTopY + 50]) {
            const frac = (ry - poleTopY) / (poleBotY - poleTopY);
            const hw = poleTopHW + (poleBotHW - poleTopHW) * frac + 2;
            ctx.fillStyle = '#111';
            ctx.fillRect(x - hw, ry, hw * 2, 3);
            ctx.fillStyle = '#2a2a2a';
            ctx.fillRect(x - hw, ry, hw * 2, 1);
        }

        // ════════════════════════════════════
        // 3.  BASE PEDESTAL
        // ════════════════════════════════════
        const baseGrad = ctx.createLinearGradient(x - 16, 0, x + 16, 0);
        baseGrad.addColorStop(0,    '#080808');
        baseGrad.addColorStop(0.25, '#202020');
        baseGrad.addColorStop(0.5,  '#2a2a2a');
        baseGrad.addColorStop(0.75, '#181818');
        baseGrad.addColorStop(1,    '#060606');
        ctx.fillStyle = baseGrad;

        // Three stacked tiers
        ctx.beginPath(); ctx.roundRect(x - 6,  poleBotY,      12, 5, 1); ctx.fill();
        ctx.beginPath(); ctx.roundRect(x - 10, poleBotY + 5,  20, 5, 1); ctx.fill();
        ctx.beginPath(); ctx.roundRect(x - 14, poleBotY + 10, 28, 6, 2); ctx.fill();

        // Top highlight on each tier
        ctx.fillStyle = 'rgba(60,55,45,0.5)';
        ctx.fillRect(x - 6,  poleBotY,     12, 1);
        ctx.fillRect(x - 10, poleBotY + 5, 20, 1);
        ctx.fillRect(x - 14, poleBotY + 10, 28, 1);

        // ════════════════════════════════════
        // 4.  LANTERN HEAD
        // ════════════════════════════════════
        // Layout (all relative to y):
        //   y-14  → finial tip
        //   y-6   → finial base / roof tip
        //   y+0   → roof peak
        //   y+8   → roof rim (brim)
        //   y+10  → top of glass cage
        //   y+28  → bottom of glass cage
        //   y+30  → hanging chain / bottom cap

        const lx = x;

        // ── Ambient halo around lantern (behind everything) ──
        if (b > 0.1) {
            const haloR = 38;
            const halo = ctx.createRadialGradient(lx, y + 18, 2, lx, y + 18, haloR);
            halo.addColorStop(0,   `rgba(255,220,140,${b * 0.38})`);
            halo.addColorStop(0.4, `rgba(230,185,100,${b * 0.15})`);
            halo.addColorStop(1,   'transparent');
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(lx, y + 18, haloR, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ── Glass / lamp interior ──
        const glassTop    = y + 10;
        const glassBot    = y + 28;
        const glassHW     = 14;

        if (this.flicker > 0) {
            ctx.fillStyle = `rgba(180,120,50,${0.15 + this.flickerAlpha * 0.3})`;
        } else {
            const glassGrad = ctx.createRadialGradient(lx, y + 18, 1, lx, y + 18, glassHW + 6);
            glassGrad.addColorStop(0,   `rgba(255,235,180,${Math.min(1, b * 1.3)})`);
            glassGrad.addColorStop(0.35,`rgba(240,200,130,${b * 0.85})`);
            glassGrad.addColorStop(0.75,`rgba(210,165, 90,${b * 0.45})`);
            glassGrad.addColorStop(1,   `rgba(180,130, 60,${b * 0.15})`);
            ctx.fillStyle = glassGrad;
        }
        // Octagonal glass panes (approximated as rounded rect)
        ctx.beginPath();
        ctx.roundRect(lx - glassHW, glassTop, glassHW * 2, glassBot - glassTop, 3);
        ctx.fill();

        // ── Cage frame (iron bars) ──
        const frameColor = '#111';
        ctx.strokeStyle = frameColor;
        ctx.lineWidth = 1.5;

        // Vertical side bars
        for (const fx of [-glassHW, -5, 0, 5, glassHW]) {
            ctx.beginPath();
            ctx.moveTo(lx + fx, glassTop);
            ctx.lineTo(lx + fx, glassBot);
            ctx.stroke();
        }
        // Horizontal mid bar
        ctx.beginPath();
        ctx.moveTo(lx - glassHW - 1, y + 19);
        ctx.lineTo(lx + glassHW + 1, y + 19);
        ctx.stroke();

        // ── Bottom cap ──
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.roundRect(lx - glassHW - 2, glassBot, (glassHW + 2) * 2, 4, 1);
        ctx.fill();
        ctx.fillStyle = '#2c2c2c';
        ctx.fillRect(lx - glassHW - 2, glassBot, (glassHW + 2) * 2, 1);

        // Hanging point / small stub
        ctx.fillStyle = '#141414';
        ctx.beginPath();
        ctx.moveTo(lx - 4, glassBot + 4);
        ctx.lineTo(lx + 4, glassBot + 4);
        ctx.lineTo(lx + 2, glassBot + 10);
        ctx.lineTo(lx - 2, glassBot + 10);
        ctx.closePath();
        ctx.fill();

        // ── Top cap / collar ──
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.roundRect(lx - glassHW - 2, glassTop - 4, (glassHW + 2) * 2, 4, 1);
        ctx.fill();
        ctx.fillStyle = '#2c2c2c';
        ctx.fillRect(lx - glassHW - 2, glassTop - 4, (glassHW + 2) * 2, 1);

        // ── Roof (pagoda-style, two tiers) ──
        const roofRimY = y + 8;
        const roofMidY = y + 1;
        const roofTipY = y - 6;

        // Outer roof brim
        const roofGrad = ctx.createLinearGradient(lx - 22, roofRimY, lx + 22, roofRimY);
        roofGrad.addColorStop(0,    '#0a0a0a');
        roofGrad.addColorStop(0.2,  '#1e1e1e');
        roofGrad.addColorStop(0.5,  '#2a2a2a');
        roofGrad.addColorStop(0.8,  '#1a1a1a');
        roofGrad.addColorStop(1,    '#080808');
        ctx.fillStyle = roofGrad;

        // Lower tier brim (wide, slight curve)
        ctx.beginPath();
        ctx.moveTo(lx - 21, roofRimY + 1);
        ctx.quadraticCurveTo(lx, roofRimY - 2, lx + 21, roofRimY + 1);
        ctx.lineTo(lx + 18, roofMidY + 4);
        ctx.lineTo(lx - 18, roofMidY + 4);
        ctx.closePath();
        ctx.fill();

        // Upper tier
        ctx.fillStyle = roofGrad;
        ctx.beginPath();
        ctx.moveTo(lx - 16, roofMidY + 4);
        ctx.quadraticCurveTo(lx, roofMidY, lx + 16, roofMidY + 4);
        ctx.lineTo(lx + 10, roofTipY);
        ctx.lineTo(lx - 10, roofTipY);
        ctx.closePath();
        ctx.fill();

        // Roof edge highlight
        ctx.strokeStyle = 'rgba(55,50,40,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lx - 21, roofRimY + 1);
        ctx.quadraticCurveTo(lx, roofRimY - 2, lx + 21, roofRimY + 1);
        ctx.stroke();

        // ── Finial (decorative spike on top) ──
        const finialBaseY = roofTipY;
        const finialTipY  = y - 16;

        // Finial body — slender hexagonal shape
        const finGrad = ctx.createLinearGradient(lx - 3, 0, lx + 3, 0);
        finGrad.addColorStop(0,   '#0a0a0a');
        finGrad.addColorStop(0.4, '#252525');
        finGrad.addColorStop(1,   '#080808');
        ctx.fillStyle = finGrad;
        ctx.beginPath();
        ctx.moveTo(lx - 3,   finialBaseY);
        ctx.lineTo(lx + 3,   finialBaseY);
        ctx.lineTo(lx + 2,   finialBaseY - 5);
        ctx.lineTo(lx + 1.5, finialBaseY - 8);
        ctx.lineTo(lx,       finialTipY);
        ctx.lineTo(lx - 1.5, finialBaseY - 8);
        ctx.lineTo(lx - 2,   finialBaseY - 5);
        ctx.closePath();
        ctx.fill();

        // Small orb at finial base
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(lx, finialBaseY - 2, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(80,70,55,0.4)';
        ctx.beginPath();
        ctx.arc(lx - 0.8, finialBaseY - 3, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // ── Glass reflection (always visible, subtle) ──
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.beginPath();
        ctx.roundRect(lx - glassHW + 2, glassTop + 2, 4, (glassBot - glassTop) * 0.55, 2);
        ctx.fill();

        ctx.restore();
    }
}
        
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

