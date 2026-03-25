/* ==========================================================================
   player.js  —  Player sprite (man / girl / dragon)
   ========================================================================== */

import { CFG, STATUS, ctx, screen, dp } from '../core/config.js';
import { ASSETS } from '../core/assets.js';

/* ── Player state ── */
export const man = {
  x: 0, y: 0, width: 0, height: 0,
  speed: 0, accel: 0,
  runFrame: 0, runTimer: 0,
  idleFrame: 0, idleTimer: 0,
  ghostMode: false, ghostAlpha: 0.4, ghostDir: 1,
  secondTap: false, angle: 0,
};

/** Current sprite atlas — set via setAtlas() after character selection */
export let atlas = null;
export function setAtlas(a) { atlas = a; }

/* ── Helpers ── */
export function manMaxY() { return screen.H - dp(CFG.GROUND_HEIGHT); }

export function manIsDown(pad) {
  const gp = pad ? dp(CFG.GROUND_DOWN_PAD) : 0;
  return man.y + man.height >= manMaxY() - gp;
}

export function manTap(second) {
  man.speed     = dp(CFG.MAN_TAP_SPEED);
  man.accel     = dp(CFG.MAN_ACCEL);
  man.secondTap = second;
  man.angle     = 0;
}

export function manHitBox() {
  return {
    left:   man.x + dp(CFG.HIT_PAD_LEFT),
    top:    man.y + dp(CFG.HIT_PAD_TOP),
    right:  man.x + man.width  - dp(CFG.HIT_PAD_RIGHT),
    bottom: man.y + man.height - dp(CFG.HIT_PAD_BOTTOM),
  };
}

/* ── Init ── */
export function initMan() {
  man.height = dp(CFG.MAN_HEIGHT);
  const f0   = atlas.getFrame('ic_m0.png');
  man.width  = f0 ? man.height * f0.w / f0.h : man.height;
  man.x      = screen.W / 2 - man.width / 2 - dp(CFG.MAN_POS_X);
  man.y      = manMaxY() - man.height;
  man.speed  = 0;
  man.accel  = 0;
  man.runFrame  = 0; man.runTimer  = 0;
  man.idleFrame = 0; man.idleTimer = 0;
  man.ghostMode = false;
  man.secondTap = false;
  man.angle     = 0;
}

/* ── Update ── */
export function updateMan(currentStatus, dt, fs, isGhostActive) {
  if (currentStatus === STATUS.NOT_STARTED) {
    man.idleTimer += dt;
    if (man.idleTimer >= 0.25) {
      man.idleTimer -= 0.25;
      man.idleFrame = (man.idleFrame + 1) % (atlas.animLen('idle') || 1);
    }
    if (man.y + man.height > manMaxY()) {
      man.y = manMaxY() - man.height;
      man.speed = 0; man.accel = 0;
    }
  } else if (currentStatus === STATUS.NORMAL) {
    // Gravity
    if (man.speed !== 0) {
      man.y     += man.speed * fs;
      man.speed += man.accel * fs;
    }
    if (man.y <= 0) man.y = 0;
    if (man.y + man.height > manMaxY()) {
      man.y = manMaxY() - man.height;
      man.speed = 0; man.accel = 0;
    }

    // Run / flip animation
    if (man.secondTap && !manIsDown(true)) {
      man.angle += 1440 * dt;
      if (man.angle >= 360) { man.angle = 0; man.secondTap = false; }
    } else {
      man.runTimer += dt;
      if (man.runTimer >= 0.08) {
        const steps = Math.floor(man.runTimer / 0.08);
        man.runTimer -= steps * 0.08;
        man.runFrame  = (man.runFrame + steps) % 3;
      }
    }

    // Ghost alpha pulsing
    if (man.ghostMode) {
      man.ghostAlpha += man.ghostDir * 15 * fs / 255;
      if (man.ghostAlpha > 1)   { man.ghostAlpha = 1;   man.ghostDir = -1; }
      if (man.ghostAlpha < 0.4) { man.ghostAlpha = 0.4;  man.ghostDir =  1; }
    }
    man.ghostMode = isGhostActive;
  }

  if (currentStatus === STATUS.GAME_OVER) {
    // Tombstone falls with gravity
    if (man.y + man.height < manMaxY()) {
      man.speed += dp(CFG.MAN_ACCEL) * fs;
      man.y     += man.speed * fs;
      if (man.y + man.height >= manMaxY()) {
        man.y = manMaxY() - man.height;
        man.speed = 0;
      }
    }
  }
}

/* ── Draw ── */
export function drawMan(currentStatus) {
  if (currentStatus === STATUS.GAME_OVER) {
    const rip = ASSETS.rip;
    if (rip) ctx.drawImage(rip, man.x, man.y, man.width, man.height);
    return;
  }

  const alpha = man.ghostMode ? man.ghostAlpha : 1;

  if (currentStatus === STATUS.NOT_STARTED) {
    atlas.draw('idle', man.idleFrame, man.x, man.y, man.height, alpha);
    return;
  }

  if (man.secondTap && !manIsDown(true)) {
    ctx.save();
    if (alpha < 1) ctx.globalAlpha = alpha;
    const cx = man.x + man.width / 2;
    const cy = man.y + man.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate(man.angle * Math.PI / 180);
    const f0 = atlas.getFrame('ic_m0.png');
    if (f0 && atlas.img) {
      const scale = man.height / f0.h;
      const dw = f0.w * scale;
      ctx.drawImage(atlas.img, f0.x, f0.y, f0.w, f0.h, -dw / 2, -man.height / 2, dw, man.height);
    }
    ctx.restore();
  } else {
    atlas.draw('run', man.runFrame, man.x, man.y, man.height, alpha);
  }
}
