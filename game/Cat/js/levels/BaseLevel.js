// ============================================
// BASE LEVEL — Interface / abstract base class
// ============================================
// Every Level must implement (or inherit) the following API:
//
//   theme          {Object}   – visual theme data (sky, lamp color, etc.)
//   generateCity() {void}     – populate platforms[], lamps[], stars[], etc.
//   getElements()  {Array}    – extra named game-object arrays this level owns
//                               e.g. [{ name:'rivalCat', ref: rivalCat }, ...]
//   updateExtras(state) {void} – per-frame updates for level-specific actors
//   drawExtras(ctx) {void}    – drawing that happens after the main draw pass
//   drawPlatformExtras(ctx, platform) {void}
//                             – level-specific overlays on platforms
//                               (snow on roofs, wet ground sheen, etc.)
//   cleanup()      {void}     – called before loading next level

class BaseLevel {
    constructor() {
        // Subclasses must assign this.theme
        this.theme = {
            name: 'Unknown',
            skyTop: '#030308',
            skyMid: '#080812',
            skyBot: '#0e0e18',
            buildingBase: '#141420',
            buildingLight: '#181825',
            groundColor: '#131316',
            lampColor: { r: 220, g: 180, b: 120 },
            lampIntensity: 0.8,
            moonColor: '#9999aa',
            starAlpha: 0.15,
            enemyCount: 0,
            enemySpeed: 2,
            enemyChaseSpeed: 3.5,
            fogAlpha: 0
        };
    }

    // ── Override in subclasses ─────────────────────────────

    /** Populates global arrays: platforms, lamps, stars, foods, enemies, etc. */
    generateCity() {
        throw new Error('BaseLevel.generateCity() must be implemented');
    }

    /**
     * Returns an array of { name, value } pairs for any level-specific
     * single-instance actors (e.g. rivalCat, quantumCat).
     * game.js reads these back to place them into its own variables.
     *   [{ name: 'rivalCat', value: <RivalCat instance> }, ...]
     */
    getElements() {
        return [];
    }

    /**
     * Per-frame update for level-specific logic (boss fight, rival, portals…).
     * @param {Object} state – shared game state slice
     *   { cat, ghosts, portals, portalBursts, quantumOrbs, catHoldsOrb,
     *     KEYS, CONFIG, CatAudio, gameOver, levelTransition }
     * Returns an object with any state mutations:
     *   { gameOver, levelTransition, catHoldsOrb, score }
     */
    updateExtras(state) {
        return {};
    }

    /** Extra draw calls after the main world pass (still in camera transform). */
    drawExtras(ctx) {}

    /**
     * Called by Platform.draw() to apply level-specific visual overlays.
     * Happens after the base platform shape is drawn.
     * @param {CanvasRenderingContext2D} ctx
     * @param {Platform} platform
     */
    drawPlatformExtras(ctx, platform) {}

    /** Called when the level is being unloaded. */
    cleanup() {}

    // ── Shared helpers ─────────────────────────────────────

    /** Standard building-data generator (used by levels 1-4). */
    _generateBuildingData(level) {
        const data = [];
        const numBuildings = 14 + level * 2;
        let x = 0;
        for (let i = 0; i < numBuildings; i++) {
            const gap    = 30 + Math.random() * 30;
            const width  = 160 + Math.random() * 80;
            const height = (300 + Math.random() * 200) + level * 30;
            data.push({ x, width: Math.floor(width), height: Math.floor(height) });
            x += width + gap;
        }
        CONFIG.worldWidth = Math.max(4000, x + 200);
        return data;
    }

    /** Standard enemy seeding (used by levels 1-4). */
    _generateEnemies(buildingData) {
        const theme = this.theme;
        const safeZoneEnd = buildingData.length > 0
            ? buildingData[0].x + buildingData[0].width + 50
            : 400;
        const spacing = Math.max(300, CONFIG.worldWidth / (theme.enemyCount + 2));
        for (let i = 0; i < theme.enemyCount; i++) {
            const x = safeZoneEnd + 100 + i * spacing + Math.random() * 100;
            if (x < CONFIG.worldWidth - 200) {
                const enemy = new Enemy(x, CONFIG.worldHeight - 82, 120 + Math.random() * 100);
                enemy.speed      = theme.enemySpeed;
                enemy.chaseSpeed = theme.enemyChaseSpeed;
                enemies.push(enemy);
            }
        }
    }

    /** Standard food seeding (used by levels 1-4). */
    _generateFood(buildingData) {
        for (let x = 130; x < CONFIG.worldWidth - 200; x += 350 + Math.random() * 150) {
            foods.push(createRandomFood(x, CONFIG.worldHeight - 70));
        }
        for (const fe of fireEscapes) {
            for (const p of fe.getPlatforms()) {
                if (Math.random() > 0.5)
                    foods.push(createRandomFood(p.x + 20 + Math.random() * 40, p.y - 25));
            }
        }
        for (const b of buildingData) {
            if (Math.random() > 0.4) {
                const roofY = CONFIG.worldHeight - 50 - b.height - 25;
                foods.push(createRandomFood(b.x + 30 + Math.random() * (b.width - 60), roofY));
            }
        }
    }

    /** Shared city skeleton: buildings, ground, fire-escapes, lamps, stars. */
    _buildCityBase(buildingData) {
        for (const b of buildingData) {
            platforms.push(new Platform(b.x, CONFIG.worldHeight - 50 - b.height, b.width, b.height, 'building'));
        }
        platforms.push(new Platform(0, CONFIG.worldHeight - 50, CONFIG.worldWidth, 100, 'ground'));

        for (let i = 0; i < buildingData.length; i++) {
            const b = buildingData[i];
            if (b.height > 300 && Math.random() > 0.3) {
                const floors = Math.floor(b.height / 85);
                const feX = b.x + b.width - 100;
                const fe = new FireEscapeStructure(feX, CONFIG.worldHeight - 50, b.height, Math.min(floors, 7));
                fireEscapes.push(fe);
                for (const p of fe.getPlatforms())
                    platforms.push(new Platform(p.x, p.y, p.width, p.height, 'fire-escape'));
            }
        }

        for (let x = 100; x < CONFIG.worldWidth; x += 320 + Math.random() * 60)
            lamps.push(new Lamp(x, CONFIG.worldHeight - 150));

        for (let i = 0; i < 100; i++) stars.push(new Star());
    }
}
