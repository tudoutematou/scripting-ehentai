# CURRENT_TASK — 1.1.x User QA Fix Pass 6 + Pass 7

Branch: `feat/1.1-gallery-interaction`

## Goal
The app is close to the intended product. Finish the already-authorized Pass 6 polish first, then implement the now-verified EhViewer search/Reader interactions in Pass 7.

User real-device behavior and the cited narrow EhViewer implementations are authoritative. Do not invent a third interaction model.

## Freeze / preserve
Working unless a new regression is reported:
- Safari login / Cookie import.
- Preview sprite thumbnails.
- Cloud Favorites server data can now be read.
- Full EhTagTranslation loads (~43,971 entries on device).
- Root navigation = `发现 / 书库 / 设置`.
- Current responsive Gallery Detail direction.
- Archive options have actionable download requests; do not redesign unless actual handoff is reported broken.

## Workflow
- Inspect latest branch before editing.
- Reuse current session/network/search/store/Reader code.
- Root-cause fixes; no broad architecture rewrite.
- TypeScript diagnostics after logical slices.
- Focused pure/state checks only; no long self-acceptance run.
- Commit logical slices and push to this branch.
- Sync isolated DEV once at the end.
- Final status: **Implemented · needs user test**.

---

# PASS 6 — existing authorized polish/resources

Complete before Pass 7.

## P6-A — iPad sidebar density
- Narrow the regular-width `NavigationSplitView` sidebar so three root items do not consume a large blank column.
- Prefer the supported native split-column width API; inspect current Scripting typings/docs first.
- Target roughly 220–280 pt visual density on full-size iPad where supported.
- Keep native collapse behavior.
- Do not replace it with a custom fake sidebar unless native APIs truly cannot control width.
- iPhone TabView remains compact.

## P6-B — Gallery cards / Cloud Favorites grid
Regular iPad:
- Cloud Favorites and Discover gallery grids should use a readable **3-column** density at normal landscape width.
- Titles get ~2–3 useful lines before truncation.
- Preserve cover/category/uploader/pages/date.
- Reuse existing `GallerySummary` and Gallery Detail navigation.

Compact iPhone:
- adaptive 1–2 columns; never force 3 columns.

Do not drop server results just to make fewer cards visible; preserve pagination.

## P6-C — Library → 收藏 direct content / remove duplication
Current duplicate paths must disappear:
- `打开云端收藏与分类管理`
- `管理 → 云端收藏`

Required:
- `书库 → 收藏` directly loads and shows real cloud Favorites.
- Default = All Favorites.
- Lightweight category selection/summary in the Library 收藏 segment.
- At most one secondary `管理收藏分类` child action if the dedicated scene remains useful.
- Never substitute local bookmarks.

## P6-D — Torrent false-positive fix
Real-device bug: current Torrent scene can show a fake item named `All`.

EhViewer contract: `TorrentParser.java`.
- split `<form>...</form>` blocks;
- require the real `<td colspan="5"> ... <a href="...">TORRENT NAME</a></td>` row;
- parse Posted spans;
- strip private `?p=` suffix.

Required:
- remove whole-form generic-anchor fallback;
- `All`/filter/navigation anchors can never become torrents;
- accept only plausible real torrent resources (`.torrent` / tracker download shape);
- zero real torrent rows => truthful empty state + original-page Safari fallback.

Focused fixture: 2 real torrent forms + an `All` anchor; result must contain exactly 2 torrents and never `All`.

---

# PASS 7 — EhViewer Search + Saved Search + Reader interaction parity

The Android screenshots/explanation are now available. Do not defer these items anymore.

## Reference files
Use only narrow behavior from:
- `Ehviewer_CN_SXJ/widget/CategoryTable.java`
- `Ehviewer_CN_SXJ/widget/SearchLayout.java`
- `Ehviewer_CN_SXJ/widget/AdvanceSearchTable.java`
- `Ehviewer_CN_SXJ/client/data/ListUrlBuilder.java`
- `Ehviewer_CN_SXJ/lib/glgallery/GalleryView.java`
- `Ehviewer_CN_SXJ/ui/GalleryActivity.java`

Reproduce behavior/protocol, not Android view architecture.

---

# P7-A — Search categories are inclusion/exclusion toggles, not single-select

## Confirmed EhViewer behavior
The 10 normal category buttons represent whether each category is allowed:
- bright/active = INCLUDED;
- dim/inactive = EXCLUDED;
- tapping toggles one category independently;
- several categories may be excluded at once.

Upstream `CategoryTable.getCategory()` builds a bitmask from the **unchecked/excluded** categories. E-Hentai receives it through `f_cats`.

## Current mismatch
Current Scripting `GallerySearchState.category` is one enum and `applyCategory()` builds an "only this category" URL. That cannot represent EhViewer's arbitrary exclusion set.

## Required state model
Make the search state capable of representing the full category exclusion mask.

Preferred minimal model:
- add/use `excludedCategoryMask:number` where only the existing 10 category bits are valid;
- `0` = include every category;
- one bit set = exclude that category;
- multiple bits set = exclude all corresponding categories.

Migrate current single-category constructors carefully:
- Home `全部` => mask `0`;
- Home quick chip like `同人` means "only Doujinshi" and therefore may create `ALL_CATEGORY_MASK & ~DOUJINSHI_BIT`;
- existing direct category browse behavior must remain unchanged from the user's point of view.

Do not keep two independent category truths. If a temporary legacy `category` field is needed during migration, normalize to one authoritative mask before URL construction/storage.

## URL contract
`buildGallerySearchUrl()`:
- mask `0` => omit `f_cats`;
- nonzero valid mask => `f_cats=<excluded mask>`;
- preserve selected exact tags, ordinary text, language quick filters and advanced options.

## Search/filter UI
On the ordinary filter screen, categories are a compact grid, not a vertical list.
- each category is independently toggleable;
- visually distinguish included vs excluded clearly;
- label/legend: `点按可排除分类；变暗 = 排除`;
- provide `全部恢复` / `全部包含` to reset mask to 0.

Long-press "invert all others" from Android is optional, not required for this slice.

Focused checks:
1. mask 0 => no `f_cats`;
2. exclude Manga + Cosplay => both bits appear in one `f_cats`;
3. toggling Manga twice returns to original mask;
4. Home "Doujinshi only" still generates exclusion of every other category.

---

# P7-B — Useful advanced-search parity

The user rarely uses advanced search, so prioritize correctness and compactness over copying every Android pixel.

Current existing useful options must remain:
- search gallery name;
- search gallery tags;
- search description;
- minimum rating;
- page range;
- only galleries with torrents;
- show expunged/deleted galleries.

Add the upstream options that have straightforward E-Hentai URL semantics and fit the existing model:
- search torrent filenames (`f_storr=on`);
- search low-power tags (`f_sdt1=on`);
- search downvoted tags (`f_sdt2=on`);
- disable default language filter (`f_sfl=on`);
- disable default uploader filter (`f_sfu=on`);
- disable default tag filter (`f_sft=on`).

Keep the UI collapsed behind `启用高级选项` / existing advanced entry. Do not make ordinary search noisy.

Normalize any old `searchTorrents` field so it clearly means `only galleries with torrents` (`f_sto`), and do not confuse it with `search torrent filenames` (`f_storr`).

Focused URL check for all supported flags.

---

# P7-C — Saved Search becomes a real search bookmark

## User expectation
A search bookmark must reproduce the exact search later, including:
- ordinary free text;
- selected translated E-Hentai tags;
- category exclusions;
- language/quick filter;
- advanced options;
- applicable search mode (normal/uploader/tag where semantically safe).

Tapping the bookmark must open results with the same state, not merely rerun a plain keyword string.

## Current mismatch
Current `SavedSearch` stores only:
`{ id, title, query, createdAt }`.
That loses filters/tags/categories.

## Required storage migration
Upgrade saved-search storage to a versioned full semantic snapshot, e.g. schema v2.

Persist a normalized safe DTO based on `GallerySearchState`, including at least:
- `mode`;
- `keyword`;
- `selectedTags` (`namespace`, `tag`, `display`);
- `excludedCategoryMask`;
- `quickFilter`;
- `advanced` options;
- user title/name;
- timestamps/id.

Do **not** persist:
- current pagination URL;
- transient page cursors;
- Cookie/session;
- private gallery URLs/tokens;
- raw authenticated HTML.

Recompute `rawQuery` / `displayQuery` from semantic fields when loading where practical, rather than trusting stale serialized syntax.

Backward compatibility:
- migrate old v1 `{query}` entries into a normal search state using `createHomeSearchState(query)`;
- do not destroy existing user quick searches.

## UI
Discover/Search should expose a clear `保存搜索` / bookmark action for the current composed state.
- prompt for optional bookmark name;
- de-duplicate exact semantic states where practical;
- Saved Search panel/list shows the user title and a compact human-readable state summary;
- tap => open `ResultsView` with restored state;
- delete remains available.

### EhViewer-style bookmark drawer
At the **Discover root only**, add a lightweight search-bookmark panel/drawer.
- Preferred: left-edge right-swipe opens it if current Scripting gesture APIs can do this reliably without breaking iOS back gestures.
- Always provide a visible `搜索书签` button/toolbar fallback so the feature is never gesture-only.
- Do not intercept the normal iOS back gesture on pushed child scenes.

The drawer/list is for saved **searches**, not Gallery local bookmarks; label it `搜索书签` or `快速搜索` to avoid confusion with Library `书签`.

Focused checks:
1. save state with two translated tags + two excluded categories + rating/page filter;
2. reload store;
3. restored state builds the same search URL/query semantics;
4. v1 keyword-only entry migrates and still executes.

---

# P7-D — Reader tap zones: left/right/menu/progress

## Confirmed EhViewer geometry
`GalleryView.java` defines:
- LEFT: x `0 .. 1/3`, full height;
- RIGHT: x `2/3 .. 1`, full height;
- MENU: center third, upper half;
- SLIDER: center third, lower half.

Priority in the center is menu/slider; left/right page physically.

## Single-page Scripting Reader behavior
Implement equivalent hit areas over the image/reader viewport.

### Physical left/right zones
- LTR reading: left = previous, right = next.
- RTL reading: left = next, right = previous.
- respect first/last page boundaries;
- update reading progress normally;
- do not require visible navigation buttons for normal reading.

Keep small explicit Previous/Next controls only as accessibility/fallback if useful; they should no longer be the primary interaction.

### Center upper area — Reader quick settings
Tapping center-upper opens a compact native Reader settings sheet/panel.

Expose the settings that already exist or are introduced in this slice:
- layout: single / continuous;
- reading direction: LTR / RTL;
- fit: width / screen;
- prefer original image;
- adjacent preload count;
- auto-page interval seconds.

Changes persist through `ReaderPreferences` and update the current Reader immediately where safe.

Do not copy Android-only controls that Scripting/iOS cannot reliably support just to match the screenshot (for example hardware volume-key paging) unless the runtime explicitly supports them.

### Center lower area — progress controller
Tapping center-lower toggles a bottom/compact progress overlay containing:
- current page / total;
- native slider/seek control if supported by current Scripting typings, otherwise the closest native step/jump control;
- play/pause auto-page button;
- direct page jump may remain available.

Changing the progress control moves to that page and records progress.

Do not require the user to leave Reader and enter Settings for these common actions.

## Continuous mode
Preserve vertical scrolling.
- center-upper may still open quick settings;
- center-lower may still expose progress/auto controls if it can be done without blocking normal scroll;
- do not add giant invisible left/right overlays that steal vertical scroll gestures in continuous mode.

---

# P7-E — Auto page turn

Add persistent preference such as `autoPageSeconds` with safe normalization/migration.
- playback is OFF by default;
- interval is configurable from Reader quick settings;
- use a reasonable supported range (for example 2–30 seconds; exact UI may be Stepper/Slider based on Scripting support);
- play button starts periodic logical-next-page navigation according to current reading direction;
- pause button stops it;
- reaching the final logical page stops playback;
- leaving/unmounting Reader always cancels the timer;
- switching mode or manually jumping must not leave duplicate timers running;
- do not run a hidden background timer after Reader is dismissed.

Use a runtime-supported timer primitive and clean it up in `useEffect`/lifecycle. No polling framework.

EhViewer reference: `GalleryActivity.autoRead()` uses the configured transfer time and advances according to layout direction.

Focused pure/state checks for logical next-page mapping and boundary stop; no full timing UI automation required.

---

# P7-F — Reader preference storage migration

Current `ReaderPreferences` is version 1. Extend safely rather than corrupting existing settings.

Required:
- migrate existing v1 values preserving layout/direction/fit/preload/preferOriginal/download settings;
- introduce auto-page interval with default;
- if version bump is used, v1 file must load and rewrite/normalize to the new schema without user intervention;
- malformed new fields fall back safely rather than discarding all old preferences.

---

# Preserve
- working full tag suggestion database and exact tag syntax;
- current Gallery Detail/Preview/Reader image resolution pipeline;
- cloud Favorites/download/history/bookmark stores;
- E/Ex authentication/session behavior;
- image search;
- comment/rating/torrent/archive routes outside the changes explicitly listed above.

---

# Execution order
1. Finish Pass 6 A–D.
2. P7-A category mask + URL state.
3. P7-B advanced flags.
4. P7-C full search bookmarks + migration + drawer/fallback entry.
5. P7-F Reader preference migration.
6. P7-D Reader tap zones/settings/progress UI.
7. P7-E auto page turn.
8. TS diagnostics + focused state/URL/parser tests.
9. Sync isolated DEV once.

Do not stop between slices to ask permission.

---

# Final handoff / user test only
Report concise sections:
- Pass 6 polish/Torrent;
- Search category exclusion;
- Advanced filters;
- Search bookmarks;
- Reader tap zones/settings/progress/auto-page;
- commit(s);
- TypeScript diagnostics + focused checks.

Ask user to test:
1. Search filter: dim Manga + Cosplay and confirm both are excluded; tap again to restore.
2. Compose two translated tags + exclusions + advanced filters, save as a search bookmark, reopen it and confirm the entire state returns.
3. Reader single mode: physical left/right zones page correctly for LTR and RTL.
4. Reader center-upper opens quick settings.
5. Reader center-lower opens page progress + play/pause.
6. Auto-page advances at configured interval and stops at the end/when paused.
7. Pass 6: Favorites grid/sidebar/Torrent `All` regression.

Stop and wait for user real-device feedback. Do not merge `main` automatically.
