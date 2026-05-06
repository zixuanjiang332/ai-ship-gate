# Changelog

All notable changes to ReleaseGuard AI will be documented in this file.

## 0.3.0 - SARIF Output

### Added

- `sarif` output format for `releaseguard check`.
- SARIF reporter with severity mapping for GitHub code scanning workflows.
- README examples showing how to generate and upload SARIF in GitHub Actions.

### Changed

- README examples now pin the pre-v1 release tag to `v0.3.0`.

## 0.2.0 - Action Summary

### Added

- Rich GitHub Action job summary with verdict counts and top findings.
- GitHub Action outputs for `verdict`, `findings-count`, `fail-count`, and `warn-count`.
- README workflow example showing how to consume the Action verdict output.

### Changed

- Action examples now pin the pre-v1 release tag instead of `main`.

## 0.1.0 - MVP

### Added

- `releaseguard check` CLI for deterministic release-risk checks.
- `releaseguard init` for `releaseguard.config.yaml`.
- Git diff collection and project metadata detection.
- Rules for tests, dependencies, env files, CI/deploy/Docker changes, and secret-like values.
- Terminal, JSON, and Markdown reporters.
- Optional AI explanations that do not decide the final verdict.
- GitHub Action wrapper with a bundled runtime.
- Release-readiness tests for package contents and Action execution without `node_modules`.

### Release Status

This repository is currently pre-v1. The `v1` GitHub Action tag, npm publish, and Marketplace listing are planned release steps, not completed release actions.
