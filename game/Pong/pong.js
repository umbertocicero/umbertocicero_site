/* ================================================================
   Abyssal Pong — Dark Fantasy Pong
   Pure Canvas 2D · zero dependencies
   Inspired by Hollow Knight / Inside / Limbo
   Silhouette guardians · bioluminescent soul orb · deep abyss
   ================================================================ */
(() => {
"use strict";

/* ── DOM ───────────────────────────────────────────── */
const cvs    = document.getElementById("c");
const ctx    = cvs.getContext("2d");
const $intro = document.getElementById("ov-intro");
const $pause = document.getElementById("ov-pause");
const $go    = document.getElementById("ov-gameover");
const $goT   = document.getElementById("go-title");
const $goS   = document.getElementById("go-sub");
const $goSig = document.getElementById("go-sigil");
const $hudP1 = document.getElementById("hud-p1");
const $hudP2 = document.getElementById("hud-p2");
const $puHud = document.getElementById("powerup-hud");
const $puIco = document.getElementById("powerup-icon");
const $puLbl = document.getElementById("powerup-label");

/* ════════════════════════════════════════════════════
   CONFIG
   ════════════════════════════════════════════════════ */
const WIN_SCORE        = 7;
const GUARDIAN_W       = 18;
const GUARDIAN_H       = 100;
const ORB_R            = 10;
const ORB_SPEED_0      = 380;
const ORB_ACCEL        = 14;
const PADDLE_SPEED     = 500;
const SERVE_DELAY      = 1.0;
const BONUS_INTERVAL   = [7, 14];
const BONUS_LIFETIME   = 9;
const BONUS_SIZE       = 24;
const TRAIL_MAX        = 22;

/* Colour palette */
const C_SOUL    = [110, 234, 255];
const C_PHANTOM = [196, 77, 255];
const C_EMBER   = [255, 106, 58];
const C_GOLD    = [255, 224, 102];
const C_BONE    = [210, 225, 235];
const C_VOID    = [30, 50, 70];
const C_TEAL    = [50, 180, 160];

/* AI difficulty [apprendista, cavaliere, abissale] */
const AI_CFG = [
  { speed: 0.50, react: 0.40, err: 55, errFreq: 0.6 },
  { speed: 0.76, react: 0.60, err: 20, errFreq: 0.4 },
  { speed: 0.94, react: 0.82, err: 5,  errFreq: 0.2 },
];

/* ── Power-ups (dark fantasy flavour) ──────────────── */
const POWERUP_TYPES = [
  { id:"soulfire",   label:"Fuoco d'Anima",  icon:"🔥", color:[255,120,40],  },
  { id:"curse",      label:"Maledizione",     icon:"🌀", color:[180,60,255],  },
  { id:"split",      label:"Scissione",       icon:"✦",  color:[255,224,100], },
  { id:"aegis",      label:"Egida",           icon:"🛡",  color:[80,220,180],  },
  { id:"wither",     label:"Avvizzimento",    icon:"💀", color:[255,60,60],   },
  { id:"phantom",    label:"Fantasma",        icon:"👁",  color:[160,170,210], },
];

/* ════════════════════════════════════════════════════
   STATE
   ════════════════════════════════════════════════════ */
let W, H;
let difficulty = 1;
let phase = "intro";

let scoreP1 = 0, scoreP2 = 0;
let serveTimer = 0, serveDir = 1;

/* guardians (paddles) */
let g1 = { x:0, y:0, h:GUARDIAN_H, bob:0 };
let g2 = { x:0, y:0, h:GUARDIAN_H, bob:0, targetY:0, error:0 };

/* orbs (soul balls) */
let orbs = [];
function makeOrb(x, y, vx, vy) {
  return { x, y, vx, vy, r:ORB_R, speed:ORB_SPEED_0, trail:[],
           curveAmt:0, soulfire:false, phantom:false, alive:true };
}

/* field bonus */
let fieldBonus = null;
let bonusCD = 10;

/* player held power */
let playerPower = null;

/* timed effects */
let aegisTimer = 0, witherTimer = 0;

/* environment */
let particles = [];
let embers    = [];
let spores    = [];
let stalactites = [];
let ruins     = [];
let fogLayers = [];

let lastTs = 0;
const keys = {};

/* screen shake */
let shakeAmt = 0, shakeX = 0, shakeY = 0;

/* ════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════ */
const lerp  = (a,b,t) => a + (b-a) * t;
const clamp = (v,lo,hi) => Math.max(lo, Math.min(hi, v));
const rnd   = (lo,hi) => Math.random() * (hi-lo) + lo;
const rgb   = (c,a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const dist  = (ax,ay,bx,by) => Math.hypot(ax-bx, ay-by);

/* ════════════════════════════════════════════════════
   ENVIRONMENT GENERATION
   ════════════════════════════════════════════════════ */
function buildEnvironment() {
  /* stalactites hanging from top */
  stalactites = [];
  const numSt = Math.floor(W / 60);
  for (let i = 0; i < numSt; i++) {
    stalactites.push({
      x: rnd(0, W),
      w: rnd(4, 14),
      h: rnd(20, 90),
      off: rnd(0, 6),
    });
  }

  /* stalagmites from bottom (reuse as "ruins") */
  ruins = [];
  const numR = Math.floor(W / 80);
  for (let i = 0; i < numR; i++) {
    ruins.push({
      x: rnd(0, W),
      w: rnd(8, 30),
      h: rnd(15, 55),
    });
  }

  /* floating spores / bioluminescent particles */
  spores = [];
  for (let i = 0; i < 45; i++) {
    spores.push({
      x: rnd(0, W), y: rnd(0, H),
      vx: rnd(-8, 8), vy: rnd(-12, -3),
      r: rnd(1, 3.5),
      alpha: rnd(0.1, 0.45),
      phase: rnd(0, Math.PI * 2),
      hue: Math.random() < 0.7 ? C_SOUL : C_TEAL,
    });
  }

  /* fog layers */
  fogLayers = [];
  for (let i = 0; i < 4; i++) {
    fogLayers.push({
      y: H * rnd(0.3, 0.85),
      speed: rnd(5, 20) * (Math.random() < 0.5 ? 1 : -1),
      offset: rnd(0, W),
      alpha: rnd(0.02, 0.06),
      height: rnd(40, 120),
    });
  }

  /* embers (drifting upward) */
  embers = [];
  for (let i = 0; i < 20; i++) {
    embers.push({
      x: rnd(0, W), y: rnd(0, H),
      vy: rnd(-30, -10),
      vx: rnd(-5, 5),
      life: rnd(0.5, 1),
      maxLife: 1,
      r: rnd(1, 2.5),
      col: Math.random() < 0.4 ? C_EMBER : C_SOUL,
    });
  }
}

/* ════════════════════════════════════════════════════
   RESIZE
   ════════════════════════════════════════════════════ */
function resize() {
  const dpr = devicePixelRatio || 1;
  W = cvs.clientWidth; H = cvs.clientHeight;
  cvs.width = W * dpr; cvs.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  g1.x = 44;
  g2.x = W - 44 - GUARDIAN_W;
  if (phase === "intro") { g1.y = H / 2; g2.y = H / 2; }

  buildEnvironment();
}
window.addEventListener("resize", resize);

/* ════════════════════════════════════════════════════
   INIT / RESET
   ════════════════════════════════════════════════════ */
function resetRound() {
  const angle = rnd(-Math.PI / 5, Math.PI / 5);
  const speed = ORB_SPEED_0;
  orbs = [makeOrb(W / 2, H / 2,
    Math.cos(angle) * speed * serveDir,
    Math.sin(angle) * speed)];
  if (aegisTimer <= 0) g1.h = GUARDIAN_H;
  if (witherTimer <= 0) g2.h = GUARDIAN_H;
  g1.y = H / 2; g2.y = H / 2;
  g2.error = rnd(-AI_CFG[difficulty].err, AI_CFG[difficulty].err);
  serveTimer = SERVE_DELAY;
  phase = "countdown";
}

function startGame(diff) {
  difficulty = diff;
  scoreP1 = scoreP2 = 0;
  serveDir = 1;
  playerPower = null;
  fieldBonus = null;
  bonusCD = rnd(BONUS_INTERVAL[0], BONUS_INTERVAL[1]);
  aegisTimer = witherTimer = 0;
  g1.h = GUARDIAN_H; g2.h = GUARDIAN_H;
  particles = []; shakeAmt = 0;
  updateHUD();
  hidePowerHUD();
  resetRound();
}

/* ════════════════════════════════════════════════════
   HUD
   ════════════════════════════════════════════════════ */
function updateHUD() {
  $hudP1.textContent = scoreP1;
  $hudP2.textContent = scoreP2;
}
function showPowerHUD(pw) {
  $puIco.textContent = pw.icon;
  $puLbl.textContent = pw.label;
  $puHud.classList.remove("hidden");
}
function hidePowerHUD() { $puHud.classList.add("hidden"); }

/* ════════════════════════════════════════════════════
   PARTICLES
   ════════════════════════════════════════════════════ */
function spawnPart(x, y, col, count, spdMul) {
  for (let i = 0; i < count; i++) {
    const a = rnd(0, Math.PI * 2);
    const sp = rnd(50, 180) * (spdMul || 1);
    particles.push({
      x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp,
      life: 1, decay: rnd(1.0, 2.5), r: rnd(1.5, 4.5), col,
      glow: Math.random() < 0.3,
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += 30 * dt; // slight gravity
    p.life -= p.decay * dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

/* ════════════════════════════════════════════════════
   EMBERS & SPORES (ambient)
   ════════════════════════════════════════════════════ */
function updateAmbient(dt) {
  for (const s of spores) {
    s.x += s.vx * dt + Math.sin(s.phase) * 3 * dt;
    s.y += s.vy * dt;
    s.phase += dt * 0.8;
    if (s.y < -10) { s.y = H + 10; s.x = rnd(0, W); }
    if (s.x < -10) s.x = W + 10;
    if (s.x > W + 10) s.x = -10;
  }
  for (const e of embers) {
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.life -= 0.15 * dt;
    if (e.life <= 0 || e.y < -20) {
      e.x = rnd(0, W); e.y = H + rnd(0, 40);
      e.life = rnd(0.5, 1);
      e.vx = rnd(-5, 5); e.vy = rnd(-30, -10);
    }
  }
}

/* ════════════════════════════════════════════════════
   SCREEN SHAKE
   ════════════════════════════════════════════════════ */
function addShake(amt) { shakeAmt = Math.min(shakeAmt + amt, 12); }
function updateShake(dt) {
  if (shakeAmt > 0.1) {
    shakeX = rnd(-shakeAmt, shakeAmt);
    shakeY = rnd(-shakeAmt, shakeAmt);
    shakeAmt *= Math.max(0, 1 - 6 * dt);
  } else { shakeX = shakeY = 0; }
}

/* ════════════════════════════════════════════════════
   BONUS
   ════════════════════════════════════════════════════ */
function trySpawnBonus(dt) {
  if (fieldBonus) return;
  bonusCD -= dt;
  if (bonusCD > 0) return;
  const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  fieldBonus = {
    type, x: rnd(W*0.28, W*0.72), y: rnd(80, H-80),
    timer: BONUS_LIFETIME, pulse: 0, spawnY: 0,
  };
  bonusCD = rnd(BONUS_INTERVAL[0], BONUS_INTERVAL[1]);
}

function pickupBonus() {
  if (!fieldBonus) return;
  const type = fieldBonus.type;
  spawnPart(fieldBonus.x, fieldBonus.y, type.color, 25, 1.5);
  addShake(3);
  fieldBonus = null;
  playerPower = type;
  showPowerHUD(type);
}

/* ════════════════════════════════════════════════════
   AI
   ════════════════════════════════════════════════════ */
function updateAI(dt) {
  const ai = AI_CFG[difficulty];
  const b = orbs[0]; if (!b) return;
  const reactZone = W * ai.react;

  if (b.vx > 0 && b.x > W - reactZone) {
    let py = predictY(b, g2.x);
    g2.targetY = py + g2.error;
  } else {
    g2.targetY = H / 2 + g2.error * 0.5;
  }

  const maxSp = PADDLE_SPEED * ai.speed;
  const d = g2.targetY - g2.y;
  g2.y += clamp(d, -maxSp * dt, maxSp * dt);
  g2.y = clamp(g2.y, g2.h / 2 + 10, H - g2.h / 2 - 10);

  if (Math.random() < ai.errFreq * dt) {
    g2.error = rnd(-ai.err, ai.err);
  }
}

function predictY(b, tx) {
  let bx=b.x, by=b.y, bvx=b.vx, bvy=b.vy;
  for (let i = 0; i < 400; i++) {
    bx += bvx/60; by += bvy/60;
    if (by < ORB_R || by > H - ORB_R) bvy = -bvy;
    if (bvx > 0 && bx >= tx) return by;
  }
  return by;
}

/* ════════════════════════════════════════════════════
   ORB PHYSICS
   ════════════════════════════════════════════════════ */
function updateOrbs(dt) {
  const newOrbs = [];

  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    if (!o.alive) { orbs.splice(i, 1); continue; }
    if (phase === "countdown") continue;

    /* curve */
    if (Math.abs(o.curveAmt) > 0.1) {
      o.vy += o.curveAmt * 650 * dt;
      o.curveAmt *= (1 - 3.2 * dt);
    }

    o.x += o.vx * dt;
    o.y += o.vy * dt;

    /* trail */
    o.trail.unshift({ x: o.x, y: o.y });
    if (o.trail.length > TRAIL_MAX) o.trail.pop();

    /* walls */
    if (o.y - o.r < 0) {
      o.y = o.r; o.vy = Math.abs(o.vy);
      spawnPart(o.x, o.y, C_BONE, 5, 0.4); addShake(1.5);
    }
    if (o.y + o.r > H) {
      o.y = H - o.r; o.vy = -Math.abs(o.vy);
      spawnPart(o.x, o.y, C_BONE, 5, 0.4); addShake(1.5);
    }

    /* guardian 1 (player left) */
    if (o.vx < 0 && o.x - o.r <= g1.x + GUARDIAN_W && o.x + o.r >= g1.x) {
      if (o.y >= g1.y - g1.h/2 - o.r && o.y <= g1.y + g1.h/2 + o.r) {
        hitGuardian(o, g1, 1, newOrbs);
      }
    }
    /* guardian 2 (AI right) */
    if (o.vx > 0 && o.x + o.r >= g2.x && o.x - o.r <= g2.x + GUARDIAN_W) {
      if (o.y >= g2.y - g2.h/2 - o.r && o.y <= g2.y + g2.h/2 + o.r) {
        hitGuardian(o, g2, -1, newOrbs);
      }
    }

    /* bonus pickup */
    if (fieldBonus) {
      if (dist(o.x, o.y, fieldBonus.x, fieldBonus.y) < BONUS_SIZE + o.r) {
        pickupBonus();
      }
    }

    /* scoring */
    if (o.x + o.r < -30) {
      if (orbs.filter(a=>a.alive).length <= 1) {
        scoreP2++; updateHUD(); serveDir = 1;
        spawnPart(20, o.y, C_PHANTOM, 35, 2); addShake(8);
        checkWin();
      }
      o.alive = false;
    }
    if (o.x - o.r > W + 30) {
      if (orbs.filter(a=>a.alive).length <= 1) {
        scoreP1++; updateHUD(); serveDir = -1;
        spawnPart(W - 20, o.y, C_SOUL, 35, 2); addShake(8);
        checkWin();
      }
      o.alive = false;
    }
  }

  for (const n of newOrbs) orbs.push(n);
  for (let i = orbs.length - 1; i >= 0; i--) {
    if (!orbs[i].alive) orbs.splice(i, 1);
  }
}

function hitGuardian(o, g, dirX, newOrbs) {
  if (dirX > 0) o.x = g.x + GUARDIAN_W + o.r;
  else o.x = g.x - o.r;

  const rel = (o.y - g.y) / (g.h / 2);
  const angle = rel * (Math.PI / 3.2);
  o.speed = Math.min(o.speed + ORB_ACCEL, 850);
  let spd = o.speed;
  let isFire = false;

  /* apply player power */
  if (g === g1 && playerPower) {
    const pw = playerPower;
    playerPower = null;
    hidePowerHUD();

    switch (pw.id) {
      case "soulfire":
        spd *= 1.9; isFire = true;
        o.soulfire = true;
        spawnPart(o.x, o.y, C_EMBER, 30, 2.5);
        addShake(5);
        setTimeout(() => { o.soulfire = false; }, 700);
        break;
      case "curse":
        o.curveAmt = (rel >= 0 ? 1 : -1) * rnd(2.8, 4.5);
        spawnPart(o.x, o.y, C_PHANTOM, 20, 1.5);
        break;
      case "split": {
        const a2 = -angle;
        const nb = makeOrb(o.x, o.y, Math.cos(a2)*spd*dirX, Math.sin(a2)*spd);
        newOrbs.push(nb);
        spawnPart(o.x, o.y, C_GOLD, 25, 1.8);
        addShake(4);
        break;
      }
      case "aegis":
        g1.h = GUARDIAN_H * 1.85;
        aegisTimer = 9;
        spawnPart(o.x, o.y, C_TEAL, 18, 1.2);
        break;
      case "wither":
        g2.h = GUARDIAN_H * 0.45;
        witherTimer = 9;
        spawnPart(o.x, o.y, [255,50,50], 18, 1.2);
        break;
      case "phantom":
        o.phantom = true;
        spawnPart(o.x, o.y, [160,170,210], 18, 1);
        setTimeout(() => { o.phantom = false; }, 2800);
        break;
    }
  }

  o.vx = Math.cos(angle) * spd * dirX;
  o.vy = Math.sin(angle) * spd;

  const col = g === g1 ? C_SOUL : C_PHANTOM;
  spawnPart(o.x, o.y, col, isFire ? 35 : 12, isFire ? 2 : 1);
  addShake(isFire ? 6 : 2.5);

  if (g === g1) g1.bob = 1; else g2.bob = 1;
}

function checkWin() {
  if (scoreP1 >= WIN_SCORE) {
    phase = "gameover";
    $goT.textContent = "Vittoria!";
    $goS.textContent = `Il Cavaliere ha raccolto ${scoreP1} anime.  ${scoreP1} – ${scoreP2}`;
    $goSig.textContent = "☀";
    $go.classList.remove("hidden");
    spawnPart(W/2, H/2, C_SOUL, 80, 3);
    return;
  }
  if (scoreP2 >= WIN_SCORE) {
    phase = "gameover";
    $goT.textContent = "Lo Spettro prevale…";
    $goS.textContent = `L'oscurità ha reclamato ${scoreP2} anime.  ${scoreP1} – ${scoreP2}`;
    $goSig.textContent = "☾";
    $go.classList.remove("hidden");
    spawnPart(W/2, H/2, C_PHANTOM, 80, 3);
    return;
  }
  phase = "score";
  setTimeout(() => { if (phase === "score") resetRound(); }, 900);
}

/* ════════════════════════════════════════════════════
   INPUT
   ════════════════════════════════════════════════════ */
window.addEventListener("keydown", e => {
  keys[e.code] = true;
  if (e.code === "Escape") {
    if (phase === "play" || phase === "countdown") {
      phase = "pause"; $pause.classList.remove("hidden");
    } else if (phase === "pause") resumeGame();
  }
});
window.addEventListener("keyup", e => { keys[e.code] = false; });

let touchY = null;
cvs.addEventListener("touchstart", e => { e.preventDefault(); touchY = e.touches[0].clientY; });
cvs.addEventListener("touchmove", e => {
  e.preventDefault();
  if (touchY !== null) {
    const ny = e.touches[0].clientY;
    g1.y = clamp(g1.y + (ny - touchY), g1.h/2+10, H - g1.h/2-10);
    touchY = ny;
  }
});
cvs.addEventListener("touchend", () => { touchY = null; });

function updatePlayer(dt) {
  let dir = 0;
  if (keys["ArrowUp"]||keys["KeyW"]) dir -= 1;
  if (keys["ArrowDown"]||keys["KeyS"]) dir += 1;
  g1.y += dir * PADDLE_SPEED * dt;
  g1.y = clamp(g1.y, g1.h/2+10, H - g1.h/2-10);
}

/* ════════════════════════════════════════════════════
   DRAWING — ENVIRONMENT
   ════════════════════════════════════════════════════ */

function drawBackground(t) {
  /* deep abyss gradient */
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#050a14");
  bg.addColorStop(0.4, "#081018");
  bg.addColorStop(0.7, "#0a141e");
  bg.addColorStop(1, "#060c14");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  /* volumetric light shaft from top-centre */
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const lx = W * 0.5 + Math.sin(t * 0.15) * 60;
  const shaftGrad = ctx.createRadialGradient(lx, -50, 10, lx, H * 0.5, H * 0.7);
  shaftGrad.addColorStop(0, "rgba(80,140,170,0.04)");
  shaftGrad.addColorStop(0.4, "rgba(60,100,130,0.015)");
  shaftGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = shaftGrad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawStalactites() {
  ctx.fillStyle = "#0a0f18";
  for (const s of stalactites) {
    ctx.beginPath();
    ctx.moveTo(s.x - s.w/2, 0);
    ctx.lineTo(s.x + s.w * 0.1, s.h);
    ctx.lineTo(s.x + s.w/2, 0);
    ctx.fill();
  }
}

function drawRuins() {
  ctx.fillStyle = "#080e16";
  for (const r of ruins) {
    ctx.fillRect(r.x - r.w/2, H - r.h, r.w, r.h);
    /* rough top */
    ctx.fillRect(r.x - r.w/2 - 2, H - r.h, r.w + 4, 3);
  }
}

function drawFog(t) {
  for (const f of fogLayers) {
    const ox = (f.offset + t * f.speed) % (W * 2) - W * 0.5;
    const grad = ctx.createLinearGradient(ox, f.y - f.height/2, ox, f.y + f.height/2);
    grad.addColorStop(0, "rgba(40,70,90,0)");
    grad.addColorStop(0.5, `rgba(40,70,90,${f.alpha})`);
    grad.addColorStop(1, "rgba(40,70,90,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, f.y - f.height/2, W, f.height);
  }
}

function drawSpores(t) {
  for (const s of spores) {
    const flick = Math.sin(t * 1.5 + s.phase) * 0.15;
    const a = clamp(s.alpha + flick, 0.03, 0.6);
    /* glow */
    const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5);
    grd.addColorStop(0, rgb(s.hue, a * 0.3));
    grd.addColorStop(1, rgb(s.hue, 0));
    ctx.fillStyle = grd;
    ctx.fillRect(s.x - s.r*5, s.y - s.r*5, s.r*10, s.r*10);
    /* core */
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
    ctx.fillStyle = rgb(s.hue, a);
    ctx.fill();
  }
}

function drawEmbers() {
  for (const e of embers) {
    if (e.life <= 0) continue;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r * e.life, 0, Math.PI * 2);
    ctx.fillStyle = rgb(e.col, e.life * 0.6);
    ctx.fill();
  }
}

/* ── Portals (goals) ──────────────────────────────── */
function drawPortals(t) {
  /* left portal — player */
  drawPortal(14, H/2, C_SOUL, t, false);
  /* right portal — AI */
  drawPortal(W - 14, H/2, C_PHANTOM, t, true);
}

function drawPortal(x, cy, col, t, flip) {
  const ph = H * 0.65;
  const w = 8;

  /* glow */
  const grd = ctx.createRadialGradient(x, cy, 5, x, cy, 80);
  grd.addColorStop(0, rgb(col, 0.06 + Math.sin(t*2)*0.02));
  grd.addColorStop(1, rgb(col, 0));
  ctx.fillStyle = grd;
  ctx.fillRect(x - 80, cy - 80, 160, 160);

  /* vertical slit */
  ctx.save();
  ctx.strokeStyle = rgb(col, 0.15 + Math.sin(t*3)*0.05);
  ctx.lineWidth = w;
  ctx.shadowColor = rgb(col, 0.3);
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.moveTo(x, cy - ph/2);
  ctx.lineTo(x, cy + ph/2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();

  /* rune marks */
  const runeCount = 5;
  for (let i = 0; i < runeCount; i++) {
    const ry = cy - ph/2 + (ph / (runeCount-1)) * i;
    const ra = 0.15 + Math.sin(t * 2 + i) * 0.1;
    ctx.beginPath();
    ctx.arc(x, ry, 3, 0, Math.PI * 2);
    ctx.fillStyle = rgb(col, ra);
    ctx.fill();
  }
}

/* ── Centre divider (arcane rift) ─────────────────── */
function drawRift(t) {
  ctx.save();
  ctx.strokeStyle = "rgba(80,110,130,0.04)";
  ctx.lineWidth = 1;
  const segments = 30;
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const y = (H / segments) * i;
    const wobble = Math.sin(t * 0.8 + i * 0.5) * 4;
    if (i === 0) ctx.moveTo(W/2 + wobble, y);
    else ctx.lineTo(W/2 + wobble, y);
  }
  ctx.stroke();
  ctx.restore();
}

/* ════════════════════════════════════════════════════
   DRAWING — CHARACTERS
   ════════════════════════════════════════════════════ */

function drawGuardian(g, isPlayer, t) {
  if (isPlayer) drawKnight(g, t);
  else drawWraith(g, t);
}

/* ── Player: Knight of Light ──────────────────────── */
function drawKnight(g, t) {
  const col = C_SOUL;
  const bob = g.bob || 0;
  const breathe = Math.sin(t * 2.2) * 2;
  const recoil = bob * -8;
  const cx = g.x + GUARDIAN_W / 2 + recoil;
  const cy = g.y;
  const hh = g.h / 2;
  const s = hh / 50; /* scale factor */

  ctx.save();
  ctx.translate(cx, cy);

  /* ── ambient glow ── */
  const gGlow = ctx.createRadialGradient(0, 0, 5, 0, 0, hh * 1.4);
  gGlow.addColorStop(0, rgb(col, 0.07 + bob * 0.2));
  gGlow.addColorStop(1, rgb(col, 0));
  ctx.fillStyle = gGlow;
  ctx.fillRect(-hh*1.5, -hh*1.5, hh*3, hh*3);

  const dark = "#080d18";

  /* ── Legs (armored boots) ── */
  ctx.fillStyle = dark;
  /* left leg */
  ctx.beginPath();
  ctx.moveTo(-6*s, 18*s + breathe);
  ctx.lineTo(-9*s, hh - 4 + breathe);
  ctx.lineTo(-3*s, hh + 2 + breathe);  /* boot tip */
  ctx.lineTo( 0*s, hh - 2 + breathe);
  ctx.lineTo(-2*s, 18*s + breathe);
  ctx.fill();
  /* right leg */
  ctx.beginPath();
  ctx.moveTo( 2*s, 18*s + breathe);
  ctx.lineTo( 0*s, hh - 2 + breathe);
  ctx.lineTo( 3*s, hh + 2 + breathe);
  ctx.lineTo( 9*s, hh - 4 + breathe);
  ctx.lineTo( 6*s, 18*s + breathe);
  ctx.fill();
  /* knee guards */
  ctx.strokeStyle = rgb(col, 0.12);
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(-4*s, 28*s + breathe, 3*s, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc( 4*s, 28*s + breathe, 3*s, 0, Math.PI*2); ctx.stroke();

  /* ── Torso (breastplate) ── */
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(-10*s, -8*s + breathe);
  ctx.quadraticCurveTo(-12*s, 8*s + breathe, -8*s, 20*s + breathe);
  ctx.lineTo(8*s, 20*s + breathe);
  ctx.quadraticCurveTo(12*s, 8*s + breathe, 10*s, -8*s + breathe);
  ctx.closePath();
  ctx.fill();

  /* chest emblem — glowing diamond */
  ctx.fillStyle = rgb(col, 0.25 + bob * 0.4 + Math.sin(t*3)*0.08);
  ctx.shadowColor = rgb(col, 0.6);
  ctx.shadowBlur = 8 + bob * 10;
  ctx.beginPath();
  ctx.moveTo(0, -2*s + breathe);
  ctx.lineTo(4*s, 5*s + breathe);
  ctx.lineTo(0, 12*s + breathe);
  ctx.lineTo(-4*s, 5*s + breathe);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  /* ── Shoulder pauldrons ── */
  ctx.fillStyle = dark;
  /* left pauldron */
  ctx.beginPath();
  ctx.ellipse(-12*s, -6*s + breathe, 6*s, 4*s, -0.3, 0, Math.PI*2);
  ctx.fill();
  /* right pauldron */
  ctx.beginPath();
  ctx.ellipse(12*s, -6*s + breathe, 6*s, 4*s, 0.3, 0, Math.PI*2);
  ctx.fill();
  /* pauldron edge glow */
  ctx.strokeStyle = rgb(col, 0.1);
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.ellipse(-12*s, -6*s + breathe, 6*s, 4*s, -0.3, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(12*s, -6*s + breathe, 6*s, 4*s, 0.3, 0, Math.PI*2); ctx.stroke();

  /* ── Shield arm (left, facing inward) ── */
  const shieldBob = Math.sin(t * 1.8) * 1.5;
  ctx.fillStyle = dark;
  /* arm */
  ctx.lineWidth = 3*s;
  ctx.strokeStyle = dark;
  ctx.beginPath();
  ctx.moveTo(-12*s, -4*s + breathe);
  ctx.quadraticCurveTo(-20*s, 4*s + breathe, -16*s, 14*s + breathe + shieldBob);
  ctx.stroke();
  /* shield — kite shape */
  ctx.beginPath();
  ctx.moveTo(-16*s, 2*s + breathe + shieldBob);
  ctx.lineTo(-22*s, 10*s + breathe + shieldBob);
  ctx.lineTo(-16*s, 22*s + breathe + shieldBob);
  ctx.lineTo(-10*s, 10*s + breathe + shieldBob);
  ctx.closePath();
  ctx.fill();
  /* shield emblem glow */
  ctx.fillStyle = rgb(col, 0.15 + Math.sin(t*2.5)*0.06);
  ctx.beginPath();
  ctx.arc(-16*s, 10*s + breathe + shieldBob, 3*s, 0, Math.PI*2);
  ctx.fill();
  ctx.strokeStyle = rgb(col, 0.1);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-16*s, 2*s + breathe + shieldBob);
  ctx.lineTo(-22*s, 10*s + breathe + shieldBob);
  ctx.lineTo(-16*s, 22*s + breathe + shieldBob);
  ctx.lineTo(-10*s, 10*s + breathe + shieldBob);
  ctx.closePath();
  ctx.stroke();

  /* ── Sword arm (right) ── */
  const swingAngle = bob * 0.6;
  ctx.save();
  ctx.translate(12*s, -4*s + breathe);
  ctx.rotate(swingAngle);
  /* arm */
  ctx.strokeStyle = dark;
  ctx.lineWidth = 3*s;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(8*s, 8*s, 6*s, 18*s);
  ctx.stroke();
  /* sword blade */
  ctx.fillStyle = rgb(col, 0.3 + bob * 0.5);
  ctx.shadowColor = rgb(col, 0.5);
  ctx.shadowBlur = 6 + bob * 12;
  ctx.beginPath();
  ctx.moveTo(6*s, 16*s);
  ctx.lineTo(7.5*s, -14*s);   /* tip */
  ctx.lineTo(5*s, -12*s);
  ctx.lineTo(4.5*s, 16*s);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  /* crossguard */
  ctx.fillStyle = dark;
  ctx.fillRect(1*s, 14*s, 10*s, 2.5*s);
  /* pommel */
  ctx.beginPath();
  ctx.arc(5.5*s, 20*s, 2*s, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  /* ── Head (helmet with visor slit) ── */
  ctx.fillStyle = dark;
  /* helmet dome */
  ctx.beginPath();
  ctx.ellipse(0, -hh*0.52 + breathe, 9*s, 11*s, 0, 0, Math.PI*2);
  ctx.fill();
  /* visor slit — glowing eyes through */
  const visorY = -hh*0.52 + 1*s + breathe;
  const eyeBright = 0.65 + bob * 0.35 + Math.sin(t*4)*0.12;
  ctx.fillStyle = rgb(col, eyeBright);
  ctx.shadowColor = rgb(col, 0.8);
  ctx.shadowBlur = 10 + bob * 10;
  ctx.beginPath();
  ctx.ellipse(-3.5*s, visorY, 2.2*s, 1.2*s, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(3.5*s, visorY, 2.2*s, 1.2*s, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.shadowBlur = 0;
  /* visor slit line */
  ctx.strokeStyle = rgb(col, eyeBright * 0.3);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-7*s, visorY);
  ctx.lineTo(7*s, visorY);
  ctx.stroke();
  /* helmet crest (plume) */
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(0, -hh*0.52 - 11*s + breathe);
  ctx.quadraticCurveTo(3*s, -hh*0.52 - 18*s + breathe, 0, -hh*0.52 - 22*s + breathe);
  ctx.quadraticCurveTo(-3*s, -hh*0.52 - 18*s + breathe, 0, -hh*0.52 - 11*s + breathe);
  ctx.fill();
  /* plume glow tip */
  ctx.fillStyle = rgb(col, 0.15 + Math.sin(t*3)*0.08);
  ctx.beginPath();
  ctx.arc(0, -hh*0.52 - 20*s + breathe, 2*s, 0, Math.PI*2);
  ctx.fill();

  /* ── outline highlight ── */
  ctx.strokeStyle = rgb(col, 0.06 + bob * 0.1);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(0, breathe * 0.5, 14*s, hh + 4, 0, 0, Math.PI*2);
  ctx.stroke();

  ctx.restore();
}

/* ── AI: Wraith (spectral shadow entity) ──────────── */
function drawWraith(g, t) {
  const col = C_PHANTOM;
  const bob = g.bob || 0;
  const breathe = Math.sin(t * 2.2 + Math.PI) * 2.5;
  const recoil = bob * 8;
  const cx = g.x + GUARDIAN_W / 2 + recoil;
  const cy = g.y;
  const hh = g.h / 2;
  const s = hh / 50;

  ctx.save();
  ctx.translate(cx, cy);

  /* ── ambient glow ── */
  const gGlow = ctx.createRadialGradient(0, 0, 5, 0, 0, hh * 1.6);
  gGlow.addColorStop(0, rgb(col, 0.06 + bob * 0.18));
  gGlow.addColorStop(1, rgb(col, 0));
  ctx.fillStyle = gGlow;
  ctx.fillRect(-hh*1.6, -hh*1.6, hh*3.2, hh*3.2);

  const dark = "#0a0a18";

  /* ── Spectral body (shapeless mass, wider at top, dissolving at bottom) ── */
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(0, -hh + 5 + breathe);
  ctx.bezierCurveTo(
    14*s, -hh + 10 + breathe,
    16*s, -5*s + breathe,
    12*s, 15*s + breathe
  );
  /* dissolving tendrils at bottom */
  const tendrils = 7;
  for (let i = 0; i < tendrils; i++) {
    const frac = i / (tendrils - 1);
    const tx = 12*s - frac * 24*s;
    const ty = hh + Math.sin(t * 3.5 + i * 1.3) * 6 + (i % 2 === 0 ? 10 : 0);
    const cx1 = tx + 4*s * Math.sin(t * 2 + i);
    const cy1 = ty - 8*s;
    ctx.quadraticCurveTo(cx1, cy1 + breathe, tx, ty + breathe);
  }
  ctx.bezierCurveTo(
    -16*s, -5*s + breathe,
    -14*s, -hh + 10 + breathe,
    0, -hh + 5 + breathe
  );
  ctx.fill();

  /* ── Floating cloak wisps (sides) ── */
  ctx.strokeStyle = rgb(col, 0.06);
  ctx.lineWidth = 1.5;
  for (let side = -1; side <= 1; side += 2) {
    for (let w = 0; w < 3; w++) {
      const wy = -10*s + w * 12*s + breathe;
      const wLen = 12*s + Math.sin(t * 2 + w) * 4*s;
      ctx.beginPath();
      ctx.moveTo(side * 10*s, wy);
      ctx.quadraticCurveTo(
        side * (14*s + wLen), wy + 6*s + Math.sin(t*2.5+w)*3*s,
        side * (10*s + wLen), wy + 14*s + Math.sin(t*3+w)*5*s
      );
      ctx.stroke();
    }
  }

  /* ── Skull mask (floating, slightly offset) ── */
  const skullFloat = Math.sin(t * 1.3) * 3;
  const skullY = -hh * 0.45 + breathe + skullFloat;
  const skullW = 10 * s;
  const skullH = 13 * s;

  /* skull shape */
  ctx.fillStyle = "#10131f";
  ctx.beginPath();
  ctx.ellipse(0, skullY, skullW, skullH, 0, 0, Math.PI * 2);
  ctx.fill();
  /* jaw */
  ctx.beginPath();
  ctx.moveTo(-6*s, skullY + 8*s);
  ctx.quadraticCurveTo(-4*s, skullY + 16*s, 0, skullY + 14*s);
  ctx.quadraticCurveTo(4*s, skullY + 16*s, 6*s, skullY + 8*s);
  ctx.fill();

  /* mask cracks — decorative lines */
  ctx.strokeStyle = rgb(col, 0.08);
  ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(0, skullY - 10*s); ctx.lineTo(-2*s, skullY + 4*s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, skullY - 10*s); ctx.lineTo(3*s, skullY + 2*s); ctx.stroke();

  /* eye sockets — hollow and glowing */
  const eyeBright = 0.7 + bob * 0.3 + Math.sin(t * 5) * 0.12;
  const eyeSep = 5 * s;
  const eyeR = 3.2 * s + bob * 1.5;

  /* socket holes (darker than skull) */
  ctx.fillStyle = "#050510";
  ctx.beginPath();
  ctx.ellipse(-eyeSep, skullY - 1*s, eyeR + 1, eyeR, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(eyeSep, skullY - 1*s, eyeR + 1, eyeR, 0, 0, Math.PI*2);
  ctx.fill();

  /* glowing cores inside sockets */
  ctx.fillStyle = rgb(col, eyeBright);
  ctx.shadowColor = rgb(col, 0.9);
  ctx.shadowBlur = 12 + bob * 12;
  ctx.beginPath();
  ctx.ellipse(-eyeSep, skullY - 1*s, eyeR * 0.5, eyeR * 0.45, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(eyeSep, skullY - 1*s, eyeR * 0.5, eyeR * 0.45, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.shadowBlur = 0;

  /* eye trails (ghostly wisps dripping from eyes) */
  ctx.strokeStyle = rgb(col, eyeBright * 0.2);
  ctx.lineWidth = 1;
  for (let side = -1; side <= 1; side += 2) {
    ctx.beginPath();
    ctx.moveTo(side * eyeSep, skullY + eyeR * 0.5);
    ctx.quadraticCurveTo(
      side * (eyeSep + 2*s), skullY + eyeR + 10*s + Math.sin(t*4)*2*s,
      side * (eyeSep - 1*s), skullY + eyeR + 18*s
    );
    ctx.stroke();
  }

  /* ── Horns (twisted, asymmetric) ── */
  ctx.fillStyle = "#0c0e1a";
  /* left horn — curved, longer */
  ctx.beginPath();
  ctx.moveTo(-6*s, skullY - 10*s);
  ctx.bezierCurveTo(
    -14*s, skullY - 22*s,
    -20*s, skullY - 28*s,
    -16*s, skullY - 36*s
  );
  ctx.bezierCurveTo(
    -18*s, skullY - 30*s,
    -12*s, skullY - 20*s,
    -4*s, skullY - 9*s
  );
  ctx.fill();
  /* right horn — shorter, more curved */
  ctx.beginPath();
  ctx.moveTo(6*s, skullY - 10*s);
  ctx.bezierCurveTo(
    16*s, skullY - 20*s,
    22*s, skullY - 24*s,
    18*s, skullY - 32*s
  );
  ctx.bezierCurveTo(
    20*s, skullY - 26*s,
    14*s, skullY - 18*s,
    4*s, skullY - 9*s
  );
  ctx.fill();
  /* horn tips glow */
  ctx.fillStyle = rgb(col, 0.12 + Math.sin(t*2.2)*0.06);
  ctx.beginPath(); ctx.arc(-16*s, skullY - 35*s, 2*s, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(18*s, skullY - 31*s, 1.8*s, 0, Math.PI*2); ctx.fill();

  /* ── Phantom arms (reaching claws) ── */
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.5 * s;
  const armWave = Math.sin(t * 2) * 4;
  /* left arm */
  ctx.beginPath();
  ctx.moveTo(-10*s, -2*s + breathe);
  ctx.bezierCurveTo(
    -22*s, 4*s + breathe + armWave,
    -26*s, 12*s + breathe,
    -20*s, 20*s + breathe + armWave
  );
  ctx.stroke();
  /* claws */
  for (let c = 0; c < 3; c++) {
    const ca = -0.4 + c * 0.4;
    ctx.beginPath();
    ctx.moveTo(-20*s, 20*s + breathe + armWave);
    ctx.lineTo(-20*s + Math.cos(ca)*8*s, 20*s + breathe + armWave + Math.sin(ca)*8*s + 4*s);
    ctx.stroke();
  }
  /* right arm */
  ctx.beginPath();
  ctx.moveTo(10*s, -2*s + breathe);
  ctx.bezierCurveTo(
    22*s, 4*s + breathe - armWave,
    26*s, 12*s + breathe,
    20*s, 20*s + breathe - armWave
  );
  ctx.stroke();
  for (let c = 0; c < 3; c++) {
    const ca = Math.PI - 0.4 + c * 0.4;
    ctx.beginPath();
    ctx.moveTo(20*s, 20*s + breathe - armWave);
    ctx.lineTo(20*s + Math.cos(ca)*8*s, 20*s + breathe - armWave + Math.sin(ca)*8*s + 4*s);
    ctx.stroke();
  }

  /* ── dark mist at base ── */
  const mistGrad = ctx.createRadialGradient(0, hh + breathe, 0, 0, hh + breathe, 30*s);
  mistGrad.addColorStop(0, rgb(col, 0.04));
  mistGrad.addColorStop(1, rgb(col, 0));
  ctx.fillStyle = mistGrad;
  ctx.fillRect(-30*s, hh - 20*s + breathe, 60*s, 40*s);

  /* ── outline aura ── */
  ctx.strokeStyle = rgb(col, 0.05 + bob * 0.08);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(0, breathe, 16*s, hh + 6, 0, 0, Math.PI*2);
  ctx.stroke();

  ctx.restore();
}

/* ════════════════════════════════════════════════════
   DRAWING — ORB (soul)
   ════════════════════════════════════════════════════ */

function drawOrbGlow(o) {
  if (o.phantom && o.x > W*0.3 && o.x < W*0.7) return;
  const intense = o.soulfire ? 1.6 : 1.0;
  const glowR = o.soulfire ? 200 : 140;

  /* large scene illumination */
  const grad = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, glowR * intense);
  if (o.soulfire) {
    grad.addColorStop(0, `rgba(255,140,50,${0.12 * intense})`);
    grad.addColorStop(0.3, `rgba(255,80,20,${0.05 * intense})`);
    grad.addColorStop(1, "rgba(255,80,20,0)");
  } else {
    grad.addColorStop(0, `rgba(110,234,255,${0.10 * intense})`);
    grad.addColorStop(0.3, `rgba(60,160,200,${0.04 * intense})`);
    grad.addColorStop(1, "rgba(60,160,200,0)");
  }
  ctx.fillStyle = grad;
  ctx.fillRect(o.x - glowR*1.5, o.y - glowR*1.5, glowR*3, glowR*3);
}

function drawOrbTrail(o) {
  if (o.phantom && o.x > W*0.3 && o.x < W*0.7) return;
  const len = o.trail.length;
  if (len < 2) return;
  for (let i = 1; i < len; i++) {
    const frac = 1 - i / len;
    const pt = o.trail[i];
    const col = o.soulfire ? C_EMBER : C_SOUL;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, o.r * frac * 0.65, 0, Math.PI * 2);
    ctx.fillStyle = rgb(col, frac * 0.3);
    ctx.fill();
  }
}

function drawOrb(o, t) {
  if (o.phantom && o.x > W*0.3 && o.x < W*0.7) {
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, Math.PI*2);
    ctx.fillStyle = "rgba(160,170,210,0.04)";
    ctx.fill();
    return;
  }

  const pulse = Math.sin(t * 6) * 1.5;

  /* outer halo */
  ctx.beginPath();
  ctx.arc(o.x, o.y, o.r + 8 + pulse, 0, Math.PI * 2);
  if (o.soulfire) {
    ctx.fillStyle = "rgba(255,120,40,0.15)";
  } else {
    ctx.fillStyle = "rgba(110,234,255,0.1)";
  }
  ctx.fill();

  /* soul core */
  const coreGrad = ctx.createRadialGradient(o.x - 1, o.y - 1, 0, o.x, o.y, o.r + 2);
  if (o.soulfire) {
    coreGrad.addColorStop(0, "#fffbe0");
    coreGrad.addColorStop(0.4, "#ffaa40");
    coreGrad.addColorStop(1, "#cc4400");
  } else {
    coreGrad.addColorStop(0, "#ffffff");
    coreGrad.addColorStop(0.35, "#b0efff");
    coreGrad.addColorStop(0.7, "#50c8e0");
    coreGrad.addColorStop(1, "#1a6080");
  }
  ctx.beginPath();
  ctx.arc(o.x, o.y, o.r + pulse * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = coreGrad;
  ctx.shadowColor = o.soulfire ? "rgba(255,120,40,0.8)" : "rgba(110,234,255,0.8)";
  ctx.shadowBlur = 20;
  ctx.fill();
  ctx.shadowBlur = 0;

  /* inner light specks */
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.arc(o.x - 2, o.y - 2, 2, 0, Math.PI * 2);
  ctx.fill();
}

/* ════════════════════════════════════════════════════
   DRAWING — BONUS
   ════════════════════════════════════════════════════ */
function drawFieldBonus(t) {
  if (!fieldBonus) return;
  const fb = fieldBonus;
  fb.pulse += 0.05;

  const pulse = Math.sin(fb.pulse * 2.5) * 5;
  const sz = BONUS_SIZE + pulse;
  const col = fb.type.color;

  /* hovering motion */
  const hover = Math.sin(t * 1.5 + fb.pulse) * 6;
  const fy = fb.y + hover;

  /* glow */
  const grd = ctx.createRadialGradient(fb.x, fy, 0, fb.x, fy, sz * 3);
  grd.addColorStop(0, rgb(col, 0.12));
  grd.addColorStop(1, rgb(col, 0));
  ctx.fillStyle = grd;
  ctx.fillRect(fb.x - sz*3, fy - sz*3, sz*6, sz*6);

  /* arcane diamond shape */
  ctx.save();
  ctx.translate(fb.x, fy);
  ctx.rotate(t * 0.6);

  ctx.beginPath();
  ctx.moveTo(0, -sz);
  ctx.lineTo(sz * 0.7, 0);
  ctx.lineTo(0, sz);
  ctx.lineTo(-sz * 0.7, 0);
  ctx.closePath();
  ctx.fillStyle = rgb(col, 0.08);
  ctx.fill();
  ctx.strokeStyle = rgb(col, 0.4);
  ctx.lineWidth = 1.5;
  ctx.shadowColor = rgb(col, 0.5);
  ctx.shadowBlur = 15;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.restore();

  /* icon */
  ctx.font = `${sz * 0.75}px serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText(fb.type.icon, fb.x, fy + 1);

  /* timer bar */
  const barW = 28, barH = 2.5;
  const frac = fb.timer / BONUS_LIFETIME;
  ctx.fillStyle = rgb(col, 0.2);
  ctx.fillRect(fb.x - barW/2, fy + sz + 10, barW, barH);
  ctx.fillStyle = rgb(col, 0.6);
  ctx.fillRect(fb.x - barW/2, fy + sz + 10, barW * frac, barH);
}

/* ════════════════════════════════════════════════════
   DRAWING — PARTICLES
   ════════════════════════════════════════════════════ */
function drawParticles() {
  for (const p of particles) {
    if (p.glow) {
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4 * p.life);
      grd.addColorStop(0, rgb(p.col, p.life * 0.3));
      grd.addColorStop(1, rgb(p.col, 0));
      ctx.fillStyle = grd;
      ctx.fillRect(p.x - p.r*4, p.y - p.r*4, p.r*8, p.r*8);
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
    ctx.fillStyle = rgb(p.col, p.life * 0.7);
    ctx.fill();
  }
}

/* ── Score flash (giant ghost numbers) ────────────── */
function drawScoreGhost() {
  ctx.save();
  ctx.font = `200 ${Math.min(H*0.55, 280)}px 'Segoe UI'`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = rgb(C_SOUL, 0.018);
  ctx.fillText(scoreP1, W*0.25, H/2);
  ctx.fillStyle = rgb(C_PHANTOM, 0.018);
  ctx.fillText(scoreP2, W*0.75, H/2);
  ctx.restore();
}

/* ════════════════════════════════════════════════════
   MAIN LOOP
   ════════════════════════════════════════════════════ */
function loop(ts) {
  requestAnimationFrame(loop);
  if (!lastTs) { lastTs = ts; return; }
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (dt > 0.1) dt = 0.016;
  const t = ts / 1000;

  /* ── Update ─────────────────────────────────────── */
  if (phase === "play" || phase === "countdown") {
    if (phase === "countdown") {
      serveTimer -= dt;
      if (serveTimer <= 0) phase = "play";
    }
    updatePlayer(dt);
    updateAI(dt);
    updateOrbs(dt);
    updateParticles(dt);
    updateAmbient(dt);
    updateShake(dt);

    if (phase === "play") {
      trySpawnBonus(dt);
      if (fieldBonus) {
        fieldBonus.timer -= dt;
        if (fieldBonus.timer <= 0) {
          spawnPart(fieldBonus.x, fieldBonus.y, fieldBonus.type.color, 10, 0.7);
          fieldBonus = null;
        }
      }
    }

    if (aegisTimer > 0)  { aegisTimer -= dt;  if (aegisTimer <= 0) g1.h = GUARDIAN_H; }
    if (witherTimer > 0) { witherTimer -= dt; if (witherTimer <= 0) g2.h = GUARDIAN_H; }

    g1.bob = (g1.bob || 0) * Math.max(0, 1 - 7*dt);
    g2.bob = (g2.bob || 0) * Math.max(0, 1 - 7*dt);
  }

  if (phase === "score") {
    updateParticles(dt);
    updateAmbient(dt);
    updateShake(dt);
    g1.bob = (g1.bob||0) * Math.max(0, 1 - 7*dt);
    g2.bob = (g2.bob||0) * Math.max(0, 1 - 7*dt);
  }

  /* ── Draw ───────────────────────────────────────── */
  ctx.save();
  ctx.translate(shakeX, shakeY);

  drawBackground(t);
  drawStalactites();
  drawRuins();
  drawScoreGhost();
  drawFog(t);
  drawRift(t);
  drawPortals(t);
  drawSpores(t);

  /* orb glow (scene lighting) */
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const o of orbs) drawOrbGlow(o);
  ctx.restore();

  /* guardians */
  drawGuardian(g1, true, t);
  drawGuardian(g2, false, t);

  /* bonus */
  drawFieldBonus(t);

  /* orb trails + orbs */
  for (const o of orbs) drawOrbTrail(o);
  for (const o of orbs) drawOrb(o, t);

  /* embers & particles on top */
  drawEmbers();
  drawParticles();

  /* thin ground line */
  ctx.strokeStyle = "rgba(60,90,110,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, H - 2); ctx.lineTo(W, H - 2); ctx.stroke();

  ctx.restore(); /* end shake */

  /* countdown text */
  if (phase === "countdown") {
    const num = Math.ceil(serveTimer / (SERVE_DELAY / 3));
    ctx.save();
    ctx.font = `200 ${54}px 'Segoe UI'`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = `rgba(110,234,255,${0.12 + serveTimer * 0.2})`;
    ctx.shadowColor = "rgba(110,234,255,0.3)";
    ctx.shadowBlur = 30;
    ctx.fillText(num > 0 ? num : "⟡", W/2, H/2);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

/* ════════════════════════════════════════════════════
   OVERLAY HANDLERS
   ════════════════════════════════════════════════════ */
$intro.addEventListener("click", e => {
  const btn = e.target.closest("[data-diff]");
  if (!btn) return;
  $intro.classList.add("hidden");
  startGame(+btn.dataset.diff);
});

function resumeGame() {
  $pause.classList.add("hidden");
  if (orbs.length === 0) resetRound();
  else phase = "play";
}
document.getElementById("btn-resume").addEventListener("click", resumeGame);

document.getElementById("btn-replay").addEventListener("click", () => {
  $go.classList.add("hidden");
  $intro.classList.remove("hidden");
  phase = "intro";
});

/* ════════════════════════════════════════════════════
   BOOTSTRAP
   ════════════════════════════════════════════════════ */
resize();
requestAnimationFrame(loop);

})();
