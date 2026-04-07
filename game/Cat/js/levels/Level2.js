// ============================================
// LEVEL 2 — Cantiere
// ============================================

class Level2 extends BaseLevel {
    constructor() {
        super();
        this.theme = {
            name: 'Cantiere',
            skyTop: '#020210',
            skyMid: '#0a0a20',
            skyBot: '#10101a',
            buildingBase: '#10101a',
            buildingLight: '#141422',
            groundColor: '#0e0e14',
            lampColor: { r: 200, g: 160, b: 100 },
            lampIntensity: 0.7,
            moonColor: '#7777aa',
            starAlpha: 0.1,
            enemyCount: 7,
            enemySpeed: 2.5,
            enemyChaseSpeed: 4,
            fogAlpha: 0.06
        };
    }

    generateCity() {
        const buildingData = this._generateBuildingData(2);
        this._buildCityBase(buildingData);

        // Barriers instead of dumpsters
        const spacing = Math.max(250, 450 - 2 * 40);
        for (let x = 100; x < CONFIG.worldWidth - 200; x += spacing + Math.random() * 100) {
            platforms.push(new Platform(x, CONFIG.worldHeight - 95, 90, 45, 'barrier'));
        }

        // Cranes
        const craneSpacing = 600 + Math.random() * 200;
        for (let cx = 300; cx < CONFIG.worldWidth - 400; cx += craneSpacing + Math.random() * 300) {
            const craneHeight = 300 + Math.random() * 200;
            const crane = new Crane(cx, CONFIG.worldHeight - 50, craneHeight);
            cranes.push(crane);
            platforms.push(crane.getPlatform());
        }

        for (let i = 0; i < 30; i++) particles.push(new Particle());

        this._generateFood(buildingData);
        this._generateEnemies(buildingData);

        return buildingData;
    }
}
