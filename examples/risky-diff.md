# Risky Diff Demo

This demo describes a PR that should be stopped by AI Ship Gate before it ships:

- `src/auth.ts` changes behavior.
- No test files changed.
- `src/config.ts` adds `process.env.OPENAI_API_KEY`.
- `.env.example` is not updated.
- `package.json` changes dependencies without `package-lock.json`.
- The patch includes `sk-1234567890abcdef1234567890abcdef`.

## Expected verdict

`FAIL`

## Expected findings

- `tests.missing-related-tests`
- `dependencies.lockfile-not-updated`
- `env.example-not-updated`
- `env.secret-like-value`
- `security.secret-in-diff`
