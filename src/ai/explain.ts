import type { GateReport } from "../domain/types.js";

interface ExplainOptions {
  enabled: boolean;
  report: Pick<GateReport, "verdict" | "findings">;
  env?: Record<string, string | undefined>;
  fetch?: typeof fetch;
}

export async function maybeExplainWithAi(options: ExplainOptions): Promise<string | undefined> {
  if (!options.enabled) return undefined;

  const env = options.env ?? process.env;
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) return undefined;

  const baseUrl = (env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const model = env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const fetchImpl = options.fetch ?? fetch;

  try {
    const response = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You summarize deterministic release gate findings. Do not change the verdict. Keep the answer under 120 words.",
          },
          {
            role: "user",
            content: JSON.stringify(options.report),
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) return undefined;

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() || undefined;
  } catch {
    return undefined;
  }
}
