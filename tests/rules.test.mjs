import test from "node:test";
import assert from "node:assert/strict";
import {
  weaponAngles,
  spawnInterval,
  waveHealth,
  MAX_ENEMIES,
  MAX_BULLETS,
} from "../src/rules.ts";
test("four waves advance from single to twin, spread and overdrive", () =>
  assert.deepEqual(
    [1, 2, 3, 4].map((n) => weaponAngles(n).length),
    [1, 2, 3, 4],
  ));
test("hard waves retain finite spawn pressure and entity caps", () => {
  assert.ok(spawnInterval(100) >= 0.42);
  assert.ok(waveHealth(4) > waveHealth(1));
  assert.equal(MAX_ENEMIES, 48);
  assert.equal(MAX_BULLETS, 80);
});
