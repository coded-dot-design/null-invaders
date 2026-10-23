import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
let build;
try {
  ({ build } = require("esbuild"));
} catch {
  ({ build } = require("../../dom-virus/node_modules/esbuild"));
}
const local = resolve("../dom-virus/src/index.js");
const snapshot = resolve("shared/core.js");
mkdirSync("dist", { recursive: true });
if (existsSync(local)) {
  mkdirSync("shared", { recursive: true });
  await build({
    entryPoints: [local],
    outfile: snapshot,
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    minify: true,
    legalComments: "none",
  });
  copyFileSync(resolve(local, "../index.d.ts"), "shared/core.d.ts");
  const hash = createHash("sha256");
  for (const file of readdirSync(resolve(local, "..")).sort())
    hash.update(file).update(readFileSync(resolve(local, "..", file)));
  writeFileSync(
    "shared/ORIGIN.json",
    JSON.stringify(
      {
        project: "https://github.com/coded-dot-design/dom-virus",
        version: "0.1.0",
        sourceSha256: hash.digest("hex"),
        license: "MIT",
        note: "Generated runtime snapshot. Edit the canonical dom-virus/src sources, then rebuild with the repositories side by side.",
      },
      null,
      2,
    ) + "\n",
  );
}
if (!existsSync(snapshot))
  throw new Error(
    "Missing shared runtime snapshot. Check out dom-virus beside this repository and rebuild.",
  );
const common = {
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  legalComments: "none",
  alias: { "@coded-design/dom-virus": snapshot },
};
await build({
  ...common,
  entryPoints: ["src/index.js"],
  outfile: "dist/index.js",
});
await build({
  ...common,
  entryPoints: ["src/react.js"],
  outfile: "dist/react.js",
  external: ["react"],
});
for (const name of ["index.d.ts", "react.d.ts"])
  copyFileSync("src/" + name, "dist/" + name);
copyFileSync("shared/core.d.ts", "dist/types.d.ts");
const { name, version } = JSON.parse(readFileSync("package.json", "utf8"));
console.log(`${name}@${version}: independent ESM + React builds ready.`);
