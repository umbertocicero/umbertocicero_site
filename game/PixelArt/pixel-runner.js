/*  ╔═══════════════════════════════════════════════════════════╗
    ║  PIXEL RUNNER – gioco 2D a scorrimento per bambini      ║
    ║  Canvas pixel-art · Salto / Scivolata · Bonus & Poteri  ║
    ╚═══════════════════════════════════════════════════════════╝  */

"use strict";

/* ── Canvas setup ─────────────────────────────────────────── */
const cvs   = document.getElementById("c");
const ctx   = cvs.getContext("2d");

// Virtual resolution (pixel-art look)
const W = 400, H = 225;

function resize() {
  cvs.width  = W;
  cvs.height = H;
  ctx.imageSmoothingEnabled = false;
}
resize();
window.addEventListener("resize", resize);

/* ── DOM refs ─────────────────────────────────────────────── */
const $score   = document.getElementById("hud-score");
const $dist    = document.getElementById("hud-dist");
const $power   = document.getElementById("hud-power");
const $ovIntro = document.getElementById("ov-intro");
const $ovGO    = document.getElementById("ov-gameover");
const $ovPause = document.getElementById("ov-pause");
const $goDist  = document.getElementById("go-dist");
const $goScore = document.getElementById("go-score");
const $goBest  = document.getElementById("go-best");

/* ── Palette ──────────────────────────────────────────────── */
const PAL = {
  sky:     ["#87CEEB","#5BA3D9","#3A7BD5"],
  grass:   ["#4CAF50","#388E3C","#2E7D32"],
  dirt:    ["#8D6E63","#6D4C41","#5D4037"],
  cloud:   "#fff",
  sun:     "#FFD54F",
};

/* ── Character sprites (pixel arrays) ────────────────────── */
// Each character has frames for: run1, run2, jump, slide
// Drawn procedurally as pixel blocks
const CHARS = [
  { // Cat
    name:"Gatto",
    body:"#FF9800", ear:"#E65100", eye:"#fff", pupil:"#333",
    belly:"#FFE0B2", tail:"#E65100",
  },
  { // Dog
    name:"Cane",
    body:"#8D6E63", ear:"#5D4037", eye:"#fff", pupil:"#333",
    belly:"#D7CCC8", tail:"#5D4037",
  },
  { // Bunny
    name:"Coniglio",
    body:"#BDBDBD", ear:"#F8BBD0", eye:"#fff", pupil:"#333",
    belly:"#F5F5F5", tail:"#fff",
  },
];

let selectedChar = 0;

/* ── Game state ───────────────────────────────────────────── */
let state = "intro"; // intro | play | pause | gameover
let score = 0;
let dist  = 0;
let best  = parseInt(localStorage.getItem("pixelrunner_best") || "0");
let speed = 2.5;
let frame = 0;
let animFrame = 0;
let difficulty = 0; // increases over time

/* ── Player ───────────────────────────────────────────────── */
const GROUND_Y  = H - 40;  // ground level
const PLAYER_W  = 20;
const PLAYER_H  = 24;
const SLIDE_H   = 12;
const GRAVITY   = 0.45;
const JUMP_FORCE = -7.5;
const DOUBLE_JUMP_FORCE = -6;

const player = {
  x: 50, y: GROUND_Y - PLAYER_H,
  w: PLAYER_W, h: PLAYER_H,
  vy: 0,
  jumping: false,
  doubleJump: false,
  canDoubleJump: false,
  sliding: false,
  slideTimer: 0,
  invincible: 0,
  magnet: 0,
  speedBoost: 0,
  runFrame: 0,
  squash: 0, // landing effect
  particles: [],
};

/* ── Obstacles & Collectibles ─────────────────────────────── */
let obstacles    = [];
let collectibles = [];
let bgClouds     = [];
let bgMountains  = [];
let bgTrees      = [];
let dustParticles = [];
let powerUpEffects = [];

const OBS_TYPES = [
  { type:"rock",    w:16, h:16, ground:true,  color:"#757575" },
  { type:"cactus",  w:12, h:24, ground:true,  color:"#66BB6A" },
  { type:"bird",    w:18, h:12, ground:false, color:"#E53935", flyY: -40 },
  { type:"box",     w:20, h:20, ground:true,  color:"#8D6E63" },
  { type:"bat",     w:16, h:10, ground:false, color:"#7B1FA2", flyY: -35 },
];

const BONUS_TYPES = [
  { type:"star",      color:"#FFD700", points:10, symbol:"★" },
  { type:"heart",     color:"#FF4081", points:0,  symbol:"♥", power:"invincible" },
  { type:"magnet",    color:"#2196F3", points:0,  symbol:"⊕", power:"magnet" },
  { type:"lightning", color:"#FFEB3B", points:0,  symbol:"⚡", power:"speed" },
  { type:"doubleJump",color:"#9C27B0", points:0,  symbol:"⇧", power:"doubleJump" },
];

/* ── Input ────────────────────────────────────────────────── */
const keys = {};

document.addEventListener("keydown", e => {
  keys[e.code] = true;
  if (state === "play" && (e.code === "Escape" || e.code === "KeyP")) {
    togglePause();
  }
});
document.addEventListener("keyup", e => { keys[e.code] = false; });

// Touch controls
let touchStartY = 0;
cvs.addEventListener("touchstart", e => {
  e.preventDefault();
  const t = e.touches[0];
  touchStartY = t.clientY;
  const half = window.innerHeight / 2;
  if (t.clientY < half) {
    keys["ArrowUp"] = true;
  } else {
    keys["ArrowDown"] = true;
  }
}, { passive:false });

cvs.addEventListener("touchend", e => {
  keys["ArrowUp"] = false;
  keys["ArrowDown"] = false;
});

// Mouse click on canvas for desktop
cvs.addEventListener("mousedown", e => {
  const half = window.innerHeight / 2;
  if (e.clientY < half) keys["ArrowUp"] = true;
  else keys["ArrowDown"] = true;
});
cvs.addEventListener("mouseup", () => {
  keys["ArrowUp"] = false;
  keys["ArrowDown"] = false;
});

/* ── UI buttons ───────────────────────────────────────────── */
document.getElementById("btn-start").addEventListener("click", startGame);
document.getElementById("btn-retry").addEventListener("click", startGame);
document.getElementById("btn-resume").addEventListener("click", togglePause);

// Character selection
document.querySelectorAll(".btn-char").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".btn-char").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedChar = parseInt(btn.dataset.char);
  });
});

/* ── Start / Reset ────────────────────────────────────────── */
function startGame() {
  score = 0;
  dist  = 0;
  speed = 2.5;
  frame = 0;
  difficulty = 0;

  player.y = GROUND_Y - PLAYER_H;
  player.h = PLAYER_H;
  player.vy = 0;
  player.jumping = false;
  player.doubleJump = false;
  player.canDoubleJump = false;
  player.sliding = false;
  player.slideTimer = 0;
  player.invincible = 0;
  player.magnet = 0;
  player.speedBoost = 0;
  player.runFrame = 0;
  player.squash = 0;
  player.particles = [];

  obstacles = [];
  collectibles = [];
  dustParticles = [];
  powerUpEffects = [];

  // Init clouds
  bgClouds = [];
  for (let i = 0; i < 6; i++) {
    bgClouds.push({
      x: Math.random() * W,
      y: 10 + Math.random() * 40,
      w: 20 + Math.random() * 30,
      speed: 0.2 + Math.random() * 0.3,
    });
  }

  // Init mountains
  bgMountains = [];
  for (let i = 0; i < 4; i++) {
    bgMountains.push({
      x: i * 120,
      h: 30 + Math.random() * 40,
      w: 80 + Math.random() * 40,
      color: ["#3E2723","#4E342E","#3D5AFE","#5C6BC0"][i % 4],
    });
  }

  // Init trees
  bgTrees = [];
  for (let i = 0; i < 8; i++) {
    bgTrees.push({
      x: i * 60 + Math.random() * 30,
      h: 20 + Math.random() * 20,
      type: Math.floor(Math.random() * 3),
    });
  }

  state = "play";
  $ovIntro.classList.add("hidden");
  $ovGO.classList.add("hidden");
  $ovPause.classList.add("hidden");
}

function togglePause() {
  if (state === "play") {
    state = "pause";
    $ovPause.classList.remove("hidden");
  } else if (state === "pause") {
    state = "play";
    $ovPause.classList.add("hidden");
  }
}

function gameOver() {
  state = "gameover";
  const d = Math.floor(dist);
  if (d > best) {
    best = d;
    localStorage.setItem("pixelrunner_best", best);
  }
  $goDist.textContent  = d;
  $goScore.textContent = score;
  $goBest.textContent  = best;
  $ovGO.classList.remove("hidden");

  // Screen shake effect
  cvs.style.animation = "none";
  cvs.offsetHeight; // reflow
  cvs.style.animation = "";
}

/* ── Spawn helpers ────────────────────────────────────────── */
let nextObsDist  = 80;
let nextBonusDist = 40;

function spawnObstacle() {
  const pool = OBS_TYPES.filter(o => {
    if (!o.ground && difficulty < 1) return false; // no flying obs early
    return true;
  });
  const t = pool[Math.floor(Math.random() * pool.length)];
  const obs = {
    ...t,
    x: W + 10,
    y: t.ground ? GROUND_Y - t.h : GROUND_Y + (t.flyY || -35),
    active: true,
    animOff: Math.random() * Math.PI * 2,
  };
  // Flying obstacles bob up & down
  if (!t.ground) obs.baseY = obs.y;
  obstacles.push(obs);
}

function spawnCollectible() {
  // Stars are common, power-ups are rare
  const r = Math.random();
  let idx = 0;
  if (r > 0.92) idx = 4;       // double jump
  else if (r > 0.85) idx = 3;  // lightning
  else if (r > 0.78) idx = 2;  // magnet
  else if (r > 0.70) idx = 1;  // heart
  // else star (idx=0)

  const b = BONUS_TYPES[idx];
  const yOptions = [
    GROUND_Y - 16,             // ground level
    GROUND_Y - 35,             // mid air
    GROUND_Y - 55,             // high air
  ];
  const y = yOptions[Math.floor(Math.random() * yOptions.length)];

  collectibles.push({
    ...b,
    x: W + 10,
    y: y,
    w: 10, h: 10,
    active: true,
    bob: Math.random() * Math.PI * 2,
  });
}

/* ── Drawing helpers ──────────────────────────────────────── */
function drawPixelRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function drawSky(t) {
  // Gradient sky
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, PAL.sky[0]);
  grad.addColorStop(0.6, PAL.sky[1]);
  grad.addColorStop(1, PAL.sky[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Sun
  const sunX = W - 40, sunY = 30;
  ctx.fillStyle = PAL.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 14, 0, Math.PI * 2);
  ctx.fill();
  // Sun glow
  ctx.fillStyle = "rgba(255,213,79,0.2)";
  ctx.beginPath();
  ctx.arc(sunX, sunY, 20 + Math.sin(t * 0.02) * 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawClouds(t) {
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  bgClouds.forEach(c => {
    c.x -= c.speed * (speed / 2.5);
    if (c.x + c.w < 0) { c.x = W + 10; c.y = 10 + Math.random() * 40; }
    // Pixel cloud shape
    const cy = c.y + Math.sin(t * 0.01 + c.x) * 1.5;
    ctx.fillRect(c.x, cy, c.w, 6);
    ctx.fillRect(c.x + 4, cy - 4, c.w - 8, 4);
    ctx.fillRect(c.x + 8, cy - 6, c.w - 16, 2);
  });
}

function drawMountains() {
  bgMountains.forEach(m => {
    m.x -= speed * 0.15;
    if (m.x + m.w < -10) m.x = W + 50;
    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.moveTo(m.x, GROUND_Y);
    ctx.lineTo(m.x + m.w / 2, GROUND_Y - m.h);
    ctx.lineTo(m.x + m.w, GROUND_Y);
    ctx.fill();
    // Snow cap
    ctx.fillStyle = "#E8EAF6";
    ctx.beginPath();
    ctx.moveTo(m.x + m.w/2 - 6, GROUND_Y - m.h + 8);
    ctx.lineTo(m.x + m.w/2, GROUND_Y - m.h);
    ctx.lineTo(m.x + m.w/2 + 6, GROUND_Y - m.h + 8);
    ctx.fill();
  });
}

function drawTrees() {
  bgTrees.forEach(tr => {
    tr.x -= speed * 0.5;
    if (tr.x < -20) tr.x = W + 20 + Math.random() * 40;
    const tx = Math.round(tr.x);
    const ty = GROUND_Y;
    // Trunk
    drawPixelRect(tx + 3, ty - tr.h, 4, tr.h, "#5D4037");
    // Leaves (pixel triangle)
    const colors = ["#2E7D32","#388E3C","#43A047"];
    ctx.fillStyle = colors[tr.type];
    for (let row = 0; row < 4; row++) {
      const lw = (4 - row) * 4;
      ctx.fillRect(tx + 5 - lw/2, ty - tr.h - 4 - row * 4, lw, 4);
    }
  });
}

function drawGround() {
  // Grass
  drawPixelRect(0, GROUND_Y, W, 4, PAL.grass[0]);
  drawPixelRect(0, GROUND_Y + 1, W, 2, PAL.grass[1]);
  // Dirt
  drawPixelRect(0, GROUND_Y + 4, W, H - GROUND_Y - 4, PAL.dirt[0]);
  // Dirt texture
  for (let i = 0; i < W; i += 8) {
    const off = ((i + Math.floor(frame * speed)) % 16 < 8) ? 1 : 0;
    drawPixelRect(i, GROUND_Y + 6 + off * 2, 4, 2, PAL.dirt[1]);
    drawPixelRect(i + 4, GROUND_Y + 12 - off * 2, 3, 2, PAL.dirt[2]);
  }
  // Moving ground lines
  const scrollX = (frame * speed) % 8;
  ctx.fillStyle = PAL.grass[2];
  for (let i = -8; i < W + 8; i += 12) {
    ctx.fillRect(i - scrollX, GROUND_Y + 2, 6, 1);
  }
}

/* ── Draw Player ──────────────────────────────────────────── */
function drawPlayer(t) {
  const ch = CHARS[selectedChar];
  const px = Math.round(player.x);
  const py = Math.round(player.y);
  const sliding = player.sliding;
  const jumping = player.jumping;

  // Invincibility flash
  if (player.invincible > 0 && Math.floor(t / 3) % 2 === 0) {
    ctx.globalAlpha = 0.5;
  }

  // Speed boost trail
  if (player.speedBoost > 0) {
    ctx.fillStyle = "rgba(255,235,59,0.3)";
    ctx.fillRect(px - 10, py + 4, 12, player.h - 8);
  }

  if (sliding) {
    // ── Slide pose (flat body) ──
    drawPixelRect(px, py + PLAYER_H - SLIDE_H, PLAYER_W + 4, SLIDE_H - 2, ch.body);
    drawPixelRect(px + 2, py + PLAYER_H - SLIDE_H + 2, PLAYER_W, SLIDE_H - 6, ch.belly);
    // Head
    drawPixelRect(px + PLAYER_W - 2, py + PLAYER_H - SLIDE_H - 2, 8, 6, ch.body);
    // Eye
    drawPixelRect(px + PLAYER_W + 3, py + PLAYER_H - SLIDE_H - 1, 2, 2, ch.eye);
    drawPixelRect(px + PLAYER_W + 4, py + PLAYER_H - SLIDE_H, 1, 1, ch.pupil);
  } else {
    // Run animation offset
    const runOff = jumping ? 0 : Math.sin(t * 0.3) * 2;
    const legOff = Math.floor(t * 0.2) % 2;

    // ── Body ──
    const squashH = player.squash > 0 ? 2 : 0;
    const bodyY = py + squashH + runOff * 0.3;

    // Torso
    drawPixelRect(px + 2, bodyY + 2, PLAYER_W - 4, PLAYER_H - 10, ch.body);
    // Belly
    drawPixelRect(px + 4, bodyY + 6, PLAYER_W - 8, PLAYER_H - 14, ch.belly);

    // ── Head ──
    drawPixelRect(px + 3, bodyY - 4, PLAYER_W - 6, 8, ch.body);

    // Ears
    if (selectedChar === 2) {
      // Bunny long ears
      drawPixelRect(px + 5, bodyY - 10, 3, 7, ch.ear);
      drawPixelRect(px + 10, bodyY - 12, 3, 9, ch.ear);
    } else {
      drawPixelRect(px + 3, bodyY - 6, 3, 3, ch.ear);
      drawPixelRect(px + PLAYER_W - 8, bodyY - 6, 3, 3, ch.ear);
    }

    // Eyes
    drawPixelRect(px + PLAYER_W - 8, bodyY - 2, 3, 3, ch.eye);
    drawPixelRect(px + PLAYER_W - 7, bodyY - 1, 1, 1, ch.pupil);

    // Mouth (smile)
    drawPixelRect(px + PLAYER_W - 6, bodyY + 2, 2, 1, ch.pupil);

    // ── Legs (animated) ──
    if (jumping) {
      // Legs tucked
      drawPixelRect(px + 3, bodyY + PLAYER_H - 10, 4, 4, ch.body);
      drawPixelRect(px + 10, bodyY + PLAYER_H - 10, 4, 4, ch.body);
    } else {
      // Running legs
      const lOff1 = legOff === 0 ? -2 : 2;
      const lOff2 = legOff === 0 ? 2 : -2;
      drawPixelRect(px + 4, bodyY + PLAYER_H - 9, 3, 6 + lOff1, ch.body);
      drawPixelRect(px + 11, bodyY + PLAYER_H - 9, 3, 6 + lOff2, ch.body);
      // Feet
      drawPixelRect(px + 3, bodyY + PLAYER_H - 3 + lOff1, 5, 2, ch.ear);
      drawPixelRect(px + 10, bodyY + PLAYER_H - 3 + lOff2, 5, 2, ch.ear);
    }

    // ── Tail ──
    const tailWag = Math.sin(t * 0.4) * 2;
    drawPixelRect(px - 3, bodyY + 6 + tailWag, 4, 3, ch.tail);

    // Double jump indicator
    if (player.canDoubleJump && !player.doubleJump) {
      ctx.fillStyle = "rgba(156,39,176,0.5)";
      ctx.beginPath();
      ctx.arc(px + PLAYER_W/2, py - 6, 4 + Math.sin(t * 0.1) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;

  // Landing squash decay
  if (player.squash > 0) player.squash -= 0.5;
}

/* ── Draw Obstacles ───────────────────────────────────────── */
function drawObstacles(t) {
  obstacles.forEach(obs => {
    if (!obs.active) return;
    const ox = Math.round(obs.x);
    const oy = Math.round(obs.y);

    switch (obs.type) {
      case "rock":
        drawPixelRect(ox, oy + 4, obs.w, obs.h - 4, "#9E9E9E");
        drawPixelRect(ox + 2, oy, obs.w - 4, obs.h, "#757575");
        drawPixelRect(ox + 4, oy + 2, 3, 2, "#BDBDBD"); // highlight
        break;

      case "cactus":
        drawPixelRect(ox + 3, oy, 6, obs.h, "#66BB6A");
        drawPixelRect(ox, oy + 6, 4, 8, "#66BB6A");
        drawPixelRect(ox + 9, oy + 4, 3, 10, "#66BB6A");
        drawPixelRect(ox + 4, oy + 1, 4, 2, "#81C784");
        // Spikes
        drawPixelRect(ox + 1, oy + 5, 1, 2, "#A5D6A7");
        drawPixelRect(ox + 10, oy + 3, 1, 2, "#A5D6A7");
        break;

      case "bird":
        // Bobbing animation
        obs.y = obs.baseY + Math.sin(t * 0.05 + obs.animOff) * 6;
        const wingOff = Math.sin(t * 0.2) * 4;
        drawPixelRect(ox + 4, oy + 3, 10, 6, obs.color);
        drawPixelRect(ox, oy + wingOff, 6, 4, "#EF5350");
        drawPixelRect(ox + 12, oy - wingOff, 6, 4, "#EF5350");
        // Eye
        drawPixelRect(ox + 12, oy + 3, 2, 2, "#fff");
        drawPixelRect(ox + 13, oy + 4, 1, 1, "#000");
        // Beak
        drawPixelRect(ox + 15, oy + 5, 3, 2, "#FF9800");
        break;

      case "box":
        drawPixelRect(ox, oy, obs.w, obs.h, "#8D6E63");
        drawPixelRect(ox + 1, oy + 1, obs.w - 2, obs.h - 2, "#A1887F");
        // Cross planks
        drawPixelRect(ox, oy + obs.h/2 - 1, obs.w, 2, "#6D4C41");
        drawPixelRect(ox + obs.w/2 - 1, oy, 2, obs.h, "#6D4C41");
        break;

      case "bat":
        obs.y = obs.baseY + Math.sin(t * 0.07 + obs.animOff) * 8;
        const bwing = Math.sin(t * 0.25) * 5;
        drawPixelRect(ox + 4, oy + 2, 8, 6, obs.color);
        drawPixelRect(ox, oy + bwing * 0.5, 6, 4, "#9C27B0");
        drawPixelRect(ox + 10, oy - bwing * 0.5, 6, 4, "#9C27B0");
        // Eyes
        drawPixelRect(ox + 5, oy + 2, 2, 2, "#FF5252");
        drawPixelRect(ox + 9, oy + 2, 2, 2, "#FF5252");
        break;
    }
  });
}

/* ── Draw Collectibles ────────────────────────────────────── */
function drawCollectibles(t) {
  collectibles.forEach(c => {
    if (!c.active) return;
    const cx = Math.round(c.x);
    const cy = Math.round(c.y + Math.sin(t * 0.08 + c.bob) * 3);

    switch (c.type) {
      case "star":
        ctx.fillStyle = c.color;
        // Pixel star shape
        drawPixelRect(cx + 3, cy, 4, 2, c.color);
        drawPixelRect(cx + 1, cy + 2, 8, 3, c.color);
        drawPixelRect(cx + 3, cy + 5, 4, 2, c.color);
        drawPixelRect(cx + 2, cy + 7, 2, 2, c.color);
        drawPixelRect(cx + 6, cy + 7, 2, 2, c.color);
        // Sparkle
        if (Math.floor(t / 5) % 3 === 0) {
          drawPixelRect(cx + 4, cy - 2, 2, 2, "#FFF9C4");
        }
        break;

      case "heart":
        drawPixelRect(cx + 1, cy, 3, 2, c.color);
        drawPixelRect(cx + 6, cy, 3, 2, c.color);
        drawPixelRect(cx, cy + 2, 10, 3, c.color);
        drawPixelRect(cx + 1, cy + 5, 8, 2, c.color);
        drawPixelRect(cx + 2, cy + 7, 6, 1, c.color);
        drawPixelRect(cx + 3, cy + 8, 4, 1, c.color);
        drawPixelRect(cx + 4, cy + 9, 2, 1, c.color);
        break;

      case "magnet":
        drawPixelRect(cx + 2, cy, 6, 2, c.color);
        drawPixelRect(cx, cy + 2, 3, 6, "#F44336");
        drawPixelRect(cx + 7, cy + 2, 3, 6, "#F44336");
        drawPixelRect(cx + 2, cy + 2, 6, 2, "#90CAF9");
        break;

      case "lightning":
        drawPixelRect(cx + 4, cy, 4, 3, c.color);
        drawPixelRect(cx + 2, cy + 3, 5, 2, c.color);
        drawPixelRect(cx + 3, cy + 5, 4, 3, c.color);
        drawPixelRect(cx + 5, cy + 8, 3, 2, c.color);
        break;

      case "doubleJump":
        drawPixelRect(cx + 2, cy + 4, 6, 3, c.color);
        // Up arrows
        drawPixelRect(cx + 4, cy, 2, 4, c.color);
        drawPixelRect(cx + 2, cy + 2, 2, 2, c.color);
        drawPixelRect(cx + 6, cy + 2, 2, 2, c.color);
        break;
    }

    // Glow for power-ups
    if (c.type !== "star") {
      ctx.fillStyle = c.color + "33";
      ctx.beginPath();
      ctx.arc(cx + 5, cy + 5, 8 + Math.sin(t * 0.1) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/* ── Particles ────────────────────────────────────────────── */
function spawnDust() {
  if (player.jumping || player.sliding) return;
  if (frame % 4 !== 0) return;
  dustParticles.push({
    x: player.x + 2,
    y: GROUND_Y - 2,
    vx: -1 - Math.random(),
    vy: -0.5 - Math.random() * 1.5,
    life: 15 + Math.random() * 10,
    size: 1 + Math.floor(Math.random() * 2),
    color: "#A1887F",
  });
}

function spawnCollectEffect(x, y, color) {
  for (let i = 0; i < 8; i++) {
    powerUpEffects.push({
      x, y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 20 + Math.random() * 15,
      size: 1 + Math.floor(Math.random() * 3),
      color: color,
    });
  }
}

function updateParticles() {
  // Dust
  for (let i = dustParticles.length - 1; i >= 0; i--) {
    const p = dustParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) dustParticles.splice(i, 1);
  }
  // Power effects
  for (let i = powerUpEffects.length - 1; i >= 0; i--) {
    const p = powerUpEffects[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) powerUpEffects.splice(i, 1);
  }
}

function drawParticles() {
  dustParticles.forEach(p => {
    ctx.globalAlpha = p.life / 25;
    drawPixelRect(p.x, p.y, p.size, p.size, p.color);
  });
  powerUpEffects.forEach(p => {
    ctx.globalAlpha = p.life / 35;
    drawPixelRect(p.x, p.y, p.size, p.size, p.color);
  });
  ctx.globalAlpha = 1;
}

/* ── Collision ────────────────────────────────────────────── */
function aabb(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

/* ── Update ───────────────────────────────────────────────── */
function update() {
  if (state !== "play") return;

  frame++;
  dist += speed * 0.05;
  difficulty = Math.min(dist / 200, 3);

  // Increase speed over time
  if (frame % 300 === 0 && speed < 6) {
    speed += 0.15;
  }

  // Speed boost
  if (player.speedBoost > 0) {
    player.speedBoost--;
    speed = Math.max(speed, 4.5);
  }

  // ── Player input ──
  const wantJump  = keys["ArrowUp"] || keys["Space"] || keys["KeyW"];
  const wantSlide = keys["ArrowDown"] || keys["KeyS"];

  // Jump
  if (wantJump && !player.jumping) {
    player.vy = JUMP_FORCE;
    player.jumping = true;
    player.sliding = false;
    player.h = PLAYER_H;
    keys["ArrowUp"] = false; keys["Space"] = false; keys["KeyW"] = false;
  }
  // Double jump
  else if (wantJump && player.jumping && player.canDoubleJump && !player.doubleJump) {
    player.vy = DOUBLE_JUMP_FORCE;
    player.doubleJump = true;
    keys["ArrowUp"] = false; keys["Space"] = false; keys["KeyW"] = false;
    // Burst particles
    spawnCollectEffect(player.x + PLAYER_W/2, player.y + PLAYER_H, "#CE93D8");
  }

  // Slide
  if (wantSlide && !player.jumping) {
    if (!player.sliding) {
      player.sliding = true;
      player.h = SLIDE_H;
      player.y = GROUND_Y - SLIDE_H;
      player.slideTimer = 40;
    }
  }

  // Slide timer
  if (player.sliding) {
    player.slideTimer--;
    if (player.slideTimer <= 0) {
      player.sliding = false;
      player.h = PLAYER_H;
      player.y = GROUND_Y - PLAYER_H;
    }
  }

  // Gravity
  if (player.jumping) {
    player.vy += GRAVITY;
    player.y += player.vy;
    if (player.y >= GROUND_Y - PLAYER_H) {
      player.y = GROUND_Y - PLAYER_H;
      player.vy = 0;
      player.jumping = false;
      player.doubleJump = false;
      player.h = PLAYER_H;
      player.squash = 3;
      // Landing dust
      for (let i = 0; i < 4; i++) {
        dustParticles.push({
          x: player.x + PLAYER_W/2 + (Math.random()-0.5)*10,
          y: GROUND_Y - 2,
          vx: (Math.random()-0.5) * 2,
          vy: -1 - Math.random(),
          life: 12,
          size: 2,
          color: "#A1887F",
        });
      }
    }
  }

  // Power-up timers
  if (player.invincible > 0) player.invincible--;
  if (player.magnet > 0) player.magnet--;

  // ── Spawn obstacles ──
  nextObsDist -= speed;
  if (nextObsDist <= 0) {
    spawnObstacle();
    nextObsDist = 60 + Math.random() * 80 - difficulty * 10;
  }

  // ── Spawn collectibles ──
  nextBonusDist -= speed;
  if (nextBonusDist <= 0) {
    spawnCollectible();
    nextBonusDist = 30 + Math.random() * 50;
  }

  // ── Move & check obstacles ──
  const pBox = {
    x: player.x + 3,
    y: player.y + 2,
    w: player.sliding ? PLAYER_W + 2 : PLAYER_W - 6,
    h: player.h - 4,
  };

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.x -= speed;
    if (obs.x + obs.w < -10) { obstacles.splice(i, 1); continue; }

    if (obs.active && aabb(pBox, obs)) {
      if (player.invincible > 0) {
        // Destroy obstacle
        obs.active = false;
        spawnCollectEffect(obs.x + obs.w/2, obs.y + obs.h/2, "#FF8A65");
        score += 5;
      } else {
        gameOver();
        return;
      }
    }
  }

  // ── Move & check collectibles ──
  for (let i = collectibles.length - 1; i >= 0; i--) {
    const c = collectibles[i];
    c.x -= speed;

    // Magnet effect
    if (player.magnet > 0 && c.active) {
      const dx = player.x + PLAYER_W/2 - c.x;
      const dy = player.y + player.h/2 - c.y;
      const d  = Math.sqrt(dx*dx + dy*dy);
      if (d < 80) {
        c.x += dx * 0.08;
        c.y += dy * 0.08;
      }
    }

    if (c.x + c.w < -10) { collectibles.splice(i, 1); continue; }

    const cBox = { x: c.x, y: c.y, w: c.w, h: c.h };
    if (c.active && aabb(pBox, cBox)) {
      c.active = false;
      score += c.points;
      spawnCollectEffect(c.x + c.w/2, c.y + c.h/2, c.color);

      // Power-ups
      if (c.power === "invincible") player.invincible = 300;
      if (c.power === "magnet")     player.magnet = 400;
      if (c.power === "speed")      player.speedBoost = 200;
      if (c.power === "doubleJump") player.canDoubleJump = true;
    }
  }

  // Dust particles
  spawnDust();
  updateParticles();

  // ── HUD ──
  $score.textContent = "🌟 " + score;
  $dist.textContent  = Math.floor(dist) + " m";

  // Power indicator
  const powers = [];
  if (player.invincible > 0) powers.push("🛡️");
  if (player.magnet > 0) powers.push("🧲");
  if (player.speedBoost > 0) powers.push("⚡");
  if (player.canDoubleJump) powers.push("⇧");
  $power.textContent = powers.join(" ");
}

/* ── Render ───────────────────────────────────────────────── */
function draw() {
  ctx.clearRect(0, 0, W, H);
  drawSky(frame);
  drawClouds(frame);
  drawMountains();
  drawTrees();
  drawGround();
  drawParticles();
  drawObstacles(frame);
  drawCollectibles(frame);
  drawPlayer(frame);

  // Flash border when hit is close & invincible
  if (player.invincible > 0) {
    ctx.strokeStyle = `rgba(255,152,0,${0.3 + Math.sin(frame * 0.2) * 0.2})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);
  }
}

/* ── Game loop ────────────────────────────────────────────── */
function loop() {
  update();
  if (state !== "intro") draw();
  requestAnimationFrame(loop);
}

/* ── Intro animation ──────────────────────────────────────── */
function introAnim() {
  if (state !== "intro") return;
  ctx.clearRect(0, 0, W, H);
  drawSky(frame);
  frame++;

  // Animated ground
  drawGround();

  // Demo character running
  const demoY = GROUND_Y - PLAYER_H + Math.sin(frame * 0.1) * 1;
  const ch = CHARS[selectedChar];
  const legOff = Math.floor(frame * 0.15) % 2;
  const px = W / 2 - 10;

  drawPixelRect(px + 2, demoY + 2, PLAYER_W - 4, PLAYER_H - 10, ch.body);
  drawPixelRect(px + 4, demoY + 6, PLAYER_W - 8, PLAYER_H - 14, ch.belly);
  drawPixelRect(px + 3, demoY - 4, PLAYER_W - 6, 8, ch.body);
  drawPixelRect(px + PLAYER_W - 8, demoY - 2, 3, 3, ch.eye);
  drawPixelRect(px + PLAYER_W - 7, demoY - 1, 1, 1, ch.pupil);

  const lOff1 = legOff === 0 ? -2 : 2;
  const lOff2 = legOff === 0 ? 2 : -2;
  drawPixelRect(px + 4, demoY + PLAYER_H - 9, 3, 6 + lOff1, ch.body);
  drawPixelRect(px + 11, demoY + PLAYER_H - 9, 3, 6 + lOff2, ch.body);

  const tailWag = Math.sin(frame * 0.3) * 2;
  drawPixelRect(px - 3, demoY + 6 + tailWag, 4, 3, ch.tail);

  requestAnimationFrame(introAnim);
}

// Start intro animation
introAnim();

// When character selection changes, restart intro anim
document.querySelectorAll(".btn-char").forEach(btn => {
  btn.addEventListener("click", () => {
    if (state === "intro") {
      // restart intro animation
    }
  });
});

// Start main loop (will only update when state === "play")
loop();
