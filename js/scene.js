/**
 * Interactive 3D showcase — Floating jack/cross objects
 *
 * Pure kinematic system — NO physics engine.
 * Each jack drifts gently (sine waves) and rotates slowly.
 * Mouse hover pushes them via a velocity impulse that decays smoothly.
 * Soft boundary keeps everything inside the container.
 * Zero jitter, zero scatti, perfectly smooth.
 */
import * as THREE from 'https://esm.sh/three@0.153.0';
import { EffectComposer } from 'https://esm.sh/three@0.153.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://esm.sh/three@0.153.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://esm.sh/three@0.153.0/examples/jsm/postprocessing/UnrealBloomPass.js';

/* ─── State ────────────────────────────────────────────────────────── */
let scene, camera, renderer, composer;
let container;
let jacks = [];
let mouseWorld = new THREE.Vector3(9999, 9999, 9999);
let raycaster = new THREE.Raycaster();
let pointer = new THREE.Vector2(9999, 9999);
let mousePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const clock = new THREE.Clock();
let elapsed = 0;
let mouseActive = false;

/* ─── Config ───────────────────────────────────────────────────────── */
const JACK_COUNT   = 30;
const ARM_LEN      = 1.4;
const ARM_RADIUS   = 0.20;
const SEGS         = 32;
const PUSH_RADIUS  = 2.8;
const PUSH_STRENGTH = 2.5;
const DAMPING      = 0.965;
const BOUNDS       = { x: 4.8, y: 3.0, z: 1.8 };
const COLLISION_R  = 1.2;     // repulsion radius between jacks
const COLLISION_K  = 3.0;     // repulsion strength
const GRAVITY_K    = 0.01;    // central gravity pull strength

/* ═══════════════════════════════════════════════════════════════════════
   GEOMETRY — capsule arms + smooth center fillet
   ═════════════════════════════════════════════════════════════════════ */
function createArmGeometry() {
    // Simple capsule: cylinder with hemispherical ends
    const geo = new THREE.CapsuleGeometry(ARM_RADIUS, ARM_LEN, 8, SEGS);
    geo.computeVertexNormals();
    return geo;
}

let _armGeo = null;
function getArmGeo() {
    if (!_armGeo) _armGeo = createArmGeometry();
    return _armGeo;
}

function createJackMesh(material) {
    const g = new THREE.Group();
    const geo = getArmGeo();

    // Y arm (capsule default axis)
    g.add(new THREE.Mesh(geo, material));

    // X arm
    const mx = new THREE.Mesh(geo, material);
    mx.rotation.z = Math.PI / 2;
    g.add(mx);

    // Z arm
    const mz = new THREE.Mesh(geo, material);
    mz.rotation.x = Math.PI / 2;
    g.add(mz);

    // Center fillet — sphere just big enough to smooth the junction
    g.add(new THREE.Mesh(
        new THREE.SphereGeometry(ARM_RADIUS * 1.12, SEGS, SEGS / 2),
        material
    ));

    return g;
}

/* ═══════════════════════════════════════════════════════════════════════
   MATERIALS
   ═════════════════════════════════════════════════════════════════════ */
function createMaterials() {
    return [
        // White matte
        new THREE.MeshPhysicalMaterial({
            color: 0xd8d8d8, metalness: 0.0, roughness: 0.65,
            clearcoat: 0.0,
        }),
        // White glossy / specular
        new THREE.MeshPhysicalMaterial({
            color: 0xf0f0f0, metalness: 0.05, roughness: 0.05,
            clearcoat: 1.0, clearcoatRoughness: 0.04,
        }),
        // Blue matte
        new THREE.MeshPhysicalMaterial({
            color: 0x2020e0, metalness: 0.0, roughness: 0.55,
            clearcoat: 0.0,
        }),
        // Blue glossy / mirror-like
        new THREE.MeshPhysicalMaterial({
            color: 0x1818ff, metalness: 0.05, roughness: 0.04,
            clearcoat: 1.0, clearcoatRoughness: 0.02,
        }),
        // Black matte
        new THREE.MeshPhysicalMaterial({
            color: 0x0e0e0e, metalness: 0.0, roughness: 0.7,
            clearcoat: 0.0,
        }),
        // Black semi-glossy
        new THREE.MeshPhysicalMaterial({
            color: 0x141414, metalness: 0.05, roughness: 0.25,
            clearcoat: 0.5, clearcoatRoughness: 0.15,
        }),
    ];
}

/* ═══════════════════════════════════════════════════════════════════════
   MOUSE
   ═════════════════════════════════════════════════════════════════════ */
function updateMouseWorld(e) {
    if (!container) return;
    const rect = container.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    raycaster.ray.intersectPlane(mousePlane, mouseWorld);
}

/* ═══════════════════════════════════════════════════════════════════════
   INIT
   ═════════════════════════════════════════════════════════════════════ */
function init() {
    container = document.getElementById('webgl-container');
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    /* ── Three.js ───────────────────────────────────────────────────── */
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

    /* ── Environment map for reflections ────────────────────────────── */
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x1a1a24);
    // Simulate a soft studio lighting environment
    const envLight1 = new THREE.DirectionalLight(0xffffff, 3);
    envLight1.position.set(5, 5, 5);
    envScene.add(envLight1);
    const envLight2 = new THREE.DirectionalLight(0x4466ff, 1);
    envLight2.position.set(-4, -2, 3);
    envScene.add(envLight2);
    envScene.add(new THREE.AmbientLight(0x333344, 0.5));
    const envMap = pmrem.fromScene(envScene, 0, 0.1, 100).texture;
    scene.environment = envMap;
    pmrem.dispose();

    /* ── Lighting — strong key from top-right ─────────────────────── */
    scene.add(new THREE.AmbientLight(0x555566, 0.3));

    // Key light — strong, warm-white from top-right
    const keyLight = new THREE.DirectionalLight(0xfff8f0, 3.0);
    keyLight.position.set(8, 6, 5);
    scene.add(keyLight);

    // Subtle cool fill from left
    const fillLight = new THREE.DirectionalLight(0x6680cc, 0.4);
    fillLight.position.set(-6, -2, 4);
    scene.add(fillLight);

    // Rim light from behind
    const rimLight = new THREE.DirectionalLight(0x445588, 0.5);
    rimLight.position.set(0, 3, -6);
    scene.add(rimLight);

    /* ── Create jacks ───────────────────────────────────────────────── */
    const materials = createMaterials();

    for (let i = 0; i < JACK_COUNT; i++) {
        const mat = materials[Math.floor(Math.random() * materials.length)];
        const mesh = createJackMesh(mat);

        const pad = 0.6;
        const px = (Math.random() - 0.5) * (BOUNDS.x - pad) * 2;
        const py = (Math.random() - 0.5) * (BOUNDS.y - pad) * 2;
        const pz = (Math.random() - 0.5) * (BOUNDS.z - pad) * 2;

        const euler = new THREE.Euler(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );

        mesh.position.set(px, py, pz);
        mesh.quaternion.setFromEuler(euler);
        scene.add(mesh);

        jacks.push({
            mesh,
            // Position
            homeX: px, homeY: py, homeZ: pz,
            vx: 0, vy: 0, vz: 0,
            // Drift (sine-wave float)
            dxFreq: 0.06 + Math.random() * 0.08,
            dyFreq: 0.05 + Math.random() * 0.07,
            dzFreq: 0.04 + Math.random() * 0.05,
            dxPhase: Math.random() * Math.PI * 2,
            dyPhase: Math.random() * Math.PI * 2,
            dzPhase: Math.random() * Math.PI * 2,
            dxAmp: 0.06 + Math.random() * 0.1,
            dyAmp: 0.05 + Math.random() * 0.08,
            dzAmp: 0.02 + Math.random() * 0.04,
            // Rotation (incremental quaternion)
            spinSpeedX: (Math.random() - 0.5) * 0.06,
            spinSpeedY: (Math.random() - 0.5) * 0.05,
            spinSpeedZ: (Math.random() - 0.5) * 0.04,
            // Push-induced angular velocity (decays)
            spinVx: 0, spinVy: 0, spinVz: 0,
        });
    }

    /* ── Post-processing ────────────────────────────────────────────── */
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(
        new THREE.Vector2(w, h), 0.2, 0.4, 0.88
    ));

    /* ── Events ─────────────────────────────────────────────────────── */
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('resize', onResize);

    animate();
}

/* ─── Events ───────────────────────────────────────────────────────── */
function onPointerMove(e) {
    mouseActive = true;
    updateMouseWorld(e);
}
function onPointerLeave() {
    mouseActive = false;
    pointer.set(9999, 9999);
    mouseWorld.set(9999, 9999, 9999);
}

/* ─── Animation loop ───────────────────────────────────────────────── */
const _dq = new THREE.Quaternion();
const _euler = new THREE.Euler();

function animate() {
    requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 1 / 30);
    elapsed += dt;

    for (let i = 0; i < jacks.length; i++) {
        const j = jacks[i];
        const m = j.mesh;

        /* ── Mouse push ─────────────────────────────────────────────── */
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
                // Torque from push (cross product of direction × up/side)
                j.spinVx += (dy * inv) * 1.5;
                j.spinVy += (-dx * inv) * 1.5;
                j.spinVz += (dx * inv - dy * inv) * 0.8;
            }
        }

        /* ── Inter-jack repulsion (solid bodies) ────────────────────── */
        for (let k = i + 1; k < jacks.length; k++) {
            const o = jacks[k];
            const ox = o.mesh.position.x;
            const oy = o.mesh.position.y;
            const oz = o.mesh.position.z;
            const dx = m.position.x - ox;
            const dy = m.position.y - oy;
            const dz = m.position.z - oz;
            const dist2 = dx * dx + dy * dy + dz * dz;
            if (dist2 < COLLISION_R * COLLISION_R && dist2 > 0.001) {
                const dist = Math.sqrt(dist2);
                const overlap = COLLISION_R - dist;
                const force = overlap * COLLISION_K;
                const nx = dx / dist;
                const ny = dy / dist;
                const nz = dz / dist;
                // Push both apart equally
                j.vx += nx * force * 0.5;
                j.vy += ny * force * 0.5;
                j.vz += nz * force * 0.5;
                o.vx -= nx * force * 0.5;
                o.vy -= ny * force * 0.5;
                o.vz -= nz * force * 0.5;
            }
        }

        /* ── Central gravity — pull toward origin ────────────────────── */
        j.vx -= j.homeX * GRAVITY_K;
        j.vy -= j.homeY * GRAVITY_K;
        j.vz -= j.homeZ * GRAVITY_K;

        /* ── Decay push velocity ────────────────────────────────────── */
        j.vx *= DAMPING;
        j.vy *= DAMPING;
        j.vz *= DAMPING;
        j.spinVx *= DAMPING;
        j.spinVy *= DAMPING;
        j.spinVz *= DAMPING;

        // Kill tiny residual
        if (j.vx * j.vx + j.vy * j.vy + j.vz * j.vz < 0.00001) {
            j.vx = 0; j.vy = 0; j.vz = 0;
        }
        if (j.spinVx * j.spinVx + j.spinVy * j.spinVy + j.spinVz * j.spinVz < 0.000001) {
            j.spinVx = 0; j.spinVy = 0; j.spinVz = 0;
        }

        /* ── Update home from push velocity ─────────────────────────── */
        j.homeX += j.vx * dt;
        j.homeY += j.vy * dt;
        j.homeZ += j.vz * dt;

        /* ── Soft boundary ──────────────────────────────────────────── */
        const bx = BOUNDS.x - 0.5;
        const by = BOUNDS.y - 0.5;
        const bz = BOUNDS.z - 0.5;
        if (j.homeX >  bx) { j.homeX =  bx; j.vx = -Math.abs(j.vx) * 0.3; }
        if (j.homeX < -bx) { j.homeX = -bx; j.vx =  Math.abs(j.vx) * 0.3; }
        if (j.homeY >  by) { j.homeY =  by; j.vy = -Math.abs(j.vy) * 0.3; }
        if (j.homeY < -by) { j.homeY = -by; j.vy =  Math.abs(j.vy) * 0.3; }
        if (j.homeZ >  bz) { j.homeZ =  bz; j.vz = -Math.abs(j.vz) * 0.3; }
        if (j.homeZ < -bz) { j.homeZ = -bz; j.vz =  Math.abs(j.vz) * 0.3; }

        /* ── Final position = home + sine drift ─────────────────────── */
        m.position.set(
            j.homeX + Math.sin(elapsed * j.dxFreq + j.dxPhase) * j.dxAmp,
            j.homeY + Math.sin(elapsed * j.dyFreq + j.dyPhase) * j.dyAmp,
            j.homeZ + Math.sin(elapsed * j.dzFreq + j.dzPhase) * j.dzAmp
        );

        /* ── Rotation: ambient tumble + push spin ───────────────────── */
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

/* ─── Resize ───────────────────────────────────────────────────────── */
function onResize() {
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
}

/* ─── Boot ─────────────────────────────────────────────────────────── */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
