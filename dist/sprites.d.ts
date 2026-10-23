type Sprite = "ship" | "drone" | "crab" | "squid";
/** Tiny canvases are baked once, then blitted. No images, filters or sprite DOM. */
export declare function drawSprite(ctx: CanvasRenderingContext2D, kind: Sprite, frame: number, x: number, y: number, angle?: number, flash?: boolean): void;
export declare const enemySprites: readonly ["drone", "crab", "squid"];
export {};
