/** One original interceptor body, equipped and posed on a finite pixel grid. */
export type ShipPose = 'idle' | 'thrust' | 'bank-left' | 'bank-right';
export declare const SHIP_PALETTE: readonly ['', '#092331', '#06c4ff', '#0b8eae', '#cdde00', '#fff5d7'];
export declare const SHIP_ANCHOR: {
    x: number;
    y: number;
};
export declare const SHIP_MUZZLE = 16;
export interface ShipPixel {
    x: number;
    y: number;
    color: number;
}
export declare function shipPixels(tier: number, pose?: ShipPose, engineFrame?: number): ShipPixel[];
export declare function shipArtwork(tier?: number): {
    viewBox: string;
    layers: {
        d: string;
        fill: "" | "#06c4ff" | "#092331" | "#0b8eae" | "#cdde00" | "#fff5d7";
    }[];
};
export declare const websiteSprites: {
    ship: {
        viewBox: string;
        layers: {
            d: string;
            fill: "" | "#06c4ff" | "#092331" | "#0b8eae" | "#cdde00" | "#fff5d7";
        }[];
    };
    'ship-twin': {
        viewBox: string;
        layers: {
            d: string;
            fill: "" | "#06c4ff" | "#092331" | "#0b8eae" | "#cdde00" | "#fff5d7";
        }[];
    };
    'ship-trident': {
        viewBox: string;
        layers: {
            d: string;
            fill: "" | "#06c4ff" | "#092331" | "#0b8eae" | "#cdde00" | "#fff5d7";
        }[];
    };
    'ship-overdrive': {
        viewBox: string;
        layers: {
            d: string;
            fill: "" | "#06c4ff" | "#092331" | "#0b8eae" | "#cdde00" | "#fff5d7";
        }[];
    };
};
