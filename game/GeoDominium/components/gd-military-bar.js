/* ═══════════════════════════════════════════════════════
   <gd-military-bar>
   Bottom bar: compact army overview for the player.
   Shows total ATK/DEF + unit icons with counts.
   Reacts to: army:changed, resources:changed, turn:start
   ═══════════════════════════════════════════════════════ */

class GdMilitaryBar extends GdComponent {
    static get events() {
        return ['army:changed', 'resources:changed', 'turn:start', 'hud:refresh', 'state:changed'];
    }

    template() {
        return `
            <style>
                ${GdComponent.sharedStyles}
                :host {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    align-items: center;
                    font-family: var(--font-mono);
                    font-size: 0.78rem;
                    padding: 4px 0;
                }
                .mil-summary {
                    display: flex;
                    gap: 8px;
                    font-weight: 700;
                    color: var(--gold);
                    border-right: 1px solid var(--border);
                    padding-right: 10px;
                    margin-right: 4px;
                }
                .mil-unit {
                    display: flex;
                    align-items: center;
                    gap: 2px;
                    padding: 2px 5px;
                    border-radius: 4px;
                    background: rgba(255,255,255,0.03);
                    transition: background 0.15s;
                }
                .mil-unit:hover {
                    background: rgba(255,255,255,0.07);
                }
                .mil-icon { font-size: 0.9rem; }
                .mil-count { font-weight: 600; }
            </style>
            <div data-ref="bar" part="bar" style="display:contents"></div>
        `;
    }

    render() {
        const s = this.state;
        if (!s) return;
        const n = s.nations[s.player];
        if (!n) return;

        const totalAtk = GameEngine.calcMilitary(s.player, 'atk');
        const totalDef = GameEngine.calcMilitary(s.player, 'def');
        const totalUnits = Object.values(n.army).reduce((a,b) => a+b, 0);

        let html = `<div class="mil-summary">
            <span>⚔️${totalAtk}</span>
            <span>🛡️${totalDef}</span>
            <span>🪖${totalUnits}</span>
        </div>`;

        Object.entries(UNIT_TYPES).forEach(([key, ut]) => {
            const count = n.army[key] || 0;
            if (count > 0) {
                html += `<div class="mil-unit" title="${ut.name} — ATK:${ut.atk} DEF:${ut.def}">
                    <span class="mil-icon">${ut.icon}</span>
                    <span class="mil-count">${count}</span>
                </div>`;
            }
        });

        this.setHtml('bar', html);
    }
}

customElements.define('gd-military-bar', GdMilitaryBar);
