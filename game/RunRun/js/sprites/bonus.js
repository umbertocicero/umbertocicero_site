/* ==========================================================================
   bonus.js  —  Bonus fruit sprites
   ========================================================================== */

import { CFG, ctx, screen, dp } from '../core/config.js';
import { ASSETS } from '../core/assets.js';
import { aabbSegment } from '../core/collision.js';
import { manMaxY } from './player.js';

const BONUS_IMGS = ['cherry', 'fragola', 'pera', 'banana', 'ananas'];

export let bonuses = [];

export function resetBonuses() { bonuses = []; }

/* ── Spawn ── */
export function spawnBonus(idx) {
  const sz = dp(CFG.COIN_WIDTH);
  const cy = screen.H / 4 + Math.random() * screen.H / 2 - sz / 2;
  bonuses.push({ x: screen.W + sz, y: Math.min(cy, manMaxY() - sz), size: sz, collected: false, idx });
}

export function allBonusesOut() {
  return bonuses.length === 0 || bonuses.every(b => screen.W - b.x > b.size * 2);
}

/* ── Update ── */
export function updateBonuses(totalScale, increaseSpeed, mb, onGetBonus) {
  for (let i = bonuses.length - 1; i >= 0; i--) {
    const bo = bonuses[i];
    bo.x -= (dp(CFG.COIN_SPEED) + increaseSpeed) * totalScale;
    if (bo.x + bo.size < 0) { bonuses.splice(i, 1); continue; }
    if (!bo.collected) {
      if (aabbSegment(bo.x, bo.y, bo.x + bo.size, bo.y, mb.left, mb.top, mb.right, mb.bottom) ||
          aabbSegment(bo.x, bo.y + bo.size, bo.x + bo.size, bo.y + bo.size, mb.left, mb.top, mb.right, mb.bottom)) {
        bo.collected = true;
        onGetBonus(bo.idx);
      }
    }
  }
}

/* ── Draw ── */
export function drawBonuses() {
  for (const bo of bonuses) {
    if (bo.collected || bo.x + bo.size < 0 || bo.x > screen.W) continue;
    const img = ASSETS[BONUS_IMGS[bo.idx]];
    if (img) ctx.drawImage(img, bo.x, bo.y, bo.size, bo.size);
  }
}
