import { shipPixels, SHIP_PALETTE, SHIP_ANCHOR } from "./ship-art.js";
import type { ShipPose } from "./ship-art.js";
type Sprite = "ship" | "drone" | "crab" | "squid";
const art: Record<Sprite, readonly string[]> = {
  ship: [],
  drone: [
    "..1.....1..",
    "...1...1...",
    "..1222221..",
    ".122222221.",
    "12232223221",
    "12212221221",
    "..1222221..",
    ".12.111.21.",
    ".1.......1.",
  ],
  crab: [
    "..11...11..",
    ".1221.1221.",
    "12222222221",
    "12332223321",
    "12222222221",
    ".122222221.",
    "11211111211",
    "12.1...1.21",
    "1..1...1..1",
  ],
  squid: [
    "....111....",
    "...12221...",
    "..1222221..",
    ".122222221.",
    "12332223321",
    "12212221221",
    "..1222221..",
    ".121.1.121.",
    ".1.1.1.1.1.",
  ],
};
const palettes: Record<Sprite, readonly string[]> = {
  ship: ["", "#092331", "#06c4ff", "#efffff", "#cdde00"],
  drone: ["", "#261634", "#8573ee", "#fff1ff", "#cdde00"],
  crab: ["", "#321623", "#f4457a", "#fff6d6", "#cdde00"],
  squid: ["", "#32200f", "#cdde00", "#fff7d1", "#cdde00"],
};
const atlas = new WeakMap<Document, Map<string, HTMLCanvasElement>>();
/** Tiny canvases are baked once, then blitted. No images, filters or sprite DOM. */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  kind: Sprite,
  frame: number,
  x: number,
  y: number,
  angle = 0,
  flash = false,
) {
  frame = Math.abs(Math.trunc(frame)) % 2;
  if (kind === "ship") {
    drawShip(ctx, 1, frame ? "thrust" : "idle", frame, x, y, angle, flash);
    return;
  }
  const doc = ctx.canvas.ownerDocument;
  let cache = atlas.get(doc);
  if (!cache) {
    cache = new Map();
    atlas.set(doc, cache);
  }
  const key = `${kind}:${frame}:${flash}`;
  let sprite = cache.get(key);
  if (!sprite) {
    const rows = art[kind];
    sprite = doc.createElement("canvas");
    sprite.width = 15;
    sprite.height = 16;
    const p = sprite.getContext("2d");
    if (!p) return;
    // One-pixel pale rim plus a dark silhouette stay readable on either page theme.
    for (const rim of [true, false])
      for (let row = 0; row < rows.length; row++) {
        const line = rows[row]!;
        for (let col = 0; col < line.length; col++) {
          const index = Number(line[col]);
          if (!index) continue;
          const shift =
            frame && row >= rows.length - 2 ? (col < 5 ? -1 : 1) : 0;
          p.fillStyle = rim
            ? "#eaf8ff"
            : flash
              ? "#ffffff"
              : palettes[kind][index]!;
          p.fillRect(
            col + 2 + shift - (rim ? 1 : 0),
            row + 2 - (rim ? 1 : 0),
            rim ? 3 : 1,
            rim ? 3 : 1,
          );
        }
      }
    cache.set(key, sprite);
  }
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (angle) ctx.rotate(angle);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, -15, -16, 30, 32);
  ctx.restore();
}
export const enemySprites = ["drone", "crab", "squid"] as const;

export const SHIP_CACHE_LIMIT = 4 * 4 * 2 * 2;
export const SPRITE_CACHE_LIMIT = SHIP_CACHE_LIMIT + 3 * 2 * 2;
export const spriteCacheSize = (doc: Document) => atlas.get(doc)?.size ?? 0;
export function drawShip(
  ctx: CanvasRenderingContext2D,
  tier: number,
  pose: ShipPose,
  frame: number,
  x: number,
  y: number,
  angle = 0,
  flash = false,
) {
  tier = Number.isFinite(tier) ? Math.max(1, Math.min(4, Math.trunc(tier))) : 1;
  frame = Number.isFinite(frame) ? Math.abs(Math.trunc(frame)) % 2 : 0;
  if (!["idle", "thrust", "bank-left", "bank-right"].includes(pose))
    pose = "idle";
  const doc = ctx.canvas.ownerDocument;
  let cache = atlas.get(doc);
  if (!cache) {
    cache = new Map();
    atlas.set(doc, cache);
  }
  const key = `ship:${tier}:${pose}:${frame}:${!!flash}`;
  let tile = cache.get(key);
  if (!tile) {
    tile = doc.createElement("canvas");
    tile.width = 37;
    tile.height = 35;
    const pixel = tile.getContext("2d");
    if (!pixel) return;
    const pixels = shipPixels(tier, pose, frame);
    // A single restrained dark rim works on light and dark page surfaces.
    pixel.fillStyle = "#092331";
    for (const p of pixels) pixel.fillRect(p.x + 2, p.y + 1, 3, 3);
    for (const p of pixels) {
      pixel.fillStyle = flash ? "#ffffff" : SHIP_PALETTE[p.color]!;
      pixel.fillRect(p.x + 3, p.y + 2, 1, 1);
    }
    cache.set(key, tile);
  }
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (angle) ctx.rotate(angle);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tile, -SHIP_ANCHOR.x - 3, -SHIP_ANCHOR.y - 2);
  ctx.restore();
}
