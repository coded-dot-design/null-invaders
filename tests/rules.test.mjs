import test from "node:test";
import assert from "node:assert/strict";
import {
  weaponAngles,
  spawnInterval,
  waveHealth,
  weaponLevel,
  fireInterval,
  MAX_ENEMIES,
  MAX_BULLETS,
} from "../src/rules.ts";
test("four weapon tiers advance from single to twin, spread and overdrive", () =>
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

test("combat XP thresholds upgrade quickly and firing accelerates", () => {
  assert.deepEqual(
    [0, 7, 8, 23, 24, 49, 50, 100].map(weaponLevel),
    [1, 1, 2, 2, 3, 3, 4, 4],
  );
  assert.ok(fireInterval(4) < fireInterval(1));
});
