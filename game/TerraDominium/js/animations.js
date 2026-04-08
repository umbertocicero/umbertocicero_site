/* ═══════════════════════════════════════════════════════
   TerraDominium — Animations  (Canvas overlay FX)
   Trail traces store territory codes and recompute screen
   positions each frame → correct after zoom/pan.
   ═══════════════════════════════════════════════════════ */

const Animations = (() => {
    let particles  = [];
    let missiles   = [];
    let explosions = [];
    let textPopups = [];
    let trails     = [];   // persistent TrailTrace objects (survive full turn)
    let running    = false;
    let speedMult  = 1;    // 1 = normal, 1.8 = spectator (faster missiles)
    const MAX_TRAILS = 15; // cap visible trails to avoid visual clutter

    /* ── helper: compute arc point at parameter t ── */
    function arcPoint(from, to, t) {
        const x = from.x + (to.x - from.x) * t;
        const dist = Math.hypot(to.x - from.x, to.y - from.y);
        const arcH = dist * 0.3;
        const arcY = -4 * arcH * t * (t - 1);
        const y = from.y + (to.y - from.y) * t - arcY;
        return { x, y };
    }

    /* ════════════════ PARTICLE ════════════════ */
    class Particle {
        constructor(x, y, color, vx, vy, life) {
            this.x = x; this.y = y; this.color = color;
            this.vx = vx; this.vy = vy;
            this.life = life; this.maxLife = life;
            this.size = 2 + Math.random() * 3;
        }
        update() { this.x += this.vx; this.y += this.vy; this.vy += 0.05; this.life--; }
        draw(ctx) {
            const a = this.life / this.maxLife;
            ctx.globalAlpha = a; ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.size * a, 0, Math.PI * 2); ctx.fill();
        }
        get dead() { return this.life <= 0; }
    }

    /* ════════════════ TRAIL TRACE (persists full turn, zoom-aware) ════════════════ */
    class TrailTrace {
        /**
         * @param {string} fromCode  – territory code of the attacker homeland
         * @param {string} toCode    – territory code of the target
         * @param {string} color     – missile / attacker colour
         * @param {boolean} success  – was the attack successful?
         * @param {string} label     – e.g. "🇷🇺 Russia ⚔→ 🇫🇮 Finlandia"
         */
        constructor(fromCode, toCode, color, success, label) {
            this.fromCode = fromCode;
            this.toCode   = toCode;
            this.color    = color;
            this.success  = success;
            this.label    = label;
            this.born     = Date.now();
            this.steps    = 50; // arc resolution
        }
        draw(ctx) {
            /* Recompute screen positions each frame → zoom/pan correct */
            const from = MapRenderer.getTerritoryScreenPos(this.fromCode);
            const to   = MapRenderer.getTerritoryScreenPos(this.toCode);
            if (!from || !to) return;

            const age   = (Date.now() - this.born) / 1000;
            const pulse = 0.35 + 0.12 * Math.sin(age * 2);

            /* Build arc points in current screen space */
            const pts = [];
            for (let i = 0; i <= this.steps; i++) {
                pts.push(arcPoint(from, to, i / this.steps));
            }

            /* Outer coloured arc */
            ctx.globalAlpha = pulse * 0.55;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.stroke();

            /* Inner white line */
            ctx.globalAlpha = pulse * 0.7;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.stroke();

            /* Dashed straight guide */
            ctx.globalAlpha = pulse * 0.12;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 4]);
            ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
            ctx.setLineDash([]);

            /* Origin dot + ring */
            ctx.globalAlpha = pulse * 0.7;
            ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(from.x, from.y, 5, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = this.color; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(from.x, from.y, 9, 0, Math.PI * 2); ctx.stroke();

            /* Target marker */
            const mc = this.success ? '#00e676' : '#ff1744';
            ctx.globalAlpha = pulse * 0.7;
            if (this.success) {
                ctx.fillStyle = mc;
                ctx.beginPath(); ctx.arc(to.x, to.y, 6, 0, Math.PI * 2); ctx.fill();
            } else {
                ctx.strokeStyle = mc; ctx.lineWidth = 2;
                const sz = 7;
                ctx.beginPath();
                ctx.moveTo(to.x - sz, to.y); ctx.lineTo(to.x + sz, to.y);
                ctx.moveTo(to.x, to.y - sz); ctx.lineTo(to.x, to.y + sz);
                ctx.stroke();
            }

            /* Result text at target */
            ctx.globalAlpha = pulse;
            ctx.font = 'bold 12px Rajdhani, sans-serif';
            ctx.textAlign = 'center';
            const ico = this.success ? 'OK' : 'FAIL';
            ctx.fillStyle = '#000'; ctx.fillText(ico, to.x + 1, to.y - 11);
            ctx.fillStyle = mc;     ctx.fillText(ico, to.x, to.y - 12);

            /* Midpoint label with background */
            if (this.label) {
                const mx = (from.x + to.x) / 2;
                const my = (from.y + to.y) / 2 - 14;
                ctx.globalAlpha = Math.min(pulse + 0.2, 0.85);
                ctx.font = 'bold 11px Rajdhani, sans-serif';
                ctx.textAlign = 'center';
                const tw = ctx.measureText(this.label).width;
                ctx.fillStyle = 'rgba(0,0,0,0.65)';
                ctx.fillRect(mx - tw / 2 - 4, my - 10, tw + 8, 15);
                ctx.fillStyle = '#ffd740';
                ctx.fillText(this.label, mx, my + 2);
            }
        }
        /* Trails older than 12 seconds start fading, gone at 18s */
        get opacity() {
            const age = (Date.now() - this.born) / 1000;
            if (age < 12) return 1;
            return Math.max(0, 1 - (age - 12) / 6);
        }
        get dead() { return this.opacity <= 0; }
    }

    /* ════════════════ MISSILE ════════════════ */
    class Missile {
        constructor(from, to, color, onImpact, fromCode, toCode, success, label) {
            this.from = from; this.to = to;
            this.color = color; this.onImpact = onImpact;
            this.fromCode = fromCode; this.toCode = toCode;
            this.success = success; this.label = label;
            this.t = 0;
            this.speed = (0.011 + Math.random() * 0.005) * speedMult;
            this.trail = [];
        }
        update() {
            this.t += this.speed;
            const c = Math.min(this.t, 1);
            const pt = arcPoint(this.from, this.to, c);
            this.trail.push(pt);
            if (this.trail.length > 45) this.trail.shift();

            if (this.t >= 1) {
                /* Create persistent zoom-aware trail trace (stores codes, not pixels) */
                trails.push(new TrailTrace(this.fromCode, this.toCode, this.color, this.success, this.label));
                /* Cap visible trails to avoid visual overload */
                while (trails.length > MAX_TRAILS) trails.shift();
                if (this.onImpact) this.onImpact(this.to.x, this.to.y);
            }
        }
        draw(ctx) {
            /* Dashed guide */
            ctx.globalAlpha = 0.15; ctx.strokeStyle = this.color;
            ctx.lineWidth = 1; ctx.setLineDash([6, 4]);
            ctx.beginPath(); ctx.moveTo(this.from.x, this.from.y); ctx.lineTo(this.to.x, this.to.y);
            ctx.stroke(); ctx.setLineDash([]);

            /* Trail glow */
            for (let i = 1; i < this.trail.length; i++) {
                const pct = i / this.trail.length;
                ctx.globalAlpha = pct * 0.85;
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 2 + pct * 4;
                ctx.beginPath();
                ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
                ctx.stroke();
            }

            /* Head */
            if (this.trail.length > 0) {
                const h = this.trail[this.trail.length - 1];
                ctx.globalAlpha = 0.5; ctx.fillStyle = this.color;
                ctx.beginPath(); ctx.arc(h.x, h.y, 9, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1; ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(h.x, h.y, 4, 0, Math.PI * 2); ctx.fill();
            }

            /* Origin ring */
            ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.01) * 0.15;
            ctx.strokeStyle = this.color; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(this.from.x, this.from.y, 10, 0, Math.PI * 2); ctx.stroke();

            /* Target crosshair */
            ctx.globalAlpha = 0.3; ctx.strokeStyle = '#ff1744'; ctx.lineWidth = 1.5;
            const sz = 9;
            ctx.beginPath();
            ctx.moveTo(this.to.x - sz, this.to.y); ctx.lineTo(this.to.x + sz, this.to.y);
            ctx.moveTo(this.to.x, this.to.y - sz); ctx.lineTo(this.to.x, this.to.y + sz);
            ctx.stroke();
        }
        get dead() { return this.t >= 1; }
    }

    /* ════════════════ EXPLOSION ════════════════ */
    class Explosion {
        constructor(x, y, radius, color, isNuke) {
            this.x = x; this.y = y; this.maxR = radius; this.r = 0;
            this.color = color; this.isNuke = isNuke;
            this.life = isNuke ? 90 : 45; this.maxLife = this.life;
        }
        update() { this.r += (this.maxR - this.r) * 0.1; this.life--; }
        draw(ctx) {
            const a = this.life / this.maxLife;
            ctx.globalAlpha = a * 0.6;
            const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
            if (this.isNuke) {
                g.addColorStop(0, 'rgba(255,255,255,0.9)');
                g.addColorStop(0.3, 'rgba(255,200,50,0.7)');
                g.addColorStop(0.6, 'rgba(255,100,0,0.4)');
                g.addColorStop(1, 'rgba(255,0,0,0)');
            } else {
                g.addColorStop(0, this.color); g.addColorStop(1, 'rgba(0,0,0,0)');
            }
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill();
            if (this.isNuke && a > 0.3) {
                ctx.globalAlpha = a * 0.4; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(this.x, this.y, this.r * 1.3, 0, Math.PI * 2); ctx.stroke();
            }
        }
        get dead() { return this.life <= 0; }
    }

    /* ════════════════ TEXT POPUP ════════════════ */
    class TextPopup {
        constructor(x, y, text, color) {
            this.x = x; this.y = y; this.text = text; this.color = color;
            this.life = 60; this.maxLife = 60; this.vy = -1;
        }
        update() { this.y += this.vy; this.vy *= 0.97; this.life--; }
        draw(ctx) {
            const a = this.life / this.maxLife;
            ctx.globalAlpha = a; ctx.font = 'bold 12px Rajdhani, sans-serif'; ctx.textAlign = 'center';
            ctx.fillStyle = '#000'; ctx.fillText(this.text, this.x + 1, this.y + 1);
            ctx.fillStyle = this.color; ctx.fillText(this.text, this.x, this.y);
        }
        get dead() { return this.life <= 0; }
    }

    /* ════════════════ BIG LABEL ════════════════ */
    class BigLabel {
        constructor(x, y, text, color, size = 16, duration = 90) {
            this.x = x; this.y = y; this.text = text; this.color = color;
            this.size = size; this.life = duration; this.maxLife = duration; this.vy = -0.6;
        }
        update() { this.y += this.vy; this.vy *= 0.98; this.life--; }
        draw(ctx) {
            const a = Math.min(1, this.life / (this.maxLife * 0.3));
            ctx.globalAlpha = a;
            ctx.font = `bold ${this.size}px Rajdhani, sans-serif`; ctx.textAlign = 'center';
            ctx.fillStyle = '#000'; ctx.fillText(this.text, this.x + 1, this.y + 1);
            ctx.fillStyle = this.color; ctx.fillText(this.text, this.x, this.y);
        }
        get dead() { return this.life <= 0; }
    }

    /* ════════════════ SPAWN FX ════════════════
       atkInfo / defInfo = { code, name, flag, color }
       Caller must supply these so labels are correct even after conquest.
       ════════════════════════════════════════════ */
    function spawnBattleFX(fromCode, toCode, success, atkInfo, defInfo) {
        const from = MapRenderer.getTerritoryScreenPos(fromCode);
        const to   = MapRenderer.getTerritoryScreenPos(toCode);
        if (!from || !to) {
            console.warn(`[FX] Cannot animate: from=${fromCode} to=${toCode}`);
            return;
        }

        const missileColor = atkInfo?.color || '#ff1744';
        const atkName  = atkInfo?.name || fromCode.toUpperCase();
        const defName  = defInfo?.name || toCode.toUpperCase();
        const trailLbl = `${atkName}  -->  ${defName}`;

        missiles.push(new Missile(from, to, missileColor, (x, y) => {
            const ec = success ? '#00e676' : '#ff1744';
            explosions.push(new Explosion(x, y, 40 + Math.random() * 15, ec, false));
            const pCount = speedMult > 1 ? 12 : 25; // fewer particles in spectator
            for (let i = 0; i < pCount; i++) {
                particles.push(new Particle(x, y, ec,
                    (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6 - 2,
                    30 + Math.random() * 20));
            }
            const lbl = success ? 'CONQUISTATO!' : 'RESPINTO';
            textPopups.push(new BigLabel(x, y - 15, lbl, ec, 15, 90));
        }, fromCode, toCode, success, trailLbl));

        const midX = (from.x + to.x) / 2, midY = (from.y + to.y) / 2 - 25;
        textPopups.push(new BigLabel(midX, midY, trailLbl, '#ffd740', 14, 110));
        textPopups.push(new BigLabel(from.x, from.y - 12, `${atkName} ATTACCA`, missileColor, 12, 80));

        ensureRunning();
    }

    function spawnNukeFX(fromCode, toCode, atkInfo, defInfo) {
        const from = MapRenderer.getTerritoryScreenPos(fromCode);
        const to   = MapRenderer.getTerritoryScreenPos(toCode);
        if (!from || !to) return;

        const atkName = atkInfo?.name || fromCode.toUpperCase();
        const defName = defInfo?.name || toCode.toUpperCase();
        const label   = `NUKE: ${atkName} --> ${defName}`;

        missiles.push(new Missile(from, to, '#76ff03', (x, y) => {
            explosions.push(new Explosion(x, y, 80, '#ff9800', true));
            const nkCount = speedMult > 1 ? 20 : 50;
            for (let i = 0; i < nkCount; i++) {
                particles.push(new Particle(x, y, '#ffff00',
                    (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10 - 3,
                    50 + Math.random() * 30));
            }
            textPopups.push(new BigLabel(x, y - 20, 'ATTACCO NUCLEARE!', '#ff00ff', 18, 120));
        }, fromCode, toCode, true, label));

        const midX = (from.x + to.x) / 2, midY = (from.y + to.y) / 2 - 30;
        textPopups.push(new BigLabel(midX, midY, label, '#ff00ff', 16, 120));
        ensureRunning();
    }

    function spawnText(code, text, color = '#ffd700', big = false) {
        const pos = MapRenderer.getTerritoryScreenPos(code);
        if (!pos) return;
        if (big) textPopups.push(new BigLabel(pos.x, pos.y, text, color, 15, 80));
        else     textPopups.push(new TextPopup(pos.x, pos.y, text, color));
        ensureRunning();
    }

    function spawnConquerFX(code) {
        const pos = MapRenderer.getTerritoryScreenPos(code);
        if (!pos) return;
        for (let i = 0; i < 15; i++) {
            const ang = Math.random() * Math.PI * 2, spd = 1 + Math.random() * 3;
            particles.push(new Particle(pos.x, pos.y, '#00e5ff',
                Math.cos(ang) * spd, Math.sin(ang) * spd, 40));
        }
        ensureRunning();
    }

    /** Clear all persistent trail traces — call at start of each new turn */
    function clearTurnTrails() { trails = []; }

    /** Set animation speed multiplier (1 = normal, 1.5-2 = spectator) */
    function setSpeed(mult) { speedMult = mult; }

    /* ════════════════ RENDER LOOP ════════════════ */
    function ensureRunning() {
        if (!running) { running = true; requestAnimationFrame(loop); }
    }

    function loop() {
        const ctx    = MapRenderer.getFxCtx();
        const canvas = MapRenderer.getFxCanvas();
        if (!ctx || !canvas || canvas.width === 0) {
            MapRenderer.resizeFx();
            if (canvas && canvas.width > 0) { requestAnimationFrame(loop); }
            else { running = false; }
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;

        /* Persistent trail traces (background) — recomputed each frame for zoom */
        /* Remove dead (fully faded) trails */
        trails = trails.filter(tr => !tr.dead);
        trails.forEach(tr => {
            ctx.save();
            ctx.globalAlpha = tr.opacity;
            tr.draw(ctx);
            ctx.restore();
        });
        ctx.globalAlpha = 1;

        /* Transient FX */
        const sets = [
            { arr: particles,  set: v => particles = v },
            { arr: missiles,   set: v => missiles = v },
            { arr: explosions, set: v => explosions = v },
            { arr: textPopups, set: v => textPopups = v }
        ];
        let alive = false;
        sets.forEach(({ arr, set }) => {
            const kept = [];
            arr.forEach(o => { o.update(); if (!o.dead) { o.draw(ctx); kept.push(o); } });
            set(kept);
            if (kept.length) alive = true;
        });

        ctx.globalAlpha = 1;
        if (alive || trails.length > 0) requestAnimationFrame(loop);
        else running = false;
    }

    /* ════════════════ PUBLIC ════════════════ */
    return { spawnBattleFX, spawnNukeFX, spawnText, spawnConquerFX, clearTurnTrails, setSpeed };
})();
