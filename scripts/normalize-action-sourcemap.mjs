import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export function normalizeSourceMapText(text) {
  const sourceMap = JSON.parse(text);
  if (!Array.isArray(sourceMap.sourcesContent)) {
    return text;
  }

  let changed = false;
  sourceMap.sourcesContent = sourceMap.sourcesContent.map((content) => {
    if (typeof content !== "string") {
      return content;
    }

    const normalized = content.replace(/\r\n?/g, "\n");
    changed ||= normalized !== content;
    return normalized;
  });

  return changed ? formatEsbuildSourceMap(sourceMap) : text;
}

function formatEsbuildSourceMap(sourceMap) {
  const entries = Object.entries(sourceMap).map(
    ([key, value]) => `  ${JSON.stringify(key)}: ${formatTopLevelValue(value)}`,
  );
  return `{\n${entries.join(",\n")}\n}\n`;
}

function formatTopLevelValue(value) {
  if (!Array.isArray(value)) {
    return stringifyForEsbuild(value);
  }

  return `[${value.map((item) => stringifyForEsbuild(item)).join(", ")}]`;
}

function stringifyForEsbuild(value) {
  return JSON.stringify(value).replace(/[^\x00-\x7F]/g, (character) => {
    return `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`;
  });
}

export async function normalizeSourceMapFile(filePath) {
  const text = await readFile(filePath, "utf8");
  const normalized = normalizeSourceMapText(text);
  if (normalized !== text) {
    await writeFile(filePath, normalized, "utf8");
  }
}

const invokedAsScript = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (invokedAsScript) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error(
      "Usage: node scripts/normalize-action-sourcemap.mjs <source-map>",
    );
    process.exitCode = 1;
  } else {
    try {
      await normalizeSourceMapFile(filePath);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
