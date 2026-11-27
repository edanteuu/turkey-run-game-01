# The Great Turkey Breakout

A 3D turkey escape game for the make.fun **turkey-run-game-01** bounty.
Thanksgiving is coming and the oven is hot: a turkey flees the farmhouse
yard at sunset toward the forest gate 1000 m away, chased by the farmer,
dodging the glowing oven, the swinging carving knife, fences, hay bales
and pumpkins — and grabbing corn on the way.

## How to play

Serve `game/` with any static server and open `index.html` in desktop
Chrome (no network needed — Three.js is vendored under `game/vendor/`):

```sh
node serve.ts        # then open http://localhost:8080
```

- **← → or A / D** — dodge between the three lanes (or click a lane)
- **Space / ↑ / W** — jump (over fences and hay bales; not over pumpkins or the oven)
- **Enter** — start / confirm, **P** — pause, **R** — restart, **M** — mute
- Click the on-screen buttons; the title and end screens are clickable too.

Three lives. Every hit lets the farmer close in; three hits and you are
caught. Reach the forest gate at 1000 m and you escape. Corn is +25 points,
every metre run is +1.

## Screenshots

The four shots in `screenshots/` are real renders of the game's own code,
taken in headless Chrome at 1280×800 from the deterministic poses in
`game/src/shots.js`:

```sh
node serve.ts --port 8091
google-chrome --headless=new --screenshot=screenshots/1-start.jpg \
  --window-size=1280,800 --hide-scrollbars --virtual-time-budget=5000 \
  'http://localhost:8091/index.html?shot=start&seed=1'
# … and likewise ?shot=play, ?shot=chase, ?shot=end
```

Each `?shot=` mode poses a fixed scene (fixed seed, fixed camera, no
randomness) and paints it twice synchronously before setting
`window.__shotReady`, so the frame is reproducible.

`?selftest=1` runs the game logic headlessly (title → play, lane change,
jump, fence collision, corn pickup, three-hits-caught, 1000 m escape,
restart, knife warning) and writes `SELFTEST PASS` / `FAIL` into
`document.title`.

## Layout

- `game/index.html` — the page: two stacked canvases, import map for Three.js
- `game/src/config.js` — tuning numbers, lanes, palette
- `game/src/random.js` — seeded random (mulberry32)
- `game/src/world.js` — the run: turkey, farmer, obstacles, corn, collisions
- `game/src/models.js` — the characters and props, built from primitives
- `game/src/render.js` — the Three.js sunset farm scene
- `game/src/hud.js` — the 2D HUD, title, pause and end screens
- `game/src/audio.js` — synthesised WebAudio sounds (gobble, flap, chimes)
- `game/src/input.js` — keyboard and mouse input
- `game/src/shots.js` — the deterministic screenshot poses
- `game/src/main.js` — boot, the fixed-step loop, screens
- `main.ts` — hands the game in: copies `game/` + `screenshots/` and writes
  `dossier.json` (run with `MAKEFUN_OUTPUT_DIR=out node main.ts`)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
