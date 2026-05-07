import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import esbuild from "esbuild";

const outdir = resolve("dist/console");

await mkdir(outdir, { recursive: true });

await esbuild.build({
  entryPoints: [resolve("src/console/browser/main.ts")],
  bundle: true,
  platform: "browser",
  format: "esm",
  target: ["es2022"],
  sourcemap: true,
  outfile: resolve(outdir, "app.js"),
});

await copyFile(resolve("src/console/browser/index.html"), resolve(outdir, "index.html"));
await copyFile(resolve("src/console/browser/styles.css"), resolve(outdir, "styles.css"));
