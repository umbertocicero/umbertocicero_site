/* ═══════════════════════════════════════════════════════
   GeoDominium — EventBridge
   ──────────────────────────────────────────────────────
   Bridges GameEngine events → EventBus topics.
   Call EventBridge.init() after GameEngine.newGame().

   TOPIC CATALOGUE  (subscribe in components via static events)
   ──────────────────────────────────────────────────────
   state:changed        — generic (after any significant update)
   turn:start           — new turn begins
   turn:end             — turn fully resolved (AI done)
   resources:changed    — player resources updated
   army:changed         — player army counts changed
   territory:conquered  — {territory, attacker, defender, conquered}
   territory:lost       — {territory, from, to}
   territory:selected   — {code}
   battle:resolved      — full battle result object
   diplomacy:changed    — alliances/wars/sanctions changed
   tech:researched      — {techId, nationCode}
   nation:eliminated    — {nationCode}
   unrest:changed       — {territory, unrest}
   revolt:happened      — {territory, from, to}
   nuke:launched        — {attacker, target, result}
   production:built     — {unitType, nationCode}
   victory:achieved     — {victor, type}
   player:dead          — player eliminated
   autoplay:start       — auto-play mode activated
   autoplay:stop        — auto-play mode stopped
   hud:refresh          — force HUD refresh
   panel:refresh        — force left panel refresh
   ai:action            — single AI action logged {action, state}
   ═══════════════════════════════════════════════════════ */

const EventBridge = (() => {

    let _hooked = false;
    let _origCallback = null;   // original UI.addEventToLog (or whatever was set)

    /**
     * init(existingCallback)
     * Call AFTER GameEngine.newGame() but BEFORE GameEngine.setOnEvent().
     * Or call AFTER setOnEvent — we'll read the current callback and wrap it.
     *
     * @param {Function} [existingCallback] — the UI.addEventToLog to preserve
     */
    function init(existingCallback) {
        if (_hooked) return;
        _hooked = true;

        _origCallback = existingCallback || null;

        /* Wrap GameEngine's onEvent callback:
           1. Forward to the original callback (UI.addEventToLog) for the existing UI
           2. Translate into EventBus topics for the new web components */
        GameEngine.setOnEvent((entry) => {
            /* Forward to original UI handler first */
            if (_origCallback) {
                try { _origCallback(entry); } catch(e) { console.error('[EventBridge] origCb:', e); }
            }

            /* Map engine event types → bus topics */
            switch (entry.type) {
                case 'battle':
                    EventBus.emit('battle:logged', entry);
                    break;
                case 'diplomacy':
                    EventBus.emit('diplomacy:changed', entry);
                    break;
                case 'nuke':
                    EventBus.emit('nuke:logged', entry);
                    break;
                case 'resource':
                    EventBus.emit('resources:changed', entry);
                    break;
                case 'tech':
                    EventBus.emit('tech:logged', entry);
                    break;
                case 'game':
                    EventBus.emit('game:event', entry);
                    break;
            }
        });
    }

    /** Reset hook (e.g. on game restart) */
    function reset() {
        _hooked = false;
        _origCallback = null;
    }

    /* ── Convenience emitters (call from UI actions) ── */

    function emitResourcesChanged() {
        EventBus.emit('resources:changed');
    }

    function emitArmyChanged() {
        EventBus.emit('army:changed');
    }

    function emitTerritoryConquered(detail) {
        EventBus.emit('territory:conquered', detail);
        EventBus.emit('state:changed');
    }

    function emitTerritoryLost(detail) {
        EventBus.emit('territory:lost', detail);
        EventBus.emit('state:changed');
    }

    function emitTerritorySelected(code) {
        EventBus.emit('territory:selected', { code });
    }

    function emitBattleResolved(result) {
        EventBus.emit('battle:resolved', result);
    }

    function emitTechResearched(techId, nationCode) {
        EventBus.emit('tech:researched', { techId, nationCode });
    }

    function emitNationEliminated(nationCode) {
        EventBus.emit('nation:eliminated', { nationCode });
    }

    function emitUnrestChanged(territory, unrest) {
        EventBus.emit('unrest:changed', { territory, unrest });
    }

    function emitRevolt(detail) {
        EventBus.emit('revolt:happened', detail);
    }

    function emitNukeLaunched(detail) {
        EventBus.emit('nuke:launched', detail);
    }

    function emitProductionBuilt(unitType, nationCode) {
        EventBus.emit('production:built', { unitType, nationCode });
        EventBus.emit('army:changed');
        EventBus.emit('resources:changed');
    }

    function emitVictory(victor, type) {
        EventBus.emit('victory:achieved', { victor, type });
    }

    function emitPlayerDead() {
        EventBus.emit('player:dead');
    }

    function emitAutoPlay(started) {
        EventBus.emit(started ? 'autoplay:start' : 'autoplay:stop');
    }

    function emitTurnStart(turn) {
        EventBus.emit('turn:start', { turn });
        EventBus.emit('resources:changed');
        EventBus.emit('army:changed');
        EventBus.emit('state:changed');
    }

    function emitTurnEnd(turn) {
        EventBus.emit('turn:end', { turn });
    }

    function emitHudRefresh() {
        EventBus.emit('hud:refresh');
    }

    function emitPanelRefresh() {
        EventBus.emit('panel:refresh');
    }

    function emitDiplomacyChanged() {
        EventBus.emit('diplomacy:changed');
    }

    function emitStateChanged() {
        EventBus.emit('state:changed');
    }

    function emitAiAction(action, state) {
        EventBus.emit('ai:action', { action, state });
    }

    return {
        init,
        reset,
        emitResourcesChanged,
        emitArmyChanged,
        emitTerritoryConquered,
        emitTerritoryLost,
        emitTerritorySelected,
        emitBattleResolved,
        emitTechResearched,
        emitNationEliminated,
        emitUnrestChanged,
        emitRevolt,
        emitNukeLaunched,
        emitProductionBuilt,
        emitVictory,
        emitPlayerDead,
        emitAutoPlay,
        emitTurnStart,
        emitTurnEnd,
        emitHudRefresh,
        emitPanelRefresh,
        emitDiplomacyChanged,
        emitStateChanged,
        emitAiAction
    };
})();
