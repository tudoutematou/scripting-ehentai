# CURRENT_TASK — 0.3 UI Foundation + SelfTest + AI Action Boundary

Branch: `feat/0.3-ui-foundation`
Base: `5265e793f1c89542e9fe6e214833129ae304f411`

Read `AGENTS.md` first. Do not reread the full historical governance docs for this task.

## Goal
Turn the current 0.2.9 prototype into a clean, maintainable app shell before adding the next large feature package.

This package has three deliverables:
1. UI foundation that looks like a coherent iOS/iPadOS app.
2. A reusable self-test harness so normal regressions are caught by the Scripting Agent without repeatedly asking the user to test.
3. A typed AI action boundary so future Scripting AI commands and manual UI use the same core functions.

## Preserve
Do not regress existing working behavior:
- Home / search / category / language filters;
- raw-tag search and translated tags;
- Detail Core-first rendering and background previews;
- Reader prev/next and current controlled image loading;
- manual Cookie login, Keychain, refresh, E/Ex state, logout;
- image request priority `reader-image > preview-thumbnail > home-thumbnail`;
- diagnostics privacy.

## A. UI foundation
Refactor presentation only as much as needed to stop `appV2.tsx` becoming the permanent monolith.

Create/reuse small presentation files such as:
- `src/scenes/HomeScene.tsx`
- `src/scenes/SearchScene.tsx`
- `src/scenes/GalleryDetailScene.tsx`
- `src/scenes/ReaderScene.tsx`
- `src/scenes/AccountScene.tsx`
- `src/components/GalleryCard.tsx`
- `src/components/TagChip.tsx`
- `src/components/StateView.tsx`

Exact filenames may differ if a smaller split is cleaner. Do not rewrite parsers/network/account just to fit the folders.

Visual target:
- native iOS grouped/list visual language;
- consistent spacing and typography;
- gallery rows/cards with thumbnail, title, category and metadata hierarchy;
- clear Search and Filter entry points;
- Detail header with cover/title/metadata/tags, then preview section;
- Reader controls visually separated from content;
- Account screen uses the same visual system;
- unified Loading / Empty / Error presentation;
- iPad should not look broken at wider widths.

Do not chase pixel-perfect styling. Stop when it looks like one coherent app instead of a development demo.

Use only Scripting-supported UI props verified by current typings/runtime. Do not add guessed modifiers.

## B. Self-test harness
Add a developer-only test entry point, preferably `src/dev/selfTest.ts`.

It should run core checks without simulated UI taps and return a compact structured result:

```ts
type SelfTestResult = {
  name: string
  ok: boolean
  durationMs: number
  detail?: string
}
```

Cover at least:
- account.local-state;
- search.url-builder;
- gallery.list parse/fetch path where safe;
- category/language state building;
- tag search state;
- gallery.detail core parse/fetch path;
- reader image-page resolve path;
- diagnostics sanitizer invariants.

Use fixtures for parser-only tests when possible. Network checks must be bounded by timeout and must not log sensitive URLs/query/Cookies/tokens.

Expose one function such as `runSelfTests()` that the Agent can call after future feature work. A failed test should identify the failing subsystem, not dump sensitive payloads.

This harness is evidence, not a substitute for rare human-only visual/gesture acceptance.

## C. AI action boundary
Create a typed action dispatcher, preferably under `src/agent/`.

Minimum initial actions must use existing core functions directly:

```ts
type EhAction =
  | { type: "account.status" }
  | { type: "search"; query: string; category?: string; language?: string }
  | { type: "gallery.detail"; url: string }
```

Provide a single entry such as:

```ts
runEhAction(action: EhAction): Promise<EhActionResult>
```

Rules:
- manual UI and AI actions call the same underlying search/detail/account functions;
- no simulated taps for operations that have direct functions;
- return structured typed data, not rendered UI text;
- sanitize errors;
- never expose raw Cookie values;
- design the dispatcher so later actions can add Favorites, History, Downloads, etc. without replacing it.

Check current Scripting AI/Agent docs/typings for the supported way to expose/call script capabilities. If a supported tool/command registration mechanism exists, wire the minimum `search` action end-to-end. If no stable registration API exists, keep the typed dispatcher working and document the exact missing platform hook; do not invent an API.

## D. Agent-owned verification
During this package, fix ordinary problems yourself and keep going.

Before uploading:
- run Scripting diagnostics;
- run `runSelfTests()` and retain a compact PASS/FAIL summary;
- run the app in the real Scripting environment available to you;
- exercise Home -> Search -> Detail -> Reader and Account at least once;
- check iPhone-size and iPad/wide layout if the runtime allows it;
- verify no sensitive diagnostics;
- fix routine failures yourself, then rerun the affected checks.

Do NOT ask the user to retest after every edit.

## Out of scope
Do not implement in this package:
- Favorites UI;
- History / Reading Progress;
- Downloads;
- Comments / Rating;
- Watched / My Tags;
- Torrent / Archive;
- full parser rewrite;
- new state-management framework;
- new login architecture;
- writes to `main`.

## Completion
When A+B+C are complete and your own integration checks are satisfactory:
1. upload logical commits to `feat/0.3-ui-foundation` using Scripting native GitHub API;
2. create one Draft PR;
3. report once with completed features, self-test summary, runtime checks, changed files/commit SHA, remaining issues, and at most 2-5 human-only acceptance items;
4. stop for technical review.

Do not start the Library package until this task is accepted.
