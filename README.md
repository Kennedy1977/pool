# Pool

A browser-based single-player pool game with a CPU opponent.

## How to run

Open `index.html` in a browser.

If you prefer to serve it locally:

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

## Controls

- Drag backward from the cue ball to aim and shoot.
- After a scratch, click on the table to place the cue ball.
- Use `New Rack` to restart the match.

## What is included

- Perspective-rendered table, rolling ball visuals, pockets, and cue visuals
- Ball-on-ball collisions, rail bounces, and rolling friction
- Simplified 8-ball rules with solids/stripes assignment
- Scratch handling with ball-in-hand
- CPU shot selection that tries pocket shots before fallback safety hits
