# ReleaseGuard Local Console Design

## Summary

ReleaseGuard AI currently ships as a CLI and GitHub Action. That is strong for engineers already comfortable with terminal and CI workflows, but it still asks new users to infer the product's value from command examples and README screenshots.

The next product surface is a **local browser-based console** that runs on the user's machine and wraps the existing deterministic engine with a calmer, more legible interface.

This is not a hosted SaaS and not a remote dashboard. The first version is a **local Web UI tool** that people can run on their own machine, open in a browser, and use to:

- understand ReleaseGuard AI through a polished built-in demo
- point the UI at a local repository
- configure a few important check options
- run a real scan and inspect findings visually

The UI should feel like a quiet developer quality tool, not a marketing page and not a flashy AI toy.

## Goals

- Make the product easier to understand in under 30 seconds.
- Give users a browser-based way to run ReleaseGuard on a local repository.
- Preserve the current deterministic-first product boundary.
- Reuse the existing rule engine rather than creating a second checking path.
- Make the first screen highly demoable and screenshot-friendly.
- Keep the first version local-first and operationally simple.

## Non-Goals

- No hosted multi-user SaaS.
- No cloud execution of repository scans.
- No authentication, billing, or remote account model.
- No GitHub write actions from the UI in v1.
- No attempt to replace the CLI or GitHub Action.
- No broad configuration editor for every internal option.

## Users

### Primary user

A developer, maintainer, or open-source evaluator who wants to understand what ReleaseGuard AI does and see it work on a real local repository without starting from the CLI.

### Secondary user

A project owner demonstrating the tool in screenshots, demos, or short videos to attract stars and show product maturity.

## Product Positioning

The Local Console is a **companion surface** for ReleaseGuard AI:

- CLI remains best for scripts and local terminal workflows.
- GitHub Action remains best for CI and pull request automation.
- Local Console becomes best for discovery, demos, and interactive inspection.

This keeps the product coherent. Each surface has a clear reason to exist.

## First-Version Scope

The first version should support exactly two top-level experiences:

1. **Built-in demo mode**
2. **Run on local repository**

Everything else is subordinate to those two experiences.

## User Experience

### Entry experience

When the app opens, the user should land on a polished demo view rather than an empty form.

Reason:

- it explains value immediately
- it helps screenshots look complete
- it avoids the dead feeling of an unconfigured tool

The demo view should look like a believable ReleaseGuard run, not like placeholder content.

### Real-run experience

The app must also make it obvious that this is a real tool, not a static showcase. A visible but secondary action should let users switch from the demo into a real local run.

That action should open a run panel where the user can:

- enter or paste a local repository path
- choose a base ref
- choose `failOn`
- toggle the core checks:
  - tests
  - dependencies
  - env
  - ci
  - docker
  - security
- run the scan

## Information Architecture

The UI should have three major zones.

### 1. Demo Overview

This is the default first-view surface.

Its job is to explain the product fast, using a realistic sample report.

Content:

- prominent verdict state: `PASS`, `WARN`, or `FAIL`
- total findings count
- severity breakdown
- affected file count
- top triggered risk areas

Tone:

- operational
- trustworthy
- not salesy

### 2. Run Panel

This is the bridge from demo to actual product use.

Content:

- repository path input
- base ref input
- `failOn` segmented control
- check toggles
- run button

Behavior:

- the panel should feel simple enough that a first-time user is not intimidated
- invalid paths or scan failures should be explained clearly in place

### 3. Results Workspace

This is where users inspect an actual run.

The workspace should have a master-detail structure:

- summary header on top
- findings list on the left or center
- detail panel on the right

The detail panel should show:

- rule id
- severity
- reason
- affected files
- suggestion
- relevant diff snippet when available

The priority is to make findings feel inspectable, not merely listed.

## Interaction Model

### Demo mode

Demo mode should open immediately on app load.

It should include:

- a complete sample report
- a small indicator that this is demo data
- a clear action to switch to local execution

It should not feel like a toy sample. It should look like a credible analysis result from a real repository.

### Local run mode

When the user switches to local execution:

- the UI should preserve the same visual language as demo mode
- the results surface should reuse the same components as the demo
- only the data source changes

This reduces both implementation complexity and cognitive load.

## Visual Direction

The console should look like a restrained developer dashboard:

- dark or near-dark background is acceptable
- no loud gradients or consumer-AI spectacle
- crisp typography
- clear density and alignment
- color reserved for verdicts and risk emphasis

The strongest visual signal should be the verdict and the risk structure, not decorative elements.

The app should feel closer to CI, code quality, or observability tooling than to a landing page.

## Architecture

The first version should be split into two local pieces:

1. **Local UI app**
2. **Local Node API adapter**

### Local UI app

Responsibilities:

- render demo state
- render run form
- render findings and detail views
- call local API endpoints
- manage loading, error, and last-run UI state

### Local Node API adapter

Responsibilities:

- receive UI requests
- validate local repository path and options
- call the existing ReleaseGuard engine
- normalize results into UI-friendly JSON
- return deterministic scan output and metadata

### Existing ReleaseGuard core

The current scanning logic remains the source of truth. The Local Console must reuse existing capabilities rather than duplicating them.

This likely means adding a reusable programmatic entrypoint around the current `runCheck` path so the local API can call it without screen-oriented formatting concerns.

## Data Flow

### Demo flow

1. UI loads.
2. UI reads a bundled demo payload.
3. UI renders overview and findings immediately.

### Local run flow

1. User opens the run panel.
2. User enters repository path and options.
3. UI sends request to local API.
4. Local API validates input.
5. Local API invokes ReleaseGuard core on the selected repository.
6. Local API returns structured result data.
7. UI renders summary + findings + detail workspace.

## Data Shape

The UI will need a stable structured result object that is richer than plain rendered Markdown.

At minimum the result payload should include:

- repository path
- base ref
- verdict
- findings array
- severity counts
- affected file count
- optional grouped findings metadata
- optional diff snippet metadata for display
- effective check configuration used for the run

The API should return data shaped for UI consumption rather than forcing the frontend to reverse-engineer terminal text.

## Error Handling

The UI must handle these states explicitly:

- repository path does not exist
- path is not a git repository
- base ref cannot be resolved
- scan execution fails
- no findings

Behavior:

- keep errors local to the run panel or results panel
- do not collapse the whole app into a generic failure screen
- make recovery obvious

## Demo Data Strategy

The demo should be bundled as a stable fixture inside the repository.

It should include:

- realistic changed files
- a believable verdict
- a small spread of findings from different rule families

The same fixture should ideally support:

- UI screenshots
- README or docs assets later
- regression checks for the UI layer

## Packaging and Startup

The console should be easy to start locally.

The first version should favor the simplest possible developer startup path, such as a local dev server command.

A likely direction is:

- one command to start the UI
- local browser URL opens the console

Production-grade desktop packaging is not required for v1.

## Testing Strategy

The first implementation should test three layers.

### 1. UI rendering

- demo screen renders correctly
- verdict and counts display correctly
- findings list and detail panel stay in sync

### 2. Local API behavior

- validates repository path
- forwards options correctly
- returns structured scan data
- handles execution errors cleanly

### 3. Integration flow

- user can switch from demo to local run
- a local run result renders in the same workspace layout
- empty and error states are understandable

## Success Criteria

The first version is successful if:

- a new user can understand the product from the first screen without reading docs first
- the app can run a real local repository scan from the UI
- users can change base ref, `failOn`, and core checks in the UI
- findings are easier to inspect visually than in plain terminal output
- the console looks polished enough for screenshots and demos

## Open Decisions Deferred

These are intentionally not part of the first implementation plan:

- desktop app packaging
- drag-and-drop folder selection vs plain path input
- report export from the UI
- editing and saving full project config files
- GitHub Action workflow generation from the UI
- multi-repo history or saved sessions

## Recommended Next Step

Treat ReleaseGuard Local Console as a new sub-project within the repository. The implementation plan should define:

- exact frontend stack
- exact local API shape
- directory structure
- demo fixture strategy
- minimal launch command for local development
