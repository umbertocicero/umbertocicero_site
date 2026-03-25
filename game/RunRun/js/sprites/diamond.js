/* ==========================================================================
   diamond.js  —  Diamond (multiplier) pickup sprites
   ========================================================================== */

import { CFG, ctx, screen, dp } from '../core/config.js';
import { ASSETS } from '../core/assets.js';
import { aabbSegment } from '../core/collision.js';
import { manMaxY } from './player.js';

export let diamonds = [];

export function resetDiamonds() { diamonds = []; }

/* ── Spawn ── */
export function spawnDiamond() {
  const sz = dp(CFG.COIN_WIDTH);
  const cy = screen.H / 4 + Math.random() * screen.H / 2 - sz / 2;
  diamonds.push({ x: screen.W + sz, y: Math.min(cy, manMaxY() - sz), size: sz, collected: false });
}

export function allDiamondsOut() {
  return diamonds.length === 0 || diamonds.every(d => screen.W - d.x > d.size * 2);
}

/* ── Update ── */
export function updateDiamonds(totalScale, increaseSpeed, mb, onGetMultiplier) {
  for (let i = diamonds.length - 1; i >= 0; i--) {
    const d = diamonds[i];
    d.x -= (dp(CFG.COIN_SPEED) + increaseSpeed) * totalScale;
    if (d.x + d.size < 0) { diamonds.splice(i, 1); continue; }
    if (!d.collected) {
      if (aabbSegment(d.x, d.y, d.x + d.size, d.y, mb.left, mb.top, mb.right, mb.bottom) ||
          aabbSegment(d.x, d.y + d.size, d.x + d.size, d.y + d.size, mb.left, mb.top, mb.right, mb.bottom)) {
        d.collected = true;
        onGetMultiplier();
      }
    }
  }
}

/* ── Draw ── */
export function drawDiamonds() {
  const img = ASSETS.diamond;
  for (const d of diamonds) {
    if (d.collected || d.x + d.size < 0 || d.x > screen.W) continue;
    if (img) ctx.drawImage(img, d.x, d.y, d.size, d.size);
  }
}
