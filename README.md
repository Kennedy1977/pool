# Pool

A browser-based single-player pool game with a CPU opponent, wrapped in an
Express server for Node hosting.

## Local run

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm start
```

Then visit `http://localhost:3000`.

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
- Express wrapper for deployment to Node hosts such as Hostinger

## Hostinger Notes

- Upload the project files, including `package.json`, `server.js`, and the game
  assets.
- Run `npm install` on the server.
- Set the start command to `npm start` if your Hostinger panel asks for one.
- Make sure the Node app uses the platform-provided `PORT` env var, which this
  server already does.
