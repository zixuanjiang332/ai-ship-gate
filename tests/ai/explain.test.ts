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
});
