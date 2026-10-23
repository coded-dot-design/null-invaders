export declare const MAX_ENEMIES = 48;
export declare const MAX_BULLETS = 80;
export declare const weaponAngles: (level: number) => readonly number[];
export declare const WEAPON_XP: readonly [0, 8, 24, 50];
export declare const WEAPON_NAMES: readonly ["PULSE", "TWIN", "TRIDENT", "OVERDRIVE"];
export declare const weaponLevel: (xp: number) => 1 | 2 | 3 | 4;
export declare const fireInterval: (level: number) => number;
export declare const spawnInterval: (wave: number) => number;
export declare const waveHealth: (wave: number) => number;
