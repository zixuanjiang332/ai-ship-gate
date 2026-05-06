export interface PullRequestCommentTarget {
    owner: string;
    repo: string;
    issueNumber: number;
    body: string;
    token: string;
}
type FetchImpl = typeof fetch;
export declare const releaseGuardCommentMarker = "<!-- releaseguard-ai-comment -->";
export declare function upsertPullRequestComment(target: PullRequestCommentTarget, fetchImpl?: FetchImpl): Promise<void>;
export {};
