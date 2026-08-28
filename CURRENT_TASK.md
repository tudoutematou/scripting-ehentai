# CURRENT_TASK — 1.1.x Fixes + Search Parity + Responsive UI 2.0

Branch: `feat/1.1-gallery-interaction`

## Freeze

User-confirmed working on real device:
- Preview thumbnail duplication fix.
- Safari login + Cookie helper + import/validation.

Do not reopen those areas without a new reported regression.

## Execute in order

Complete all four phases without asking between them:

1. **P0 Cloud Favorites** — authenticated web has 20+ favorites while App shows zero.
2. **P0 Category navigation** — Discover/Home → category → Back must return in one tap.
3. **P1 EhViewer-style translated tag search** — Chinese/English suggestions, exact tag terms, multiple selected tags, plain text coexistence, existing advanced filters preserved.
4. **P1 Responsive UI 2.0** — implement both the approved iPad and iPhone layouts in `UI_TARGET_IPAD.md` using existing data/actions.

Do not start another feature family.

## Developer workflow

- Inspect current code and narrow EhViewer behavior before editing.
- Reuse existing network/session/parser/store/search/Reader/download code.
- Root-cause fixes only; no speculative architecture rewrite.
- TypeScript diagnostics after logical phases.
- One focused deterministic check for non-trivial Favorites/search-expression logic.
- No full regression ritual, release audit, screenshot-perfect automated acceptance, or repeated bootstrap loops.
- Commit logical phases and push to this branch.
- User performs real-device QA.
- Final status: **Implemented · needs user test**.

## Phase 1 — Cloud Favorites

Current flow:
`FavoritesScene → loadFavorites() → favorites.php → parseFavoriteCategories() → parseSearchHtml()`

Use EhViewer `FavoritesParser.java`, `GalleryListParser.java`, `FavListUrlBuilder.java` as narrow references.

Required:
- all favorites uses `favorites.php`;
- parse `.ido → .fp` positionally: first 10 slots = 0–9, count from child 0, name from child 2;
- do not require `favcat` on each `.fp`;
- parse Favorites `.itg` rows into existing `GallerySummary`;
- preserve category/search/pagination/notes/mutations/E-Ex routing;
- if structural gallery rows exist but parser returns zero, surface parser error rather than false empty state;
- never log/save full authenticated HTML, Cookie, titles, gids/tokens or private URLs.

Focused check: synthetic Favorites HTML with non-zero categories and at least two distinct gallery rows.

## Phase 2 — Category navigation

Current issue: aggregate containers hold many unrelated navigation destinations.

Required:
- `Discover → category results → Back → Discover` in one action;
- no manual multi-dismiss/back-stack patch;
- one semantic destination per ordinary List row;
- for card/chip grids, use a proven navigation/state selection pattern rather than ambiguous nested `NavigationLink`s;
- inspect immediate sibling root sections for the same anti-pattern only.

## Phase 3 — EhViewer-style translated tag search

Reuse existing `tagTranslation.ts`; no second tag DB and no remote autocomplete-per-keystroke.

Reference: `EhTagDatabase.java`, `Tag.java`, `SearchBar.java`.

Required:
- Chinese or English input matches local English tag + Chinese translation;
- `汉语` can suggest `language:chinese / 汉语`;
- `巨乳` can suggest `female:big breasts / 巨乳` and other real matching tags;
- selecting a suggestion commits a known exact E-Hentai term, not the Chinese display text;
- multiple selected tags append and are independently removable/de-duplicated;
- remaining plain text may coexist;
- reuse existing `GallerySearchState`, `rawQuery`, `displayQuery`, `buildGallerySearchUrl()` and `ResultsView`;
- existing category/language/rating/page/torrent/expunged filters apply to the same composed query;
- `+ / 高级筛选` reuses existing `FilterView` and preserves the composed query.

Examples:
- `female:big breasts` → `f:"big breasts$"`
- `language:chinese` → `l:"chinese$"`
- combined → `f:"big breasts$" l:"chinese$"`

Focused checks: Chinese/English suggestion, exact query building, two-tag composition, duplicate prevention, selected tags + plain text.

## Phase 4 — Responsive UI 2.0

Read and follow `UI_TARGET_IPAD.md`. It now defines **both iPad and iPhone** target layouts.

This is UI reorganization, not a business/core rewrite.

### iPad regular width
- persistent sidebar: 发现 / 搜索 / 书库 / 收藏 / 下载 / 历史 / 设置;
- root switching replaces root content rather than stacking pages;
- Discover: Search Composer, discovery cards, category chips, Continue Reading, latest gallery cards;
- Search: translated multi-tag composer + existing filters + adaptive results;
- Library: aggregate 收藏 / 历史 / 书签 / 下载;
- Gallery Detail: two-column identity/actions + tags/comments/previews/resources.

### iPhone compact width
Use the user-approved mobile mockups as hierarchy references.

Root bottom tabs:
- 发现
- 搜索
- 书库
- 收藏
- 设置

Downloads and History remain in Library segments instead of adding more bottom tabs.

#### Discover mobile
- large title + full-width Search Composer + compact filter action;
- 2×2 cards: 热门画廊 / 图片搜索 / 排行榜 / 最近更新;
- horizontally scrolling category chips;
- horizontal Continue Reading cards with real progress;
- adaptive 2-column latest-gallery cards where readable.

#### Library mobile
- top segmented control: 全部 / 收藏 / 历史 / 书签 / 下载;
- horizontal Continue Reading cards;
- adaptive 2-column content cards where readable;
- preserve specialized management scenes for complex Favorite/download operations.

#### Gallery Detail mobile
One vertical composition:
1. navigation header;
2. large full-width cover;
3. title/Japanese title/uploader/category;
4. compact summary cards using **real values only**;
5. full-width 开始阅读 / 继续阅读;
6. 云收藏 / 下载 / 本地书签;
7. basic metadata card;
8. translated tags;
9. short comments preview + 查看全部;
10. horizontal/compact page previews;
11. related/resources below.

Never invent mockup-only view/like/follower/notification data.

### Responsive implementation rules
- use current Scripting size-class/environment APIs;
- use native split/tab/root-selection APIs only when supported by current typings/runtime;
- do not hardcode device model names;
- iPad/iPhone share business state/actions; layout composition differs only;
- native Scripting/iOS components only, no full-UI Canvas/web CSS;
- no placeholder artwork/assets;
- only small reusable UI components when genuinely reused;
- do not one-shot rewrite `GalleryFlow.tsx`.

Recommended UI order:
1. responsive shell;
2. shared SearchComposer/GalleryCard/ContinueReadingCard as needed;
3. Discover regular + compact;
4. Library regular + compact;
5. Search regular + compact;
6. Gallery Detail regular + compact;
7. Favorites/Downloads/History/Settings root wiring;
8. remove obsolete duplicate Home sections after replacements work.

## Final handoff

After all phases:
- push logical commits;
- sync isolated DEV once if needed;
- do not run long final acceptance;
- report Fix / Search / Responsive UI / commits / diagnostics + focused checks;
- ask user to test only:
  1. Cloud Favorites items/categories;
  2. category one-tap Back;
  3. two translated tags + advanced filter;
  4. iPad sidebar + Discover/Search/Library/Detail;
  5. iPhone bottom tabs + Discover/Library/Detail.

Stop and wait for user feedback.
