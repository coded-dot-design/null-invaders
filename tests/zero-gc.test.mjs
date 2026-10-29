// The zero-allocation check in its own file, so `npm test` (one file at a time) and `fe port-check`
// run it in a process where no other test shapes what V8 learns (fizlet-engine lesson T4).
import test from "node:test";
import assert from "node:assert/strict";
import * as W from "../src/world.ts";
import { game } from "./fixtures/world.mjs";
import { minorGCs } from "./gc.mjs";

test("a busy battle steps without allocating (no minor GC in 20 000 steps)", async () => {
  const g = game({ targets: [[100, 600, 120, 40], [700, 500, 100, 30]] }, 3);
  const steer = (wd) => {
    wd.ctl[W.KX] = Math.sin(wd.s[W.TIME]);
    wd.ctl[W.KY] = Math.cos(wd.s[W.TIME]);
    wd.ctl[W.FIRE] = 1;
    wd.s[W.SHIELD] = 9; // stay alive
    for (const t of g.board.targets) if (t.hp < 20) t.hp = 100; // keep the factories up
  };
  g.run(5, steer); // warm up (JIT, pools)
  assert.ok(g.w.enemies.count > 0 && g.w.bullets.count > 0, "the battle is busy");
  const gcs = await minorGCs(() => {
    for (let k = 0; k < 20000; k++) {
      steer(g.w);
      g.e.advance(1 / 60);
    }
  });
  assert.equal(gcs, 0);
});
