# GitHub Marketplace Notes

GitHub shows a Marketplace banner because this repository contains `action.yml`.

Do not publish the Action to Marketplace until:

- A `v1` tag exists.
- The README Action example points to a real stable tag.
- CI is passing on `main`.
- The bundled `dist/action.js` runs without `node_modules`.
- The release notes explain what the Action checks and what it does not do.

Marketplace publishing is optional. ReleaseGuard AI can still be used directly as a GitHub Action once a tag exists.
