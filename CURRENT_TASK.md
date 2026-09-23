# CURRENT_TASK - Navigation and async view ownership

Branch: `main`
Audit baseline: `86ba36b3f642d934b85503a2f8d0f639b9ce8789` (read from GitHub, not prior chat)
Updated: 2026-09-23. Do not start P3.

## Implemented

- Detail and AllPreviews own one native destination each. Responsive PreviewGrid only reports a page tap; it no longer owns a competing Reader destination. Gallery details are keyed by gallery identity. Rapid pushes, old dismissals, and delayed offline-open results cannot replace another navigation session.
- View/retry/account scope invalidates late async UI writes. Detail preview results merge against one synchronous detail reference, preserve metadata changes, and reject obsolete results before returning to child views. The mounted-detail/sidebar counter remains unchanged.
- Favorite reads use request order; a late confirmation cannot initiate a mutation after exit. Initial download reads cannot overwrite newer subscription notifications.
- Range selection and download preparation have separate busy ownership. Done cancels pending selection; completing a download preparation does not erase a newer selection. Drag paging uses the first missing page number, not inventory length.
- Reader jumps are latest-request-wins, including cached-page jumps. Failed target jumps remain visible over the current image and retry the target. Inventory merges happen after await. Continuous progress is recorded for the visible loaded page, not speculative image loads. Continue-reader bootstrap and prefetch consumers respect exit.

## Checks and limits

- Node 22 / TypeScript 5.8.3: `NODE_PATH=$(npm root -g) node tools/check_view_ownership.cjs`.
- 18/18 deterministic checks pass against production component code with simulated hooks/native rendering and I/O. Against the audit baseline, 17 fail and the abort-bridge control passes. These are not device UI tests.
- TSX syntax and `git diff --check` pass. Changed-file sensitive-artifact scan: zero findings. Full-tree scanner still flags the unchanged synthetic sanitizer fixture in `src/selfTest.ts` (`PRIVATE_PATH`); scanner rules were not weakened.
- Type-diagnostic comparison with public declaration snapshots: baseline 72, patched 71, zero new diagnostics. This is NOT a clean full native typecheck. Existing issues include host/DOM declaration mismatches and existing code types. Recheck with declarations synced from the actual DEV runtime.
- Declaration provenance: `Yii-An/Scripting-Scripts`, `global.d.ts` blob `090fb52fde39138bd6378bc4882d214c960b8189`, `scripting.d.ts` blob `0b891993b72d733364f62c29fb6453ddbed4154a`. Snapshot files are not redistributed here.
- Runtime checked: no. No connected Scripting DEV device/runtime was available; stable app was not touched.

## Needs user test - DEV only

1. On iPad, open detail / AllPreviews / Reader, rotate or resize, rapidly tap two pages, then back out. Confirm one destination, correct page, and correct sidebar restoration.
2. With slow loading, select a distant range and immediately Done/back out; reopen or change gallery/account. Confirm no selection resurrection, stale page mixture, or stuck preparation flag.
3. Jump beyond the first preview batch, immediately jump to a cached page, exercise failed-target retry, then continuous reading and resume. Confirm the displayed page and saved progress agree.

Earlier pending QA is not claimed fixed by this batch: save-search naming dialog, large-GIF real progress, and discovery Enter-to-search.

## Out of scope

Redux, EventBus, Repository/Factory, SQLite, download rewrite, Navigation rewrite, splitting GalleryFlow because it is long, background downloads, H@H, Wi-Fi transfer, DoH.
