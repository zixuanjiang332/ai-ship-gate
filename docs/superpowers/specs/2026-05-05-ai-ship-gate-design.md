# AI Ship Gate Design

Date: 2026-05-05
Status: Draft for user review

## Summary

AI Ship Gate is a CLI-first release gate for AI-generated code. It inspects the current git diff or pull request and answers one practical question: is this change ready to ship?

The core principle is deterministic first, AI-assisted second. Rule-based checks decide `PASS`, `WARN`, or `FAIL`. Optional LLM integration only explains the structured findings, summarizes risk, and suggests next actions. The tool must remain useful without an API key.

Proposed tagline:

> A deterministic release gate for AI-generated code.

## Market Context

AI coding tools and agents are growing quickly, but developer trust remains uneven. Stack Overflow's 2025 AI survey reports broad AI adoption, while also showing that many developers either avoid agents or do not fully trust AI-generated output. OSSInsight's 2026 AI repository rankings show strong GitHub momentum around coding agents, MCP servers, LLM tools, and AI developer infrastructure. Docker's 2025 State of Application Development report also highlights ongoing friction in developer workflows around security, CI/CD, deployment, and the inner loop.

This creates a strong opening for a project that does not ask developers to blindly trust AI. AI Ship Gate gives AI-assisted workflows a deterministic quality gate that can be run locally and in CI.

Sources:

- Stack Overflow 2025 AI Survey: https://survey.stackoverflow.co/2025/ai
- Stack Overflow AI trust gap article: https://stackoverflow.blog/2026/02/18/closing-the-developer-ai-trust-gap/
- OSSInsight AI Trending Repositories: https://ossinsight.io/trending/ai
- Docker 2025 State of Application Development: https://www.docker.com/blog/2025-docker-state-of-app-dev/

## Target Users

Primary users:

- Developers who use Cursor, Codex, Claude Code, Copilot, or similar AI coding tools.
- Solo builders who want a quick pre-merge or pre-deploy sanity check.
- Open-source maintainers who want a lightweight pull request gate for AI-generated or fast-moving contributions.

Secondary users:

- Teams experimenting with AI coding agents.
- Developers who want a resume-worthy, transparent example of AI engineering, DevOps, and release automation.

## Goals

- Provide a local CLI that checks whether a change is safe enough to merge or ship.
- Provide a GitHub Action wrapper that runs the same checks in pull requests.
- Use deterministic rules for the final release verdict.
- Keep AI optional and bounded to explanation, summarization, and prioritization.
- Produce terminal, JSON, and Markdown reports.
- Make the first release easy to demo in a README and example pull request.

## Non-Goals

- Do not automatically modify user code.
- Do not generate tests in the first version.
- Do not replace CI, unit tests, linters, or security scanners.
- Do not perform full static analysis or language-specific AST analysis in the first version.
- Do not provide a hosted dashboard, account system, or SaaS backend.
- Do not make LLM access required.

## Product Shape

AI Ship Gate ships as both:

- A CLI tool published through npm.
- A GitHub Action that invokes the CLI and writes results to the GitHub Actions step summary.

The CLI owns all core behavior. The GitHub Action is a thin wrapper so local and CI behavior stay consistent.

## CLI Interface

The package should support this primary command:

```bash
npx ai-ship-gate check
```

Installed usage should support:

```bash
shipgate check
```

Useful options:

```bash
shipgate check --base main
shipgate check --format terminal
shipgate check --format json
shipgate check --format markdown
shipgate check --ai
shipgate init
```

Default behavior:

- Detect the current git repository.
- Determine a base ref, defaulting to `main` when available or a merge-base strategy when possible.
- Read changed files and patch content.
- Detect project metadata such as dependency files, lockfiles, CI configuration, Docker files, and env examples.
- Run enabled rules.
- Print a final verdict of `PASS`, `WARN`, or `FAIL`.

## Configuration

`shipgate init` should create a small configuration file:

```yaml
failOn: fail
ai:
  enabled: false
checks:
  tests: true
  dependencies: true
  ci: true
  docker: true
  env: true
  security: true
```

The first version may support `shipgate.config.yaml`. Future versions can add JSON or package manager integration.

## Verdict Model

Each rule finding should have this shape:

- `id`: stable rule ID, such as `tests.missing-related-tests`.
- `severity`: `info`, `warn`, or `fail`.
- `title`: short human-readable title.
- `message`: concise explanation.
- `files`: affected paths.
- `suggestion`: recommended next action.

Final verdict:

- `FAIL` if any enabled rule emits `fail`.
- `WARN` if no failure exists but one or more warnings exist.
- `PASS` if no failure or warning exists.

The `failOn` setting controls the minimum verdict that exits with a non-zero status in CI. The default is `fail`, so warnings are visible without blocking a pull request unless the user opts into stricter behavior.

## MVP Rules

### Test Risk

- Warn when source-like directories such as `src/`, `app/`, `lib/`, or `server/` changed but no test-like file changed.
- Warn or fail when the diff introduces skipped or focused tests, including common patterns such as `.skip`, `.only`, `xit`, or `fit`.

### Dependency Risk

- Warn when dependency manifests change without a corresponding lockfile change.
- Support common dependency files such as `package.json`, `requirements.txt`, `pyproject.toml`, `go.mod`, `Cargo.toml`, and `pom.xml`.
- Fail when changed package scripts appear to introduce risky install-time behavior, such as new `postinstall` scripts or obvious remote downloads.

### Environment Variable Risk

- Warn when the diff adds environment variable usage but no `.env.example`, documentation, or sample config changes.
- Fail when likely secret files or secret-like values are committed.

### CI and Deployment Risk

- Warn when CI, Docker, compose, or deployment files change without related validation scripts or documentation changes.
- Warn when a changed Dockerfile appears to lack a clear command, exposed port, or healthcheck.

### Security-Sensitive Changes

- Warn when changed paths or diff content touch authentication, authorization, permissions, payments, cryptography, CORS, SQL/query construction, file upload, or token handling.
- Fail when obvious secret patterns appear in the diff.

## GitHub Action Behavior

The GitHub Action should use the CLI internally.

Example usage:

```yaml
name: Ship Gate

on:
  pull_request:

jobs:
  shipgate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: owner-name/ai-ship-gate@v1
        with:
          base: main
          ai: false
```

Action behavior:

- `PASS`: check passes.
- `WARN`: check passes by default, but the summary highlights risks.
- `FAIL`: check fails.
- The action writes a Markdown report to `$GITHUB_STEP_SUMMARY`.

Future versions can add PR comments, annotations, and SARIF output.

## AI Mode

AI mode is optional:

```bash
shipgate check --ai
```

AI mode must not decide the final verdict. It only consumes the structured findings from the deterministic rule engine.

AI mode responsibilities:

- Summarize the highest-risk findings in natural language.
- Explain why the release gate reached its verdict.
- Suggest a prioritized fix order.
- Generate Markdown suitable for a PR comment or CI summary.

Provider strategy:

- First version can support OpenAI-compatible APIs through environment variables.
- If no API key is present, the tool should continue with deterministic reporting.
- Provider errors should degrade gracefully and should not hide deterministic findings.

## Architecture

Recommended stack: TypeScript and Node.js.

Rationale:

- Good fit for npm distribution and `npx` usage.
- Natural fit for GitHub Actions.
- Easy for JavaScript, TypeScript, frontend, and full-stack developers to try.
- Leaves room for future VS Code or web report integrations.

Core modules:

- `cli`: command parsing for `check` and `init`.
- `git`: base ref detection, changed file collection, diff extraction.
- `project`: project metadata detection.
- `rules`: deterministic rule engine and rule implementations.
- `reporters`: terminal, JSON, and Markdown output.
- `ai`: optional explanation layer.
- `action`: GitHub Action wrapper.

## Data Flow

1. CLI parses flags and loads config.
2. Git module resolves base ref and collects changed files plus patch content.
3. Project module detects metadata from the repository.
4. Rule engine runs enabled checks against a normalized context object.
5. Reporter creates terminal, JSON, or Markdown output.
6. Optional AI mode receives structured findings and returns an explanatory summary.
7. CLI exits according to verdict and the configured `failOn` setting.

## Error Handling

- If the current directory is not a git repository, return a clear error with setup guidance.
- If no base ref can be resolved, suggest `--base`.
- If no changes are detected, return `PASS` with a short message.
- If AI mode fails, keep deterministic results and add a warning that AI explanation was unavailable.
- If config parsing fails, show the file path and the invalid field.

## Testing Strategy

The first implementation should include:

- Unit tests for each rule.
- Unit tests for verdict aggregation.
- Fixture-based tests for representative git diffs.
- Reporter snapshot or golden-output tests for Markdown and JSON.
- A small integration test that runs the CLI against a fixture repository.

Manual verification should include:

- Running `shipgate check` in a clean repo.
- Running `shipgate check --format markdown`.
- Running the GitHub Action against a demo PR once the repository is published.

## README and Demo Strategy

The README should be part of the product, not an afterthought. It should show:

- A short problem statement: AI-generated code can be fast but needs a release gate.
- A quickstart using `npx ai-ship-gate check`.
- A screenshot or copied Markdown example of a failed gate.
- GitHub Action setup.
- Rule list and verdict explanation.
- Optional AI mode setup.

The demo should include one intentionally risky AI-style PR, such as:

- Source code changed without tests.
- New env var without `.env.example`.
- Dependency manifest changed without lockfile.
- A secret-like token in the diff.

## Success Criteria For Version 1

- A user can run `npx ai-ship-gate check` in a git repository and receive a useful release verdict.
- The tool works without an LLM API key.
- The GitHub Action can run in a pull request and write a Markdown summary.
- The README clearly communicates the project in under one minute.
- The codebase is small enough for contributors to understand rule implementation quickly.

## Open Questions

- The final npm package name may need adjustment based on availability.
- The first GitHub Action release path depends on the repository owner name.
- PR comment support is intentionally deferred until after the step summary version works.
