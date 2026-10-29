// The world under test, headless: a Fizlet engine stepped by hand and a fake page (a row of letters,
// factories). Shared by tests/world.test.mjs and tests/zero-gc.test.mjs.
import { createEngine } from "../../vendor/fizlet/index.ts";
import * as W from "../../src/world.ts";

/** A page: `letters` 10 px glyphs in a row at y = 100, plus factories (rects). Allocation-free hit. */
export function page({ letters = 40, targets = [] } = {}) {
  const gx = new Float64Array(letters), spent = new Uint8Array(letters);
  for (let i = 0; i < letters; i++) gx[i] = 300 + i * 12;
  return {
    targets: targets.map(([x, y, w, h]) => ({ x, y, w, h, hp: 100 })),
    spent,
    hitAt(p, at) {
      const x0 = p[at], y0 = p[at + 1], dx = p[at + 2] - x0, dy = p[at + 3] - y0;
      let best = -1;
      p[at + 4] = 2;
      for (let i = 0; i < letters; i++) {
        if (spent[i]) continue;
        // The slab test inline (a helper call would box its number arguments).
        let lo = 0, hi = 1;
        for (let ax = 0; ax < 2; ax++) {
          const s0 = ax ? y0 : x0, d = ax ? dy : dx, min = (ax ? 100 : gx[i]) - 2, max = (ax ? 116 : gx[i] + 10) + 2;
          if (d) {
            const u = (min - s0) / d, v = (max - s0) / d;
            lo = Math.max(lo, u < v ? u : v);
            hi = Math.min(hi, u < v ? v : u);
          } else if (s0 < min || s0 > max) lo = 2;
        }
        if (lo <= hi && lo < p[at + 4]) (p[at + 4] = lo), (best = i);
      }
      return best;
    },
    consume(i) {
      if (spent[i]) return false;
      return (spent[i] = 1), true;
    },
  };
}
export function game(opts = {}, seed = 7) {
  const e = createEngine({ seed, events: 512 });
  const board = page(opts);
  const w = W.createWorld(e, board);
  w.s[W.W] = 1000;
  w.s[W.H] = 800;
  w.reset();
  const seen = [];
  const run = (sec, each) => {
    for (let k = 0; k < Math.round(sec * 60); k++) {
      each?.(w);
      e.advance(1 / 60);
      for (let i = 0; i < e.events.size; i++) seen.push(e.events.at(i).type);
    }
  };
  return { e, w, board, seen, run };
}
