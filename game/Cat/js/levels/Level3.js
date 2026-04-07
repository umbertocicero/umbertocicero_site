// ============================================
// LEVEL 3 — Inverno
// ============================================

class Level3 extends BaseLevel {
    constructor() {
        super();
        this.theme = {
            name: 'Inverno',
            skyTop: '#050810',
            skyMid: '#0a1018',
            skyBot: '#101822',
            buildingBase: '#121820',
            buildingLight: '#161c28',
            groundColor: '#0e1218',
            lampColor: { r: 180, g: 200, b: 240 },
            lampIntensity: 0.7,
            moonColor: '#ccddee',
            starAlpha: 0.2,
            enemyCount: 9,
            enemySpeed: 2.5,
            enemyChaseSpeed: 4,
            fogAlpha: 0.05,
            snow: true,
            iceFriction: 0.95
        };
    }

    generateCity() {
        const buildingData = this._generateBuildingData(3);
        this._buildCityBase(buildingData);

        // Steam vents
        const spacing = Math.max(250, 450 - 3 * 40);
        for (let x = 100; x < CONFIG.worldWidth - 200; x += spacing + Math.random() * 100) {
            platforms.push(new Platform(x, CONFIG.worldHeight - 110, 40, 60, 'steam-vent'));
            for (let s = 0; s < 5; s++)
                steamParticles.push(new SteamParticle(x + 20, CONFIG.worldHeight - 115));
        }

        // Snowflakes + particles
        for (let i = 0; i < 200; i++) snowflakes.push(new Snowflake());
        for (let i = 0; i < 10; i++)  particles.push(new Particle());

        this._generateFood(buildingData);
        this._generateEnemies(buildingData);

        return buildingData;
    }

    // Snow-layer overlay delegated to drawPlatformExtras (see platform.js)
    drawPlatformExtras(ctx, platform) {
        if (platform.type === 'building') {
            platform.drawSnowLayer(ctx, platform.x - 2, platform.y - 10, platform.width + 4, 10);
            // Icicles under cornice
            ctx.fillStyle = '#bcc5d8';
            for (let ix = platform.x + 8; ix < platform.x + platform.width - 8; ix += 12 + Math.sin(ix) * 5) {
                const h = 6 + Math.sin(ix * 0.3) * 4;
                ctx.beginPath();
                ctx.moveTo(ix,     platform.y - 3);
                ctx.lineTo(ix + 2, platform.y - 3);
                ctx.lineTo(ix + 1, platform.y - 3 + h);
                ctx.closePath();
                ctx.fill();
            }
        }
        if (platform.type === 'ground') {
            platform.drawSnowLayer(ctx, platform.x, platform.y - 3, platform.width, 8);
            // Snow mounds
            ctx.fillStyle = '#ccd2e0';
            for (let i = 80; i < platform.width; i += 200 + Math.sin(i) * 50) {
                const mw = 30 + Math.sin(i * 0.5) * 15;
                const mh = 6  + Math.sin(i * 0.3) * 3;
                ctx.beginPath();
                ctx.ellipse(platform.x + i, platform.y - 1, mw, mh, 0, Math.PI, 0);
                ctx.fill();
            }
        }
    }
}
