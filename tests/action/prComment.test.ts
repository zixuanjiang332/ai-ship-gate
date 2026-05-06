import { describe, expect, it, vi } from "vitest";
import { releaseGuardCommentMarker, upsertPullRequestComment } from "../../src/action/prComment.js";

describe("upsertPullRequestComment", () => {
  it("creates a new comment when no existing marker comment is found", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 1, body: "other comment" }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 9 }), { status: 201 }));

    await upsertPullRequestComment(
      {
        owner: "zixuanjiang332",
        repo: "releaseguard-ai",
        issueNumber: 15,
        body: `${releaseGuardCommentMarker}\ncomment body`,
        token: "token",
      },
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[1]?.[0]).toContain("/repos/zixuanjiang332/releaseguard-ai/issues/15/comments");
    expect(fetchImpl.mock.calls[1]?.[1]).toMatchObject({
      method: "POST",
      headers: expect.objectContaining({
        authorization: "Bearer token",
      }),
      body: JSON.stringify({ body: `${releaseGuardCommentMarker}\ncomment body` }),
    });
  });

  it("updates the existing marker comment on reruns", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 33, body: `${releaseGuardCommentMarker}\nold body` }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 33 }), { status: 200 }));

    await upsertPullRequestComment(
      {
        owner: "zixuanjiang332",
        repo: "releaseguard-ai",
        issueNumber: 15,
        body: `${releaseGuardCommentMarker}\nnew body`,
        token: "token",
      },
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[1]?.[0]).toContain("/repos/zixuanjiang332/releaseguard-ai/issues/comments/33");
    expect(fetchImpl.mock.calls[1]?.[1]).toMatchObject({
      method: "PATCH",
      body: JSON.stringify({ body: `${releaseGuardCommentMarker}\nnew body` }),
    });
  });
});
