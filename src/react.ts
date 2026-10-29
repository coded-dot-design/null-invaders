// React adapter: mounts Null Invaders while `active`, and gives the page back on unmount.
import { useEffect } from "react";
import { createNullInvaders } from "./game.js";
import type { NullInvadersOptions } from "./game.js";

export function NullInvaders({ active = true, options }: { active?: boolean; options?: NullInvadersOptions }) {
  useEffect(() => {
    if (!active) return;
    const game = createNullInvaders(options);
    game.start();
    return () => game.destroy();
  }, [active, options]);
  return null;
}
