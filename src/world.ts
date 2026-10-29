// Null Invaders, the rules: the ship, the invaders, the shots, the factories (page buttons), the
// supply drops and the waves, as one Fizlet system. DOM-free: the page comes in through `Board`
// (fizlet/board-page in the game, a fake in tests) and the controls through `ctl`, written in the
// read phase. Every running number lives in a typed array, so a step never allocates.
// What happens goes on the engine's event ring; the game layer turns it into sound, sparks,
// popups and the HUD.
import type { Engine, System } from "../vendor/fizlet/kernel/engine";
import { drops, score } from "../vendor/fizlet/rules";
import { MAX_BULLETS, MAX_ENEMIES, fireInterval, spawnInterval, waveHealth, weaponAngles } from "./rules.js";
import { SHIP_MUZZLE } from "./ship-art.js";

/** A page target (a factory): viewport rect, w = 0 while it is off screen; hp is the game's. */
export interface Target {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
}
/** The page as the board (fizlet/board-page satisfies it). */
export interface Board {
  readonly targets: readonly Target[];
  /** First unspent glyph the segment touches, or -1; how far along it is `t`. */
  hit(x0: number, y0: number, x1: number, y1: number): number;
  readonly t: number;
  consume(i: number, as?: "binary" | "erase"): boolean;
}

/** Controls, written once per frame before the steps: mode (0 keys/stick, 1 pointer), pointer x, y,
 *  pointer on (1/0), move x, y (-1..1), fire (1/0). */
export const MODE = 0, PX = 1, PY = 2, PON = 3, KX = 4, KY = 5, FIRE = 6;
/** World state slots. Read them for the HUD and drawing; the game writes only W, H and REDUCED. */
export const W = 0, H = 1, X = 2, Y = 3, A = 4, SHIELD = 5, LIVES = 6, WAVE = 7, KILLS = 8, SHOT_IN = 9, SPAWN_IN = 10;
export const BREAK = 11, STREAK = 12, COMBO_IN = 13, UPGRADE = 14, SUPPLY_IN = 15, SUPPLY_TURN = 16, POSE = 17;
export const ENGINE_T = 18, BANK_UNTIL = 19, BANK_SIGN = 20, MUZZLE = 21, OVER = 22, TIME = 23, REDUCED = 24, FACTORY_HP = 25;
/** Ship poses (ship-art order). */
export const POSES = ["idle", "thrust", "bank-left", "bank-right"] as const;
export const SUPPLY_KINDS = ["charge", "repair"] as const;
const SPEED = 360;

/** Where segment (x0, y0) → (x1, y1) first enters the rect padded by `pad`, as 0..1, or 2 for a miss. */
export function segRect(x0: number, y0: number, x1: number, y1: number, l: number, t: number, r: number, b: number, pad: number) {
  let lo = 0, hi = 1;
  for (let axis = 0; axis < 2; axis++) {
    const p = axis ? y0 : x0, d = axis ? y1 - y0 : x1 - x0, min = (axis ? t : l) - pad, max = (axis ? b : r) + pad;
    if (d) {
      let u = (min - p) / d, v = (max - p) / d;
      if (u > v) {
        const swap = u;
        u = v;
        v = swap;
      }
      if (u > lo) lo = u;
      if (v < hi) hi = v;
    } else if (p < min || p > max) return 2;
  }
  return lo <= hi ? lo : 2;
}

export function createWorld(e: Engine, board: Board) {
  const s = new Float64Array(26), ctl = new Float64Array(7);
  // Invaders: x, y, age, type, sway phase, hp, hit flash until; alive ones are 0 to `n[0]` − 1.
  const ex = new Float64Array(MAX_ENEMIES), ey = new Float64Array(MAX_ENEMIES), age = new Float64Array(MAX_ENEMIES);
  const kind = new Uint8Array(MAX_ENEMIES), phase = new Float64Array(MAX_ENEMIES), ehp = new Uint8Array(MAX_ENEMIES), flash = new Float64Array(MAX_ENEMIES);
  // Shots: x, y, vx, vy, life; live ones are 0 to `n[1]` − 1.
  const bx = new Float64Array(MAX_BULLETS), by = new Float64Array(MAX_BULLETS), vx = new Float64Array(MAX_BULLETS), vy = new Float64Array(MAX_BULLETS), life = new Float64Array(MAX_BULLETS);
  const n = new Int32Array(2), EN = 0, BN = 1;
  // Supply crates (fizlet/rules drops: the DOM VIRUS core's SupplyDrops numbers) and the score:
  // points, XP and the weapon level from XP 8 / 24 / 50. The combo is Null Invaders' own (kills
  // build it, letters only keep it alive), so the brick's combo is off.
  const supplies = drops(e, { kinds: SUPPLY_KINDS });
  const points = score(e, { combo: false, levels: [8, 24, 50] });
  const combo = () => Math.min(5, 1 + Math.floor(s[STREAK]! / 3));
  const weapon = () => points.level + 1;

  function award(p: number, xp: number, x: number, y: number) {
    const before = points.level;
    points.add(p, xp, x, y);
    if (points.level > before) (s[SHOT_IN] = 0), (s[UPGRADE] = s[TIME]! + 2.2);
  }
  function resetTargets(hp: number) {
    s[FACTORY_HP] = hp;
    for (let i = 0; i < board.targets.length; i++) board.targets[i]!.hp = hp;
  }
  const removeEnemy = (i: number) => {
    const j = --n[EN]!;
    ex[i] = ex[j]!; ey[i] = ey[j]!; age[i] = age[j]!; kind[i] = kind[j]!; phase[i] = phase[j]!; ehp[i] = ehp[j]!; flash[i] = flash[j]!;
  };
  const removeBullet = (i: number) => {
    const j = --n[BN]!;
    bx[i] = bx[j]!; by[i] = by[j]!; vx[i] = vx[j]!; vy[i] = vy[j]!; life[i] = life[j]!;
  };
  // A new invader drops out of a random live factory on screen (or the top edge on a page with none).
  function spawn() {
    if (n[EN]! >= MAX_ENEMIES) return;
    const ts = board.targets;
    let x = 0, y = 8, live = 0;
    for (let i = 0; i < ts.length; i++) if (ts[i]!.w > 0 && ts[i]!.hp > 0) live++;
    if (!ts.length) x = e.random() * s[W]!;
    else {
      if (!live) return;
      let pick = Math.min(live - 1, Math.floor(e.random() * live));
      for (let i = 0; i < ts.length; i++) {
        const t = ts[i]!;
        if (!(t.w > 0 && t.hp > 0) || pick-- !== 0) continue;
        x = t.x + t.w / 2;
        y = t.y + t.h / 2;
        break;
      }
    }
    const i = n[EN]!++;
    ex[i] = x; ey[i] = y; age[i] = 0; kind[i] = Math.floor(e.random() * 3); phase[i] = e.random() * 6.28;
    ehp[i] = s[WAVE]! >= 3 ? 2 : 1; flash[i] = 0;
    e.events.emit("spawn", i, 0, x, y);
  }

  function reset() {
    // The viewport and the motion setting belong to the page, not the round: keep them.
    const w = s[W]!, h = s[H]!, calm = s[REDUCED]!;
    s.fill(0);
    s[W] = w; s[H] = h; s[REDUCED] = calm;
    s[X] = s[W]! * 0.5; s[Y] = s[H]! * 0.7; s[A] = -Math.PI / 2;
    s[LIVES] = 3; s[WAVE] = 1; s[SPAWN_IN] = 1; s[SHIELD] = 2; s[SUPPLY_IN] = 6;
    n[EN] = n[BN] = 0;
    supplies.reset();
    points.reset();
    resetTargets(waveHealth(1));
  }
  function finish(won: boolean) {
    s[OVER] = won ? 2 : 1;
    e.events.emit("over", won ? 1 : 0, points.points);
  }
  function move(dt: number) {
    let dx = 0, dy = 0;
    if (ctl[MODE] === 1) {
      if (ctl[PON]) {
        dx = ctl[PX]! - s[X]!;
        dy = ctl[PY]! - s[Y]!;
        const d = Math.hypot(dx, dy);
        if (d > 4) {
          const step = Math.min(SPEED * dt, d);
          s[X]! += (dx / d) * step;
          s[Y]! += (dy / d) * step;
          s[A] = Math.atan2(dy, dx);
        }
      }
    } else {
      dx = ctl[KX]!;
      dy = ctl[KY]!;
      const d = Math.hypot(dx, dy);
      if (d) {
        s[X]! += (dx / d) * SPEED * dt;
        s[Y]! += (dy / d) * SPEED * dt;
        s[A] = Math.atan2(dy, dx);
      }
    }
    s[X] = Math.min(Math.max(s[X]!, 14), s[W]! - 14);
    s[Y] = Math.min(Math.max(s[Y]!, 14), s[H]! - 14);
  }

  function step(dt: number) {
    if (s[OVER]) return;
    const time = (s[TIME]! += dt);
    s[SHIELD] = Math.max(0, s[SHIELD]! - dt);
    s[COMBO_IN] = Math.max(0, s[COMBO_IN]! - dt);
    if (!s[COMBO_IN]) s[STREAK] = 0;

    // The ship: follows the pointer, or the keys / stick. It banks while it turns.
    const ox = s[X]!, oy = s[Y]!, oa = s[A]!;
    move(dt);
    const intended = ctl[MODE] === 1 ? ctl[PON] === 1 : ctl[KX] !== 0 || ctl[KY] !== 0;
    if (intended && Math.hypot(s[X]! - ox, s[Y]! - oy) > 0.01) {
      s[ENGINE_T]! += dt;
      const turn = Math.atan2(Math.sin(s[A]! - oa), Math.cos(s[A]! - oa));
      if (Math.abs(turn) > 0.018) (s[BANK_SIGN] = Math.sign(turn)), (s[BANK_UNTIL] = time + 0.14);
      s[POSE] = !s[REDUCED] && time < s[BANK_UNTIL]! ? (s[BANK_SIGN]! < 0 ? 2 : 3) : 1;
    } else s[POSE] = 0;

    // Supplies: every 12 s (the first after 6), charge and repair in turn, ahead of the ship.
    if ((s[SUPPLY_IN]! -= dt) <= 0) {
      s[SUPPLY_IN] = 12;
      const k = s[SUPPLY_TURN]!++ % 2 ? 1 : 0;
      supplies.spawn(Math.min(Math.max(s[X]! + 80, 25), s[W]! - 25), Math.min(Math.max(s[Y]! - 70, 90), s[H]! - 25), k);
    }
    const got = supplies.collect(s[X]!, s[Y]!, 24);
    if (got === "charge") award(50, 8, s[X]!, s[Y]!);
    else if (got === "repair") (s[LIVES] = Math.min(3, s[LIVES]! + 1)), (s[SHIELD] = Math.max(s[SHIELD]!, 1));

    // Between waves: a two-second breather, then the next wave with fresh factories.
    if (s[BREAK]! > 0) {
      if ((s[BREAK]! -= dt) <= 0) {
        s[WAVE]!++;
        resetTargets(waveHealth(s[WAVE]!));
        s[SPAWN_IN] = 1;
        s[SHIELD] = 1.5;
        e.events.emit("wave", s[WAVE]);
      }
      return;
    }
    if ((s[SPAWN_IN]! -= dt) <= 0) {
      s[SPAWN_IN] = spawnInterval(s[WAVE]!);
      for (let i = 0, k = Math.min(s[WAVE]!, 3); i < k; i++) spawn();
    }
    s[SHOT_IN]! -= dt;
    if (ctl[FIRE] && s[SHOT_IN]! <= 0) {
      const w = weapon(), spread = weaponAngles(w);
      s[SHOT_IN] = fireInterval(w);
      s[MUZZLE] = time + 0.045;
      if (n[BN]! < MAX_BULLETS) e.events.emit("fire", w);
      for (let k = 0; k < spread.length && n[BN]! < MAX_BULLETS; k++) {
        const a = s[A]! + spread[k]!, i = n[BN]!++;
        bx[i] = s[X]! + Math.cos(a) * SHIP_MUZZLE;
        by[i] = s[Y]! + Math.sin(a) * SHIP_MUZZLE;
        vx[i] = Math.cos(a) * 660;
        vy[i] = Math.sin(a) * 660;
        life[i] = 1.5;
      }
    }

    // Shots: the nearest thing along this step's path takes the hit (a letter, an invader, a factory).
    const ts = board.targets;
    for (let i = n[BN]! - 1; i >= 0; i--) {
      const x0 = bx[i]!, y0 = by[i]!;
      const x1 = (bx[i] = x0 + vx[i]! * dt), y1 = (by[i] = y0 + vy[i]! * dt);
      life[i]! -= dt;
      const glyph = board.hit(x0, y0, x1, y1);
      let near = glyph >= 0 ? board.t : 2, what = glyph >= 0 ? 1 : 0, which = glyph;
      for (let j = 0; j < n[EN]!; j++) {
        const t = segRect(x0, y0, x1, y1, ex[j]! - 13, ey[j]! - 12, ex[j]! + 13, ey[j]! + 12, 2);
        if (t < near) (near = t), (what = 2), (which = j);
      }
      for (let j = 0; j < ts.length; j++) {
        const g = ts[j]!;
        if (!(g.w > 0 && g.hp > 0)) continue;
        const t = segRect(x0, y0, x1, y1, g.x, g.y, g.x + g.w, g.y + g.h, 2);
        if (t < near) (near = t), (what = 3), (which = j);
      }
      if (what) {
        const x = x0 + (x1 - x0) * near, y = y0 + (y1 - y0) * near;
        if (what === 1) {
          if (board.consume(which, "binary")) {
            award(2, 1, x, y);
            if (s[STREAK]) s[COMBO_IN] = 3;
            e.events.emit("glyph", points.points, 0, x, y);
          }
        } else if (what === 2) {
          flash[which] = time + 0.08;
          e.events.emit("hit", which, 0, x, y);
          if (--ehp[which]! <= 0) {
            removeEnemy(which);
            award(25 * combo(), 4, x, y);
            s[STREAK]!++;
            s[COMBO_IN] = 3;
            s[KILLS]!++;
            e.events.emit("kill", s[KILLS], combo(), x, y);
          }
        } else {
          const g = ts[which]!;
          g.hp = Math.max(0, g.hp - 20);
          award(5, 2, x, y);
          e.events.emit("gate", which, g.hp, x, y);
          if (g.hp === 0) {
            award(150, 8, x, y - 10);
            e.events.emit("gate:down", which, 0, x, y);
          }
        }
      }
      if (what || life[i]! <= 0 || x1 < -30 || y1 < -30 || x1 > s[W]! + 30 || y1 > s[H]! + 30) removeBullet(i);
    }

    // Invaders home in on the ship with a sway; touching it without a shield costs a life.
    const sp0 = 45 + s[WAVE]! * 13;
    for (let i = n[EN]! - 1; i >= 0; i--) {
      age[i]! += dt;
      const a = Math.atan2(s[Y]! - ey[i]!, s[X]! - ex[i]!), speed = sp0 + kind[i]! * 12, sway = Math.sin(age[i]! * 3 + phase[i]!) * 24;
      const c = Math.cos(a), sn = Math.sin(a);
      ex[i]! += (c * speed - sn * sway) * dt;
      ey[i]! += (sn * speed + c * sway) * dt;
      if (s[SHIELD]! <= 0 && Math.hypot(s[X]! - ex[i]!, s[Y]! - ey[i]!) < 24) {
        s[LIVES]!--;
        s[STREAK] = s[COMBO_IN] = 0;
        s[SHIELD] = 2;
        removeEnemy(i);
        e.events.emit("hurt", s[LIVES], 0, s[X], s[Y]);
        if (s[LIVES]! <= 0) return finish(false);
      } else if (ey[i]! < -s[H]! || ey[i]! > s[H]! * 2 || ex[i]! < -s[W]! || ex[i]! > s[W]! * 2) removeEnemy(i);
    }

    // A wave clears when every factory is down (or 18 kills a wave on a page with none) and no
    // invader is left. Four waves win.
    let cleared = ts.length > 0;
    for (let i = 0; i < ts.length; i++) if (ts[i]!.hp > 0) cleared = false;
    if (!ts.length) cleared = s[KILLS]! >= s[WAVE]! * 18;
    if (cleared && !n[EN]) {
      if (s[WAVE]! >= 4) return finish(true);
      s[BREAK] = 2;
      award(250, 4, s[X]!, s[Y]! - 20);
      n[BN] = 0;
      e.events.emit("wave:clear", s[WAVE]);
    }
  }

  const system: System = { step: (_e, dt) => step(dt) };
  e.add(system);
  return {
    system,
    /** State slots (W, H, X, Y, A, SHIELD, LIVES, WAVE, …). */
    s,
    /** Controls for the next steps (MODE, PX, PY, PON, KX, KY, FIRE). */
    ctl,
    enemies: { x: ex, y: ey, age, kind, phase, hp: ehp, flash, get count() { return n[EN]!; } },
    bullets: { x: bx, y: by, vx, vy, get count() { return n[BN]!; } },
    supplies,
    points,
    combo,
    weapon,
    reset,
    /** Start the next wave's factories over (a rescan found new ones mid-wave keeps theirs). */
    resetTargets,
    /** The page scrolled by (dx, dy): everything in page space moves with it (the ship stays). */
    scroll(dx: number, dy: number) {
      for (let i = 0; i < n[EN]!; i++) (ex[i]! -= dx), (ey[i]! -= dy);
      for (let i = 0; i < n[BN]!; i++) (bx[i]! -= dx), (by[i]! -= dy);
      supplies.scroll(dx, dy);
    },
  };
}
export type World = ReturnType<typeof createWorld>;
