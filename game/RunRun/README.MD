# Run Run 8-bit — Web Edition

Retro pixel-art endless runner, ported from the original Android game **Run Run 8-bit** to a fully playable HTML5 Canvas webapp.

## 🎮 How to play

| Action | Mobile | Desktop |
| ------ | ------ | ------- |
| Jump | Tap screen | `Space` / `↑` |
| Double jump | Tap again mid-air | `Space` / `↑` mid-air |
| Pause | Tap ⏸ button | Tap ⏸ button |

- **Collect coins** 🪙 to score points (3D spin animation)
- **Grab hearts** ❤️ to restore lives (max 3)
- **Pick up diamonds** 💎 to increase your score multiplier
- **Eat fruits** 🍒🍓🍐🍌🍍 for bonus points and rapid-coin mode
- **Avoid blockers** 📚 and **airplanes** ✈️ — they cost you a life!
- After a hit you get **3 seconds of ghost mode** (invincibility)

## 🏗 Project structure

```
game/RunRun/
├── index.html              Entry point
├── run-run.css             Styles + landscape lock
├── js/
│   ├── game.js             Main orchestrator (state, loop, input, boot)
│   ├── core/
│   │   ├── config.js       Constants, canvas, dp(), resize()
│   │   ├── assets.js       Image/sound loader, SpriteAtlas, playSound()
│   │   └── collision.js    AABB segment test, box overlap
│   ├── sprites/
│   │   ├── player.js       Player character (man/girl/dragon)
│   │   ├── school.js       School intro building
│   │   ├── blocker.js      Book obstacles
│   │   ├── coin.js         Spinning coins
│   │   ├── heart.js        Heart pickups
│   │   ├── diamond.js      Multiplier diamonds
│   │   ├── bonus.js        Bonus fruits
│   │   └── airplane.js     Airplane obstacles
│   └── ui/
│       ├── background.js   Sky, clouds, scrolling ground
│       └── hud.js          Score, lives, multiplier, splash, hint
└── assets/
    ├── audio/              SFX (ogg, mp3, wav)
    ├── fonts/              PixelFont (pixel.ttf)
    └── img/
        ├── backgrounds/    Sky variants, timelapse clouds, ground tiles
        ├── characters/     Spritesheets + previews (man, girl, dragon)
        ├── sprites/        Game objects (coin, heart, blocker, fruits…)
        └── ui/             Buttons, hint, medals
```

## ⚙️ Technical details

- **Pure vanilla JS** — no frameworks, no build step
- **ES Modules** (`import`/`export`) for clean modular architecture
- **HTML5 Canvas** with `requestAnimationFrame` game loop
- **DPI-aware** rendering (`devicePixelRatio` scaling)
- **Design baseline**: 360dp width, `SCALE = min(W, H) / 360`
- **Dual-format SpriteAtlas**: supports both object-keyed and array-keyed TexturePacker JSON
- **3 playable characters** with selection persisted in `localStorage`
- **Progressive difficulty**: speed ramps linearly from 1× to 2× over 3 minutes
- **Mobile optimized**: landscape lock (CSS + Screen Orientation API), touch events, `passive: false`

## 🎯 Game mechanics (from Android source)

| Mechanic | Value |
| -------- | ----- |
| Max lives | 3 |
| Ghost duration | 3 s |
| Bonus duration | 3.5 s |
| Jump speed | -9.6 dp |
| Gravity | 0.35 dp/frame |
| Double jump | 360° spin at 1440°/s |
| Speed ramp | 1× → 2× over 180 s |
| Blocker spawn | 1.2–3.8 s |
| Coin spawn | 1.0–2.5 s |
| Heart spawn | 30–45 s (×0.6 if low HP) |
| Multiplier spawn | 20–26 s |
| Bonus spawn | 30–38 s |
| Airplane spawn | 4.5–7.0 s |

## 📱 Mobile support

The game is designed mobile-first:

- Forces **landscape orientation** (CSS `@media (orientation: portrait)` shows a rotate prompt, plus `screen.orientation.lock('landscape')` API)
- Full-screen canvas with `touch-action: none`
- Apple/Chrome mobile webapp capable meta tags
- Pixel-perfect rendering with `image-rendering: pixelated`

## 🔗 Credits

AI Ported from the Android app **Run Run 8-bit** by Umberto Cicero.
