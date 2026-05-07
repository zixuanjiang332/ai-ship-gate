import { readFile, stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import type { FailOn } from "../domain/types.js";
import type { ConsoleResult, ConsoleRunRequest } from "./contracts.js";
import { consoleDemoResult } from "./demo.js";
import { runConsoleCheck as defaultRunConsoleCheck } from "./service.js";

const defaultAssetRoot = fileURLToPath(new URL("../../dist/console", import.meta.url));
const defaultShell = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ReleaseGuard Local Console</title>
  </head>
  <body>
    <main>
      <h1>ReleaseGuard Local Console</h1>
      <p>Console assets are not built yet.</p>
    </main>
  </body>
</html>
`;

export interface CreateConsoleServerOptions {
  port: number;
  assetRoot?: string;
  demoResult?: ConsoleResult;
  runConsoleCheck?: (request: ConsoleRunRequest) => Promise<ConsoleResult>;
}

export async function createConsoleServer(options: CreateConsoleServerOptions): Promise<Server> {
  const server = createServer(async (request, response) => {
    try {
      await routeRequest(request, response, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      json(response, 500, { error: message });
    }
  });

  await new Promise<void>((resolve, reject) => {
    const handleError = (error: Error) => {
      server.off("listening", handleListening);
      reject(error);
    };
    const handleListening = () => {
      server.off("error", handleError);
      resolve();
    };

    server.once("error", handleError);
    server.once("listening", handleListening);
    server.listen(options.port, "127.0.0.1");
  });

  return server;
}

async function routeRequest(
  request: IncomingMessage,
  response: ServerResponse,
  options: CreateConsoleServerOptions,
): Promise<void> {
  const method = request.method ?? "GET";
  const url = new URL(request.url ?? "/", "http://127.0.0.1");

  if (method === "GET" && url.pathname === "/api/demo") {
    json(response, 200, options.demoResult ?? consoleDemoResult);
    return;
  }

  if (method === "POST" && url.pathname === "/api/run") {
    let body: unknown;

    try {
      body = await readJsonBody<unknown>(request);
    } catch {
      json(response, 400, { error: "Invalid JSON body." });
      return;
    }

    const validationError = await validateRunRequest(body);
    if (validationError) {
      json(response, 400, { error: validationError });
      return;
    }

    const requestBody = body as ConsoleRunRequest;
    const runConsoleCheck = options.runConsoleCheck ?? defaultRunConsoleCheck;
    try {
      const result = await runConsoleCheck(requestBody);
      json(response, 200, result);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unable to run ReleaseGuard on the requested repository.";
      json(response, 400, { error: message });
    }
    return;
  }

  await serveStaticAsset(response, options.assetRoot ?? defaultAssetRoot, url.pathname);
}

async function serveStaticAsset(response: ServerResponse, assetRoot: string, pathname: string): Promise<void> {
  if (pathname === "/") {
    const file = await readFileOrNull(join(assetRoot, "index.html"));
    if (file) {
      response.statusCode = 200;
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(file);
      return;
    }

    response.statusCode = 200;
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(defaultShell);
    return;
  }

  const relativePath = normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "").replace(/^[/\\]+/, "");
  const filePath = join(assetRoot, relativePath);
  const file = await readFileOrNull(filePath);

  if (!file) {
    json(response, 404, { error: "Not found." });
    return;
  }

  response.statusCode = 200;
  response.setHeader("content-type", contentTypeFor(filePath));
  response.end(file);
}

function json(response: ServerResponse, status: number, payload: unknown): void {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  const chunks: Uint8Array[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}

async function readFileOrNull(filePath: string): Promise<Buffer | null> {
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}

function contentTypeFor(filePath: string): string {
  switch (extname(filePath)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    default:
      return "text/html; charset=utf-8";
  }
}

async function validateRunRequest(body: unknown): Promise<string | undefined> {
  if (!isPlainObject(body)) {
    return "Request body must be an object.";
  }

  if (typeof body.repoPath !== "string" || body.repoPath.trim().length === 0) {
    return "repoPath is required.";
  }

  if (body.base !== undefined && typeof body.base !== "string") {
    return "base must be a string when provided.";
  }

  if (!isFailOn(body.failOn)) {
    return "failOn must be either 'fail' or 'warn'.";
  }

  if (!isPlainObject(body.checks)) {
    return "checks is required.";
  }

  for (const key of ["tests", "dependencies", "env", "ci", "docker", "security"] as const) {
    if (typeof body.checks[key] !== "boolean") {
      return `checks.${key} must be a boolean.`;
    }
  }

  try {
    const repoStats = await stat(body.repoPath);
    if (!repoStats.isDirectory()) {
      return "repoPath must point to a directory.";
    }
  } catch {
    return "repoPath does not exist.";
  }

  return undefined;
}

function isFailOn(value: unknown): value is FailOn {
  return value === "fail" || value === "warn";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
