export const MAX_ENEMIES = 48;
export const MAX_BULLETS = 80;
const spreads = [
  [0],
  [-0.055, 0.055],
  [-0.22, 0, 0.22],
  [-0.32, -0.11, 0.11, 0.32],
] as const;
export const weaponAngles = (level: number): readonly number[] =>
  spreads[Math.max(0, Math.min(3, level - 1))]!;
export const WEAPON_XP = [0, 8, 24, 50] as const;
export const WEAPON_NAMES = ["PULSE", "TWIN", "TRIDENT", "OVERDRIVE"] as const;
export const weaponLevel = (xp: number) =>
  xp >= 50 ? 4 : xp >= 24 ? 3 : xp >= 8 ? 2 : 1;
export const fireInterval = (level: number) =>
  [0.16, 0.14, 0.12, 0.095][Math.max(0, Math.min(3, level - 1))]!;
export const spawnInterval = (wave: number) =>
  Math.max(0.42, 1.1 - (wave - 1) * 0.2);
export const waveHealth = (wave: number) => 60 + wave * 20;
