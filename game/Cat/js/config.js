// ============================================
// CONFIG - Configurazione globale del gioco
// ============================================

// Detect mobile / small-screen
const IS_MOBILE = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
                  || (window.innerWidth <= 1024 && 'ontouchstart' in window);

const CONFIG = {
    // Canvas — logical (game-world) size. Overwritten by resizeCanvas()
    canvasWidth: 1200,
    canvasHeight: 700,

    // Display scale — how much the game-world is zoomed on screen
    // Bigger = closer view, bigger sprites. Mobile gets a tighter camera.
    baseZoom: IS_MOBILE ? 1.6 : 1.0,
    zoom: 1.0,                       // actual value set by resizeCanvas()
    
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

// Mobile touch controls — Virtual Joystick + Jump Button
// Joystick on the LEFT, Jump button on the RIGHT
const TOUCH_CTRL = {
    active: false,           // true once setupMobileControls runs
    // Joystick state (left side of screen)
    joy: {
        baseX: 0, baseY: 0,
        stickX: 0, stickY: 0,
        radius: 54,           // base circle radius
        stickRadius: 30,      // moveable stick radius
        touchId: null,
        pressed: false
    },
    // Jump button (right side of screen) — single big button
    jump: {
        x: 0, y: 0,
        radius: 46,           // bigger for easy thumb reach
        touchId: null,
        pressed: false,
        flash: 0
    }
};

function layoutTouchControls() {
    // Called on init and on resize.
    // Positions are in *logical* (game) coords — the canvas context is
    // already scaled by zoom*dpr so we work in CONFIG.canvasWidth/Height space.
    const vw = CONFIG.canvasWidth;
    const vh = CONFIG.canvasHeight;

    const pad   = IS_MOBILE ? 30 : 40;     // distance from edge
    const bottom = vh - pad - 50;

    // Joystick — bottom‑left
    TOUCH_CTRL.joy.baseX = pad + TOUCH_CTRL.joy.radius + 10;
    TOUCH_CTRL.joy.baseY = bottom;
    TOUCH_CTRL.joy.stickX = TOUCH_CTRL.joy.baseX;
    TOUCH_CTRL.joy.stickY = TOUCH_CTRL.joy.baseY;

    // Jump — bottom‑right
    TOUCH_CTRL.jump.x = vw - pad - TOUCH_CTRL.jump.radius - 10;
    TOUCH_CTRL.jump.y = bottom;
}

function setupMobileControls() {
    if (!IS_MOBILE) return;

    TOUCH_CTRL.active = true;
    layoutTouchControls();

    const canvas = document.getElementById('gameCanvas');

    // ── helpers to convert page coords → logical game coords ──
    function pageToLogical(px, py) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (px - rect.left) / rect.width  * CONFIG.canvasWidth,
            y: (py - rect.top)  / rect.height * CONFIG.canvasHeight
        };
    }

    function dist(ax, ay, bx, by) {
        return Math.hypot(ax - bx, ay - by);
    }

    // ── TOUCH START ──
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            const p = pageToLogical(touch.clientX, touch.clientY);
            const joy = TOUCH_CTRL.joy;
            const jmp = TOUCH_CTRL.jump;

            // 1) Check jump button first (generous hit area)
            if (jmp.touchId === null && dist(p.x, p.y, jmp.x, jmp.y) < jmp.radius * 1.5) {
                jmp.touchId = touch.identifier;
                jmp.pressed = true;
                jmp.flash = 6;
                KEYS.space = true;
                continue;
            }

            // 2) Left half of screen → joystick
            if (joy.touchId === null && p.x < CONFIG.canvasWidth * 0.5) {
                joy.touchId = touch.identifier;
                joy.pressed = true;
                // snap base to where the finger landed
                joy.baseX = p.x;
                joy.baseY = p.y;
                joy.stickX = p.x;
                joy.stickY = p.y;
            }
        }
    }, { passive: false });

    // ── TOUCH MOVE ──
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            const p = pageToLogical(touch.clientX, touch.clientY);
            const joy = TOUCH_CTRL.joy;

            if (touch.identifier === joy.touchId) {
                // Clamp stick within radius
                const dx = p.x - joy.baseX;
                const dy = p.y - joy.baseY;
                const d  = Math.hypot(dx, dy);
                const maxR = joy.radius;
                if (d > maxR) {
                    joy.stickX = joy.baseX + (dx / d) * maxR;
                    joy.stickY = joy.baseY + (dy / d) * maxR;
                } else {
                    joy.stickX = p.x;
                    joy.stickY = p.y;
                }

                // Map to KEYS with a dead-zone of 0.25
                const nx = (joy.stickX - joy.baseX) / maxR;
                const ny = (joy.stickY - joy.baseY) / maxR;

                KEYS.left  = nx < -0.25;
                KEYS.right = nx > 0.25;
                KEYS.up    = ny < -0.45;   // push up on stick → climb up
                KEYS.down  = ny > 0.45;
            }
        }
    }, { passive: false });

    // ── TOUCH END ──
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            const joy = TOUCH_CTRL.joy;
            const jmp = TOUCH_CTRL.jump;

            if (touch.identifier === joy.touchId) {
                joy.touchId = null;
                joy.pressed = false;
                joy.stickX = joy.baseX;
                joy.stickY = joy.baseY;
                KEYS.left = false;
                KEYS.right = false;
                KEYS.up = false;
                KEYS.down = false;
            }
            if (touch.identifier === jmp.touchId) {
                jmp.touchId = null;
                jmp.pressed = false;
                KEYS.space = false;
            }
        }
    }, { passive: false });

    canvas.addEventListener('touchcancel', (e) => {
        for (const touch of e.changedTouches) {
            if (touch.identifier === TOUCH_CTRL.joy.touchId)  { TOUCH_CTRL.joy.touchId = null;  TOUCH_CTRL.joy.pressed = false; }
            if (touch.identifier === TOUCH_CTRL.jump.touchId) { TOUCH_CTRL.jump.touchId = null; TOUCH_CTRL.jump.pressed = false; }
        }
        KEYS.left = KEYS.right = KEYS.up = KEYS.down = KEYS.space = false;
    });
}
