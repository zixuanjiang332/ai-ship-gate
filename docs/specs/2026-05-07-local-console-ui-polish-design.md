# ReleaseGuard Local Console UI Polish Design

## Summary

This document defines a focused UI polish pass for ReleaseGuard Local Console. The goal is not to turn the console into a marketing page or a generic dashboard. The goal is to make the first screen feel more like a working release-review surface: clear judgment first, evidence second, controls third.

The polish should increase demo clarity, screenshot quality, and perceived product maturity without changing the underlying local-only architecture or the deterministic engine.

## Context

The first Local Console implementation already provides:

- a demo-first browser experience
- local repository execution through the UI
- configurable `base`, `failOn`, and core checks
- findings, detail, and file mapping views

What it does not yet do strongly enough is guide the user through a review story. The current UI reads as "a page with data." This pass should make it read as "a review workspace that already knows what deserves attention first."

## Goals

This polish pass should:

1. Make the opening state feel like a decision surface, not only a metrics surface.
2. Lead the user to the most important finding without requiring manual scanning.
3. Improve the screenshot value of the demo state for GitHub, README, and social sharing.
4. Keep the tone quiet, professional, and developer-tool oriented.
5. Preserve the current local-run workflow and not add product-scope complexity.

## Non-Goals

This pass should not:

- introduce animation-heavy marketing treatment
- add charts for their own sake
- introduce user accounts, persistence, or remote sync
- add new scanning rules
- redesign the console into a multi-page application
- replace the deterministic review model with an AI-led experience

## Product Direction

The console should behave like a release-review desk.

On first load, the user should feel that the product is already helping them answer three questions:

1. What is the release decision right now?
2. What should I look at first?
3. Why does that issue matter?

This means the UI should put emphasis on judgment and prioritization before breadth.

## Recommended Approach

The recommended approach is a "review desk narrative" polish:

- strengthen the verdict area into a decision header
- add a short natural-language release summary
- introduce a top-priority queue above or within the findings area
- make the detail panel feel like the primary workspace
- keep local-run controls present but secondary until the user chooses to run a real repo

This is preferred over a chart-heavy dashboard pass or a landing-page-style narrative pass because it best matches the product's real value: it reduces review effort by structuring release risk.

## Information Hierarchy

### 1. Decision Header

The top section should no longer read as a simple badge plus counters. It should read as a release judgment block.

It should contain:

- the verdict badge
- a one-sentence release summary in plain language
- repo/base context
- compact counts for fail, warn, info, and affected files

Example tone:

- `Release is blocked by one credential leak and three follow-up risks.`
- `Release is clear, but two warnings should be reviewed before merge.`

The sentence should be derived from the current result, not hard-coded to only the demo state.

### 2. Priority Queue

The findings area should visually distinguish the top one to three findings from the rest.

The first finding should feel pre-triaged:

- it appears selected by default
- its row is visually stronger
- it has a short "why first" treatment or a priority label

The queue should help the user understand order, not just membership.

### 3. Evidence Workspace

The detail panel should become the core surface for understanding a finding.

It should clearly separate:

- rule identity
- plain-language reason
- suggested action
- affected files
- relevant diff snippets

The file mapping panel should reinforce the same story by showing where findings cluster, rather than reading like a disconnected appendix.

## Interaction Model

### Demo State

The demo should open with:

- the run panel collapsed
- the highest-priority finding already selected
- a natural-language release summary already visible

The user should not need to click before the UI demonstrates value.

### Local Run State

When the user chooses `Run On Local Repo`:

- the run panel expands
- focus moves to repository path
- after a run completes, the console keeps the same narrative structure
- the top finding is selected automatically

The interaction model should remain consistent between demo and local runs.

## Visual Language

The visual language should stay within the project's "quiet professional tool" direction.

Recommended characteristics:

- dark review-room palette with restrained blue structure accents
- strong but not oversized verdict treatment
- compact metric cards
- sharp alignment and spacing
- elevated but not decorative panels
- code snippets that feel inspectable and real

Avoid:

- hero-page aesthetics
- decorative gradients that overpower content
- oversized display typography
- card nesting that makes the UI feel like a marketing dashboard

## Content Changes

This pass should add or refine:

- a release summary sentence generator for demo and local results
- a top-priority label or reason cue for the first findings
- clearer labeling in the detail panel
- stronger empty states for "no findings" and error conditions

The wording should feel operational and reviewer-oriented, not promotional.

## Implementation Scope

This is a UI polish pass, not a new architecture pass.

It should primarily touch:

- `src/console/browser/index.html`
- `src/console/browser/main.ts`
- `src/console/browser/styles.css`
- `src/console/demo.ts` only if the demo ordering or copy needs refinement

It may also add very small derived-view helpers, but should avoid expanding the API surface unless necessary for the release summary.

## Testing Expectations

This pass should preserve the current behavior of:

- demo loading
- local run submission
- default finding selection
- file mapping rendering
- build output under `dist/console`

Add or update tests only where behavior changes are real, especially for:

- default prioritized finding selection
- release summary rendering logic if extracted into a helper
- run-panel visibility behavior if the interaction changes

## Success Criteria

This polish pass is successful if:

1. The first screen reads as a release-review tool, not only a result viewer.
2. A new viewer can understand the primary risk in a few seconds.
3. The default demo state is more screenshot-worthy without becoming flashy.
4. The console still feels like a practical developer tool.
5. No new product surface is introduced beyond presentation and interaction polish.

## Rollout Note

This pass should be treated as part of the Local Console line, not a separate product initiative. It should stack cleanly on the current `0.6.0` console work and be suitable for a follow-up polish PR before the next release cut.
