import { describe, expect, it, vi } from "vitest";
import { publishReviewComments } from "../../src/action/reviewComments.js";

describe("publishReviewComments", () => {
  it("creates a new review comment when no matching marker exists", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 1, body: "other", path: "src/app.ts" }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 9 }), { status: 201 }));

    await publishReviewComments(
      {
        owner: "zixuanjiang332",
        repo: "releaseguard-ai",
        pullNumber: 17,
        commitId: "abc123",
        token: "token",
      },
      [
        {
          body: "review body\n<!-- releaseguard-ai-review-comment rule=tests.missing-related-tests file=src/app.ts anchor=11 -->",
          file: "src/app.ts",
          line: 11,
        },
      ],
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[1]?.[0]).toContain("/pulls/17/comments");
    expect(fetchImpl.mock.calls[1]?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({
        body: "review body\n<!-- releaseguard-ai-review-comment rule=tests.missing-related-tests file=src/app.ts anchor=11 -->",
        commit_id: "abc123",
        path: "src/app.ts",
        line: 11,
        side: "RIGHT",
      }),
    });
  });

  it("skips creating a duplicate marker-matched review comment", async () => {
    const marker = "<!-- releaseguard-ai-review-comment rule=tests.missing-related-tests file=src/app.ts anchor=11 -->";
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify([{ id: 1, body: `review body\n${marker}`, path: "src/app.ts" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await publishReviewComments(
      {
        owner: "zixuanjiang332",
        repo: "releaseguard-ai",
        pullNumber: 17,
        commitId: "abc123",
        token: "token",
      },
      [{ body: `review body\n${marker}`, file: "src/app.ts", line: 11 }],
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
