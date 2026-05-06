import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import {
  normalizeSourceMapFile,
} from "../../scripts/normalize-action-sourcemap.mjs";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
  );
  tempDirs.length = 0;
});

describe("normalizeSourceMapFile", () => {
  test("normalizes embedded sourcesContent line endings to LF", async () => {
    const dir = await mkdtemp(join(tmpdir(), "releaseguard-sourcemap-"));
    tempDirs.push(dir);
    const mapPath = join(dir, "action.js.map");
    const sourceMap = {
      version: 3,
      sources: ["../src/example.ts"],
      sourcesContent: [
        "const value = 1;\r\nconst ellipsis = '...'; // \u2026\r\nexport { value };\r\n",
      ],
      mappings: "",
    };
    await writeFile(mapPath, JSON.stringify(sourceMap), "utf8");

    await normalizeSourceMapFile(mapPath);

    const normalizedText = await readFile(mapPath, "utf8");
    const normalized = JSON.parse(normalizedText) as typeof sourceMap;
    expect(normalized.sourcesContent[0]).toBe(
      "const value = 1;\nconst ellipsis = '...'; // \u2026\nexport { value };\n",
    );
    expect(normalizedText).toContain('  "sourcesContent": ["const value = 1;\\n');
    expect(normalizedText).toContain("\\u2026");
    expect(normalizedText.endsWith("\n")).toBe(true);
  });
});
