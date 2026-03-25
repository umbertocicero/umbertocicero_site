/* ==========================================================================
   hud.js  —  Heads-up display, splash screen, hint overlay
   ========================================================================== */

import { CFG, STATUS, ctx, screen, dp } from '../core/config.js';
import { ASSETS, soundEnabled } from '../core/assets.js';

/* ── Button rectangles ── */
export function pauseBtnRect() {
  const sz = dp(28);
  return { x: screen.W - sz - dp(10), y: dp(10), w: sz, h: sz };
}

export function soundBtnRect() {
  const sz = dp(24);
  return { x: screen.W - sz - dp(12), y: dp(44), w: sz, h: sz };
}

export function reloadBtnRect() {
  const sz = dp(80);
  return { x: screen.W / 2 - sz / 2, y: screen.H / 2 + dp(10), w: sz, h: sz };
}

export function hitTest(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

/* ── HUD ── */
export function drawHUD(currentStatus, currentPoint, currentHeart, multiplier, highestScore, paused) {
  ctx.save();
  const fontSize = dp(28);
  ctx.font      = `${fontSize}px PixelFont, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Score
  ctx.fillStyle = '#000';
  ctx.fillText(currentPoint, screen.W / 2, dp(20));

  // Hearts (top left)
  const heartSz = dp(20);
  const heartImg = ASSETS.heart;
  for (let i = 0; i < currentHeart; i++) {
    if (heartImg) ctx.drawImage(heartImg, dp(12) + i * (heartSz + dp(4)), dp(12), heartSz, heartSz);
  }

  // Multiplier (below hearts)
  if (multiplier > 1) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ff5722';
    ctx.font = `${dp(18)}px PixelFont, monospace`;
    const diamondImg = ASSETS.diamond;
    const dSz = dp(16);
    const mX = dp(12);
    const mY = dp(12) + heartSz + dp(6);
    if (diamondImg) {
      ctx.drawImage(diamondImg, mX, mY, dSz, dSz);
    }
    ctx.fillText(`x${multiplier}`, mX + dSz + dp(4), mY);
  }

  // Best score
  ctx.font      = `${dp(16)}px PixelFont, monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#555';
  ctx.fillText(`Best: ${Math.max(highestScore, currentPoint)}`, screen.W / 2, dp(20) + fontSize + dp(4));

  // Pause button
  if (currentStatus === STATUS.NORMAL || currentStatus === STATUS.NOT_STARTED) {
    const pSz = dp(28);
    const pImg = paused ? ASSETS.play : ASSETS.pause;
    if (pImg) ctx.drawImage(pImg, screen.W - pSz - dp(10), dp(10), pSz, pSz);
  }

  drawSoundBtn();
  ctx.restore();
}

function drawSoundBtn() {
  const r = soundBtnRect();
  ctx.save();
  ctx.fillStyle = soundEnabled ? 'rgba(0,0,0,0.3)' : 'rgba(255,0,0,0.3)';
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, dp(4));
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `${dp(14)}px sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(soundEnabled ? '🔊' : '🔇', r.x + r.w / 2, r.y + r.h / 2);
  ctx.restore();
}

/* ── Hint overlay (NOT_STARTED) ── */
export function drawHint() {
  const img = ASSETS.hint;
  if (!img) return;
  const hw = dp(120), hh = hw * img.height / img.width;
  const hx = screen.W / 2 - hw / 2;
  const hy = screen.H / 2 - hh;
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 400);
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.drawImage(img, hx, hy, hw, hh);
  ctx.restore();
}

/* ── Game-over splash ── */
export function drawSplash(currentPoint, highestScore, splashAlpha) {
  const a = Math.max(0, splashAlpha);
  ctx.save();
  ctx.fillStyle = `rgba(180, 211, 197, ${a * 0.9})`;
  ctx.fillRect(0, 0, screen.W, screen.H);

  ctx.fillStyle    = '#000';
  ctx.font         = `${dp(30)}px PixelFont, monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Score: ${currentPoint}`, screen.W / 2, dp(CFG.SCORE_MARGIN));
  ctx.fillText(`Best: ${Math.max(highestScore, currentPoint)}`, screen.W / 2, screen.H / 2 - dp(20));

  const rlSz = dp(80);
  const rlImg = ASSETS.reload;
  if (rlImg) ctx.drawImage(rlImg, screen.W / 2 - rlSz / 2, screen.H / 2 + dp(10), rlSz, rlSz);

  ctx.restore();
}
