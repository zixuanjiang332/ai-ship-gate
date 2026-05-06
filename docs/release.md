# Release Checklist

AI Ship Gate is currently pre-v1. Use this checklist before creating a public release.

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
- The Action example points to an existing tag before recommending `@v1` as stable.

## npm Publish

Publish only after package metadata, README, and license are final:

```sh
npm publish --access public
```

## GitHub Action Tag

Create the stable tag after the release commit is verified:

```sh
git tag v1
git push origin v1
```

## Marketplace

Draft the GitHub release after the `v1` tag exists. Review the Marketplace prompt, category, description, and branding before publishing.
