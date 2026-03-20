/**
 * Contact Section — Lusion-inspired 3D scene
 *
 * Features:
 * - 3D astronaut (built from primitives) waving hand
 * - Floating sticker emojis that rotate slowly and drift upward
 * - Refractive/reflective diamond gems with light sparkles
 * - Dark background with sparkle stars
 * - All rendered on a <canvas> inside #contact-scene
 */
import * as THREE from 'https://esm.sh/three@0.153.0';
import { EffectComposer }  from 'https://esm.sh/three@0.153.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }      from 'https://esm.sh/three@0.153.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://esm.sh/three@0.153.0/examples/jsm/postprocessing/UnrealBloomPass.js';

/* ================================================================
   CONFIG
   ================================================================ */
const STICKER_COUNT  = 18;
const DIAMOND_COUNT  = 12;
const STAR_COUNT     = 120;

/* ── Physics config (Lusion-style) ── */
const GRAVITY        = -4.5;       // downward pull (world units / s²)
const DAMPING        = 0.97;       // velocity damping per frame (0–1)
const MOUSE_RADIUS   = 3.0;       // repulsion influence radius (world units)
const MOUSE_STRENGTH = 28;        // repulsion impulse strength
const BOUNCE         = 0.55;       // velocity retained on boundary bounce
const FLOOR_Y        = -5.5;      // bottom boundary
const CEIL_Y         =  7.0;      // top boundary
const WALL_X         = 10.0;      // left/right boundary (±)

/* ================================================================
   STATE
   ================================================================ */
let scene, camera, renderer, composer;
let container;
let clock = new THREE.Clock();
let stickers = [];
let diamonds = [];
let astronaut;
let mouseX = 0, mouseY = 0;
let mouse3D = new THREE.Vector3(0, -100, 0); // mouse projected into world space
let raycaster = new THREE.Raycaster();
let mousePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // XY plane at z=0
let mouseNDC = new THREE.Vector2(-10, -10);
let animFrame;

/* Sticker emoji textures — drawn on canvas */
const EMOJIS = ['😀','🚀','💎','❤️','🎮','⭐','🔥','🎯','💡','🎨','🏆','👾','🌟','🍕','🎵','😎','🤖','🌈'];

/* ================================================================
   INIT
   ================================================================ */
function init() {
  container = document.getElementById('contact-scene');
  if (!container) return;

  const w = container.clientWidth;
  const h = container.clientHeight;

  /* Scene */
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x08080f);
  scene.fog = new THREE.FogExp2(0x08080f, 0.035);

  /* Camera */
  camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
  camera.position.set(0, 0.5, 12);

  /* Renderer */
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  /* Post-processing — bloom for sparkles */
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.8, 0.4, 0.85);
  composer.addPass(bloom);

  /* Lights */
  const amb = new THREE.AmbientLight(0x334466, 0.6);
  scene.add(amb);
  const dir = new THREE.DirectionalLight(0xffffff, 1.8);
  dir.position.set(5, 8, 10);
  scene.add(dir);
  const point1 = new THREE.PointLight(0x6666ff, 2, 30);
  point1.position.set(-6, 4, 5);
  scene.add(point1);
  const point2 = new THREE.PointLight(0xff66aa, 1.5, 30);
  point2.position.set(6, -3, 5);
  scene.add(point2);

  /* Create objects */
  createStars();
  createAstronaut();
  createStickers();
  createDiamonds();

  /* Events */
  window.addEventListener('resize', onResize);
  container.addEventListener('mousemove', onMouseMove);

  /* Start */
  animate();
}

/* ================================================================
   ASTRONAUT — built from primitives
   ================================================================ */
function createAstronaut() {
  astronaut = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xd8d8e8,
    roughness: 0.5,
    metalness: 0.15
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x222244,
    roughness: 0.05,
    metalness: 0.3,
    transmission: 0.6,
    thickness: 0.5,
    clearcoat: 1
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x333344,
    roughness: 0.6,
    metalness: 0.2
  });

  /* Helmet */
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.85, 32, 32), bodyMat);
  helmet.position.y = 2.4;
  astronaut.add(helmet);

  /* Visor */
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.65, 32, 32), glassMat);
  visor.position.set(0, 2.4, 0.35);
  visor.scale.set(0.95, 0.8, 0.6);
  astronaut.add(visor);

  /* Body (torso) */
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.65, 1.6, 16), bodyMat);
  torso.position.y = 1.15;
  astronaut.add(torso);

  /* Backpack */
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.5), darkMat);
  backpack.position.set(0, 1.2, -0.55);
  astronaut.add(backpack);

  /* Left arm (resting) */
  const leftArm = new THREE.Group();
  const leftUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.9, 8), bodyMat);
  leftUpper.position.y = -0.45;
  leftUpper.rotation.z = 0.2;
  leftArm.add(leftUpper);
  const leftLower = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.7, 8), bodyMat);
  leftLower.position.set(0.05, -0.95, 0);
  leftLower.rotation.z = 0.15;
  leftArm.add(leftLower);
  leftArm.position.set(-0.9, 1.6, 0);
  astronaut.add(leftArm);

  /* Right arm (waving) — animated */
  const rightArm = new THREE.Group();
  rightArm.name = 'rightArm';
  const rightUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.9, 8), bodyMat);
  rightUpper.position.y = -0.45;
  rightArm.add(rightUpper);
  const rightHand = new THREE.Group();
  rightHand.name = 'rightHand';
  const rightLower = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.7, 8), bodyMat);
  rightLower.position.y = -0.35;
  rightHand.add(rightLower);
  /* Palm / glove */
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), bodyMat);
  palm.position.y = -0.75;
  rightHand.add(palm);
  rightHand.position.y = -0.9;
  rightArm.add(rightHand);
  rightArm.position.set(0.9, 1.8, 0);
  astronaut.add(rightArm);

  /* Legs */
  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 1.2, 8), bodyMat);
  leftLeg.position.set(-0.3, -0.25, 0);
  astronaut.add(leftLeg);
  const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 1.2, 8), bodyMat);
  rightLeg.position.set(0.3, -0.25, 0);
  astronaut.add(rightLeg);

  /* Boots */
  const bootGeo = new THREE.BoxGeometry(0.28, 0.2, 0.4);
  const leftBoot = new THREE.Mesh(bootGeo, darkMat);
  leftBoot.position.set(-0.3, -0.95, 0.05);
  astronaut.add(leftBoot);
  const rightBoot = new THREE.Mesh(bootGeo, darkMat);
  rightBoot.position.set(0.3, -0.95, 0.05);
  astronaut.add(rightBoot);

  astronaut.position.set(0, -0.8, 0);
  astronaut.scale.setScalar(1.1);
  scene.add(astronaut);
}

/* ================================================================
   STICKERS — canvas-textured sprites
   ================================================================ */
function createEmojiTexture(emoji) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  /* White circle background (sticker look) */
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#222';
  ctx.stroke();

  /* Emoji */
  ctx.font = `${size * 0.55}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size / 2, size / 2 + 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createStickers() {
  for (let i = 0; i < STICKER_COUNT; i++) {
    const emoji = EMOJIS[i % EMOJIS.length];
    const tex = createEmojiTexture(emoji);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.92 });
    const sprite = new THREE.Sprite(mat);

    const scale = 0.6 + Math.random() * 0.8;
    sprite.scale.setScalar(scale);

    /* Scatter across the scene — they'll fall and pile up */
    sprite.position.set(
      (Math.random() - 0.5) * WALL_X * 1.6,
      FLOOR_Y + Math.random() * (CEIL_Y - FLOOR_Y),
      (Math.random() - 0.5) * 4 - 1
    );

    sprite.userData = {
      vx: 0, vy: 0,             // velocity
      mass: 0.8 + Math.random() * 0.6,
      rotSpeed: (Math.random() - 0.5) * 0.8,
      radius: scale * 0.4       // collision radius for mouse
    };

    scene.add(sprite);
    stickers.push(sprite);
  }
}

/* ================================================================
   DIAMONDS — icosahedron gems with refraction
   ================================================================ */
function createDiamonds() {
  const gemGeo = new THREE.OctahedronGeometry(0.35, 0);

  for (let i = 0; i < DIAMOND_COUNT; i++) {
    const hue = Math.random();
    const color = new THREE.Color().setHSL(hue, 0.4, 0.7);

    const mat = new THREE.MeshPhysicalMaterial({
      color: color,
      roughness: 0.02,
      metalness: 0.1,
      transmission: 0.85,
      thickness: 1.5,
      ior: 2.4,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 2,
      emissive: color,
      emissiveIntensity: 0.15
    });

    const mesh = new THREE.Mesh(gemGeo, mat);
    const scale = 0.5 + Math.random() * 0.8;
    mesh.scale.setScalar(scale);

    /* Scatter across the scene */
    mesh.position.set(
      (Math.random() - 0.5) * WALL_X * 1.6,
      FLOOR_Y + Math.random() * (CEIL_Y - FLOOR_Y),
      (Math.random() - 0.5) * 3 - 2
    );

    mesh.userData = {
      vx: 0, vy: 0,             // velocity
      mass: 1.0 + Math.random() * 0.8,
      rotSpeedX: (Math.random() - 0.5) * 1.5,
      rotSpeedY: (Math.random() - 0.5) * 1.5,
      sparklePhase: Math.random() * Math.PI * 2,
      radius: scale * 0.35       // collision radius for mouse
    };

    scene.add(mesh);
    diamonds.push(mesh);

    /* Sparkle point light per diamond (small, subtle) */
    if (i < 5) {
      const sparkle = new THREE.PointLight(color, 0.6, 4);
      sparkle.position.copy(mesh.position);
      mesh.userData.sparkle = sparkle;
      scene.add(sparkle);
    }
  }
}

/* ================================================================
   STARS — tiny background sparkles
   ================================================================ */
function createStars() {
  const starGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 40;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.06,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  /* Extra sparkle crosses */
  const crossMat = new THREE.PointsMaterial({
    color: 0xccccff,
    size: 0.12,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.6
  });
  const crossGeo = new THREE.BufferGeometry();
  const crossPos = new Float32Array(30 * 3);
  for (let i = 0; i < 30; i++) {
    crossPos[i * 3]     = (Math.random() - 0.5) * 35;
    crossPos[i * 3 + 1] = (Math.random() - 0.5) * 25;
    crossPos[i * 3 + 2] = (Math.random() - 0.5) * 15 - 3;
  }
  crossGeo.setAttribute('position', new THREE.BufferAttribute(crossPos, 3));
  const crosses = new THREE.Points(crossGeo, crossMat);
  scene.add(crosses);
}

/* ================================================================
   PHYSICS — Lusion-style gravity + mouse repulsion
   ================================================================ */
function applyPhysics(obj, dt, t) {
  const ud = obj.userData;
  const invMass = 1.0 / ud.mass;

  /* 1. Gravity */
  ud.vy += GRAVITY * dt;

  /* 2. Mouse repulsion — project mouse into 3D and push objects away */
  const dx = obj.position.x - mouse3D.x;
  const dy = obj.position.y - mouse3D.y;
  const distSq = dx * dx + dy * dy;
  const dist = Math.sqrt(distSq);

  if (dist < MOUSE_RADIUS && dist > 0.01) {
    /* Inverse-square-ish falloff: stronger when closer */
    const strength = MOUSE_STRENGTH * (1 - dist / MOUSE_RADIUS) * (1 - dist / MOUSE_RADIUS) * invMass;
    const nx = dx / dist;
    const ny = dy / dist;
    ud.vx += nx * strength * dt;
    ud.vy += ny * strength * dt;
  }

  /* 3. Apply velocity with damping */
  ud.vx *= DAMPING;
  ud.vy *= DAMPING;

  obj.position.x += ud.vx * dt;
  obj.position.y += ud.vy * dt;

  /* 4. Boundary collisions — bounce */
  /* Floor */
  if (obj.position.y < FLOOR_Y + ud.radius) {
    obj.position.y = FLOOR_Y + ud.radius;
    ud.vy = Math.abs(ud.vy) * BOUNCE;
    /* Friction on floor */
    ud.vx *= 0.92;
  }
  /* Ceiling */
  if (obj.position.y > CEIL_Y - ud.radius) {
    obj.position.y = CEIL_Y - ud.radius;
    ud.vy = -Math.abs(ud.vy) * BOUNCE;
  }
  /* Walls */
  if (obj.position.x < -WALL_X + ud.radius) {
    obj.position.x = -WALL_X + ud.radius;
    ud.vx = Math.abs(ud.vx) * BOUNCE;
  }
  if (obj.position.x > WALL_X - ud.radius) {
    obj.position.x = WALL_X - ud.radius;
    ud.vx = -Math.abs(ud.vx) * BOUNCE;
  }
}

/* ================================================================
   ANIMATE
   ================================================================ */
function animate() {
  animFrame = requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const dt = Math.min(clock.getDelta(), 0.05);

  /* ── Project mouse position into 3D world space ── */
  raycaster.setFromCamera(mouseNDC, camera);
  const hit = new THREE.Vector3();
  raycaster.ray.intersectPlane(mousePlane, hit);
  if (hit) mouse3D.copy(hit);

  /* Astronaut wave animation */
  if (astronaut) {
    /* Gentle body float */
    astronaut.position.y = -0.8 + Math.sin(t * 0.6) * 0.15;
    astronaut.rotation.y = Math.sin(t * 0.25) * 0.1;

    /* Subtle parallax with mouse */
    astronaut.rotation.y += mouseX * 0.08;
    astronaut.rotation.x = mouseY * 0.04;

    /* Right arm wave */
    const arm = astronaut.getObjectByName('rightArm');
    if (arm) {
      /* Arm raised up and waving */
      arm.rotation.z = -2.2 + Math.sin(t * 2.5) * 0.3;
      arm.rotation.x = Math.sin(t * 1.8) * 0.15;

      const hand = arm.getObjectByName('rightHand');
      if (hand) {
        hand.rotation.z = Math.sin(t * 3.5) * 0.4;
      }
    }
  }

  /* ── Stickers — gravity + mouse repulsion ── */
  for (const s of stickers) {
    applyPhysics(s, dt, t);
    /* Spin from velocity (the faster they move, the more they spin) */
    const speed = Math.sqrt(s.userData.vx * s.userData.vx + s.userData.vy * s.userData.vy);
    s.material.rotation += s.userData.rotSpeed * dt + speed * 0.02 * dt;
  }

  /* ── Diamonds — gravity + mouse repulsion + rotate + sparkle ── */
  for (const d of diamonds) {
    const ud = d.userData;
    applyPhysics(d, dt, t);

    /* Tumble based on velocity */
    const speed = Math.sqrt(ud.vx * ud.vx + ud.vy * ud.vy);
    d.rotation.x += (ud.rotSpeedX + speed * 0.3) * dt;
    d.rotation.y += (ud.rotSpeedY + speed * 0.3) * dt;

    /* Sparkle pulsation */
    const sparkleIntensity = 0.1 + 0.1 * Math.sin(t * 3 + ud.sparklePhase);
    d.material.emissiveIntensity = sparkleIntensity;

    /* Update sparkle light */
    if (ud.sparkle) {
      ud.sparkle.position.copy(d.position);
      ud.sparkle.intensity = 0.3 + 0.5 * Math.sin(t * 4 + ud.sparklePhase);
    }
  }

  composer.render();
}

/* ================================================================
   EVENTS
   ================================================================ */
function onResize() {
  if (!container || !camera || !renderer) return;
  const w = container.clientWidth;
  const h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
}

function onMouseMove(e) {
  const rect = container.getBoundingClientRect();
  mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
  mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

  /* NDC for raycaster (Three.js convention: Y is flipped) */
  mouseNDC.x = mouseX;
  mouseNDC.y = -mouseY;
}

/* ================================================================
   LIFECYCLE — IntersectionObserver to start/stop when visible
   ================================================================ */
function setupObserver() {
  const el = document.getElementById('contact-scene');
  if (!el) return;

  let initialized = false;

  const obs = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting && !initialized) {
        initialized = true;
        init();
      }
    }
  }, { threshold: 0.1 });

  obs.observe(el);
}

/* Start when DOM is ready */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupObserver);
} else {
  setupObserver();
}
