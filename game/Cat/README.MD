# 🐱 Night Cat

A browser-based 2D platformer built with vanilla JavaScript and the Canvas API. You play as a cat navigating a nocturnal city across five handcrafted levels — collecting food, dodging dogs, and facing a final quantum boss.

---

## Gameplay

Collect all the food scattered across rooftops, fire escapes and alleyways to complete each level. You start with **9 lives**. Taking damage from an enemy triggers a brief invincibility window; losing all lives ends the game.

### Controls

| Action | Keyboard | Mobile |
| ------ | -------- | ------ |
| Move left / right | `←` `→` | D-pad |
| Jump | `↑` or `Space` | Jump button |
| Down / drop | `↓` | D-pad |

> **Tip:** press jump just before landing for a buffered jump (8-frame window).  
> Stay completely still for ~8 seconds to make nearby enemies lose interest and return to patrol.

---

## Levels

| # | Name | Description |
| - | ---- | ----------- |
| 1 | **Il Vicolo** | Dark alley. 5 doberman patrols. Dumpsters as ground platforms. |
| 2 | **Cantiere** | Construction site. 7 faster dogs, construction barriers, cranes with moving platforms. Fog rolls in. |
| 3 | **Tetti d'Inverno** | Snowy rooftops. 9 aggressive enemies. Snow accumulates on ledges and ground. |
| 4 | **La Fuga** | Rain-soaked city. A rival cat hunts you down. 10 enemies. Wet sheen on the ground, rain splashes. |
| 5 | **Quantum** | Boss arena. No food to collect — defeat the **Quantum Cat** by throwing portal orbs at it. |

---

## Bonus Pickups

Pickups spawn periodically on rooftops, fire-escape platforms and the ground.

### ❤️ Life (Heart)

- Restores **+1 life** (up to 9).
- Pink pulsing glow. Disappears after ~10 seconds if not collected.
- Spawns more frequently at higher levels.

### 🧲 Magnet

- Activates for **10 seconds**.
- Attracts all nearby uncollected food toward the cat (radius ≈ 120 px).
- Food is auto-collected when it reaches the cat.
- While active: cyan halo + magnet icon appear above the cat's head with a countdown bar.
- Spawns alongside a heart (45% chance per spawn tick), independently of your current lives.

---

## Level 5 — Boss Fight

The **Quantum Cat** attacks in waves:

- Fires **energy balls** from the air.
- Teleports via **portals** that appear in pairs.
- Summons **quantum orbs** on the ground.

**How to win:** pick up an orb (walk over it), then throw it into an open portal. The orb travels through and hits the boss. Repeat until the boss health bar reaches zero.

Body contact and energy balls deal damage. After each hit the cat is briefly invincible.

---

## Minimap

A small transparent map is displayed bottom-left at all times.

| Dot | Meaning |
| --- | ------- |
| 🟡 Yellow | Uncollected food |
| 🩷 Pink pulsing | Heart pickup |
| 🩵 Cyan pulsing | Magnet pickup |
| 🟠 Orange | Rival cat (Level 4) |
| 🔵 Blue | Quantum orb (Level 5) |
| 🟢 Green pulsing | Victory portal (Level 5) |
| 🔴 Red pulsing | Boss (Level 5) |
| ⚪ White + halo | You |
| ▭ White rect | Camera viewport |

---

## Easter Egg

Click **5 times in the top-right corner** of the screen (within 3 seconds) to open the level selector.  
Press `Esc` to close it.

---

## Technical Notes

- **No frameworks** — pure vanilla JS + Canvas 2D API.
- Responsive: scales to any screen size; mobile layout includes a virtual joystick + buttons.
- Audio: Web Audio API with pre-decoded buffer playback (`audio.js`). Initialized on first user gesture to comply with browser autoplay policies.
- Level architecture: each level is a class extending `BaseLevel` (`js/levels/`), owning its own `generateCity()`, `updateExtras()`, `drawExtras()` and `drawPlatformExtras()`.
- World size: **4000 × 1500** logical pixels; camera follows the cat with smooth clamping.

---

## File Structure

```text
js/
  audio.js          Web Audio engine
  config.js         Global CONFIG + KEYS + input setup
  cat.js            Player physics, animation, damage
  platform.js       Platform types (roof, fire-escape, dumpster, barrier…)
  fire-escape.js    Multi-floor fire-escape structures
  lamp.js           Victorian street lamp with light cone
  environment.js    Sky gradient, moon, stars, particles, snow, rain
  food.js           Collectible food items (fish, can, milk)
  enemy.js          Doberman AI (patrol → chase) + GhostCat effect
  crane.js          Crane structure with moving platform
  rival-cat.js      Rival cat antagonist (Level 4)
  portal.js         Quantum portals (Level 5)
  quantum-cat.js    Boss character (Level 5)
  game.js           Main loop, HUD, minimap, pickups, camera
  levels/
    BaseLevel.js    Abstract base + shared city-generation helpers
    Level1.js       Il Vicolo
    Level2.js       Cantiere
    Level3.js       Tetti d'Inverno
    Level4.js       La Fuga
    Level5.js       Quantum (boss fight)
```
