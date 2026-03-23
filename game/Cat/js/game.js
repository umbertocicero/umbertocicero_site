// ============================================
// GAME - Logica principale del gioco
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

// ============================================
// CITY GENERATION
// ============================================
const BUILDING_DATA = [
    { x: 0, width: 180, height: 350 },
    { x: 220, width: 200, height: 450 },
    { x: 460, width: 220, height: 380 },
    { x: 720, width: 200, height: 500 },
    { x: 960, width: 180, height: 420 },
    { x: 1180, width: 220, height: 550 },
    { x: 1440, width: 200, height: 400 },
    { x: 1680, width: 210, height: 480 },
    { x: 1930, width: 190, height: 520 },
    { x: 2160, width: 220, height: 440 },
    { x: 2420, width: 200, height: 500 },
    { x: 2660, width: 210, height: 380 },
    { x: 2910, width: 200, height: 460 },
    { x: 3150, width: 220, height: 520 },
    { x: 3410, width: 190, height: 400 },
    { x: 3640, width: 200, height: 480 }
];

function generateCity() {
    // Buildings
    for (const b of BUILDING_DATA) {
        platforms.push(new Platform(b.x, CONFIG.worldHeight - 50 - b.height, b.width, b.height, 'building'));
    }

    // Ground
    platforms.push(new Platform(0, CONFIG.worldHeight - 50, CONFIG.worldWidth, 100, 'ground'));

    // Dumpsters
    const dumpsterPositions = [100, 500, 900, 1350, 1800, 2300, 2750, 3200, 3600];
    for (const x of dumpsterPositions) {
        platforms.push(new Platform(x, CONFIG.worldHeight - 100, 80, 50, 'dumpster'));
    }

    // Fire escapes
    const fireEscapeData = [
        { x: 160, bi: 0, floors: 4 }, { x: 400, bi: 1, floors: 5 },
        { x: 640, bi: 2, floors: 4 }, { x: 880, bi: 3, floors: 5 },
        { x: 1100, bi: 4, floors: 5 }, { x: 1360, bi: 5, floors: 6 },
        { x: 1600, bi: 6, floors: 4 }, { x: 1850, bi: 7, floors: 5 },
        { x: 2080, bi: 8, floors: 6 }, { x: 2340, bi: 9, floors: 5 },
        { x: 2580, bi: 10, floors: 5 }, { x: 2830, bi: 11, floors: 4 },
        { x: 3070, bi: 12, floors: 5 }, { x: 3330, bi: 13, floors: 6 },
        { x: 3560, bi: 14, floors: 4 }, { x: 3800, bi: 15, floors: 5 }
    ];
    
    for (const fe of fireEscapeData) {
        const building = BUILDING_DATA[fe.bi];
        if (building) {
            const fireEscape = new FireEscapeStructure(fe.x, CONFIG.worldHeight - 50, building.height, fe.floors);
            fireEscapes.push(fireEscape);
            
            for (const p of fireEscape.getPlatforms()) {
                platforms.push(new Platform(p.x, p.y, p.width, p.height, 'fire-escape'));
            }
        }
    }

    // Lamps
    for (let x = 100; x < CONFIG.worldWidth; x += 350) {
        lamps.push(new Lamp(x, CONFIG.worldHeight - 150));
    }

    // Stars
    for (let i = 0; i < 100; i++) stars.push(new Star());

    // Particles
    for (let i = 0; i < 30; i++) particles.push(new Particle());
    
    // Food
    generateFood();
    
    // Enemies (cani randagi)
    generateEnemies();
}

// ============================================
// FOOD GENERATION
// ============================================
function generateFood() {
    // Cibo a terra vicino ai cassonetti
    const groundFoodX = [130, 530, 930, 1380, 1830, 2330, 2780, 3230, 3630];
    for (const x of groundFoodX) {
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
    for (const b of BUILDING_DATA) {
        if (Math.random() > 0.4) {
            const roofY = CONFIG.worldHeight - 50 - b.height - 25;
            foods.push(createRandomFood(b.x + 30 + Math.random() * (b.width - 60), roofY));
        }
    }
}

// ============================================
// ENEMY GENERATION
// ============================================
function generateEnemies() {
    // Cani a terra - pattugliano le strade
    const groundEnemyPositions = [350, 800, 1500, 2100, 2600, 3100, 3500];
    for (const x of groundEnemyPositions) {
        enemies.push(new Enemy(x, CONFIG.worldHeight - 82, 150 + Math.random() * 100));
    }
    
    // Cani sui tetti (alcuni edifici)
    const rooftopEnemies = [1, 4, 7, 10, 13];
    for (const bi of rooftopEnemies) {
        const b = BUILDING_DATA[bi];
        if (b) {
            const roofY = CONFIG.worldHeight - 50 - b.height - 32;
            enemies.push(new Enemy(b.x + 30, roofY, b.width - 60));
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
// DRAW BACKGROUND
// ============================================
function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(0.5, '#1a1a2a');
    gradient.addColorStop(1, '#2a2a3a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-CONFIG.cameraX * 0.1, -CONFIG.cameraY * 0.1);
    moon.draw(ctx);
    ctx.restore();

    ctx.save();
    ctx.translate(-CONFIG.cameraX * 0.2, -CONFIG.cameraY * 0.2);
    for (const star of stars) star.draw(ctx);
    ctx.restore();
}

// ============================================
// DRAW UI
// ============================================
function drawUI() {
    // Panel sfondo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.roundRect(10, 10, 200, 55, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Vite (cuori/zampe di gatto)
    ctx.font = '18px Arial';
    for (let i = 0; i < 9; i++) {
        if (i < cat.lives) {
            ctx.fillStyle = '#ff6b6b';
            ctx.fillText('❤', 18 + i * 21, 32);
        } else {
            ctx.fillStyle = '#333';
            ctx.fillText('❤', 18 + i * 21, 32);
        }
    }
    
    // Score
    ctx.fillStyle = '#ffcc44';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('🐟 ' + CONFIG.score, 18, 55);
    
    // Food count
    const remainingFood = foods.filter(f => !f.collected).length;
    ctx.fillStyle = '#888';
    ctx.font = '12px Arial';
    ctx.fillText('Rimanenti: ' + remainingFood, 100, 55);
}

// ============================================
// DRAW GAME OVER
// ============================================
function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 40);
    
    ctx.fillStyle = '#ffcc44';
    ctx.font = '24px Arial';
    ctx.fillText('Punteggio: ' + CONFIG.score, canvas.width/2, canvas.height/2 + 20);
    
    ctx.fillStyle = '#888';
    ctx.font = '18px Arial';
    ctx.fillText('Premi SPAZIO per ricominciare', canvas.width/2, canvas.height/2 + 60);
    
    ctx.textAlign = 'left';
}

// ============================================
// RESTART
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
    gameOver = false;
    
    cat = new Cat(200, CONFIG.worldHeight - 150);
    moon = new Moon();
    generateCity();
}

// ============================================
// MAIN GAME LOOP
// ============================================
function gameLoop() {
    CONFIG.time++;

    if (gameOver) {
        if (KEYS.space) {
            restart();
        }
        drawGameOver();
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
    
    // Lamps
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
    
    // Ghosts (sopra tutto)
    for (const ghost of ghosts) ghost.draw(ctx);
    
    ctx.restore();

    // Vignette
    const vignette = ctx.createRadialGradient(
        canvas.width/2, canvas.height/2, canvas.height/3,
        canvas.width/2, canvas.height/2, canvas.height
    );
    vignette.addColorStop(0, 'transparent');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // UI
    drawUI();

    requestAnimationFrame(gameLoop);
}

// ============================================
// INIT
// ============================================
function init() {
    setupInput();
    
    cat = new Cat(200, CONFIG.worldHeight - 150);
    moon = new Moon();
    
    generateCity();
    
    console.log('🐱 Night Cat - Raccogli il cibo, attento ai cani!');
    
    gameLoop();
}

window.addEventListener('load', init);
