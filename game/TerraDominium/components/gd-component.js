/* ═══════════════════════════════════════════════════════
   GeoDominion — GdComponent  (base Web Component class)
   ──────────────────────────────────────────────────────
   Extend this to create reactive game UI components.

   Features:
   • Declarative event subscriptions via static `events`
   • Shadow DOM with scoped styles
   • Auto-unsubscribe on disconnect
   • Built-in emoji parsing helper
   • Render batching (one render per microtask)
   ═══════════════════════════════════════════════════════ */

class GdComponent extends HTMLElement {
    /* ── Override in subclass ───────────────────────────
       static get events() {
           return ['resources:changed', 'turn:end', ...];
       }
       ────────────────────────────────────────────────── */
    static get events() { return []; }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._unsubs   = [];
        this._renderReq = false;
    }

    /* ── Lifecycle ── */
    connectedCallback() {
        /* Apply template + styles */
        this.shadowRoot.innerHTML = this.template();

        /* Cache inner refs */
        this.refs = {};
        this.shadowRoot.querySelectorAll('[data-ref]').forEach(el => {
            this.refs[el.dataset.ref] = el;
        });

        /* Subscribe to EventBus topics */
        const topics = this.constructor.events;
        if (topics.length > 0) {
            const unsub = EventBus.on(topics, (data, topic) => {
                this.onEvent(data, topic);
                this.requestRender();
            });
            this._unsubs.push(unsub);
        }

        /* Initial render */
        this.onInit();
        this.requestRender();
    }

    disconnectedCallback() {
        this._unsubs.forEach(fn => fn());
        this._unsubs = [];
        this.onDestroy();
    }

    /* ── Template (override) ── */
    template() {
        return `<style>${this.styles()}</style><slot></slot>`;
    }

    /* ── Scoped CSS (override) ── */
    styles() { return ''; }

    /* ── Called once after first connect ── */
    onInit() {}

    /* ── Called on disconnect ── */
    onDestroy() {}

    /* ── Called for each subscribed event ── */
    onEvent(data, topic) {}

    /* ── Render (override): update DOM based on current state ── */
    render() {}

    /* ── Batched render: coalesces multiple calls into one ── */
    requestRender() {
        if (this._renderReq) return;
        this._renderReq = true;
        queueMicrotask(() => {
            this._renderReq = false;
            this.render();
        });
    }

    /* ── Helpers ── */

    /** Get a ref inside shadow DOM */
    $(selector) {
        return this.shadowRoot.querySelector(selector);
    }

    $$(selector) {
        return this.shadowRoot.querySelectorAll(selector);
    }

    /** Parse Twemoji inside the shadow root */
    parseEmoji(el) {
        const target = el || this.shadowRoot;
        if (typeof twemoji !== 'undefined') {
            try {
                twemoji.parse(target, {
                    callback: (icon) => `assets/emoji/${icon}.svg`,
                    ext: '.svg'
                });
            } catch(e) {}
        }
    }

    /** Safe HTML setter with emoji parsing */
    setHtml(refName, html) {
        const el = this.refs[refName];
        if (!el) return;
        el.innerHTML = html;
        this.parseEmoji(el);
    }

    /** Get game state (convenience) */
    get state() {
        return typeof GameEngine !== 'undefined' ? GameEngine.getState() : null;
    }

    /** Get player nation (convenience) */
    get playerNation() {
        const s = this.state;
        return s ? s.nations[s.player] : null;
    }

    /** CSS shared variables — inherit from the page theme */
    static get sharedStyles() {
        return `
            :host {
                --bg-dark:     #0a0e14;
                --bg-panel:    #111820;
                --bg-panel-alt:#161e28;
                --border:      #1e2a3a;
                --border-subtle:#152030;
                --text:        #e0e0e0;
                --text-dim:    #607d8b;
                --text-muted:  #455a64;
                --accent:      #00e5ff;
                --accent2:     #00e676;
                --accent3:     #ff9100;
                --gold:        #ffd740;
                --red:         #ff1744;
                --green:       #00e676;
                --font-title:  'Orbitron', monospace;
                --font-body:   'Rajdhani', sans-serif;
                --font-mono:   'Share Tech Mono', monospace;
                font-family: var(--font-body);
                color: var(--text);
                box-sizing: border-box;
            }
            *, *::before, *::after { box-sizing: inherit; }
            img.emoji {
                height: 1em;
                width: 1em;
                margin: 0 .05em 0 .1em;
                vertical-align: -0.1em;
            }
        `;
    }
}
