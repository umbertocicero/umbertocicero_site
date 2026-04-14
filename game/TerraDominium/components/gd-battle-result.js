/* ═══════════════════════════════════════════════════════
   <gd-battle-result>
   Popup-style battle result display.
   Can be used standalone or inside a popup container.

   Set data programmatically:
     const el = document.querySelector('gd-battle-result');
     el.showBattle(result);

   Reacts to: battle:resolved
   ═══════════════════════════════════════════════════════ */

class GdBattleResult extends GdComponent {
    static get events() {
        return ['battle:resolved'];
    }

    constructor() {
        super();
        this._result = null;
    }

    template() {
        return `
            <style>
                ${GdComponent.sharedStyles}
                :host { display: block; }
                .btl-header {
                    text-align: center;
                    margin-bottom: 10px;
                }
                .btl-header h3 {
                    font-family: var(--font-title);
                    font-size: 1rem;
                    margin: 0;
                    color: var(--accent);
                }
                .btl-territory {
                    font-size: 0.8rem;
                    color: var(--text-dim);
                }
                .btl-grid {
                    display: grid;
                    grid-template-columns: 1fr auto 1fr;
                    gap: 8px;
                    margin-bottom: 10px;
                }
                .btl-col {
                    background: var(--bg-panel-alt);
                    border-radius: 8px;
                    padding: 8px;
                    border: 1px solid var(--border);
                }
                .btl-nation {
                    font-weight: 700;
                    font-size: 0.85rem;
                    margin-bottom: 6px;
                    text-align: center;
                }
                .btl-units {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                    font-size: 0.7rem;
                    margin-bottom: 6px;
                }
                .btl-u { white-space: nowrap; }
                .btl-dead { color: var(--red); font-size: 0.65rem; }
                .btl-pow {
                    font-family: var(--font-mono);
                    font-size: 0.7rem;
                    text-align: center;
                    color: var(--text-dim);
                }
                .btl-vs {
                    display: flex;
                    align-items: center;
                    font-family: var(--font-title);
                    font-weight: 900;
                    font-size: 1.2rem;
                    color: var(--text-muted);
                }
                .result {
                    text-align: center;
                    font-family: var(--font-title);
                    font-size: 0.9rem;
                    font-weight: 700;
                    padding: 8px;
                    border-radius: 6px;
                    margin: 8px 0;
                }
                .result.win {
                    background: rgba(0,230,118,0.12);
                    color: var(--accent2);
                    border: 1px solid rgba(0,230,118,0.3);
                }
                .result.lose {
                    background: rgba(255,23,68,0.12);
                    color: var(--red);
                    border: 1px solid rgba(255,23,68,0.3);
                }
                .loot {
                    background: rgba(255,215,64,0.08);
                    border: 1px solid rgba(255,215,64,0.2);
                    border-radius: 6px;
                    padding: 6px 10px;
                    margin-top: 6px;
                    text-align: center;
                }
                .loot-title {
                    font-size: 0.7rem;
                    color: var(--gold);
                    font-weight: 600;
                    margin-bottom: 4px;
                }
                .loot-items {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    justify-content: center;
                    font-family: var(--font-mono);
                    font-size: 0.75rem;
                }
                .fatigue {
                    margin-top: 6px;
                    padding: 5px 10px;
                    background: rgba(255,152,0,0.10);
                    border-radius: 6px;
                    font-size: 0.65rem;
                    color: var(--gold);
                    text-align: center;
                    border: 1px solid rgba(255,152,0,0.2);
                }
            </style>
            <div data-ref="display"></div>
        `;
    }

    onEvent(data, topic) {
        if (topic === 'battle:resolved' && data) {
            this.showBattle(data);
        }
    }

    showBattle(result) {
        this._result = result;
        this.requestRender();
    }

    render() {
        const result = this._result;
        if (!result) return;
        const s = this.state;
        if (!s) return;

        const atkN = s.nations[result.attacker];
        const defN = s.nations[result.defender];

        function unitRows(armyBefore, casualties) {
            let rows = [], totalBefore = 0, totalLost = 0;
            Object.entries(UNIT_TYPES).forEach(([key, ut]) => {
                const before = armyBefore[key] || 0;
                const lost = casualties[key] || 0;
                if (before > 0) {
                    totalBefore += before; totalLost += lost;
                    rows.push({ icon: ut.icon, name: ut.name, before, lost });
                }
            });
            return { rows, totalBefore, totalLost };
        }

        const atk = unitRows(result.atkArmyBefore || atkN.army, result.atkCasualties || {});
        const def = unitRows(result.defArmyBefore || (defN ? defN.army : {}), result.defCasualties || {});

        const tBase = typeof getNation !== 'undefined' ? getNation(result.territory) : {};
        const tName = tBase.flag ? `${tBase.flag} ${tBase.name}` : result.territory.toUpperCase();

        let html = `<div class="btl-header"><h3>⚔️ BATTAGLIA</h3><div class="btl-territory">${tName}</div></div>`;
        html += `<div class="btl-grid">`;

        /* Attacker */
        html += `<div class="btl-col"><div class="btl-nation">${atkN?.flag||''} ${atkN?.name||'?'}</div><div class="btl-units">`;
        atk.rows.forEach(r => {
            html += `<span class="btl-u">${r.icon}${r.before}`;
            if (r.lost > 0) html += `<em class="btl-dead">-${r.lost}</em>`;
            html += `</span>`;
        });
        html += `</div><div class="btl-pow">⚔ ${result.atkPow} <span class="btl-dead">☠️ −${atk.totalLost}</span></div></div>`;

        html += `<div class="btl-vs">VS</div>`;

        /* Defender */
        html += `<div class="btl-col"><div class="btl-nation">${defN?.flag||'🏳️'} ${defN?.name||'?'}</div><div class="btl-units">`;
        def.rows.forEach(r => {
            html += `<span class="btl-u">${r.icon}${r.before}`;
            if (r.lost > 0) html += `<em class="btl-dead">-${r.lost}</em>`;
            html += `</span>`;
        });
        html += `</div><div class="btl-pow">🛡 ${result.defPow} <span class="btl-dead">☠️ −${def.totalLost}</span></div></div>`;
        html += `</div>`;

        /* Result banner */
        html += `<div class="result ${result.success ? 'win' : 'lose'}">`;
        html += result.success
            ? (result.conquered ? '✅ VITTORIA — Territorio conquistato!' : '✅ VITTORIA')
            : '❌ SCONFITTA — Ritirata!';
        html += `</div>`;

        /* Loot */
        const loot = result.loot || {};
        const hasLoot = Object.values(loot).some(v => v > 0);
        if (result.conquered && hasLoot) {
            html += `<div class="loot"><div class="loot-title">📦 Bottino di guerra</div><div class="loot-items">`;
            Object.entries(loot).forEach(([r, v]) => {
                if (v > 0) html += `<span>${RESOURCES[r]?.icon||r} +${v}</span>`;
            });
            html += `</div></div>`;
        }

        /* Fatigue */
        if (result.attackCost && (result.attackCost.money > 0 || result.attackCost.infantry > 0 || result.attackCost.fatigue > 0)) {
            const ac = result.attackCost;
            html += `<div class="fatigue">⚡ ${ac.attackNum}° attacco`;
            if (ac.money > 0 || ac.infantry > 0) html += ` — Costo: 💰${ac.money}`;
            if (ac.infantry > 0) html += ` 🪖${ac.infantry}`;
            if (result.fatiguePct > 0) html += ` | Fatica: <strong style="color:#ff6e40;">-${result.fatiguePct}%</strong>`;
            html += `</div>`;
        }

        this.setHtml('display', html);
    }
}

customElements.define('gd-battle-result', GdBattleResult);
