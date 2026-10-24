type Sprite = "ship" | "drone" | "crab" | "squid";
const art: Record<Sprite, readonly string[]> = {
  ship: [
    ".....1.....",
    "....131....",
    "....131....",
    "...12321...",
    "...12421...",
    ".11224211..",
    "12322222321",
    "12222222221",
    "11221212211",
    ".111...111.",
    "..4.....4..",
    "..3.....3..",
  ],
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
