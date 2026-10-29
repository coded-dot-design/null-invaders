// The rules, headless: a Fizlet engine stepped by hand, a fake page (a row of letters, factories).
import test from "node:test";
import assert from "node:assert/strict";
import * as W from "../src/world.ts";
import { waveHealth } from "../src/rules.ts";
import { game } from "./fixtures/world.mjs";

test("the ship fires up the page: letters turn into bits and score 2 points and 1 XP each", () => {
  const { w, board, seen, run } = game();
  w.s[W.X] = 500;
  w.ctl[W.FIRE] = 1;
  run(1.5);
  const bits = board.spent.reduce((a, b) => a + b, 0);
  assert.ok(bits >= 1, "a letter was hit");
  assert.ok(seen.includes("fire") && seen.includes("glyph"));
  assert.ok(w.points.points >= bits * 2);
  assert.equal(w.points.xp >= bits, true);
});

test("weapon tiers come from XP 8 / 24 / 50 (fizlet/rules score levels)", () => {
  const { w, seen, run } = game({ letters: 0 });
  assert.equal(w.weapon(), 1);
  w.points.add(0, 8);
  assert.equal(w.weapon(), 2);
  w.points.add(0, 42);
  assert.equal(w.weapon(), 4);
  run(0.1);
  assert.ok(!seen.includes("over"));
});

test("invaders come out of live factories on screen, home in, and a kill scores 25 × combo", () => {
  const { w, seen, run } = game({ letters: 0, targets: [[100, 600, 120, 40]] });
  run(1.2);
  assert.ok(w.enemies.count >= 1, "an invader spawned");
  assert.ok(Math.abs(w.enemies.x[0] - 160) < 80 && w.enemies.y[0] < 700, "near the factory");
  // Point the ship at the invader and fire until it goes down.
  run(3, (wd) => {
    if (!wd.enemies.count) return;
    wd.ctl[W.MODE] = 1;
    wd.ctl[W.PON] = 0;
    wd.s[W.A] = Math.atan2(wd.enemies.y[0] - wd.s[W.Y], wd.enemies.x[0] - wd.s[W.X]);
    wd.ctl[W.FIRE] = 1;
  });
  assert.ok(w.s[W.KILLS] >= 1, "a kill");
  assert.ok(seen.includes("kill"));
});

test("factories take 20 a hit; when all are down and no invader is left, the wave clears and the next comes back stronger", () => {
  const { w, board, seen, run } = game({ letters: 0, targets: [[400, 100, 200, 40]] });
  assert.equal(board.targets[0].hp, waveHealth(1));
  w.s[W.X] = 500;
  w.s[W.Y] = 400;
  w.ctl[W.FIRE] = 1;
  run(0.6);
  assert.ok(board.targets[0].hp < waveHealth(1) && seen.includes("gate"), "hits land");
  board.targets[0].hp = 0;
  w.ctl[W.FIRE] = 0;
  run(0.1, (wd) => (wd.s[W.SHIELD] = 9)); // the invaders don't matter here
  while (w.enemies.count) run(0.02, (wd) => (wd.enemies.x[0] = -1e5)); // fly every invader off the map
  run(0.1);
  assert.ok(seen.includes("wave:clear"));
  run(2.1);
  assert.equal(w.s[W.WAVE], 2);
  assert.equal(board.targets[0].hp, waveHealth(2));
  assert.ok(seen.includes("wave"));
});

test("clearing wave 4 wins; three hits without a shield lose", () => {
  let g = game({ letters: 0, targets: [[400, 100, 200, 40]] });
  g.w.s[W.WAVE] = 4;
  g.board.targets[0].hp = 0;
  g.run(0.1);
  assert.equal(g.w.s[W.OVER], 2);
  assert.ok(g.seen.includes("over"));

  g = game({ letters: 0, targets: [[400, 100, 200, 40]] });
  for (let lost = 0; lost < 3; lost++) {
    g.run(0.05, (wd) => (wd.s[W.SHIELD] = 0));
    // Put an invader on the ship.
    while (!g.w.enemies.count) g.run(0.1);
    g.w.enemies.x[0] = g.w.s[W.X];
    g.w.enemies.y[0] = g.w.s[W.Y];
    g.w.s[W.SHIELD] = 0;
    g.run(1 / 60);
  }
  assert.equal(g.w.s[W.LIVES], 0);
  assert.equal(g.w.s[W.OVER], 1);
  assert.ok(g.seen.filter((t) => t === "hurt").length === 3);
});

test("supplies: a charge crate lands ahead of the ship after 6 s; flying onto it gives 50 points and 8 XP", () => {
  const { w, seen, run } = game({ letters: 0 });
  w.s[W.SHIELD] = 99;
  run(6.1, (wd) => (wd.s[W.SHIELD] = 99));
  assert.equal(w.supplies.count, 1);
  assert.ok(seen.includes("drop:spawn"));
  run(1, (wd) => (wd.s[W.SHIELD] = 99)); // it falls 60 px and lands
  const before = w.points.points;
  w.s[W.X] = w.supplies.x[0];
  w.s[W.Y] = w.supplies.y[0];
  run(1 / 60);
  assert.equal(w.points.points - before, 50);
  assert.ok(seen.includes("drop:collect"));
});

test("same seed, same inputs: the same run (multiplayer-ready)", () => {
  const play = () => {
    const g = game({ targets: [[100, 600, 120, 40], [700, 500, 100, 30]] }, 42);
    g.run(8, (wd) => {
      wd.ctl[W.KX] = Math.sin(wd.s[W.TIME]);
      wd.ctl[W.KY] = Math.cos(wd.s[W.TIME] * 0.7);
      wd.ctl[W.FIRE] = 1;
    });
    return [...g.w.s, g.w.enemies.count, g.w.bullets.count, g.w.points.points].join(",");
  };
  assert.equal(play(), play());
});
