import type { GameOptions, GameController } from "@coded-design/dom-virus";
import type { NullInvadersStats } from "./simulation.js";
export type { NullInvadersStats } from "./simulation.js";
export type {
  GameOptions,
  GameController,
  GameSnapshot,
} from "@coded-design/dom-virus";
export type NullInvadersOptions = GameOptions<NullInvadersStats>;
import { createArcade } from "@coded-design/dom-virus";
import { createGame } from "./simulation.js";

export function createNullInvaders(
  options: NullInvadersOptions = {},
): GameController<NullInvadersStats> {
  return createArcade(
    {
      id: "null-invaders",
      title: "NULL INVADERS",
      color: "#5ef2df",
      hint: "Move: mouse / WASD · Fire: click / Space · G: next gate",
      capabilities: { fire: true },
      hud: "arcade",
      create: createGame,
    },
    { binaryStyle: "native", targetEffects: "liquid", ...options },
  );
}
