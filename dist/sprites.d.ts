import type { ShipPose } from "./ship-art.js";
type Sprite = "ship" | "drone" | "crab" | "squid";
/** Tiny canvases are baked once, then blitted. No images, filters or sprite DOM. */
export declare function drawSprite(ctx: CanvasRenderingContext2D, kind: Sprite, frame: number, x: number, y: number, angle?: number, flash?: boolean): void;
export declare const enemySprites: readonly ["drone", "crab", "squid"];
export declare const SHIP_CACHE_LIMIT: number;
export declare const SPRITE_CACHE_LIMIT: number;
export declare const spriteCacheSize: (doc: Document) => number;
export declare function drawShip(ctx: CanvasRenderingContext2D, tier: number, pose: ShipPose, frame: number, x: number, y: number, angle?: number, flash?: boolean): void;
export {};
