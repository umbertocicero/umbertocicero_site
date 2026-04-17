/* ═══════════════════════════════════════════════════════
   GeoDominium — Animations  (Canvas overlay FX)
   Trail traces store territory codes and recompute screen
   positions each frame → correct after zoom/pan.
   ═══════════════════════════════════════════════════════ */

const Animations = (() => {
    /** i18n shorthand — safe fallback if I18n not loaded yet */
    function t(key, params) {
        return (typeof I18n !== 'undefined') ? I18n.t(key, params) : key;
    }

    let particles  = [];
    let missiles   = [];
    let explosions = [];
    let textPopups = [];
    let trails     = [];   // persistent TrailTrace objects (survive full turn)
    let running    = false;
    let speedMult  = 1;    // 1 = normal, 1.8 = spectator (faster missiles)
    const MAX_TRAILS = 10; // cap visible trails for performance

    /** Zoom-aware pixel scale: returns a factor so that canvas-drawn
     *  elements (lines, fonts, dots) shrink when zoomed out and grow
     *  when zoomed in — but softly (square-root), so they stay readable.
     *  Clamped to [0.45, 2.5] to avoid extremes. */
    function _zoomFactor() {
        const s = (typeof MapRenderer !== 'undefined') ? MapRenderer.scale : 1;
        return Math.max(0.45, Math.min(2.5, Math.pow(s, 0.5)));
    }

    /* ── helper: compute arc point at parameter t ── */
    function arcPoint(from, to, t, arcFactor) {
        const x = from.x + (to.x - from.x) * t;
        const dist = Math.hypot(to.x - from.x, to.y - from.y);
        const arcH = dist * (arcFactor || 0.3);
        const arcY = -4 * arcH * t * (t - 1);
        const y = from.y + (to.y - from.y) * t - arcY;
        return { x, y };
    }

    /* ── Arc factor per attack category ── */
    const ARC_FACTORS = { air: 0.42, sea: 0.12, ground: 0.18, missile: 0.55 };

    /* ════════════════ PARTICLE ════════════════ */
    class Particle {
        constructor(x, y, color, vx, vy, life, anchorCode) {
            /* anchorCode lets the particle follow pan/zoom relative to a territory */
            this.anchorCode = anchorCode || null;
            this._ox = 0; this._oy = 0;  // offset from anchor screen pos
            if (this.anchorCode) {
                const aPos = MapRenderer.getTerritoryScreenPos(this.anchorCode);
                if (aPos) { this._ox = x - aPos.x; this._oy = y - aPos.y; }
            }
            this.x = x; this.y = y; this.color = color;
            this.vx = vx; this.vy = vy;
            this.life = life; this.maxLife = life;
            this.size = 2 + Math.random() * 3;
        }
        update() {
            this._ox += this.vx; this._oy += this.vy;
            this.vy += 0.05; this.life--;
            if (this.anchorCode) {
                const aPos = MapRenderer.getTerritoryScreenPos(this.anchorCode);
                if (aPos) { this.x = aPos.x + this._ox; this.y = aPos.y + this._oy; }
            } else { this.x += this.vx; this.y += this.vy; }
        }
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
            this.steps    = 20; // arc resolution (reduced for perf)
        }
        draw(ctx) {
            /* Recompute screen positions each frame → zoom/pan correct */
            const from = MapRenderer.getTerritoryScreenPos(this.fromCode);
            const to   = MapRenderer.getTerritoryScreenPos(this.toCode);
            if (!from || !to) return;

            const zf    = _zoomFactor();
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
            ctx.lineWidth = 3 * zf;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.stroke();

            /* Inner white line + dashed guide — skip in fast mode for perf */
            if (speedMult <= 1) {
                ctx.globalAlpha = pulse * 0.7;
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1 * zf;
                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
                ctx.stroke();

                ctx.globalAlpha = pulse * 0.12;
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 1 * zf;
                ctx.setLineDash([5 * zf, 4 * zf]);
                ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
                ctx.setLineDash([]);
            }

            /* Origin dot + ring */
            ctx.globalAlpha = pulse * 0.7;
            ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(from.x, from.y, 5 * zf, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = this.color; ctx.lineWidth = 1.5 * zf;
            ctx.beginPath(); ctx.arc(from.x, from.y, 9 * zf, 0, Math.PI * 2); ctx.stroke();

            /* Target marker */
            const mc = this.success ? '#00e676' : '#ff1744';
            ctx.globalAlpha = pulse * 0.7;
            if (this.success) {
                ctx.fillStyle = mc;
                ctx.beginPath(); ctx.arc(to.x, to.y, 6 * zf, 0, Math.PI * 2); ctx.fill();
            } else {
                ctx.strokeStyle = mc; ctx.lineWidth = 2 * zf;
                const sz = 7 * zf;
                ctx.beginPath();
                ctx.moveTo(to.x - sz, to.y); ctx.lineTo(to.x + sz, to.y);
                ctx.moveTo(to.x, to.y - sz); ctx.lineTo(to.x, to.y + sz);
                ctx.stroke();
            }

            /* Result text at target */
            ctx.globalAlpha = pulse;
            ctx.font = `bold ${Math.round(12 * zf)}px Rajdhani, sans-serif`;
            ctx.textAlign = 'center';
            const ico = this.success ? 'OK' : 'FAIL';
            ctx.fillStyle = '#000'; ctx.fillText(ico, to.x + 1, to.y - 11 * zf);
            ctx.fillStyle = mc;     ctx.fillText(ico, to.x, to.y - 12 * zf);

            /* Midpoint label with background */
            if (this.label) {
                const mx = (from.x + to.x) / 2;
                const my = (from.y + to.y) / 2 - 14 * zf;
                ctx.globalAlpha = Math.min(pulse + 0.2, 0.85);
                ctx.font = `bold ${Math.round(11 * zf)}px Rajdhani, sans-serif`;
                ctx.textAlign = 'center';
                const tw = ctx.measureText(this.label).width;
                ctx.fillStyle = 'rgba(0,0,0,0.65)';
                ctx.fillRect(mx - tw / 2 - 4 * zf, my - 10 * zf, tw + 8 * zf, 15 * zf);
                ctx.fillStyle = '#ffd740';
                ctx.fillText(this.label, mx, my + 2 * zf);
            }
        }
        /* Trails older than 6s start fading, gone at 10s */
        get opacity() {
            const age = (Date.now() - this.born) / 1000;
            if (age < 6) return 1;
            return Math.max(0, 1 - (age - 6) / 4);
        }
        get dead() { return this.opacity <= 0; }
    }

    /* ════════════════ MISSILE ════════════════ */
    class Missile {
        /**
         * @param {Object} from       – {x,y} screen start (snapshot — used only as fallback)
         * @param {Object} to         – {x,y} screen target (snapshot — used only as fallback)
         * @param {string} color      – hex colour
         * @param {Function} onImpact – callback(x,y)
         * @param {string} fromCode   – territory code of origin
         * @param {string} toCode     – territory code of target
         * @param {boolean} success   – attack success
         * @param {string} label      – trail label text
         * @param {string} [category] – 'air'|'sea'|'ground'|'missile' (default 'ground')
         */
        constructor(from, to, color, onImpact, fromCode, toCode, success, label, category) {
            this.fromSnap = { ...from }; this.toSnap = { ...to };
            this.fromCode = fromCode; this.toCode = toCode;
            this.color = color; this.onImpact = onImpact;
            this.success = success; this.label = label;
            this.category = category || 'ground';
            this.arcFactor = ARC_FACTORS[this.category] || 0.3;
            this.t = 0;
            /* Category-specific speed */
            const baseSpeed = this.category === 'missile' ? 0.018
                            : this.category === 'air'     ? 0.015
                            : this.category === 'sea'     ? 0.009
                            : 0.011;
            this.speed = (baseSpeed + Math.random() * 0.004) * speedMult;
            this.trail = [];  // stores {t} parametric values, redrawn in screen space each frame
        }
        /** Get live screen positions (recomputed each frame for zoom/pan) */
        _from() { return (this.fromCode && MapRenderer.getTerritoryScreenPos(this.fromCode)) || this.fromSnap; }
        _to()   { return (this.toCode   && MapRenderer.getTerritoryScreenPos(this.toCode))   || this.toSnap; }
        update() {
            this.t += this.speed;
            this.trail.push(this.t);
            if (this.trail.length > 45) this.trail.shift();

            if (this.t >= 1) {
                trails.push(new TrailTrace(this.fromCode, this.toCode, this.color, this.success, this.label));
                while (trails.length > MAX_TRAILS) trails.shift();
                const to = this._to();
                if (this.onImpact) this.onImpact(to.x, to.y, this.toCode);
            }
        }
        /** Compute heading angle from last two trail points */
        _heading(pts) {
            if (pts.length < 2) return 0;
            const a = pts[pts.length - 2];
            const b = pts[pts.length - 1];
            return Math.atan2(b.y - a.y, b.x - a.x);
        }
        draw(ctx) {
            const from = this._from();
            const to   = this._to();
            const zf   = _zoomFactor();

            /* Convert parametric trail → screen points */
            const pts = this.trail.map(tVal => arcPoint(from, to, Math.min(tVal, 1), this.arcFactor));

            /* Dashed guide */
            ctx.globalAlpha = 0.15; ctx.strokeStyle = this.color;
            ctx.lineWidth = 1 * zf; ctx.setLineDash([6 * zf, 4 * zf]);
            ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);
            ctx.stroke(); ctx.setLineDash([]);

            /* Trail glow — colour varies by category */
            const trailColor = this.category === 'sea' ? '#4fc3f7'
                             : this.category === 'missile' ? '#ff6e40'
                             : this.color;
            for (let i = 1; i < pts.length; i++) {
                const pct = i / pts.length;
                ctx.globalAlpha = pct * 0.85;
                ctx.strokeStyle = trailColor;
                ctx.lineWidth = (2 + pct * 4) * zf;
                ctx.beginPath();
                ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
                ctx.lineTo(pts[i].x, pts[i].y);
                ctx.stroke();
            }

            /* Head — category-specific shape */
            if (pts.length > 1) {
                const h = pts[pts.length - 1];
                const angle = this._heading(pts);
                ctx.save();
                ctx.translate(h.x, h.y);
                ctx.rotate(angle);
                ctx.scale(zf, zf);

                if (this.category === 'air') {
                    /* ✈ Plane/jet triangle */
                    ctx.globalAlpha = 0.7; ctx.fillStyle = this.color;
                    ctx.beginPath();
                    ctx.moveTo(10, 0);
                    ctx.lineTo(-7, -6);
                    ctx.lineTo(-4, 0);
                    ctx.lineTo(-7, 6);
                    ctx.closePath(); ctx.fill();
                    /* Wings */
                    ctx.globalAlpha = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(1, 0); ctx.lineTo(-5, -10); ctx.lineTo(-6, -8); ctx.lineTo(-2, 0);
                    ctx.lineTo(-6, 8); ctx.lineTo(-5, 10); ctx.closePath(); ctx.fill();
                    /* Bright nose */
                    ctx.globalAlpha = 1; ctx.fillStyle = '#fff';
                    ctx.beginPath(); ctx.arc(7, 0, 2, 0, Math.PI * 2); ctx.fill();

                } else if (this.category === 'sea') {
                    /* ⚓ Ship/torpedo shape */
                    ctx.globalAlpha = 0.7; ctx.fillStyle = '#4fc3f7';
                    ctx.beginPath();
                    ctx.moveTo(9, 0);
                    ctx.lineTo(3, -4);
                    ctx.lineTo(-8, -4);
                    ctx.lineTo(-10, 0);
                    ctx.lineTo(-8, 4);
                    ctx.lineTo(3, 4);
                    ctx.closePath(); ctx.fill();
                    /* Wake line */
                    ctx.globalAlpha = 0.4; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-18, 0); ctx.stroke();
                    /* Bright tip */
                    ctx.globalAlpha = 1; ctx.fillStyle = '#fff';
                    ctx.beginPath(); ctx.arc(8, 0, 1.5, 0, Math.PI * 2); ctx.fill();

                } else if (this.category === 'missile') {
                    /* 🚀 Pointed arrow/rocket */
                    ctx.globalAlpha = 0.8; ctx.fillStyle = '#ff6e40';
                    ctx.beginPath();
                    ctx.moveTo(12, 0);
                    ctx.lineTo(4, -3.5);
                    ctx.lineTo(-8, -3);
                    ctx.lineTo(-10, 0);
                    ctx.lineTo(-8, 3);
                    ctx.lineTo(4, 3.5);
                    ctx.closePath(); ctx.fill();
                    /* Exhaust flare */
                    ctx.globalAlpha = 0.9; ctx.fillStyle = '#ffd600';
                    ctx.beginPath();
                    ctx.moveTo(-10, 0); ctx.lineTo(-16, -3); ctx.lineTo(-14, 0); ctx.lineTo(-16, 3);
                    ctx.closePath(); ctx.fill();
                    ctx.globalAlpha = 1; ctx.fillStyle = '#fff';
                    ctx.beginPath(); ctx.arc(10, 0, 1.5, 0, Math.PI * 2); ctx.fill();

                } else {
                    /* 🪖 Ground: classic circle head */
                    ctx.globalAlpha = 0.5; ctx.fillStyle = this.color;
                    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
                    ctx.globalAlpha = 1; ctx.fillStyle = '#fff';
                    ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill();
                }

                ctx.restore();
            }

            /* Origin ring */
            ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.01) * 0.15;
            ctx.strokeStyle = this.color; ctx.lineWidth = 2 * zf;
            ctx.beginPath(); ctx.arc(from.x, from.y, 10 * zf, 0, Math.PI * 2); ctx.stroke();

            /* Target crosshair */
            ctx.globalAlpha = 0.3; ctx.strokeStyle = '#ff1744'; ctx.lineWidth = 1.5 * zf;
            const sz = 9 * zf;
            ctx.beginPath();
            ctx.moveTo(to.x - sz, to.y); ctx.lineTo(to.x + sz, to.y);
            ctx.moveTo(to.x, to.y - sz); ctx.lineTo(to.x, to.y + sz);
            ctx.stroke();
        }
        get dead() { return this.t >= 1; }
    }

    /* ════════════════ EXPLOSION ════════════════ */
    class Explosion {
        constructor(x, y, radius, color, isNuke, anchorCode) {
            this.anchorCode = anchorCode || null;
            this._ox = 0; this._oy = 0;
            if (this.anchorCode) {
                const aPos = MapRenderer.getTerritoryScreenPos(this.anchorCode);
                if (aPos) { this._ox = x - aPos.x; this._oy = y - aPos.y; }
            }
            this.x = x; this.y = y; this.maxR = radius; this.r = 0;
            this.color = color; this.isNuke = isNuke;
            this.life = isNuke ? 90 : 45; this.maxLife = this.life;
        }
        update() {
            this.r += (this.maxR - this.r) * 0.1; this.life--;
            if (this.anchorCode) {
                const aPos = MapRenderer.getTerritoryScreenPos(this.anchorCode);
                if (aPos) { this.x = aPos.x + this._ox; this.y = aPos.y + this._oy; }
            }
        }
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
        constructor(x, y, text, color, anchorCode) {
            this.anchorCode = anchorCode || null;
            this._ox = 0; this._oy = 0;
            if (this.anchorCode) {
                const aPos = MapRenderer.getTerritoryScreenPos(this.anchorCode);
                if (aPos) { this._ox = x - aPos.x; this._oy = y - aPos.y; }
            }
            this.x = x; this.y = y; this.text = text; this.color = color;
            this.life = 60; this.maxLife = 60; this.vy = -1;
        }
        update() {
            this._oy += this.vy; this.vy *= 0.97; this.life--;
            if (this.anchorCode) {
                const aPos = MapRenderer.getTerritoryScreenPos(this.anchorCode);
                if (aPos) { this.x = aPos.x + this._ox; this.y = aPos.y + this._oy; }
            } else { this.y += this.vy; }
        }
        draw(ctx) {
            const a = this.life / this.maxLife;
            const zf = _zoomFactor();
            ctx.globalAlpha = a; ctx.font = `bold ${Math.round(12 * zf)}px Rajdhani, sans-serif`; ctx.textAlign = 'center';
            ctx.fillStyle = '#000'; ctx.fillText(this.text, this.x + 1, this.y + 1);
            ctx.fillStyle = this.color; ctx.fillText(this.text, this.x, this.y);
        }
        get dead() { return this.life <= 0; }
    }

    /* ════════════════ BIG LABEL ════════════════ */
    class BigLabel {
        constructor(x, y, text, color, size = 16, duration = 90, anchorCode) {
            this.anchorCode = anchorCode || null;
            this._ox = 0; this._oy = 0;
            if (this.anchorCode) {
                const aPos = MapRenderer.getTerritoryScreenPos(this.anchorCode);
                if (aPos) { this._ox = x - aPos.x; this._oy = y - aPos.y; }
            }
            this.x = x; this.y = y; this.text = text; this.color = color;
            this.size = size; this.life = duration; this.maxLife = duration; this.vy = -0.6;
        }
        update() {
            this._oy += this.vy; this.vy *= 0.98; this.life--;
            if (this.anchorCode) {
                const aPos = MapRenderer.getTerritoryScreenPos(this.anchorCode);
                if (aPos) { this.x = aPos.x + this._ox; this.y = aPos.y + this._oy; }
            } else { this.y += this.vy; }
        }
        draw(ctx) {
            const a = Math.min(1, this.life / (this.maxLife * 0.3));
            const zf = _zoomFactor();
            ctx.globalAlpha = a;
            ctx.font = `bold ${Math.round(this.size * zf)}px Rajdhani, sans-serif`; ctx.textAlign = 'center';
            ctx.fillStyle = '#000'; ctx.fillText(this.text, this.x + 1, this.y + 1);
            ctx.fillStyle = this.color; ctx.fillText(this.text, this.x, this.y);
        }
        get dead() { return this.life <= 0; }
    }

    /* ════════════════ SPAWN FX ════════════════
       atkInfo / defInfo = { code, name, flag, color }
       Caller must supply these so labels are correct even after conquest.
       Uses attacker's dominant unit to select projectile style.
       ════════════════════════════════════════════ */

    /** Determine the dominant attack unit type for a nation (for FX visuals) */
    function getDominantAttackUnit(nationCode) {
        if (typeof GameEngine === 'undefined') return { type: 'infantry', icon: '🪖', category: 'ground' };
        const state = GameEngine.getState();
        if (!state) return { type: 'infantry', icon: '🪖', category: 'ground' };
        const n = state.nations[nationCode];
        if (!n) return { type: 'infantry', icon: '🪖', category: 'ground' };

        /* Weight by atk power contribution, not just count */
        let best = 'infantry', bestPow = 0;
        Object.entries(n.army).forEach(([utype, count]) => {
            if (count <= 0) return;
            const ut = typeof UNIT_TYPES !== 'undefined' ? UNIT_TYPES[utype] : null;
            if (!ut) return;
            const pow = (ut.atk || 0) * count;
            if (pow > bestPow) { bestPow = pow; best = utype; }
        });

        const airTypes = new Set(['fighter','bomber','drone']);
        const seaTypes = new Set(['navy','submarine']);
        const missileTypes = new Set(['cruiseMissile','ballisticMissile']);
        const ut = typeof UNIT_TYPES !== 'undefined' ? UNIT_TYPES[best] : null;
        let category = 'ground';
        if (airTypes.has(best)) category = 'air';
        else if (seaTypes.has(best)) category = 'sea';
        else if (missileTypes.has(best)) category = 'missile';

        return { type: best, icon: ut?.icon || '🪖', category };
    }

    function spawnBattleFX(fromCode, toCode, success, atkInfo, defInfo) {
        const from = MapRenderer.getTerritoryScreenPos(fromCode);
        const to   = MapRenderer.getTerritoryScreenPos(toCode);
        if (!from || !to) return;

        const missileColor = atkInfo?.color || '#ff1744';
        const atkName  = atkInfo?.name || fromCode.toUpperCase();
        const defName  = defInfo?.name || toCode.toUpperCase();
        const trailLbl = `${atkName}  →  ${defName}`;

        /* Determine attack style based on dominant unit */
        const atkUnit = getDominantAttackUnit(atkInfo?.code || fromCode);

        /* Main missile — shaped by attack category */
        const cat = atkUnit.category;
        missiles.push(new Missile(from, to, missileColor, (x, y, impactCode) => {
            const ec = success ? '#00e676' : '#ff1744';
            const exSize = cat === 'missile' ? 55 : 40 + Math.random() * 15;
            explosions.push(new Explosion(x, y, exSize, ec, false, impactCode));
            const pCount = speedMult > 1 ? 12 : 25;
            for (let i = 0; i < pCount; i++) {
                particles.push(new Particle(x, y, ec,
                    (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6 - 2,
                    30 + Math.random() * 20, impactCode));
            }
            const lbl = success
                ? `${atkName} → ${defName} ${t('anim_conquered')}`
                : `${atkName} → ${defName} ${t('anim_repelled')}`;
            textPopups.push(new BigLabel(x, y - 15, lbl, ec, 15, 90, impactCode));
        }, fromCode, toCode, success, '', cat));

        /* Secondary projectiles — skip entirely in spectator/fast mode */
        if (cat === 'air' && speedMult <= 1) {
            /* Spawn 1-2 additional "escort" jets with slight offset */
            const escorts = speedMult > 1 ? 1 : 2;
            for (let i = 0; i < escorts; i++) {
                setTimeout(() => {
                    const fLive = MapRenderer.getTerritoryScreenPos(fromCode) || from;
                    const tLive = MapRenderer.getTerritoryScreenPos(toCode) || to;
                    const offFrom = { x: fLive.x + (Math.random()-0.5)*20, y: fLive.y + (Math.random()-0.5)*15 };
                    const offTo   = { x: tLive.x + (Math.random()-0.5)*15, y: tLive.y + (Math.random()-0.5)*10 };
                    missiles.push(new Missile(offFrom, offTo, missileColor, (x, y, ic) => {
                        const cnt = speedMult > 1 ? 4 : 8;
                        for (let j = 0; j < cnt; j++) {
                            particles.push(new Particle(x, y, missileColor,
                                (Math.random()-0.5)*4, (Math.random()-0.5)*4, 20, ic));
                        }
                    }, fromCode, toCode, success, '', 'air'));
                    ensureRunning();
                }, 150 + i * 200);
            }
        } else if (cat === 'sea' && speedMult <= 1) {
            /* Naval: broadside salvo (torpedo shape) */
            setTimeout(() => {
                const fLive = MapRenderer.getTerritoryScreenPos(fromCode) || from;
                const offFrom = { x: fLive.x + (Math.random()-0.5)*25, y: fLive.y + 10 };
                missiles.push(new Missile(offFrom, to, '#4fc3f7', (x, y, ic) => {
                    explosions.push(new Explosion(x, y, 25, '#4fc3f7', false, ic));
                }, fromCode, toCode, success, '', 'sea'));
                ensureRunning();
            }, 200);
        } else if (cat === 'missile' && speedMult <= 1) {
            /* Cruise/ballistic: extra rocket with bigger explosion */
            setTimeout(() => {
                missiles.push(new Missile(from, to, '#ff6e40', (x, y, ic) => {
                    explosions.push(new Explosion(x, y, 55, '#ff6e40', false, ic));
                    const cnt = speedMult > 1 ? 10 : 20;
                    for (let j = 0; j < cnt; j++) {
                        particles.push(new Particle(x, y, '#ff9100',
                            (Math.random()-0.5)*8, (Math.random()-0.5)*8 - 3,
                            35 + Math.random()*20, ic));
                    }
                }, fromCode, toCode, success, '', 'missile'));
                ensureRunning();
            }, 100);
        }

        ensureRunning();
    }

    function spawnNukeFX(fromCode, toCode, atkInfo, defInfo) {
        const from = MapRenderer.getTerritoryScreenPos(fromCode);
        const to   = MapRenderer.getTerritoryScreenPos(toCode);
        if (!from || !to) return;

        const atkName = atkInfo?.name || fromCode.toUpperCase();
        const defName = defInfo?.name || toCode.toUpperCase();
        const label   = `NUKE: ${atkName} → ${defName}`;

        missiles.push(new Missile(from, to, '#76ff03', (x, y, ic) => {
            explosions.push(new Explosion(x, y, 80, '#ff9800', true, ic));
            const nkCount = speedMult > 1 ? 20 : 50;
            for (let i = 0; i < nkCount; i++) {
                particles.push(new Particle(x, y, '#ffff00',
                    (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10 - 3,
                    50 + Math.random() * 30, ic));
            }
            textPopups.push(new BigLabel(x, y - 20, t('anim_nuke_strike'), '#ff00ff', 18, 120, ic));
        }, fromCode, toCode, true, label, 'missile'));

        const midX = (from.x + to.x) / 2, midY = (from.y + to.y) / 2 - 30;
        textPopups.push(new BigLabel(midX, midY, label, '#ff00ff', 16, 120, toCode));
        ensureRunning();
    }

    function spawnText(code, text, color = '#ffd700', big = false) {
        const pos = MapRenderer.getTerritoryScreenPos(code);
        if (!pos) return;
        if (big) textPopups.push(new BigLabel(pos.x, pos.y, text, color, 15, 80, code));
        else     textPopups.push(new TextPopup(pos.x, pos.y, text, color, code));
        ensureRunning();
    }

    function spawnConquerFX(code) {
        const pos = MapRenderer.getTerritoryScreenPos(code);
        if (!pos) return;
        /* Expanding ring + particles */
        explosions.push(new Explosion(pos.x, pos.y, 35, '#00e5ff', false, code));
        const count = speedMult > 1 ? 8 : 15;
        for (let i = 0; i < count; i++) {
            const ang = Math.random() * Math.PI * 2, spd = 1 + Math.random() * 3;
            particles.push(new Particle(pos.x, pos.y, '#00e5ff',
                Math.cos(ang) * spd, Math.sin(ang) * spd, 40, code));
        }
        ensureRunning();
    }

    /** Revolt FX: red flash + fire particles */
    function spawnRevoltFX(code) {
        const pos = MapRenderer.getTerritoryScreenPos(code);
        if (!pos) return;
        explosions.push(new Explosion(pos.x, pos.y, 30, '#ff6e40', false, code));
        const count = speedMult > 1 ? 6 : 12;
        for (let i = 0; i < count; i++) {
            const ang = Math.random() * Math.PI * 2, spd = 0.8 + Math.random() * 2;
            const colors = ['#ff1744', '#ff6e40', '#ff9100', '#ffd600'];
            particles.push(new Particle(pos.x, pos.y, colors[i % colors.length],
                Math.cos(ang) * spd, Math.sin(ang) * spd - 1.5, 35 + Math.random() * 15, code));
        }
        textPopups.push(new BigLabel(pos.x, pos.y - 15, t('anim_revolt'), '#ff6e40', 14, 80, code));
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
    return { spawnBattleFX, spawnNukeFX, spawnText, spawnConquerFX, spawnRevoltFX, clearTurnTrails, setSpeed };
})();
