import type { GameContext, GameSimulation, GameStats, Player } from "./core/index.js";
export interface NullInvadersStats extends GameStats {
    score: number;
    lives: number;
    wave: number;
    kills: number;
    alive: number;
    bullets: number;
    supplies: number;
    weapon: number;
    weaponXP: number;
    nextWeaponXP: number | null;
    combo: number;
    player: Player;
    detail: string;
}
export declare function createGame(api: GameContext): GameSimulation<NullInvadersStats>;
