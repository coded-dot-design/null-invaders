import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { resolve } from "node:path";
const result = await build({
  entryPoints: ["src/simulation.ts"],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  alias: { "@coded-design/dom-virus": resolve("shared/core.js") },
});
const { createGame } = await import(
  "data:text/javascript;base64," +
    Buffer.from(result.outputFiles[0].text).toString("base64")
);
function fixture() {
  const events = [],
    popups = [];
  const api = {
    width: 1000,
    height: 800,
    time: 0,
    options: {},
    input: { keys: new Set(), mode: "keyboard", pointer: {active:false,x:0,y:0} },
    random: () => 0.5,
    reducedMotion: true,
    firing: false,
    emit: (type, data) => events.push({ type, ...data }),
    burst() {},
    popup: (...args) => popups.push(args),
    move() {},
    finish(won) {
      this.finished = won;
    },
    board: {
      targets: [
        { id: "gate", health: 80, maxHealth: 80, visible: false, rect: null },
      ],
      resetTargets(h) {
        for (const t of this.targets) t.health = t.maxHealth = h;
      },
      hitSegment() {
        return null;
      },
      consume(g) {
        if (g.spent) return false;
        g.spent = true;
        return true;
      },
      damage(t, n) {
        t.health = Math.max(0, t.health - n);
        return true;
      },
    },
  };
  const game = createGame(api);
  game.reset();
  const tick = (dt = 0.02) => {
    api.time += dt;
    game.update(dt);
  };
  return { api, game, events, popups, tick };
}
test("letters unlock all four weapons during wave one and restart clears XP", () => {
  const { api, game, events, popups, tick } = fixture();
  api.firing = true;
  api.board.hitSegment = () => ({ glyph: { spent: false }, t: 0.5 });
  let ticks = 0;
  while (game.snapshot().weapon < 4 && ticks++ < 1000) tick();
  const state = game.snapshot();
  assert.equal(state.wave, 1);
  assert.equal(state.weapon, 4);
  assert.ok(state.weaponXP >= 50);
  assert.ok(api.time < 10, "rapid hits upgrade within the opening seconds");
  assert.deepEqual(
    events.filter((e) => e.type === "weapon-upgrade").map((e) => e.weapon),
    [2, 3, 4],
  );
  assert.equal(state.hud.progress, 1);
  assert.equal(state.nextWeaponXP, null);
  assert.ok(popups.some((p) => p[2] === "OVERDRIVE ONLINE"));
  game.reset();
  assert.equal(game.snapshot().weapon, 1);
  assert.equal(game.snapshot().weaponXP, 0);
  assert.equal(game.snapshot().score, 0);
  assert.equal(game.snapshot().bullets, 0);
});
test("destroying a factory stops its spawns and rewards gun XP", () => {
  const { api, game, events, tick } = fixture();
  const target = api.board.targets[0];
  target.visible = true;
  target.rect = {
    left: 480,
    right: 520,
    top: 480,
    bottom: 500,
    width: 40,
    height: 20,
  };
  api.firing = true;
  for (let i = 0; i < 45; i++) tick();
  assert.equal(target.health, 0);
  assert.equal(game.snapshot().weapon, 2);
  assert.equal(events.filter((e) => e.type === "gate-destroyed").length, 1);
  assert.equal(events.filter((e) => e.type === "spawn").length, 0);
  // Intermission has not respawned the next wave yet.
  assert.equal(game.snapshot().wave, 1);
});
test("misses give no XP, projectiles stay bounded and expire", () => {
  const { api, game, tick } = fixture();
  api.firing = true;
  for (let i = 0; i < 500; i++) tick();
  assert.equal(game.snapshot().weapon, 1);
  assert.equal(game.snapshot().weaponXP, 0);
  assert.ok(game.snapshot().bullets <= 80);
  api.firing = false;
  for (let i = 0; i < 100; i++) tick();
  assert.equal(game.snapshot().bullets, 0);
});

test("charge drops require collection and grant weapon XP once", () => {
  const { api, game, tick, events } = fixture();
  for (let i = 0; i < 350; i++) tick();
  assert.equal(game.snapshot().supplies, 1);
  assert.equal(game.snapshot().weaponXP, 0);
  api.move = (p) => {
    p.x = 580;
    p.y = 490;
  };
  tick();
  assert.equal(game.snapshot().weaponXP, 8);
  assert.equal(game.snapshot().weapon, 2);
  assert.equal(game.snapshot().supplies, 0);
  tick();
  assert.equal(game.snapshot().weaponXP, 8);
  assert.equal(events.filter((e) => e.type === "supply-collected").length, 1);
  game.reset();
  assert.equal(game.snapshot().supplies, 0);
});
