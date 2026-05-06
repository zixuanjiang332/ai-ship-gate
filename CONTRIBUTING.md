# Contributing

Thanks for helping improve ReleaseGuard AI.

## Local Setup

```sh
npm ci
npm test
npm run typecheck
npm run build
```

## Development Checks

Before opening a pull request, run:

```sh
npm test
npm run typecheck
npm run build
npm pack --dry-run
```

The test suite includes a release-runtime smoke test for the bundled GitHub Action, so failures there should be treated as release blockers.

## Pull Requests

Use focused pull requests. Include:

- What changed.
- Why it changed.
- How you tested it.
- Whether release packaging is affected.

## Project Boundaries

ReleaseGuard AI is deterministic first. Optional AI output may explain findings, but it must not decide PASS, WARN, or FAIL.

Do not add claims for unsupported features such as auto-fix, SARIF, PR comments, SaaS, or dashboards unless the feature is implemented and tested.
