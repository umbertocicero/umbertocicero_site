// ============================================
// CONFIG - Configurazione globale del gioco
// ============================================

const CONFIG = {
    // Canvas
    canvasWidth: 1200,
    canvasHeight: 700,
    
    // World
    worldWidth: 4000,
    worldHeight: 1500,
    
    // Physics
    gravity: 0.5,
    friction: 0.8,
    
    // Game state
    time: 0,
    score: 0,
    level: 1,
    maxLevel: 4,
    levelTransition: false,
    levelTransitionTimer: 0,
    
    // Camera
    cameraX: 0,
    cameraY: 0
};

// Input state
const KEYS = {
    left: false,
    right: false,
    up: false,
    down: false,
    space: false
};

// Setup input handlers
function setupInput() {
    document.addEventListener('keydown', (e) => {
        switch(e.code) {
            case 'ArrowLeft': KEYS.left = true; break;
            case 'ArrowRight': KEYS.right = true; break;
            case 'ArrowUp': KEYS.up = true; break;
            case 'ArrowDown': KEYS.down = true; break;
            case 'Space': KEYS.space = true; e.preventDefault(); break;
        }
    });

    document.addEventListener('keyup', (e) => {
        switch(e.code) {
            case 'ArrowLeft': KEYS.left = false; break;
            case 'ArrowRight': KEYS.right = false; break;
            case 'ArrowUp': KEYS.up = false; break;
            case 'ArrowDown': KEYS.down = false; break;
            case 'Space': KEYS.space = false; break;
        }
    });
}

// Mobile touch controls
function setupMobileControls() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let isTouching = false;
    
    const canvas = document.getElementById('gameCanvas');
    
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchStartTime = Date.now();
        isTouching = true;
        
        // Tocco nella metà sinistra = sinistra, destra = destra
        const rect = canvas.getBoundingClientRect();
        const relX = touch.clientX - rect.left;
        const midX = rect.width / 2;
        
        if (relX < midX * 0.6) {
            KEYS.left = true;
        } else if (relX > midX * 1.4) {
            KEYS.right = true;
        }
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!isTouching) return;
        
        const touch = e.touches[0];
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;
        
        // Swipe orizzontale
        KEYS.left = false;
        KEYS.right = false;
        
        if (Math.abs(dx) > 20) {
            if (dx < 0) {
                KEYS.left = true;
            } else {
                KEYS.right = true;
            }
        }
        
        // Swipe verso l'alto = salta
        if (dy < -30) {
            KEYS.space = true;
        }
    }, { passive: false });
    
    canvas.addEventListener('touchend', (e) => {
        // Tap rapido = salta
        const elapsed = Date.now() - touchStartTime;
        if (elapsed < 200 && !KEYS.left && !KEYS.right) {
            KEYS.space = true;
            setTimeout(() => { KEYS.space = false; }, 100);
        }
        
        KEYS.left = false;
        KEYS.right = false;
        KEYS.space = false;
        isTouching = false;
    });
}
