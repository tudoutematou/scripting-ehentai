# CURRENT_TASK — Post-release optimization landed on main

Branch: `main`  
HEAD at last code sync: `f720d521ac36b6c3e95dea906dbc78c1f2660dc3`

## Status

P0–P2 post-release optimizations are on `main`. Do not start P3.

## Device QA

- Cookie drafts: candidate paths exclude iCloud; no `ehviewer_cookie.txt` in documents / App Group / Safari / iCloud.
- Live search→detail→first image passed earlier this session (core 1.33s / image 200).
- Later searches aborted at the 20s HTML timeout; large-gallery window and download-pause runtime were not re-checked in that window.
- Still needs a person: 「查看全部」scrolling, continuous Reader, Photos retry confirmation.

## Out of scope

Redux, EventBus, Repository/Factory, SQLite, download rewrite, Navigation rewrite, splitting GalleryFlow because it is long, background downloads, H@H, Wi-Fi transfer, DoH.
