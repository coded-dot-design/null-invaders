# Null Invaders · coded.design

> **Play it and read about it on DOM Virus:** https://domvirus.com/games/null-invaders/ — this README holds the full technical details.

**The page is the game board.** A small, independent MIT-licensed DOM arcade game in the DOM VIRUS collection, built on [Fizlet](https://github.com/coded-dot-design/fizlet). Created by **Chris Cooley / coded.design**.

Fly a tiny interceptor through a real webpage. Shoot letters into binary, destroy button factories, and clear the aliens they release. Combat XP upgrades your weapon during a wave: Pulse, Twin, Trident, then four-shot Overdrive. Three lives; finishing wave four clears the page. Factories reactivate between waves.

## Shooter features

- Original two-frame pixel aliens, an animated interceptor, visible weapon pods, and brief enemy hit feedback. Sprites are baked into tiny canvas tiles once, then reused.
- A scoreboard in the Board UI kit (DOM Battlefield's keys and readouts): six-digit score, wave, shields, combo, a weapon XP meter, floating points and a comms toast. Light/dark follows system preferences.
- Button factories drain through cyan, yellow and pink health levels inside the button itself, with a beacon ring that beats faster as they weaken. Labels, icons and handlers stay in place; Recall restores the button's style.
- Shot letters become clean, unshootable 0/1 glyphs in the page's font, weight and color. The actual DOM Text node changes; Recall restores game-owned writes. There is no visual-only substitute.

| Gun | Unlock | Pattern |
| --- | ---: | --- |
| Pulse | Start | Single shot, 160 ms cadence |
| Twin | 8 XP | Twin shot, 140 ms cadence |
| Trident | 24 XP | Three-way spread, 120 ms cadence |
| Overdrive | 50 XP | Four-way spread, 95 ms cadence |

A letter gives 1 XP, an alien 4 XP, a factory hit 2 XP, a destroyed factory another 8 XP, and a wave clear 4 XP. Upgrades last for the run and reset on Restart. Three chained alien kills increase the combo multiplier, up to ×5; hits on letters keep the three-second combo window open. Losing a shield clears the combo.

## Where the game lives

This repository is the game package. The game page lives on the DOM Virus hub at https://domvirus.com/games/null-invaders/. This repository's Pages workflow only publishes a redirect to that page; there is no per-game site to build. The hub reads `site/game.json` (page copy) and `site/art.json` (generated ship art) from here and loads the tagged package.

## Run locally

Use Node 24 (see `.nvmrc`), npm and Git:

```sh
git clone https://github.com/coded-dot-design/null-invaders.git
cd null-invaders
npm ci
npm run dev:playground
```

Open the URL Vite prints (normally **http://127.0.0.1:5173**) and click **Play**. The playground in `playground/` is a fictional test page; it does not ship in the package.

## Embed without a build system

Copy this repository's `dist/index.js` into your website assets. It contains the complete runtime, with no network imports, images, fonts, or third-party runtime dependency:

```html
<button id="play-game" data-virus-ignore>Play Null Invaders</button>
<script type="module">
  let game;
  document.querySelector('#play-game').addEventListener('click', async () => {
    const { createNullInvaders } = await import('/games/null-invaders/index.js');
    game?.destroy();
    game = createNullInvaders();
    game.start();
  });
</script>
```

The import is deferred until the player clicks. Keep the MIT license with redistributed code. No npm registry publication is required for this approach.

## npm-compatible install

```sh
npm install github:coded-dot-design/null-invaders#v1.0.0
```

```js
import { createNullInvaders } from '@coded-design/null-invaders';

const game = createNullInvaders(); // generic page defaults
// Call this after mounting and after the player chooses to play:
game.start();
// game.pause(); game.resume(); game.stop(); game.destroy();
```

The npm-compatible package exports its prebuilt self-contained module (Fizlet is bundled in). You do not need to install Fizlet, DOM VIRUS or any other game at runtime. The package uses this scoped name; npm registry availability is not claimed.

## Configure the board

```js
const game = createNullInvaders({
  root: 'main',
  textSelector: '[data-virus-text]',
  targetSelector: '[data-virus-target]',
  excludeSelector: '[data-virus-ignore]',
  theme: 'system',
  seed: 7, // optional: same seed, same run
  onState: snapshot => console.log(snapshot.status, snapshot.score),
});
```

With no config, the root is `document.body`; text defaults to h1–h6, p, li, blockquote, `[data-fizlet-text]` and `[data-virus-text]`; targets default to buttons, `[role="button"]`, `a.button`, `a.btn`, `[data-fizlet-target]` and `[data-virus-target]`. Explicit selectors replace those defaults. `root` accepts an element or a CSS selector. Forms, editable fields, dialogs, code, live regions, and game controls remain excluded. Add `data-virus-ignore` to any container you want protected.

Hits replace characters in the existing DOM Text nodes with literal 0 or 1 (`fizlet/board-page`). There are no canvas replacement letters, cloned text, or per-letter wrappers. Every write goes through the engine's ledger, which records the original value; Recall restores what the game still owns, and newer host edits win. Letter geometry is measured only in the frame's read phase, on a budget, and indexed in a grid, so a frame's simulation never reads layout.

A page with no factories uses edge spawns. Only visible, unclipped factories spawn enemies. Use **G** or **Next gate** to travel to another section; ordinary scrolling remains available.

## React

```jsx
import { useMemo } from 'react';
import { NullInvaders } from '@coded-design/null-invaders/react';

function Game({ playing }) {
  const options = useMemo(() => ({ root: 'main', theme: 'system' }), []);
  return <NullInvaders active={playing} options={options} />;
}
```

Set `playing` from a user action. The adapter mounts only in an effect, destroys on unmount, and handles React Strict Mode cleanup. Memoize options; a new options object restarts the game. React is an optional peer dependency; the regular entry is framework-free. Do not import both regular and React controllers for the same active round.

## Controls

Mouse or arrows/WASD: move and aim in the direction of travel. Hold click or Space to fire. Arrow/WASD input switches to keyboard control; pointer movement switches back. The HUD has an auto-fire toggle. On touch devices, the kit's touch pad (`fizlet/pad`): an analog stick moves the ship and a round Fire key shoots; both can be held together. While a run is live, a click on the page fires instead of following a link or pressing a button; the scoreboard, form fields and anything marked `data-virus-ignore` keep their clicks.

**P** pauses/resumes. **G** jumps to a gate. **Escape** or the HUD’s **×** (Recall) exits and restores the page. The HUD can be folded. Focusing a form field pauses play; modifier shortcuts and typing are not captured. Theme follows the system unless overridden. Reduced-motion preference removes particles, floating motion, sprite animation, hit flashes and decorative pulses; readable score feedback remains.

## Develop and verify

```sh
npm run check            # typecheck, unit tests (rules, determinism, zero allocation), build, package types, vendor check
npm run size             # gzip sizes against the budget
npm run test:browser     # the built package in Chromium: play, Recall restores the page exactly, game over, phone stick
npm run playground:build
```

- `src/world.ts` is the rules: ship, invaders, shots, factories, supplies and waves, as one DOM-free Fizlet system. Every running number lives in a typed array, so a step never allocates (a test runs 20,000 busy steps and sees no minor GC), and the same seed with the same inputs gives the same run.
- `src/game.ts` is the game's definition on `fizlet/arcade`, the shell shared by the page arcade games: one engine per run, the page as the board (`fizlet/board-page`), the scoreboard (Board UI kit), controls and touch pad, sound, sparks, popups and the controller. The game adds its scoreboard values, how it reacts to events and its art; `world.ts` uses `fizlet/rules` for supply drops and score, XP and weapon levels.
- `src/rules.ts` holds the balance numbers; `src/ship-art.ts` and `src/sprites.ts` the art.
- `vendor/fizlet/` is a generated snapshot of the engine with its provenance in `ORIGIN.json`. Never edit it: change coded-dot-design/fizlet, then `npm run sync` with a sibling `fizlet` checkout. CI checks every file against `ORIGIN.json`.

`dist/index.js` and `dist/react.js` are budgeted at **28,541 B gzip**; `npm run size` (`scripts/size.mjs`) fails the build above that. 1.0.3 (Fizlet 0.20.0) measures 28,040 B; 1.0.2 (Fizlet 0.19.0) measured 27,499 B; 1.0.0 measured 26,434 B (0.7.2 on the DOM VIRUS core: 22,940 B). The kit's CSS (keys, readouts, toast, touch pad) is 2,906 B of 1.0.2's build; the same build without that CSS is 24,535 B. Runtime entities and geometry work are capped. Tests and Vite never ship in the package.

## First-cut support

Modern browsers with Canvas 2D, Shadow DOM, constructable stylesheets and Intl.Segmenter. CSS Highlights are optional and only colour already-mutated digits. Text replacement and Recall work without that API. Cross-origin frames and closed shadow roots are outside the board. Choose a content root and exclusions carefully for framework-driven or frequently changing pages.

MIT © 2026 Chris Cooley. Original character artwork is procedural and included under the same license.

## Version tags

After checks pass on `main`, CI creates the tag matching `package.json` (for example `v1.0.0`) if it does not already exist. Existing tags never move. Bump the package version for the next release.

Player artwork lives in `src/ship-art.ts`. The build generates `site/art.json` for the shared website. Four weapon tiers and four cosmetic poses use a bounded, per-document canvas cache (at most 64 ship variants); movement and simulation time drive engine frames without extra timers.

### Sound and controls

The scoreboard always keeps sound, pause/resume, minimize/expand and Recall in the same order. Sound uses quiet synthesized effects (`fizlet/sound`), starts after a real gesture and can be muted. Pause stops the engine; Recall destroys it, which closes audio and restores the page. Mobile movement and fire remain available while the scoreboard is minimized.
