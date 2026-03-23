// ============================================
// GAME - Logica principale con sistema livelli
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = CONFIG.canvasWidth;
canvas.height = CONFIG.canvasHeight;

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
let gameOver = false;
let gameWon = false;
let clickRestart = false;

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
        lampColor: { r: 200, g: 160, b: 100 },
        lampIntensity: 0.5,
        moonColor: '#9999aa',
        starAlpha: 0.15,
        enemyCount: 5,
        enemySpeed: 2,
        enemyChaseSpeed: 3.5,
        fogAlpha: 0
    },
    2: {
        name: 'Porto Industriale',
        skyTop: '#020210',
        skyMid: '#0a0a20',
        skyBot: '#10101a',
        buildingBase: '#10101a',
        buildingLight: '#141422',
        groundColor: '#0e0e14',
        lampColor: { r: 180, g: 140, b: 80 },
        lampIntensity: 0.45,
        moonColor: '#7777aa',
        starAlpha: 0.1,
        enemyCount: 7,
        enemySpeed: 2.5,
        enemyChaseSpeed: 4,
        fogAlpha: 0.06
    },
    3: {
        name: 'Zona Rossa',
        skyTop: '#0a0204',
        skyMid: '#120508',
        skyBot: '#18080c',
        buildingBase: '#1a0a10',
        buildingLight: '#201015',
        groundColor: '#140a0c',
        lampColor: { r: 200, g: 100, b: 60 },
        lampIntensity: 0.4,
        moonColor: '#aa6666',
        starAlpha: 0.08,
        enemyCount: 9,
        enemySpeed: 3,
        enemyChaseSpeed: 4.5,
        fogAlpha: 0.1
    },
    4: {
        name: 'La Fuga',
        skyTop: '#000005',
        skyMid: '#02020a',
        skyBot: '#050510',
        buildingBase: '#0a0a14',
        buildingLight: '#0e0e18',
        groundColor: '#08080c',
        lampColor: { r: 140, g: 120, b: 180 },
        lampIntensity: 0.35,
        moonColor: '#6666aa',
        starAlpha: 0.2,
        enemyCount: 12,
        enemySpeed: 3.5,
        enemyChaseSpeed: 5,
        fogAlpha: 0.15
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

    // Dumpsters - più nei livelli avanzati
    const dumpsterSpacing = Math.max(250, 450 - CONFIG.level * 40);
    for (let x = 100; x < CONFIG.worldWidth - 200; x += dumpsterSpacing + Math.random() * 100) {
        platforms.push(new Platform(x, CONFIG.worldHeight - 100, 80, 50, 'dumpster'));
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

    // Particles
    for (let i = 0; i < 30; i++) particles.push(new Particle());
    
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
    
    // Cani a terra - NON nella zona di spawn
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
    
    // Cani sui tetti (alcuni edifici) - mai sul primo edificio (spawn)
    const rooftopCount = Math.min(5, Math.floor(CONFIG.level * 1.5));
    for (let i = 0; i < rooftopCount; i++) {
        const bi = 1 + Math.floor(Math.random() * (currentBuildingData.length - 1)); // Salta edificio 0
        const b = currentBuildingData[bi];
        if (b && b.width > 150) {
            const roofY = CONFIG.worldHeight - 50 - b.height - 32;
            const enemy = new Enemy(b.x + 30, roofY, b.width - 60);
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
    const targetX = cat.x - canvas.width / 2 + cat.width / 2;
    const targetY = cat.y - canvas.height / 2 + cat.height / 2;
    
    CONFIG.cameraX += (targetX - CONFIG.cameraX) * 0.08;
    CONFIG.cameraY += (targetY - CONFIG.cameraY) * 0.08;
    
    CONFIG.cameraX = Math.max(0, Math.min(CONFIG.cameraX, CONFIG.worldWidth - canvas.width));
    CONFIG.cameraY = Math.max(0, Math.min(CONFIG.cameraY, CONFIG.worldHeight - canvas.height));
}

// ============================================
// DRAW BACKGROUND (tema livello)
// ============================================
function drawBackground() {
    const theme = getTheme();
    
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, theme.skyTop);
    gradient.addColorStop(0.5, theme.skyMid);
    gradient.addColorStop(1, theme.skyBot);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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
        const fogGrad = ctx.createLinearGradient(0, canvas.height * 0.5, 0, canvas.height);
        fogGrad.addColorStop(0, 'transparent');
        fogGrad.addColorStop(1, `rgba(20, 20, 30, ${theme.fogAlpha})`);
        ctx.fillStyle = fogGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

// ============================================
// LAMP LIGHTING - Illumina oggetti sotto
// ============================================
function drawLampLighting() {
    const theme = getTheme();
    
    for (const lamp of lamps) {
        const lx = lamp.x;
        const ly = lamp.y + 25; // Punto luce
        const brightness = lamp.flicker > 0 ? 0.2 : (theme.lampIntensity || 0.5);
        const lc = theme.lampColor || { r: 200, g: 160, b: 100 };
        
        const coneHeight = 200;
        const coneBottomW = 140;
        
        // Area illuminata: rettangolo sotto il lampione
        const lightLeft = lx - coneBottomW;
        const lightRight = lx + coneBottomW;
        const lightTop = ly;
        const lightBottom = ly + coneHeight;

        // Illumina le piattaforme sotto la luce
        for (const p of platforms) {
            if (p.x + p.width < lightLeft - CONFIG.cameraX || p.x > lightRight - CONFIG.cameraX) continue;
            
            // Calcola overlap con il cono di luce
            const overlapLeft = Math.max(p.x, lightLeft);
            const overlapRight = Math.min(p.x + p.width, lightRight);
            const overlapTop = Math.max(p.y, lightTop);
            const overlapBot = Math.min(p.y + p.height, lightBottom);
            
            if (overlapLeft < overlapRight && overlapTop < overlapBot) {
                // Distanza dal centro del lampione
                const midX = (overlapLeft + overlapRight) / 2;
                const midY = (overlapTop + overlapBot) / 2;
                const dx = midX - lx;
                const dy = midY - ly;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = Math.sqrt(coneBottomW * coneBottomW + coneHeight * coneHeight);
                
                // Intensità che cala con la distanza
                const intensity = Math.max(0, 1 - dist / maxDist) * brightness * 0.35;
                
                if (intensity > 0.01) {
                    ctx.fillStyle = `rgba(${lc.r}, ${lc.g}, ${lc.b}, ${intensity})`;
                    ctx.fillRect(overlapLeft, overlapTop, overlapRight - overlapLeft, overlapBot - overlapTop);
                }
            }
        }
        
        // Illumina cassonetti e fire-escape sotto la luce
        for (const p of platforms) {
            if (p.type === 'ground' || p.type === 'building') continue;
            
            const centerX = p.x + p.width / 2;
            const centerY = p.y + p.height / 2;
            
            if (centerX > lightLeft && centerX < lightRight && centerY > lightTop && centerY < lightBottom) {
                const dx = centerX - lx;
                const dy = centerY - ly;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = Math.sqrt(coneBottomW * coneBottomW + coneHeight * coneHeight);
                const intensity = Math.max(0, 1 - dist / maxDist) * brightness * 0.25;
                
                if (intensity > 0.01) {
                    // Alone attorno all'oggetto
                    const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(p.width, p.height));
                    glow.addColorStop(0, `rgba(${lc.r}, ${lc.g}, ${lc.b}, ${intensity})`);
                    glow.addColorStop(1, 'transparent');
                    ctx.fillStyle = glow;
                    ctx.beginPath();
                    ctx.ellipse(centerX, centerY, p.width * 0.8, p.height * 0.8, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        
        // Illumina il gatto se sotto la luce
        if (cat) {
            const catCX = cat.x + cat.width / 2;
            const catCY = cat.y + cat.height / 2;
            
            if (catCX > lightLeft && catCX < lightRight && catCY > lightTop && catCY < lightBottom) {
                const dx = catCX - lx;
                const dy = catCY - ly;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = Math.sqrt(coneBottomW * coneBottomW + coneHeight * coneHeight);
                const intensity = Math.max(0, 1 - dist / maxDist) * brightness * 0.5;
                
                if (intensity > 0.02) {
                    const catGlow = ctx.createRadialGradient(catCX, catCY, 0, catCX, catCY, 30);
                    catGlow.addColorStop(0, `rgba(${lc.r}, ${lc.g}, ${lc.b}, ${intensity})`);
                    catGlow.addColorStop(1, 'transparent');
                    ctx.fillStyle = catGlow;
                    ctx.beginPath();
                    ctx.arc(catCX, catCY, 30, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        
        // Illumina nemici sotto la luce
        for (const enemy of enemies) {
            const eCX = enemy.x + enemy.width / 2;
            const eCY = enemy.y + enemy.height / 2;
            
            if (eCX > lightLeft && eCX < lightRight && eCY > lightTop && eCY < lightBottom) {
                const dx = eCX - lx;
                const dy = eCY - ly;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = Math.sqrt(coneBottomW * coneBottomW + coneHeight * coneHeight);
                const intensity = Math.max(0, 1 - dist / maxDist) * brightness * 0.4;
                
                if (intensity > 0.02) {
                    const eGlow = ctx.createRadialGradient(eCX, eCY, 0, eCX, eCY, 35);
                    eGlow.addColorStop(0, `rgba(${lc.r}, ${lc.g}, ${lc.b}, ${intensity})`);
                    eGlow.addColorStop(1, 'transparent');
                    ctx.fillStyle = eGlow;
                    ctx.beginPath();
                    ctx.arc(eCX, eCY, 35, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        
        // Illumina cibo sotto la luce
        for (const food of foods) {
            if (food.collected) continue;
            const fCX = food.x + food.width / 2;
            const fCY = food.y + food.height / 2;
            
            if (fCX > lightLeft && fCX < lightRight && fCY > lightTop && fCY < lightBottom) {
                const dx = fCX - lx;
                const dy = fCY - ly;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = Math.sqrt(coneBottomW * coneBottomW + coneHeight * coneHeight);
                const intensity = Math.max(0, 1 - dist / maxDist) * brightness * 0.35;
                
                if (intensity > 0.02) {
                    const fGlow = ctx.createRadialGradient(fCX, fCY, 0, fCX, fCY, 20);
                    fGlow.addColorStop(0, `rgba(${lc.r}, ${lc.g}, ${lc.b}, ${intensity})`);
                    fGlow.addColorStop(1, 'transparent');
                    ctx.fillStyle = fGlow;
                    ctx.beginPath();
                    ctx.arc(fCX, fCY, 20, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }
}

// ============================================
// DRAW UI
// ============================================
function drawUI() {
    const theme = getTheme();
    
    // Panel sfondo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.beginPath();
    ctx.roundRect(10, 10, 260, 55, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Livello
    ctx.fillStyle = '#668899';
    ctx.font = 'bold 11px Arial';
    ctx.fillText('LV.' + CONFIG.level + ' - ' + theme.name, 18, 23);
    
    // Vite
    ctx.font = '14px Arial';
    for (let i = 0; i < 9; i++) {
        if (i < cat.lives) {
            ctx.fillStyle = '#aa3333';
            ctx.fillText('❤', 18 + i * 17, 40);
        } else {
            ctx.fillStyle = '#1a1a1a';
            ctx.fillText('❤', 18 + i * 17, 40);
        }
    }
    
    // Score
    ctx.fillStyle = '#997722';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('🐟 ' + CONFIG.score, 18, 55);
    
    // Food count
    const remainingFood = foods.filter(f => !f.collected).length;
    const totalFood = foods.length;
    ctx.fillStyle = '#555';
    ctx.font = '11px Arial';
    ctx.fillText((totalFood - remainingFood) + '/' + totalFood, 90, 55);
    
    // Barra progresso cibo
    const barX = 130;
    const barW = 120;
    const progress = totalFood > 0 ? (totalFood - remainingFood) / totalFood : 0;
    
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.roundRect(barX, 47, barW, 10, 3);
    ctx.fill();
    
    const barColor = progress >= 1 ? '#33aa33' : '#997722';
    ctx.fillStyle = barColor;
    ctx.beginPath();
    ctx.roundRect(barX, 47, barW * progress, 10, 3);
    ctx.fill();
}

// ============================================
// DRAW LEVEL COMPLETE
// ============================================
function drawLevelComplete() {
    const t = CONFIG.levelTransitionTimer;
    const alpha = Math.min(1, t / 30);
    
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.85})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (t > 30) {
        const theme = getTheme();
        
        ctx.fillStyle = '#44aa44';
        ctx.font = 'bold 50px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('LIVELLO COMPLETATO!', canvas.width/2, canvas.height/2 - 50);
        
        ctx.fillStyle = '#997722';
        ctx.font = '22px Arial';
        ctx.fillText('Punteggio: ' + CONFIG.score, canvas.width/2, canvas.height/2 + 5);
        
        if (CONFIG.level < CONFIG.maxLevel) {
            ctx.fillStyle = '#668899';
            ctx.font = '20px Arial';
            const nextTheme = LEVEL_THEMES[CONFIG.level + 1];
            ctx.fillText('Prossimo: ' + nextTheme.name, canvas.width/2, canvas.height/2 + 40);
            
            if (t > 90) {
                ctx.fillStyle = '#555';
                ctx.font = '16px Arial';
                ctx.fillText('Premi SPAZIO per continuare', canvas.width/2, canvas.height/2 + 75);
            }
        }
        
        ctx.textAlign = 'left';
    }
}

// ============================================
// DRAW GAME WON
// ============================================
function drawGameWon() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Stelle animate
    const starCount = 30;
    for (let i = 0; i < starCount; i++) {
        const sx = (Math.sin(CONFIG.time * 0.02 + i * 1.3) + 1) * canvas.width / 2;
        const sy = (Math.cos(CONFIG.time * 0.015 + i * 0.9) + 1) * canvas.height / 2;
        const salpha = 0.3 + Math.sin(CONFIG.time * 0.05 + i) * 0.2;
        ctx.fillStyle = `rgba(255, 220, 100, ${salpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.fillStyle = '#ffcc44';
    ctx.font = 'bold 55px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🐱 HAI VINTO! 🐱', canvas.width/2, canvas.height/2 - 50);
    
    ctx.fillStyle = '#aaaacc';
    ctx.font = '20px Arial';
    ctx.fillText('Il gatto è al sicuro!', canvas.width/2, canvas.height/2 + 5);
    
    ctx.fillStyle = '#997722';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Punteggio finale: ' + CONFIG.score, canvas.width/2, canvas.height/2 + 45);
    
    ctx.fillStyle = '#555';
    ctx.font = '16px Arial';
    ctx.fillText('Premi SPAZIO o tocca per rigiocare', canvas.width/2, canvas.height/2 + 85);
    
    ctx.textAlign = 'left';
}

// ============================================
// DRAW GAME OVER
// ============================================
function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#aa2222';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 40);
    
    ctx.fillStyle = '#997722';
    ctx.font = '24px Arial';
    ctx.fillText('Punteggio: ' + CONFIG.score, canvas.width/2, canvas.height/2 + 20);
    
    ctx.fillStyle = '#668899';
    ctx.font = '16px Arial';
    ctx.fillText('Livello raggiunto: ' + CONFIG.level + ' - ' + getTheme().name, canvas.width/2, canvas.height/2 + 50);
    
    ctx.fillStyle = '#555';
    ctx.font = '18px Arial';
    ctx.fillText('Premi SPAZIO o tocca per ricominciare', canvas.width/2, canvas.height/2 + 85);
    
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
// MAIN GAME LOOP
// ============================================
function gameLoop() {
    CONFIG.time++;

    // Game Over
    if (gameOver) {
        if (KEYS.space || clickRestart) {
            clickRestart = false;
            restart();
        }
        drawGameOver();
        requestAnimationFrame(gameLoop);
        return;
    }
    
    // Game Won
    if (gameWon) {
        if (KEYS.space || clickRestart) {
            clickRestart = false;
            restart();
        }
        drawGameWon();
        requestAnimationFrame(gameLoop);
        return;
    }
    
    // Level transition
    if (CONFIG.levelTransition) {
        CONFIG.levelTransitionTimer++;
        drawLevelComplete();
        
        if (CONFIG.levelTransitionTimer > 90 && KEYS.space) {
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
    
    // Pulisci fantasmi esauriti
    for (let i = ghosts.length - 1; i >= 0; i--) {
        if (!ghosts[i].active) ghosts.splice(i, 1);
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

    // Draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
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
    
    // Lamps (struttura)
    for (const lamp of lamps) lamp.draw(ctx);
    
    // Other platforms
    for (const p of platforms) {
        if (p.type !== 'building' && p.type !== 'ground' && p.type !== 'fire-escape') {
            p.draw(ctx);
        }
    }
    
    // Food
    for (const food of foods) food.draw(ctx);
    
    // Particles
    for (const particle of particles) particle.draw(ctx);
    
    // Enemies
    for (const enemy of enemies) enemy.draw(ctx);
    
    // Cat
    cat.draw(ctx);
    
    // === LAMP LIGHTING: illumina tutto sotto la luce ===
    drawLampLighting();
    
    // Ghosts (sopra tutto)
    for (const ghost of ghosts) ghost.draw(ctx);
    
    ctx.restore();

    // Vignette
    const vignette = ctx.createRadialGradient(
        canvas.width/2, canvas.height/2, canvas.height/4,
        canvas.width/2, canvas.height/2, canvas.height
    );
    vignette.addColorStop(0, 'transparent');
    vignette.addColorStop(0.6, 'rgba(0, 0, 0, 0.3)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.75)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // UI
    drawUI();

    requestAnimationFrame(gameLoop);
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
    
    // Click/touch per ricominciare alla sconfitta/vittoria
    canvas.addEventListener('click', () => {
        if (gameOver || gameWon) {
            clickRestart = true;
        }
    });
    canvas.addEventListener('touchend', (e) => {
        if (gameOver || gameWon) {
            clickRestart = true;
            e.preventDefault();
        }
    });
    
    // Mobile touch controls
    setupMobileControls();
    
    console.log('🐱 Night Cat - Raccogli tutto il cibo per passare al livello successivo!');
    
    gameLoop();
}

window.addEventListener('load', init);
