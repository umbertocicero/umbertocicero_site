/* ═══════════════════════════════════════════════════════
   GeoDominium — Components Index
   ──────────────────────────────────────────────────────
   Barrel file: loads the component system in order.
   Include this single <script> after data.js but before ui.js:

     <script src="components/index.js"></script>

   Load order:
   1. EventBus    — pub/sub singleton
   2. GdComponent — base class for all web components
   3. EventBridge — GameEngine ↔ EventBus adapter
   4. Individual components (any order)
   ═══════════════════════════════════════════════════════ */

/* NOTE: Since this project uses plain <script> tags (no bundler),
   the individual files are loaded via <script> tags in index.html.
   This file documents the load order and serves as an inventory.

   Required <script> order in index.html:
   ─────────────────────────────────────
   <!-- Component System -->
   <script src="components/event-bus.js"></script>
   <script src="components/gd-component.js"></script>
   <script src="components/event-bridge.js"></script>
   
   <!-- Components -->
   <script src="components/gd-resource-bar.js"></script>
   <script src="components/gd-military-bar.js"></script>
   <script src="components/gd-event-log.js"></script>
   <script src="components/gd-nation-legend.js"></script>
   <script src="components/gd-turn-indicator.js"></script>
   <script src="components/gd-nation-badge.js"></script>
   <script src="components/gd-garrison-card.js"></script>
   <script src="components/gd-battle-result.js"></script>
*/

/* Component registry — for debugging / introspection */
const GdComponents = {
    version: '1.0.0',
    registered: [
        'gd-resource-bar',
        'gd-military-bar',
        'gd-event-log',
        'gd-nation-legend',
        'gd-turn-indicator',
        'gd-nation-badge',
        'gd-garrison-card',
        'gd-battle-result'
    ],
    /** Check all components are defined */
    check() {
        const missing = this.registered.filter(tag => !customElements.get(tag));
        if (missing.length > 0) {
            console.warn('[GdComponents] Missing:', missing);
        } else {
            console.log(`[GdComponents] All ${this.registered.length} components registered ✓`);
        }
        return missing.length === 0;
    }
};
