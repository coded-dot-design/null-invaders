// Null Invaders on Fizlet: the page is the board. Its words are terrain (a shot turns a letter
// into a 0 or 1), its buttons are invader factories, and Recall gives every letter and button back.
// The shell (engine per run, page, overlay, scoreboard, controls, touch pad, sound, sparks, popups,
// the controller the DOM VIRUS hub drives) is fizlet/arcade; the rules are ./world. This file is
// the game's definition: its scoreboard, how it reacts to what happens, and its art.
import { arcade, CALM, TARGET_HP, VH, VW } from "../vendor/fizlet/arcade";
import { WEAPON_NAMES, WEAPON_XP, weaponAngles } from "./rules.js";
import { SHIP_MUZZLE } from "./ship-art.js";
import { drawShip, drawSprite, enemySprites } from "./sprites.js";
import * as Wd from "./world.js";

declare const __KIT_CSS__: string;

// The public types are written out here (the same shapes as fizlet/arcade's), so the package's
// declarations stand alone: a consumer type-checks without the vendored engine.
export type NullInvadersStatus = "idle" | "running" | "paused" | "won" | "gameover" | "destroyed";
export interface NullInvadersStats {
  score: number;
  lives: number;
  wave: number;
  kills: number;
  alive: number;
  bullets: number;
  supplies: number;
  weapon: number;
  weaponXP: number;
  nextWeaponXP: number | null;
  combo: number;
  player: { x: number; y: number; angle: number };
  detail: string;
}
export interface NullInvadersOptions {
  /** The board: a selector or an element (default document.body). */
  root?: string | Element;
  /** Text that becomes terrain (default headings, paragraphs, list items, blockquotes). */
  textSelector?: string;
  /** Elements that become invader factories (default buttons and button-like links). */
  targetSelector?: string;
  /** More of the page to leave alone (fields, editable text and dialogs always are). */
  excludeSelector?: string;
  /** "system" (default) follows the visitor's colour scheme. */
  theme?: "dark" | "light" | "system";
  /** Same seed, same run (invader spawns, kinds, sways). */
  seed?: number;
  /** Calm effects (default: the visitor's prefers-reduced-motion). */
  reducedMotion?: boolean;
  /** Start with sound on (default true; it waits for a click or key to unlock). */
  sound?: boolean;
  /** "keyboard": the mouse never steers (default: the mouse steers until a key is pressed). */
  controls?: "mouse" | "keyboard";
  onState?: (state: NullInvadersSnapshot) => void;
  onEvent?: (event: { type: string; game: string; [key: string]: unknown }) => void;
  onError?: (error: unknown) => void;
}
export type NullInvadersSnapshot = Partial<NullInvadersStats> & {
  id: string;
  status: NullInvadersStatus;
  elapsed: number;
  frameMs: number;
  maxFrameMs: number;
  notice: string;
  /** Letters indexed, on screen and turned to bits, and the range reads the last measurement made. */
  board?: { indexed: number; visible: number; spent: number; measurements: number };
  /** Sparks alive (at most 100). */
  particles?: number;
};
export interface NullInvadersController {
  start(): NullInvadersSnapshot;
  pause(): void;
  resume(): void;
  stop(): void;
  destroy(): void;
  getSnapshot(): NullInvadersSnapshot;
}

const COLOR = "#06c4ff";
const ONLINE = WEAPON_NAMES.map((n) => `${n} ONLINE`);
const pad = (n: number, k: number) => String(n).padStart(k, "0");

export function createNullInvaders(options: NullInvadersOptions = {}): NullInvadersController {
  return arcade<NullInvadersStats>(
    {
      id: "null-invaders",
      title: "Null Invaders",
      color: COLOR,
      hint: "Move: mouse / WASD · Fire: click / Space · G: next gate",
      touchHint: "Drag the stick to fly · hold the target key to fire",
      css: __KIT_CSS__,
      fire: true,
      readouts: [["Score", "team", (v) => pad(v, 6)], ["Wave", undefined, (v) => pad(v, 2)], ["Shields", undefined, undefined, true], ["Combo", undefined, (v) => `×${v}`, true]],
      meter: { label: "Weapon upgrade progress" },
      colors: [COLOR, "#f4457a", "#cdde00", "#ee6875"],
      cues: { fire: "fire", hit: "hit", kill: "boom", "gate:down": "boom", hurt: "hurt", level: "power", "drop:collect": "power", wave: "ready", "wave:clear": "win" },
      create(ctx) {
        const world = Wd.createWorld(ctx.engine, ctx.board, ctx.ctl);
        const { s, ctl } = world;
        // The viewport and motion setting come from the shell's controls array; factory health goes back.
        const sync = () => ((s[Wd.W] = ctl[VW]!), (s[Wd.H] = ctl[VH]!), (s[Wd.REDUCED] = ctl[CALM]!), (ctl[TARGET_HP] = s[Wd.FACTORY_HP]!));
        ctx.engine.add({ read: sync });
        return {
          reset: () => (sync(), world.reset(), sync()),
          over: () => s[Wd.OVER]!,
          scroll: world.scroll,
          react(ev) {
            switch (ev.type) {
              case "score": ctx.popup(ev.x, ev.y, ev.a, null, 0); break;
              case "level": ctx.popup(s[Wd.X]!, s[Wd.Y]! - 26, 0, ONLINE[ev.a]!, 1); ctx.say(`${WEAPON_NAMES[ev.a]} ONLINE · ${weaponAngles(ev.a + 1).length} shots per burst`); ctx.emit("weapon-upgrade", { weapon: ev.a + 1, name: WEAPON_NAMES[ev.a] }); break;
              case "drop:collect": ctx.popup(s[Wd.X]!, s[Wd.Y]! - 28, 0, ev.a ? "SHIELD RESTORED" : "+8 WEAPON XP", 1); ctx.emit("supply-collected", { kind: Wd.SUPPLY_KINDS[ev.a] }); break;
              case "drop:spawn": ctx.emit("supply-drop", { kind: Wd.SUPPLY_KINDS[ev.a] }); break;
              case "hurt": ctx.popup(ev.x, ev.y, 0, "SHIELD LOST", 2); ctx.spark(ev.x, ev.y, 18, 3); ctx.emit("hurt", { lives: ev.a }); break;
              case "glyph": ctx.spark(ev.x, ev.y, 5, 0); ctx.emit("letter", { score: ev.a }); break;
              case "hit": ctx.spark(ev.x, ev.y, 6, 1); break;
              case "kill": ctx.emit("kill", { kills: ev.a, combo: ev.b }); break;
              case "gate": ctx.spark(ev.x, ev.y, 8, 2); break;
              case "gate:down": ctx.emit("gate-destroyed"); break;
              case "wave": ctx.say(`WAVE ${ev.a} · the factories are back`); ctx.emit("wave", { wave: ev.a }); break;
              case "wave:clear": ctx.say("Wave clear · +250 · next wave incoming"); ctx.emit("wave-clear", { wave: ev.a }); break;
              case "spawn": ctx.emit("spawn"); break;
              case "fire": ctx.emit("fire"); break;
            }
          },
          hud(out) {
            out[0] = world.points.points;
            out[1] = s[Wd.WAVE]!;
            out[2] = s[Wd.LIVES]!;
            out[3] = world.combo();
            out[4] = world.points.xp * 8 + world.weapon(); // the meter's change key
          },
          meter() {
            const w = world.weapon(), xp = world.points.xp, lo = WEAPON_XP[w - 1]!, hi = WEAPON_XP[w];
            return [`${WEAPON_NAMES[w - 1]} / LV ${w}`, hi === undefined ? "MAX POWER" : `${xp} / ${hi} XP`, hi === undefined ? 1 : (xp - lo) / (hi - lo)] as const;
          },
          draw(g) {
            const t = s[Wd.TIME]!, r = ctx.reduced();
            // Supply crates.
            const sp = world.supplies;
            g.lineWidth = 2;
            for (let i = 0; i < sp.count; i++) {
              const x = sp.x[i]!, y = sp.y[i]!, repair = sp.kind[i] === 1;
              g.strokeStyle = repair ? "#4bce82" : COLOR;
              g.fillStyle = "#14232c";
              g.fillRect(x - 10, y - 9, 20, 18);
              g.strokeRect(x - 10, y - 9, 20, 18);
              g.fillStyle = g.strokeStyle;
              if (repair) g.fillRect(x - 2, y - 6, 4, 12), g.fillRect(x - 6, y - 2, 12, 4);
              else {
                g.beginPath();
                g.moveTo(x + 2, y - 7); g.lineTo(x - 5, y + 1); g.lineTo(x, y + 1); g.lineTo(x - 2, y + 7); g.lineTo(x + 5, y - 1); g.lineTo(x, y - 1);
                g.closePath();
                g.fill();
              }
            }
            // Shots.
            const b = world.bullets, w = world.weapon();
            g.lineCap = "square";
            for (let i = 0; i < b.count; i++) {
              g.beginPath();
              g.moveTo(b.x[i]!, b.y[i]!);
              g.lineTo(b.x[i]! - b.vx[i]! * 0.014, b.y[i]! - b.vy[i]! * 0.014);
              g.strokeStyle = "#071c21";
              g.lineWidth = 5;
              g.stroke();
              g.strokeStyle = w === 4 ? "#cdde00" : w === 3 ? "#8573ee" : COLOR;
              g.lineWidth = 2;
              g.stroke();
            }
            // Invaders.
            const en = world.enemies;
            for (let i = 0; i < en.count; i++) {
              const frame = r ? 0 : Math.floor(en.age[i]! * 6 + en.phase[i]!) % 2;
              drawSprite(g, enemySprites[en.kind[i]!]!, frame, en.x[i]!, en.y[i]!, 0, !r && en.flash[i]! > t);
              if (en.hp[i]! > 1) {
                g.fillStyle = "#201329";
                g.fillRect(en.x[i]! - 5, en.y[i]! - 19, 10, 4);
                g.fillStyle = "#fff1c1";
                g.fillRect(en.x[i]! - 4, en.y[i]! - 18, 3, 2);
                g.fillRect(en.x[i]! + 1, en.y[i]! - 18, 3, 2);
              }
            }
            // The ship, its shield and the muzzle flash.
            g.save();
            g.translate(s[Wd.X]!, s[Wd.Y]!);
            g.rotate(s[Wd.A]! + Math.PI / 2);
            if (s[Wd.SHIELD]! > 0) {
              g.strokeStyle = COLOR;
              g.globalAlpha = 0.6;
              g.lineWidth = 2;
              g.beginPath();
              g.arc(0, 0, 25, 0, 6.2832);
              g.stroke();
              g.globalAlpha = 1;
            }
            drawShip(g, w, Wd.POSES[s[Wd.POSE]!]!, r ? 0 : Math.floor(s[Wd.ENGINE_T]! * 12) % 2, 0, 0);
            if (s[Wd.MUZZLE]! > t && !r) (g.fillStyle = "#fff5d7"), g.fillRect(-1, -SHIP_MUZZLE - 1, 2, 3);
            g.restore();
          },
          stats() {
            const w = world.weapon(), up = s[Wd.UPGRADE]! > s[Wd.TIME]!;
            let gates = 0;
            for (const t of ctx.board.targets) if (t.hp > 0) gates++;
            return {
              score: world.points.points, lives: s[Wd.LIVES]!, wave: s[Wd.WAVE]!, kills: s[Wd.KILLS]!, alive: world.enemies.count, bullets: world.bullets.count,
              supplies: world.supplies.count, weapon: w, weaponXP: world.points.xp, nextWeaponXP: WEAPON_XP[w] ?? null, combo: world.combo(),
              player: { x: s[Wd.X]!, y: s[Wd.Y]!, angle: s[Wd.A]! },
              detail: s[Wd.BREAK]! > 0 ? "Wave clear · +250 · next wave incoming" : up ? `${WEAPON_NAMES[w - 1]} ONLINE · ${weaponAngles(w).length} shots per burst` : `${weaponAngles(w).length} SHOT · ${gates} FACTORIES · Space / click to fire`,
            };
          },
        };
      },
    },
    options,
  );
}
