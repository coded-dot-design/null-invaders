import { createArcade } from "@coded-design/dom-virus";
import { createGame } from "./simulation.js";

export function createNullInvaders(options = {}) {
  return createArcade(
    {
      id: "null-invaders",
      title: "NULL INVADERS",
      color: "#5ef2df",
      hint: "Move: mouse / WASD · Fire: click / Space · G: next gate",
      create: createGame,
    },
    options,
  );
}
