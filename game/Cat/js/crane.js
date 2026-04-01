// ============================================
// CRANE - Gru da cantiere (Livello 2)
// Braccio = piattaforma solida camminabile
// Cavo + gancio = Verlet physics (gravità reale)
// ============================================

// --- Verlet particle for the cable ---
class CableParticle {
    constructor(x, y, pinned) {
        this.x = x;
        this.y = y;
        this.ox = x;   // old x (Verlet integration)
        this.oy = y;
        this.pinned = !!pinned;
    }
}

class Crane {
    constructor(x, baseY, height) {
        this.x = x;
        this.baseY = baseY;
        this.towerHeight = height;
        this.armLength = 180;
        this.armAngle = 0;
        this.armSpeed = 0.003 + Math.random() * 0.003;
        this.armDirection = Math.random() > 0.5 ? 1 : -1;
        this.armMinAngle = -0.6;
        this.armMaxAngle = 0.6;

        // Luce lampeggiante
        this.lightTimer = 0;
        this.lightOn = true;

        // Coordinate derivate
        this.topY = this.baseY - this.towerHeight;
        this.cabinH = 16;
        this.pivotY = this.topY - this.cabinH;   // centro rotazione braccio

        // --- Piattaforma mobile del braccio ---
        // One-way, come le fire-escape: il gatto ci cammina sopra.
        this.armPlatform = {
            x: 0, y: 0, width: this.armLength, height: 10,
            type: 'crane-arm',
            isOneWay: true,
            roofOnly: false,
            // stub — il colore non serve, viene disegnato dalla gru
            draw: function () {}
        };

        // --- Verlet cable (filo con gravità) ---
        this.cableSegments = 12;
        this.cableRestLen = 10;          // rest length per segment
        this.cableParticles = [];
        this.cableGravity = 0.35;
        this.cableFriction = 0.98;
        this.cableConstraintIter = 6;

        // Crea particelle iniziali (posizione vera calcolata nel primo update)
        const anchorX = this.x + Math.cos(this.armAngle) * this.armLength * 0.75;
        const anchorY = this.pivotY + Math.sin(this.armAngle) * this.armLength * 0.75;
        for (let i = 0; i <= this.cableSegments; i++) {
            this.cableParticles.push(
                new CableParticle(anchorX, anchorY + i * this.cableRestLen, i === 0)
            );
        }

        // Cache: world-space position of arm tip (hookpoint)
        this._hookAnchorX = anchorX;
        this._hookAnchorY = anchorY;
    }

    // --- Restituisci la piattaforma da aggiungere al gioco ---
    getPlatform() {
        return this.armPlatform;
    }

    // ----------------------------------------------------------
    // UPDATE
    // ----------------------------------------------------------
    update() {
        // 1) Rotazione braccio
        this.armAngle += this.armSpeed * this.armDirection;
        if (this.armAngle > this.armMaxAngle) this.armDirection = -1;
        else if (this.armAngle < this.armMinAngle) this.armDirection = 1;

        // 2) Aggiorna posizione piattaforma del braccio (world coords)
        const cos = Math.cos(this.armAngle);
        const sin = Math.sin(this.armAngle);
        // La piattaforma copre la parte superiore del braccio
        const armStartX = this.x;
        const armEndX   = this.x + cos * this.armLength;
        const armStartY = this.pivotY;
        const armEndY   = this.pivotY + sin * this.armLength;

        const pLeft  = Math.min(armStartX, armEndX);
        const pRight = Math.max(armStartX, armEndX);
        // La superficie "camminabile" è la quota più alta lungo il braccio
        const pTop   = Math.min(armStartY, armEndY) - 6;

        this.armPlatform.x = pLeft;
        this.armPlatform.y = pTop;
        this.armPlatform.width  = pRight - pLeft;
        this.armPlatform.height = 10;

        // 3) Punto di ancoraggio del cavo (75% del braccio)
        this._hookAnchorX = this.x + cos * this.armLength * 0.75;
        this._hookAnchorY = this.pivotY + sin * this.armLength * 0.75 + 8;

        // Pin la prima particella al punto d'ancoraggio
        const p0 = this.cableParticles[0];
        p0.x = this._hookAnchorX;
        p0.y = this._hookAnchorY;
        p0.ox = p0.x;
        p0.oy = p0.y;

        // 4) Verlet integration — gravità e inerzia
        for (let i = 1; i < this.cableParticles.length; i++) {
            const p = this.cableParticles[i];
            const vx = (p.x - p.ox) * this.cableFriction;
            const vy = (p.y - p.oy) * this.cableFriction;
            p.ox = p.x;
            p.oy = p.y;
            p.x += vx;
            p.y += vy + this.cableGravity;
        }

        // 5) Distance constraints (mantieni lunghezza segmenti)
        for (let iter = 0; iter < this.cableConstraintIter; iter++) {
            for (let i = 0; i < this.cableParticles.length - 1; i++) {
                const a = this.cableParticles[i];
                const b = this.cableParticles[i + 1];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 0.0001) continue;
                const diff = (this.cableRestLen - dist) / dist * 0.5;
                const ox = dx * diff;
                const oy = dy * diff;
                if (!a.pinned) { a.x -= ox; a.y -= oy; }
                if (!b.pinned) { b.x += ox; b.y += oy; }
            }
        }

        // 6) Luce lampeggiante
        this.lightTimer++;
        if (this.lightTimer > 40) {
            this.lightTimer = 0;
            this.lightOn = !this.lightOn;
        }
    }

    // ----------------------------------------------------------
    // DRAW
    // ----------------------------------------------------------
    draw(ctx) {
        ctx.save();

        const baseW = 60;
        const baseH = 20;
        const cabinH = this.cabinH;

        // === BASE ===
        const baseGrad = ctx.createLinearGradient(this.x - baseW/2, this.baseY - baseH, this.x + baseW/2, this.baseY);
        baseGrad.addColorStop(0, '#2a2a2a');
        baseGrad.addColorStop(0.5, '#333333');
        baseGrad.addColorStop(1, '#222222');
        ctx.fillStyle = baseGrad;
        ctx.fillRect(this.x - baseW/2, this.baseY - baseH, baseW, baseH);
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x - baseW/2, this.baseY - baseH, baseW, baseH);

        // === TORRE (traliccio) ===
        const towerW = 18;
        const towerLeft  = this.x - towerW/2;
        const towerRight = this.x + towerW/2;

        ctx.strokeStyle = '#c0a030';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(towerLeft,  this.baseY - baseH); ctx.lineTo(towerLeft,  this.topY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(towerRight, this.baseY - baseH); ctx.lineTo(towerRight, this.topY); ctx.stroke();

        ctx.strokeStyle = '#a08828';
        ctx.lineWidth = 2;
        const sectionH = 30;
        for (let sy = this.baseY - baseH; sy > this.topY; sy -= sectionH) {
            ctx.beginPath(); ctx.moveTo(towerLeft, sy); ctx.lineTo(towerRight, sy); ctx.stroke();
        }

        ctx.strokeStyle = '#907820';
        ctx.lineWidth = 1.5;
        for (let sy = this.baseY - baseH; sy > this.topY + sectionH; sy -= sectionH) {
            ctx.beginPath(); ctx.moveTo(towerLeft, sy);  ctx.lineTo(towerRight, sy - sectionH); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(towerRight, sy); ctx.lineTo(towerLeft,  sy - sectionH); ctx.stroke();
        }

        // === CABINA ===
        const cabinW = 24;
        ctx.fillStyle = '#b09020';
        ctx.fillRect(this.x - cabinW/2, this.topY - cabinH, cabinW, cabinH);
        ctx.strokeStyle = '#806818';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x - cabinW/2, this.topY - cabinH, cabinW, cabinH);
        ctx.fillStyle = 'rgba(120, 180, 220, 0.3)';
        ctx.fillRect(this.x - 8, this.topY - cabinH + 3, 16, 8);
        ctx.strokeStyle = '#606060';
        ctx.strokeRect(this.x - 8, this.topY - cabinH + 3, 16, 8);

        // === BRACCIO (disegnato in world-space rotato) ===
        ctx.save();
        ctx.translate(this.x, this.pivotY);
        ctx.rotate(this.armAngle);

        const armH = 8;
        const armSections = 8;
        const counterLen = 50;

        // Traliccio braccio principale
        ctx.strokeStyle = '#c0a030'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, -armH); ctx.lineTo(this.armLength, -armH + 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, armH);  ctx.lineTo(this.armLength, armH - 4);  ctx.stroke();

        // Traverse
        ctx.strokeStyle = '#a08828'; ctx.lineWidth = 1.5;
        for (let i = 0; i <= armSections; i++) {
            const ax = (i / armSections) * this.armLength;
            const top = -armH + (4 * i / armSections);
            const bot = armH  - (4 * i / armSections);
            ctx.beginPath(); ctx.moveTo(ax, top); ctx.lineTo(ax, bot); ctx.stroke();
        }

        // Diagonali
        ctx.strokeStyle = '#907820'; ctx.lineWidth = 1;
        for (let i = 0; i < armSections; i++) {
            const ax1 = (i / armSections) * this.armLength;
            const ax2 = ((i+1) / armSections) * this.armLength;
            const top1 = -armH + (4 * i / armSections);
            const bot2 = armH  - (4 * (i+1) / armSections);
            ctx.beginPath(); ctx.moveTo(ax1, top1); ctx.lineTo(ax2, bot2); ctx.stroke();
        }

        // Superficie camminabile — bordo metallico sopra il braccio
        ctx.fillStyle = '#a89030';
        ctx.fillRect(0, -armH - 4, this.armLength, 5);
        ctx.strokeStyle = '#c0a838';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -armH - 4);
        ctx.lineTo(this.armLength, -armH);
        ctx.stroke();

        // Contrappeso
        ctx.strokeStyle = '#c0a030'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, -armH); ctx.lineTo(-counterLen, -armH + 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, armH);  ctx.lineTo(-counterLen, armH - 2);  ctx.stroke();
        ctx.fillStyle = '#333333';
        ctx.fillRect(-counterLen - 8, -12, 20, 24);
        ctx.strokeStyle = '#222222';
        ctx.strokeRect(-counterLen - 8, -12, 20, 24);

        // Cavi di tenuta
        ctx.strokeStyle = '#555555'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(this.armLength * 0.7, -armH + 3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-counterLen + 5, -armH + 2);      ctx.stroke();

        ctx.restore(); // fine braccio rotante

        // === CAVO VERLET (world space) ===
        this.drawCable(ctx);

        // === LUCE LAMPEGGIANTE ===
        const lightY = this.topY - cabinH - 5;
        if (this.lightOn) {
            const lg = ctx.createRadialGradient(this.x, lightY, 0, this.x, lightY, 25);
            lg.addColorStop(0, 'rgba(255, 40, 20, 0.6)');
            lg.addColorStop(0.3, 'rgba(255, 30, 10, 0.25)');
            lg.addColorStop(1, 'transparent');
            ctx.fillStyle = lg;
            ctx.beginPath(); ctx.arc(this.x, lightY, 25, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ff3020';
        } else {
            ctx.fillStyle = '#441010';
        }
        ctx.beginPath(); ctx.arc(this.x, lightY, 4, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = '#555555'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(this.x, this.topY - cabinH); ctx.lineTo(this.x, lightY); ctx.stroke();

        ctx.restore();
    }

    // --- Draw the Verlet cable + hook ---
    drawCable(ctx) {
        const pts = this.cableParticles;

        // Cavo
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();

        // Highlight
        ctx.strokeStyle = 'rgba(140,140,140,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pts[0].x + 1, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x + 1, pts[i].y);
        }
        ctx.stroke();

        // Gancio all'estremità
        const tip = pts[pts.length - 1];
        const hx = tip.x;
        const hy = tip.y;

        // Blocchetto
        ctx.fillStyle = '#555555';
        ctx.fillRect(hx - 5, hy - 5, 10, 10);
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = 1;
        ctx.strokeRect(hx - 5, hy - 5, 10, 10);

        // Uncino
        ctx.strokeStyle = '#777777';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(hx, hy + 10, 9, -0.2, Math.PI + 0.2);
        ctx.stroke();

        // Punta
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(hx - 9, hy + 10);
        ctx.lineTo(hx - 7, hy + 3);
        ctx.stroke();
    }
}
