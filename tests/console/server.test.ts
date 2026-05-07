import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ConsoleResult, ConsoleRunRequest } from "../../src/console/contracts.js";
import { createConsoleServer } from "../../src/console/server.js";

let assetDir = "";
let repoDir = "";

async function closeServer(server: { close: (callback: (error?: Error | null) => void) => void }): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

afterEach(async () => {
  if (assetDir) {
    await rm(assetDir, { recursive: true, force: true });
    assetDir = "";
  }
  if (repoDir) {
    await rm(repoDir, { recursive: true, force: true });
    repoDir = "";
  }
});

describe("createConsoleServer", () => {
  it("serves the demo payload", async () => {
    const server = await createConsoleServer({ port: 0 });

    try {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      const response = await fetch(`http://127.0.0.1:${port}/api/demo`);
      const body = (await response.json()) as ConsoleResult;

      expect(response.status).toBe(200);
      expect(body.source).toBe("demo");
      expect(body.findingsCount).toBe(4);
      expect(body.files).toHaveLength(6);
    } finally {
      await closeServer(server);
    }
  });

  it("posts a structured local run request to the service", async () => {
    repoDir = await mkdtemp(join(tmpdir(), "releaseguard-console-repo-"));
    const runConsoleCheck = vi.fn(async (request: ConsoleRunRequest): Promise<ConsoleResult> => ({
      source: "local",
      repoPath: request.repoPath,
      baseRef: request.base ?? "origin/main",
      verdict: "pass",
      findings: [],
      files: [],
      findingsCount: 0,
      affectedFilesCount: 0,
      counts: {
        fail: 0,
        warn: 0,
        info: 0,
      },
      effectiveConfig: {
        failOn: request.failOn,
        checks: request.checks,
      },
    }));
    const server = await createConsoleServer({ port: 0, runConsoleCheck });

    try {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      const requestBody: ConsoleRunRequest = {
        repoPath: repoDir,
        base: "main",
        failOn: "warn",
        checks: {
          tests: true,
          dependencies: false,
          env: true,
          ci: true,
          docker: false,
          security: true,
        },
      };

      const response = await fetch(`http://127.0.0.1:${port}/api/run`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      const body = (await response.json()) as ConsoleResult;

      expect(response.status).toBe(200);
      expect(body.source).toBe("local");
      expect(body.repoPath).toBe(repoDir);
      expect(runConsoleCheck).toHaveBeenCalledWith(requestBody);
    } finally {
      await closeServer(server);
    }
  });

  it("returns a 400 response when required request fields are missing", async () => {
    const server = await createConsoleServer({ port: 0 });

    try {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      const response = await fetch(`http://127.0.0.1:${port}/api/run`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "repoPath is required." });
    } finally {
      await closeServer(server);
    }
  });

  it("returns a 400 response for malformed JSON", async () => {
    const server = await createConsoleServer({ port: 0 });

    try {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      const response = await fetch(`http://127.0.0.1:${port}/api/run`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: "{",
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Invalid JSON body." });
    } finally {
      await closeServer(server);
    }
  });

  it("serves a static shell from the configured asset root", async () => {
    assetDir = await mkdtemp(join(tmpdir(), "releaseguard-console-assets-"));
    await writeFile(
      join(assetDir, "index.html"),
      '<!doctype html><title>ReleaseGuard Local Console</title><button id="switch-run">Run On Local Repo</button><input id="repo-path" />',
    );

    const server = await createConsoleServer({ port: 0, assetRoot: assetDir });

    try {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      const response = await fetch(`http://127.0.0.1:${port}/`);
      const body = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
      expect(body).toContain("ReleaseGuard Local Console");
      expect(body).toContain("Run On Local Repo");
      expect(body).toContain('id="repo-path"');
    } finally {
      await closeServer(server);
    }
  });

  it("serves the default review desk shell with decision and workspace anchors", async () => {
    const browserAssetRoot = join(process.cwd(), "src", "console", "browser");
    const server = await createConsoleServer({ port: 0, assetRoot: browserAssetRoot });

    try {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      const response = await fetch(`http://127.0.0.1:${port}/`);
      const body = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
      expect(body).toContain('id="summary-status"');
      expect(body).toContain('id="summary-metrics"');
      expect(body).toContain('id="detail-title"');
      expect(body).toContain('id="detail-subtitle"');
      expect(body).toContain('id="run-band"');
      expect(body).toContain("Priority Queue");
      expect(body).toContain("Review Workspace");
      expect(body).toContain("Evidence Map");
    } finally {
      await closeServer(server);
    }
  });

  it("returns 404 when a static asset is missing", async () => {
    assetDir = await mkdtemp(join(tmpdir(), "releaseguard-console-assets-"));
    const server = await createConsoleServer({ port: 0, assetRoot: assetDir });

    try {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      const response = await fetch(`http://127.0.0.1:${port}/missing.js`);

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Not found." });
    } finally {
      await closeServer(server);
    }
  });

  it("rejects startup when the requested port is already in use", async () => {
    const occupied = createHttpServer();
    await new Promise<void>((resolve) => occupied.listen(0, "127.0.0.1", () => resolve()));

    try {
      const address = occupied.address();
      const port = typeof address === "object" && address ? address.port : 0;

      await expect(createConsoleServer({ port })).rejects.toMatchObject({ code: "EADDRINUSE" });
    } finally {
      await closeServer(occupied);
    }
  });
});
