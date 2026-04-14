/* ═══════════════════════════════════════════════════════
   <gd-turn-indicator>
   Compact HUD element showing the current turn, year,
   and territory count.
   Reacts to: turn:start, state:changed, hud:refresh
   ═══════════════════════════════════════════════════════ */

class GdTurnIndicator extends GdComponent {
    static get events() {
        return ['turn:start', 'state:changed', 'hud:refresh',
                'territory:conquered', 'territory:lost'];
    }

    template() {
        return `
            <style>
                ${GdComponent.sharedStyles}
                :host {
                    display: inline-flex;
                    flex-direction: column;
                    gap: 1px;
                    font-family: var(--font-mono);
                }
                .turn {
                    font-size: 0.7rem;
                    color: var(--accent);
                    font-weight: 600;
                }
                .info {
                    font-size: 0.6rem;
                    color: var(--text-dim);
                }
            </style>
            <span class="turn" data-ref="turn">Turno 1</span>
            <span class="info" data-ref="info"></span>
        `;
    }

    render() {
        const s = this.state;
        if (!s) return;

        const terrCount = GameEngine.getTerritoryCount(s.player);
        const year = 2025 + s.turn;

        this.refs.turn.textContent = `Turno ${s.turn} (${year})`;
        this.refs.info.textContent = `🌍 ${terrCount} territori`;
        this.parseEmoji(this.refs.info);
    }
}

customElements.define('gd-turn-indicator', GdTurnIndicator);
