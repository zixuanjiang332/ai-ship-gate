import { describe, expect, it, vi } from "vitest";
import { maybeExplainWithAi } from "../../src/ai/explain.js";

const report = {
  verdict: "warn" as const,
  findings: [
    {
      id: "tests.missing-related-tests",
      severity: "warn" as const,
      title: "Source changed without tests",
      message: "Source changed but tests did not.",
      files: ["src/app.ts"],
      suggestion: "Add tests.",
    },
  ],
};

describe("maybeExplainWithAi", () => {
  it("returns undefined when AI is disabled", async () => {
    await expect(maybeExplainWithAi({ enabled: false, report })).resolves.toBeUndefined();
  });

  it("returns undefined when API key is missing", async () => {
    await expect(maybeExplainWithAi({ enabled: true, report, env: {} })).resolves.toBeUndefined();
  });

  it("uses an OpenAI-compatible chat completions API", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Tests should be added before shipping." } }],
      }),
    });

    const summary = await maybeExplainWithAi({
      enabled: true,
      report,
      env: {
        OPENAI_API_KEY: "test-key",
        OPENAI_BASE_URL: "https://api.example.com/v1",
        OPENAI_MODEL: "test-model",
      },
      fetch,
    });

    expect(summary).toBe("Tests should be added before shipping.");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
      }),
    );
    const request = fetch.mock.calls[0]?.[1];
    expect(request?.signal).toBeInstanceOf(AbortSignal);

    const body = JSON.parse(String(request?.body)) as {
      model?: string;
      messages?: Array<{ role?: string; content?: string }>;
      temperature?: number;
    };
    expect(body.model).toBe("test-model");
    expect(body.temperature).toBe(0.2);
    expect(body.messages?.[0]).toMatchObject({
      role: "system",
      content: expect.stringContaining("Do not change the verdict"),
    });
  });

  it("degrades gracefully on provider errors", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("network down"));
    await expect(
      maybeExplainWithAi({
        enabled: true,
        report,
        env: { OPENAI_API_KEY: "test-key" },
        fetch,
      }),
    ).resolves.toBeUndefined();
  });

  it("returns undefined when the provider request is aborted", async () => {
    const abortError = new DOMException("The operation was aborted.", "AbortError");
    const fetch = vi.fn().mockRejectedValue(abortError);

    await expect(
      maybeExplainWithAi({
        enabled: true,
        report,
        env: { OPENAI_API_KEY: "test-key" },
        fetch,
      }),
    ).resolves.toBeUndefined();
  });

  it("returns undefined when the provider request times out", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn((_url: string | URL | Request, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    });

    try {
      const summary = maybeExplainWithAi({
        enabled: true,
        report,
        env: {
          OPENAI_API_KEY: "test-key",
          SHIPGATE_AI_TIMEOUT_MS: "5",
        },
        fetch,
      });

      await vi.advanceTimersByTimeAsync(5);

      await expect(summary).resolves.toBeUndefined();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns undefined on non-OK provider responses", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "bad request" }),
    });

    await expect(
      maybeExplainWithAi({
        enabled: true,
        report,
        env: { OPENAI_API_KEY: "test-key" },
        fetch,
      }),
    ).resolves.toBeUndefined();
  });

  it("returns undefined on malformed provider responses", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await expect(
      maybeExplainWithAi({
        enabled: true,
        report,
        env: { OPENAI_API_KEY: "test-key" },
        fetch,
      }),
    ).resolves.toBeUndefined();
  });

  it("returns undefined for whitespace-only AI content", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "   \n\t  " } }],
      }),
    });

    await expect(
      maybeExplainWithAi({
        enabled: true,
        report,
        env: { OPENAI_API_KEY: "test-key" },
        fetch,
      }),
    ).resolves.toBeUndefined();
  });

  it("normalizes a trailing slash in the base URL", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Looks risky." } }],
      }),
    });

    await maybeExplainWithAi({
      enabled: true,
      report,
      env: {
        OPENAI_API_KEY: "test-key",
        OPENAI_BASE_URL: "https://api.example.com/v1/",
      },
      fetch,
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/v1/chat/completions",
      expect.any(Object),
    );
  });
});
