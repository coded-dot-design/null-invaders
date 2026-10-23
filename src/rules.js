export const MAX_ENEMIES = 48;
export const MAX_BULLETS = 80;
export const weaponAngles = (level) =>
  level <= 1
    ? [0]
    : level === 2
      ? [-0.055, 0.055]
      : level === 3
        ? [-0.22, 0, 0.22]
        : [-0.32, -0.11, 0.11, 0.32];
export const spawnInterval = (wave) => Math.max(0.42, 1.65 - (wave - 1) * 0.3);
export const waveHealth = (wave) => 60 + wave * 20;
