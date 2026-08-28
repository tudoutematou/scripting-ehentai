# CURRENT_TASK — 1.1.x User QA Fix Pass 6

Branch: `feat/1.1-gallery-interaction`

## Goal
The app is now close to the intended product. This pass is a **real-device polish + one confirmed resource parser fix**, not a new feature wave.

## User-confirmed / observed state
Preserve unless a new regression is reported:
- Safari login / Cookie import works.
- Preview sprite thumbnails work.
- Cloud Favorites now returns real server gallery items.
- Full EhTagTranslation is loaded: device UI reports about `43971` entries from cache.
- Root navigation is now only `发现 / 书库 / 设置`.
- Archive options now render actionable `下载此归档` buttons; do not redesign the archive scene unless actual download handoff is reported broken.
- Current Gallery Detail direction is acceptable.

## Execute now
1. iPad root/sidebar density cleanup.
2. Gallery grid density/card readability, especially Cloud Favorites.
3. Library → 收藏 direct content + remove duplicated Cloud Favorites entry.
4. Torrent parser false-positive fix (`All` must never be treated as a torrent).

## Explicitly defer until user provides Android EhViewer screenshots
- Search filter interaction/layout details.
- Reader page-turn interaction/tap zones/gesture behavior.

Do not guess those two behaviors in this pass.

## Workflow
- User real-device evidence is authoritative.
- Inspect latest branch before editing.
- Reuse existing core/session/parser/store/UI.
- Minimal UI restructuring only; no new architecture layer.
- TypeScript diagnostics + focused Torrent/parser checks only.
- No broad regression/acceptance run.
- Commit logical fixes, sync isolated DEV once, then stop for user test.

---

# Fix A — iPad root/sidebar density

Current regular iPad `NavigationSplitView` leaves a visibly oversized sidebar/blank horizontal area for only three root items.

Required:
- reduce the regular iPad sidebar width so `发现 / 书库 / 设置` occupy a compact navigation rail/column and the content area gains useful width;
- target roughly the visual density of a 220–280 pt sidebar on a full-size iPad, but use the actual supported Scripting/SwiftUI API rather than forcing a magic width if the platform exposes a native split-column width modifier;
- inspect current Scripting docs/API before choosing the implementation;
- keep the system split/collapse behavior working;
- do not replace `NavigationSplitView` with a custom fake sidebar unless the native API truly cannot control width;
- compact iPhone TabView remains unchanged.

This is a density fix, not another visual redesign.

---

# Fix B — Gallery cards / Cloud Favorites grid

The Cloud Favorites page currently uses one very wide list row per gallery. The user wants the same card/grid language as Discover/Home, with fewer cards per row so titles are readable.

## Regular iPad
- Cloud Favorites gallery content: **3 columns per row** at normal landscape width.
- Discover/Home gallery grids should also avoid squeezing titles into 4–5 narrow cards. Prefer a stable 3-column regular-iPad density where practical.
- Reuse the existing `GallerySummary` / thumbnail / Gallery Detail navigation.
- Card title should have enough room for approximately 2–3 useful lines before truncation.
- Preserve cover, category, uploader/pages/date metadata without turning the card into a huge row.

## Compact iPhone
- do not force 3 columns;
- keep an adaptive compact layout, normally 1–2 columns depending on available width.

## Paging
- do not arbitrarily discard server results just to show fewer items;
- "fewer" means lower visual density / fewer columns at once, while keeping existing server pagination semantics.

Prefer one small shared gallery-card/grid helper if it actually removes duplication between Home and Favorites. Do not perform a broad UI component rewrite.

---

# Fix C — Library → 收藏 should be direct content, not duplicate navigation

Current `LibraryScene` has two overlapping Cloud Favorites routes when the 收藏 segment is selected:
- `打开云端收藏与分类管理`
- later under 管理: `云端收藏`

This is redundant.

Required Library behavior:
- selecting `书库 → 收藏` should show **real cloud favorite gallery cards directly in the Library content area**;
- use the authenticated `loadFavorites()` data that is now proven to work;
- default to All Favorites;
- show lightweight category selection/summary without forcing the user through another page merely to see favorites;
- provide at most **one** clearly named management/navigation action if a separate full category-management scene is still useful (for example `管理收藏分类`);
- remove the duplicate `打开云端收藏与分类管理` + `管理 → 云端收藏` pair;
- do not substitute local bookmarks for cloud favorites.

Keep History / Bookmarks / Downloads in Library. Do not move Discover features back into root navigation.

---

# Fix D — Torrent parser: reject fake `All` and parse real torrent links

## Confirmed current bug
Real-device Torrent scene currently shows a single item named `All` with `在 Safari 下载`. Treat this as a parser false positive, **not** as a valid torrent.

Current parser is too permissive: it can select the first generic anchor in the candidate area and can fall back from the torrent `<td colspan=5>` to the entire `<form>`.

## EhViewer reference
Use current EhViewer `TorrentParser.java` behavior as the contract:
- split by `<form>...</form>`;
- require the torrent row `<td colspan="5"> ... <a href="...">TORRENT NAME</a></td>`;
- parse the adjacent Posted spans;
- remove private `?p=` suffix.

The upstream parser test expects real URLs shaped like:
`https://ehtracker.org/get/<id>/<hash>.torrent`

## Required
- **remove the fallback that searches the whole form when the actual torrent cell is absent**;
- only accept an anchor from the real torrent row;
- reject generic filter/navigation anchors such as `All`;
- require the resolved download candidate to be a plausible torrent resource (at minimum a `.torrent` resource / real tracker download shape), while allowing harmless query strings before normalization;
- strip private `?p=` without damaging the rest of the torrent URL;
- preserve real torrent name and Posted date;
- zero real torrent rows => show `服务器未返回可用种子` + original-page Safari fallback;
- never fabricate a torrent item from navigation/filter links.

## Focused regression
Use a fixture modeled after upstream `TorrentParserTest`:
- two valid form blocks;
- expected count = 2;
- both final URLs end in `.torrent` and match the expected tracker path after `?p=` stripping;
- names include meaningful torrent names (for example `Part 2`, `1280x`);
- Posted = real timestamp;
- include an `All` navigation/filter anchor in the fixture and prove it is **not** returned.

No logging of private torrent URLs or full HTML.

---

# Reader note — DO NOT IMPLEMENT YET

Current code behavior is known:
- single-page mode: tapping the image only toggles toolbar visibility;
- page changes are currently only via `上一页 / 跳转 / 下一页` buttons;
- `从右向左翻页` currently changes the order/direction of those page controls;
- `连续纵向阅读` switches to continuous scrolling.

This means the user's lack of tap-zone/swipe page turning is **not a hidden setting problem**; the interaction has not been implemented yet.

Wait for the user's Android EhViewer screenshots/explanation, then define the Reader parity task from that evidence.

# Search Filter note — DO NOT IMPLEMENT YET
Wait for the user's Android EhViewer screenshots/explanation before changing current search-filter behavior/layout.

---

# Handoff
After A–D only:
- push logical commit(s) to `feat/1.1-gallery-interaction`;
- sync isolated DEV once;
- do not modify `main`;
- report only:
  - sidebar/density change;
  - Home/Favorites grid density;
  - Library Favorites de-dup/direct-content change;
  - Torrent false-positive/root-cause fix;
  - commit(s) + TS diagnostics + focused Torrent check.

Ask the user to test only:
1. iPad sidebar is visibly narrower and content has more room;
2. Library → 收藏 directly shows real favorites in a readable 3-column iPad grid and no duplicate Cloud Favorites route;
3. Discover/Home gallery titles are less aggressively squeezed;
4. Torrent scene never shows `All` as a torrent and either shows real `.torrent` entries or a truthful empty state.

Stop and wait for the Android Search/Reader screenshots.
