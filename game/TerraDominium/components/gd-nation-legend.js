/* ═══════════════════════════════════════════════════════
   <gd-nation-legend>
   Map legend showing all nations sorted by territory count.
   Player always first, grouped by status (war/ally/neutral/dead).
   Clicking a nation emits territory:selected.
   Reacts to: state:changed, territory:conquered, territory:lost,
              diplomacy:changed, turn:start
   ═══════════════════════════════════════════════════════ */

class GdNationLegend extends GdComponent {
    static get events() {
        return [
            'state:changed', 'territory:conquered', 'territory:lost',
            'diplomacy:changed', 'turn:start', 'turn:end',
            'nation:eliminated', 'hud:refresh', 'lang:changed'
        ];
    }

    constructor() {
        super();
        this._lastHtml = '';
    }

    onEvent(_data, topic) {
        if (topic === 'lang:changed') this._lastHtml = '';   // force re-render
    }

    template() {
        return `
            <style>
                ${GdComponent.sharedStyles}
                :host {
                    display: block;
                    max-height: 260px;
                    overflow-y: auto;
                    overflow-x: hidden;
                    font-size: 0.7rem;
                    font-family: var(--font-body);
                }
                :host::-webkit-scrollbar { width: 4px; }
                :host::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

                .title {
                    font-family: var(--font-title);
                    font-size: 0.6rem;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    padding: 6px 8px 4px;
                }
                .item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 3px 8px;
                    cursor: pointer;
                    border-radius: 4px;
                    transition: background 0.15s;
                }
                .item:hover { background: rgba(255,255,255,0.05); }
                .swatch {
                    width: 10px; height: 10px;
                    border-radius: 50%;
                    flex-shrink: 0;
                    box-shadow: 0 0 4px rgba(0,0,0,0.3);
                }
                .name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .count {
                    font-family: var(--font-mono);
                    font-weight: 600;
                    min-width: 22px;
                    text-align: right;
                }
                .player { color: var(--accent); font-weight: 600; }
                .enemy  { color: var(--red); }
                .ally   { color: var(--accent2); }
                .dead   { color: var(--text-muted); opacity: 0.5; text-decoration: line-through; cursor: default; }
            </style>
            <div data-ref="list"></div>
        `;
    }

    render() {
        const s = this.state;
        if (!s) return;

        /* Count territories per nation */
        const counts = {};
        Object.values(s.territories).forEach(owner => {
            counts[owner] = (counts[owner] || 0) + 1;
        });

        /* Sort nations by territory count */
        const allNations = Object.keys(NATIONS)
            .map(code => ({ code, count: counts[code] || 0, alive: s.nations[code]?.alive }))
            .sort((a, b) => b.count - a.count);

        /* Player always first */
        const pidx = allNations.findIndex(n => n.code === s.player);
        if (pidx > 0) {
            const [p] = allNations.splice(pidx, 1);
            allNations.unshift(p);
        }

        const _t = (typeof I18n !== 'undefined') ? I18n.t : k => k;
        let html = `<div class="title">${_t('nl_title')}</div>`;

        allNations.forEach(({ code, count, alive }) => {
            const n = s.nations[code];
            if (!n) return;
            const isPlayer = code === s.player;
            const atWar = GameEngine.isAtWar(s.player, code);
            const isAlly = GameEngine.isAlly(s.player, code);
            let cls = !alive ? 'dead' : isPlayer ? 'player' : atWar ? 'enemy' : isAlly ? 'ally' : '';

            html += `<div class="item ${cls}" data-code="${code}">
                <span class="name">${n.flag} ${n.name}</span>
                <span class="count">${count}</span>
            </div>`;
        });

        /* Skip re-render if nothing changed */
        if (html === this._lastHtml) return;
        this._lastHtml = html;

        this.setHtml('list', html);

        /* Delegate click */
        this.refs.list.querySelectorAll('.item[data-code]').forEach(el => {
            if (el.classList.contains('dead')) return;
            el.addEventListener('click', () => {
                EventBus.emit('legend:nation-clicked', { code: el.dataset.code });
            });
        });
    }
}

customElements.define('gd-nation-legend', GdNationLegend);
