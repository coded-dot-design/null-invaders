// The size budget (gzip), checked in CI. 1.0.0, the first build on Fizlet: dist/index.js is 26,434 B
// (0.7.2 on the DOM VIRUS core: 22,940 B). The Board UI kit's CSS (keys, readouts, toast, touch pad:
// the family's one button language) is 2,702 B of it; the same build without that CSS is 23,732 B.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
const BUDGET = 28000;
for (const file of ["dist/index.js", "dist/react.js"]) {
  const bytes = readFileSync(file), gzip = gzipSync(bytes).length;
  console.log(`${file}: ${bytes.length} bytes / ${gzip} gzip (budget ${BUDGET})`);
  if (gzip > BUDGET) throw new Error(`${file}: ${gzip} B gzip is over the ${BUDGET} B budget`);
}
