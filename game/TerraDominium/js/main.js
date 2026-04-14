/* ═══════════════════════════════════════════════════════
   GeoDominion — Main Entry Point  (v2)
   Animated intro + init
   ═══════════════════════════════════════════════════════ */

(function() {
    'use strict';

    /* ════════════════ INTRO GLOBE ANIMATION ════════════════ */
    function initIntro() {
        const bg = document.getElementById('intro-bg');
        if (!bg) return;
        const canvas = document.createElement('canvas');
        bg.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        function resize() {
            canvas.width  = bg.clientWidth;
            canvas.height = bg.clientHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        /* Wireframe globe */
        const cx = () => canvas.width / 2;
        const cy = () => canvas.height / 2;
        const radius = () => Math.min(canvas.width, canvas.height) * 0.28;

        let rotation = 0;

        /* Stars */
        const stars = [];
        for (let i = 0; i < 200; i++) {
            stars.push({
                x: Math.random(),
                y: Math.random(),
                s: 0.5 + Math.random() * 1.5,
                a: Math.random()
            });
        }

        function drawFrame() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            /* Stars */
            stars.forEach(st => {
                st.a += (Math.random() - 0.5) * 0.02;
                st.a = Math.max(0.1, Math.min(1, st.a));
                ctx.globalAlpha = st.a * 0.6;
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(st.x * canvas.width, st.y * canvas.height, st.s, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.globalAlpha = 1;
            const r = radius();
            const cxv = cx();
            const cyv = cy();

            /* Longitude lines */
            ctx.strokeStyle = 'rgba(0,229,255,0.15)';
            ctx.lineWidth = 1;
            for (let lon = 0; lon < Math.PI * 2; lon += Math.PI / 8) {
                ctx.beginPath();
                for (let lat = -Math.PI / 2; lat <= Math.PI / 2; lat += 0.05) {
                    const x3d = Math.cos(lat) * Math.cos(lon + rotation);
                    const y3d = Math.sin(lat);
                    const z3d = Math.cos(lat) * Math.sin(lon + rotation);
                    if (z3d < 0) continue;
                    const px = cxv + x3d * r;
                    const py = cyv - y3d * r;
                    ctx.lineTo(px, py);
                }
                ctx.stroke();
            }

            /* Latitude lines */
            for (let lat = -Math.PI / 2; lat <= Math.PI / 2; lat += Math.PI / 6) {
                ctx.beginPath();
                for (let lon = 0; lon <= Math.PI * 2; lon += 0.05) {
                    const x3d = Math.cos(lat) * Math.cos(lon + rotation);
                    const y3d = Math.sin(lat);
                    const z3d = Math.cos(lat) * Math.sin(lon + rotation);
                    if (z3d < 0) continue;
                    const px = cxv + x3d * r;
                    const py = cyv - y3d * r;
                    ctx.lineTo(px, py);
                }
                ctx.stroke();
            }

            /* Globe outline */
            ctx.strokeStyle = 'rgba(0,229,255,0.3)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cxv, cyv, r, 0, Math.PI * 2);
            ctx.stroke();

            /* Glow */
            const grad = ctx.createRadialGradient(cxv, cyv, r * 0.8, cxv, cyv, r * 1.3);
            grad.addColorStop(0, 'rgba(0,229,255,0)');
            grad.addColorStop(1, 'rgba(0,229,255,0.05)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cxv, cyv, r * 1.3, 0, Math.PI * 2);
            ctx.fill();

            rotation += 0.005;
            requestAnimationFrame(drawFrame);
        }

        drawFrame();
    }

    /* ════════════════ BOOT ════════════════ */
    async function boot() {
        /* Start intro animation immediately */
        initIntro();

        /* Init map renderer (fetches SVG) */
        await MapRenderer.init();

        /* Init UI */
        UI.init();

        /* DevLog disabled in production — enable manually via DevLog.enable() in console */
        // if (typeof DevLog !== 'undefined') {
        //     DevLog.enable();
        // }
    }

    /* Wait for DOM */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
