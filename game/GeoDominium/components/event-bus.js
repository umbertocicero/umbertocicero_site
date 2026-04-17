/* ═══════════════════════════════════════════════════════
   GeoDominium — EventBus  (singleton pub/sub)
   ──────────────────────────────────────────────────────
   Lightweight reactive event system for component updates.
   Batches rapid-fire events via microtask coalescing so
   dozens of state changes per turn only trigger ONE render
   per subscribed component.
   ═══════════════════════════════════════════════════════ */

const EventBus = (() => {
    /* topic → Set<{cb, coalesce}> */
    const _subs = new Map();

    /* Coalescing queue: topic → Set<cb>.
       Flushed once per microtask via queueMicrotask. */
    let _pending  = null;   // Map or null
    let _flushing = false;

    /* ── subscribe ──
       @param {string|string[]} topics
       @param {Function}        cb       — called with (data, topic)
       @param {object}          [opts]
       @param {boolean}         [opts.coalesce=true]  batch rapid calls
       @returns {Function}      unsubscribe handle                    */
    function on(topics, cb, opts = {}) {
        const list = Array.isArray(topics) ? topics : [topics];
        const coalesce = opts.coalesce !== false;
        list.forEach(topic => {
            if (!_subs.has(topic)) _subs.set(topic, new Set());
            _subs.get(topic).add({ cb, coalesce });
        });
        /* Return unsubscribe */
        return () => {
            list.forEach(topic => {
                const set = _subs.get(topic);
                if (set) {
                    for (const entry of set) {
                        if (entry.cb === cb) { set.delete(entry); break; }
                    }
                }
            });
        };
    }

    /* ── emit ──
       @param {string} topic
       @param {*}      data   — optional payload */
    function emit(topic, data) {
        const set = _subs.get(topic);
        if (!set || set.size === 0) return;

        for (const entry of set) {
            if (entry.coalesce) {
                _enqueue(topic, entry.cb, data);
            } else {
                /* Fire immediately (rare — for things like animations) */
                try { entry.cb(data, topic); } catch(e) { console.error(`[EventBus] ${topic}:`, e); }
            }
        }
    }

    /* ── bulk emit — fire several topics at once (one flush) ── */
    function emitAll(topicDataPairs) {
        topicDataPairs.forEach(([t, d]) => emit(t, d));
    }

    /* ── coalescing queue ── */
    function _enqueue(topic, cb, data) {
        if (!_pending) {
            _pending = new Map();
            queueMicrotask(_flush);
        }
        /* Only keep the LATEST data per callback — dedup */
        _pending.set(cb, { data, topic });
    }

    function _flush() {
        if (!_pending || _flushing) return;
        _flushing = true;
        const batch = _pending;
        _pending = null;

        for (const [cb, { data, topic }] of batch) {
            try { cb(data, topic); } catch(e) { console.error(`[EventBus] flush ${topic}:`, e); }
        }
        _flushing = false;
    }

    /* ── wildcard convenience: subscribe to ALL events ── */
    const _WILDCARD = '*';
    function onAny(cb, opts) { return on(_WILDCARD, cb, opts); }

    /* Override emit to also fire wildcard */
    const _origEmit = emit;
    function emitWithWildcard(topic, data) {
        _origEmit(topic, data);
        if (topic !== _WILDCARD) {
            const wcSet = _subs.get(_WILDCARD);
            if (wcSet && wcSet.size > 0) {
                for (const entry of wcSet) {
                    if (entry.coalesce) _enqueue(_WILDCARD, entry.cb, { topic, data });
                    else try { entry.cb({ topic, data }, _WILDCARD); } catch(e) {}
                }
            }
        }
    }

    /* ── debug: list active subscriptions ── */
    function debug() {
        const out = {};
        _subs.forEach((set, topic) => { out[topic] = set.size; });
        console.table(out);
    }

    return {
        on,
        emit: emitWithWildcard,
        emitAll,
        onAny,
        debug
    };
})();
