/* ═══════════════════════════════════════════════════════
   <gd-event-log>
   Right-panel event log — auto-scrolling list of game
   events with filtering by type.
   Reacts to: ALL events via wildcard (logs everything)
   ═══════════════════════════════════════════════════════ */

class GdEventLog extends GdComponent {
    /* Don't use the standard coalesced events — we need every event */
    static get events() { return []; }

    constructor() {
        super();
        this._entries     = [];
        this._maxEntries  = 80;
        this._autoScroll  = true;
        this._pendingFlush = false;
    }

    template() {
        return `
            <style>
                ${GdComponent.sharedStyles}
                :host {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    overflow: hidden;
                }
                .log-scroll {
                    flex: 1;
                    overflow-y: auto;
                    overflow-x: hidden;
                    scroll-behavior: auto;
                    padding: 4px 6px;
                }
                .log-scroll::-webkit-scrollbar { width: 4px; }
                .log-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

                .evt {
                    padding: 3px 6px;
                    font-size: 0.72rem;
                    line-height: 1.4;
                    border-left: 3px solid transparent;
                    border-radius: 0 4px 4px 0;
                    margin-bottom: 2px;
                    transition: background 0.15s;
                    font-family: var(--font-body);
                }
                .evt:hover { background: rgba(255,255,255,0.03); }
                .evt-turn {
                    font-family: var(--font-mono);
                    color: var(--text-muted);
                    font-size: 0.6rem;
                    margin-right: 4px;
                }
                .evt-battle    { border-left-color: #ff1744; }
                .evt-resource  { border-left-color: #ffd740; }
                .evt-diplomacy { border-left-color: #42a5f5; }
                .evt-tech      { border-left-color: #00e676; }
                .evt-nuke      { border-left-color: #ff00ff; }
                .evt-mine      { background: rgba(0,229,255,0.05); }
                .evt-ally      { background: rgba(0,230,118,0.04); }

                .evt-flag {
                    display: inline-block;
                    width: 8px; height: 8px;
                    border-radius: 50%;
                    vertical-align: middle;
                    margin-right: 3px;
                }
                .evt-nation { font-weight: 600; }
                .evt-action { color: var(--text-dim); }
                .evt-result { font-weight: 700; }
                .evt-result.win  { color: var(--accent2); }
                .evt-result.lose { color: var(--red); }

                .btn-live {
                    position: absolute;
                    bottom: 8px;
                    right: 8px;
                    background: rgba(255,23,68,0.9);
                    color: #fff;
                    border: none;
                    border-radius: 12px;
                    padding: 4px 12px;
                    font-size: 0.65rem;
                    font-family: var(--font-title);
                    cursor: pointer;
                    display: none;
                    z-index: 10;
                    animation: pulse-live 1.5s infinite;
                }
                .btn-live.visible { display: block; }

                @keyframes pulse-live {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(255,23,68,0.4); }
                    50%      { box-shadow: 0 0 0 6px rgba(255,23,68,0); }
                }
            </style>
            <div style="position:relative;flex:1;display:flex;flex-direction:column;overflow:hidden;">
                <div class="log-scroll" data-ref="scroll"></div>
                <button class="btn-live" data-ref="btnLive">🔴 LIVE</button>
            </div>
        `;
    }

    onInit() {
        const scroll = this.refs.scroll;
        const btnLive = this.refs.btnLive;

        /* Scroll listener for auto-follow toggle */
        scroll.addEventListener('scroll', () => {
            if (this._pendingFlush) return;
            const dist = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight;
            if (dist < 40) {
                this._autoScroll = true;
                btnLive.classList.remove('visible');
            } else {
                this._autoScroll = false;
                btnLive.classList.add('visible');
            }
        }, { passive: true });

        /* LIVE button */
        btnLive.addEventListener('click', () => {
            this._autoScroll = true;
            scroll.scrollTop = scroll.scrollHeight;
            btnLive.classList.remove('visible');
        });
    }

    /* Public: called from outside (UI.addEventToLog compatible) */
    addEntry(entry) {
        this._entries.push(entry);
        if (this._entries.length > this._maxEntries) {
            this._entries.shift();
        }
        this._appendSingle(entry);
    }

    _appendSingle(entry) {
        const scroll = this.refs.scroll;
        if (!scroll) return;

        const typeMap = {
            battle: 'evt-battle', resource: 'evt-resource', diplomacy: 'evt-diplomacy',
            tech: 'evt-tech', nuke: 'evt-nuke', game: ''
        };

        /* Classify: mine / ally / other */
        let ownerClass = '';
        const state = this.state;
        if (state) {
            const pn = state.nations[state.player];
            const msg = entry.msg || '';
            if (pn && msg.includes(pn.name)) ownerClass = 'evt-mine';
            /* (ally detection could be added here) */
        }

        const div = document.createElement('div');
        div.className = `evt ${typeMap[entry.type] || ''} ${ownerClass}`.trim();
        div.innerHTML = `<span class="evt-turn">T${entry.turn}</span> ${entry.msg || ''}`;
        this.parseEmoji(div);

        this._pendingFlush = true;

        /* Trim DOM */
        while (scroll.children.length >= this._maxEntries) {
            scroll.removeChild(scroll.firstChild);
        }
        scroll.appendChild(div);

        /* Auto-scroll */
        if (this._autoScroll) {
            requestAnimationFrame(() => {
                scroll.scrollTop = scroll.scrollHeight;
                this._pendingFlush = false;
            });
        } else {
            this._pendingFlush = false;
        }
    }

    /* Not using render() since entries are appended incrementally */
    render() {}
}

customElements.define('gd-event-log', GdEventLog);
