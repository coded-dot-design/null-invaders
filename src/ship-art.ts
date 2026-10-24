/** One original interceptor body, equipped and posed on a finite pixel grid. */
export type ShipPose = "idle" | "thrust" | "bank-left" | "bank-right";
export const SHIP_PALETTE = [
  "",
  "#092331",
  "#06c4ff",
  "#0b8eae",
  "#cdde00",
  "#fff5d7",
] as const;
export const SHIP_ANCHOR = { x: 15, y: 15 };
export const SHIP_MUZZLE = 16;
export interface ShipPixel {
  x: number;
  y: number;
  color: number;
}
const spans: readonly (readonly [number, number][])[] = [
  [
    [13, 14],
    [17, 18],
  ],
  [
    [12, 14],
    [17, 19],
  ],
  [
    [12, 14],
    [17, 19],
  ],
  [
    [11, 14],
    [17, 20],
  ],
  [
    [11, 14],
    [17, 20],
  ],
  [
    [11, 14],
    [17, 20],
  ],
  [
    [10, 14],
    [17, 21],
  ],
  [
    [10, 14],
    [17, 21],
  ],
  [
    [9, 14],
    [17, 22],
  ],
  [
    [9, 14],
    [17, 22],
  ],
  [[8, 23]],
  [[7, 24]],
  [[6, 25]],
  [[5, 26]],
  [[4, 27]],
  [[3, 28]],
  [[2, 29]],
  [[1, 30]],
  [[1, 30]],
  [
    [1, 8],
    [9, 15],
    [16, 22],
    [23, 30],
  ],
  [
    [1, 6],
    [10, 15],
    [16, 21],
    [25, 30],
  ],
  [
    [1, 4],
    [11, 15],
    [16, 20],
    [27, 30],
  ],
  [
    [1, 3],
    [12, 15],
    [16, 19],
    [28, 30],
  ],
  [
    [12, 15],
    [16, 19],
  ],
  [
    [12, 14],
    [17, 19],
  ],
];
export function shipPixels(
  tier: number,
  pose: ShipPose = "idle",
  engineFrame = 0,
): ShipPixel[] {
  const pixels = new Map<string, ShipPixel>();
  const put = (x: number, y: number, color: number) =>
    pixels.set(`${x},${y}`, { x, y, color });
  const rect = (
    x: number,
    y: number,
    w: number,
    h: number,
    color: number,
    inside = false,
  ) => {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++)
        if (!inside || pixels.has(`${xx},${yy}`)) put(xx, yy, color);
  };
  spans.forEach((row, y) =>
    row.forEach(([a, b]) => {
      for (let x = a; x < b; x++) put(x, y, 2);
    }),
  );
  // Recessed cockpit, small lime core, and darker stepped wing roots.
  rect(12, 9, 7, 9, 1);
  rect(13, 17, 5, 2, 1);
  rect(11, 10, 1, 9, 3, true);
  rect(19, 10, 1, 9, 3, true);
  rect(14, 11, 3, 3, 4);
  put(15, 14, 4);
  rect(13, 19, 5, 2, 2);
  for (let y = 14; y <= 21; y++) {
    const x = Math.max(3, 9 - Math.floor((y - 14) / 2));
    rect(x, y, 2, 1, 3, true);
    rect(29 - x, y, 2, 1, 3, true);
  }
  rect(12, 22, 1, 3, 3, true);
  rect(18, 22, 1, 3, 3, true);
  if (tier >= 2) {
    rect(8, 13, 2, 5, 3);
    rect(21, 13, 2, 5, 3);
    put(9, 13, 5);
    put(21, 13, 5);
  }
  if (tier >= 3) {
    rect(5, 12, 2, 7, 3);
    rect(24, 12, 2, 7, 3);
    rect(5, 12, 1, 4, 2);
    rect(25, 12, 1, 4, 2);
    put(5, 11, 5);
    put(25, 11, 5);
    rect(15, 7, 1, 3, 2);
  }
  if (tier >= 4) {
    for (const x of [-1, 28]) {
      rect(x, 11, 4, 11, 3);
      rect(x + 1, 10, 2, 14, 2);
      rect(x + 1, 13, 2, 8, 2);
      rect(x, 12, 3, 1, 3);
      rect(x + 1, 8, 1, 2, 5);
    }
  }
  const result: ShipPixel[] = [];
  for (const p of pixels.values()) {
    let dy = 0;
    if (p.y >= 11 && (p.x < 11 || p.x > 19)) {
      const side = p.x < 11 ? -1 : 1;
      if (pose === "bank-left") dy = side;
      if (pose === "bank-right") dy = -side;
    }
    result.push({ ...p, y: p.y + dy });
  }
  const thrust = pose !== "idle",
    length = thrust ? (engineFrame % 2 ? 5 : 3) : 1;
  for (const x of [12, 18])
    for (let y = 26; y < 26 + length; y++) result.push({ x, y, color: 5 });
  return result;
}
export function shipArtwork(tier = 1) {
  const pixels = shipPixels(tier),
    paths = new Map<number, string>();
  for (const p of pixels)
    paths.set(p.color, (paths.get(p.color) ?? "") + `M${p.x} ${p.y}h1v1h-1Z`);
  return {
    viewBox: "-3 -2 37 35",
    layers: [...paths].map(([color, d]) => ({ d, fill: SHIP_PALETTE[color]! })),
  };
}
export const websiteSprites = {
  ship: /* @__PURE__ */ shipArtwork(),
  "ship-twin": /* @__PURE__ */ shipArtwork(2),
  "ship-trident": /* @__PURE__ */ shipArtwork(3),
  "ship-overdrive": /* @__PURE__ */ shipArtwork(4),
};
