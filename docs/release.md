# Release Checklist

ReleaseGuard AI is currently pre-v1. Use this checklist before creating a public release.

## Before `v1`

Run:

```sh
npm ci
npm test
npm run typecheck
npm run build
npm pack --dry-run
```

Confirm:

- `dist/cli.js` is included in the npm package.
- `dist/action.js` is committed and bundled for GitHub Action users.
- `action.yml` points to `dist/action.js`.
- README does not claim unimplemented features.
- The GitHub repository has been renamed from `ai-ship-gate` to `releaseguard-ai`.
- The CI badge and Action examples point to `zixuanjiang332/releaseguard-ai`.
- The Action example points to an existing tag before recommending `@v1` as stable.

## npm Publish

Publish only after package metadata, README, and license are final:

```sh
npm publish --access public
```

## Pre-v1 GitHub Release

For pre-v1 releases, create a matching tag after npm publish succeeds:

```sh
gh release create v0.3.0 --target main --title "ReleaseGuard AI v0.3.0" --prerelease
```

Use the exact package version for the tag name so npm, GitHub Actions, and release notes stay aligned.

## GitHub Action Tag

Create the stable tag after the release commit is verified:

```sh
git tag v1
git push origin v1
```

## Marketplace

Draft the GitHub release after the `v1` tag exists. Review the Marketplace prompt, category, description, and branding before publishing.
