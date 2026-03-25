/* ==========================================================================
   blocker.js  —  Blocker (book) sprites
   ========================================================================== */

import { CFG, ctx, screen, dp } from '../core/config.js';
import { ASSETS } from '../core/assets.js';

export let blockers = [];

export function resetBlockers() { blockers = []; }

/* ── Spawn ── */
export function spawnBlocker() {
  const bw      = dp(CFG.BLOCK_WIDTH);
  const groundH = dp(CFG.GROUND_HEIGHT);
  const minB    = dp(CFG.BLOCK_MIN);
  const birdH   = dp(CFG.MAN_HEIGHT);
  const maxTop  = screen.H - groundH - birdH + minB;
  const topY    = maxTop - Math.random() * minB * 2;
  blockers.push({ x: screen.W, topY, w: bw, maxBottom: screen.H - groundH });
}

export function allBlockersOut() {
  if (blockers.length === 0) return true;
  const minGap = screen.W * 0.35;
  return blockers.every(b => b.x + b.w < screen.W - minGap);
}

/* ── Update ── */
export function updateBlockers(totalScale, increaseSpeed, mb, isGhostActive) {
  let hit = false;
  for (let i = blockers.length - 1; i >= 0; i--) {
    const b = blockers[i];
    b.x -= (dp(CFG.BLOCK_SPEED) + increaseSpeed) * totalScale;
    if (b.x + b.w < 0) { blockers.splice(i, 1); continue; }

    const bLeft = b.x, bRight = b.x + b.w;
    if (mb.bottom > b.topY &&
        ((mb.right > bLeft && mb.right < bRight) ||
         (mb.left  > bLeft && mb.left  < bRight))) {
      if (!isGhostActive) { hit = true; break; }
    }
  }
  return hit;
}

/* ── Draw ── */
export function drawBlockers() {
  const img = ASSETS.blocker;
  for (const b of blockers) {
    if (b.x + b.w <= 0 || b.x >= screen.W) continue;
    if (img) {
      ctx.drawImage(img, b.x, b.topY, b.w, b.maxBottom - b.topY);
    } else {
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(b.x, b.topY, b.w, b.maxBottom - b.topY);
    }
  }
}
