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
