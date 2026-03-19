// ════════════════════════════════════════════════════════
//  ORBITAL BLOOM — Gravity Sandbox
// ════════════════════════════════════════════════════════

const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');

// ── state machine ────────────────────────────────────────
const S = { INTRO: 0, PLAY: 1, PAUSE: 2 };
let state = S.INTRO;

// ── sim state ────────────────────────────────────────────
let planets   = [];
let particles = [];
let ambients  = [];
let sun       = null;   // single sun object
let sessionTime = 0;
let lastTs      = 0;
let spawned     = 0;

// ── hold-to-spawn ────────────────────────────────────────
let holding = false;
let holdT   = 0;
let holdX   = 0;
let holdY   = 0;
const MIN_R    = 8;
const MAX_R    = 40;
const HOLD_MAX = 2.0; // seconds for max planet size

// ── physics ──────────────────────────────────────────────
const G = 5000;

// ── star field (static, generated once) ─────────────────
const STARS = Array.from({ length: 180 }, () => ({
  x: Math.random(),
  y: Math.random(),
  r: 0.3 + Math.random() * 1.0,
  a: 0.15 + Math.random() * 0.55,
}));

// ── planet colour palette ────────────────────────────────
const PCOLS = [
  '#4fc3f7','#81d4fa','#a5d6a7','#ffcc80','#ef9a9a',
  '#ce93d8','#80cbc4','#fff59d','#f48fb1','#b0bec5',
];

// ════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════
function rgb(hex) {
  if (!hex || hex[0] !== '#') return '200,200,200';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ════════════════════════════════════════════════════════
//  RESIZE
// ════════════════════════════════════════════════════════
function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  if (state === S.INTRO) buildSun();
}
window.addEventListener('resize', resize);

// ════════════════════════════════════════════════════════
//  SUN
// ════════════════════════════════════════════════════════
function buildSun() {
  sun = {
    x:     canvas.width  / 2,
    y:     canvas.height / 2,
    r:     38,
    gm:    12000,
    trail: [],
    inner: '#fff7d0',
    mid:   '#ffb347',
    outer: '#e05a00',
  };
}

// ════════════════════════════════════════════════════════
//  PLANET FACTORY
// ════════════════════════════════════════════════════════
function spawnPlanet(x, y, r) {
  let dx   = x - sun.x;
  let dy   = y - sun.y;
  let dist = Math.hypot(dx, dy) || 1;

  // minimum safe orbital radius
  const minDist = sun.r * 3.5;
  if (dist < minDist) {
    dx   = (dx / dist) * minDist;
    dy   = (dy / dist) * minDist;
    dist = minDist;
    x    = sun.x + dx;
    y    = sun.y + dy;
  }

  // circular orbit speed ± tiny nudge for slight ellipticity
  const vc    = Math.sqrt(G * sun.gm / dist);
  const speed = vc * (0.98 + Math.random() * 0.04);

  // CCW tangent
  const vx = (dy / dist) * speed;
  const vy = -(dx / dist) * speed;

  const col   = PCOLS[Math.floor(Math.random() * PCOLS.length)];
  const mass  = r * r * 0.05;

  const shapes    = ['circle', 'circle', 'rocky', 'ring'];
  const shape     = shapes[Math.floor(Math.random() * shapes.length)];
  const spikes    = shape === 'rocky'
    ? Array.from({ length: 11 }, () => 0.72 + Math.random() * 0.28)
    : null;
  const ringAngle = Math.random() * Math.PI;

  planets.push({
    x, y, vx, vy, r, mass, col,
    trail: [], alive: true, age: 0, flash: 1,
    shape, spikes, ringAngle,
    _ax: 0, _ay: 0,
  });
  spawned++;
}

// ════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════
function initGame() {
  planets     = [];
  particles   = [];
  ambients    = [];
  spawned     = 0;
  sessionTime = 0;
  buildSun();
  updateHUD();
}

// ════════════════════════════════════════════════════════
//  HUD
// ════════════════════════════════════════════════════════
function updateHUD() {}

// ════════════════════════════════════════════════════════
//  PHYSICS — Velocity-Verlet, 8 substeps
// ════════════════════════════════════════════════════════
function gravAccel(p) {
  const dx  = sun.x - p.x;
  const dy  = sun.y - p.y;
  const d2  = dx * dx + dy * dy;
  const eps = sun.r * 0.5;          // minimal softening (anti-singularity only)
  const d2s = d2 + eps * eps;
  const d   = Math.sqrt(d2s);
  const f   = G * sun.gm / d2s;
  return { ax: (dx / d) * f, ay: (dy / d) * f };
}

function physics(dt) {
  dt = Math.min(dt, 0.033);
  const sub = 8;
  const h   = dt / sub;

  for (let s = 0; s < sub; s++) {
    planets.forEach(p => {
      if (!p.alive) return;

      // half-kick
      p.vx += p._ax * h * 0.5;
      p.vy += p._ay * h * 0.5;
      // drift
      p.x  += p.vx * h;
      p.y  += p.vy * h;
      // new accel
      const { ax, ay } = gravAccel(p);
      p._ax = ax; p._ay = ay;
      // half-kick
      p.vx += ax * h * 0.5;
      p.vy += ay * h * 0.5;

      // hard surface — displace only, keep velocity (natural slingshot)
      const ddx  = p.x - sun.x;
      const ddy  = p.y - sun.y;
      const dd   = Math.hypot(ddx, ddy) || 1;
      const minD = sun.r + p.r;
      if (dd < minD) {
        p.x    = sun.x + (ddx / dd) * minD;
        p.y    = sun.y + (ddy / dd) * minD;
        p._ax  = 0; p._ay = 0;
      }
    });
  }

  // planet-planet elastic collisions
  for (let i = 0; i < planets.length; i++) {
    if (!planets[i].alive) continue;
    for (let j = i + 1; j < planets.length; j++) {
      if (!planets[j].alive) continue;
      const a  = planets[i], b = planets[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d  = Math.hypot(dx, dy);
      if (d < a.r + b.r && d > 0) {
        elasticBounce(a, b, dx, dy, d);
        burst((a.x + b.x) / 2, (a.y + b.y) / 2, '#ffffff', 12, 4);
        burst((a.x + b.x) / 2, (a.y + b.y) / 2, a.col, 5, 2);
      }
    }
  }

  // age, trail, off-screen cull
  planets.forEach(p => {
    if (!p.alive) return;
    p.age  += dt;
    p.flash = Math.max(0, p.flash - dt * 2.5);
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 50) p.trail.shift();
    const pad = 300;
    if (p.x < -pad || p.x > canvas.width + pad ||
        p.y < -pad || p.y > canvas.height + pad) {
      p.alive = false;
    }
  });

  planets = planets.filter(p => p.alive || p.age < 0.3);
}

function elasticBounce(a, b, dx, dy, dist) {
  const nx  = dx / dist, ny = dy / dist;
  const dvx = a.vx - b.vx, dvy = a.vy - b.vy;
  const dvn = dvx * nx + dvy * ny;
  if (dvn > 0) return;
  const e   = 0.6;
  const imp = -(1 + e) * dvn / (1 / a.mass + 1 / b.mass);
  a.vx += (imp / a.mass) * nx; a.vy += (imp / a.mass) * ny;
  b.vx -= (imp / b.mass) * nx; b.vy -= (imp / b.mass) * ny;
  const ov = (a.r + b.r - dist) / 2 + 0.5;
  a.x -= nx * ov; a.y -= ny * ov;
  b.x += nx * ov; b.y += ny * ov;
}

function burst(x, y, col, n, spd) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = (0.4 + Math.random()) * spd;
    particles.push({
      x, y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 1, col,
      sz: 1.5 + Math.random() * 2.5,
    });
  }
}

// ════════════════════════════════════════════════════════
//  DRAW
// ════════════════════════════════════════════════════════
function drawStars() {
  STARS.forEach(s => {
    ctx.save();
    ctx.globalAlpha = s.a;
    ctx.fillStyle   = '#fff';
    ctx.beginPath();
    ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawGravField() {
  if (!sun) return;
  const step = 72;
  for (let x = step / 2; x < canvas.width; x += step) {
    for (let y = step / 2; y < canvas.height; y += step) {
      const dx = sun.x - x, dy = sun.y - y;
      const d  = Math.sqrt(dx * dx + dy * dy) || 1;
      const f  = Math.min(G * sun.gm / (d * d), 1.2);
      const L  = 11;
      ctx.save();
      ctx.globalAlpha  = 0.04;
      ctx.strokeStyle  = '#a7c0ff';
      ctx.lineWidth    = 0.7;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (dx / d) * f * L / 1.2, y + (dy / d) * f * L / 1.2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawSun() {
  if (!sun) return;
  const pulse = (Math.sin(Date.now() * 0.0018) + 1) / 2;

  // corona glow
  const cR = sun.r * 4 + pulse * 10;
  const cg = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, cR);
  cg.addColorStop(0,    `rgba(${rgb(sun.mid)},0.30)`);
  cg.addColorStop(0.45, `rgba(${rgb(sun.outer)},0.10)`);
  cg.addColorStop(1,    'rgba(0,0,0,0)');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(sun.x, sun.y, cR, 0, Math.PI * 2);
  ctx.fill();

  // body
  const bg = ctx.createRadialGradient(
    sun.x - sun.r * 0.3, sun.y - sun.r * 0.3, 0,
    sun.x, sun.y, sun.r
  );
  bg.addColorStop(0,    sun.inner);
  bg.addColorStop(0.55, sun.mid);
  bg.addColorStop(1,    sun.outer);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(sun.x, sun.y, sun.r, 0, Math.PI * 2);
  ctx.fill();

  // pulse ring
  ctx.save();
  ctx.globalAlpha  = 0.16 + pulse * 0.14;
  ctx.strokeStyle  = sun.mid;
  ctx.lineWidth    = 1.2;
  ctx.beginPath();
  ctx.arc(sun.x, sun.y, sun.r + 4 + pulse * 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPlanetShape(p) {
  ctx.beginPath();
  if (p.shape === 'rocky' && p.spikes) {
    const n = p.spikes.length;
    for (let i = 0; i <= n; i++) {
      const a  = (i / n) * Math.PI * 2 - Math.PI / 2;
      const rr = p.r * p.spikes[i % n];
      if (i === 0) ctx.moveTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr);
      else          ctx.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr);
    }
    ctx.closePath();
  } else {
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  }
}

function drawPlanets() {
  planets.forEach(p => {
    if (!p.alive) return;
    const R = rgb(p.col);

    // trail
    p.trail.forEach((pt, i) => {
      const f = i / p.trail.length;
      ctx.save();
      ctx.globalAlpha = f * 0.28;
      ctx.fillStyle   = `rgba(${R},${f * 0.28})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, Math.max(0, p.r * 0.45 * f), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // glow
    const gg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.8);
    gg.addColorStop(0, `rgba(${R},0.38)`);
    gg.addColorStop(1, `rgba(${R},0)`);
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 2.8, 0, Math.PI * 2);
    ctx.fill();

    // body
    const pg = ctx.createRadialGradient(
      p.x - p.r * 0.3, p.y - p.r * 0.3, 0,
      p.x, p.y, p.r
    );
    pg.addColorStop(0,   '#fff');
    pg.addColorStop(0.4, p.col);
    pg.addColorStop(1,   `rgba(${R},0.5)`);
    ctx.fillStyle = pg;
    drawPlanetShape(p);
    ctx.fill();

    // Saturn ring
    if (p.shape === 'ring') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.ringAngle);
      ctx.scale(1, 0.32);
      ctx.strokeStyle = `rgba(${R},0.55)`;
      ctx.lineWidth   = Math.max(2, p.r * 0.4);
      ctx.beginPath();
      ctx.arc(0, 0, p.r * 1.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // spawn flash ring
    if (p.flash > 0) {
      ctx.save();
      ctx.globalAlpha = p.flash * 0.8;
      ctx.strokeStyle = p.col;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + (1 - p.flash) * 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  });
}

function drawParticles(dt) {
  particles.forEach(p => {
    p.x    += p.vx; p.y += p.vy;
    p.vx   *= 0.96; p.vy *= 0.96;
    p.life -= dt * 1.9;
  });
  particles = particles.filter(p => p.life > 0);
  particles.forEach(p => {
    const rad = Math.max(0, p.sz * p.life);
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life * 0.85);
    ctx.fillStyle   = p.col;
    ctx.beginPath();
    ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawAmbients(dt) {
  if (!sun) return;
  if (Math.random() < dt * 0.8) {
    const a = Math.random() * Math.PI * 2;
    const d = sun.r * (1.1 + Math.random() * 0.8);
    ambients.push({
      x: sun.x + Math.cos(a) * d,
      y: sun.y + Math.sin(a) * d,
      col: sun.mid, r: 0,
      maxR: 25 + Math.random() * 30,
      alpha: 0.45,
    });
  }
  ambients = ambients.filter(b => b.alpha > 0.003);
  ambients.forEach(b => {
    b.r     = Math.min(b.r + dt * 55, b.maxR);
    b.alpha = Math.max(0, b.alpha - dt * 0.9);
    const gg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    gg.addColorStop(0, `rgba(${rgb(b.col)},${b.alpha * 1.3})`);
    gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawHoldPreview() {
  if (!holding || state !== S.PLAY) return;
  const frac = Math.min((Date.now() - holdT) / 1000 / HOLD_MAX, 1);
  const r    = MIN_R + (MAX_R - MIN_R) * frac;
  ctx.save();
  ctx.globalAlpha = 0.3 + frac * 0.4;
  ctx.strokeStyle = '#a7c0ff';
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.arc(holdX, holdY, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  document.getElementById('size-fill').style.width = (frac * 100) + '%';
  document.getElementById('size-ind').classList.remove('hidden');
}

// ════════════════════════════════════════════════════════
//  OVERLAY HELPERS
// ════════════════════════════════════════════════════════
const OVS = ['ov-intro', 'ov-pause'];
function showOv(id) {
  OVS.forEach(o =>
    document.getElementById(o).classList.toggle('hidden', o !== id)
  );
}
function hideOvs() {
  OVS.forEach(o => document.getElementById(o).classList.add('hidden'));
}

// ════════════════════════════════════════════════════════
//  MAIN LOOP
// ════════════════════════════════════════════════════════
function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min((ts - lastTs) / 1000, 0.05);
  lastTs   = ts;

  ctx.fillStyle = '#060a1c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawStars();
  drawGravField();
  drawAmbients(dt);
  drawParticles(dt);
  drawSun();
  drawPlanets();
  drawHoldPreview();

  if (state === S.PLAY) {
    physics(dt);
    sessionTime += dt;
    updateHUD();
  }
}

// ════════════════════════════════════════════════════════
//  INPUT
// ════════════════════════════════════════════════════════
function pDown(px, py) {
  if (state !== S.PLAY) return;
  holding = true; holdT = Date.now(); holdX = px; holdY = py;
}

function pUp(px, py) {
  if (!holding) return;
  document.getElementById('size-ind').classList.add('hidden');
  if (state !== S.PLAY) { holding = false; return; }
  const frac = Math.min((Date.now() - holdT) / 1000 / HOLD_MAX, 1);
  const r    = Math.round(MIN_R + (MAX_R - MIN_R) * frac);
  spawnPlanet(holdX, holdY, r);
  holding = false;
}

canvas.addEventListener('mousedown',  e => pDown(e.clientX, e.clientY));
canvas.addEventListener('mouseup',    e => pUp(e.clientX, e.clientY));
canvas.addEventListener('mouseleave', e => pUp(e.clientX, e.clientY));
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  pDown(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });
canvas.addEventListener('touchend', e => {
  e.preventDefault();
  pUp(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
}, { passive: false });

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (state === S.PLAY)  { state = S.PAUSE; showOv('ov-pause'); }
    else if (state === S.PAUSE) { state = S.PLAY; hideOvs(); }
  }
  if (e.key === 'r' || e.key === 'R') {
    if (state !== S.INTRO) { initGame(); state = S.PLAY; hideOvs(); }
  }
});

// ════════════════════════════════════════════════════════
//  START
// ════════════════════════════════════════════════════════
function go() {
  initGame();
  state = S.PLAY;
  hideOvs();
  setTimeout(() => document.getElementById('hint').classList.add('hidden'), 5500);
}

document.getElementById('btn-start').addEventListener('click',  () => go());
document.getElementById('btn-pause').addEventListener('click',  () => {
  if (state === S.PLAY) { state = S.PAUSE; showOv('ov-pause'); }
});
document.getElementById('btn-resume').addEventListener('click', () => {
  state = S.PLAY; hideOvs();
});
document.getElementById('btn-rp').addEventListener('click', () => go());

// ════════════════════════════════════════════════════════
//  BOOTSTRAP
// ════════════════════════════════════════════════════════
resize();
requestAnimationFrame(ts => { lastTs = ts; loop(ts); });
