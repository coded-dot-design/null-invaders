# Null Invaders: Phase 1 handoff

## Start here (for agents)

Null Invaders (`@coded-design/null-invaders`, `0.7.2`, MIT) is a shooter that plays on a live web
page: you fly a pixel interceptor, shoot letters into binary and destroy the button "factories"
that spawn aliens. It is the smallest engine game, built on a DOM VIRUS engine snapshot
(`0.21.0`), and is cartridge 05 on the hub. Ecosystem context is in the hub
[HANDOFF.md](https://github.com/coded-dot-design/dom-virus/blob/main/HANDOFF.md); next steps are in
[FUTURE.md](FUTURE.md). Play: https://coded-dot-design.github.io/dom-virus/games/null-invaders/

| Task | Where |
|---|---|
| Flight, aliens, bullets, collisions, factories, XP, waves | `src/simulation.ts` |
| Caps, weapon spreads, XP thresholds, cadence, wave health | `src/rules.ts` |
| Interceptor pixel art (game and hub artwork) | `src/ship-art.ts` |
| Sprite baking and alien sprites | `src/sprites.ts` |
| Keys, hint, defaults | `src/index.ts` |
| Hub page copy and controls list | `site/game.json` (`site/art.json` is generated) |
| Engine, touch kit, HUD, audio | not here: `dom-virus/src`, then `npm run sync:games` |
| Size budget | `scripts/size.mjs` |

**Invariants**

- Never edit `shared/` by hand. Change `dom-virus/src`, run `npm run sync:games` there, rebuild.
  CI fails on any drift in `dist/` or `shared/`.
- Never hand-edit `site/art.json`; `npm run build` regenerates it from `src/ship-art.ts`.
- A release bumps `package.json`, both top-level version fields in `package-lock.json` and
  `CHANGELOG.md` together, with the rebuilt `dist/` and `site/art.json`. CI tags `v<version>`;
  update the hub pin in `dom-virus/games.json` only after the tag exists.
- Any button you add follows the 3D press rule (top over a hard base; hover lifts the top, press
  lands exactly on the base, selected stays pressed, no overshoot, no `scale()`).
- Hot paths move only transforms and opacity; no layout reads per frame. Collision geometry stays
  independent of the visual pose.
- Respect reduced motion (bank, wing and hit frames already check `api.reducedMotion`).
- Mobile must stay smooth: keep the 48/80 pools bounded and test late waves on a phone profile.

**Verify before you push**

```sh
npm ci                  # Node 24 (.nvmrc); engines >= 22.23.4
npm run check           # typecheck, unit tests, build (+ art.json), package types
npm run size            # fails above 24,000 B gzip per file
npm run playground:build
git status              # dist/ and site/art.json must be committed and match the build
# Browser/touch tests live in the hub and use this sibling checkout:
cd ../dom-virus && CHROMIUM_PATH=/path/to/chrome npm run test:browser
```

## 1. The game

Shoot letters, earn combat XP, upgrade the ship, destroy factories, survive the wave. Weapons:
PULSE, TWIN at 8 XP, TRIDENT at 24, four-shot OVERDRIVE at 50; fire interval 160 ms down to 95 ms.
Letters give 1 XP, aliens 4, factory hits 2, a destroyed factory 8 more. Caps: 48 aliens, 80
bullets. Factory health is `60 + wave * 20`.

## 2. How it uses the DOM

- **Letters** are hit through the board's cached glyph geometry; a hit writes `0`/`1` into the
  existing Text node, which keeps the page's font and colour. Each letter is consumed once; Recall
  restores still-owned text.
- **Buttons are factories** ("gates" in the code). Health drains through the engine's liquid fill;
  a destroyed factory stops spawning for the rest of the wave and emits `gate-destroyed`.
- Aliens (drone, crab, squid) spawn from factories; pickups come from the engine's `SupplyDrops`.

## 3. Architecture

`src/index.ts` calls `createArcade` with `capabilities.fire`, `hud: "arcade"`,
`binaryStyle: "native"` and liquid target effects; `src/react.ts` wraps it with
`createGameComponent`. `shared/` (`core.js`, `react.js`, `types/`, `build-game.mjs`, `ORIGIN.json`
with version and SHA-256) is the engine snapshot. `scripts/build.mjs` runs `shared/build-game.mjs`
then `scripts/build-art.ts`. The repo hosts no site: `pages.yml` deploys a redirect to the hub.

## 4. Controls

- **Keyboard/mouse:** mouse or WASD/arrows fly and aim along the direction of travel; hold click or
  Space to fire. Keyboard input switches to keyboard control, pointer movement switches back.
  P pause, G next factory, Esc Recall.
- **Mobile:** the shared engine touch kit: 8-way analog stick (deadzone, sector hysteresis) and the
  round Fire button; no secondary buttons. Stick and Fire can be held together.

## 5. Performance

Bounded `EntityPool`s for aliens and bullets; swept `segmentHit` tests from the previous to the next
bullet position, nearest hit wins (fast shots cannot skip thin letters); sprites are tiny canvases
baked once per pose and blitted with smoothing off (no images, filters or sprite DOM). Board
geometry, the reusable Range and the frame loop come from the engine.

## 6. Size

Budget 24,000 B gzip each for `dist/index.js` and `dist/react.js`. At 0.7.2: 22,940 B and
23,024 B gzip (59,877 / 60,062 B raw). Raised from 22 KB in 0.7.2 for the touch kit.

## 7. Release

CI (`check.yml`): typecheck, test, build, test:package, size, playground:build,
`git diff --exit-code -- dist shared`; then `tag-version` tags `v<package.version>` on `main` once.
Unit tests: `rules`, `ship-art`, `simulation`, plus `types.test.ts` and `package-types.test.ts`.
The hub's hourly build already follows the newest tag in the pinned major line; the pin is the
reproducible record.

## 8. On the hub

Cartridge **05**, last on the shelf; accent cyan; "DOM SHOOTER". One action: PRESS START, then the
screen morphs into `/games/null-invaders/`. "TEST A RELEASE" offers `v0.3.0`.

## 9. Lessons and pitfalls

- Consume movement and fire keys while playing even when host chrome keeps focus (0.5.2), or Space
  scrolls the page and arrows move focus.
- Sprites need one pale rim plus a dark silhouette to read on light and dark pages; filters and
  shadows were removed for cost.
- `CHANGELOG.md` is out of order (a stray `# 0.4.1` at the top, `# Changelog` in the middle);
  the newest entries are near the top.

## Keeping this file current

Update HANDOFF.md and FUTURE.md as part of any change that alters behaviour, architecture or
workflow. Every repo in the ecosystem keeps both files.
