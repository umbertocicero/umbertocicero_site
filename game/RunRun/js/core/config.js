/* ==========================================================================
   config.js  —  Game constants, canvas setup, scaling utilities
   ========================================================================== */

export const CFG = {
  FPS: 60,
  GROUND_HEIGHT:    50,
  GROUND_WIDTH:     15,
  GROUND_MARGIN:    40,
  BLOCK_MIN:        38,
  BLOCK_WIDTH:      60,
  BLOCK_SPEED:       6,
  MAN_HEIGHT:       85,
  MAN_ACCEL:       0.35,
  MAN_TAP_SPEED:  -9.6,
  MAN_POS_X:       110,
  HIT_PAD_TOP:      15,
  HIT_PAD_RIGHT:    15,
  HIT_PAD_LEFT:     15,
  HIT_PAD_BOTTOM:   15,
  GROUND_DOWN_PAD:  13,
  COIN_WIDTH:       30,
  COIN_SPEED:        6,
  AIRPLANE_WIDTH:   70,
  AIRPLANE_HEIGHT:  28,
  AIRPLANE_SPEED:  7.9,
  INCREASE_SPEED:  0.6,
  SCORE_SIZE:       60,
  SCORE_MARGIN:     70,

  // Spawn timings (ms)
  BLOCKER_SPAWN_MIN: 1200, BLOCKER_SPAWN_MAX: 3800,
  COIN_SPAWN_MIN: 1000,    COIN_SPAWN_MAX: 2500,
  HEART_SPAWN_MIN_SEC: 30, HEART_SPAWN_MAX_SEC: 45,
  HEART_LOW_HP_FACTOR: 0.6,
  MULT_SPAWN_MIN: 20000,   MULT_SPAWN_MAX: 26000,
  BONUS_SPAWN_MIN: 30000,  BONUS_SPAWN_MAX: 38000,
  AIRPLANE_SPAWN_MIN: 4500, AIRPLANE_SPAWN_MAX: 7000,
  BONUS_FRUIT_UNLOCK_SEC: 80,

  // Game logic
  POINT_INCREASE_SPEED: 13,
  GHOST_DURATION: 3000,
  BONUS_DURATION: 3500,
  MAX_HEARTS: 3,
  SPEED_DOUBLE_AFTER_MS: 180000,
  SPEED_MAX_SCALE: 2.0,

  // Background timing
  BG_REAL_CHANGE_MS: 60000,
  BG_CLOUD_SPEED: 24,
};

export const STATUS = { NOT_STARTED: 1, NORMAL: 0, GAME_OVER: 2 };

/* ── Canvas ── */
export const canvas = document.getElementById('gameCanvas');
export const ctx = canvas.getContext('2d');

/** Shared mutable screen metrics */
export const screen = { W: 0, H: 0, SCALE: 1 };

export function resize() {
  const dpr = window.devicePixelRatio || 1;
  screen.W = window.innerWidth;
  screen.H = window.innerHeight;
  canvas.width  = screen.W * dpr;
  canvas.height = screen.H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  screen.SCALE = Math.min(screen.W, screen.H) / 360;
}

export function dp(v) { return v * screen.SCALE; }

export function randRange(min, max) { return min + Math.random() * (max - min); }

window.addEventListener('resize', resize);
resize();
