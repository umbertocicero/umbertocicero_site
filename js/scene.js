/**
 * Interactive 3D showcase engine
 *
 * Pure kinematic system - NO physics engine.
 * Objects drift gently (sine waves) and rotate slowly.
 * Mouse hover pushes them via a velocity impulse that decays smoothly.
 *
 * Change SHAPE below to switch between 'spiral' and 'jack'.
 */
import * as THREE from 'https://esm.sh/three@0.153.0';
import { EffectComposer }  from 'https://esm.sh/three@0.153.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }      from 'https://esm.sh/three@0.153.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://esm.sh/three@0.153.0/examples/jsm/postprocessing/UnrealBloomPass.js';

/* --- Shape modules ------------------------------------------------- */
import * as JackShape   from './jack.js';
import * as SpiralShape from './spiral.js';

/* =================================================================
   SHAPE SELECTOR  -  change this to 'jack' or 'spiral'
   ================================================================= */
const SHAPE = 'spiral';

/* --- Resolve active shape ------------------------------------------ */
const shapeModule = SHAPE === 'jack' ? JackShape : SpiralShape;

/* --- State --------------------------------------------------------- */
let scene, camera, renderer, composer;
let container;
let objects = [];
let mouseWorld = new THREE.Vector3(9999, 9999, 9999);
let raycaster  = new THREE.Raycaster();
let pointer    = new THREE.Vector2(9999, 9999);
let mousePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const clock = new THREE.Clock();
let elapsed = 0;
let mouseActive = false;

/* --- Config -------------------------------------------------------- */
const OBJ_COUNT     = 17;
const PUSH_RADIUS   = 4.0;
const PUSH_STRENGTH = 3.0;
const DAMPING       = 0.965;
const BOUNDS        = { x: 8.0, y: 5.0, z: 2.8 };
const COLLISION_R   = shapeModule.COLLISION_R;
const COLLISION_K   = 5.0;
const GRAVITY_K     = 0.015;

/* =================================================================
   MATERIALS
   ================================================================= */
function createMaterials() {
    return [
        // White matte
        new THREE.MeshPhysicalMaterial({
            color: 0xd8d8d8, metalness: 0.0, roughness: 0.65, clearcoat: 0.0,
        }),
        // White glossy
        new THREE.MeshPhysicalMaterial({
            color: 0xf0f0f0, metalness: 0.05, roughness: 0.05,
            clearcoat: 1.0, clearcoatRoughness: 0.04,
        }),
        // Blue matte
        new THREE.MeshPhysicalMaterial({
            color: 0x2020e0, metalness: 0.0, roughness: 0.55, clearcoat: 0.0,
        }),
        // Blue glossy
        new THREE.MeshPhysicalMaterial({
            color: 0x1818ff, metalness: 0.05, roughness: 0.04,
            clearcoat: 1.0, clearcoatRoughness: 0.02,
        }),
        // Black matte
        new THREE.MeshPhysicalMaterial({
            color: 0x0e0e0e, metalness: 0.0, roughness: 0.7, clearcoat: 0.0,
        }),
        // Black semi-glossy
        new THREE.MeshPhysicalMaterial({
            color: 0x141414, metalness: 0.05, roughness: 0.25,
            clearcoat: 0.5, clearcoatRoughness: 0.15,
        }),
    ];
}

/* =================================================================
   MOUSE
   ================================================================= */
function updateMouseWorld(e) {
    if (!container) return;
    const rect = container.getBoundingClientRect();
    pointer.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    pointer.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    raycaster.ray.intersectPlane(mousePlane, mouseWorld);
}

/* =================================================================
   INIT
   ================================================================= */
function init() {
    container = document.getElementById('webgl-container');
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    /* -- Three.js --------------------------------------------------- */
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1e1e28);

    camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
    camera.position.set(0, 0, 9.5);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    /* -- Environment map -------------------------------------------- */
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x1a1a24);
    const envL1 = new THREE.DirectionalLight(0xffffff, 4);
    envL1.position.set(5, 5, 5);   envScene.add(envL1);
    const envL2 = new THREE.DirectionalLight(0x4466ff, 2);
    envL2.position.set(-4, -2, 3); envScene.add(envL2);
    const envL3 = new THREE.DirectionalLight(0xffeedd, 1.5);
    envL3.position.set(-3, 4, -4); envScene.add(envL3);
    envScene.add(new THREE.AmbientLight(0x555566, 1.5));
    const envMap = pmrem.fromScene(envScene, 0, 0.1, 100).texture;
    scene.environment = envMap;
    pmrem.dispose();

    /* -- Lighting --------------------------------------------------- */
    scene.add(new THREE.AmbientLight(0x8888aa, 0.8));
    scene.add(new THREE.HemisphereLight(0xc8c8e0, 0x444466, 0.7));

    const keyLight = new THREE.DirectionalLight(0xfff8f0, 2.5);
    keyLight.position.set(8, 6, 5);   scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8899cc, 1.2);
    fillLight.position.set(-6, -2, 4); scene.add(fillLight);

    const fill2 = new THREE.DirectionalLight(0x7788bb, 0.6);
    fill2.position.set(4, -4, 3);      scene.add(fill2);

    const rimLight = new THREE.DirectionalLight(0x6677aa, 0.8);
    rimLight.position.set(0, 3, -6);   scene.add(rimLight);

    /* -- Create objects ---------------------------------------------- */
    const materials = createMaterials();

    for (let i = 0; i < OBJ_COUNT; i++) {
        const mat  = materials[Math.floor(Math.random() * materials.length)];
        const mesh = shapeModule.createMesh(THREE, mat);

        const pad = 0.6;
        const px = (Math.random() - 0.5) * (BOUNDS.x - pad) * 2;
        const py = (Math.random() - 0.5) * (BOUNDS.y - pad) * 2;
        const pz = (Math.random() - 0.5) * (BOUNDS.z - pad) * 2;

        mesh.position.set(px, py, pz);
        mesh.quaternion.setFromEuler(new THREE.Euler(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        ));
        scene.add(mesh);

        objects.push({
            mesh,
            homeX: px, homeY: py, homeZ: pz,
            vx: 0, vy: 0, vz: 0,
            dxFreq:  0.06 + Math.random() * 0.08,
            dyFreq:  0.05 + Math.random() * 0.07,
            dzFreq:  0.04 + Math.random() * 0.05,
            dxPhase: Math.random() * Math.PI * 2,
            dyPhase: Math.random() * Math.PI * 2,
            dzPhase: Math.random() * Math.PI * 2,
            dxAmp:   0.06 + Math.random() * 0.1,
            dyAmp:   0.05 + Math.random() * 0.08,
            dzAmp:   0.02 + Math.random() * 0.04,
            spinSpeedX: (Math.random() - 0.5) * 0.06,
            spinSpeedY: (Math.random() - 0.5) * 0.05,
            spinSpeedZ: (Math.random() - 0.5) * 0.04,
            spinVx: 0, spinVy: 0, spinVz: 0,
        });
    }

    /* -- Post-processing -------------------------------------------- */
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(
        new THREE.Vector2(w, h), 0.2, 0.4, 0.88
    ));

    /* -- Events ----------------------------------------------------- */
    container.addEventListener('pointermove',  onPointerMove);
    container.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('resize', onResize);

    animate();
}

/* --- Events -------------------------------------------------------- */
function onPointerMove(e) { mouseActive = true;  updateMouseWorld(e); }
function onPointerLeave()  {
    mouseActive = false;
    pointer.set(9999, 9999);
    mouseWorld.set(9999, 9999, 9999);
}

/* =================================================================
   ANIMATION LOOP
   ================================================================= */
const _dq    = new THREE.Quaternion();
const _euler = new THREE.Euler();

function animate() {
    requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 1 / 30);
    elapsed += dt;

    for (let i = 0; i < objects.length; i++) {
        const j = objects[i];
        const m = j.mesh;

        /* -- Mouse push --------------------------------------------- */
        if (mouseActive) {
            const dx = m.position.x - mouseWorld.x;
            const dy = m.position.y - mouseWorld.y;
            const dz = m.position.z - mouseWorld.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < PUSH_RADIUS && dist > 0.01) {
                const strength = PUSH_STRENGTH * Math.pow(1 - dist / PUSH_RADIUS, 2);
                const inv = strength / dist;
                j.vx += dx * inv;
                j.vy += dy * inv;
                j.vz += dz * inv * 0.3;
                j.spinVx += (dy * inv) * 1.5;
                j.spinVy += (-dx * inv) * 1.5;
                j.spinVz += (dx * inv - dy * inv) * 0.8;
            }
        }

        /* -- Inter-object repulsion --------------------------------- */
        for (let k = i + 1; k < objects.length; k++) {
            const o  = objects[k];
            const dx = m.position.x - o.mesh.position.x;
            const dy = m.position.y - o.mesh.position.y;
            const dz = m.position.z - o.mesh.position.z;
            const dist2 = dx * dx + dy * dy + dz * dz;
            if (dist2 < COLLISION_R * COLLISION_R && dist2 > 0.001) {
                const dist = Math.sqrt(dist2);
                const overlap = COLLISION_R - dist;
                const force = overlap * COLLISION_K;
                const nx = dx / dist, ny = dy / dist, nz = dz / dist;
                j.vx += nx * force * 0.5;  j.vy += ny * force * 0.5;  j.vz += nz * force * 0.5;
                o.vx -= nx * force * 0.5;  o.vy -= ny * force * 0.5;  o.vz -= nz * force * 0.5;
            }
        }

        /* -- Central gravity ---------------------------------------- */
        j.vx -= j.homeX * GRAVITY_K;
        j.vy -= j.homeY * GRAVITY_K;
        j.vz -= j.homeZ * GRAVITY_K;

        /* -- Damping ------------------------------------------------ */
        j.vx *= DAMPING;  j.vy *= DAMPING;  j.vz *= DAMPING;
        j.spinVx *= DAMPING;  j.spinVy *= DAMPING;  j.spinVz *= DAMPING;

        if (j.vx * j.vx + j.vy * j.vy + j.vz * j.vz < 0.00001)
            j.vx = j.vy = j.vz = 0;
        if (j.spinVx * j.spinVx + j.spinVy * j.spinVy + j.spinVz * j.spinVz < 0.000001)
            j.spinVx = j.spinVy = j.spinVz = 0;

        /* -- Update home -------------------------------------------- */
        j.homeX += j.vx * dt;
        j.homeY += j.vy * dt;
        j.homeZ += j.vz * dt;

        /* -- Soft boundary ------------------------------------------ */
        const bx = BOUNDS.x - 0.5, by = BOUNDS.y - 0.5, bz = BOUNDS.z - 0.5;
        if (j.homeX >  bx) { j.homeX =  bx; j.vx = -Math.abs(j.vx) * 0.3; }
        if (j.homeX < -bx) { j.homeX = -bx; j.vx =  Math.abs(j.vx) * 0.3; }
        if (j.homeY >  by) { j.homeY =  by; j.vy = -Math.abs(j.vy) * 0.3; }
        if (j.homeY < -by) { j.homeY = -by; j.vy =  Math.abs(j.vy) * 0.3; }
        if (j.homeZ >  bz) { j.homeZ =  bz; j.vz = -Math.abs(j.vz) * 0.3; }
        if (j.homeZ < -bz) { j.homeZ = -bz; j.vz =  Math.abs(j.vz) * 0.3; }

        /* -- Final position ----------------------------------------- */
        m.position.set(
            j.homeX + Math.sin(elapsed * j.dxFreq + j.dxPhase) * j.dxAmp,
            j.homeY + Math.sin(elapsed * j.dyFreq + j.dyPhase) * j.dyAmp,
            j.homeZ + Math.sin(elapsed * j.dzFreq + j.dzPhase) * j.dzAmp
        );

        /* -- Rotation ----------------------------------------------- */
        _euler.set(
            (j.spinSpeedX + j.spinVx) * dt,
            (j.spinSpeedY + j.spinVy) * dt,
            (j.spinSpeedZ + j.spinVz) * dt
        );
        _dq.setFromEuler(_euler);
        m.quaternion.multiply(_dq);
        m.quaternion.normalize();
    }

    composer.render();
}

/* --- Resize -------------------------------------------------------- */
function onResize() {
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
}

/* --- Boot ---------------------------------------------------------- */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
