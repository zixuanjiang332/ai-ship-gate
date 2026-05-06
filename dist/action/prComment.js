export const releaseGuardCommentMarker = "<!-- releaseguard-ai-comment -->";
export async function upsertPullRequestComment(target, fetchImpl = fetch) {
    const comments = await listComments(target, fetchImpl);
    const existing = comments.find((comment) => comment.body.includes(releaseGuardCommentMarker));
    if (existing) {
        await request(`https://api.github.com/repos/${target.owner}/${target.repo}/issues/comments/${existing.id}`, {
            method: "PATCH",
            headers: jsonHeaders(target.token),
            body: JSON.stringify({ body: target.body }),
        }, fetchImpl);
        return;
    }
    await request(`https://api.github.com/repos/${target.owner}/${target.repo}/issues/${target.issueNumber}/comments`, {
        method: "POST",
        headers: jsonHeaders(target.token),
        body: JSON.stringify({ body: target.body }),
    }, fetchImpl);
}
async function listComments(target, fetchImpl) {
    return request(`https://api.github.com/repos/${target.owner}/${target.repo}/issues/${target.issueNumber}/comments?per_page=100`, {
        method: "GET",
        headers: jsonHeaders(target.token),
    }, fetchImpl);
}
async function request(url, init, fetchImpl) {
    const response = await fetchImpl(url, init);
    if (!response.ok) {
        throw new Error(`GitHub comment request failed: ${response.status} ${response.statusText}`);
    }
    if (response.status === 204)
        return undefined;
    return response.json();
}
function jsonHeaders(token) {
    return {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "content-type": "application/json",
        "user-agent": "releaseguard-ai",
    };
}
//# sourceMappingURL=prComment.js.map