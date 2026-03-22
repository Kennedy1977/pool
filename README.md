# Pool

A browser-based single-player pool game with a CPU opponent, wrapped in an
Express server for Node hosting. The app now opens on a game-select screen
where `Pool` launches the playable table and `Poker` currently shows a
placeholder lounge.

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

- Drag empty space to orbit the table.
- Right-drag, middle-drag, or hold `Shift` while dragging to pan.
- Use the mouse wheel or trackpad scroll to zoom.
- The game now preloads the next legal shot for the human player and swings the
  camera behind the cue ball so the cue ball stays closest to the camera.
- Drag and wheel input in shot mode now work as shot-camera adjustments, so you
  can fine-tune the suggested angle and zoom without losing the behind-the-cue
  view.
- Click the cue ball to enter shot mode if you want to override the current
  suggestion manually.
- On non-break shots, click a legal object ball and pocket to replace the
  current call, then shoot.
- Click the currently selected object ball again to clear that target and swap
  to a different shot.
- Use the in-canvas cue-ball spin control and vertical power bar, then click
  the cue ball again to fire the shot.
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
