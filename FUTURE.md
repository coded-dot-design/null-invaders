# Null Invaders: Future phases

Repo-specific items. The shared roadmap (controls layer, hub performance, hardening, platform) is
the hub [FUTURE.md](https://github.com/coded-dot-design/dom-virus/blob/main/FUTURE.md). Phase 1
state is in [HANDOFF.md](HANDOFF.md). Move items to `CHANGELOG.md` when they ship.

## Phase 2

### Controls layer (shared, top priority)

- Drop the per-game control wiring. Declare an intent map instead: `move` (8-way analog), `fire`,
  and the pointer fly/aim intent, and let the shared controls layer render keyboard, gamepad and
  touch for each device.
- Pass analog stick magnitude through when the layer supports it, so a light push flies slower
  than a full one (today the stick emulates arrow keys).
- Surface the HUD auto-fire toggle as a declared option of the `fire` intent, so touch players get
  it without extra wiring.

### Gameplay

- A boss factory every few waves (a large button with several weak points).
- Weapon variety past OVERDRIVE (for example a piercing beam that consumes a whole word).
- Alien behaviours per type (drones swarm, crabs strafe, squids dive) instead of shared movement.

### Performance and size

- Re-tighten the 24 KB gzip budget after the controls layer lands (the touch kit added ~2 KB).
- Measure late-wave frames with 48 aliens and 80 bullets on a low-end Android device.

### Tests

- A browser smoke test in this repo (start, fly, fire, destroy a factory, Recall).
- Touch coverage: stick + Fire multi-touch and key consumption while host chrome has focus.

### Accessibility

- Announce weapon upgrades and factory destruction for screen readers.
- Reduced-motion review of thrust/bank frames and hit effects.

### Docs and content cleanup

- `README.md` still documents `npm run site:build` / `site:preview` and Pages hosting of the
  retired site, says touch devices "receive a D-pad", and quotes a 22 KB budget (now 24 KB).
- `src/index.ts` hint says "G: next gate" while `site/game.json` says "G — next factory"; pick one
  word for players.
- Reorder `CHANGELOG.md` (stray `# 0.4.1` at the top, `# Changelog` in the middle).

## Phase 3

- Co-op mode: two interceptors on one page (needs an input model for two players first).
- Cross-game cameos, for example Swarm bugs or Byte Runner flies as alien types, through a shared
  entity adapter rather than copied art.
- Engine API docs with Null Invaders as the smallest complete example game.
