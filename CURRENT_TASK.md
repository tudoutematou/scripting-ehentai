# CURRENT_TASK — Post-release optimization (v1.1.0)

Branch: `feat/1.1-gallery-interaction`  
Baseline: public `main` at `b6c1c01eaa4e5b69e64eb1ce921a6bd049fe0c4e`

## Goal

Post-release P0–P2 optimizations are implemented on this branch. Do not merge `main` unless the user explicitly asks. P3 items (download rewrite, Navigation rewrite, SQLite, Redux) stay out of scope.

Do not rewrite the download system, Navigation, or GalleryFlow file layout.

## Scope

1. Unfavorited galleries must not display the default/first favorite folder.
2. Cookie drafts must not be written to iCloud; successful import clears GM drafts.
3. Published `src/` must not include DEV commit/bootstrap helpers.
4. Discover has one title and a compact search card.
5. Continuous Reader resolves pages after they appear.
6. “查看全部” renders a preview window, not the full inventory grid.
7. Download UI publish is throttled; pause does not overwrite completed/failed.
8. Photos pending cannot start a second retry while a worker is still running.
9. Image memory cache has a hard cap.
10. Docs/privacy/issue templates match the public release.

## Out of scope

Redux, EventBus, Repository/Factory, SQLite, background downloads, H@H, splitting files because they are long.
