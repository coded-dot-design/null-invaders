# Changelog

## 1.0.0: on Fizlet

The engine cut (DOM VIRUS ENGINE.md E3): Null Invaders runs on Fizlet 0.11.0 instead of the DOM VIRUS core snapshot. Same game, same numbers; the controller API (`createNullInvaders`, start/pause/resume/stop/destroy/getSnapshot) is unchanged.

- **The rules are one Fizlet system** (`src/world.ts`), DOM-free, on typed arrays: a step never allocates (tested: 20,000 busy steps, no minor GC) and the same seed with the same inputs replays the same run (tested).
- **The shell is `fizlet/arcade`** (Fizlet 0.11.0): the engine per run, page, overlay, scoreboard, controls, touch pad, sound, sparks, popups and the controller, shared with Byte Runner and Sherman Bytes as they port. `src/game.ts` is only the game's definition: scoreboard, reactions and art.
- **Bricks:** the page as the board (`fizlet/board-page`: budgeted measurement in the read phase, a grid index, ledger writes), controls (`fizlet/input`, `fizlet/pad`), sound (`fizlet/sound`), supply drops and score / XP / weapon levels (`fizlet/rules`). Null Invaders' own combo, waves and factories stay in the game.
- **Scoreboard in the Board UI kit** (DOM Battlefield's keys and readouts, the family's one button language): score, wave, shields, combo, weapon meter, a comms toast for upgrades, waves and the result. The touch stick and Fire key are the kit's pad.
- **Snapshot:** the same fields as 0.7.x, including `board` (letters indexed, visible, spent, range reads) and `particles`, so the hub's checks read it unchanged.
- **Removed:** `shared/` (the 51 KB core snapshot), the `targetEffects` and `document` options. Factories show their health as a level inside the button and a beacon ring.
- **Size:** `dist/index.js` is 26,069 B gzip (budget 26,500 B); 0.7.2 was 22,940 B. The Board UI kit's CSS is 2,711 B of it: without it the build is 23,358 B (+418 B over 0.7.2: the shared `fizlet/arcade` shell is general, with action keys, any readouts and a meter).
- **Tests:** rules, determinism and zero allocation in Node; the built package in Chromium (play, links and fields, pause, Recall restores the page byte for byte, game over, phone stick). CI runs on ubuntu-24.04.

## 0.7.2

Mobile: the arrow D-pad becomes the shared analog thumbstick (8-way, deadzone + hysteresis), and Fire becomes Battlefield's round crosshair button with an exact 3D press. Movement and Fire can be held together. Uses the dom-virus engine 0.21.0 snapshot; the gzip budget grows by 2 KB for the shared controls.

## 0.7.0

Add synthesized firing, hit, upgrade and wave cues; adopt shared sound/pause/minimize/Recall controls.

## 0.5.4

- Keep native 0/1 highlight text bright with a transparent background, so light page surfaces show through.

## 0.5.3

- Soften the site and game graphics to a flat color palette while retaining native attachments, raised controls and press feedback. Swarm colors remain unchanged.

## 0.5.2

- Vivid neon sprites and cyan binary highlights; consume movement/fire keys while playing, including when host chrome retains focus.

## 0.5.1

- Reversible mobile pinch/double-tap zoom lock while playing; native scrolling remains available. Pause and Recall restore the host policy. Set `lockZoom: false` to opt out.

## 0.5.0

- Independent touch D-pad and hold-to-fire controls, compact mobile scoreboard with expanded results, colored native bit highlights, and abstract site previews. Shared engine 0.9.0.

## 0.4.1

- Adopt engine 0.8.0: native target-attached beacons, quieter mobile fills, fewer board rescans and one reusable collision measurement Range.
- Preserve real text mutation and conditional Recall; pause/cancel native effects with the game lifecycle.

## 0.4.0

- Replace actual DOM text with literal 0/1 on every consumed letter; remove visual-only canvas substitution. Byte Runner leaves binary instead of erased spaces.
- Track original and latest owned Text values for Recall, preserving newer host updates and existing node identity.
- Adopt engine 0.7.0: fewer layout reads for spent text, no binary canvas, optional fading of real digits, and no CSS Highlights requirement.
- Update the integration guide and technical page to describe actual mutation and layout refresh.

## 0.3.1

- Add the Astro product/test page, system/light/dark themes, real game descriptions, measured package sizes, architecture diagrams, and creator attribution.
- Add a versioned shared site kit and CI-gated GitHub Pages builds. Commit the Node 24 toolchain and lockfile.
- Remove decorative game HUD shadows. Keep gameplay, colors, sprites, liquid fills and score effects unchanged.
