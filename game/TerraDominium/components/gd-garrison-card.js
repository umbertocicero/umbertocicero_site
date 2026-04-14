/* ═══════════════════════════════════════════════════════
   <gd-garrison-card>
   Shows garrison strength, defense/unrest modifiers, and
   unrest bar for a specific territory.

   Usage:
     <gd-garrison-card territory="ru"></gd-garrison-card>

   Reacts to: territory:selected, unrest:changed, army:changed,
              state:changed, panel:refresh
   ═══════════════════════════════════════════════════════ */

class GdGarrisonCard extends GdComponent {
    static get events() {
        return ['territory:selected', 'unrest:changed', 'army:changed',
                'state:changed', 'panel:refresh', 'turn:start'];
    }

    static get observedAttributes() { return ['territory']; }
    attributeChangedCallback() { this.requestRender(); }

    get territoryCode() {
        return this.getAttribute('territory');
    }

    template() {
        return `
            <style>
                ${GdComponent.sharedStyles}
                :host { display: block; }
                .card {
                    background: var(--bg-panel-alt);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    padding: 8px 10px;
                }
                .header {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin-bottom: 6px;
                }
                .dot {
                    width: 8px; height: 8px;
                    border-radius: 50%;
                }
                .strength-label {
                    font-family: var(--font-title);
                    font-size: 0.65rem;
                    font-weight: 700;
                    letter-spacing: 1px;
                }
                .troops {
                    margin-left: auto;
                    font-family: var(--font-mono);
                    font-size: 0.7rem;
                    color: var(--text-dim);
                }
                .meter {
                    height: 3px;
                    background: rgba(255,255,255,0.06);
                    border-radius: 2px;
                    overflow: hidden;
                    margin-bottom: 8px;
                }
                .meter-fill {
                    height: 100%;
                    border-radius: 2px;
                    transition: width 0.4s ease;
                }
                .stats {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 4px;
                    font-size: 0.65rem;
                }
                .stat {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 3px;
                    background: rgba(255,255,255,0.02);
                    border-radius: 4px;
                }
                .stat-val { font-weight: 700; font-size: 0.75rem; }
                .stat-lbl { color: var(--text-dim); font-size: 0.55rem; }

                .unrest {
                    margin-top: 8px;
                    padding-top: 6px;
                    border-top: 1px solid var(--border);
                }
                .unrest-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.65rem;
                    margin-bottom: 3px;
                }
                .unrest-bar {
                    height: 4px;
                    background: rgba(255,255,255,0.06);
                    border-radius: 2px;
                    overflow: hidden;
                }
                .unrest-fill {
                    height: 100%;
                    border-radius: 2px;
                    transition: width 0.4s ease;
                }
                .unrest-warn {
                    font-size: 0.6rem;
                    color: #ff9100;
                    margin-top: 3px;
                }
                .empty {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px;
                    color: var(--text-dim);
                    font-size: 0.72rem;
                }
                .empty-icon { font-size: 1.4rem; color: #ff6e40; }
            </style>
            <div data-ref="card"></div>
        `;
    }

    render() {
        const code = this.territoryCode;
        const s = this.state;
        if (!code || !s || typeof GameEngine.getGarrison !== 'function') {
            this.refs.card.innerHTML = '';
            return;
        }

        const owner = s.territories[code];
        const n = s.nations[owner];
        const g = GameEngine.getGarrison(code);

        if (!g || g.total <= 0) {
            this.refs.card.innerHTML = `<div class="card"><div class="empty">
                <span class="empty-icon">⚠</span>
                <span>Nessuna guarnigione<br><small style="color:var(--text-dim)">Malcontento +5/turno · Difesa −10%</small></span>
            </div></div>`;
            return;
        }

        const sColors = { heavy:'#00e5ff', medium:'#ffd740', light:'#ff9100', none:'#ff1744' };
        const sLabels = { heavy:'HEAVY', medium:'MEDIUM', light:'LIGHT', none:'NONE' };
        const sCol = sColors[g.strength] || '#607d8b';
        const defMod = g.strength === 'heavy' ? '+25%' : g.strength === 'medium' ? '+12%' : g.strength === 'light' ? '+5%' : '−10%';
        const defColor = g.strength === 'none' ? '#ff1744' : '#00e676';
        const unrestMod = g.strength === 'heavy' ? '−6' : g.strength === 'medium' ? '−4' : g.strength === 'light' ? '−2' : '+5';
        const unrestColor = g.strength === 'none' ? '#ff1744' : '#00e676';
        const meterPct = Math.min(100, Math.round(g.total / 20 * 100));

        let html = `<div class="card">`;
        html += `<div class="header">
            <div class="dot" style="background:${sCol};box-shadow:0 0 5px ${sCol}"></div>
            <span class="strength-label" style="color:${sCol}">${sLabels[g.strength]}</span>
            <span class="troops">${g.icon} ${g.total} unità</span>
        </div>`;
        html += `<div class="meter"><div class="meter-fill" style="width:${meterPct}%;background:${sCol}"></div></div>`;
        html += `<div class="stats">
            <div class="stat"><span class="stat-val" style="color:${defColor}">${defMod}</span><span class="stat-lbl">🛡️ Difesa</span></div>
            <div class="stat"><span class="stat-val" style="color:${unrestColor}">${unrestMod}/t</span><span class="stat-lbl">🔥 Malcont.</span></div>
            <div class="stat"><span class="stat-val">${g.icon}</span><span class="stat-lbl">Dominante</span></div>
            <div class="stat"><span class="stat-val">${code === (n?.homeland || owner) ? '🏠' : '🌍'}</span><span class="stat-lbl">${code === (n?.homeland || owner) ? 'Patria' : 'Colonia'}</span></div>
        </div>`;

        /* Unrest (only for conquered territories) */
        if (code !== owner && typeof GameEngine.getUnrest === 'function') {
            const unrest = GameEngine.getUnrest(code);
            if (unrest > 0) {
                const barColor = unrest >= 80 ? '#ff1744' : unrest >= 60 ? '#ff9100' : unrest >= 40 ? '#ffd740' : '#66bb6a';
                const uLabel = unrest >= 80 ? 'CRITICO' : unrest >= 60 ? 'ALTO' : unrest >= 40 ? 'MEDIO' : 'BASSO';
                html += `<div class="unrest">
                    <div class="unrest-row">
                        <span>🔥 Malcontento</span>
                        <span style="color:${barColor};font-weight:600">${uLabel} ${Math.round(unrest)}%</span>
                    </div>
                    <div class="unrest-bar"><div class="unrest-fill" style="width:${unrest}%;background:${barColor}"></div></div>
                    ${unrest >= 60 ? '<div class="unrest-warn">⚠ Rivolta a 100% — rafforza la guarnigione!</div>' : ''}
                </div>`;
            }
        }

        html += `</div>`;
        this.setHtml('card', html);
    }
}

customElements.define('gd-garrison-card', GdGarrisonCard);
