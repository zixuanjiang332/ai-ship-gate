interface ReviewCommentTarget {
  owner: string;
  repo: string;
  pullNumber: number;
  commitId: string;
  token: string;
}

interface ReviewCommentPayload {
  body: string;
  file: string;
  line: number;
}

interface ExistingReviewComment {
  id: number;
  body: string;
}

type FetchImpl = typeof fetch;

export async function publishReviewComments(
  target: ReviewCommentTarget,
  comments: ReviewCommentPayload[],
  fetchImpl: FetchImpl = fetch,
): Promise<void> {
  const existingComments = (await request(
    `https://api.github.com/repos/${target.owner}/${target.repo}/pulls/${target.pullNumber}/comments?per_page=100`,
    {
      method: "GET",
      headers: jsonHeaders(target.token),
    },
    fetchImpl,
  )) as ExistingReviewComment[];

  for (const comment of comments) {
    if (existingComments.some((existingComment) => existingComment.body.includes(markerIdentity(comment.body)))) {
      continue;
    }

    await request(
      `https://api.github.com/repos/${target.owner}/${target.repo}/pulls/${target.pullNumber}/comments`,
      {
        method: "POST",
        headers: jsonHeaders(target.token),
        body: JSON.stringify({
          body: comment.body,
          commit_id: target.commitId,
          path: comment.file,
          line: comment.line,
          side: "RIGHT",
        }),
      },
      fetchImpl,
    );
  }
}

function markerIdentity(body: string): string {
  return body.split("\n").find((line) => line.includes("releaseguard-ai-review-comment")) ?? body;
}

async function request(url: string, init: RequestInit, fetchImpl: FetchImpl): Promise<unknown> {
  const response = await fetchImpl(url, init);
  if (!response.ok) {
    throw new Error(`GitHub review comment request failed: ${response.status} ${response.statusText}`);
  }

  if (response.status === 204) {
    return undefined;
  }

  return response.json();
}

function jsonHeaders(token: string): HeadersInit {
  return {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "content-type": "application/json",
    "user-agent": "releaseguard-ai",
  };
}
