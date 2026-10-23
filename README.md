# Null Invaders · coded.design

**The page is the game board.** A small, independent MIT-licensed DOM arcade game in the DOM VIRUS collection.

Fly a tiny interceptor through a real webpage. Shoot letters into binary, destroy button factories, and clear the aliens they release. Four waves upgrade your weapon: single, twin, three-way spread, then four-shot overdrive. Three lives; finishing wave four clears the page. Factories reactivate between waves.

## Run locally

Node **22.12+** or Node 24, npm, and Git:

```sh
git clone https://github.com/coded-dot-design/null-invaders.git
cd null-invaders
npm ci
npm run dev
```

Open the Vite URL, normally **http://127.0.0.1:5173**, and click **Play**. This repository includes its own fictional test page. To switch between all three games, use the separate [DOM VIRUS playground](https://github.com/coded-dot-design/dom-virus).

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
npm install github:coded-dot-design/null-invaders#v0.2.0
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
  domMode: 'visual',
  onState: snapshot => console.log(snapshot.status, snapshot.score),
});
```

With no config, the root is `document.body`; text defaults to h1–h6, p, li, blockquote, and `[data-virus-text]`; targets default to buttons, `[role="button"]`, `a.button`, `a.btn`, and `[data-virus-target]`. Explicit selectors replace those defaults. `root` accepts an element or a CSS selector. Forms, editable fields, dialogs, code, live regions, and game controls remain excluded. Add `data-virus-ignore` to any container you want protected.

Visual mode hides consumed glyph ranges with CSS Highlights and draws effects in the overlay. It preserves host text nodes for React and other frameworks. `domMode: 'text'` intentionally changes text on selected static content and restores owned values on exit; newer host edits are preserved. Do not select dynamic framework text for direct mutation.

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

Mouse or arrows/WASD: move and aim in the direction of travel. Hold click or Space to fire. Arrow/WASD input switches to keyboard control; pointer movement switches back. Touch devices receive a D-pad and auto-fire toggle.

**P** pauses/resumes. **G** jumps to a gate. **Escape** or **Recall** exits and restores the page. The HUD can be folded. Focusing a form field pauses play; modifier shortcuts and typing are not captured. Theme follows the system unless overridden. Reduced-motion preference removes particles and decorative pulses.

## Develop and verify

```sh
npm run typecheck
npm test
npm run build
npm run size
npm run playground:build
```

`src/simulation.ts` owns gameplay. `src/rules.ts` owns balance constants. `src/index.ts` exposes the factory. The engine, shared entity pools, factory selection and React lifecycle adapter are maintained once in DOM VIRUS. All engine and game implementation sources use strict TypeScript. Generated declarations preserve game-specific snapshot fields and ship with the package; the browser receives plain JavaScript. This repository includes a generated, versioned `shared/core.js` snapshot with its source fingerprint in `shared/ORIGIN.json`; do not edit that generated file. Builds use the snapshot, so this repo works independently. A sibling `dom-virus` checkout enables live source iteration in Vite. To refresh the engine snapshot, run `npm run sync:games` in that checkout, then rebuild this game. A game build never silently replaces its pinned snapshot. A runtime update never silently changes a released game.

The regular distribution is budgeted below **18 KB gzip including its runtime**. Runtime entities and geometry work are capped. Tests and Vite never ship in the package. See [shared performance notes](https://github.com/coded-dot-design/dom-virus/blob/main/PERFORMANCE.md) and [reference study](https://github.com/coded-dot-design/dom-virus/blob/main/REFERENCES.md).

## First-cut support

Modern browsers with Canvas 2D, Shadow DOM, Intl.Segmenter, and CSS Highlights. This cut is tested in Chromium; it is not a claim of universal site or browser compatibility. Visual mode reports unsupported CSS Highlights; static opted-in pages can explicitly choose text mode. Cross-origin iframes and closed shadow roots are outside the board. Public launcher and Chrome extension are future work.

MIT © 2026 Chris Cooley. Original character artwork is procedural and included under the same license.

## Version tags

After checks pass on `main`, CI creates the tag matching `package.json` (for example `v0.2.0`) if it does not already exist. Existing tags never move. Bump the package version for the next release.
