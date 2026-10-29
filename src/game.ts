// Null Invaders on Fizlet: the page is the board. Its words are terrain (a shot turns a letter
// into a 0 or 1), its buttons are invader factories, and Recall gives every letter and button back.
// One engine per run: the world (./world) is the rules; this file is the page, the canvas, the
// HUD (the Board UI kit: Battlefield's keys and readouts) and the controller the DOM VIRUS hub
// drives (start, pause, resume, stop, destroy, getSnapshot).
import { createEngine } from "../vendor/fizlet/index";
import type { Engine, System } from "../vendor/fizlet/kernel/engine";
import { boardPage } from "../vendor/fizlet/board-page";
import { controls } from "../vendor/fizlet/input";
import { pad } from "../vendor/fizlet/pad";
import { sound } from "../vendor/fizlet/sound";
import { mount, readouts, toast } from "../vendor/fizlet/ui/board-ui";
import { WEAPON_NAMES, WEAPON_XP, weaponAngles } from "./rules.js";
import { SHIP_MUZZLE } from "./ship-art.js";
import { drawShip, drawSprite, enemySprites } from "./sprites.js";
import * as Wd from "./world.js";

declare const __KIT_CSS__: string;

export type NullInvadersStatus = "idle" | "running" | "paused" | "won" | "gameover" | "destroyed";
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
  onEvent?: (event: { type: string; game: "null-invaders"; [key: string]: unknown }) => void;
  onError?: (error: unknown) => void;
}
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
export interface NullInvadersSnapshot extends Partial<NullInvadersStats> {
  id: "null-invaders";
  status: NullInvadersStatus;
  elapsed: number;
  frameMs: number;
  maxFrameMs: number;
  notice: string;
}
export interface NullInvadersController {
  start(): NullInvadersSnapshot;
  pause(): void;
  resume(): void;
  stop(): void;
  destroy(): void;
  getSnapshot(): NullInvadersSnapshot;
}

const COLOR = "#06c4ff", HINT = "Move: mouse / WASD · Fire: click / Space · G: next gate", TOUCH_HINT = "Drag the stick to fly · hold the target key to fire";
const EDIT = 'input,textarea,select,[contenteditable],form,dialog,[role="dialog"]';
const PROTECTED = "[data-virus-ignore],[data-fizlet-ignore]";
const svg = (d: string) => `<svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICON = {
  sound: svg('<path d="M3 8h3l4-4v12l-4-4H3ZM14 6q4 4 0 8"/>'),
  mute: svg('<path d="M3 8h3l4-4v12l-4-4H3ZM14 8l4 4m0-4-4 4"/>'),
  pause: svg('<path d="M7 5v10M13 5v10"/>'),
  play: svg('<path d="m7 4 9 6-9 6Z"/>'),
  fold: svg('<path d="M4 10h12"/>'),
  open: svg('<path d="M4 10h12M10 4v12"/>'),
  exit: svg('<path d="m5 5 10 10M15 5 5 15"/>'),
  fire: svg('<path d="M10 1v5M10 14v5M1 10h5M14 10h5"/><circle cx="10" cy="10" r="5"/>'),
};
// Spark colours (an index per burst) and the popup table: fixed text, so drawing never builds strings.
const FX = ["#06c4ff", "#f4457a", "#cdde00", "#ee6875"];
const TEXT = ["+8 WEAPON XP", "SHIELD RESTORED", "SHIELD LOST", ...WEAPON_NAMES.map((n) => `${n} ONLINE`)];
const TONE = ["#4bce82", COLOR, "#f4457a"];
const signal = (fill: number) => (fill > 60 ? COLOR : fill > 25 ? "#cdde00" : "#ee6875");

const CSS = `
:host{all:initial!important;position:fixed!important;inset:0!important;display:block!important;z-index:2147483000!important;pointer-events:none!important}
.bui{position:absolute;inset:0;background:none;font:500 12px/1.4 ui-monospace,monospace}
canvas{position:absolute;inset:0;pointer-events:none}
.ni{position:absolute;right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));width:min(300px,calc(100% - 24px));display:grid;gap:10px;padding:10px 12px 12px;pointer-events:auto;color:var(--ink);background:color-mix(in srgb,var(--card) 94%,transparent);border:2.5px solid var(--line);border-radius:10px;box-shadow:0 5px 0 var(--rim)}
.ni header{display:flex;align-items:center;gap:6px}.ni header b{flex:1;font:900 11px/1 ui-monospace,monospace;letter-spacing:.14em;color:var(--team-a)}
.ni header button{width:34px;height:34px;min-height:0;padding:0;display:grid;place-items:center}.ni header svg{width:18px;height:18px}
.ni .bui-readouts{justify-content:space-between;gap:12px}
.wp{display:grid;grid-template-columns:1fr auto;gap:4px 8px;font-size:10px;letter-spacing:.08em;color:var(--muted)}.wp b{color:var(--ink)}
.wp i{grid-column:1/-1;height:6px;border-radius:3px;background:var(--surface);border:1.5px solid var(--line);overflow:hidden}.wp u{display:block;height:100%;width:0;background:var(--team-a)}
.ni nav{display:flex;gap:6px}.ni nav button{flex:1;min-height:0;padding:7px 4px;font:800 10px/1 ui-monospace,monospace;letter-spacing:.08em}
.ni.compact .wp,.ni.compact nav,.ni.compact [data-r=combo],.ni.compact [data-r=lives]{display:none}
.bui .msg{position:absolute;left:50%;bottom:max(16px,env(safe-area-inset-bottom));translate:-50% 0;max-width:calc(100% - 24px);pointer-events:none}
.bui .msg[hidden]{display:none}
.bui .bui-pad{pointer-events:auto}
@media (pointer:coarse),(max-width:600px){.ni{top:max(10px,env(safe-area-inset-top));bottom:auto;width:min(260px,calc(100% - 20px))}.bui .msg{bottom:auto;top:max(150px,calc(env(safe-area-inset-top) + 140px))}}
@media (prefers-reduced-motion:reduce){.bui *{transition:none!important;animation:none!important}}`;

const resolveRoot = (r: NullInvadersOptions["root"]) => (typeof r === "string" ? document.querySelector(r) : r) ?? document.body;

export function createNullInvaders(options: NullInvadersOptions = {}): NullInvadersController {
  let status: NullInvadersStatus = "idle", destroyed = false, notice = "";
  let run: ReturnType<typeof begin> | null = null;
  let last: Partial<NullInvadersStats> = {};
  const motion = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  const reduced = () => options.reducedMotion ?? !!motion?.matches;
  const emit = (type: string, data: Record<string, unknown> = {}) => options.onEvent?.({ ...data, type, game: "null-invaders" });

  function getSnapshot(): NullInvadersSnapshot {
    const stats = run?.stats() ?? last;
    const e = run?.engine;
    const ms = e?.stats().frameMs;
    return { id: "null-invaders", status, elapsed: e?.time ?? 0, ...stats, frameMs: ms?.avg ?? 0, maxFrameMs: ms?.max ?? 0, notice };
  }
  const notify = () => options.onState?.(getSnapshot());

  // ---------- One run: an engine, the page as the board, the overlay ----------
  function begin() {
    const doc = document, win = window;
    const host = doc.createElement("div");
    host.dataset.domVirusRoot = "null-invaders";
    host.dataset.virusIgnore = "";
    host.setAttribute("data-fizlet-host", "null-invaders");
    const theme = options.theme === "dark" || options.theme === "light" ? options.theme : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const ui = mount(host, __KIT_CSS__ + CSS, { theme, palette: { teamA: COLOR } });
    ui.innerHTML = `<canvas aria-hidden="true"></canvas>
<section class="ni" aria-label="Null Invaders controls"><header><b>NULL INVADERS</b>
<button type="button" data-a="sound" aria-pressed="true" aria-label="Mute game sound">${ICON.sound}</button>
<button type="button" data-a="pause" aria-label="Pause game (P)">${ICON.pause}</button>
<button type="button" data-a="fold" aria-expanded="true" aria-label="Minimize scoreboard">${ICON.fold}</button>
<button type="button" data-a="exit" aria-label="Close game and restore page (Esc)">${ICON.exit}</button></header>
<div class="wp"><b data-wl>PULSE / LV 1</b><span data-wx>0 / 8 XP</span><i role="progressbar" aria-label="Weapon upgrade progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><u data-wb></u></i></div>
<nav><button type="button" data-a="gate">Next gate</button><button type="button" data-a="restart">Restart</button><button type="button" data-a="auto" aria-pressed="false">Auto fire</button></nav></section>
<div class="bui-toast msg" role="status" hidden></div>`;
    const $ = <T extends Element>(s: string) => ui.querySelector<T>(s)!;
    const panel = $<HTMLElement>(".ni"), msg = $<HTMLElement>(".msg");
    const { group, values } = readouts(panel, [["Score", "team"], ["Wave"], ["Shields"], ["Combo"]]);
    panel.insertBefore(group, $(".wp"));
    group.children[2]!.setAttribute("data-r", "lives");
    group.children[3]!.setAttribute("data-r", "combo");
    const [vScore, vWave, vLives, vCombo] = values as [HTMLElement, HTMLElement, HTMLElement, HTMLElement];
    const wl = $<HTMLElement>("[data-wl]"), wx = $<HTMLElement>("[data-wx]"), wb = $<HTMLElement>("[data-wb]");
    const canvas = $<HTMLCanvasElement>("canvas"), ctx = canvas.getContext("2d")!;
    // The overlay is the one page change outside the engine's ledger: the scoreboard outlives the
    // engine when a run ends (the page is already back), and the controller removes it on Recall.
    doc.documentElement.append(host);
    // The run's own keys (Escape, P, G) live as long as the overlay, not the engine.
    const life = new AbortController();
    let built: Engine | undefined;
    try {
    const e = (built = createEngine({
      root: host,
      seed: options.seed ?? (Math.random() * 2 ** 31) | 0,
      events: 256,
      pause: { offscreen: false },
      onError(err) {
        stop();
        notice = "The game stopped safely after an error.";
        notify();
        options.onError?.(err);
      },
    }));
    const board = boardPage(e, {
      root: resolveRoot(options.root),
      // Defaults: Fizlet's, plus the DOM VIRUS hooks pages already carry.
      text: options.textSelector ?? "h1,h2,h3,h4,h5,h6,p,li,blockquote,[data-fizlet-text],[data-virus-text]",
      targets: options.targetSelector ?? "button,[role=button],a.button,a.btn,[data-fizlet-target],[data-virus-target]",
      exclude: [PROTECTED, options.excludeSelector].filter(Boolean).join(","),
      color: COLOR,
    });
    const world = Wd.createWorld(e, board);
    const { s, ctl } = world;
    const input = controls(e, {
      keys: { up: ["KeyW", "ArrowUp"], down: ["KeyS", "ArrowDown"], left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"], fire: ["Space"] },
      target: host,
    });
    const coarse = matchMedia("(pointer: coarse)").matches;
    if (coarse) pad(e, input, { scheme: "stick", host: ui, actions: [{ intent: "fire", label: "", name: "Hold to fire (Space)", icon: ICON.fire, hold: true, role: "fire" }] });
    const sfx = sound(e, { on: options.sound !== false, cues: { fire: "fire", hit: "hit", kill: "boom", "gate:down": "boom", hurt: "hurt", level: "power", "drop:collect": "power", wave: "ready", "wave:clear": "win" } });
    // Sparks: 3 px squares flying out of a hit (a fixed pool of 100, like the DOM VIRUS core).
    const SN = 100, kx = new Float64Array(SN), ky = new Float64Array(SN), kvx = new Float64Array(SN), kvy = new Float64Array(SN), kl = new Float64Array(SN), kc = new Uint8Array(SN);
    function spark(x: number, y: number, count: number, c: number) {
      if (reduced()) return;
      for (let i = 0; i < SN && count > 0; i++) {
        if (kl[i]! > 0) continue;
        const a = Math.random() * 6.2832, v = 30 + Math.random() * 100;
        kx[i] = x; ky[i] = y; kvx[i] = Math.cos(a) * v; kvy[i] = Math.sin(a) * v; kl[i] = 0.3 + Math.random() * 0.3; kc[i] = c;
        count--;
      }
    }

    // Pointer, fire and the page's own clicks: while running, a click on the page fires instead of
    // following a link or pressing a button. The HUD, fields and opted-out parts keep their clicks.
    const p = new Float64Array(6), P_X = 0, P_Y = 1, P_ON = 2, P_DOWN = 3, SX = 4, SY = 5; // pointer, last scroll
    let mode = options.controls === "keyboard" ? 0 : 1, auto = false;
    const live = () => status === "running";
    const guarded = (ev: Event) => ev.composedPath().some((n) => n === host || (n instanceof Element && n.matches(`${EDIT},${PROTECTED}`)));
    const on = { signal: e.signal, capture: true } as const;
    doc.addEventListener("pointermove", (ev) => {
      if (!live() || ev.pointerType === "touch" || options.controls === "keyboard" || guarded(ev)) return;
      p[P_X] = ev.clientX; p[P_Y] = ev.clientY; p[P_ON] = 1; mode = 1;
    }, { ...on, passive: true });
    doc.addEventListener("pointerdown", (ev) => {
      if (!live() || ev.button !== 0 || guarded(ev)) return;
      p[P_DOWN] = 1;
      ev.preventDefault();
    }, on);
    const up = () => (p[P_DOWN] = 0);
    doc.addEventListener("pointerup", up, on);
    doc.addEventListener("pointercancel", up, on);
    doc.addEventListener("click", (ev) => {
      if (live() && ev.detail > 0 && !guarded(ev)) (ev.preventDefault(), ev.stopPropagation());
    }, on);
    doc.addEventListener("keydown", (ev) => {
      if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
      const t = ev.target;
      if (t instanceof Element && t.closest(EDIT)) return;
      if (ev.code === "Escape") return ev.preventDefault(), stop();
      if (/^(Arrow(Up|Down|Left|Right)|Key[WASD])$/.test(ev.code)) mode = 0;
      if (ev.repeat || (t instanceof Element && t.closest(PROTECTED) && !host.contains(t))) return;
      if (ev.code === "KeyP") ev.preventDefault(), status === "paused" ? resume() : pause();
      else if (ev.code === "KeyG" && live()) ev.preventDefault(), nextGate();
    }, { signal: life.signal, capture: true });
    win.addEventListener("blur", up, { signal: e.signal });

    // G / Next gate: scroll to a live factory, preferring one off screen. Done in render (the
    // scroll is a page write); the board re-measures on its own after the scroll.
    let jump = 0, ending = 0;
    const nextGate = () => (jump = 1);
    function gate() {
      let pick: (typeof board.targets)[number] | undefined;
      for (const t of board.targets) if (t.hp > 0 && (!pick || (pick.w > 0 && !(t.w > 0)))) pick = t;
      pick?.el.scrollIntoView({ behavior: "instant", block: "center" });
      emit("jump");
    }

    // ---------- HUD keys ----------
    const keys = { sound: $<HTMLButtonElement>("[data-a=sound]"), pause: $<HTMLButtonElement>("[data-a=pause]"), fold: $<HTMLButtonElement>("[data-a=fold]"), auto: $<HTMLButtonElement>("[data-a=auto]") };
    const fold = (compact: boolean) => {
      panel.classList.toggle("compact", compact);
      keys.fold.innerHTML = compact ? ICON.open : ICON.fold;
      keys.fold.setAttribute("aria-expanded", String(!compact));
      keys.fold.setAttribute("aria-label", compact ? "Expand scoreboard" : "Minimize scoreboard");
    };
    fold(coarse || innerWidth <= 600);
    const syncSound = () => {
      keys.sound.innerHTML = sfx.on ? ICON.sound : ICON.mute;
      keys.sound.setAttribute("aria-pressed", String(sfx.on));
      keys.sound.setAttribute("aria-label", sfx.on ? "Mute game sound" : "Turn game sound on");
    };
    const syncPause = () => {
      keys.pause.innerHTML = status === "paused" ? ICON.play : ICON.pause;
      keys.pause.setAttribute("aria-label", status === "paused" ? "Resume game (P)" : "Pause game (P)");
      keys.pause.disabled = status !== "running" && status !== "paused";
    };
    ui.addEventListener("click", (ev) => {
      const b = (ev.target as Element).closest<HTMLButtonElement>("button[data-a]");
      if (!b) return;
      const a = b.dataset.a;
      if (a === "sound") (sfx.on = !sfx.on), syncSound();
      else if (a === "pause") status === "paused" ? resume() : pause();
      else if (a === "fold") fold(!panel.classList.contains("compact"));
      else if (a === "exit") stop();
      else if (a === "restart") start();
      else if (a === "gate" && live()) nextGate();
      else if (a === "auto") (auto = !auto), b.setAttribute("aria-pressed", String(auto)), (b.textContent = auto ? "Fire: on" : "Auto fire");
      if (live()) b.blur();
    });
    syncSound();

    // ---------- Popups (+points, upgrades): a fixed pool, merged when they stack ----------
    const PN = 24, px = new Float64Array(PN), py = new Float64Array(PN), pl = new Float64Array(PN), pv = new Float64Array(PN), pt = new Int8Array(PN), pc = new Uint8Array(PN);
    const plus: string[] = [];
    const label = (v: number) => plus[v] ?? (plus[v] = `+${v}`);
    function popup(x: number, y: number, value: number, text: number, tone: number) {
      if (text < 0)
        for (let i = 0; i < PN; i++)
          if (pl[i]! > 0.65 && pt[i] === -1 && Math.abs(px[i]! - x) < 28 && Math.abs(py[i]! - (y - 12)) < 28) return void ((pv[i]! += value), (pl[i] = 1.1));
      let k = 0;
      for (let i = 1; i < PN; i++) if (pl[i]! < pl[k]!) k = i;
      px[k] = x; py[k] = y - 12; pl[k] = 1.1; pv[k] = value; pt[k] = text; pc[k] = tone;
    }

    // ---------- Factories: a liquid level in the button itself (through the ledger) ----------
    const painted = new Map<Element, number>();
    function paintTargets() {
      const max = s[Wd.FACTORY_HP]! || 100;
      for (const t of board.targets) {
        const fill = Math.round((Math.min(t.hp, max) / max) * 100);
        if (painted.get(t.el) === fill) continue;
        painted.set(t.el, fill);
        const c = signal(fill);
        e.ledger.style(t.el as HTMLElement, "background", `linear-gradient(to top,${c} 0%,${c} ${fill}%,transparent ${fill}%,transparent 100%)`, "important");
      }
    }

    const W = 0, H = 1, DPR = 2, NOTE = 3, size = new Float64Array(4);
    const view: System = {
      read() {
        // Size and scroll, once a frame (the read phase is the only place that touches layout).
        if (size[W] !== innerWidth || size[H] !== innerHeight) {
          size[W] = s[Wd.W] = innerWidth;
          size[H] = s[Wd.H] = innerHeight;
          size[DPR] = Math.min(devicePixelRatio || 1, 1.5);
          canvas.width = Math.round(size[W]! * size[DPR]!);
          canvas.height = Math.round(size[H]! * size[DPR]!);
        }
        const dx = scrollX - p[SX]!, dy = scrollY - p[SY]!;
        if (dx || dy) (p[SX] = scrollX), (p[SY] = scrollY), world.scroll(dx, dy);
        s[Wd.REDUCED] = reduced() ? 1 : 0;
        ctl[Wd.MODE] = mode;
        ctl[Wd.PX] = p[P_X]!;
        ctl[Wd.PY] = p[P_Y]!;
        ctl[Wd.PON] = p[P_ON]!;
        ctl[Wd.KX] = input.axis("left", "right", 0);
        ctl[Wd.KY] = input.axis("up", "down", 1);
        if (ctl[Wd.KX] || ctl[Wd.KY]) (mode = 0), (ctl[Wd.MODE] = 0);
        ctl[Wd.FIRE] = input.down("fire") || p[P_DOWN] || auto ? 1 : 0;
      },
      render(eng) {
        const r = reduced();
        for (let i = 0; i < eng.events.size; i++) {
          const ev = eng.events.at(i)!;
          switch (ev.type) {
            case "score": popup(ev.x, ev.y, ev.a, -1, 0); break;
            case "level": popup(s[Wd.X]!, s[Wd.Y]! - 26, 0, 3 + ev.a, 1); toast(msg, `${WEAPON_NAMES[ev.a]} ONLINE · ${weaponAngles(ev.a + 1).length} shots per burst`); emit("weapon-upgrade", { weapon: ev.a + 1, name: WEAPON_NAMES[ev.a] }); break;
            case "drop:collect": popup(s[Wd.X]!, s[Wd.Y]! - 28, 0, ev.a, 1); emit("supply-collected", { kind: Wd.SUPPLY_KINDS[ev.a] }); break;
            case "drop:spawn": emit("supply-drop", { kind: Wd.SUPPLY_KINDS[ev.a] }); break;
            case "hurt": popup(ev.x, ev.y, 0, 2, 2); spark(ev.x, ev.y, 18, 3); emit("hurt", { lives: ev.a }); break;
            case "glyph": spark(ev.x, ev.y, 5, 0); emit("letter", { score: ev.a }); break;
            case "hit": spark(ev.x, ev.y, 6, 1); break;
            case "kill": emit("kill", { kills: ev.a, combo: ev.b }); break;
            case "gate": spark(ev.x, ev.y, 8, 2); break;
            case "gate:down": emit("gate-destroyed"); break;
            case "wave": toast(msg, `WAVE ${ev.a} · the factories are back`); emit("wave", { wave: ev.a }); break;
            case "wave:clear": toast(msg, "Wave clear · +250 · next wave incoming"); emit("wave-clear", { wave: ev.a }); break;
            case "spawn": emit("spawn"); break;
            case "fire": emit("fire"); break;
          }
        }
        // The run ended (read from the world, not the event ring, which may drop events when full).
        if (s[Wd.OVER] && !ending) (ending = 1), queueMicrotask(() => finish(s[Wd.OVER] === 2));
        if (jump) (jump = 0), gate();
        paintTargets();
        draw(eng.timing[0]!);
        hud();
        if ((size[NOTE]! += eng.timing[0]!) >= 0.1) (size[NOTE] = 0), notify();
      },
    };
    e.add(view);

    // ---------- Drawing (render phase only) ----------
    function draw(dt: number) {
      const d = size[DPR]!, t = s[Wd.TIME]!, r = reduced();
      ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.clearRect(0, 0, size[W]!, size[H]!);
      // Factory beacons: a ring that beats faster as the factory weakens.
      const max = s[Wd.FACTORY_HP]! || 100;
      ctx.lineWidth = 2;
      for (const g of board.targets) {
        if (!(g.w > 0 && g.hp > 0)) continue;
        const fill = (g.hp / max) * 100, period = 0.7 + 2.1 * (1 - fill / 100);
        ctx.globalAlpha = r ? 0.7 : 0.45 + 0.35 * Math.sin((t * 6.2832) / period);
        ctx.strokeStyle = signal(fill);
        ctx.strokeRect(g.x - 5, g.y - 5, g.w + 10, g.h + 10);
      }
      ctx.globalAlpha = 1;
      // Supply crates.
      const sp = world.supplies;
      for (let i = 0; i < sp.count; i++) {
        const x = sp.x[i]!, y = sp.y[i]!, repair = sp.kind[i] === 1;
        ctx.strokeStyle = ctx.fillStyle = repair ? "#4bce82" : COLOR;
        ctx.fillStyle = "#14232c";
        ctx.fillRect(x - 10, y - 9, 20, 18);
        ctx.strokeRect(x - 10, y - 9, 20, 18);
        ctx.fillStyle = ctx.strokeStyle;
        if (repair) ctx.fillRect(x - 2, y - 6, 4, 12), ctx.fillRect(x - 6, y - 2, 12, 4);
        else {
          ctx.beginPath();
          ctx.moveTo(x + 2, y - 7); ctx.lineTo(x - 5, y + 1); ctx.lineTo(x, y + 1); ctx.lineTo(x - 2, y + 7); ctx.lineTo(x + 5, y - 1); ctx.lineTo(x, y - 1);
          ctx.closePath();
          ctx.fill();
        }
      }
      // Shots.
      const b = world.bullets, w = world.weapon();
      ctx.lineCap = "square";
      for (let i = 0; i < b.count; i++) {
        ctx.beginPath();
        ctx.moveTo(b.x[i]!, b.y[i]!);
        ctx.lineTo(b.x[i]! - b.vx[i]! * 0.014, b.y[i]! - b.vy[i]! * 0.014);
        ctx.strokeStyle = "#071c21";
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.strokeStyle = w === 4 ? "#cdde00" : w === 3 ? "#8573ee" : COLOR;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      // Invaders.
      const en = world.enemies;
      for (let i = 0; i < en.count; i++) {
        const frame = r ? 0 : Math.floor(en.age[i]! * 6 + en.phase[i]!) % 2;
        drawSprite(ctx, enemySprites[en.kind[i]!]!, frame, en.x[i]!, en.y[i]!, 0, !r && en.flash[i]! > t);
        if (en.hp[i]! > 1) {
          ctx.fillStyle = "#201329";
          ctx.fillRect(en.x[i]! - 5, en.y[i]! - 19, 10, 4);
          ctx.fillStyle = "#fff1c1";
          ctx.fillRect(en.x[i]! - 4, en.y[i]! - 18, 3, 2);
          ctx.fillRect(en.x[i]! + 1, en.y[i]! - 18, 3, 2);
        }
      }
      // The ship, its shield and the muzzle flash.
      ctx.save();
      ctx.translate(s[Wd.X]!, s[Wd.Y]!);
      ctx.rotate(s[Wd.A]! + Math.PI / 2);
      if (s[Wd.SHIELD]! > 0) {
        ctx.strokeStyle = COLOR;
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, 6.2832);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      drawShip(ctx, w, Wd.POSES[s[Wd.POSE]!]!, r ? 0 : Math.floor(s[Wd.ENGINE_T]! * 12) % 2, 0, 0);
      if (s[Wd.MUZZLE]! > t && !r) (ctx.fillStyle = "#fff5d7"), ctx.fillRect(-1, -SHIP_MUZZLE - 1, 2, 3);
      ctx.restore();
      // Sparks, then the popups on top.
      for (let i = 0; i < SN; i++) {
        if (kl[i]! <= 0) continue;
        kl[i]! -= dt;
        kx[i]! += kvx[i]! * dt;
        ky[i]! += kvy[i]! * dt;
        ctx.globalAlpha = Math.min(1, Math.max(0, kl[i]! * 3));
        ctx.fillStyle = FX[kc[i]!]!;
        ctx.fillRect(kx[i]!, ky[i]!, 3, 3);
      }
      ctx.globalAlpha = 1;
      ctx.font = "700 16px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.lineJoin = "round";
      for (let i = 0; i < PN; i++) {
        if (pl[i]! <= 0) continue;
        pl[i]! -= dt;
        if (!r) py[i]! -= 18 * dt;
        const text = pt[i]! < 0 ? label(pv[i]!) : TEXT[pt[i]!]!;
        ctx.globalAlpha = Math.min(1, Math.max(0, pl[i]! / 0.4));
        ctx.strokeStyle = theme === "dark" ? "#101010" : "#ffffff";
        ctx.lineWidth = 6;
        ctx.strokeText(text, px[i]!, py[i]!);
        ctx.strokeStyle = "#101010";
        ctx.lineWidth = 3;
        ctx.strokeText(text, px[i]!, py[i]!);
        ctx.fillStyle = TONE[pc[i]!]!;
        ctx.fillText(text, px[i]!, py[i]!);
      }
      ctx.globalAlpha = 1;
    }

    // ---------- HUD (change-only writes) ----------
    const shown = new Float64Array(6).fill(-1);
    function hud() {
      const score = world.points.points, wave = s[Wd.WAVE]!, lives = s[Wd.LIVES]!, combo = world.combo(), w = world.weapon(), xp = world.points.xp;
      if (shown[0] !== score) (shown[0] = score), (vScore.textContent = String(score).padStart(6, "0"));
      if (shown[1] !== wave) (shown[1] = wave), (vWave.textContent = String(wave).padStart(2, "0"));
      if (shown[2] !== lives) (shown[2] = lives), (vLives.textContent = String(lives));
      if (shown[3] !== combo) (shown[3] = combo), (vCombo.textContent = `×${combo}`);
      if (shown[4] !== xp || shown[5] !== w) {
        shown[4] = xp;
        shown[5] = w;
        const lo = WEAPON_XP[w - 1]!, hi = WEAPON_XP[w];
        const pct = hi === undefined ? 100 : Math.round(((xp - lo) / (hi - lo)) * 100);
        wl.textContent = `${WEAPON_NAMES[w - 1]} / LV ${w}`;
        wx.textContent = hi === undefined ? "MAX POWER" : `${xp} / ${hi} XP`;
        wb.style.width = `${pct}%`;
        wb.parentElement!.setAttribute("aria-valuenow", String(pct));
      }
    }

    function stats(): NullInvadersStats {
      const w = world.weapon(), up = s[Wd.UPGRADE]! > s[Wd.TIME]!;
      let gates = 0;
      for (const t of board.targets) if (t.hp > 0) gates++;
      return {
        score: world.points.points, lives: s[Wd.LIVES]!, wave: s[Wd.WAVE]!, kills: s[Wd.KILLS]!, alive: world.enemies.count, bullets: world.bullets.count,
        supplies: world.supplies.count, weapon: w, weaponXP: world.points.xp, nextWeaponXP: WEAPON_XP[w] ?? null, combo: world.combo(),
        player: { x: s[Wd.X]!, y: s[Wd.Y]!, angle: s[Wd.A]! },
        detail: s[Wd.BREAK]! > 0 ? "Wave clear · +250 · next wave incoming" : up ? `${WEAPON_NAMES[w - 1]} ONLINE · ${weaponAngles(w).length} shots per burst` : `${weaponAngles(w).length} SHOT · ${gates} FACTORIES · Space / click to fire`,
      };
    }
    // First frame: measure, place the ship, then play.
    view.read!(e);
    p[SX] = scrollX;
    p[SY] = scrollY;
    p[P_X] = innerWidth / 2;
    p[P_Y] = innerHeight * 0.65;
    board.refresh();
    world.reset();
    return { engine: e as Engine, life, host, ui, panel, msg, stats, syncPause, input, hud };
    } catch (err) {
      // A run that fails to start leaves nothing behind.
      built?.destroy();
      life.abort();
      host.remove();
      throw err;
    }
  }

  // ---------- The controller ----------
  function teardown() {
    run?.life.abort();
    run?.engine.destroy();
    run?.host.remove();
    run = null;
  }
  function start() {
    if (destroyed) throw new Error("This game instance was destroyed. Create another instance.");
    teardown();
    notice = "";
    try {
      run = begin();
      status = "running";
      run.engine.start();
      run.syncPause();
      run.hud();
      toast(run.msg, matchMedia("(pointer: coarse)").matches ? TOUCH_HINT : HINT, 4200);
      emit("start");
    } catch (err) {
      teardown();
      status = "idle";
      options.onError?.(err);
      throw err;
    }
    notify();
    return getSnapshot();
  }
  function pause() {
    if (status !== "running" || !run) return;
    status = "paused";
    run.engine.stop();
    run.syncPause();
    notify();
    emit("pause");
  }
  function resume() {
    if (status !== "paused" || !run || document.hidden) return;
    status = "running";
    run.engine.start();
    run.syncPause();
    notify();
    emit("resume");
  }
  // A run ends: the page comes back at once (the engine's ledger), the scoreboard stays with the
  // result and a Restart key.
  function finish(won: boolean) {
    if (!run || (status !== "running" && status !== "paused")) return;
    last = run.stats();
    status = won ? "won" : "gameover";
    notice = won ? "Page cleared and restored. Restart for another run." : "Run ended. Page restored. Restart for another run.";
    const { host, ui, panel, msg, syncPause } = run;
    run.engine.destroy();
    run = { ...run, stats: () => last } as typeof run;
    panel.classList.remove("compact");
    ui.querySelector("canvas")?.remove();
    syncPause();
    toast(msg, `${won ? "STAGE CLEAR" : "GAME OVER"} · ${notice}`, 1e9);
    emit(status, { score: last.score });
    notify();
    host.dataset.over = status;
  }
  function stop() {
    if (destroyed) return;
    if (run && (status === "running" || status === "paused")) last = run.stats();
    teardown();
    status = "idle";
    notice = "";
    notify();
    emit("recall");
  }
  function destroy() {
    if (destroyed) return;
    stop();
    destroyed = true;
    status = "destroyed";
    notify();
  }
  return { start, pause, resume, stop, destroy, getSnapshot };
}
