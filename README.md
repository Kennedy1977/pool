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
- On non-break shots, click a legal object ball, click a pocket, then shoot.
- Use `Safety` to call a safety instead of a pot.
- After ball-in-hand, click on the table to place the cue ball.
- Use `New Rack` to restart the match.

## What is included

- Perspective-rendered table, rolling ball visuals, pockets, and cue visuals
- Ball-on-ball collisions, rail bounces, and rolling friction
- WPA-style 8-ball flow with legal and illegal breaks, called shots, safeties,
  group assignment, scratches, and 8-ball win/loss handling
- Cue-ball-in-hand handling, including behind-the-head-string restrictions
  after applicable break fouls
- CPU shot selection that calls pots, plays safeties, and respects the same
  legal target and head-string rules
- Express wrapper for deployment to Node hosts such as Hostinger

## Hostinger Notes

- Upload the project files, including `package.json`, `server.js`, and the game
  assets.
- Run `npm install` on the server.
- Set the start command to `npm start` if your Hostinger panel asks for one.
- Make sure the Node app uses the platform-provided `PORT` env var, which this
  server already does.
