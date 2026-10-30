# Changelog

## 1.0.3

On Fizlet 0.20.0 (was 0.19.0; `vendor/fizlet` from the v0.20.0 release, `bf42a8c`). Same game and rules: the vendored engine is the only code change.

- **No pinch or double-tap zoom while you play** (Fizlet 0.20.0, `fizlet/touch`). While a run is live the page is the board, so a second finger, an iOS gesture or a double tap no longer zooms the page out of shape; one finger still flies and fires, taps and drags the scoreboard. The end of the run (or Recall) gives the page its zoom back. Checked in Chromium on a 390 × 844 touch phone: during a run a pinch and a double tap leave the page at scale 1 (the same pinch zooms it to 5× before the run, and on 1.0.2); after Recall the pinch zooms again and `<html>` is back to `touch-action: auto`.
- **The scoreboard still drags**, with one finger on a phone and with the mouse at 1440 wide (checked in Chromium), and the drag does not zoom the page.
- **Also from Fizlet 0.20.0:** the phone stick's math allocates nothing (the exact `hypot`, same bits as `Math.hypot`), and the shell's pause, resume and end go through one flow (the card behaves as before).
- **Size:** `dist/index.js` is 28,040 B gzip (1.0.2 was 27,499 B, +541 B). Measured by taking each piece out of a scratch build: the touch lock in the shell +181 B, the kit's touch CSS +94 B, the rest of 0.20.0 (the flow contract, the exact `hypot` in the pad and the page hit test, the kernel's fps-cap timer) +266 B. The budget moves from 28,000 to 28,541 B (+541 B, the measured delta).

## 1.0.2

On Fizlet 0.19.0 (was 0.13.0). Same game and rules: the vendored engine is the only code change.

- **Fixed: the game draws in the right place on 2× and zoomed screens** (Fizlet 0.18.0). The arcade canvas now fills the overlay with CSS (`width:100%;height:100%`); before, it had no CSS size, so on a 1.5× or 2× screen the ship, the invaders and the factories' beacon rings drew 1.5–2× too big and away from the page targets. Checked in Chromium at deviceScaleFactor 2 (1280 × 800): the canvas is 1280 × 800 CSS px over its 1920 × 1200 backing store (was 1920 × 1200 CSS px), and the art sits on the player's position and around the first target button (was none there).
- **The scoreboard drags** (Fizlet 0.19.0, fizlet#70): grab the card anywhere that isn't a key, with mouse or touch; it stays inside the window, also when the window shrinks. Checked in Chromium: dragged 400 px left and 300 px up, flung past the edges and resized to 700 × 500, it stayed fully on screen.
- **Also from Fizlet 0.14–0.19:** the kit's key labels pass WCAG AA in both themes (token contrast), and a capped engine caps its animation frames, not just its work. Strict `exactOptionalPropertyTypes` typecheck passes.
- **Size:** `dist/index.js` is 27,499 B gzip (1.0.1 was 26,493 B, +1,006 B): the engine's shell grew (the HUD preset contract, the drag, the kernel's frame cap) and the Board UI kit's CSS with it. Without the kit's CSS the build is 24,535 B (1.0.1: 23,732 B). The budget moves from 27,000 to 28,000 B.

## 1.0.1

E3 acceptance (`fe port-check`): no `Math.hypot` in the step, and the zero-allocation test in its own process. Same game: a run replays bit for bit what 1.0.0 played (same seeds, same inputs, same digest). Still on Fizlet 0.13.0.

- **No `Math.hypot` in the step** (`src/world.ts`): V8's allocates on every call. A local `dist` returns exactly what `Math.hypot` returned (it scales by the larger side as V8 does), so the gameplay numbers don't move by a bit.
- **Tests:** `npm test` runs files one at a time (`--test-concurrency=1`), and the zero-allocation test has its own file (`tests/zero-gc.test.mjs`), so no other test shapes what V8 learns before it counts GCs.
- **Size:** `dist/index.js` is 26,493 B gzip (budget 27,000 B; 1.0.0 was 26,434 B).

## 1.0.0: on Fizlet

The engine cut (DOM VIRUS ENGINE.md E3): Null Invaders runs on Fizlet 0.13.0 instead of the DOM VIRUS core snapshot. Same game, same numbers; the controller API (`createNullInvaders`, start/pause/resume/stop/destroy/getSnapshot) is unchanged.

- **The rules are one Fizlet system** (`src/world.ts`), DOM-free, on typed arrays: a step never allocates (tested: 20,000 busy steps, no minor GC) and the same seed with the same inputs replays the same run (tested).
- **Shots meet the page's letters through board-page's typed `hitAt`** (Fizlet 0.13.0): a number passed to a call V8 doesn't inline boxes.
- **The shell is `fizlet/arcade`** (Fizlet 0.13.0): the engine per run, page, overlay, scoreboard, controls, touch pad, sound, sparks, popups and the controller, shared with Byte Runner and Sherman Bytes as they port. `src/game.ts` is only the game's definition: scoreboard, reactions and art.
- **Bricks:** the page as the board (`fizlet/board-page`: budgeted measurement in the read phase, a grid index, ledger writes), controls (`fizlet/input`, `fizlet/pad`), sound (`fizlet/sound`), supply drops and score / XP / weapon levels (`fizlet/rules`). Null Invaders' own combo, waves and factories stay in the game.
- **Scoreboard in the Board UI kit** (DOM Battlefield's keys and readouts, the family's one button language): score, wave, shields, combo, weapon meter, a comms toast for upgrades, waves and the result. The touch stick and Fire key are the kit's pad.
- **Snapshot:** the same fields as 0.7.x, including `board` (letters indexed, visible, spent, range reads) and `particles`, so the hub's checks read it unchanged.
- **Removed:** `shared/` (the 51 KB core snapshot), the `targetEffects` and `document` options. Factories show their health as a level inside the button and a beacon ring.
- **Size:** `dist/index.js` is 26,434 B gzip (budget 27,000 B); 0.7.2 was 22,940 B. The Board UI kit's CSS is 2,702 B of it: without it the build is 23,732 B (+792 B over 0.7.2: the shared `fizlet/arcade` shell is general, with action keys, any readouts and a meter).
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
