# CURRENT_TASK — 1.1.x Fixes + Search Parity + iPad UI 2.0

Branch: `feat/1.1-gallery-interaction`

## Confirmed by user — freeze

- Preview thumbnail duplication is fixed on the real device.
- Safari login + Cookie helper + import/validation works on the real device.
- Do not reopen Preview or Login/Cookie unless a new regression is reported.

## Execute in this order

Complete all four phases without asking between them:

1. **P0 Cloud Favorites** — the same logged-in account has 20+ favorites on `favorites.php`, while App shows zero.
2. **P0 Category navigation** — Home → category → Back must return Home in one tap.
3. **P1 EhViewer-style translated tag search** — Chinese/English tag suggestions, exact tag expressions, multiple selected tags, ordinary text coexistence, existing advanced filters preserved.
4. **P1 iPad UI 2.0** — implement the user-approved responsive layout in `UI_TARGET_IPAD.md` using existing data/actions.

Do not start any other feature family.

## Developer workflow

- Inspect current code and narrow EhViewer behavior before editing.
- Reuse existing network/session/parser/store/search/Reader/download code.
- Fix root cause; no speculative architecture rewrite.
- TypeScript diagnostics after each logical phase.
- One focused deterministic check for non-trivial Favorites/search-expression logic.
- No full regression ritual, release audit, screenshot-perfect automated acceptance, or repeated bootstrap loops.
- Commit logical phases and push to the current branch.
- User performs real-device QA.
- Final status: **Implemented · needs user test**.

## Phase 1 — Cloud Favorites

Current flow:

`FavoritesScene → loadFavorites() → buildFavoritesUrl() → fetchHtml(favorites.php) → parseFavoriteCategories() → parseSearchHtml()`

Use EhViewer references only as needed:
- `FavoritesParser.java`
- `GalleryListParser.java`
- `FavListUrlBuilder.java`

Required behavior:
- All cloud favorites uses `favorites.php` without requiring `favcat=all`.
- Parse `.ido → .fp` positionally: first 10 entries are slots 0–9; count from child 0, name from child 2.
- Do not require a `favcat` attribute on each `.fp` element.
- Parse gallery rows from Favorites `.itg` into the existing `GallerySummary` model.
- Reuse existing gallery-list parsing where compatible; create only the smallest Favorites-specific parser boundary needed.
- Preserve category selection, search, pagination, notes, mutation and active E/Ex routing.
- If HTML structurally contains gallery rows but parser returns zero, show a parser error instead of a false empty state.
- Never log/save full authenticated HTML, Cookie values, titles, gids/tokens or private URLs.

Focused check: synthetic Favorites HTML with non-zero category counts and at least two distinct gallery rows.

## Phase 2 — Category navigation

Current bug source: many unrelated category `NavigationLink`s are inside one aggregate `LazyVGrid` List row.

Required:
- `Home → category results → Back → Home` in one tap.
- Do not patch Back/dismiss manually.
- Do not imperatively manipulate the navigation stack.
- One semantic navigation destination per ordinary List row, or use root/state selection where the new iPad shell requires card/chip grids.
- Inspect only immediate siblings for the same aggregate-row anti-pattern.

## Phase 3 — EhViewer-style translated tag search

Reuse the existing `tagTranslation.ts` database/cache. Do not add another tag DB or remote autocomplete service.

Reference behavior:
- `EhTagDatabase.java`
- `Tag.java`
- `SearchBar.java`

Required:
- Input Chinese or English → local tag suggestions matching either English tag or Chinese translation.
- Example: `汉语` suggests `language:chinese / 汉语`.
- Example: `巨乳` suggests `female:big breasts / 巨乳` and other real matching tags.
- Tapping a suggestion commits a known exact E-Hentai tag term rather than searching the Chinese display text.
- Support multiple selected tags; selecting a second tag must append, not replace the first.
- Selected tags are independently removable and de-duplicated.
- Remaining plain text may coexist with selected tags.
- Reuse existing `GallerySearchState`, `rawQuery`, `displayQuery`, `buildGallerySearchUrl()` and `ResultsView`.
- Existing category/language/rating/page/torrent/expunged filters apply to the same composed query.
- Provide a clear `+ / 高级筛选` entry that reuses existing `FilterView` and preserves the composed query.

Exact-query behavior should match EhViewer semantics for known namespaces, e.g.:
- `female:big breasts` → `f:"big breasts$"`
- `language:chinese` → `l:"chinese$"`
- combined → `f:"big breasts$" l:"chinese$"`

Build the suggestion index once when the current tag database is parsed/loaded. Cap visible suggestions to a UI-friendly number and prefer exact/prefix matches where simple.

Focused checks:
- Chinese and English suggestion matching;
- exact query building;
- two-tag composition;
- duplicate prevention;
- selected tags + plain text coexistence.

## Phase 4 — iPad UI 2.0

Read and follow `UI_TARGET_IPAD.md`.

This is an interface reorganization, not a rewrite of the app.

Key outcomes:

### Responsive shell
- Regular-width iPad: use current Scripting-supported split-navigation/layout APIs for a persistent root sidebar.
- Compact/iPhone: retain a normal single-column `NavigationStack` flow.
- Root destinations: 发现 / 搜索 / 书库 / 收藏 / 下载 / 历史 / 设置.
- Root switching must replace root detail content, not stack several root pages.

### Discover
- Search Composer at top.
- Discovery cards for existing Popular / Image Search / ranking-discovery / latest browse capabilities.
- Compact category chips/buttons without reintroducing multi-link List-row bugs.
- Continue Reading from real history/progress.
- Latest Galleries as adaptive iPad cards using real gallery data.
- External links visually secondary.

### Search
- Dedicated root page.
- Translated multi-tag Search Composer from Phase 3.
- Adaptive results grid on regular width; compact list/grid on iPhone as appropriate.
- Reuse existing advanced filter state; regular iPad may show a right filter panel only if the current Scripting API supports it cleanly, otherwise open existing `FilterView`.

### Library
- Aggregate existing real data into tabs/segments: 全部 / 收藏 / 历史 / 书签 / 下载.
- Reuse Continue Reading cards.
- Adaptive content grid on iPad.
- Specialized management scenes may remain for complex Favorites/download actions.

### Gallery Detail
- Regular-width iPad: two-column composition.
  - Left: cover, titles, uploader/category, rating/pages, primary Read/Continue button, favorite/download/bookmark actions, key metadata.
  - Right: tags, comments summary, preview grid, related/resources.
- Compact/iPhone: collapse the same semantic sections into one vertical column.
- Reuse existing Gallery actions and already-fixed Preview thumbnails.
- Do not invent unsupported counters/features to mimic mockups.

### Settings
- Stable home for account status/login, E/Ex selector, Reader preferences, download/cache management and build info.
- Manual Cookie import remains advanced fallback.

### UI constraints
- Native Scripting/iOS components; no Canvas-rendered full UI and no fake web/CSS framework.
- Prefer clear hierarchy, spacing, cards and adaptive grids over animation.
- Do not add placeholder art/assets just to imitate the reference screenshots.
- Create only small reusable UI components when genuinely reused.
- Do not create a new service/repository/use-case architecture for UI.

## Files / structure

Do not one-shot rewrite `GalleryFlow.tsx`.

Split scenes/components only when the change makes them real independent units, for example:
- responsive app shell/sidebar;
- Discover scene;
- Search Composer;
- reusable Gallery/ContinueReading card;
- Gallery Detail composition.

Keep business logic in existing core modules.

## Final handoff

After all four phases:
- push all logical commits to `feat/1.1-gallery-interaction`;
- sync isolated DEV once if needed;
- do not run a long final acceptance campaign;
- report:
  - **Fix:** Favorites + category navigation;
  - **Search:** translated multi-tag composer + advanced-filter integration;
  - **UI:** responsive iPad shell + Discover/Search/Library/Detail redesign;
  - **Commit(s):** SHAs;
  - **Checks:** diagnostics + focused parser/search checks actually run;
  - **Please test:**
    1. Cloud Favorites shows real categories/items;
    2. Category Back returns Home once;
    3. `汉语` + second translated tag searches both;
    4. iPad landscape sidebar/Discover/Search/Library/Detail layout;
    5. one compact-width/iPhone smoke if available.

Stop and wait for user feedback. Do not automatically start another milestone.
