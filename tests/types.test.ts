import { createNullInvaders } from "../src/index.js";
import { NullInvaders } from "../src/react.js";
const game = createNullInvaders({
  onState(state) {
    const value: number | undefined = state.weapon;
    void value;
    // @ts-expect-error Game-specific snapshot fields retain their type.
    const wrong: string = state.weapon;
    void wrong;
  },
});
game.destroy();
// @ts-expect-error Invalid controls are caught before running a game.
createNullInvaders({ controls: "joystick" });
// @ts-expect-error The shared React adapter preserves option types.
NullInvaders({ options: { targetSelector: 12 } });
