/* ==========================================================================
   game.js  —  Main orchestrator: state, update, draw, input, boot
   ========================================================================== */

import { CFG, STATUS, canvas, ctx, screen, dp, resize, randRange } from './core/config.js';
import { loadAllAssets, loadAtlas, playSound, toggleSound } from './core/assets.js';
import { setAtlas, initMan, manIsDown, manTap, manHitBox, updateMan, drawMan } from './sprites/player.js';
import { initSchool, updateSchool, drawSchool, drawSchoolFront } from './sprites/school.js';
import { resetBlockers, spawnBlocker, allBlockersOut, updateBlockers, drawBlockers } from './sprites/blocker.js';
import { resetCoins, spawnCoin, allCoinsOut, updateCoins, drawCoins } from './sprites/coin.js';
import { resetHearts, spawnHeart, allHeartsOut, updateHearts, drawHearts } from './sprites/heart.js';
import { resetDiamonds, spawnDiamond, allDiamondsOut, updateDiamonds, drawDiamonds } from './sprites/diamond.js';
import { resetBonuses, spawnBonus, allBonusesOut, updateBonuses, drawBonuses } from './sprites/bonus.js';
import { resetAirplanes, spawnAirplane, updateAirplanes, drawAirplanes } from './sprites/airplane.js';
import { resetBackground, updateBackground, drawBackground, drawGround } from './ui/background.js';
import { drawHUD, drawHint, drawSplash, pauseBtnRect, soundBtnRect, reloadBtnRect, hitTest } from './ui/hud.js';

/* ──────────────── GAME STATE ──────────────── */
let currentStatus   = STATUS.NOT_STARTED;
let currentHeart    = CFG.MAX_HEARTS;
let currentPoint    = 0;
let highestScore    = parseInt(localStorage.getItem('rr_high') || '0', 10);
let multiplier      = 1;
let increaseSpeed   = 0;
let plusSpeed       = 1;
let maxPlus         = CFG.POINT_INCREASE_SPEED;
let hitTime         = 0;
let bonusTime       = 0;
let bonusUnlocked   = 0;
let activeRunMs     = 0;
let allowSecondJump = false;
let paused          = false;
let pauseStartTime  = 0;
let totalPausedMs   = 0;
let splashAlpha     = 1;
let splashTimer     = 0;
const SPLASH_LIFE   = 500;

let selectedChar = localStorage.getItem('rr_char') || 'man';

/* ── Spawn schedulers ── */
let nextBlockerAt  = 0;
let nextCoinAt     = 0;
let nextHeartAt    = 0;
let nextMultAt     = 0;
let nextBonusAt    = 0;
let nextAirplaneAt = 0;

/* ── Helpers ── */
function isGhostActive() { return (performance.now() - hitTime) < CFG.GHOST_DURATION; }
function isBonusActive()  { return (performance.now() - bonusTime) < CFG.BONUS_DURATION; }

function timeScale() {
  const prog = Math.min(1, activeRunMs / CFG.SPEED_DOUBLE_AFTER_MS);
  return 1 + (CFG.SPEED_MAX_SCALE - 1) * prog;
}

/* ──────────────── SCORING ──────────────── */
function checkIncreaseSpeed() {
  if (currentPoint > maxPlus) {
    plusSpeed++;
    maxPlus = CFG.POINT_INCREASE_SPEED * plusSpeed + currentPoint;
    return true;
  }
  return false;
}

function onGetPoint(pts) {
  currentPoint += pts * multiplier;
  if (checkIncreaseSpeed()) increaseSpeed += dp(CFG.INCREASE_SPEED);
  playSound('point', 0.4);
}

function onGetHeart() {
  if (currentHeart < CFG.MAX_HEARTS) {
    currentHeart++;
    playSound('wing', 0.6);
  }
}

function onGetMultiplier() {
  multiplier++;
  playSound('wow', 0.5);
}

function onGetBonus(idx) {
  currentPoint += (idx + 1) * 5;
  if (!isBonusActive()) bonusTime = performance.now();
  if (bonusUnlocked < 4) bonusUnlocked++;
  playSound('wow', 0.5);
}

/* ──────────────── RESTART ──────────────── */
function restart() {
  currentStatus   = STATUS.NOT_STARTED;
  currentHeart    = CFG.MAX_HEARTS;
  currentPoint    = 0;
  multiplier      = 1;
  increaseSpeed   = 0;
  plusSpeed        = 1;
  maxPlus         = CFG.POINT_INCREASE_SPEED;
  hitTime         = 0;
  bonusTime       = 0;
  bonusUnlocked   = 0;
  activeRunMs     = 0;
  allowSecondJump = false;
  paused          = false;
  pauseStartTime  = 0;
  totalPausedMs   = 0;
  splashAlpha     = 1;
  splashTimer     = 0;

  resetBlockers();
  resetCoins();
  resetHearts();
  resetDiamonds();
  resetBonuses();
  resetAirplanes();
  resetBackground();

  const now = performance.now();
  nextBlockerAt  = now + randRange(CFG.BLOCKER_SPAWN_MIN, CFG.BLOCKER_SPAWN_MAX);
  nextCoinAt     = now + randRange(CFG.COIN_SPAWN_MIN, CFG.COIN_SPAWN_MAX);
  nextHeartAt    = now + randRange(CFG.HEART_SPAWN_MIN_SEC * 1000, CFG.HEART_SPAWN_MAX_SEC * 1000);
  nextMultAt     = now + randRange(CFG.MULT_SPAWN_MIN, CFG.MULT_SPAWN_MAX);
  nextBonusAt    = now + randRange(CFG.BONUS_SPAWN_MIN, CFG.BONUS_SPAWN_MAX);
  nextAirplaneAt = now + randRange(CFG.AIRPLANE_SPAWN_MIN, CFG.AIRPLANE_SPAWN_MAX);

  initMan();
  initSchool();
}

/* ──────────────── RESUME HELPER ──────────────── */
function resumeFromPause() {
  if (pauseStartTime > 0) {
    const pausedFor = performance.now() - pauseStartTime;
    totalPausedMs  += pausedFor;
    /* Shift every absolute-time scheduler forward so the paused interval is ignored */
    nextBlockerAt  += pausedFor;
    nextCoinAt     += pausedFor;
    nextHeartAt    += pausedFor;
    nextMultAt     += pausedFor;
    nextBonusAt    += pausedFor;
    nextAirplaneAt += pausedFor;
    pauseStartTime  = 0;
  }
  paused        = false;
  currentStatus = STATUS.NORMAL;
  playSound('bel');
}

/* ──────────────── UPDATE ──────────────── */
let lastFrameTime = 0;

function update(now) {
  const dtRaw = lastFrameTime ? (now - lastFrameTime) / 1000 : 1 / CFG.FPS;
  lastFrameTime = now;
  const dt = Math.min(dtRaw, 0.05);
  const fs = dt * CFG.FPS;
  const ts = timeScale();
  const totalScale = fs * ts;

  if (currentStatus === STATUS.NORMAL) activeRunMs += dt * 1000;

  updateBackground(currentStatus, dt, totalScale);
  updateSchool(currentStatus, totalScale);
  updateMan(currentStatus, dt, fs, isGhostActive());

  if (currentStatus === STATUS.GAME_OVER) {
    splashTimer++;
    if (splashTimer < SPLASH_LIFE) splashAlpha = 1 - splashTimer / SPLASH_LIFE;
  }

  if (currentStatus !== STATUS.NORMAL) return;

  /* ── Collisions & movement ── */
  const mb = manHitBox();
  const bonusActive = isBonusActive();
  let hit = false;

  hit = updateBlockers(totalScale, increaseSpeed, mb, isGhostActive());
  if (!hit) {
    updateCoins(totalScale, increaseSpeed, mb, dt, onGetPoint);
    updateHearts(totalScale, increaseSpeed, mb, onGetHeart);
    updateDiamonds(totalScale, increaseSpeed, mb, onGetMultiplier);
    updateBonuses(totalScale, increaseSpeed, mb, onGetBonus);
    if (updateAirplanes(totalScale, increaseSpeed, mb, isGhostActive())) hit = true;
  }

  /* ── Process hit ── */
  if (hit) {
    playSound('hit');
    if (currentHeart > 1) {
      hitTime = performance.now();
      currentHeart--;
      multiplier = 1;
      playSound('ouch');
    } else {
      currentStatus = STATUS.GAME_OVER;
      splashTimer   = 0;
      splashAlpha   = 1;
      playSound('die');
      if (currentPoint > highestScore) {
        highestScore = currentPoint;
        localStorage.setItem('rr_high', highestScore);
      }
    }
  }

  /* ── Spawning ── */
  const nowMs = now;

  if (nowMs >= nextBlockerAt && allCoinsOut() && allHeartsOut() && allBonusesOut() && allDiamondsOut()) {
    nextBlockerAt = nowMs + randRange(CFG.BLOCKER_SPAWN_MIN, CFG.BLOCKER_SPAWN_MAX);
    if (!bonusActive) spawnBlocker();
  }

  if (bonusActive) {
    if (allCoinsOut()) spawnCoin();
  } else if (nowMs >= nextCoinAt && allBlockersOut()) {
    nextCoinAt = nowMs + randRange(CFG.COIN_SPAWN_MIN, CFG.COIN_SPAWN_MAX);
    spawnCoin();
  }

  if (!bonusActive && nowMs >= nextHeartAt && allBlockersOut()) {
    const factor = currentHeart <= 1 ? CFG.HEART_LOW_HP_FACTOR : 1;
    nextHeartAt = nowMs + randRange(CFG.HEART_SPAWN_MIN_SEC * 1000 * factor, CFG.HEART_SPAWN_MAX_SEC * 1000 * factor);
    spawnHeart();
  }

  if (!bonusActive && nowMs >= nextMultAt && allBlockersOut()) {
    nextMultAt = nowMs + randRange(CFG.MULT_SPAWN_MIN, CFG.MULT_SPAWN_MAX);
    spawnDiamond();
  }

  if (!bonusActive && nowMs >= nextBonusAt && allBlockersOut()) {
    nextBonusAt = nowMs + randRange(CFG.BONUS_SPAWN_MIN, CFG.BONUS_SPAWN_MAX);
    const unlockByTime = CFG.BONUS_FRUIT_UNLOCK_SEC <= 0
      ? 4
      : Math.floor((activeRunMs / 1000) / CFG.BONUS_FRUIT_UNLOCK_SEC);
    const idx = Math.min(bonusUnlocked, Math.max(0, Math.min(unlockByTime, 4)));
    spawnBonus(idx);
  }

  if (nowMs >= nextAirplaneAt) {
    nextAirplaneAt = nowMs + randRange(CFG.AIRPLANE_SPAWN_MIN, CFG.AIRPLANE_SPAWN_MAX);
    if (!bonusActive) spawnAirplane();
  }
}

/* ──────────────── DRAW ──────────────── */
function draw() {
  ctx.clearRect(0, 0, screen.W, screen.H);
  ctx.imageSmoothingEnabled = false;

  drawBackground();
  drawBlockers();
  drawGround();
  drawCoins();
  drawHearts();
  drawDiamonds();
  drawBonuses();
  drawAirplanes();
  drawSchool(currentStatus);
  drawMan(currentStatus);
  drawSchoolFront(currentStatus);
  drawHUD(currentStatus, currentPoint, currentHeart, multiplier, highestScore, paused);

  if (currentStatus === STATUS.GAME_OVER) drawSplash(currentPoint, highestScore, splashAlpha);
  if (currentStatus === STATUS.NOT_STARTED) drawHint();
}

/* ──────────────── GAME LOOP ──────────────── */
function gameLoop(ts) {
  resize();
  if (!paused) {
    update(ts);
  } else {
    /* While paused, keep idle animation running and lastFrameTime fresh */
    const dtRaw = lastFrameTime ? (ts - lastFrameTime) / 1000 : 1 / CFG.FPS;
    lastFrameTime = ts;
    const dt = Math.min(dtRaw, 0.05);
    updateMan(STATUS.NOT_STARTED, dt, 0, false);
  }
  draw();
  requestAnimationFrame(gameLoop);
}

/* ──────────────── INPUT ──────────────── */
function handleTap(x, y) {
  if (hitTest(x, y, soundBtnRect())) { toggleSound(); return; }

  if (currentStatus === STATUS.NORMAL || currentStatus === STATUS.NOT_STARTED) {
    if (hitTest(x, y, pauseBtnRect())) {
      if (currentStatus === STATUS.NORMAL) {
        paused = true;
        pauseStartTime = performance.now();
        currentStatus = STATUS.NOT_STARTED;
      } else {
        resumeFromPause();
      }
      return;
    }
  }

  switch (currentStatus) {
    case STATUS.NOT_STARTED:
      resumeFromPause();
      break;

    case STATUS.NORMAL: {
      let jumpSound = false;
      if (manIsDown(true)) {
        allowSecondJump = true;
        manTap(false);
        jumpSound = true;
      } else if (allowSecondJump) {
        allowSecondJump = false;
        manTap(true);
        jumpSound = true;
      }
      if (jumpSound) playSound('wing', 0.6);
      break;
    }

    case STATUS.GAME_OVER:
      if (hitTest(x, y, reloadBtnRect())) {
        playSound('swooshing');
        restart();
      }
      break;
  }
}

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  handleTap(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
}, { passive: false });

canvas.addEventListener('mousedown', e => handleTap(e.clientX, e.clientY));

document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    handleTap(screen.W / 2, screen.H / 2);
  }
});

/* ──────────────── CHARACTER SELECT ──────────────── */
const charSelectEl = document.getElementById('charSelect');
const startBtn     = document.getElementById('startBtn');

document.querySelectorAll('.char-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.char-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedChar = btn.dataset.char;
  });
});

startBtn.addEventListener('click', async () => {
  localStorage.setItem('rr_char', selectedChar);
  setAtlas(await loadAtlas(selectedChar));
  charSelectEl.classList.add('hidden');
  restart();
  requestAnimationFrame(gameLoop);
});

/* ──────────────── BOOT ──────────────── */
(async () => {
  // Try to lock to landscape on mobile
  try { await window.screen.orientation?.lock?.('landscape'); } catch (e) { /* not supported or denied */ }

  await loadAllAssets();
  const saved = localStorage.getItem('rr_char') || 'man';
  document.querySelectorAll('.char-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.char === saved);
  });
  selectedChar = saved;
  charSelectEl.classList.remove('hidden');
})();
