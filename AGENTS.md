# Agent Guidelines for Tournicano

## Project Overview

Tournicano is a Progressive Web App (PWA) for managing padel/americano-style tournaments. It is built with Mithril.js, Pico CSS, TypeScript, Vite, and Vitest.

## Git / Commit Rules

- **Only create commits when explicitly instructed** by the user — never commit proactively
- **Never push** — pushes are always performed by a human
- Never amend a commit that has been pushed to remote
- Never force-push to `main`/`master`
- Do not commit files that likely contain secrets (e.g. `.env`)

## Build/Test Commands

- **Dev server**: `npm run dev` - Start Vite dev server
- **Build**: `npm run build` - Build production bundle
- **Test all**: `npm test` - Run all tests with Vitest
- **Test single file**: `npx vitest src/model/Tournament.test.ts` - Run specific test file
- **Test watch mode**: `npm test -- --watch` - Run tests in watch mode
- **Type check**: `npm run typecheck` - Run TypeScript type checking without emitting
- **Simulate**: `npm run simulate` - Run the simulation test in verbose mode

## Directory Structure

```
src/
  index.ts          # Entry point: m.route() setup and route definitions
  App.ts            # App state factory (createState) and shared actions
  Layout.ts         # Layout component + appContext singleton export
  model/
    core/           # Mutable<T>, OperationResult, Util (pluralize, debounce, shuffle)
    matching/       # MatchingSpec, Matching, Partitioning, WeightFunctions, MaximumMatching
    settings/       # Settings interface + Settings.impl.ts
    tournament/     # Tournament interface + impl, Players, Rounds, Context,
                    # Serialization, Export, Import, Score, Display, TestHelpers
  views/            # Mithril components (one .ts + optional co-located .css per component)
```

## Code Style

- **Imports**: Use `.ts` extensions in imports (e.g. `from "./Tournament.ts"`)
- **Formatting**: 2-space indentation, LF line endings, trailing newlines required
- **Types**: Strict TypeScript enabled; no implicit any, unused locals/parameters, or implicit returns
- **Framework**: Mithril.js components using `m()` syntax
- **Naming**: PascalCase for classes/components, camelCase for functions/variables
- **Interfaces**: Use interfaces for public contracts, classes with readonly for implementations
- **Pattern**: Separate interface definitions (e.g. `Tournament.ts`) from implementations (e.g. `Tournament.impl.ts`)
- **Factory pattern**: Use factories for object creation (e.g. `tournamentFactory.create()`)
- **Error handling**: Return `OperationResult` or success booleans for operations that can fail; never throw for expected failures
- **State management**: Use listener pattern for change notifications (`addListener`, `onchange`)

## Routing and App Context

- **Routing**: `m.route()` is configured in `index.ts`; all routes are wrapped in the `Layout` component via a `createRoute()` helper that also resets scroll position
- **App context**: A single `appContext` singleton is created once in `Layout.ts` and exported; page components import it directly via `import { appContext } from "../Layout.ts"` to access shared state (`tournament`, `settings`, `roundIndex`, `filters`, etc.) and actions (`showToast`, `changeRound`, `resetFilters`, `toggleFullscreen`, etc.) — no prop drilling

## Component Pattern

- **Type signature**: `m.Component<Attrs, State>` — always declare both generic parameters; use `{}` for empty attrs or state
- **Lifecycle hooks**:
  - `oninit`: Initialize all local state fields — never rely on undefined initial state
  - `oncreate`: DOM-level setup (e.g. registering listeners, acquiring wake locks)
  - `onremove`: Cleanup (e.g. removing listeners, releasing wake locks)
  - `view`: Pure render function — destructure `attrs` and `state` from vnode
- **Modals**: Render modals conditionally alongside the page content (e.g. `state.showModal ? m(MyModal, ...) : null`); open/close by toggling a boolean in local state

## Model Architecture

- **Interface/impl split**: Public interfaces in `Foo.ts`, implementations in `Foo.impl.ts`
- **Context interfaces**: `Context.ts` defines minimal dependency interfaces (`TournamentContext`, `RoundContext`) that decouple implementation classes from each other and avoid circular imports
- **`Mutable<T>` utility**: Strips `readonly` modifiers — used when an implementation class must mutate fields declared `readonly` in the public interface (`type Mutable<T> = { -readonly [P in keyof T]: T[P] }`)
- **Internal impl files**: Mark impl files with a `@fileoverview` warning comment and `@internal` JSDoc on exported classes; do not import impl files outside their model folder
- **`OperationResult`**: Use `createSuccessResult` / `createErrorResult` / `createInfoResult` / `createWarningResult` (from `core/OperationResult.ts`) for operations that produce user-visible feedback

## Testing

- **Framework**: Vitest — all test files use the `.test.ts` suffix and are co-located with the source files they test (e.g. `Tournament.test.ts` next to `Tournament.ts`)
- **Scope**: Tests cover model logic only — there are no view/component tests; do not write tests for Mithril components
- **Test file structure**: One test file per source file where coverage is needed; large features may have dedicated test files (e.g. `Tournament.scenarios.test.ts`, `SwitchPlayers.test.ts`, `TeamStats.test.ts`)
- **Fixtures**: Shared test fixtures are defined in `TestHelpers.ts` in each model folder using `baseTest.extend<Fixture>()`; import the extended `test` from `TestHelpers.ts` instead of Vitest's built-in `test` when fixtures are needed (e.g. pre-built `players` and `scores` arrays)
- **No-fixture tests**: Use Vitest's `test` directly (imported from `vitest`) when no fixtures are needed; within the same file both can coexist — import the extended `test` from `TestHelpers.ts` and alias the plain one (e.g. `import { test as vitest } from "vitest"`)
- **Helper utilities**: `TestHelpers.ts` also exports utility functions like `runTournament()` for quickly bootstrapping a tournament with players and scores, and `serialize()` for deterministic match output comparison
- **Test naming**: Use descriptive strings — `"should ..."` or `"<methodName> should ..."` style
- **Assertions**: Use Vitest's `expect(...).toBe()`, `.toEqual()`, `.toStrictEqual()`, `.toHaveLength()`, `.toContain()`, etc.
- **Simulation test**: `src/simulate.test.ts` is a standalone simulation for comparing matching algorithm variants; run it via `npm run simulate` — it is not a correctness test and is excluded from the normal test suite

## Persistence and Serialization

- **localStorage**: `tournament` and `settings` are each persisted to `localStorage` via debounced listeners registered in `App.ts`
- **Compact tuple format**: Use compact tuple arrays (not objects) to minimize storage size — e.g. `[id, name, group, active]` for players, `[CompactMatch[], PlayerId[], PlayerId[]]` for rounds

## UI/Styling Philosophy

- **Pico CSS First**: Rely on the Pico CSS design system wherever possible — use semantic HTML components, leverage Pico variables for theming (`--pico-primary`, `--pico-spacing`, etc.), and let Pico handle responsive design and dark mode; keep custom CSS minimal
- **CSS co-location**: Each view component with custom styles has a co-located `.css` file (e.g. `RoundPage.ts` + `RoundPage.css`) imported at the top of the `.ts` file
- **CSS custom properties**: Layout dimensions and component sizes are defined as `--` variables in `App.css` (e.g. `--nav-height`, `--header-height`, `--player-card-avatar-size`) and referenced in component CSS files
- **Modal pattern**: Use native `<dialog>` with Pico CSS `article > header / footer` structure; call `showModal()` in `oncreate`, manage `modal-is-open` class on `documentElement`; close on backdrop click by comparing `e.target === e.currentTarget`
- **Confirmation dialogs**: Use the `HeaderAction.confirmation` pattern (`title`, `description`, `confirmButtonText`) for destructive actions — the `Header` component renders these inline as dialogs
