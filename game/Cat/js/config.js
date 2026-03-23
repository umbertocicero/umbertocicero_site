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

// Mobile touch controls - Ottimizzati per gameplay
function setupMobileControls() {
    const canvas = document.getElementById('gameCanvas');
    
    // Traccia i tocchi attivi (supporto multi-touch)
    const activeTouches = {};
    
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        
        const rect = canvas.getBoundingClientRect();
        
        for (const touch of e.changedTouches) {
            const relX = (touch.clientX - rect.left) / rect.width;
            const relY = (touch.clientY - rect.top) / rect.height;
            
            activeTouches[touch.identifier] = {
                startX: touch.clientX,
                startY: touch.clientY,
                currentX: touch.clientX,
                currentY: touch.clientY,
                startTime: Date.now(),
                relX: relX,
                zone: relX < 0.33 ? 'left' : relX > 0.67 ? 'right' : 'center'
            };
            
            // Zona sinistra dello schermo = muovi a sinistra
            if (relX < 0.33) {
                KEYS.left = true;
            }
            // Zona destra dello schermo = muovi a destra
            else if (relX > 0.67) {
                KEYS.right = true;
            }
            // Zona centrale = salta
            else {
                KEYS.space = true;
            }
        }
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        
        for (const touch of e.changedTouches) {
            const data = activeTouches[touch.identifier];
            if (!data) continue;
            
            data.currentX = touch.clientX;
            data.currentY = touch.clientY;
            
            const dx = touch.clientX - data.startX;
            const dy = touch.clientY - data.startY;
            
            // Swipe verso l'alto da qualsiasi zona = salta
            if (dy < -40) {
                KEYS.space = true;
            }
            
            // Se il tocco era nella zona centrale e si muove orizzontalmente
            if (data.zone === 'center' && Math.abs(dx) > 30) {
                if (dx < 0) {
                    KEYS.left = true;
                    KEYS.right = false;
                } else {
                    KEYS.right = true;
                    KEYS.left = false;
                }
            }
        }
    }, { passive: false });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        
        for (const touch of e.changedTouches) {
            const data = activeTouches[touch.identifier];
            if (!data) continue;
            
            const elapsed = Date.now() - data.startTime;
            const dx = Math.abs(touch.clientX - data.startX);
            const dy = touch.clientY - data.startY;
            
            // Tap rapido senza movimento = salta
            if (elapsed < 250 && dx < 15 && Math.abs(dy) < 15 && data.zone === 'center') {
                KEYS.space = true;
                setTimeout(() => { KEYS.space = false; }, 120);
            }
            
            // Rilascia il tasto associato alla zona
            if (data.zone === 'left') {
                KEYS.left = false;
            } else if (data.zone === 'right') {
                KEYS.right = false;
            }
            
            // Se non ci sono più tocchi nella zona, rilascia il salto
            if (data.zone === 'center') {
                KEYS.space = false;
            }
            
            delete activeTouches[touch.identifier];
        }
        
        // Verifica se restano tocchi attivi nelle zone
        let hasLeft = false, hasRight = false;
        for (const id in activeTouches) {
            if (activeTouches[id].zone === 'left') hasLeft = true;
            if (activeTouches[id].zone === 'right') hasRight = true;
        }
        if (!hasLeft) KEYS.left = false;
        if (!hasRight) KEYS.right = false;
    }, { passive: false });
    
    canvas.addEventListener('touchcancel', (e) => {
        for (const touch of e.changedTouches) {
            delete activeTouches[touch.identifier];
        }
        KEYS.left = false;
        KEYS.right = false;
        KEYS.space = false;
    });
}
