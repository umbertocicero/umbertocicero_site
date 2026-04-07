// ============================================
// LEVEL 1 — Il Vicolo
// ============================================

class Level1 extends BaseLevel {
    constructor() {
        super();
        this.theme = {
            name: 'Il Vicolo',
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
            enemyCount: 5,
            enemySpeed: 2,
            enemyChaseSpeed: 3.5,
            fogAlpha: 0
        };
    }

    generateCity() {
        const buildingData = this._generateBuildingData(1);
        this._buildCityBase(buildingData);

        // Dumpsters
        const dumpsterSpacing = Math.max(250, 450 - 1 * 40);
        for (let x = 100; x < CONFIG.worldWidth - 200; x += dumpsterSpacing + Math.random() * 100) {
            platforms.push(new Platform(x, CONFIG.worldHeight - 100, 80, 50, 'dumpster'));
        }

        for (let i = 0; i < 30; i++) particles.push(new Particle());

        this._generateFood(buildingData);
        this._generateEnemies(buildingData);

        return buildingData;
    }

    // No extras: no snow, no rain, no rival, no boss
}
