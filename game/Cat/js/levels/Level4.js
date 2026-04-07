// ============================================
// LEVEL 4 — La Fuga
// ============================================

class Level4 extends BaseLevel {
    constructor() {
        super();
        this.theme = {
            name: 'La Fuga',
            skyTop: '#050208',
            skyMid: '#0a0510',
            skyBot: '#0e0815',
            buildingBase: '#0c0a14',
            buildingLight: '#100e18',
            groundColor: '#0a080e',
            lampColor: { r: 180, g: 140, b: 120 },
            lampIntensity: 0.5,
            moonColor: '#cc6644',
            starAlpha: 0.1,
            enemyCount: 10,
            enemySpeed: 3,
            enemyChaseSpeed: 4.5,
            fogAlpha: 0.12,
            rain: true,
            pudbleFriction: 0.94
        };
    }

    generateCity() {
        const buildingData = this._generateBuildingData(4);
        this._buildCityBase(buildingData);

        // Dumpsters
        const spacing = Math.max(250, 450 - 4 * 40);
        for (let x = 100; x < CONFIG.worldWidth - 200; x += spacing + Math.random() * 100) {
            platforms.push(new Platform(x, CONFIG.worldHeight - 100, 80, 50, 'dumpster'));
        }

        // Rain
        for (let i = 0; i < 350; i++) raindrops.push(new Raindrop());

        // Puddles
        for (let x = 150; x < CONFIG.worldWidth - 200; x += 200 + Math.random() * 250) {
            const pw = 60 + Math.random() * 80;
            const ph = 6  + Math.random() * 4;
            platforms.push(new Platform(x, CONFIG.worldHeight - 50 - ph + 2, pw, ph, 'puddle'));
        }

        for (let i = 0; i < 30; i++) particles.push(new Particle());

        this._generateFood(buildingData);
        this._generateEnemies(buildingData);

        // Rival cat (spawns from far right)
        const rc = new RivalCat(CONFIG.worldWidth - 200, CONFIG.worldHeight - 90);
        rivalCat = rc;

        return buildingData;
    }

    getElements() {
        return [{ name: 'rivalCat', value: rivalCat }];
    }

    updateExtras(state) {
        const { cat, ghosts, CatAudio } = state;
        let result = {};

        // Rain splashes every 2 frames
        if (CONFIG.time % 2 === 0) {
            const splX = CONFIG.cameraX + Math.random() * CONFIG.canvasWidth;
            rainSplashes.push(new RainSplash(splX, CONFIG.worldHeight - 50));
        }
        for (let i = rainSplashes.length - 1; i >= 0; i--) {
            rainSplashes[i].update();
            if (rainSplashes[i].life <= 0) rainSplashes.splice(i, 1);
        }

        // Rival update
        if (rivalCat) rivalCat.update(cat, platforms);

        return result;
    }

    drawExtras(ctx) {
        for (const rd of raindrops) rd.draw(ctx);
        for (const rs of rainSplashes) rs.draw(ctx);
        if (rivalCat) rivalCat.draw(ctx);
    }

    // Wet ground sheen overlay
    drawPlatformExtras(ctx, platform) {
        if (platform.type !== 'ground') return;
        // Sheen on wet asphalt
        ctx.fillStyle = 'rgba(80, 100, 140, 0.06)';
        ctx.fillRect(platform.x, platform.y, platform.width, 12);
        for (let i = 30; i < platform.width; i += 60 + Math.sin(i * 0.2) * 30) {
            const rw = 20 + Math.sin(i * 0.5) * 10;
            const shimmer = Math.sin(CONFIG.time * 0.03 + i * 0.1) * 0.04 + 0.04;
            ctx.fillStyle = `rgba(120, 140, 180, ${shimmer})`;
            ctx.beginPath();
            ctx.ellipse(platform.x + i, platform.y + 3, rw, 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
