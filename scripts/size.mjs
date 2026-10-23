import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
for (const file of ["dist/index.js", "dist/react.js"]) {
  const bytes = readFileSync(file),
    gzip = gzipSync(bytes).length;
  console.log(`${file}: ${bytes.length} bytes / ${gzip} gzip`);
  if (gzip > 18000) throw new Error("18 KB gzip budget exceeded");
}
