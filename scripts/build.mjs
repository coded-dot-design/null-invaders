import '../shared/build-game.mjs';
import { execFileSync } from 'node:child_process';
execFileSync(process.execPath,['--import','tsx','scripts/build-art.ts'],{stdio:'inherit'});
