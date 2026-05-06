# Changelog

All notable changes to AI Ship Gate will be documented in this file.

## 0.1.0 - MVP

### Added

- `shipgate check` CLI for deterministic release-risk checks.
- `shipgate init` for `shipgate.config.yaml`.
- Git diff collection and project metadata detection.
- Rules for tests, dependencies, env files, CI/deploy/Docker changes, and secret-like values.
- Terminal, JSON, and Markdown reporters.
- Optional AI explanations that do not decide the final verdict.
- GitHub Action wrapper with a bundled runtime.
- Release-readiness tests for package contents and Action execution without `node_modules`.

### Release Status

This repository is currently pre-v1. The `v1` GitHub Action tag, npm publish, and Marketplace listing are planned release steps, not completed release actions.
