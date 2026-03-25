/* ==========================================================================
   background.js  —  Background scenery + scrolling ground
   ========================================================================== */

import { CFG, STATUS, ctx, screen, dp } from '../core/config.js';
import { ASSETS } from '../core/assets.js';

/* ── State ── */
export let bgRealIdx     = 0;
export let bgRealTimer   = 0;
export let bgCloudOffset = 0;
export let groundOffset  = 0;

export function resetBackground() {
  bgRealIdx     = 0;
  bgRealTimer   = 0;
  bgCloudOffset = 0;
  groundOffset  = 0;
}

/* ── Update ── */
export function updateBackground(currentStatus, dt, totalScale) {
  bgCloudOffset += CFG.BG_CLOUD_SPEED * dt;

  if (currentStatus === STATUS.NORMAL) {
    bgRealTimer += dt * 1000;
    if (bgRealTimer >= CFG.BG_REAL_CHANGE_MS) {
      bgRealTimer = 0;
      bgRealIdx = (bgRealIdx + 1) % 4;
    }
  }

  // Ground scrolls only while running — stops on GAME_OVER
  if (currentStatus === STATUS.NORMAL) {
    const gw = dp(CFG.GROUND_WIDTH);
    groundOffset -= dp(CFG.BLOCK_SPEED) * totalScale;
    while (groundOffset <= -gw) groundOffset += gw;
  }
}

/* ── Draw sky + clouds ── */
export function drawBackground() {
  const bgRealKey = `bg_real_${String(bgRealIdx + 1).padStart(2, '0')}`;
  const bgReal = ASSETS[bgRealKey];
  if (bgReal) ctx.drawImage(bgReal, 0, 0, screen.W, screen.H);

  const bgCloud = ASSETS['bg_cloud_01'];
  if (bgCloud) {
    const cw  = bgCloud.width * (screen.H / bgCloud.height);
    const off = bgCloudOffset % cw;
    for (let x = -off; x < screen.W; x += cw) {
      ctx.drawImage(bgCloud, x, 0, cw, screen.H);
    }
  }
}

/* ── Draw ground tiles ── */
export function drawGround() {
  const groundH = dp(CFG.GROUND_HEIGHT);
  const groundM = dp(CFG.GROUND_MARGIN);
  const gw      = dp(CFG.GROUND_WIDTH);
  const topY    = screen.H - groundH;

  // Bottom fill
  const gbImg = ASSETS.bg_ground_bottom;
  if (gbImg) {
    ctx.drawImage(gbImg, 0, topY + (groundH - groundM), screen.W, groundM);
  } else {
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(0, topY + (groundH - groundM), screen.W, groundM);
  }

  // Top tiles
  const gtImg = ASSETS.bg_ground_up;
  if (gtImg) {
    for (let x = groundOffset; x < screen.W; x += gw) {
      ctx.drawImage(gtImg, x, topY, gw, groundH - groundM);
    }
  } else {
    ctx.fillStyle = '#4CAF50';
    for (let x = groundOffset; x < screen.W; x += gw) {
      ctx.fillRect(x, topY, gw, groundH - groundM);
    }
  }
}
