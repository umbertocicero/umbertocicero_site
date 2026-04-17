/* ═══════════════════════════════════════════════════════
   <gd-nation-badge>
   Compact flag + name badge for the player's nation.
   Optionally shows relationship badge for other nations.
   
   Usage:
     <gd-nation-badge></gd-nation-badge>                  — player
     <gd-nation-badge code="ru"></gd-nation-badge>         — specific nation
   
   Reacts to: hud:refresh, state:changed
   ═══════════════════════════════════════════════════════ */

class GdNationBadge extends GdComponent {
    static get events() {
        return ['hud:refresh', 'state:changed'];
    }

    static get observedAttributes() {
        return ['code'];
    }

    attributeChangedCallback() {
        this.requestRender();
    }

    get nationCode() {
        return this.getAttribute('code') || (this.state ? this.state.player : null);
    }

    template() {
        return `
            <style>
                ${GdComponent.sharedStyles}
                :host {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }
                .flag {
                    font-size: 1.3rem;
                    line-height: 1;
                }
                .info {
                    display: flex;
                    flex-direction: column;
                    gap: 1px;
                }
                .name {
                    font-family: var(--font-title);
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: var(--text);
                    letter-spacing: 0.5px;
                }
                .badge {
                    font-size: 0.55rem;
                    padding: 1px 6px;
                    border-radius: 3px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-weight: 600;
                    width: fit-content;
                }
                .badge-mine { background: rgba(0,229,255,0.15); color: var(--accent); }
                .badge-war  { background: rgba(255,23,68,0.15);  color: var(--red); }
                .badge-ally { background: rgba(0,230,118,0.15);  color: var(--accent2); }
            </style>
            <span class="flag" data-ref="flag"></span>
            <div class="info">
                <span class="name" data-ref="name"></span>
                <span class="badge" data-ref="badge" style="display:none"></span>
            </div>
        `;
    }

    render() {
        const s = this.state;
        if (!s) return;
        const code = this.nationCode;
        if (!code) return;

        const n = s.nations[code];
        if (!n) return;

        this.refs.flag.textContent = n.flag;
        this.refs.name.textContent = n.name;
        this.parseEmoji(this.refs.flag);

        /* Show relationship badge for non-player nations */
        const badge = this.refs.badge;
        if (code !== s.player) {
            const atWar = GameEngine.isAtWar(s.player, code);
            const isAlly = GameEngine.isAlly(s.player, code);
            if (atWar) {
                badge.textContent = '⚔️ IN GUERRA';
                badge.className = 'badge badge-war';
                badge.style.display = '';
            } else if (isAlly) {
                badge.textContent = '🤝 ALLEATO';
                badge.className = 'badge badge-ally';
                badge.style.display = '';
            } else {
                badge.style.display = 'none';
            }
        } else {
            badge.style.display = 'none';
        }
    }
}

customElements.define('gd-nation-badge', GdNationBadge);
