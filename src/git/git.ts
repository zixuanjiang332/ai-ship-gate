import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ChangedFile, GateContext, ProjectMetadata } from "../domain/types.js";

type Exec = (args: string[], cwd: string) => Promise<string>;

const execFileAsync = promisify(execFile);

export async function collectGitContext(options: {
  cwd: string;
  base?: string;
  exec?: Exec;
}): Promise<GateContext> {
  const exec = options.exec ?? git;
  const repoRoot = (await exec(["rev-parse", "--show-toplevel"], options.cwd)).trim();
  const baseRef = options.base ?? (await resolveDefaultBase(exec, repoRoot));
  const nameStatus = await exec(["diff", "--name-status", baseRef, "--"], repoRoot);
  const patch = await exec(["diff", "--unified=0", baseRef, "--"], repoRoot);
  const trackedFiles = await exec(["ls-files"], repoRoot);

  return {
    repoRoot,
    baseRef,
    changedFiles: parseChangedFiles(nameStatus, patch),
    metadata: detectMetadata(trackedFiles),
  };
}

export function parseChangedFiles(nameStatus: string, patch: string): ChangedFile[] {
  return parseNameStatus(nameStatus).map((file) => ({
    ...file,
    patch: extractPatchForPath(patch, file.path),
  }));
}

export function parseNameStatus(nameStatus: string): Array<Omit<ChangedFile, "patch">> {
  return nameStatus
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [statusCode, firstPath, secondPath] = line.split("\t");
      const path = statusCode.startsWith("R") ? secondPath : firstPath;
      return {
        path,
        status: statusFromCode(statusCode),
      };
    });
}

function statusFromCode(code: string): ChangedFile["status"] {
  if (code === "A") return "added";
  if (code === "M") return "modified";
  if (code === "D") return "deleted";
  if (code.startsWith("R")) return "renamed";
  return "unknown";
}

function extractPatchForPath(patch: string, path: string): string {
  return splitPatchSections(patch).find((section) => section.path === path)?.patch ?? "";
}

function splitPatchSections(patch: string): Array<{ path: string; patch: string }> {
  const headers = [...patch.matchAll(/^diff --git .*(?:\r?\n|$)/gm)];

  return headers
    .map((match, index) => {
      const start = match.index ?? 0;
      const next = headers[index + 1];
      const section = patch.slice(start, next?.index);
      const header = match[0].trimEnd();
      const path = parseDiffHeaderTargetPath(header);
      return path === undefined ? undefined : { path, patch: section };
    })
    .filter((section): section is { path: string; patch: string } => section !== undefined);
}

function parseDiffHeaderTargetPath(header: string): string | undefined {
  const paths = header.slice("diff --git ".length);
  const quoted = paths.match(/^"a\/((?:[^"\\]|\\.)*)"\s+"b\/((?:[^"\\]|\\.)*)"$/);
  if (quoted) {
    return unquoteGitPath(quoted[2]);
  }

  if (!paths.startsWith("a/")) return undefined;

  const targetMarker = " b/";
  const targetIndex = paths.lastIndexOf(targetMarker);
  if (targetIndex === -1) return undefined;

  return paths.slice(targetIndex + targetMarker.length);
}

function unquoteGitPath(path: string): string {
  try {
    return JSON.parse(`"${path}"`) as string;
  } catch {
    return path;
  }
}

function detectMetadata(lsFilesOutput: string): ProjectMetadata {
  const files = new Set(lsFilesOutput.split(/\r?\n/).filter(Boolean));
  const hasAny = (...paths: string[]) => paths.some((path) => files.has(path));
  const hasPrefix = (prefix: string) => [...files].some((file) => file.startsWith(prefix));

  return {
    hasPackageJson: files.has("package.json"),
    hasPackageLock: files.has("package-lock.json"),
    hasPnpmLock: files.has("pnpm-lock.yaml"),
    hasYarnLock: files.has("yarn.lock"),
    hasPyproject: files.has("pyproject.toml"),
    hasRequirements: files.has("requirements.txt"),
    hasGoMod: files.has("go.mod"),
    hasCargoToml: files.has("Cargo.toml"),
    hasPomXml: files.has("pom.xml"),
    hasDockerfile: files.has("Dockerfile") || [...files].some((file) => file.endsWith("/Dockerfile")),
    hasCompose: hasAny("docker-compose.yml", "docker-compose.yaml"),
    hasGitHubActions: hasPrefix(".github/workflows/"),
    hasEnvExample: hasAny(".env.example", ".env.sample", "env.example"),
  };
}

async function resolveDefaultBase(exec: Exec, cwd: string): Promise<string> {
  for (const candidate of ["main", "master", "origin/main", "origin/master"]) {
    try {
      return (await exec(["merge-base", "HEAD", candidate], cwd)).trim();
    } catch {
      continue;
    }
  }

  throw new Error("Unable to resolve a base ref. Pass --base <ref>.");
}

async function git(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd });
  return String(stdout);
}
