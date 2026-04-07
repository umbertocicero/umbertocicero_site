// ============================================
// GAME - Logica principale con sistema livelli
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ============================================
// DYNAMIC RESIZE + ZOOM
// ============================================
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    // Zoom: on mobile the world is rendered bigger so the cat fills
    // more of the screen (tighter camera). Desktop stays 1:1.
    const zoom = CONFIG.baseZoom;
    CONFIG.zoom = zoom;

    // The "logical" game viewport (how much of the world we see)
    // shrinks when zoom > 1 → everything looks bigger.
    const logicalW = Math.round(screenW / zoom);
    const logicalH = Math.round(screenH / zoom);

    CONFIG.canvasWidth = logicalW;
    CONFIG.canvasHeight = logicalH;

    // Physical (pixel) size for crisp rendering on high-DPI screens
    canvas.width  = Math.round(screenW * dpr);
    canvas.height = Math.round(screenH * dpr);

    // CSS size = screen size
    canvas.style.width  = screenW + 'px';
    canvas.style.height = screenH + 'px';

    // Scale context so we draw in logical coords and it fills the screen
    ctx.setTransform(zoom * dpr, 0, 0, zoom * dpr, 0, 0);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Try to lock orientation on supported browsers
if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(() => {});
}

// Game objects
let cat;
let platforms = [];
let lamps = [];
let stars = [];
let particles = [];
let fireEscapes = [];
let foods = [];
let enemies = [];
let ghosts = [];
let moon;
let cranes = [];
let snowflakes = [];
let steamParticles = [];
let lifePickups = [];
let magnetPickups = [];
let magnetTimer = 0;        // frames remaining for active magnet
let raindrops = [];
let rainSplashes = [];
let rivalCat = null;
let quantumCat = null;
let portals = [];
let portalBursts = [];
let quantumOrbs = [];
let catHoldsOrb = false;      // il gatto tiene un'orb
let bossPortalSpawnTimer = 0;
let bossIntroTimer = 0;   // schermata intro livello 5
let lifeSpawnTimer = 0;
let gameOver = false;
let gameWon = false;
let clickRestart = false;

// Easter egg — level selector
let easterEggTaps = 0;
let easterEggTimeout = 0;
let easterEggOpen = false;

// ============================================
// LEVEL REGISTRY — maps level number → Level class
// ============================================
const LEVEL_REGISTRY = {
    1: Level1,
    2: Level2,
    3: Level3,
    4: Level4,
    5: Level5
};

/** Active level instance — set by createLevel() */
let currentLevel = null;

/** Instantiate and store the level for CONFIG.level. */
function createLevel() {
    if (currentLevel) currentLevel.cleanup();
    const LevelClass = LEVEL_REGISTRY[CONFIG.level] || Level1;
    currentLevel = new LevelClass();
}

function getTheme() {
    return currentLevel ? currentLevel.theme : new Level1().theme;
}

// currentBuildingData is still kept as a global so that
// spawnLifePickup / findSafeSpawn can read it from game.js.
let currentBuildingData = [];

// ============================================
// CITY GENERATION — delegates to the active level
// ============================================
function generateCity() {
    createLevel();

    // Level 5 uses a quantum grid background
    if (CONFIG.level === 5) {
        quantumGrid = new QuantumGrid();
    } else {
        quantumGrid = null;
    }

    // Let the level populate all global arrays
    const buildingData = currentLevel.generateCity();

    // Keep currentBuildingData in sync for spawnLifePickup / findSafeSpawn
    currentBuildingData = Array.isArray(buildingData) ? buildingData : [];
}





// ============================================
// CAMERA
// ============================================
function updateCamera() {
    const vw = CONFIG.canvasWidth;
    const vh = CONFIG.canvasHeight;
    const targetX = cat.x - vw / 2 + cat.width / 2;
    const targetY = cat.y - vh / 2 + cat.height / 2;
    
    CONFIG.cameraX += (targetX - CONFIG.cameraX) * 0.08;
    CONFIG.cameraY += (targetY - CONFIG.cameraY) * 0.08;
    
    CONFIG.cameraX = Math.max(0, Math.min(CONFIG.cameraX, CONFIG.worldWidth - vw));
    CONFIG.cameraY = Math.max(0, Math.min(CONFIG.cameraY, CONFIG.worldHeight - vh));
}

// ============================================
// DRAW BACKGROUND (tema livello)
// ============================================
function drawBackground() {
    const theme = getTheme();
    
    const vw = CONFIG.canvasWidth;
    const vh = CONFIG.canvasHeight;
    const gradient = ctx.createLinearGradient(0, 0, 0, vh);
    gradient.addColorStop(0, theme.skyTop);
    gradient.addColorStop(0.5, theme.skyMid);
    gradient.addColorStop(1, theme.skyBot);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, vw, vh);

    ctx.save();
    ctx.translate(-CONFIG.cameraX * 0.1, -CONFIG.cameraY * 0.1);
    moon.draw(ctx, theme);
    ctx.restore();

    ctx.save();
    ctx.translate(-CONFIG.cameraX * 0.2, -CONFIG.cameraY * 0.2);
    for (const star of stars) star.draw(ctx, theme);
    ctx.restore();
    
    // Quantum grid (Livello 5 — sfondo sci-fi)
    if (CONFIG.level === 5 && quantumGrid) {
        quantumGrid.draw(ctx);
    }
    
    // Nebbia livello
    if (theme.fogAlpha > 0) {
        const fogGrad = ctx.createLinearGradient(0, vh * 0.5, 0, vh);
        fogGrad.addColorStop(0, 'transparent');
        fogGrad.addColorStop(1, `rgba(20, 20, 30, ${theme.fogAlpha})`);
        ctx.fillStyle = fogGrad;
        ctx.fillRect(0, 0, vw, vh);
    }
}

// ============================================
// LAMP LIGHTING - Illuminazione naturale
// ============================================
function drawLampLighting() {
    const theme = getTheme();
    const lc = theme.lampColor || { r: 220, g: 180, b: 120 };
    
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    
    for (const lamp of lamps) {
        const lx = lamp.x;
        const ly = lamp.y + 25;
        const brightness = lamp.flicker > 0 ? 0.15 : (theme.lampIntensity || 0.8);
        
        // Luce radiale principale dal lampione
        const radius = 250;
        const lampGlow = ctx.createRadialGradient(lx, ly, 0, lx, ly, radius);
        lampGlow.addColorStop(0, `rgba(${lc.r}, ${lc.g}, ${lc.b}, ${brightness * 0.35})`);
        lampGlow.addColorStop(0.15, `rgba(${lc.r}, ${lc.g}, ${lc.b}, ${brightness * 0.25})`);
        lampGlow.addColorStop(0.4, `rgba(${lc.r}, ${lc.g}, ${lc.b}, ${brightness * 0.12})`);
        lampGlow.addColorStop(0.7, `rgba(${lc.r}, ${lc.g}, ${lc.b}, ${brightness * 0.04})`);
        lampGlow.addColorStop(1, 'transparent');
        
        ctx.fillStyle = lampGlow;
        ctx.beginPath();
        ctx.arc(lx, ly, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Cono di luce direzionale verso il basso (ellisse)
        const coneGlow = ctx.createRadialGradient(lx, ly + 100, 0, lx, ly + 100, 200);
        coneGlow.addColorStop(0, `rgba(${lc.r}, ${lc.g}, ${lc.b}, ${brightness * 0.2})`);
        coneGlow.addColorStop(0.5, `rgba(${lc.r}, ${lc.g}, ${lc.b}, ${brightness * 0.08})`);
        coneGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = coneGlow;
        ctx.beginPath();
        ctx.ellipse(lx, ly + 120, 180, 140, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
}

// ============================================
// CAT LIGHT - Il gatto illumina la scena
// ============================================
function drawCatLight() {
    if (!cat) return;
    
    const theme = getTheme();
    const catCX = cat.x + cat.width / 2;
    const catCY = cat.y + cat.height / 2;
    
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    
    // Luce ambientale del gatto - cerchio grande e morbido
    const catRadius = 180;
    const catLight = ctx.createRadialGradient(catCX, catCY, 0, catCX, catCY, catRadius);
    catLight.addColorStop(0, 'rgba(255, 220, 150, 0.18)');
    catLight.addColorStop(0.15, 'rgba(255, 200, 130, 0.12)');
    catLight.addColorStop(0.35, 'rgba(240, 180, 100, 0.06)');
    catLight.addColorStop(0.6, 'rgba(220, 160, 80, 0.025)');
    catLight.addColorStop(1, 'transparent');
    ctx.fillStyle = catLight;
    ctx.beginPath();
    ctx.arc(catCX, catCY, catRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Luce dagli occhi del gatto (più calda, concentrata davanti)
    const eyeX = catCX + cat.facing * 15;
    const eyeY = catCY - 5;
    const eyeRadius = 100;
    const eyeLight = ctx.createRadialGradient(eyeX, eyeY, 0, eyeX, eyeY, eyeRadius);
    eyeLight.addColorStop(0, 'rgba(255, 200, 50, 0.12)');
    eyeLight.addColorStop(0.3, 'rgba(255, 180, 40, 0.06)');
    eyeLight.addColorStop(0.6, 'rgba(240, 160, 30, 0.02)');
    eyeLight.addColorStop(1, 'transparent');
    ctx.fillStyle = eyeLight;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// ============================================
// DRAW UI
// ============================================
function _soundBtnRect() {
    const sz = IS_MOBILE ? 28 : 34;
    const margin = IS_MOBILE ? 6 : 10;
    // On level 5 the boss health panel occupies the top-right corner —
    // shift the button below it so it stays visible.
    const bossOffset = (CONFIG.level === 5) ? (IS_MOBILE ? 48 : 62) : 0;
    return { x: CONFIG.canvasWidth - sz - margin, y: margin + bossOffset, w: sz, h: sz };
}

function drawUI() {
    const theme = getTheme();
    const isMobile = IS_MOBILE;
    
    // Panel sfondo — più piccolo e trasparente su mobile
    const panelW = isMobile ? 180 : 260;
    const panelH = isMobile ? 42 : 55;
    const panelAlpha = isMobile ? 0.35 : 0.8;
    const pad = isMobile ? 6 : 10;
    
    ctx.fillStyle = `rgba(0, 0, 0, ${panelAlpha})`;
    ctx.beginPath();
    ctx.roundRect(pad, pad, panelW, panelH, 8);
    ctx.fill();
    if (!isMobile) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    // Livello
    ctx.fillStyle = '#668899';
    ctx.font = isMobile ? 'bold 9px Arial' : 'bold 11px Arial';
    ctx.fillText('LV.' + CONFIG.level + ' - ' + theme.name, pad + 8, pad + (isMobile ? 11 : 13));
    
    // Vite — disegnate come forme canvas (niente emoji, rendering uniforme)
    const heartSize = isMobile ? 7 : 10;  // raggio del cuore
    const heartSpacing = isMobile ? 16 : 20;
    const heartBaseX = pad + 8 + heartSize;
    const heartBaseY = pad + (isMobile ? 22 : 27);
    for (let i = 0; i < 9; i++) {
        const hx = heartBaseX + i * heartSpacing;
        const hy = heartBaseY;
        const filled = i < cat.lives;
        const s = heartSize;
        ctx.save();
        ctx.translate(hx, hy);
        ctx.beginPath();
        ctx.moveTo(0, s * 0.4);
        ctx.bezierCurveTo(-s * 0.2, s * 0.05, -s, -s * 0.15, -s, -s * 0.6);
        ctx.bezierCurveTo(-s, -s * 1.1, -s * 0.4, -s * 1.2, 0, -s * 0.85);
        ctx.bezierCurveTo(s * 0.4, -s * 1.2, s, -s * 1.1, s, -s * 0.6);
        ctx.bezierCurveTo(s, -s * 0.15, s * 0.2, s * 0.05, 0, s * 0.4);
        ctx.closePath();
        if (filled) {
            ctx.fillStyle = '#cc2222';
            ctx.fill();
            // piccolo riflesso
            ctx.fillStyle = 'rgba(255,150,150,0.4)';
            ctx.beginPath();
            ctx.ellipse(-s * 0.3, -s * 0.65, s * 0.25, s * 0.15, -0.4, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        ctx.restore();
    }
    
    // Score
    ctx.fillStyle = '#997722';
    ctx.font = isMobile ? 'bold 10px Arial' : 'bold 14px Arial';
    ctx.fillText('🐟 ' + CONFIG.score, pad + 8, pad + (isMobile ? 37 : 45));
    
    // Food count / barra progresso — nascosti nel boss fight
    if (CONFIG.level !== 5) {
        const remainingFood = foods.filter(f => !f.collected).length;
        const totalFood = foods.length;
        ctx.fillStyle = '#555';
        ctx.font = isMobile ? '9px Arial' : '11px Arial';
        const countX = isMobile ? pad + 58 : 90;
        ctx.fillText((totalFood - remainingFood) + '/' + totalFood, countX, pad + (isMobile ? 37 : 45));
        
        // Barra progresso cibo
        const barX = isMobile ? pad + 90 : 130;
        const barW = isMobile ? 80 : 120;
        const barH = isMobile ? 7 : 10;
        const barY = pad + (isMobile ? 31 : 37);
        const progress = totalFood > 0 ? (totalFood - remainingFood) / totalFood : 0;
        
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 3);
        ctx.fill();
        
        const barColor = progress >= 1 ? '#33aa33' : '#997722';
        ctx.fillStyle = barColor;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW * progress, barH, 3);
        ctx.fill();
    }

    // ── Sound toggle button (top-right corner) ──
    const sbr = _soundBtnRect();
    ctx.fillStyle = CatAudio.isEnabled() ? 'rgba(0,0,0,0.45)' : 'rgba(180,0,0,0.45)';
    ctx.beginPath();
    ctx.roundRect(sbr.x, sbr.y, sbr.w, sbr.h, 6);
    ctx.fill();
    ctx.strokeStyle = CatAudio.isEnabled() ? 'rgba(255,255,255,0.15)' : 'rgba(255,80,80,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = (isMobile ? 13 : 16) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(CatAudio.isEnabled() ? '🔊' : '🔇', sbr.x + sbr.w / 2, sbr.y + sbr.h / 2);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
}

// ============================================
// MINIMAP — mappa in basso a sinistra
// ============================================
function drawMinimap() {
    if (!cat) return;

    const isMobile = IS_MOBILE;

    // Dimensioni pannello (più piccola su mobile)
    const mapW = isMobile ? 110 : 150;
    const mapH = isMobile ? 44  : 58;
    const pad  = isMobile ? 6   : 10;

    // Posizione: sotto il pannello HUD (LV / cuori / score)
    const hudH = isMobile ? 42 : 55;   // altezza panel HUD (da drawUI)
    const mx   = pad;
    const my   = pad + hudH + (isMobile ? 4 : 6);

    const worldW = CONFIG.worldWidth;
    const worldH = CONFIG.worldHeight;

    // Scala mondo → minimap
    const scaleX = mapW / worldW;
    const scaleY = mapH / worldH;

    // Sfondo semitrasparente
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(mx, my, mapW, mapH, 5);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Bordo sottile
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(mx, my, mapW, mapH, 5);
    ctx.stroke();

    // Clip alla mappa
    ctx.beginPath();
    ctx.roundRect(mx, my, mapW, mapH, 5);
    ctx.clip();

    // ── Livello 5: portali, orb, boss ──────────────────────
    if (CONFIG.level === 5) {

        // Portali
        for (const p of portals) {
            if (!p.active) continue;
            const px = mx + p.x * scaleX;
            const py = my + p.y * scaleY;
            const color = p.isVictory ? '#44ff88' : '#44aaff';
            ctx.fillStyle = color;
            // pulsa
            const r = 3 + Math.sin(CONFIG.time * 0.12) * 1;
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fill();
            // halo
            ctx.fillStyle = p.isVictory ? 'rgba(68,255,136,0.22)' : 'rgba(68,170,255,0.18)';
            ctx.beginPath();
            ctx.arc(px, py, r + 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Quantum Orbs
        for (const orb of quantumOrbs) {
            if (!orb.active || orb.collected) continue;
            const ox = mx + orb.x * scaleX;
            const oy = my + orb.y * scaleY;
            ctx.fillStyle = 'rgba(120,200,255,0.9)';
            ctx.beginPath();
            ctx.arc(ox, oy, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Boss (rosso)
        if (quantumCat && !quantumCat.defeated) {
            const bx = mx + (quantumCat.x + quantumCat.width  / 2) * scaleX;
            const by = my + (quantumCat.y + quantumCat.height / 2) * scaleY;
            const br = 3.5 + Math.sin(CONFIG.time * 0.1) * 1;
            ctx.fillStyle = 'rgba(255,60,60,0.9)';
            ctx.beginPath();
            ctx.arc(bx, by, br, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,60,60,0.25)';
            ctx.beginPath();
            ctx.arc(bx, by, br + 3, 0, Math.PI * 2);
            ctx.fill();
        }

    } else {
        // ── Livelli 1-4: cibo non raccolto e life pickup ────

        // Cibo non raccolto (giallo piccolo)
        for (const food of foods) {
            if (food.collected) continue;
            const fx = mx + food.x * scaleX;
            const fy = my + food.y * scaleY;
            ctx.fillStyle = 'rgba(255,200,50,0.75)';
            ctx.beginPath();
            ctx.arc(fx, fy, 1.8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Life pickup (cuoricino rosa)
        for (const lp of lifePickups) {
            if (!lp.active) continue;
            const lx = mx + (lp.x + lp.width  / 2) * scaleX;
            const ly = my + (lp.y + lp.height / 2) * scaleY;
            const pulse = 2.5 + Math.sin(CONFIG.time * 0.1) * 0.8;
            ctx.fillStyle = 'rgba(255,80,120,0.9)';
            ctx.beginPath();
            ctx.arc(lx, ly, pulse, 0, Math.PI * 2);
            ctx.fill();
        }

        // Magnet pickup (ciano)
        for (const mp of magnetPickups) {
            if (!mp.active) continue;
            const mlx = mx + (mp.x + mp.width  / 2) * scaleX;
            const mly = my + (mp.y + mp.height / 2) * scaleY;
            const mpulse = 2.5 + Math.sin(CONFIG.time * 0.14) * 0.8;
            ctx.fillStyle = 'rgba(40,220,255,0.9)';
            ctx.beginPath();
            ctx.arc(mlx, mly, mpulse, 0, Math.PI * 2);
            ctx.fill();
        }

        // Rival cat (livello 4 — arancione)
        if (rivalCat) {
            const rx = mx + (rivalCat.x + 15) * scaleX;
            const ry = my + (rivalCat.y + 20) * scaleY;
            ctx.fillStyle = 'rgba(255,140,30,0.85)';
            ctx.beginPath();
            ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ── Gatto protagonista — punto bianco con alone ─────────
    const cx = mx + (cat.x + cat.width  / 2) * scaleX;
    const cy = my + (cat.y + cat.height / 2) * scaleY;
    // alone
    ctx.fillStyle = 'rgba(255,220,120,0.25)';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    // punto
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();

    // ── Viewport rect (zona visibile) ───────────────────────
    const vrX = mx + CONFIG.cameraX * scaleX;
    const vrY = my + CONFIG.cameraY * scaleY;
    const vrW = CONFIG.canvasWidth  * scaleX;
    const vrH = CONFIG.canvasHeight * scaleY;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(vrX, vrY, vrW, vrH);

    ctx.restore();
}

// ============================================
// DRAW MOBILE CONTROLS — Virtual Joystick + Buttons
// ============================================
function drawMobileControls() {
    if (!TOUCH_CTRL.active) return;

    // Re-layout each frame so resize is always reflected
    layoutTouchControls();

    const joy = TOUCH_CTRL.joy;
    const jmp = TOUCH_CTRL.jump;
    const t   = CONFIG.time;

    ctx.save();
    ctx.globalAlpha = 0.4;

    // ── JOYSTICK BASE ──
    ctx.beginPath();
    ctx.arc(joy.baseX, joy.baseY, joy.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(40,35,28,0.12)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(200,170,100,0.18)';
    ctx.stroke();

    // Direction hints — drawn triangles (no emoji rendering issues)
    ctx.fillStyle = 'rgba(200,170,100,0.28)';
    const arrowSize = 7;
    const arrowInset = joy.radius - 14;
    // Left arrow
    ctx.beginPath();
    ctx.moveTo(joy.baseX - arrowInset,          joy.baseY);
    ctx.lineTo(joy.baseX - arrowInset + arrowSize, joy.baseY - arrowSize * 0.7);
    ctx.lineTo(joy.baseX - arrowInset + arrowSize, joy.baseY + arrowSize * 0.7);
    ctx.closePath();
    ctx.fill();
    // Right arrow
    ctx.beginPath();
    ctx.moveTo(joy.baseX + arrowInset,          joy.baseY);
    ctx.lineTo(joy.baseX + arrowInset - arrowSize, joy.baseY - arrowSize * 0.7);
    ctx.lineTo(joy.baseX + arrowInset - arrowSize, joy.baseY + arrowSize * 0.7);
    ctx.closePath();
    ctx.fill();

    // Stick (moveable thumb)
    const stickPulse = joy.pressed ? 0.45 : 0.18;
    ctx.beginPath();
    ctx.arc(joy.stickX, joy.stickY, joy.stickRadius, 0, Math.PI * 2);
    const stickGrad = ctx.createRadialGradient(
        joy.stickX, joy.stickY, 0,
        joy.stickX, joy.stickY, joy.stickRadius
    );
    stickGrad.addColorStop(0, `rgba(60,50,40,${stickPulse + 0.15})`);
    stickGrad.addColorStop(0.7, `rgba(40,35,28,${stickPulse})`);
    stickGrad.addColorStop(1, `rgba(25,22,18,${stickPulse * 0.4})`);
    ctx.fillStyle = stickGrad;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(200,170,100,${stickPulse + 0.08})`;
    ctx.stroke();

    // ── JUMP BUTTON — zampa stilizzata ──
    const jmpPulse = jmp.pressed ? 0.55 : (0.18 + Math.sin(t * 0.08) * 0.04);
    const jmpR = jmp.radius + (jmp.pressed ? 4 : 0);
    const jx = jmp.x;
    const jy = jmp.y;

    // Flash on tap
    if (jmp.flash > 0) {
        jmp.flash--;
        ctx.beginPath();
        ctx.arc(jx, jy, jmpR + 14, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,220,150,${jmp.flash * 0.06})`;
        ctx.fill();
    }

    // Cerchio base — tono ambra scuro, coerente col gioco
    ctx.beginPath();
    ctx.arc(jx, jy, jmpR, 0, Math.PI * 2);
    const jmpGrad = ctx.createRadialGradient(jx, jy, 0, jx, jy, jmpR);
    jmpGrad.addColorStop(0, `rgba(60,50,40,${jmpPulse + 0.12})`);
    jmpGrad.addColorStop(0.6, `rgba(40,35,28,${jmpPulse})`);
    jmpGrad.addColorStop(1, `rgba(25,22,18,${jmpPulse * 0.5})`);
    ctx.fillStyle = jmpGrad;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(200,170,100,${jmpPulse + 0.06})`;
    ctx.stroke();

    // Icona zampa di gatto — minimal, disegnata con path
    ctx.save();
    ctx.translate(jx, jy);
    const pawScale = jmp.pressed ? 1.15 : 1.0;
    ctx.scale(pawScale, pawScale);
    ctx.globalAlpha = jmp.pressed ? 0.95 : 0.6;

    const pawColor = 'rgba(255,220,150,0.85)';
    ctx.fillStyle = pawColor;

    // Cuscinetto centrale (grande, ovale)
    ctx.beginPath();
    ctx.ellipse(0, 4, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dita (4 cerchietti sopra)
    const toes = [
        { x: -10, y: -6, r: 5 },
        { x: -3.5, y: -11, r: 5.5 },
        { x: 4.5,  y: -11, r: 5.5 },
        { x: 11,  y: -6, r: 5 }
    ];
    for (const toe of toes) {
        ctx.beginPath();
        ctx.arc(toe.x, toe.y, toe.r, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();

    ctx.restore();
}

// ============================================
// DRAW LEVEL COMPLETE
// ============================================
function drawLevelComplete() {
    const t = CONFIG.levelTransitionTimer;
    const alpha = Math.min(1, t / 30);
    
    const vw = CONFIG.canvasWidth;
    const vh = CONFIG.canvasHeight;
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.85})`;
    ctx.fillRect(0, 0, vw, vh);
    
    if (t > 30) {
        const isBossFight = CONFIG.level === 5;
        const theme = getTheme();
        
        if (isBossFight) {
            // Effetto boss defeated — colori neon
            const blink = Math.sin(t * 0.15) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(80,180,255,${blink})`;
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('⚡ QUANTUM CAT SCONFITTO! ⚡', vw/2, vh/2 - 70);

            ctx.fillStyle = '#aaccff';
            ctx.font = '22px Arial';
            ctx.fillText('Il gatto è fuggito attraverso il portale!', vw/2, vh/2 - 20);

            ctx.fillStyle = '#997722';
            ctx.font = 'bold 24px Arial';
            ctx.fillText('Punteggio: ' + CONFIG.score, vw/2, vh/2 + 20);
        } else {
            ctx.fillStyle = '#44aa44';
            ctx.font = 'bold 50px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('LIVELLO COMPLETATO!', vw/2, vh/2 - 50);
            
            ctx.fillStyle = '#997722';
            ctx.font = '22px Arial';
            ctx.fillText('Punteggio: ' + CONFIG.score, vw/2, vh/2 + 5);
            
            if (CONFIG.level < CONFIG.maxLevel) {
                ctx.fillStyle = '#668899';
                ctx.font = '20px Arial';
                const nextTheme = (new LEVEL_REGISTRY[CONFIG.level + 1]()).theme;
                ctx.fillText('Prossimo: ' + nextTheme.name, vw/2, vh/2 + 40);
            }
        }
        
        if (t > 90) {
            ctx.fillStyle = '#555';
            ctx.font = '16px Arial';
            const contMsg = IS_MOBILE ? 'Tocca per continuare' : 'Premi SPAZIO per continuare';
            ctx.fillText(contMsg, vw/2, vh/2 + (isBossFight ? 75 : 75));
        }
        
        ctx.textAlign = 'left';
    }
}

// ============================================
// DRAW GAME WON
// ============================================
function drawGameWon() {
    const vw = CONFIG.canvasWidth;
    const vh = CONFIG.canvasHeight;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, vw, vh);
    
    // Stelle animate
    const starCount = 30;
    for (let i = 0; i < starCount; i++) {
        const sx = (Math.sin(CONFIG.time * 0.02 + i * 1.3) + 1) * vw / 2;
        const sy = (Math.cos(CONFIG.time * 0.015 + i * 0.9) + 1) * vh / 2;
        const salpha = 0.3 + Math.sin(CONFIG.time * 0.05 + i) * 0.2;
        ctx.fillStyle = `rgba(255, 220, 100, ${salpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.fillStyle = '#ffcc44';
    ctx.font = 'bold 55px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🐱 HAI VINTO! 🐱', vw/2, vh/2 - 50);
    
    ctx.fillStyle = '#aaaacc';
    ctx.font = '20px Arial';
    ctx.fillText('Il gatto è al sicuro!', vw/2, vh/2 + 5);
    
    ctx.fillStyle = '#997722';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Punteggio finale: ' + CONFIG.score, vw/2, vh/2 + 45);
    
    ctx.fillStyle = '#555';
    ctx.font = '16px Arial';
    const replayMsg = IS_MOBILE ? 'Tocca per rigiocare' : 'Premi SPAZIO o tocca per rigiocare';
    ctx.fillText(replayMsg, vw/2, vh/2 + 85);
    
    ctx.textAlign = 'left';
}

// ============================================
// DRAW GAME OVER
// ============================================
function drawGameOver() {
    const vw = CONFIG.canvasWidth;
    const vh = CONFIG.canvasHeight;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, vw, vh);
    
    ctx.fillStyle = '#aa2222';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', vw/2, vh/2 - 40);
    
    ctx.fillStyle = '#997722';
    ctx.font = '24px Arial';
    ctx.fillText('Punteggio: ' + CONFIG.score, vw/2, vh/2 + 20);
    
    ctx.fillStyle = '#668899';
    ctx.font = '16px Arial';
    ctx.fillText('Livello raggiunto: ' + CONFIG.level + ' - ' + getTheme().name, vw/2, vh/2 + 50);
    
    ctx.fillStyle = '#555';
    ctx.font = '18px Arial';
    const restartMsg = IS_MOBILE ? 'Tocca per ricominciare' : 'Premi SPAZIO o tocca per ricominciare';
    ctx.fillText(restartMsg, vw/2, vh/2 + 85);
    
    ctx.textAlign = 'left';
}

// ============================================
// NEXT LEVEL
// ============================================
function nextLevel() {
    CONFIG.level++;
    
    platforms = [];
    lamps = [];
    stars = [];
    particles = [];
    fireEscapes = [];
    foods = [];
    enemies = [];
    ghosts = [];
    cranes = [];
    snowflakes = [];
    steamParticles = [];
    lifePickups = [];
    magnetPickups = [];
    magnetTimer = 0;
    raindrops = [];
    rainSplashes = [];
    rivalCat = null;
    quantumCat = null;
    portals = [];
    portalBursts = [];
    quantumOrbs = [];
    catHoldsOrb = false;
    bossPortalSpawnTimer = 0;
    bossIntroTimer = 0;
    lifeSpawnTimer = 0;
    CONFIG.time = 0;
    CONFIG.levelTransition = false;
    CONFIG.levelTransitionTimer = 0;
    
    CONFIG.cameraX = 0;
    CONFIG.cameraY = 0;
    
    moon = new Moon();
    generateCity();
    
    // Spawn sicuro sul primo tetto
    const spawn = findSafeSpawn();
    cat.x = spawn.x;
    cat.y = spawn.y;
    cat.vx = 0;
    cat.vy = 0;
    cat.onGround = false;
}

// ============================================
// RESTART (dal livello 1)
// ============================================
function restart() {
    platforms = [];
    lamps = [];
    stars = [];
    particles = [];
    fireEscapes = [];
    foods = [];
    enemies = [];
    ghosts = [];
    cranes = [];
    snowflakes = [];
    steamParticles = [];
    lifePickups = [];
    magnetPickups = [];
    magnetTimer = 0;
    raindrops = [];
    rainSplashes = [];
    rivalCat = null;
    quantumCat = null;
    portals = [];
    portalBursts = [];
    quantumOrbs = [];
    catHoldsOrb = false;
    bossPortalSpawnTimer = 0;
    bossIntroTimer = 0;
    lifeSpawnTimer = 0;
    CONFIG.score = 0;
    CONFIG.time = 0;
    CONFIG.level = 1;
    CONFIG.levelTransition = false;
    CONFIG.levelTransitionTimer = 0;
    gameOver = false;
    gameWon = false;
    clickRestart = false;
    
    cat = new Cat(200, CONFIG.worldHeight - 150);
    moon = new Moon();
    generateCity();
    
    // Spawn sicuro sul primo tetto
    const spawn = findSafeSpawn();
    cat.x = spawn.x;
    cat.y = spawn.y;
    cat.spawnX = spawn.x;
    cat.spawnY = spawn.y;
}

// ============================================
// HELPER — clear canvas & reapply zoom transform
// ============================================
function _clearFrame() {
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(CONFIG.zoom * dpr, 0, 0, CONFIG.zoom * dpr, 0, 0);
}

// ============================================
// MAIN GAME LOOP
// ============================================
function gameLoop() {
    CONFIG.time++;

    // Easter egg level selector — pausa il gioco
    if (easterEggOpen) {
        _clearFrame();
        drawLevelSelector();
        // Easter egg timeout
        if (easterEggTimeout > 0) {
            easterEggTimeout--;
            if (easterEggTimeout <= 0) easterEggTaps = 0;
        }
        requestAnimationFrame(gameLoop);
        return;
    }

    // Game Over
    if (gameOver) {
        if (KEYS.space || clickRestart) {
            clickRestart = false;
            restart();
        }
        _clearFrame();
        drawGameOver();
        drawMobileControls();
        requestAnimationFrame(gameLoop);
        return;
    }
    
    // Game Won
    if (gameWon) {
        if (KEYS.space || clickRestart) {
            clickRestart = false;
            restart();
        }
        _clearFrame();
        drawGameWon();
        drawMobileControls();
        requestAnimationFrame(gameLoop);
        return;
    }
    
    // Level transition
    if (CONFIG.levelTransition) {
        CONFIG.levelTransitionTimer++;
        _clearFrame();
        drawLevelComplete();
        drawMobileControls();
        
        if (CONFIG.levelTransitionTimer > 90 && (KEYS.space || clickRestart)) {
            clickRestart = false;
            if (CONFIG.level < CONFIG.maxLevel) {
                nextLevel();
            } else {
                gameWon = true;
            }
        }
        requestAnimationFrame(gameLoop);
        return;
    }

    // Update
    cat.update(platforms);
    updateCamera();
    
    for (const lamp of lamps) lamp.update();
    for (const star of stars) star.update();
    for (const particle of particles) particle.update();
    for (const food of foods) food.update();
    for (const enemy of enemies) enemy.update(cat, platforms);
    for (const ghost of ghosts) ghost.update();
    for (const lp of lifePickups) lp.update();
    for (const mp of magnetPickups) mp.update();
    for (const crane of cranes) crane.update();
    for (const sf of snowflakes) sf.update();
    for (const sp of steamParticles) sp.update();
    
    // Pioggia update (rain drops tick every frame; splash management is in Level4.updateExtras)
    for (const rd of raindrops) rd.update();
    
    // (rival cat update is handled by Level4.updateExtras)
    
    // ── Level-specific extras update (rivals, boss fight, portals…) ──
    if (currentLevel) {
        const extras = currentLevel.updateExtras({
            cat, ghosts, portals, portalBursts, quantumOrbs, catHoldsOrb,
            KEYS, CONFIG, CatAudio
        });
        if (extras.gameOver)        gameOver = true;
        if (extras.levelTransition) {
            CONFIG.levelTransition = true;
            CONFIG.levelTransitionTimer = 0;
        }
        if (extras.score)           CONFIG.score += extras.score;
        if (typeof extras.catHoldsOrb !== 'undefined') catHoldsOrb = extras.catHoldsOrb;
    }
    
    // Pulisci fantasmi esauriti
    for (let i = ghosts.length - 1; i >= 0; i--) {
        if (!ghosts[i].active) ghosts.splice(i, 1);
    }
    
    // Pulisci vite scadute
    for (let i = lifePickups.length - 1; i >= 0; i--) {
        if (!lifePickups[i].active) lifePickups.splice(i, 1);
    }
    // Pulisci calamite scadute
    for (let i = magnetPickups.length - 1; i >= 0; i--) {
        if (!magnetPickups[i].active) magnetPickups.splice(i, 1);
    }
    
    // Spawn vite + calamite a tempo
    lifeSpawnTimer++;
    const spawnInterval = Math.max(400, 900 - CONFIG.level * 100);
    if (lifeSpawnTimer >= spawnInterval) {
        lifeSpawnTimer = 0;
        if (cat.lives < 9) spawnLifePickup();
        // Calamita: 45% di probabilità, indipendente dal numero di vite
        if (Math.random() < 0.45) spawnMagnetPickup();
    }
    
    // Check life pickup collection
    for (const lp of lifePickups) {
        if (lp.active && lp.checkCollision(cat)) {
            if (cat.lives < 9) {
                cat.lives++;
                lp.active = false;
                CatAudio.play('heart', 0.4);
            }
        }
    }

    // Check magnet pickup collection
    for (const mp of magnetPickups) {
        if (mp.active && mp.checkCollision(cat)) {
            magnetTimer = 600; // 10 secondi @ 60fps
            mp.active = false;
            CatAudio.play('sfx_point', 0.35);
        }
    }

    // Magnet attraction — attrae il cibo non raccolto verso il gatto
    if (magnetTimer > 0 && CONFIG.level !== 5) {
        magnetTimer--;
        const MAGNET_RANGE  = 120;  // ~altezza tra piattaforme
        const MAGNET_SPEED  = 7;
        const catCX = cat.x + cat.width  / 2;
        const catCY = cat.y + cat.height / 2;
        for (const food of foods) {
            if (food.collected) continue;
            const foodCX = food.x + food.width  / 2;
            const foodCY = food.y + food.height / 2;
            const dx = catCX - foodCX;
            const dy = catCY - foodCY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < MAGNET_RANGE && dist > 1) {
                const speed = MAGNET_SPEED * (1 - dist / MAGNET_RANGE) + 1;
                food.x += (dx / dist) * speed;
                food.y += (dy / dist) * speed;
                // Auto-collect when close enough
                if (dist < 18) {
                    food.collect();
                    CatAudio.play('sfx_point', 0.2);
                }
            }
        }
    }
    
    // Check food collection (non in boss fight)
    if (CONFIG.level !== 5) {
        for (const food of foods) {
            if (food.checkCollision(cat)) {
                food.collect();
                CatAudio.play('sfx_point', 0.2);
            }
        }
    
        // Check se tutto il cibo è raccolto → livello completato!
        const remainingFood = foods.filter(f => !f.collected).length;
        if (remainingFood === 0 && foods.length > 0) {
            CONFIG.levelTransition = true;
            CONFIG.levelTransitionTimer = 0;
            // Bonus punti per completamento livello
            CONFIG.score += CONFIG.level * 100;
        }
    }
    
    // Check enemy collision
    for (const enemy of enemies) {
        if (enemy.checkCollisionWithCat(cat)) {
            if (cat.takeDamage()) {
                // Crea fantasma
                ghosts.push(new GhostCat(cat.x + cat.width/2, cat.y));
                
                // Knockback
                cat.vy = -8;
                cat.vx = (cat.x > enemy.x) ? 6 : -6;
                CatAudio.play('ouch', 0.45);

                // Game over?
                if (cat.lives <= 0) {
                    gameOver = true;
                }
            }
        }
    }
    
    // Check rival cat collision (Livello 4)
    if (rivalCat && rivalCat.checkCollisionWithCat(cat)) {
        if (cat.takeDamage()) {
            ghosts.push(new GhostCat(cat.x + cat.width/2, cat.y));
            cat.vy = -8;
            cat.vx = (cat.x > rivalCat.x) ? 6 : -6;
            CatAudio.play('ouch', 0.45);
            // Il gatto rivale si ferma 5 secondi dopo aver colpito
            rivalCat.pauseTimer = 300;
            if (cat.lives <= 0) {
                gameOver = true;
            }
        }
    }

    // Draw — clear & reapply zoom transform
    _clearFrame();
    
    drawBackground();
    
    ctx.save();
    ctx.translate(-CONFIG.cameraX, -CONFIG.cameraY);
    
    // Ground
    for (const p of platforms) {
        if (p.type === 'ground') p.draw(ctx);
    }
    
    // Buildings
    for (const p of platforms) {
        if (p.type === 'building') p.draw(ctx);
    }
    
    // Fire escapes
    for (const fe of fireEscapes) fe.draw(ctx);
    
    // Cranes (gru da cantiere)
    for (const crane of cranes) crane.draw(ctx);
    
    // Lamps (struttura)
    for (const lamp of lamps) lamp.draw(ctx);
    
    // Other platforms (dumpsters, barriers, railings, etc.)
    for (const p of platforms) {
        if (p.type !== 'building' && p.type !== 'ground' && p.type !== 'fire-escape') {
            p.draw(ctx);
        }
    }
    
    // Life pickups
    for (const lp of lifePickups) lp.draw(ctx);
    
    // Magnet pickups
    for (const mp of magnetPickups) mp.draw(ctx);
    
    // Food
    for (const food of foods) food.draw(ctx);
    
    // Particles
    for (const particle of particles) particle.draw(ctx);
    
    // Steam particles (vapore dai comignoli)
    for (const sp of steamParticles) sp.draw(ctx);
    
    // Snowflakes (neve livello 3)
    for (const sf of snowflakes) sf.draw(ctx);
    
    // Pioggia (livello 4)
    for (const rd of raindrops) rd.draw(ctx);
    for (const rs of rainSplashes) rs.draw(ctx);
    
    // Level-specific actors (rival, portals, orbs, boss)
    if (currentLevel) currentLevel.drawExtras(ctx);
    
    // Enemies
    for (const enemy of enemies) enemy.draw(ctx);
    
    // Cat
    cat.draw(ctx);

    // Calamita attiva — icona sulla testa del gatto
    if (magnetTimer > 0) {
        const t = CONFIG.time;
        const headX = cat.x + cat.width  / 2;
        const headY = cat.y - 6;
        const pulse = 0.8 + Math.sin(t * 0.18) * 0.2;
        const pct   = magnetTimer / 600;

        // Glow azzurro-ciano attorno alla testa
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const glowR = 28 + Math.sin(t * 0.1) * 4;
        const glowG = ctx.createRadialGradient(headX, headY - 12, 0, headX, headY - 12, glowR);
        glowG.addColorStop(0, `rgba(80,220,255,${pulse * 0.30})`);
        glowG.addColorStop(1, 'transparent');
        ctx.fillStyle = glowG;
        ctx.beginPath();
        ctx.arc(headX, headY - 12, glowR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Disegna la calamita sopra la testa
        ctx.save();
        ctx.translate(headX, headY - 22);
        ctx.globalAlpha = 0.9 * pulse;
        _drawMagnetIcon(ctx, 0, 0, 11);
        ctx.globalAlpha = 1;

        // Barra timer sotto la calamita
        const bw = 26;
        const bh = 3;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-bw / 2, 14, bw, bh);
        const barColor = pct > 0.35 ? '#22ddff' : '#ff8833';
        ctx.fillStyle = barColor;
        ctx.fillRect(-bw / 2, 14, bw * pct, bh);
        ctx.restore();
    }

    // Orb tenuta dal gatto (livello 5)
    if (CONFIG.level === 5 && catHoldsOrb) {
        const t = CONFIG.time;
        const cx = cat.x + cat.width / 2;
        const cy = cat.y - 10;
        const pulse = 0.7 + Math.sin(t * 0.15) * 0.3;
        ctx.shadowBlur = 14;
        ctx.shadowColor = 'rgba(80,200,255,0.9)';
        const og = ctx.createRadialGradient(cx, cy, 0, cx, cy, 10);
        og.addColorStop(0, 'rgba(200,240,255,1)');
        og.addColorStop(0.4, `rgba(80,200,255,${pulse})`);
        og.addColorStop(1, 'transparent');
        ctx.fillStyle = og;
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    
    // === LAMP LIGHTING: illuminazione naturale ===
    drawLampLighting();
    
    // === CAT LIGHT: il gatto illumina la scena ===
    drawCatLight();
    
    // Ghosts (sopra tutto)
    for (const ghost of ghosts) ghost.draw(ctx);
    
    ctx.restore();

    // Vignette — centrata sul gatto (in screen space)
    const vw = CONFIG.canvasWidth;
    const vh = CONFIG.canvasHeight;
    const catScreenX = cat ? (cat.x + cat.width  / 2 - CONFIG.cameraX) : vw / 2;
    const catScreenY = cat ? (cat.y + cat.height / 2 - CONFIG.cameraY) : vh / 2;
    const vigRadius  = Math.max(vw, vh) * 0.85;
    const vignette = ctx.createRadialGradient(
        catScreenX, catScreenY, vigRadius * 0.2,
        catScreenX, catScreenY, vigRadius
    );
    vignette.addColorStop(0, 'transparent');
    vignette.addColorStop(0.55, 'rgba(0, 0, 0, 0.25)');
    vignette.addColorStop(1,    'rgba(0, 0, 0, 0.80)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, vw, vh);
    
    // UI
    drawUI();
    drawMinimap();
    
    // Boss health bar (Livello 5)
    if (CONFIG.level === 5 && quantumCat) {
        quantumCat.drawHealthBar(ctx);
    }

    // Boss intro overlay (Livello 5)
    if (CONFIG.level === 5 && bossIntroTimer > 0) {
        drawBossIntro(ctx);
    }
    // Boss persistent HUD hint (piccolo, dopo intro)
    else if (CONFIG.level === 5 && quantumCat && !quantumCat.defeated && bossIntroTimer <= 0) {
        drawBossHint(ctx);
    }
    
    drawMobileControls();

    // Easter egg timeout
    if (easterEggTimeout > 0) {
        easterEggTimeout--;
        if (easterEggTimeout <= 0) easterEggTaps = 0;
    }

    requestAnimationFrame(gameLoop);
}

// ============================================
// LIFE PICKUPS - Vite a tempo
// ============================================
class LifePickup {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 24;
        this.active = true;
        this.lifetime = 600; // ~10 secondi a 60fps
        this.timer = 0;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.spawnTime = CONFIG.time;
    }
    
    update() {
        if (!this.active) return;
        this.timer++;
        this.bobOffset += 0.08;
        
        // Scade dopo il tempo
        if (this.timer >= this.lifetime) {
            this.active = false;
        }
    }
    
    draw(ctx) {
        if (!this.active) return;
        
        const remaining = this.lifetime - this.timer;
        const bobY = Math.sin(this.bobOffset) * 4;
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2 + bobY;
        
        // Lampeggia quando sta per scomparire
        if (remaining < 150 && Math.floor(this.timer / 8) % 2 === 0) return;
        
        // Glow pulsante rosa/rosso
        const pulse = 0.5 + Math.sin(this.bobOffset * 2) * 0.3;
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40);
        glow.addColorStop(0, `rgba(255, 80, 80, ${pulse * 0.4})`);
        glow.addColorStop(0.4, `rgba(255, 50, 50, ${pulse * 0.2})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, 40, 0, Math.PI * 2);
        ctx.fill();
        
        // Cuore
        const s = 1 + Math.sin(this.bobOffset * 2) * 0.1; // Pulsazione
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(s, s);
        
        ctx.fillStyle = '#dd3333';
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.bezierCurveTo(-2, 0, -10, -2, -10, -7);
        ctx.bezierCurveTo(-10, -12, -5, -14, 0, -10);
        ctx.bezierCurveTo(5, -14, 10, -12, 10, -7);
        ctx.bezierCurveTo(10, -2, 2, 0, 0, 4);
        ctx.fill();
        
        // Riflesso
        ctx.fillStyle = 'rgba(255, 150, 150, 0.5)';
        ctx.beginPath();
        ctx.ellipse(-4, -8, 3, 2, -0.4, 0, Math.PI * 2);
        ctx.fill();
        
        // Croce bianca (simbolo vita)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(-1.5, -9, 3, 7);
        ctx.fillRect(-3.5, -7, 7, 3);
        
        ctx.restore();
        
        // Barra tempo rimanente
        const barW = 20;
        const barH = 3;
        const barX = cx - barW / 2;
        const barY = cy + 16;
        const pct = remaining / this.lifetime;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barW, barH);
        
        const barColor = pct > 0.3 ? '#44cc44' : '#cc4444';
        ctx.fillStyle = barColor;
        ctx.fillRect(barX, barY, barW * pct, barH);
    }
    
    checkCollision(cat) {
        return cat.x < this.x + this.width &&
               cat.x + cat.width > this.x &&
               cat.y < this.y + this.height &&
               cat.y + cat.height > this.y;
    }
}

// ============================================
// MAGNET PICKUP - Calamita: attrae il cibo vicino
// ============================================

/** Helper: disegna un'icona di calamita a U centrata in (cx, cy) con raggio r */
function _drawMagnetIcon(ctx, cx, cy, r) {
    // U shape
    ctx.lineWidth = r * 0.32;
    ctx.lineCap   = 'round';
    ctx.strokeStyle = '#cc2233';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.62, Math.PI, 0);
    ctx.stroke();
    // Left arm
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.62, cy);
    ctx.lineTo(cx - r * 0.62, cy + r * 0.55);
    ctx.stroke();
    // Right arm
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.62, cy);
    ctx.lineTo(cx + r * 0.62, cy + r * 0.55);
    ctx.stroke();
    // Pole tips — alternating red/blue
    ctx.fillStyle = '#cc2233';
    ctx.beginPath();
    ctx.arc(cx - r * 0.62, cy + r * 0.55, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2255cc';
    ctx.beginPath();
    ctx.arc(cx + r * 0.62, cy + r * 0.55, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
}

class MagnetPickup {
    constructor(x, y) {
        this.x        = x;
        this.y        = y;
        this.width    = 26;
        this.height   = 26;
        this.active   = true;
        this.lifetime = 600;   // 10 sec
        this.timer    = 0;
        this.bobOffset = Math.random() * Math.PI * 2;
    }

    update() {
        if (!this.active) return;
        this.timer++;
        this.bobOffset += 0.07;
        if (this.timer >= this.lifetime) this.active = false;
    }

    draw(ctx) {
        if (!this.active) return;

        const remaining = this.lifetime - this.timer;
        if (remaining < 150 && Math.floor(this.timer / 8) % 2 === 0) return;

        const bobY = Math.sin(this.bobOffset) * 4;
        const cx   = this.x + this.width  / 2;
        const cy   = this.y + this.height / 2 + bobY;
        const pulse = 0.5 + Math.sin(this.bobOffset * 2) * 0.3;

        // Glow ciano
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 38);
        glow.addColorStop(0,   `rgba(40, 210, 255, ${pulse * 0.45})`);
        glow.addColorStop(0.4, `rgba(20, 160, 220, ${pulse * 0.20})`);
        glow.addColorStop(1,   'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, 38, 0, Math.PI * 2);
        ctx.fill();

        // Field lines (4 archi concentrici verso il basso)
        ctx.save();
        ctx.translate(cx, cy);
        for (let i = 1; i <= 3; i++) {
            const fr = 7 + i * 6;
            const fa = 0.22 - i * 0.05;
            ctx.strokeStyle = `rgba(40,200,255,${fa * pulse})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 4, fr, 0.1, Math.PI - 0.1);
            ctx.stroke();
        }

        // Icona calamita
        _drawMagnetIcon(ctx, 0, -2, 11);
        ctx.restore();

        // Timer bar
        const bw  = 22;
        const bh  = 3;
        const bx  = cx - bw / 2;
        const by  = cy + 16;
        const pct = remaining / this.lifetime;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = pct > 0.3 ? '#22ddff' : '#ff8833';
        ctx.fillRect(bx, by, bw * pct, bh);
    }

    checkCollision(cat) {
        return cat.x < this.x + this.width  &&
               cat.x + cat.width  > this.x  &&
               cat.y < this.y + this.height &&
               cat.y + cat.height > this.y;
    }
}

function spawnMagnetPickup() {
    if (CONFIG.level === 5) return; // non usata nell'arena boss
    const locations = [];

    for (let i = 1; i < currentBuildingData.length; i++) {
        const b = currentBuildingData[i];
        locations.push({
            x: b.x + 30 + Math.random() * (b.width - 60),
            y: CONFIG.worldHeight - 50 - b.height - 30
        });
    }
    for (const fe of fireEscapes) {
        for (const p of fe.getPlatforms()) {
            locations.push({ x: p.x + 10 + Math.random() * 30, y: p.y - 30 });
        }
    }
    for (let x = 400; x < CONFIG.worldWidth - 300; x += 600) {
        let tooClose = false;
        for (const e of enemies) {
            if (Math.abs(e.x - x) < 200) { tooClose = true; break; }
        }
        if (!tooClose) locations.push({ x, y: CONFIG.worldHeight - 75 });
    }

    if (locations.length > 0) {
        const loc = locations[Math.floor(Math.random() * locations.length)];
        magnetPickups.push(new MagnetPickup(loc.x, loc.y));
    }
}

function spawnLifePickup() {
    // Genera in posizioni raggiungibili: tetti, scale antincendio, o a terra
    const locations = [];
    
    // Tetti degli edifici (escluso il primo - spawn)
    for (let i = 1; i < currentBuildingData.length; i++) {
        const b = currentBuildingData[i];
        locations.push({
            x: b.x + 30 + Math.random() * (b.width - 60),
            y: CONFIG.worldHeight - 50 - b.height - 30
        });
    }
    
    // Scale antincendio
    for (const fe of fireEscapes) {
        for (const p of fe.getPlatforms()) {
            locations.push({
                x: p.x + 10 + Math.random() * 30,
                y: p.y - 30
            });
        }
    }
    
    // A terra (lontano dagli enemy)
    for (let x = 400; x < CONFIG.worldWidth - 300; x += 500) {
        let tooClose = false;
        for (const e of enemies) {
            if (Math.abs(e.x - x) < 200) { tooClose = true; break; }
        }
        if (!tooClose) {
            locations.push({ x: x, y: CONFIG.worldHeight - 75 });
        }
    }
    
    if (locations.length > 0) {
        const loc = locations[Math.floor(Math.random() * locations.length)];
        lifePickups.push(new LifePickup(loc.x, loc.y));
    }
}

// ============================================
// BOSS INTRO OVERLAY + HUD HINT (Livello 5)
// ============================================
function drawBossIntro(ctx) {
    const t = CONFIG.time;
    const vw = CONFIG.canvasWidth;
    const vh = CONFIG.canvasHeight;

    // Fade in/out dell'overlay
    const progress = 1 - (bossIntroTimer / 300);  // 0 → 1
    const fadeAlpha = progress < 0.1
        ? progress / 0.1
        : (progress > 0.85 ? (1 - progress) / 0.15 : 1);

    ctx.fillStyle = `rgba(0, 0, 10, ${fadeAlpha * 0.82})`;
    ctx.fillRect(0, 0, vw, vh);

    if (bossIntroTimer < 270) {
        const a = Math.min(1, (270 - bossIntroTimer) / 20) * fadeAlpha;

        // Titolo boss
        const pulse = Math.sin(t * 0.12) * 0.15 + 0.85;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.shadowBlur = 30;
        ctx.shadowColor = 'rgba(80,160,255,0.9)';
        ctx.fillStyle = '#88ccff';
        ctx.font = `bold ${IS_MOBILE ? 28 : 40}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('⚡ QUANTUM CAT ⚡', vw / 2, vh / 2 - 80);
        ctx.shadowBlur = 0;

        // Sottotitolo
        ctx.fillStyle = '#aaaacc';
        ctx.font = `${IS_MOBILE ? 13 : 17}px Arial`;
        ctx.fillText('Il boss finale ti sfida in un\'arena quantistica', vw / 2, vh / 2 - 42);

        // 3 istruzioni chiave
        const tips = [
            { icon: '🔵', text: 'Raccogli le ORB che brillano nell\'arena' },
            { icon: '🎯', text: IS_MOBILE ? 'Premi SALTO per lanciare l\'orb verso il boss' : 'Premi SPAZIO per lanciare l\'orb verso il boss' },
            { icon: '💙', text: 'Colpisci 9 volte per sconfiggerlo — poi entra nel portale!' }
        ];
        const tipY = vh / 2 + 0;
        for (let i = 0; i < tips.length; i++) {
            const tip = tips[i];
            const ty = tipY + i * (IS_MOBILE ? 30 : 38);
            ctx.fillStyle = 'rgba(60,120,200,0.25)';
            ctx.beginPath();
            ctx.roundRect(vw / 2 - (IS_MOBILE ? 180 : 260), ty - 18, IS_MOBILE ? 360 : 520, IS_MOBILE ? 26 : 30, 6);
            ctx.fill();
            ctx.fillStyle = '#ccddff';
            ctx.font = `${IS_MOBILE ? 12 : 15}px Arial`;
            ctx.fillText(`${tip.icon}  ${tip.text}`, vw / 2, ty);
        }

        // Countdown
        const secs = Math.ceil(bossIntroTimer / 60);
        ctx.fillStyle = `rgba(100,160,255,${pulse * a})`;
        ctx.font = `bold ${IS_MOBILE ? 14 : 18}px Arial`;
        ctx.fillText(`Inizia tra ${secs}...`, vw / 2, tipY + tips.length * (IS_MOBILE ? 30 : 38) + 30);

        ctx.restore();
        ctx.textAlign = 'left';
    }
}

function drawBossHint(ctx) {
    if (!quantumCat) return;
    const t = CONFIG.time;
    const vw = CONFIG.canvasWidth;
    // Piccolo promemoria in basso a destra (scompare dopo 600 frame ~ 10 sec)
    const displayTime = 600;
    const elapsed = t - 300; // parte dopo l'intro
    if (elapsed > displayTime) return;

    const fade = elapsed > displayTime - 60 ? (displayTime - elapsed) / 60 : 1;

    ctx.save();
    ctx.globalAlpha = fade * 0.7;
    const msg = catHoldsOrb
        ? (IS_MOBILE ? '🎯 Premi SALTO per lanciare!' : '🎯 Mira e premi SPAZIO per lanciare!')
        : '🔵 Raccogli un\'ORB e lancia verso il boss!';
    const hintW = IS_MOBILE ? 240 : 340;
    const hintH = IS_MOBILE ? 26 : 30;
    const hx = vw - hintW - 10;
    const hy = IS_MOBILE ? 60 : 70;

    ctx.fillStyle = 'rgba(0,10,30,0.8)';
    ctx.beginPath();
    ctx.roundRect(hx, hy, hintW, hintH, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,120,255,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#99bbff';
    ctx.font = `${IS_MOBILE ? 10 : 12}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(msg, hx + hintW / 2, hy + (IS_MOBILE ? 17 : 19));
    ctx.textAlign = 'left';
    ctx.restore();
}

// ============================================
// EASTER EGG — LEVEL SELECTOR
// ============================================
function goToLevel(lvl) {
    platforms = [];
    lamps = [];
    stars = [];
    particles = [];
    fireEscapes = [];
    foods = [];
    enemies = [];
    ghosts = [];
    cranes = [];
    snowflakes = [];
    steamParticles = [];
    lifePickups = [];
    raindrops = [];
    rainSplashes = [];
    rivalCat = null;
    quantumCat = null;
    portals = [];
    portalBursts = [];
    quantumOrbs = [];
    catHoldsOrb = false;
    bossPortalSpawnTimer = 0;
    bossIntroTimer = 0;
    lifeSpawnTimer = 0;
    CONFIG.time = 0;
    CONFIG.level = lvl;
    CONFIG.levelTransition = false;
    CONFIG.levelTransitionTimer = 0;
    gameOver = false;
    gameWon = false;
    easterEggOpen = false;

    CONFIG.cameraX = 0;
    CONFIG.cameraY = 0;

    cat = new Cat(200, CONFIG.worldHeight - 150);
    moon = new Moon();
    generateCity();

    const spawn = findSafeSpawn();
    cat.x = spawn.x;
    cat.y = spawn.y;
    cat.spawnX = spawn.x;
    cat.spawnY = spawn.y;
}

function drawLevelSelector() {
    const vw = CONFIG.canvasWidth;
    const vh = CONFIG.canvasHeight;

    // --- Panel dimensions ---
    const panelW = Math.min(vw - 32, 480);
    const panelH = 280;
    const panelX = (vw - panelW) / 2;
    const panelY = (vh - panelH) / 2;

    // Backdrop blur overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
    ctx.fillRect(0, 0, vw, vh);

    // Panel background
    const panelGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    panelGrad.addColorStop(0, 'rgba(18, 18, 36, 0.98)');
    panelGrad.addColorStop(1, 'rgba(10, 10, 24, 0.98)');
    ctx.fillStyle = panelGrad;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 16);
    ctx.fill();

    // Panel border (animated neon glow)
    const t = (Date.now() / 1000);
    const glowAlpha = 0.5 + 0.3 * Math.sin(t * 2);
    ctx.strokeStyle = `rgba(255, 200, 60, ${glowAlpha})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255, 200, 60, 0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 16);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Title
    ctx.fillStyle = '#ffcc44';
    ctx.font = `bold ${Math.round(panelW * 0.058)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('🐱  SCEGLI LIVELLO', vw / 2, panelY + 44);

    // Thin divider under title
    ctx.strokeStyle = 'rgba(255, 200, 60, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 24, panelY + 56);
    ctx.lineTo(panelX + panelW - 24, panelY + 56);
    ctx.stroke();

    // --- Button grid: row1 = LV1 LV2 LV3, row2 = LV4 LV5 (centered) ---
    const levels = Object.keys(LEVEL_REGISTRY).map(Number); // [1,2,3,4,5]

    // Level accent colors for each theme
    const LEVEL_COLORS = {
        1: { main: '#f59e42', glow: 'rgba(245,158,66,0.35)' },
        2: { main: '#4caf91', glow: 'rgba(76,175,145,0.35)' },
        3: { main: '#e05c5c', glow: 'rgba(224,92,92,0.35)' },
        4: { main: '#9b7de8', glow: 'rgba(155,125,232,0.35)' },
        5: { main: '#44aaff', glow: 'rgba(68,170,255,0.35)' }
    };

    const row1 = levels.slice(0, 3); // [1,2,3]
    const row2 = levels.slice(3);    // [4,5]

    const gap = 12;
    const btnH = 62;
    const row1Y = panelY + 72;
    const row2Y = row1Y + btnH + gap;

    const buttons = [];

    const drawRow = (rowLevels, rowY) => {
        const btnW = Math.floor((panelW - gap * (rowLevels.length + 1)) / rowLevels.length);
        const rowTotalW = rowLevels.length * btnW + (rowLevels.length - 1) * gap;
        const rowStartX = panelX + (panelW - rowTotalW) / 2;

        for (let i = 0; i < rowLevels.length; i++) {
            const lvl = rowLevels[i];
            const theme = (new LEVEL_REGISTRY[lvl]()).theme;
            const accent = LEVEL_COLORS[lvl];
            const bx = rowStartX + i * (btnW + gap);
            const isCurrent = lvl === CONFIG.level;

            // Button background
            ctx.fillStyle = isCurrent ? `rgba(${hexToRgb(accent.main)}, 0.22)` : 'rgba(30, 30, 50, 0.8)';
            ctx.beginPath();
            ctx.roundRect(bx, rowY, btnW, btnH, 10);
            ctx.fill();

            // Button border
            if (isCurrent) {
                ctx.strokeStyle = accent.main;
                ctx.lineWidth = 2;
                ctx.shadowColor = accent.main;
                ctx.shadowBlur = 10;
            } else {
                ctx.strokeStyle = 'rgba(255,255,255,0.12)';
                ctx.lineWidth = 1.5;
                ctx.shadowBlur = 0;
            }
            ctx.beginPath();
            ctx.roundRect(bx, rowY, btnW, btnH, 10);
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Color dot
            ctx.fillStyle = accent.main;
            ctx.beginPath();
            ctx.arc(bx + 14, rowY + 18, 5, 0, Math.PI * 2);
            ctx.fill();

            // Level number
            ctx.fillStyle = isCurrent ? accent.main : '#ccccdd';
            ctx.font = 'bold 15px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('LV.' + lvl, bx + btnW / 2, rowY + 26);

            // Level name
            ctx.fillStyle = isCurrent ? '#ffffff' : '#8888aa';
            ctx.font = '12px Arial';
            ctx.fillText(theme.name, bx + btnW / 2, rowY + 47);

            // "IN GIOCO" badge
            if (isCurrent) {
                const badgeW = 56;
                const badgeH = 16;
                const badgeX = bx + btnW - badgeW - 6;
                const badgeY = rowY + 5;
                ctx.fillStyle = accent.main;
                ctx.beginPath();
                ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.font = 'bold 9px Arial';
                ctx.fillText('IN GIOCO', badgeX + badgeW / 2, badgeY + 11);
            }

            buttons.push({ lvl, x: bx, y: rowY, w: btnW, h: btnH });
        }
    };

    drawRow(row1, row1Y);
    drawRow(row2, row2Y);

    // Close hint
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(120,120,140,0.7)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    const closeMsg = IS_MOBILE ? '✕  Tocca fuori per chiudere' : '✕  ESC o clicca fuori per chiudere';
    ctx.fillText(closeMsg, vw / 2, panelY + panelH - 14);

    ctx.textAlign = 'left';

    // Save for hit-test
    drawLevelSelector._buttons = buttons;
    drawLevelSelector._panelX = panelX;
    drawLevelSelector._panelY = panelY;
    drawLevelSelector._panelW = panelW;
    drawLevelSelector._panelH = panelH;
}

// Helper: convert hex color to "r,g,b" string for rgba()
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
}

function handleLevelSelectorClick(cx, cy) {
    if (!drawLevelSelector._buttons) return false;
    for (const btn of drawLevelSelector._buttons) {
        if (cx >= btn.x && cx <= btn.x + btn.w &&
            cy >= btn.y && cy <= btn.y + btn.h) {
            goToLevel(btn.lvl);
            return true;
        }
    }
    // Click fuori dal pannello → chiudi
    const px = drawLevelSelector._panelX || 0;
    const py = drawLevelSelector._panelY || 0;
    const pw = drawLevelSelector._panelW || CONFIG.canvasWidth;
    const ph = drawLevelSelector._panelH || CONFIG.canvasHeight;
    if (cx < px || cx > px + pw || cy < py || cy > py + ph) {
        easterEggOpen = false;
    }
    return true;
}

// ============================================
// INIT
// ============================================
function findSafeSpawn() {
    // Trova il primo edificio e spawna il gatto sul tetto
    // dove i cani non possono raggiungerlo
    if (currentBuildingData.length > 0) {
        const b = currentBuildingData[0];
        const roofY = CONFIG.worldHeight - 50 - b.height - 35;
        return { x: b.x + 40, y: roofY };
    }
    return { x: 200, y: CONFIG.worldHeight - 150 };
}

function init() {
    setupInput();
    
    // Crea il gatto temporaneamente, la posizione verrà aggiornata dopo generateCity
    cat = new Cat(200, CONFIG.worldHeight - 150);
    moon = new Moon();
    
    generateCity();
    
    // Spawna il gatto in posizione sicura (sul primo tetto)
    const spawn = findSafeSpawn();
    cat.x = spawn.x;
    cat.y = spawn.y;
    cat.spawnX = spawn.x;
    cat.spawnY = spawn.y;
    
    // Click/touch per ricominciare alla sconfitta/vittoria + easter egg
    canvas.addEventListener('click', (e) => {
        CatAudio.init();
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) / CONFIG.zoom;
        const my = (e.clientY - rect.top) / CONFIG.zoom;

        // Sound toggle button
        const sbr = _soundBtnRect();
        if (mx >= sbr.x && mx <= sbr.x + sbr.w && my >= sbr.y && my <= sbr.y + sbr.h) {
            CatAudio.setEnabled(!CatAudio.isEnabled());
            return;
        }

        // Easter egg level selector aperto → gestisci click bottoni
        if (easterEggOpen) {
            handleLevelSelectorClick(mx, my);
            return;
        }

        // Easter egg: 5 click in alto a destra (area 80×80)
        const cornerSize = 80;
        if (mx > CONFIG.canvasWidth - cornerSize && my < cornerSize) {
            easterEggTaps++;
            easterEggTimeout = 180; // 3 secondi per completare i 5 tap
            if (easterEggTaps >= 5) {
                easterEggOpen = true;
                easterEggTaps = 0;
            }
            return;
        } else {
            easterEggTaps = 0;
        }

        if (gameOver || gameWon || CONFIG.levelTransition) {
            clickRestart = true;
        }
    });
    canvas.addEventListener('touchend', (e) => {
        CatAudio.init();
        if (e.changedTouches.length > 0) {
            const rect = canvas.getBoundingClientRect();
            const touch = e.changedTouches[0];
            const mx = (touch.clientX - rect.left) / CONFIG.zoom;
            const my = (touch.clientY - rect.top) / CONFIG.zoom;

            // Sound toggle button
            const sbr = _soundBtnRect();
            if (mx >= sbr.x && mx <= sbr.x + sbr.w && my >= sbr.y && my <= sbr.y + sbr.h) {
                CatAudio.setEnabled(!CatAudio.isEnabled());
                return;
            }

            if (easterEggOpen) {
                handleLevelSelectorClick(mx, my);
                e.preventDefault();
                return;
            }

            const cornerSize = 80;
            if (mx > CONFIG.canvasWidth - cornerSize && my < cornerSize) {
                easterEggTaps++;
                easterEggTimeout = 180;
                if (easterEggTaps >= 5) {
                    easterEggOpen = true;
                    easterEggTaps = 0;
                }
                e.preventDefault();
                return;
            } else {
                easterEggTaps = 0;
            }
        }

        if (gameOver || gameWon || CONFIG.levelTransition) {
            clickRestart = true;
            e.preventDefault();
        }
    });

    // ESC chiude il level selector
    window.addEventListener('keydown', (e) => {
        CatAudio.init();
        if (e.key === 'Escape' && easterEggOpen) {
            easterEggOpen = false;
        }
    });
    
    // Mobile touch controls
    setupMobileControls();

    gameLoop();
}

window.addEventListener('load', init);
