# AI Ship Gate

A deterministic release gate for AI-generated code.

AI coding makes changes fast. Shipping still needs a gate.

AI Ship Gate checks a PR-sized git diff for release risks before AI-generated code reaches review or while it runs in CI. It is deterministic by default: rules inspect changed files, patches, and project metadata, then produce a PASS, WARN, or FAIL verdict that your workflow can enforce.

## Quickstart

Run without installing:

```sh
npx ai-ship-gate check
```

After installing globally or using the package bin, the CLI command is `shipgate`:

```sh
shipgate check --base main
shipgate check --format markdown
shipgate check --format json
shipgate check --ai
shipgate init
```

`shipgate init` writes `shipgate.config.yaml`. It fails if that file already exists, so existing configuration is not overwritten.

## Verdicts

| Verdict | Meaning | Default CI behavior |
| --- | --- | --- |
| PASS | No warn or fail findings. | Exit 0 |
| WARN | Risk found. | Exit 0, does not block PRs by default |
| FAIL | High-risk issue found. | Exit 1 |

Set `failOn: warn` to make WARN verdicts exit 1 too.

## GitHub Action

Replace `owner-name` with the GitHub user or organization that publishes the action. In CI, prefer `origin/main` as the base ref after `actions/checkout`; local CLI runs commonly use `main`.

```yaml
name: AI Ship Gate

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
          base: origin/main
          ai: false
```

## Example Findings

```md
# AI Ship Gate: FAIL

## Findings

### WARN: Source changed without tests

- Rule: `tests.missing-related-tests`
- Files: `src/auth.ts`
- Reason: Source-like files changed, but this diff does not include test-like files.
- Suggestion: Add or update tests that cover the changed behavior before shipping.

### FAIL: Secret-like value in diff

- Rule: `security.secret-in-diff`
- Files: `src/config.ts`
- Reason: The diff contains a token, key, password, or secret-like value.
- Suggestion: Remove the value from git history if needed, rotate it, and use a safe example value.
```

## Rules

- Test risk
- Dependency risk
- Env risk
- CI/deploy/Docker risk
- Security risk

See [examples/risky-diff.md](examples/risky-diff.md) for a compact PR scenario that triggers multiple rules.

## Optional AI Mode

```sh
OPENAI_API_KEY=... shipgate check --ai
```

AI mode reads the deterministic findings and writes an explanation. It does not decide the verdict.

Environment variables:

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`
- `SHIPGATE_AI_TIMEOUT_MS`

## Configuration

Create `shipgate.config.yaml` with `shipgate init`, or write one directly:

```yaml
failOn: fail
ai:
  enabled: false
checks:
  tests: true
  dependencies: true
  env: true
  ci: true
  docker: true
  security: true
```
