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
let raindrops = [];
let rainSplashes = [];
let rivalCat = null;
let lifeSpawnTimer = 0;
let gameOver = false;
let gameWon = false;
let clickRestart = false;

// Easter egg — level selector
let easterEggTaps = 0;
let easterEggTimeout = 0;
let easterEggOpen = false;

// ============================================
// LEVEL THEMES
// ============================================
const LEVEL_THEMES = {
    1: {
        name: 'Il Vicolo',
        skyTop: '#030308',
        skyMid: '#080812',
        skyBot: '#0e0e18',
        buildingBase: '#141420',
        buildingLight: '#181825',
        groundColor: '#131316',
        lampColor: { r: 220, g: 180, b: 120 },
        lampIntensity: 0.8,
        moonColor: '#9999aa',
        starAlpha: 0.15,
        enemyCount: 5,
        enemySpeed: 2,
        enemyChaseSpeed: 3.5,
        fogAlpha: 0
    },
    2: {
        name: 'Cantiere',
        skyTop: '#020210',
        skyMid: '#0a0a20',
        skyBot: '#10101a',
        buildingBase: '#10101a',
        buildingLight: '#141422',
        groundColor: '#0e0e14',
        lampColor: { r: 200, g: 160, b: 100 },
        lampIntensity: 0.7,
        moonColor: '#7777aa',
        starAlpha: 0.1,
        enemyCount: 7,
        enemySpeed: 2.5,
        enemyChaseSpeed: 4,
        fogAlpha: 0.06
    },
    3: {
        name: 'Inverno',
        skyTop: '#050810',
        skyMid: '#0a1018',
        skyBot: '#101822',
        buildingBase: '#121820',
        buildingLight: '#161c28',
        groundColor: '#0e1218',
        lampColor: { r: 180, g: 200, b: 240 },
        lampIntensity: 0.7,
        moonColor: '#ccddee',
        starAlpha: 0.2,
        enemyCount: 9,
        enemySpeed: 2.5,
        enemyChaseSpeed: 4,
        fogAlpha: 0.05,
        snow: true,
        iceFriction: 0.95
    },
    4: {
        name: 'La Fuga',
        skyTop: '#050208',
        skyMid: '#0a0510',
        skyBot: '#0e0815',
        buildingBase: '#0c0a14',
        buildingLight: '#100e18',
        groundColor: '#0a080e',
        lampColor: { r: 180, g: 140, b: 120 },
        lampIntensity: 0.5,
        moonColor: '#cc6644',
        starAlpha: 0.1,
        enemyCount: 10,
        enemySpeed: 3,
        enemyChaseSpeed: 4.5,
        fogAlpha: 0.12,
        rain: true,
        pudbleFriction: 0.94
    }
};

function getTheme() {
    return LEVEL_THEMES[CONFIG.level] || LEVEL_THEMES[1];
}

// ============================================
// BUILDING DATA (generata per livello)
// ============================================
function generateBuildingData() {
    const data = [];
    const level = CONFIG.level;
    const numBuildings = 14 + level * 2;
    let x = 0;
    
    for (let i = 0; i < numBuildings; i++) {
        const gap = 30 + Math.random() * 30;
        const width = 160 + Math.random() * 80;
        const baseHeight = 300 + Math.random() * 200;
        // Edifici più alti nei livelli avanzati
        const height = baseHeight + level * 30;
        
        data.push({ x: x, width: Math.floor(width), height: Math.floor(height) });
        x += width + gap;
    }
    
    // Aggiorna dimensione mondo
    CONFIG.worldWidth = Math.max(4000, x + 200);
    
    return data;
}

let currentBuildingData = [];

// ============================================
// CITY GENERATION
// ============================================
function generateCity() {
    const theme = getTheme();
    currentBuildingData = generateBuildingData();

    // Buildings
    for (const b of currentBuildingData) {
        platforms.push(new Platform(b.x, CONFIG.worldHeight - 50 - b.height, b.width, b.height, 'building'));
    }

    // Ground
    platforms.push(new Platform(0, CONFIG.worldHeight - 50, CONFIG.worldWidth, 100, 'ground'));

    // Dumpsters / Barriers / Steam vents - tipo dipende dal livello
    let obstacleType, obstacleW, obstacleH;
    if (CONFIG.level === 2) {
        obstacleType = 'barrier'; obstacleW = 90; obstacleH = 45;
    } else if (CONFIG.level === 3) {
        obstacleType = 'steam-vent'; obstacleW = 40; obstacleH = 60;
    } else {
        obstacleType = 'dumpster'; obstacleW = 80; obstacleH = 50;
    }
    const dumpsterSpacing = Math.max(250, 450 - CONFIG.level * 40);
    for (let x = 100; x < CONFIG.worldWidth - 200; x += dumpsterSpacing + Math.random() * 100) {
        const plat = new Platform(x, CONFIG.worldHeight - 50 - obstacleH, obstacleW, obstacleH, obstacleType);
        platforms.push(plat);
        // Genera particelle di vapore per ogni steam-vent
        if (obstacleType === 'steam-vent') {
            for (let s = 0; s < 5; s++) {
                steamParticles.push(new SteamParticle(x + obstacleW / 2, CONFIG.worldHeight - 50 - obstacleH - 5));
            }
        }
    }
    
    // Gru (solo livello 2 - Cantiere)
    if (CONFIG.level === 2) {
        const craneSpacing = 600 + Math.random() * 200;
        for (let cx = 300; cx < CONFIG.worldWidth - 400; cx += craneSpacing + Math.random() * 300) {
            const craneHeight = 300 + Math.random() * 200;
            const crane = new Crane(cx, CONFIG.worldHeight - 50, craneHeight);
            cranes.push(crane);
            // Aggiungi la piattaforma mobile del braccio alle platforms
            platforms.push(crane.getPlatform());
        }
    }

    // Fire escapes
    for (let i = 0; i < currentBuildingData.length; i++) {
        const b = currentBuildingData[i];
        if (b.height > 300 && Math.random() > 0.3) {
            const floors = Math.floor(b.height / 85);
            const feX = b.x + b.width - 100;
            const fireEscape = new FireEscapeStructure(feX, CONFIG.worldHeight - 50, b.height, Math.min(floors, 7));
            fireEscapes.push(fireEscape);
            
            for (const p of fireEscape.getPlatforms()) {
                platforms.push(new Platform(p.x, p.y, p.width, p.height, 'fire-escape'));
            }
        }
    }

    // Lamps
    for (let x = 100; x < CONFIG.worldWidth; x += 320 + Math.random() * 60) {
        lamps.push(new Lamp(x, CONFIG.worldHeight - 150));
    }

    // Stars
    for (let i = 0; i < 100; i++) stars.push(new Star());

    // Particles / Snowflakes
    if (CONFIG.level === 3) {
        for (let i = 0; i < 200; i++) snowflakes.push(new Snowflake());
        for (let i = 0; i < 10; i++) particles.push(new Particle());
    } else {
        for (let i = 0; i < 30; i++) particles.push(new Particle());
    }
    
    // Pioggia (Livello 4 - La Fuga)
    if (CONFIG.level === 4) {
        for (let i = 0; i < 350; i++) raindrops.push(new Raindrop());
        // Pozze d'acqua a terra — scivolose
        for (let x = 150; x < CONFIG.worldWidth - 200; x += 200 + Math.random() * 250) {
            const pw = 60 + Math.random() * 80;
            const ph = 6 + Math.random() * 4;
            const puddleY = CONFIG.worldHeight - 50 - ph + 2;
            platforms.push(new Platform(x, puddleY, pw, ph, 'puddle'));
        }
        // Gatto rivale — spawna dall'altra parte del mondo
        const rivalX = CONFIG.worldWidth - 200;
        const rivalY = CONFIG.worldHeight - 90;
        rivalCat = new RivalCat(rivalX, rivalY);
    }
    
    // Food
    generateFood();
    
    // Enemies
    generateEnemies();
}

// ============================================
// FOOD GENERATION
// ============================================
function generateFood() {
    // Cibo a terra
    for (let x = 130; x < CONFIG.worldWidth - 200; x += 350 + Math.random() * 150) {
        foods.push(createRandomFood(x, CONFIG.worldHeight - 70));
    }
    
    // Cibo sulle scale antincendio
    for (const fe of fireEscapes) {
        for (const p of fe.getPlatforms()) {
            if (Math.random() > 0.5) {
                foods.push(createRandomFood(p.x + 20 + Math.random() * 40, p.y - 25));
            }
        }
    }
    
    // Cibo sui tetti
    for (const b of currentBuildingData) {
        if (Math.random() > 0.4) {
            const roofY = CONFIG.worldHeight - 50 - b.height - 25;
            foods.push(createRandomFood(b.x + 30 + Math.random() * (b.width - 60), roofY));
        }
    }
}

// ============================================
// ENEMY GENERATION (scalato per livello)
// ============================================
function generateEnemies() {
    const theme = getTheme();
    
    // Zona sicura attorno allo spawn (primo edificio)
    const safeZoneEnd = currentBuildingData.length > 0 
        ? currentBuildingData[0].x + currentBuildingData[0].width + 50 
        : 400;
    
    // Cani SOLO a terra - NON sui tetti, NON nella zona di spawn
    const spacing = Math.max(300, CONFIG.worldWidth / (theme.enemyCount + 2));
    for (let i = 0; i < theme.enemyCount; i++) {
        const x = safeZoneEnd + 100 + i * spacing + Math.random() * 100;
        if (x < CONFIG.worldWidth - 200) {
            const enemy = new Enemy(x, CONFIG.worldHeight - 82, 120 + Math.random() * 100);
            enemy.speed = theme.enemySpeed;
            enemy.chaseSpeed = theme.enemyChaseSpeed;
            enemies.push(enemy);
        }
    }
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
    
    // Vite — più piccole su mobile
    const heartSize = isMobile ? 10 : 14;
    const heartSpacing = isMobile ? 13 : 17;
    ctx.font = heartSize + 'px Arial';
    for (let i = 0; i < 9; i++) {
        if (i < cat.lives) {
            ctx.fillStyle = '#aa3333';
            ctx.fillText('❤', pad + 8 + i * heartSpacing, pad + (isMobile ? 24 : 30));
        } else {
            ctx.fillStyle = '#1a1a1a';
            ctx.fillText('❤', pad + 8 + i * heartSpacing, pad + (isMobile ? 24 : 30));
        }
    }
    
    // Score
    ctx.fillStyle = '#997722';
    ctx.font = isMobile ? 'bold 10px Arial' : 'bold 14px Arial';
    ctx.fillText('🐟 ' + CONFIG.score, pad + 8, pad + (isMobile ? 37 : 45));
    
    // Food count
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
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.stroke();

    // Direction hints (small arrows)
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('◀', joy.baseX - joy.radius + 12, joy.baseY);
    ctx.fillText('▶', joy.baseX + joy.radius - 12, joy.baseY);
    ctx.fillText('▲', joy.baseX, joy.baseY - joy.radius + 12);
    ctx.fillText('▼', joy.baseX, joy.baseY + joy.radius - 12);

    // Stick (moveable thumb)
    const stickGlow = joy.pressed ? 0.35 : 0.15;
    ctx.beginPath();
    ctx.arc(joy.stickX, joy.stickY, joy.stickRadius, 0, Math.PI * 2);
    const stickGrad = ctx.createRadialGradient(
        joy.stickX, joy.stickY, 0,
        joy.stickX, joy.stickY, joy.stickRadius
    );
    stickGrad.addColorStop(0, `rgba(255,255,255,${stickGlow + 0.15})`);
    stickGrad.addColorStop(0.7, `rgba(255,255,255,${stickGlow})`);
    stickGrad.addColorStop(1, `rgba(255,255,255,${stickGlow * 0.4})`);
    ctx.fillStyle = stickGrad;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(255,255,255,${stickGlow + 0.1})`;
    ctx.stroke();

    // ── JUMP BUTTON (single, big) ──
    const jmpPulse = jmp.pressed ? 0.55 : (0.18 + Math.sin(t * 0.08) * 0.04);
    const jmpR = jmp.radius + (jmp.pressed ? 4 : 0);

    // Flash on tap
    if (jmp.flash > 0) {
        jmp.flash--;
        ctx.beginPath();
        ctx.arc(jmp.x, jmp.y, jmpR + 14, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100,200,255,${jmp.flash * 0.06})`;
        ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(jmp.x, jmp.y, jmpR, 0, Math.PI * 2);
    const jmpGrad = ctx.createRadialGradient(jmp.x, jmp.y, 0, jmp.x, jmp.y, jmpR);
    jmpGrad.addColorStop(0, `rgba(80,180,255,${jmpPulse + 0.1})`);
    jmpGrad.addColorStop(0.6, `rgba(60,140,220,${jmpPulse})`);
    jmpGrad.addColorStop(1, `rgba(40,100,180,${jmpPulse * 0.5})`);
    ctx.fillStyle = jmpGrad;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = `rgba(120,200,255,${jmpPulse + 0.08})`;
    ctx.stroke();

    // Jump label
    ctx.globalAlpha = jmp.pressed ? 0.95 : 0.65;
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${jmp.pressed ? 26 : 22}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⬆', jmp.x, jmp.y - 1);

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
        const theme = getTheme();
        
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
            const nextTheme = LEVEL_THEMES[CONFIG.level + 1];
            ctx.fillText('Prossimo: ' + nextTheme.name, vw/2, vh/2 + 40);
            
            if (t > 90) {
                ctx.fillStyle = '#555';
                ctx.font = '16px Arial';
                const contMsg = IS_MOBILE ? 'Tocca per continuare' : 'Premi SPAZIO per continuare';
                ctx.fillText(contMsg, vw/2, vh/2 + 75);
            }
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
    raindrops = [];
    rainSplashes = [];
    rivalCat = null;
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
    raindrops = [];
    rainSplashes = [];
    rivalCat = null;
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
    for (const crane of cranes) crane.update();
    for (const sf of snowflakes) sf.update();
    for (const sp of steamParticles) sp.update();
    
    // Pioggia (Livello 4)
    for (const rd of raindrops) rd.update();
    for (let i = rainSplashes.length - 1; i >= 0; i--) {
        rainSplashes[i].update();
        if (rainSplashes[i].life <= 0) rainSplashes.splice(i, 1);
    }
    // Genera splash random sulle superfici
    if (CONFIG.level === 4 && CONFIG.time % 2 === 0) {
        const splX = CONFIG.cameraX + Math.random() * CONFIG.canvasWidth;
        const groundY = CONFIG.worldHeight - 50;
        rainSplashes.push(new RainSplash(splX, groundY));
    }
    
    // Gatto rivale (Livello 4)
    if (rivalCat) {
        rivalCat.update(cat, platforms);
    }
    
    // Pulisci fantasmi esauriti
    for (let i = ghosts.length - 1; i >= 0; i--) {
        if (!ghosts[i].active) ghosts.splice(i, 1);
    }
    
    // Pulisci vite scadute
    for (let i = lifePickups.length - 1; i >= 0; i--) {
        if (!lifePickups[i].active) lifePickups.splice(i, 1);
    }
    
    // Spawn vite a tempo
    lifeSpawnTimer++;
    const spawnInterval = Math.max(400, 900 - CONFIG.level * 100); // Più frequenti nei livelli alti
    if (lifeSpawnTimer >= spawnInterval && cat.lives < 9) {
        lifeSpawnTimer = 0;
        spawnLifePickup();
    }
    
    // Check life pickup collection
    for (const lp of lifePickups) {
        if (lp.active && lp.checkCollision(cat)) {
            if (cat.lives < 9) {
                cat.lives++;
                lp.active = false;
            }
        }
    }
    
    // Check food collection
    for (const food of foods) {
        if (food.checkCollision(cat)) {
            food.collect();
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
    
    // Check enemy collision
    for (const enemy of enemies) {
        if (enemy.checkCollisionWithCat(cat)) {
            if (cat.takeDamage()) {
                // Crea fantasma
                ghosts.push(new GhostCat(cat.x + cat.width/2, cat.y));
                
                // Knockback
                cat.vy = -8;
                cat.vx = (cat.x > enemy.x) ? 6 : -6;
                
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
    
    // Rival Cat (gatto antagonista livello 4)
    if (rivalCat) rivalCat.draw(ctx);
    
    // Enemies
    for (const enemy of enemies) enemy.draw(ctx);
    
    // Cat
    cat.draw(ctx);
    
    // === LAMP LIGHTING: illuminazione naturale ===
    drawLampLighting();
    
    // === CAT LIGHT: il gatto illumina la scena ===
    drawCatLight();
    
    // Ghosts (sopra tutto)
    for (const ghost of ghosts) ghost.draw(ctx);
    
    ctx.restore();

    // Vignette
    const vw = CONFIG.canvasWidth;
    const vh = CONFIG.canvasHeight;
    const vignette = ctx.createRadialGradient(
        vw/2, vh/2, vh/4,
        vw/2, vh/2, vh
    );
    vignette.addColorStop(0, 'transparent');
    vignette.addColorStop(0.6, 'rgba(0, 0, 0, 0.3)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.75)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, vw, vh);
    
    // UI
    drawUI();
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

    // Sfondo scuro
    ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
    ctx.fillRect(0, 0, vw, vh);

    // Titolo
    ctx.fillStyle = '#ffcc44';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🐱 SCEGLI LIVELLO', vw / 2, vh / 2 - 100);

    // Bottoni livello
    const levels = Object.keys(LEVEL_THEMES).map(Number);
    const btnW = 180;
    const btnH = 50;
    const gap = 18;
    const totalW = levels.length * btnW + (levels.length - 1) * gap;
    const startX = (vw - totalW) / 2;
    const btnY = vh / 2 - 30;

    for (let i = 0; i < levels.length; i++) {
        const lvl = levels[i];
        const theme = LEVEL_THEMES[lvl];
        const bx = startX + i * (btnW + gap);

        // Sfondo bottone
        const isCurrentLevel = lvl === CONFIG.level;
        ctx.fillStyle = isCurrentLevel ? 'rgba(100, 180, 100, 0.35)' : 'rgba(40, 40, 60, 0.7)';
        ctx.beginPath();
        ctx.roundRect(bx, btnY, btnW, btnH, 8);
        ctx.fill();

        // Bordo
        ctx.strokeStyle = isCurrentLevel ? '#66aa66' : 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Testo
        ctx.fillStyle = isCurrentLevel ? '#aaffaa' : '#ccccdd';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('LV.' + lvl, bx + btnW / 2, btnY + 20);

        ctx.fillStyle = isCurrentLevel ? '#88cc88' : '#8888aa';
        ctx.font = '13px Arial';
        ctx.fillText(theme.name, bx + btnW / 2, btnY + 38);
    }

    // Istruzioni chiusura
    ctx.fillStyle = '#555';
    ctx.font = '13px Arial';
    const closeMsg = IS_MOBILE ? 'Tocca fuori per chiudere' : 'ESC o clicca fuori per chiudere';
    ctx.fillText(closeMsg, vw / 2, btnY + btnH + 40);

    ctx.textAlign = 'left';

    // Salva coordinate per hit-test (usate nel click handler)
    drawLevelSelector._buttons = levels.map((lvl, i) => ({
        lvl,
        x: startX + i * (btnW + gap),
        y: btnY,
        w: btnW,
        h: btnH
    }));
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
    // Click fuori → chiudi
    easterEggOpen = false;
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
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) / CONFIG.zoom;
        const my = (e.clientY - rect.top) / CONFIG.zoom;

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

        if (gameOver || gameWon) {
            clickRestart = true;
        }
    });
    canvas.addEventListener('touchend', (e) => {
        if (e.changedTouches.length > 0) {
            const rect = canvas.getBoundingClientRect();
            const touch = e.changedTouches[0];
            const mx = (touch.clientX - rect.left) / CONFIG.zoom;
            const my = (touch.clientY - rect.top) / CONFIG.zoom;

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

        if (gameOver || gameWon) {
            clickRestart = true;
            e.preventDefault();
        }
    });

    // ESC chiude il level selector
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && easterEggOpen) {
            easterEggOpen = false;
        }
    });
    
    // Mobile touch controls
    setupMobileControls();
        
    gameLoop();
}

window.addEventListener('load', init);
