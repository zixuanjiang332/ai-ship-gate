# AI Ship Gate Project Presentation and Release Prep Design

## Purpose

AI Ship Gate is already a working MVP. The next iteration should make it look credible, memorable, and ready for public evaluation on GitHub without claiming a full v1 release yet.

This work combines two goals:

- Improve the repository's first impression so developers and recruiters understand the value quickly.
- Add release-prep infrastructure so the project appears maintainable and safe to try.

This iteration does not add core product features. It packages the existing CLI and GitHub Action more professionally.

## Scope

In scope:

- Rewrite and expand the GitHub-facing README.
- Add visual README assets using the approved direction.
- Add project governance documents.
- Add CI and release-readiness checks.
- Add documentation for release and Marketplace readiness.
- Keep the current CLI and Action behavior unchanged unless a documentation or CI check exposes a real packaging defect.

Out of scope:

- Creating a `v1` tag.
- Publishing to npm.
- Publishing to GitHub Marketplace.
- Adding PR comments, SARIF, dashboards, SaaS features, or new risk-rule categories.
- Replacing the current deterministic rule engine.

## Visual Direction

The approved visual style is inspired by a cinematic technical landing page, adapted for open source:

- Black foundation, not flat gray.
- Subtle colored atmosphere using cyan, green, amber, coral, and small purple-blue edge light.
- Code-grid or terminal-diff texture in the background.
- PASS, WARN, and FAIL as the primary status colors.
- A compact command CTA such as `npx ai-ship-gate check`.
- Serious open-source tool tone rather than a marketing campaign page.

The main visual asset should communicate the product in one glance:

> AI-generated diffs enter the gate; deterministic checks produce PASS, WARN, or FAIL.

The asset should be committed as a repository-native SVG so it renders on GitHub without external hosting.

## README Design

The README should use a trust-first structure with one compact demo section:

1. Project title and tagline.
2. Badge row:
   - CI status.
   - npm package badge only if it points to a real package page; otherwise omit it until publish.
   - GitHub Action readiness.
   - License.
3. Hero visual asset.
4. Short value proposition:
   - AI coding is fast.
   - Shipping still needs deterministic gates.
   - AI explanations are optional and never decide the verdict.
5. Quickstart:
   - `npx ai-ship-gate check`
   - `shipgate check --base main`
   - `shipgate check --format markdown`
   - `shipgate check --format json`
   - `shipgate check --ai`
   - `shipgate init`
6. Example output:
   - Show a small FAIL report with at least one test-risk finding and one secret-risk finding.
7. Rule table:
   - Test risk.
   - Dependency risk.
   - Env risk.
   - CI/deploy/Docker risk.
   - Security risk.
8. GitHub Action usage:
   - `actions/checkout@v4`
   - `fetch-depth: 0`
   - `zixuanjiang332/ai-ship-gate@v1`
   - Note that `@v1` becomes valid after the v1 release/tag is created.
9. Configuration reference.
10. Optional AI mode.
11. FAQ.
12. Roadmap.
13. Release status note:
   - Current state is MVP / pre-v1.
   - npm publish and Marketplace release are planned later.

The README must not claim auto-fix, test generation, SARIF, PR comments, SaaS, or a dashboard.

## Documentation Assets

Add these files:

- `LICENSE`: MIT license unless the owner requests another license.
- `CONTRIBUTING.md`: local setup, tests, build, release-readiness checks, contribution expectations.
- `CHANGELOG.md`: start at `0.1.0` as unreleased or initial MVP notes.
- `.github/PULL_REQUEST_TEMPLATE.md`: summary, test plan, release impact.
- `docs/release.md`: release checklist for npm, GitHub Action tag, and Marketplace.
- `docs/marketplace.md`: short checklist explaining why the Marketplace banner appears and when to publish.
- `docs/assets/ship-gate-hero.svg`: approved black/color visual asset.

These docs should be concise. They should help a visitor trust the project without burying the README in process details.

## CI And Release Prep

Add `.github/workflows/ci.yml` to run on pull requests and pushes to `main`.

The CI job should run on Node 20 and execute:

- `npm ci`
- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm pack --dry-run`

It should also include a release-readiness smoke step that verifies the bundled GitHub Action can run without `node_modules`. This can reuse the existing Vitest release-runtime coverage or run a small scripted command if that is cleaner.

The workflow should not publish packages, create releases, or tag versions in this iteration.

## Data Flow

No product data flow changes are planned.

The new documentation flow is:

1. Visitor opens GitHub repository.
2. README explains value through badges, hero asset, demo output, and quickstart.
3. Visitor can run the CLI locally with `npx`.
4. Visitor can inspect CI and release docs to verify the project is packaged responsibly.

The new CI flow is:

1. Push or pull request triggers CI.
2. CI installs dependencies from the lockfile.
3. CI runs tests, typecheck, build, pack dry-run, and Action runtime smoke.
4. CI fails if release-critical packaging breaks.

## Error Handling

Documentation should call out these known user-facing failure cases:

- If base refs cannot be resolved, pass `--base <ref>`.
- In GitHub Actions, use `fetch-depth: 0` and prefer `origin/main`.
- `shipgate init` refuses to overwrite an existing `shipgate.config.yaml`.
- Optional AI mode needs `OPENAI_API_KEY`; without it, deterministic checks still work.

CI should fail loudly on packaging or runtime smoke failures. It should not hide release failures behind optional steps.

## Testing Strategy

This iteration should verify:

- Existing unit and integration tests still pass.
- TypeScript still typechecks.
- Build output is regenerated and committed when needed.
- `npm pack --dry-run` includes the expected release files.
- The Action runtime remains self-contained for GitHub release use.
- README links point to files that exist in the repository.
- SVG asset renders as static GitHub-compatible SVG and does not rely on external resources.

Manual review should check the README for:

- Accurate claims.
- Clear first-screen value.
- No unsupported feature promises.
- Consistent visual tone with the approved black/color direction.

## Success Criteria

This iteration is successful when:

- The GitHub repository first screen looks professional and memorable.
- A visitor can understand the tool in under one minute.
- CI is visible and passes.
- Release and Marketplace prompts are explained in docs.
- The project has standard governance files.
- No v1, npm publish, or Marketplace publish is performed yet.
