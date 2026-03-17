/**
 * Interactive 3D showcase — contained in .hero-3d-card
 * Renders a rotating cube with bloom inside a rounded dark container.
 * Users can drag to rotate the object.
 */
import * as THREE from 'https://esm.sh/three@0.153.0';
import { EffectComposer } from 'https://esm.sh/three@0.153.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://esm.sh/three@0.153.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://esm.sh/three@0.153.0/examples/jsm/postprocessing/UnrealBloomPass.js';

let scene, camera, renderer, cube, composer;
let container;
let isDragging = false;
let prevMouse = { x: 0, y: 0 };
let targetRotation = { x: 0.4, y: 0.6 };
let currentRotation = { x: 0.4, y: 0.6 };
let autoRotate = true;

function init() {
    container = document.getElementById('webgl-container');
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111118);

    // Camera
    camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    camera.position.set(0, 0, 5);

    // Renderer — contained, not full screen
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // Cube
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.85,
        roughness: 0.08,
    });
    cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // Lights
    scene.add(new THREE.AmbientLight(0x8888cc, 0.4));

    const key = new THREE.PointLight(0xffffff, 2, 50);
    key.position.set(5, 5, 5);
    scene.add(key);

    const fill = new THREE.PointLight(0x4444ff, 0.8, 50);
    fill.position.set(-4, -2, 3);
    scene.add(fill);

    const rim = new THREE.PointLight(0x6666ff, 1.2, 50);
    rim.position.set(0, 3, -5);
    scene.add(rim);

    // Post-processing: subtle bloom
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(
        new THREE.Vector2(w, h),
        0.4,   // intensity
        0.6,   // radius
        0.75   // threshold
    ));

    // Interaction: drag to rotate
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointerleave', onPointerUp);

    window.addEventListener('resize', onResize);

    animate();
}

function onPointerDown(e) {
    isDragging = true;
    autoRotate = false;
    prevMouse.x = e.clientX;
    prevMouse.y = e.clientY;
    container.style.cursor = 'grabbing';
}

function onPointerMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - prevMouse.x;
    const dy = e.clientY - prevMouse.y;
    targetRotation.y += dx * 0.008;
    targetRotation.x += dy * 0.008;
    prevMouse.x = e.clientX;
    prevMouse.y = e.clientY;
}

function onPointerUp() {
    isDragging = false;
    container.style.cursor = 'grab';
    // Resume auto-rotate after 2s of no interaction
    setTimeout(function() { if (!isDragging) autoRotate = true; }, 2000);
}

function animate() {
    requestAnimationFrame(animate);

    // Auto-rotate when not dragging
    if (autoRotate) {
        targetRotation.y += 0.005;
        targetRotation.x += 0.002;
    }

    // Smooth interpolation
    currentRotation.x += (targetRotation.x - currentRotation.x) * 0.08;
    currentRotation.y += (targetRotation.y - currentRotation.y) * 0.08;

    cube.rotation.x = currentRotation.x;
    cube.rotation.y = currentRotation.y;

    composer.render();
}

function onResize() {
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
}

// Boot
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
