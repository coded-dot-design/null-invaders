import { createNullInvaders } from "@coded-design/null-invaders";
import { NullInvaders } from "@coded-design/null-invaders/react";
const game = createNullInvaders({ root: "main" });
game.getSnapshot().weapon?.toFixed();
// @ts-expect-error Generated declarations preserve game-specific fields.
game.getSnapshot().weapon?.toUpperCase();
// @ts-expect-error Published React declarations preserve configuration types.
NullInvaders({ options: { targetSelector: 42 } });
NullInvaders({ active: true, options: { theme: "system" } });
