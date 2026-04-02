// ============================================
// audio.js — Web Audio API sound engine
// Zero-latency pre-decoded buffer playback.
// Sounds are loaded once at startup; playback
// creates a BufferSource node (cheap, GC'd auto-
// matically after playback — no memory leaks).
// ============================================

const CatAudio = (() => {
    const AUDIO_PATH = 'assets/audio/';

    const SOUNDS = {
        ball_fire: `${AUDIO_PATH}ball_fire.mp4`,
        heart:     `${AUDIO_PATH}heart.wav`,
        ouch:      `${AUDIO_PATH}ouch.mp4`,
        sfx_wing:  `${AUDIO_PATH}sfx_wing.ogg`,
        sfx_point: `${AUDIO_PATH}sfx_point.ogg`,
    };

    let _ctx        = null;   // AudioContext (created on first user gesture)
    let _masterGain = null;
    let _enabled    = true;
    let _initialized = false; // guard: load buffers only once
    const _buffers  = {};     // name → AudioBuffer (pre-decoded, reused ∞)
    const _pending  = {};     // name → [{vol}] calls waiting for the buffer

    // ── Init AudioContext on first user gesture ──────────────────────────
    function _ensureCtx() {
        if (!_ctx) {
            _ctx = new (window.AudioContext || window.webkitAudioContext)();
            _masterGain = _ctx.createGain();
            _masterGain.gain.value = 1;
            _masterGain.connect(_ctx.destination);
        }
        if (_ctx.state === 'suspended') _ctx.resume();
        return _ctx;
    }

    // ── Load one sound into a buffer ─────────────────────────────────────
    function _loadSound(name, url) {
        return fetch(url)
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
                return r.arrayBuffer();
            })
            .then(buf => _ensureCtx().decodeAudioData(buf))
            .then(decoded => {
                _buffers[name] = decoded;
                // Flush any calls that arrived before the buffer was ready
                if (_pending[name]) {
                    _pending[name].forEach(({ vol }) => _playBuffer(name, vol));
                    delete _pending[name];
                }
            })
            .catch(err => console.warn('[CatAudio] Failed to load', name, ':', err.message));
    }

    // ── Internal: play a buffer immediately ──────────────────────────────
    function _playBuffer(name, vol) {
        const buf = _buffers[name];
        if (!buf || !_ctx) return;
        try {
            const src  = _ctx.createBufferSource();
            src.buffer = buf;
            const gain = _ctx.createGain();
            gain.gain.value = Math.max(0, Math.min(1, vol));
            src.connect(gain).connect(_masterGain);
            src.start(0);
        } catch (e) { console.warn('[CatAudio] play error:', e); }
    }

    // ── Public API ───────────────────────────────────────────────────────

    /** Pre-load all sounds. Safe to call multiple times — loads only once.
     *  Must be called from a user-gesture handler (click / touch / keydown). */
    function init() {
        _ensureCtx();
        if (_initialized) return;
        _initialized = true;
        Object.entries(SOUNDS).forEach(([name, url]) => _loadSound(name, url));
    }

    /** Play a sound by name. Fire-and-forget; no references retained.
     *  @param {string} name  — 'ball_fire' | 'heart' | 'ouch'
     *  @param {number} vol   — 0..1 (default 0.6) */
    function play(name, vol = 0.6) {
        if (!_enabled) return;
        if (!_ctx) return; // AudioContext not yet created (no user gesture yet)
        if (!_buffers[name]) {
            // Buffer still decoding — enqueue and play as soon as it's ready
            if (!_pending[name]) _pending[name] = [];
            // Keep only the latest pending call per sound to avoid burst playback
            _pending[name] = [{ vol }];
            return;
        }
        _playBuffer(name, vol);
    }

    /** Mute / unmute all sounds. */
    function setEnabled(enabled) {
        _enabled = enabled;
        if (_masterGain) _masterGain.gain.value = enabled ? 1 : 0;
    }

    function isEnabled() { return _enabled; }

    return { init, play, setEnabled, isEnabled };
})();
