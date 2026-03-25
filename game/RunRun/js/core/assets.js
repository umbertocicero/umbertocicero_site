/* ==========================================================================
   assets.js  —  Asset loading, sound playback, SpriteAtlas
   ========================================================================== */

import { ctx } from './config.js';

export const ASSETS  = {};
export let assetsLoaded = false;
export let soundEnabled = true;

/* ══════════════════════════════════════════════════════════════════════
   Web Audio API  —  zero-latency pre-decoded buffer playback
   ══════════════════════════════════════════════════════════════════════ */
let audioCtx   = null;
let masterGain = null;
let musicGain  = null;
const BUFFERS  = {};              // name → AudioBuffer (pre-decoded)
let musicSource = null;           // current background music source node
let musicPlaying = false;

/** Create / resume AudioContext (must be called from a user gesture) */
export function ensureAudioCtx() {
  if (!audioCtx) {
    audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);
    musicGain  = audioCtx.createGain();
    musicGain.gain.value = 0.35;          // music quieter than SFX
    musicGain.connect(masterGain);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

export function toggleSound() {
  soundEnabled = !soundEnabled;
  if (masterGain) masterGain.gain.value = soundEnabled ? 1 : 0;
}

/* ── Loaders ── */
function loadImage(name, src) {
  return new Promise(res => {
    const img = new Image();
    img.onload  = () => { ASSETS[name] = img; res(); };
    img.onerror = () => { console.warn('Failed to load', src); res(); };
    img.src = src;
  });
}

function loadSound(name, src) {
  return new Promise(res => {
    fetch(src)
      .then(r => r.arrayBuffer())
      .then(buf => {
        const ctx = ensureAudioCtx();
        return ctx.decodeAudioData(buf);
      })
      .then(decoded => { BUFFERS[name] = decoded; res(); })
      .catch(() => { console.warn('Sound fail', src); res(); });
  });
}

/* ── Playback (SFX — fire-and-forget, zero latency) ── */
export function playSound(name, vol = 0.5) {
  if (!soundEnabled || !audioCtx || !BUFFERS[name]) return;
  try {
    const src  = audioCtx.createBufferSource();
    src.buffer = BUFFERS[name];
    const gain = audioCtx.createGain();
    gain.gain.value = vol;
    src.connect(gain).connect(masterGain);
    src.start(0);
  } catch (e) { /* swallow */ }
}

/* ── Music (looping background track) ── */
export function startMusic(name, vol = 0.35) {
  if (!audioCtx || !BUFFERS[name]) return;
  stopMusic();
  musicGain.gain.value = vol;
  musicSource = audioCtx.createBufferSource();
  musicSource.buffer = BUFFERS[name];
  musicSource.loop   = true;
  musicSource.connect(musicGain);
  musicSource.start(0);
  musicPlaying = true;
}

export function stopMusic() {
  if (musicSource) {
    try { musicSource.stop(); } catch (e) { /* already stopped */ }
    musicSource.disconnect();
    musicSource = null;
  }
  musicPlaying = false;
}

export function isMusicPlaying() { return musicPlaying; }

/* ── Bulk loader ── */
export async function loadAllAssets() {
  const P = 'assets/';
  const imgs = [
    ['bg_ground_bottom', `${P}img/backgrounds/bg_ground_bottom.png`],
    ['bg_ground_up',     `${P}img/backgrounds/bg_ground_up.png`],
    ['hint',             `${P}img/ui/bg_hint_jump.png`],
    ['blocker',          `${P}img/sprites/ic_block_book.png`],
    ['heart',            `${P}img/sprites/ic_heart.png`],
    ['diamond',          `${P}img/sprites/ic_diamond.png`],
    ['airplane',         `${P}img/sprites/ic_airplane.png`],
    ['airplane2',        `${P}img/sprites/ic_airplane_2.png`],
    ['coin',             `${P}img/sprites/img_coin.png`],
    ['rip',              `${P}img/sprites/ic_rip2.png`],
    ['reload',           `${P}img/ui/ic_reload.png`],
    ['pause',            `${P}img/ui/ic_pause.png`],
    ['play',             `${P}img/ui/ic_play.png`],
    ['cherry',           `${P}img/sprites/ic_cherry.png`],
    ['fragola',          `${P}img/sprites/ic_fragola.png`],
    ['pera',             `${P}img/sprites/ic_pera.png`],
    ['banana',           `${P}img/sprites/ic_banana.png`],
    ['ananas',           `${P}img/sprites/ic_ananas.png`],
    ['school',           `${P}img/sprites/ic_school.png`],
  ];

  for (let i = 1; i <= 4; i++) {
    const n = String(i).padStart(2, '0');
    imgs.push([`bg_real_${n}`, `${P}img/backgrounds/bg_real_${n}.png`]);
  }
  for (let i = 1; i <= 26; i++) {
    const n = String(i).padStart(2, '0');
    imgs.push([`bg_cloud_${n}`, `${P}img/backgrounds/bg_timelapse_${n}.png`]);
  }

  const snds = [
    ['die',       `${P}audio/sfx_die.ogg`],
    ['hit',       `${P}audio/sfx_hit.ogg`],
    ['point',     `${P}audio/sfx_point.ogg`],
    ['swooshing', `${P}audio/sfx_swooshing.ogg`],
    ['wing',      `${P}audio/sfx_wing.ogg`],
    ['ouch',           `${P}audio/ouch.mp3`],
    ['wow',            `${P}audio/wow.wav`],
    ['yuppie',         `${P}audio/yuppie.wav`],
    ['bel',            `${P}audio/school_bel.mp3`],
    /* ── Soundtrack ── */
    ['music',          `${P}audio/pixel_power.mp3`],
    /* ── Girl character sounds ── */
    ['girl_wow',       `${P}audio/girl_wow.m4a`],
    ['girl_ouch',      `${P}audio/girl_ouch.mp4`],
    ['girl_yuppie',    `${P}audio/girl_yuppie.mp4`],
    /* ── Dragon character sounds ── */
    ['dragon_wow',     `${P}audio/dragon_wow.mp4`],
    ['dragon_ouch',    `${P}audio/dragon_ouch.mp4`],
    ['dragon_yuppie',  `${P}audio/dragon_yuppie.mp4`],
    /* ── Jump variants ── */
    ['jump',           `${P}audio/jump.mp4`],
    ['jump2',          `${P}audio/jump2.mp4`],
  ];

  await Promise.all([
    ...imgs.map(([n, s]) => loadImage(n, s)),
    ...snds.map(([n, s]) => loadSound(n, s)),
  ]);

  assetsLoaded = true;
}

/* ══════════════════════════════════════════════════════════════════════
   SpriteAtlas  —  dual-format TexturePacker JSON support
   ══════════════════════════════════════════════════════════════════════ */
export class SpriteAtlas {
  constructor() { this.frames = {}; this.img = null; this.anims = {}; }

  async load(pngSrc, jsonSrc) {
    const [jsonData] = await Promise.all([
      fetch(jsonSrc).then(r => r.json()),
      new Promise(res => {
        this.img = new Image();
        this.img.onload  = res;
        this.img.onerror = res;
        this.img.src = pngSrc;
      }),
    ]);

    const framesRaw = jsonData.frames;
    if (Array.isArray(framesRaw)) {
      for (const entry of framesRaw) this.frames[entry.filename] = entry.frame;
    } else {
      for (const [name, data] of Object.entries(framesRaw)) this.frames[name] = data.frame;
    }
  }

  defineAnim(name, frameNames) { this.anims[name] = frameNames; }

  draw(animName, frameIdx, x, y, h, alpha = 1) {
    const seq = this.anims[animName];
    if (!seq || !this.img) return 0;
    const fname = seq[frameIdx % seq.length];
    const f = this.frames[fname];
    if (!f) return 0;
    const scale = h / f.h;
    const w = f.w * scale;
    ctx.save();
    if (alpha < 1) ctx.globalAlpha = alpha;
    ctx.drawImage(this.img, f.x, f.y, f.w, f.h, x, y, w, h);
    ctx.restore();
    return w;
  }

  getFrame(name)  { return this.frames[name]; }
  animLen(name)   { return (this.anims[name] || []).length; }
}

/* ── Character atlas cache ── */
const atlasCache = {};

export async function loadAtlas(charName) {
  if (atlasCache[charName]) return atlasCache[charName];
  const a = new SpriteAtlas();
  const P = 'assets/img/characters/';
  await a.load(`${P}${charName}_spritesheet.png`, `${P}${charName}_spritesheet.json`);
  a.defineAnim('run',  ['ic_m0.png', 'ic_m1.png', 'ic_m2.png']);
  a.defineAnim('idle', ['ic_m1_wait.png', 'ic_m2_wait.png']);
  atlasCache[charName] = a;
  return a;
}
