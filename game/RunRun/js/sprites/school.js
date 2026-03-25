/* ==========================================================================
   school.js  —  School intro building sprite
   ========================================================================== */

import { CFG, STATUS, ctx, screen, dp } from '../core/config.js';
import { ASSETS } from '../core/assets.js';
import { man } from './player.js';

const SCHOOL_SPEED = 8;

export const school = { x: 0, y: 0, w: 0, h: 0, alive: true };

export function initSchool() {
  const schoolImg = ASSETS.school;
  if (!schoolImg) { school.alive = false; return; }

  const groundH   = dp(CFG.GROUND_HEIGHT);
  const marginTop = dp(CFG.SCORE_MARGIN);
  const availH    = Math.max(1, screen.H - marginTop - groundH);
  const availW    = Math.max(1, screen.W * 0.85);
  const s         = Math.min(availW / schoolImg.width, availH / schoolImg.height);

  school.w = Math.round(schoolImg.width  * s);
  school.h = Math.round(schoolImg.height * s);
  school.y = screen.H - groundH - school.h;
  school.x = man.x - school.w * 0.3;
  school.alive = true;
}

export function updateSchool(currentStatus, totalScale) {
  if (currentStatus === STATUS.NORMAL && school.alive) {
    school.x -= dp(SCHOOL_SPEED) * totalScale;
    if (school.x + school.w < 0) school.alive = false;
  }
}

/** Draw school behind the man (both NOT_STARTED and NORMAL) */
export function drawSchool(currentStatus) {
  if (!school.alive) return;
  if (currentStatus === STATUS.GAME_OVER) return;
  const img = ASSETS.school;
  if (img) ctx.drawImage(img, school.x, school.y, school.w, school.h);
}

/** No longer used — kept as no-op for API compat */
export function drawSchoolFront() {}
