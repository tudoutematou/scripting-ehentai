# CURRENT_TASK — Post-release optimization landed on main

Branch: `main`  
HEAD at last code sync: `e61a1cebfecf8b4d99776355d83b062a0b03ad53`  
Source branch: `feat/1.1-gallery-interaction` (file content matched; git history diverged)

## Status

P0–P2 post-release optimizations are on `main`. Do not start P3.

Remaining work is device QA, not new features:

- 1000–2000 page “查看全部” window and continuous Reader
- download pause / publish throttle / Photos retry
- Cookie helper import without iCloud drafts

## Out of scope

Redux, EventBus, Repository/Factory, SQLite, download rewrite, Navigation rewrite, splitting GalleryFlow because it is long, background downloads, H@H, Wi-Fi transfer, DoH.
