import type { GameOptions, GameController } from "./core/index.js";
import type { NullInvadersStats } from "./simulation.js";
export type { NullInvadersStats } from "./simulation.js";
export type { GameOptions, GameController, GameSnapshot, } from "./core/index.js";
export type NullInvadersOptions = GameOptions<NullInvadersStats>;
export declare function createNullInvaders(options?: NullInvadersOptions): GameController<NullInvadersStats>;
