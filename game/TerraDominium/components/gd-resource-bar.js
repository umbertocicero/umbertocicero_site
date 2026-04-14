/* ═══════════════════════════════════════════════════════
   <gd-resource-bar>
   Top HUD resource display — shows current stockpile
   + per-turn income for the player nation.
   Reacts to: resources:changed, turn:start, hud:refresh
   ═══════════════════════════════════════════════════════ */

class GdResourceBar extends GdComponent {
    static get events() {
        return ['resources:changed', 'turn:start', 'hud:refresh', 'state:changed'];
    }

    template() {
        return `
            <style>
                ${GdComponent.sharedStyles}
                :host {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px 10px;
                    align-items: center;
                    font-family: var(--font-mono);
                    font-size: 0.78rem;
                }
                .res-item {
                    display: flex;
                    align-items: center;
                    gap: 3px;
                    white-space: nowrap;
                }
                .res-icon { font-size: 0.85rem; }
                .res-val  { color: var(--text); font-weight: 600; }
                .res-inc  {
                    color: var(--accent2);
                    font-size: 0.65rem;
                    font-weight: 400;
                }
            </style>
            <div data-ref="bar" part="bar"></div>
        `;
    }

    render() {
        const s = this.state;
        if (!s) return;
        const n = s.nations[s.player];
        if (!n) return;

        const income = GameEngine.calcIncome(s.player);
        const keys = ['money','oil','gas','rareEarth','steel','food','uranium','gold','silver','diamonds'];
        let html = '';

        keys.forEach(key => {
            const r = RESOURCES[key];
            if (!r) return;
            const cur = n.res[key] || 0;
            const inc = income[key] || 0;
            const incStr = inc > 0 ? `<span class="res-inc">+${inc}</span>` : '';
            html += `<div class="res-item">
                <span class="res-icon">${r.icon}</span>
                <span class="res-val">${cur}</span>${incStr}
            </div>`;
        });

        this.setHtml('bar', html);
    }
}

customElements.define('gd-resource-bar', GdResourceBar);
