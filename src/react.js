import { useEffect, useRef } from "react";
import { createNullInvaders } from "./index.js";
/** Memoize options. Changing the options object recalls and remounts the game. */
export function NullInvaders({ active = true, options }) {
  const controller = useRef(null);
  useEffect(() => {
    if (!active) return;
    const game = createNullInvaders(options);
    controller.current = game;
    game.start();
    return () => {
      game.destroy();
      controller.current = null;
    };
  }, [active, options]);
  return null;
}
