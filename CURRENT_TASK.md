# CURRENT_TASK — 1.1 Final Optimization Batch

Branch: `feat/1.1-gallery-interaction`

## Goal
Finish the current 1.1 branch as a polished, usable EhViewer-style Scripting client. This is the final consolidated optimization batch for the current PR.

Do not keep old Pass 6 / Pass 7 terminology while implementing. Execute the work below in order, continuously, without asking between slices.

User real-device evidence is authoritative. EhViewer is the behavior reference. `UI_TARGET_IPAD.md` is the visual/layout reference.

## Freeze / preserve
Do not reopen unless a new regression is discovered:
- Safari login / Cookie helper / import + validation.
- Preview sprite thumbnail fix.
- Full EhTagTranslation load (~43,971 entries on device).
- Root product areas = `发现 / 书库 / 设置`.
- Existing comments/rating/image search/download/history/local bookmark/session core.
- Current Archive request work unless the real download handoff is broken.

## Developer workflow
- Inspect latest branch/code before changing each boundary.
- Reuse current session/network/search/store/Reader/parser code.
- Minimal root-cause changes; no broad architecture rewrite.
- TypeScript diagnostics after logical groups.
- One focused deterministic check for non-trivial parser/search/storage/state logic.
- No full regression ritual, release audit, screenshot-perfect self-acceptance, or repeated bootstrap loop.
- Commit logical groups and push to this branch.
- Sync isolated DEV once at the end.
- Final status: **Implemented · needs user test**.

---

# 1. iPad shell + gallery card density

## Sidebar
Current iPad sidebar is too wide for only three root areas.

Required:
- keep native `NavigationSplitView`;
- reduce regular-width sidebar using the supported native split-column width API if available;
- visually target a compact ~220–280 pt navigation column on a full-size iPad;
- preserve native collapse behavior;
- do not create a custom fake sidebar merely to force width.

## Gallery cards
For regular iPad:
- Discover/Home gallery results: prefer **3 columns** at normal landscape width;
- Cloud Favorites: **3 columns**;
- card titles should have roughly 2–3 useful lines before truncation;
- keep real cover/category/uploader/pages/date information;
- preserve server pagination and item count.

For iPhone:
- adaptive 1–2 columns;
- never force the iPad density.

Reuse the existing gallery summary/detail navigation. Extract a small shared GalleryCard/Grid only if it genuinely reduces duplication.

---

# 2. Library cleanup + direct Cloud Favorites

Library remains one root area with:
- 全部
- 收藏
- 历史
- 书签
- 下载

## 收藏
Selecting `书库 → 收藏` must directly display real authenticated E-Hentai cloud favorites.

Required:
- default = All Favorites;
- real category names/counts;
- real gallery cards in the content area;
- regular iPad = readable 3-column grid;
- compact iPhone = adaptive 1–2 columns;
- lightweight category selection/summary in the same Library segment;
- at most one secondary action such as `管理收藏分类` if the dedicated management scene is still useful.

Remove duplicate routes such as both:
- `打开云端收藏与分类管理`
- `管理 → 云端收藏`

Never replace cloud favorites with local bookmarks.

---

# 3. Torrent parser: real torrents only

Real-device QA showed a fake torrent item named `All`.

Use EhViewer `TorrentParser.java` as the narrow contract.

Required:
- split real `<form>...</form>` blocks;
- require the torrent row `<td colspan="5"> ... <a href="...">TORRENT NAME</a></td>`;
- parse Posted date spans;
- remove private `?p=` suffix;
- remove any whole-form generic-anchor fallback;
- never accept `All` or navigation/filter anchors;
- accept only plausible real torrent resources (real tracker / `.torrent` resource shape);
- preserve torrent name/date;
- zero real torrents => truthful empty state + original torrent-page Safari fallback.

Focused fixture:
- two valid torrent forms;
- one fake `All` navigation anchor;
- result count = 2;
- neither result is `All`;
- final URLs remain valid torrent URLs after `?p=` stripping.

---

# 4. Search category exclusion parity

EhViewer normal category controls are **include/exclude toggles**, not single-select filters.

Behavior:
- bright = included;
- dim = excluded;
- tap toggles one category independently;
- multiple categories may be excluded at once;
- `全部包含` resets exclusions.

## State
Use one authoritative exclusion representation, preferably `excludedCategoryMask:number` using the existing category bits.

- mask `0` = include all categories;
- one/multiple bits = excluded categories.

Migrate current single-category behavior carefully:
- Home `全部` = mask 0;
- Home quick category such as `同人` must still mean only that category by excluding all other category bits.

Do not keep two conflicting category truths after normalization.

## URL
`buildGallerySearchUrl()`:
- mask 0 => omit `f_cats`;
- non-zero => `f_cats=<excluded mask>`;
- preserve selected exact tags, free text, language and advanced filters.

## UI
Use a compact grid/chip layout.
Show a short explanation:
`点按可排除分类；变暗 = 排除`

Focused checks:
- exclude Manga + Cosplay simultaneously;
- toggling a category twice restores state;
- Home quick single-category browse still works.

---

# 5. Advanced search parity

Preserve current working options and add the straightforward EhViewer/E-Hentai flags needed for parity.

Keep:
- search gallery name;
- search gallery tags;
- search description;
- minimum rating;
- page range;
- only galleries with torrents;
- show expunged/deleted galleries.

Add/support:
- search torrent filenames (`f_storr=on`);
- search low-power tags (`f_sdt1=on`);
- search downvoted tags (`f_sdt2=on`);
- disable default language filter (`f_sfl=on`);
- disable default uploader filter (`f_sfu=on`);
- disable default tag filter (`f_sft=on`).

Keep advanced options compact/collapsible. Ordinary search must remain simple.

Do not confuse:
- `f_sto` = only galleries with torrents;
- `f_storr` = search torrent filenames.

Focused URL-state check for supported flags.

---

# 6. Search bookmarks = full search-state snapshots

A search bookmark must restore the whole search, not only the keyword.

Persist a versioned safe semantic snapshot containing at least:
- mode;
- free-text keyword;
- selected translated tags (`namespace`, `tag`, display label);
- excluded category mask;
- quick/language filter state;
- advanced options;
- user bookmark title;
- id/timestamps.

Do not persist:
- Cookie/session;
- pagination cursor/current result URL;
- gallery/page tokens;
- authenticated HTML.

Backward compatibility:
- migrate old `{title, query}` saved searches into a normal semantic search state;
- do not delete existing saved searches.

## UI
Provide a clear `保存搜索` / `搜索书签` action for the current composed state.

Search bookmark list should:
- show bookmark title;
- show a compact human-readable summary of selected tags/filter state;
- tap => restore and execute the full state;
- allow delete.

At Discover root:
- preferred: left-edge right-swipe opens the search-bookmark drawer if current Scripting gestures can do so without interfering with iOS back gestures;
- always provide a visible `搜索书签` fallback button/entry;
- do not intercept child-page back gestures.

Focused checks:
- two selected translated tags + two excluded categories + rating/page filter survive save/reload;
- generated URL semantics before/after reload match;
- old query-only bookmark migrates and still works.

---

# 7. Reader preference migration

Extend existing Reader preferences safely rather than replacing them.

Preserve current values:
- single / continuous layout;
- reading direction;
- fit mode;
- preload count;
- prefer original;
- related download/reader preferences already stored.

Add:
- `autoPageSeconds` with a safe default and supported range.

If the schema version changes:
- v1 preferences must migrate automatically;
- malformed new fields fall back safely without discarding old preferences.

---

# 8. Reader EhViewer-style tap zones

Single-page Reader interaction follows the confirmed EhViewer geometry:

- physical left third = page action;
- physical right third = page action;
- center third upper half = quick Reader settings;
- center third lower half = progress/auto-page controls.

## Reading direction
LTR:
- left = previous;
- right = next.

RTL:
- left = next;
- right = previous.

Respect first/last-page boundaries and existing progress persistence.

Normal reading should no longer require permanent `上一页 / 下一页` buttons. Small explicit controls may remain as a fallback/accessibility path, but must not dominate the Reader.

## Center-upper quick settings
Open a native sheet/card inside Reader containing only working controls:
- 单页 / 连续;
- 从左到右 / 从右到左;
- 适应宽度 / 适应屏幕;
- 优先原图;
- 相邻预加载数量;
- 自动翻页秒数.

Changes persist and update the current Reader where safe.

Do not add Android-only controls that Scripting/iOS cannot reliably support.

## Center-lower progress controls
Toggle a compact bottom overlay with:
- current page / total pages;
- native slider/seek control if current Scripting API supports it, otherwise the closest native step/jump control;
- play/pause auto-page button;
- direct page jump if useful.

Changing progress navigates to that page and records progress.

## Continuous mode
Preserve vertical scrolling. Do not put giant invisible left/right overlays over continuous mode that steal scroll gestures.

---

# 9. Auto page turn

Playback is OFF by default.

Required:
- configurable interval from Reader quick settings;
- use a reasonable supported range, roughly 2–30 seconds;
- play starts periodic logical-next-page navigation;
- pause stops it;
- final logical page stops it automatically;
- Reader unmount/close always cancels timer;
- switching mode/jumping manually must not create duplicate timers;
- never keep a hidden timer alive after Reader closes.

Use a normal lifecycle-managed timer, no background polling framework.

Focused state checks for next-page mapping and boundary stop; no timing automation required.

---

# 10. Gallery Detail UI — FINAL APPROVED DESIGN

`UI_TARGET_IPAD.md` section **Gallery Detail — FINAL APPROVED DESIGN** is authoritative.

Implement the approved detail layout after functional search/Reader work so the final UI is built on the stable behavior.

## iPad
Two-column content composition.

### Left
- cover;
- title/Japanese title;
- uploader/category;
- compact real summary metrics only;
- prominent full-width `开始阅读 / 继续阅读`;
- secondary actions: 云端收藏 / 下载离线 / 本地书签;
- one large rounded **基本信息** card.

Basic Information:
- one card;
- aligned key/value rows;
- field name left, real value right;
- use available fields such as language, original/parent, category, uploader, date/time, size, page count;
- do not fabricate missing values merely to fill the design.

### Right
1. **标签** card
   - every tag = independent rounded capsule/chip;
   - translated Chinese when available;
   - preserve click-to-search behavior;
   - wrap naturally;
   - **no `更多` button**.

2. **评论** card
   - a few real comment previews;
   - author/date/text;
   - existing interaction/full-comments entry remains available when needed.

3. **页面预览** card
   - consistent thumbnail grid;
   - page number;
   - preserve fixed sprite/direct thumbnails;
   - open correct Reader page when supported.

4. Related/resources below as secondary content.

## iPhone
Use the same hierarchy as one vertical composition; never squeeze the iPad columns onto compact width.

## Visual language
- native iOS/iPadOS;
- blue system accent;
- rounded cards;
- restrained borders/shadows;
- consistent spacing;
- reduce giant unused blank areas;
- no placeholder/mockup-only data in shipped UI;
- no fake view/like/follower/notification metrics;
- no `更多` entry in the approved tag design.

---

# 11. Navigation correctness

Keep only root areas:
- Discover
- Library
- Settings

Root selection replaces root content.
Child pages push one logical level only.
No aggregate List row containing many unrelated NavigationLinks.
No manual back/dismiss hacks.

Expected:
- Discover → category/results → Back = Discover;
- results → Gallery Detail → Back = results;
- Library → Favorites management → Back = Library with segment preserved;
- Settings → Account → Back = Settings.

---

# Execution order

1. Sidebar + gallery-card density.
2. Library direct Cloud Favorites / remove duplicates.
3. Torrent real-link parser fix.
4. Search category exclusion state + URL.
5. Advanced search flags.
6. Full search-bookmark storage/migration/UI.
7. Reader preference migration.
8. Reader tap zones + quick settings + progress overlay.
9. Auto page turn.
10. Final Gallery Detail UI from `UI_TARGET_IPAD.md`.
11. TypeScript diagnostics + focused parser/search/storage/state checks.
12. Push commits and sync isolated DEV once.
13. Stop.

Do not stop between slices to ask permission. Do not start another milestone.

# Final handoff
Keep the report short:
- **Implemented:** functional/search/Reader/UI groups;
- **Commit(s):** SHA(s);
- **Checks:** diagnostics + focused checks actually run;
- **Please test:**
  1. Library cloud favorites grid + sidebar width;
  2. Torrent no longer shows `All` and shows only real torrents/true empty state;
  3. Manga + Cosplay can both be dimmed/excluded;
  4. complex search bookmark restores tags + exclusions + advanced filters;
  5. Reader left/right + center-upper + center-lower + auto page;
  6. final iPad Gallery Detail layout matches the approved structure, especially Basic Information rows and rounded tag chips with no `更多` button.

User performs real-device QA. Do not merge `main` automatically.
