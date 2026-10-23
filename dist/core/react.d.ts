import type { GameController, GameOptions, GameStats } from "./contracts.js";
export interface GameComponentProps<S extends GameStats = GameStats> {
    active?: boolean;
    options?: GameOptions<S>;
}
/** Memoize options. Each effect owns and recalls exactly the instance it starts. */
export declare function createGameComponent<S extends GameStats>(create: (options?: GameOptions<S>) => GameController<S>): (props: GameComponentProps<S>) => null;
