export interface GameOptions {
  document?: Document;
  root?: Element | string;
  textSelector?: string;
  targetSelector?: string;
  excludeSelector?: string;
  theme?: "system" | "dark" | "light";
  domMode?: "visual" | "text";
  controls?: "mouse" | "keyboard";
  reducedMotion?: boolean;
  seed?: number;
  onState?: (state: GameSnapshot) => void;
  onEvent?: (event: { type: string; [key: string]: unknown }) => void;
  onError?: (error: unknown) => void;
}
export interface GameSnapshot {
  id: string;
  status: "idle" | "running" | "paused" | "gameover" | "won" | "destroyed";
  elapsed: number;
  score?: number;
  lives?: number;
  wave?: number;
  alive?: number;
  detail?: string;
  board: {
    indexed: number;
    visible: number;
    spent: number;
    measurements: number;
  };
  [key: string]: unknown;
}
export interface GameController {
  start(): GameSnapshot;
  pause(): void;
  resume(): void;
  stop(): void;
  destroy(): void;
  getSnapshot(): GameSnapshot;
}
/** Low-level game protocol. Prefer each game's typed factory for normal embeds. */
export function createArcade(
  definition: {
    id: string;
    title: string;
    color: string;
    hint: string;
    create: (context: any) => any;
  },
  options?: GameOptions,
): GameController;
export function clamp(n: number, a: number, b: number): number;
export function distance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number;
export function inside(
  r: DOMRect,
  x: number,
  y: number,
  padding?: number,
): boolean;
export function segmentHit(
  a: { x: number; y: number },
  b: { x: number; y: number },
  r: { left: number; right: number; top: number; bottom: number },
  padding?: number,
): number | null;
export function seededRandom(seed?: number): () => number;
export class SpatialGrid {
  constructor(size?: number);
  clear(): void;
  insert(
    item: unknown,
    r: { left: number; right: number; top: number; bottom: number },
  ): void;
  query(r: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  }): unknown[];
}
