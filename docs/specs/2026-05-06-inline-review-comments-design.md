# Inline Review Comments Design

## Summary

ReleaseGuard AI already exposes three delivery layers for findings:

- GitHub Step Summary
- Stable pull request summary comment
- CLI and machine-readable formats such as JSON, Markdown, and SARIF

The next feature adds a fourth layer: inline GitHub pull request review comments for high-value findings that can be anchored to exact changed lines in a PR diff.

The goal is to make ReleaseGuard AI feel more native to code review without changing its deterministic-first product boundary. Rules still decide findings and verdicts. Inline comments only improve where findings are surfaced.

This feature targets a pre-v1 minor release: `0.5.0`.

## Goals

- Add optional inline review comments to the GitHub Action.
- Keep the feature off by default.
- Anchor comments only when an exact changed line in the PR diff can be identified.
- Reuse existing deterministic findings rather than inventing a second review engine.
- Limit comment volume so the feature feels useful instead of noisy.
- Keep existing summary, PR comment, and SARIF output unchanged as fallback surfaces.

## Non-Goals

- No auto-fix suggestions or code rewriting.
- No AI-authored review output.
- No file-level fallback comments in v1 when a precise diff anchor cannot be found.
- No automatic deletion or thread-resolution management for stale review comments in v1.
- No expansion of rule semantics beyond mapping existing findings into review comments.

## User Experience

### Action input

Add a new optional input in `action.yml`:

- `review-comments`

Supported values:

- `off`
- `fail-only`
- `smart`
- `always`

Default:

- `off`

Semantics:

- `off`: never publish inline review comments.
- `fail-only`: publish inline review comments only for `fail` findings that can be anchored.
- `smart`: publish inline review comments for all `fail` findings plus a curated subset of high-confidence `warn` findings that can be anchored.
- `always`: publish inline review comments for any finding that can be anchored.

This input is intentionally separate from `pr-comment` because summary comments and inline review comments have very different noise profiles.

### Recommended mode

README examples should recommend:

- `pr-comment: on-failure`
- `review-comments: smart`

That pairing gives users a concise PR-level overview plus targeted line-level nudges.

## Smart Mode Scope

`smart` mode should initially include only findings that are both high-signal and likely to feel useful in review context.

Included in v1:

- `security.secret-in-diff`
- `dependencies.lockfile-not-updated`
- `env.example-not-updated`
- `tests.missing-related-tests`

Excluded in v1:

- broad CI or workflow configuration warnings
- general deployment warnings
- Docker healthcheck suggestions
- findings that only describe repository-level state without a stable line anchor

The included set should be expressed in code as a small explicit allowlist so it is easy to audit and expand later.

## Comment Anchor Model

Inline review comments should only be published when ReleaseGuard AI can identify:

- the changed file path in the PR diff
- a specific added line in that diff suitable for commenting

Anchor strategy by finding type:

- `security.secret-in-diff`: anchor to the first added line in the affected file that matches the secret-like signal.
- `dependencies.lockfile-not-updated`: anchor to the first added or modified manifest line in `package.json`, `pyproject.toml`, `requirements.txt`, `go.mod`, `Cargo.toml`, or `pom.xml`.
- `env.example-not-updated`: anchor to the added env variable line in the source diff when possible.
- `tests.missing-related-tests`: anchor to the first added line in the changed source-like file that triggered the rule.

If no exact anchor is available:

- do not publish an inline review comment
- continue surfacing the finding through existing summary channels

This keeps the first release precise and avoids the risk of misleading or awkward file-level comments.

## GitHub API Behavior

### Event boundary

Inline review comments should only run for `pull_request` events. They should not run for:

- `push`
- `pull_request_target`
- local CLI execution

### Publishing model

Use GitHub review comment APIs rather than issue comments. The feature should post standalone review comments tied to diff positions, not full review submissions that batch comments together.

### De-duplication

ReleaseGuard AI should avoid posting duplicate inline comments across reruns.

V1 approach:

- add a hidden marker to every generated inline comment body
- include structured identity data in the marker, at minimum:
  - finding rule id
  - file path
  - anchor line identity used at creation time
- list existing review comments created by ReleaseGuard AI on the PR
- if an existing comment has the same marker identity, do not create a second one

V1 intentionally does not try to edit or delete stale inline comments after the underlying finding disappears. The primary requirement is preventing rerun spam.

## Comment Content

Inline review comments should stay short and actionable.

Suggested structure:

```md
ReleaseGuard AI: source-like changes landed without related tests.

Rule: `tests.missing-related-tests`
Suggestion: Add or update tests that cover the changed behavior before shipping.
<!-- releaseguard-ai-review-comment rule=tests.missing-related-tests file=src/auth.ts anchor=17 -->
```

Content rules:

- no large tables
- no full report summary
- no AI summary section
- include the rule id for traceability
- include a single concise suggestion
- sanitize Markdown the same way existing PR comments do

## Architecture

Add a dedicated inline review comment path instead of extending the existing summary comment module.

### New modules

- `src/action/reviewComments.ts`
  - GitHub API integration for listing and creating review comments
  - de-duplication logic
- `src/reporters/reviewComment.ts`
  - renders single inline comment bodies from findings
- `src/action/diffAnchors.ts`
  - maps findings plus changed file patches into concrete review anchors

### Updated modules

- `src/action.ts`
  - parse `review-comments`
  - decide whether to publish inline comments
  - call anchor resolution and review comment publishing after `runCheck`
- `src/domain/types.ts`
  - may add small helper types for review comment modes or anchor objects if needed
- `action.yml`
  - expose the new input
- `README.md`
  - document feature behavior and examples
- `docs/release.md`
  - include release notes and checklist updates

This split keeps the current architecture clean:

- reporter modules render content
- action modules handle GitHub-specific behavior
- rule engine remains unchanged

## Data Flow

1. GitHub Action runs `runCheck` and receives the deterministic report.
2. `runAction` parses `review-comments` mode.
3. If the event is a PR and the mode allows review comments:
   - derive candidate findings from the report based on the selected mode
   - resolve each candidate into an anchor using changed file patches already present in the gate context or a lightweight re-read of the event diff inputs
   - render inline comment content
   - query existing ReleaseGuard review comments
   - create only missing comments
4. Step Summary, normal PR summary comment, and outputs continue to run as they do today.

One implementation detail needs deliberate handling: `runAction` currently receives only the final `GateReport`. Inline anchoring also needs access to changed file patches. The implementation plan should choose one of these two approaches:

1. extend the action path so it can access the `GateContext` used by `runCheck`
2. add a focused follow-up collection step in action mode that reconstructs changed files for anchoring

Recommendation: prefer reusing the existing `GateContext` collected during the check so the action does not run duplicate git diff logic.

## Error Handling

- If review comment publishing fails, the action should fail closed only when the check itself already fails for another reason. Inline comments are helpful but not the primary gate result.
- A GitHub API failure should be logged clearly to stderr.
- If a single finding cannot be anchored, skip it and continue processing the rest.
- Invalid `review-comments` input should normalize to `off`, matching the conservative behavior used for `pr-comment`.

## Testing Strategy

This feature should be implemented test-first.

### Reporter tests

- renders concise inline review comment content
- includes rule id and suggestion
- includes hidden marker identity
- sanitizes Markdown-sensitive characters

### Anchor resolution tests

- resolves a secret finding to the correct added line
- resolves a missing-tests finding to the first added source line
- resolves a lockfile warning to a manifest line
- skips when no stable added line exists

### Action behavior tests

- `review-comments` defaults to `off`
- `fail-only` only selects `fail` findings
- `smart` selects the allowlisted `warn` findings but not other warns
- `always` attempts all anchorable findings
- no inline comments are published outside `pull_request`
- duplicate inline comments are not recreated on rerun
- summary comment behavior remains unchanged

### GitHub API tests

- list existing review comments
- create a new comment with the right payload
- skip creation when marker identity already exists
- surface request failures clearly

## Release Impact

Version bump:

- `0.5.0`

Release artifacts to update:

- `package.json`
- `README.md`
- `CHANGELOG.md` if present
- `docs/release.md`
- `action.yml`

README examples should show:

- `review-comments: smart`
- the continued separation between PR summary comments and inline review comments

## Open Questions Resolved

- File-level fallback comments: not in v1.
- Default mode: `off`.
- Recommended mode: `smart`.
- Summary comments remain separate from inline review comments.
- Stale inline comments are tolerated in v1; de-duplication matters more than cleanup.

## Acceptance Criteria

- GitHub Action exposes `review-comments` with default `off`.
- `smart` mode only emits inline comments for the allowlisted finding ids.
- Inline comments are created only for findings with exact diff anchors.
- Rerunning the workflow does not create duplicate inline comments for the same anchored finding.
- Existing Step Summary and PR summary comment behavior keeps working.
- Tests cover reporter rendering, anchor resolution, mode selection, and de-duplication.
