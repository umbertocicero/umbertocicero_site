# Orbital Bloom  Gravity Sandbox | Game Design Specification (v4)

## Concept in One Line

> One sun. You spawn planets. Gravity does the rest.

---

## Core Mechanic  Gravity Sandbox

### How It Works

- A **single sun** sits fixed at the centre of the screen, exerting real Newtonian gravitational pull.
- The player **clicks and holds** anywhere on screen to spawn a planet  the longer the hold, the bigger (and more massive) the planet.
- On release, the planet is injected with the exact **circular orbital velocity** for its spawn distance, so it naturally enters a stable orbit.
- Planets obey **real gravity** (Velocity-Verlet integration, 8 substeps per frame for numerical stability).
- Close flybys past the sun produce natural **slingshot (gravity assist) trajectories**  no special code needed, pure physics.
- Planets can **collide** with each other: elastic bounces alter their orbits.
- Planets that escape the screen boundary are **lost to the void**.
- There is **no game over**  this is a pure creative sandbox.

---

## Physics Model

| Parameter | Value / Description |
|---|---|
| Integration | Velocity-Verlet, 8 substeps per frame |
| dt cap | 33 ms |
| Gravitational constant G | 5000 (tuned to screen scale) |
| Sun mass (gm) | 12000 |
| Planet mass | radius  0.05 |
| Orbital velocity | sqrt(G  M / r)  2% nudge for slight ellipticity |
| Force softening e | sun.r  0.5 (anti-singularity only) |
| Collision restitution | 0.6 |
| Min spawn distance | sun.r  3.5 (auto-clamped) |

---

## Planet Shapes

| Shape | Description |
|---|---|
| Circle (2) | Classic sphere with radial gradient  most common |
| Rocky | Jagged polygon (11 vertices, 72100% radius variation)  asteroid/rocky planet |
| Ring | Sphere with tilted elliptical ring (Saturn-style), random inclination |

Shape is assigned randomly at spawn time.

---

## Controls

| Input | Action |
|---|---|
| Click / tap and hold | Grow a planet (size indicator bar shown) |
| Release | Spawn planet at correct orbital velocity |
| R | Restart |
| Esc | Pause / Resume |

---

## Visual Design

- Deep space background (`#060a1c`) with 180-star field
- Subtle gravity field lines (faint directional arrows) across the canvas
- **Sun**: orange-gold radial gradient, animated corona glow, pulse ring
- **Planets**: shape-specific body with radial gradient + colour glow + motion trail
- **Collision**: white + colour particle burst
- **Ambients**: corona flare bubbles that expand and fade from the sun's surface
- **Hold preview**: dashed circle growing under the cursor during hold

---

## Architecture

| File | Role |
|---|---|
| `index.html` | Markup, CSS, overlay HTML  no logic |
| `orbital-bloom.js` | All game logic: physics, rendering, input, state machine |

### State Machine

```
INTRO  PLAY  PAUSE
```

---

## Success Criteria

- A child immediately understands: hold to make a big planet, release to launch it
- The gravity simulation feels convincing and beautiful
- Close flybys and slingshot trajectories emerge naturally from the physics
- The sandbox has no ceiling  you can keep building a solar system forever
- Zero console errors during normal use
