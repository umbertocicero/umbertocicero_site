/* ==========================================================================
   heart.js  —  Heart pickup sprites
   ========================================================================== */

import { CFG, ctx, screen, dp } from '../core/config.js';
import { ASSETS } from '../core/assets.js';
import { aabbSegment } from '../core/collision.js';
import { manMaxY } from './player.js';

export let hearts = [];

export function resetHearts() { hearts = []; }

/* ── Spawn ── */
export function spawnHeart() {
  const sz = dp(CFG.COIN_WIDTH);
  const cy = screen.H / 4 + Math.random() * screen.H / 2 - sz / 2;
  hearts.push({ x: screen.W + sz, y: Math.min(cy, manMaxY() - sz), size: sz, collected: false });
}

export function allHeartsOut() {
  return hearts.length === 0 || hearts.every(h => screen.W - h.x > h.size * 2);
}

/* ── Update ── */
export function updateHearts(totalScale, increaseSpeed, mb, onGetHeart) {
  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i];
    h.x -= (dp(CFG.COIN_SPEED) + increaseSpeed) * totalScale;
    if (h.x + h.size < 0) { hearts.splice(i, 1); continue; }
    if (!h.collected) {
      const sz = h.size;
      if (aabbSegment(h.x, h.y, h.x + sz, h.y, mb.left, mb.top, mb.right, mb.bottom) ||
          aabbSegment(h.x, h.y + sz, h.x + sz, h.y + sz, mb.left, mb.top, mb.right, mb.bottom)) {
        h.collected = true;
        onGetHeart();
      }
    }
  }
}

/* ── Draw ── */
export function drawHearts() {
  const img = ASSETS.heart;
  for (const h of hearts) {
    if (h.collected || h.x + h.size < 0 || h.x > screen.W) continue;
    if (img) ctx.drawImage(img, h.x, h.y, h.size, h.size);
  }
}
