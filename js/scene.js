import * as THREE from 'https://esm.sh/three@0.153.0';
import { EffectComposer } from 'https://esm.sh/three@0.153.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://esm.sh/three@0.153.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://esm.sh/three@0.153.0/examples/jsm/postprocessing/UnrealBloomPass.js';

let scene, camera, renderer, cube, composer;
let mouse = { x: 0.5, y: 0.5 };
let liquidPlane, liquidUniforms;

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222233);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('webgl-container').appendChild(renderer.domElement);

    // --------- Liquid Shader Plane (background) ----------
    liquidUniforms = {
        u_time: { value: 0.0 },
        u_mouse: { value: new THREE.Vector2(mouse.x, mouse.y) },
        u_res:   { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    };
    const liquidMaterial = new THREE.ShaderMaterial({
        uniforms: liquidUniforms,
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
            }
        `,
        fragmentShader: `
            varying vec2 vUv;
            uniform float u_time;
            uniform vec2 u_mouse;
            uniform vec2 u_res;

            void main() {
                // Normalized mouse
                vec2 mouseN = u_mouse / u_res;
                // Distance from current pixel to mouse (in UV)
                float d = distance(vUv, mouseN);
                // Wave effect around mouse
                float wave = 0.06 * sin(20.0 * d - u_time*2.0) / (0.08 + d*9.0);

                // Color base
                vec3 base = mix(vec3(0.11,0.14,0.22), vec3(0.15,0.20,0.28), vUv.y);
                // Highlight with mouse
                float highlight = smoothstep(0.14+wave, 0.03+wave, d);

                vec3 color = base + highlight * vec3(0.09,0.28,0.38);
                gl_FragColor = vec4(color, 0.96);
            }
        `,
        transparent: true
    });
    const liquidGeometry = new THREE.PlaneGeometry(14, 9, 64, 64);
    liquidPlane = new THREE.Mesh(liquidGeometry, liquidMaterial);
    liquidPlane.position.z = -2.7;
    scene.add(liquidPlane);

    // --------- Rotating Cube ----------
    const geometry = new THREE.BoxGeometry(2.1, 2.1, 2.1);
    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.8,
        roughness: 0.1,
    });
    cube = new THREE.Mesh(geometry, material);
    cube.position.y = 2.3; // <-- PIU' IN ALTO!

    scene.add(cube);

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const pointLight = new THREE.PointLight(0xffffff, 2.5, 100);
    pointLight.position.set(5, 8, 10);
    scene.add(pointLight);

    // Post-processing: Bloom
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.2,   // intensity
        0.7,   // radius
        0.15   // threshold
    ));

    animate();
    window.addEventListener('resize', onWindowResize, false);

    // --- Mousemove
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = window.innerHeight - e.clientY; // Y-flip per le UV
        if (liquidUniforms) {
            liquidUniforms.u_mouse.value.set(mouse.x, mouse.y);
        }
    }, false);
}

function animate(time) {
    requestAnimationFrame(animate);
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    if (liquidUniforms) {
        liquidUniforms.u_time.value = (time || 0) * 0.001;
    }

    // Parallax effetto su camera
    const scrollY = window.scrollY || window.pageYOffset;
    const docHeight = document.body.scrollHeight - window.innerHeight;
    let scrollNorm = docHeight > 0 ? scrollY / docHeight : 0;

    camera.position.z = 5 + scrollNorm * 8;
    camera.position.y = (scrollNorm - 0.5) * 3;
    camera.lookAt(cube.position);

    composer.render();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    if (liquidUniforms)
        liquidUniforms.u_res.value.set(window.innerWidth, window.innerHeight);
}

window.onload = function() {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(init, 1);
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
};
