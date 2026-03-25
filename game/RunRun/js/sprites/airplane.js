/* ==========================================================================
   airplane.js  —  Airplane sprites
   ========================================================================== */

import { CFG, ctx, screen, dp } from '../core/config.js';
import { ASSETS } from '../core/assets.js';
import { boxOverlap } from '../core/collision.js';

export let airplanes = [];

export function resetAirplanes() { airplanes = []; }

/* ── Spawn ── */
export function spawnAirplane() {
  const aw = dp(CFG.AIRPLANE_WIDTH);
  const ah = dp(CFG.AIRPLANE_HEIGHT);
  const ay = dp(CFG.MAN_HEIGHT) + Math.random() * (screen.H / 2 - dp(CFG.MAN_HEIGHT));
  airplanes.push({ x: screen.W + aw, y: ay, w: aw, h: ah, hit: false });
}

/* ── Update ── */
export function updateAirplanes(totalScale, increaseSpeed, mb, isGhostActive) {
  let hit = false;
  for (let i = airplanes.length - 1; i >= 0; i--) {
    const a = airplanes[i];
    a.x -= (dp(CFG.AIRPLANE_SPEED) + increaseSpeed) * totalScale;
    if (a.hit) {
      a.y += (dp(CFG.AIRPLANE_SPEED) + increaseSpeed) * totalScale;
    }
    if (a.x + a.w < 0 || a.y > screen.H) { airplanes.splice(i, 1); continue; }
    if (!a.hit) {
      if (boxOverlap(a.x, a.y, a.w, a.h, mb.left, mb.top, mb.right - mb.left, mb.bottom - mb.top)) {
        a.hit = true;
        if (!isGhostActive) { hit = true; break; }
      }
    }
  }
  return hit;
}

/* ── Draw ── */
export function drawAirplanes() {
  for (const a of airplanes) {
    if (a.x + a.w < 0 || a.x > screen.W) continue;
    const img = a.hit ? ASSETS.airplane2 : ASSETS.airplane;
    if (img) ctx.drawImage(img, a.x, a.y, a.w, a.h);
  }
}
