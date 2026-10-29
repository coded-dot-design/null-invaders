export type NullInvadersStatus = "idle" | "running" | "paused" | "won" | "gameover" | "destroyed";
export interface NullInvadersOptions {
    /** The board: a selector or an element (default document.body). */
    root?: string | Element;
    /** Text that becomes terrain (default headings, paragraphs, list items, blockquotes). */
    textSelector?: string;
    /** Elements that become invader factories (default buttons and button-like links). */
    targetSelector?: string;
    /** More of the page to leave alone (fields, editable text and dialogs always are). */
    excludeSelector?: string;
    /** "system" (default) follows the visitor's colour scheme. */
    theme?: "dark" | "light" | "system";
    /** Same seed, same run (invader spawns, kinds, sways). */
    seed?: number;
    /** Calm effects (default: the visitor's prefers-reduced-motion). */
    reducedMotion?: boolean;
    /** Start with sound on (default true; it waits for a click or key to unlock). */
    sound?: boolean;
    /** "keyboard": the mouse never steers (default: the mouse steers until a key is pressed). */
    controls?: "mouse" | "keyboard";
    onState?: (state: NullInvadersSnapshot) => void;
    onEvent?: (event: {
        type: string;
        game: "null-invaders";
        [key: string]: unknown;
    }) => void;
    onError?: (error: unknown) => void;
}
export interface NullInvadersStats {
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
    player: {
        x: number;
        y: number;
        angle: number;
    };
    detail: string;
    /** The page as the board: letters indexed, on screen, turned to bits, and the range reads the last
     *  measurement made (never more than its budget). The same fields as 0.7.x. */
    board: {
        indexed: number;
        visible: number;
        spent: number;
        measurements: number;
    };
    /** Sparks alive (at most 100). */
    particles: number;
}
export interface NullInvadersSnapshot extends Partial<NullInvadersStats> {
    id: "null-invaders";
    status: NullInvadersStatus;
    elapsed: number;
    frameMs: number;
    maxFrameMs: number;
    notice: string;
}
export interface NullInvadersController {
    start(): NullInvadersSnapshot;
    pause(): void;
    resume(): void;
    stop(): void;
    destroy(): void;
    getSnapshot(): NullInvadersSnapshot;
}
export declare function createNullInvaders(options?: NullInvadersOptions): NullInvadersController;
