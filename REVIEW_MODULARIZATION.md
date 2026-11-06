# Client modularization — agent review brief

Review target: `review/client-modularization` (use the final immutable commit SHA supplied after sync).
Base: `55d49ed8f630ea25206ab30c0730e8af6e9f9000`.
This branch is for review only. Do not merge into main or modify PR #32 without user approval.

## Scope

- Break the GalleryFlow mixed implementation into Reader, image loading, shared cards, discovery/search, account/diagnostics, detail/previews/resources and library scenes.
- Preserve runtime behavior through declaration migration; error classification/metadata changes are explicitly tested.
- Compose five scene factories through typed SceneDestinations; no runtime global registry.
- Split existing 150 checks into seven domains, preserving test bodies and global order.
- Preserve baseline src/assistant_tool.json and src/script.json; no local credentials, caches or QA scripts are uploaded.

## High-value review targets

1. GalleryFlow.tsx/sceneDestinations.ts: stable wrapper component identity, factory initialization timing, Hooks-safe JSX forwarding, recursive navigation, prop/key preservation.
2. viewScope.ts, galleryLifecycle.ts: cancellation, stale callbacks, destination ownership, sidebar lifetime during nested pushes.
3. OnlineReader/OfflineReader/ContinueReader/ReaderImages/ReaderUI: target page, progression, finite recovery, quality/session separation, offline incremental updates.
4. imageLoader/sharedRequest/readerPrefetch: dedup, priority promotion, last-consumer abort, active slots held until settle, old Promise identity, late-result writes.
5. GalleryDetailScene/GalleryPreviews/LibraryScenes: delayed effects, selection and paging, favorite/download state boundaries, subscriptions and cleanup.
6. networkErrors/readerRecovery: structured status precedence, cancellation exclusion, localized native error fallback, independent once-policy scopes.
7. selfTest and *Checks: all 150 registered once and original order retained; avoid weakening existing coverage.

## Verified locally

150/150 checks; prefetch 21/21; 22 scene export checks; five factories invoke no navigation during construction. Runtime graph across 82 TS/TSX files has no cycles (existing pure type-only back-reference is not a runtime cycle). 187 migrated declarations and 150 test bodies/order preserved. Native virtual-IO mounts cover Reader jump/recovery/continue/continuous/offline and discovery/detail/previews/search/library/root; fixed-key negative control fails as expected. Raw image pipeline virtual-IO 7/7.

## Known limits — do not call these fixed

- Full-project TypeScript still reports 83 existing diagnostics; no suppressions added. Runtime tests are not proof of a clean typecheck.
- Single-batch previews may emit native Slider max=min warning; unchanged existing boundary issue.
- Virtual-IO mounts are not physical touch, full native navigation acceptance or all H@H-node E2E validation.
- No new real network/Photos/download-data acceptance was performed during modularization.
- Source keeps existing long-line formatting intentionally; formatting-only rewrites were excluded.
- Independent subagent review was unavailable locally due to session limit. This handoff explicitly requests fresh review.

Please report severity, file+line, concrete execution path, expected vs actual behavior, and a minimal reproduction/test. Distinguish confirmed defects from speculative architecture preferences. See MODULARIZATION.md for module map and design decisions.
