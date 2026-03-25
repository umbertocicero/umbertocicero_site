/* ==========================================================================
   coin.js  —  Coin sprites (spinning 3-D effect)
   ========================================================================== */

import { CFG, ctx, screen, dp } from '../core/config.js';
import { ASSETS } from '../core/assets.js';
import { boxOverlap } from '../core/collision.js';
import { manMaxY } from './player.js';

export let coins = [];

export function resetCoins() { coins = []; }

/* ── Spawn ── */
export function spawnCoin() {
  const sz = dp(CFG.COIN_WIDTH);
  const cy = screen.H / 4 + Math.random() * screen.H / 2 - sz / 2;
  coins.push({
    x: screen.W + sz,
    y: Math.min(cy, manMaxY() - sz),
    size: sz,
    collected: false,
    spin: Math.random() * Math.PI * 2,
  });
}

export function allCoinsOut() {
  return coins.length === 0 || coins.every(c => screen.W - c.x > c.size * 2);
}

/* ── Update ── */
export function updateCoins(totalScale, increaseSpeed, mb, dt, onGetPoint) {
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    c.x -= (dp(CFG.COIN_SPEED) + increaseSpeed) * totalScale;
    c.spin += dt * 6;
    if (c.x + c.size < 0) { coins.splice(i, 1); continue; }

    if (!c.collected && boxOverlap(c.x, c.y, c.size, c.size,
        mb.left, mb.top, mb.right - mb.left, mb.bottom - mb.top)) {
      c.collected = true;
      onGetPoint(1);
    }
  }
}

/* ── Draw ── */
export function drawCoins() {
  const img = ASSETS.coin;
  for (const c of coins) {
    if (c.collected || c.x + c.size < 0 || c.x > screen.W) continue;
    const scaleX = Math.cos(c.spin);
    const cx = c.x + c.size / 2;
    const cy = c.y + c.size / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(Math.abs(scaleX) < 0.05 ? 0.05 : scaleX, 1);
    if (img) ctx.drawImage(img, -c.size / 2, -c.size / 2, c.size, c.size);
    else { ctx.fillStyle = '#FFD700'; ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size); }
    ctx.restore();
  }
}
