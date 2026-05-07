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
type FetchImpl = typeof fetch;
export declare function publishReviewComments(target: ReviewCommentTarget, comments: ReviewCommentPayload[], fetchImpl?: FetchImpl): Promise<void>;
export {};
