# Null Invaders · coded.design

> **Play it and read about it on DOM Virus:** https://coded-dot-design.github.io/dom-virus/games/null-invaders/ — this README holds the full technical details.

**The page is the game board.** A small, independent MIT-licensed DOM arcade game in the DOM VIRUS collection. Created by **Chris Cooley / coded.design**.

Fly a tiny interceptor through a real webpage. Shoot letters into binary, destroy button factories, and clear the aliens they release. Combat XP upgrades your weapon during a wave: Pulse, Twin, Trident, then four-shot Overdrive. Three lives; finishing wave four clears the page. Factories reactivate between waves.

## Shooter features

- Original two-frame pixel aliens, an animated interceptor, visible weapon pods, and brief enemy hit feedback. Sprites are baked into tiny canvas tiles once, then reused.
- Swarm-inspired six-digit score panel, floating points, kill/active counters, combo scoring, and a weapon XP meter. Light/dark themes follow system preferences.
- Button factories drain through cyan/native color, yellow and pink health states, with liquid impact ripples and slowing beacon rings. Labels, icons and handlers stay in place; Recall restores owned style properties.
- Shot letters become clean, unshootable 0/1 glyphs in the page's font, weight and color. The actual DOM Text node changes; Recall restores game-owned writes. There is no visual-only substitute.

| Gun | Unlock | Pattern |
| --- | ---: | --- |
| Pulse | Start | Single shot, 160 ms cadence |
| Twin | 8 XP | Twin shot, 140 ms cadence |
| Trident | 24 XP | Three-way spread, 120 ms cadence |
| Overdrive | 50 XP | Four-way spread, 95 ms cadence |

A letter gives 1 XP, an alien 4 XP, a factory hit 2 XP, a destroyed factory another 8 XP, and a wave clear 4 XP. Upgrades last for the run and reset on Restart. Three chained alien kills increase the combo multiplier, up to ×5; hits on letters keep the three-second combo window open. Losing a shield clears the combo.

## Where the game lives

This repository is the game package. The game page lives on the DOM Virus hub at https://coded-dot-design.github.io/dom-virus/games/null-invaders/. This repository's Pages workflow only publishes a redirect to that page; there is no per-game site to build. The hub reads `site/game.json` (page copy) and `site/art.json` (generated ship art) from here and loads the tagged package.

## Run locally

Use Node 24 (see `.nvmrc`), npm and Git:

```sh
git clone https://github.com/coded-dot-design/null-invaders.git
cd null-invaders
npm ci
npm run dev:playground
```

Open the URL Vite prints (normally **http://127.0.0.1:5173**) and click **Play**. The playground in `playground/` is a fictional test page; it does not ship in the package. With a sibling `dom-virus` checkout, Vite uses the live engine source; otherwise it uses the `shared/` snapshot.

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
npm install github:coded-dot-design/null-invaders#v0.7.2
```

```js
import { createNullInvaders } from '@coded-design/null-invaders';

const game = createNullInvaders(); // generic page defaults
// Call this after mounting and after the player chooses to play:
game.start();
// game.pause(); game.resume(); game.stop(); game.destroy();
```

The npm-compatible package exports its prebuilt self-contained module. You do not need to install DOM VIRUS or any other game at runtime. The package uses this scoped name; npm registry availability is not claimed.

## Configure the board

```js
const game = createNullInvaders({
  root: 'main',
  textSelector: '[data-virus-text]',
  targetSelector: '[data-virus-target]',
  excludeSelector: '[data-virus-ignore]',
  theme: 'system',
  targetEffects: 'liquid', // native button health fill + short hit ripple
  onState: snapshot => console.log(snapshot.status, snapshot.score),
});
```

With no config, the root is `document.body`; text defaults to h1–h6, p, li, blockquote, and `[data-virus-text]`; targets default to buttons, `[role="button"]`, `a.button`, `a.btn`, and `[data-virus-target]`. Explicit selectors replace those defaults. `root` accepts an element or a CSS selector. Forms, editable fields, dialogs, code, live regions, and game controls remain excluded. Add `data-virus-ignore` to any container you want protected.

Hits replace characters in the existing DOM Text nodes with literal 0 or 1. There are no canvas replacement letters, cloned text, or per-letter wrappers. The ownership ledger records the original and latest game-written value per node. Recall restores only still-owned values; newer host edits win. Changing a proportional-font letter into a digit can reflow text, so the bounded geometry cache is invalidated and refreshed.

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

Mouse or arrows/WASD: move and aim in the direction of travel. Hold click or Space to fire. Arrow/WASD input switches to keyboard control; pointer movement switches back. The HUD has an auto-fire toggle. On touch devices, an analog joystick moves the ship and a round Fire button shoots; both can be held together.

**P** pauses/resumes. **G** jumps to a gate. **Escape** or the HUD’s **×** (Recall) exits and restores the page. The HUD can be folded. Focusing a form field pauses play; modifier shortcuts and typing are not captured. Theme follows the system unless overridden. Reduced-motion preference removes particles, floating motion, sprite animation, hit flashes and decorative pulses; readable score feedback remains.

## Develop and verify

```sh
npm run check            # typecheck, unit tests, build, package types
npm run size             # gzip sizes against the budget
npm run playground:build
```

`src/simulation.ts` owns gameplay. `src/rules.ts` owns balance constants. `src/index.ts` exposes the factory. The engine, shared entity pools, factory selection and React lifecycle adapter are maintained once in DOM VIRUS. All engine and game implementation sources use strict TypeScript. Generated declarations preserve game-specific snapshot fields and ship with the package; the browser receives plain JavaScript. This repository includes a generated, versioned `shared/core.js` snapshot with its source fingerprint in `shared/ORIGIN.json`; do not edit that generated file. Builds use the snapshot, so this repo works independently. A sibling `dom-virus` checkout enables live source iteration in Vite. To refresh the engine snapshot, run `npm run sync:games` in that checkout, then rebuild and test this game. A game build never silently replaces its pinned snapshot. A runtime update never silently changes a released game.

`dist/index.js` and `dist/react.js` are each budgeted at **24 KB gzip including the runtime**; `npm run size` (`scripts/size.mjs`) fails the build above that. Runtime entities and geometry work are capped. Tests and Vite never ship in the package. See [shared performance notes](https://github.com/coded-dot-design/dom-virus/blob/main/PERFORMANCE.md) and [reference study](https://github.com/coded-dot-design/dom-virus/blob/main/REFERENCES.md).

## First-cut support

Modern browsers with Canvas 2D, Shadow DOM and Intl.Segmenter. CSS Highlights are optional and only fade already-mutated digits. Text replacement and Recall work without that API. Cross-origin frames and closed shadow roots are outside the board. Choose a content root and exclusions carefully for framework-driven or frequently changing pages.

MIT © 2026 Chris Cooley. Original character artwork is procedural and included under the same license.

## Version tags

After checks pass on `main`, CI creates the tag matching `package.json` (for example `v0.7.2`) if it does not already exist. Existing tags never move. Bump the package version for the next release.

Target beacons now attach to their actual elements. Native layout handles their scrolling, clipping and transforms. Mobile uses stationary rings and stable fills. See the [shared DOM ownership design](https://github.com/coded-dot-design/dom-virus/blob/main/docs/dom-ownership.md).

Player artwork lives in `src/ship-art.ts`. The build generates `site/art.json` for the shared website. Four weapon tiers and four cosmetic poses use a bounded, per-document canvas cache (at most 64 ship variants); movement and simulation time drive engine frames without extra timers.

### Sound and controls

The scoreboard always keeps sound, pause/resume, minimize/expand and Recall in the same order. Sound uses quiet synthesized effects, starts after a real gesture and can be muted. Pause stops active voices; Recall closes audio and restores the page. Mobile movement and fire remain available while the scoreboard is minimized.
