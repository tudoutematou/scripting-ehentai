# UI_TARGET_IPAD — Native iPad UI 2.0

This document defines the target information architecture and responsive layout for the Scripting E-Hentai client.

It is based on the user-approved iPad mockups shown in conversation. Reproduce the **layout hierarchy and interaction model**, not placeholder artwork and not pixel-perfect web styling.

## Product principle

The current project already has most core data/network behavior. UI 2.0 is an **interface reorganization**, not a rewrite of the E-Hentai client.

Preserve and reuse existing:
- `ehentai.ts` networking/session;
- account/Keychain;
- favorites;
- history/progress/bookmarks;
- downloads/offline reader;
- gallery parsers;
- tag translations;
- search state and URL builder;
- Reader;
- image cache;
- existing Gallery actions.

No new repository/service/use-case framework merely for UI.

---

# 1. Responsive shell

## Regular-width iPad

Use a native split navigation shell when current Scripting typings/runtime support it.

Preferred hierarchy:

`NavigationSplitView`
- sidebar: persistent app destinations;
- detail: selected screen;
- optional secondary panel only where Search benefits from a filter panel.

Sidebar destinations:
- 发现
- 搜索
- 书库
- 收藏
- 下载
- 历史
- 设置

The selected destination must be visually distinct using native selection/accent behavior.

Do not implement the sidebar as a horizontal row of `NavigationLink`s or as nested navigation pushes. Switching a root sidebar destination should replace the root detail content, not keep stacking new root scenes.

## Compact width / iPhone

Do not force a permanent sidebar.

Use the existing native `NavigationStack` pattern and single-column pages.

Required behavior:
- same data/actions as iPad;
- no horizontal overflow;
- sections collapse vertically;
- Search filters open as a pushed page/sheet rather than permanent right panel;
- Gallery Detail becomes one column.

## Adaptive rule

Use current Scripting-supported size-class/environment APIs rather than hardcoding a device model.

Regular width → iPad split layout.
Compact width → single-column navigation.

Do not infer layout from screen pixel dimensions alone if size class is available.

---

# 2. Shared visual language

Use native Scripting/iOS components.

Target:
- light/clean native appearance;
- clear white/secondary grouped surfaces;
- system accent for primary actions/selection;
- rounded cards where a card genuinely improves scanning;
- generous iPad spacing;
- restrained dividers/borders;
- no heavy custom animation project;
- no Canvas-based full UI rendering;
- no fake web CSS layout system.

Use existing `GlassUI` only where it remains stable and visually useful. Do not force every surface into glass styling.

Recommended spacing rhythm:
- major section gap: ~18–24;
- card/internal gap: ~8–12;
- iPad main content horizontal padding: ~20–28;
- cap very wide readable content where appropriate.

Use real gallery thumbnails/data. Do not add placeholder illustration assets to imitate the mockups.

---

# 3. Reusable UI pieces

Create only small components that are clearly reused. Examples (names flexible):

- `AppSidebar`
- `SectionHeader`
- `GalleryCard`
- `ContinueReadingCard`
- `CategoryChip`
- `SearchComposer`

Do not create a general UI framework.

A new component should exist because at least two screens/rows need the same rendering or because it materially reduces a giant scene.

---

# 4. Discover / Home target

The iPad Discover screen should visually follow this hierarchy:

## Header
- large title: `发现`;
- compact account/status affordance if useful;
- no fake notification feature if notifications do not exist.

## Primary search row
- wide Search Composer as the main control;
- right-side `筛选` / `+ 高级筛选` entry;
- Search Composer must support the translated multi-tag behavior defined in `CURRENT_TASK.md`.

## Discovery cards
A single responsive row/grid for existing features:
- 热门画廊;
- 图片搜索;
- 排行榜 / 订阅入口;
- 最近更新 / latest browse.

These are navigation/action cards, not newly implemented services.

On narrower regular widths, allow the cards to wrap using an adaptive grid.

## Category browsing
Show compact category chips/buttons:
- 全部
- 同人
- 漫画
- 画师 CG
- 游戏 CG
- 欧美
- 全年龄
- 图集
- Cosplay
- 亚洲真人
- 其他

Important navigation rule:
- do not embed many category `NavigationLink`s in one aggregate List row;
- the visual chip layout must not reintroduce the previous multi-destination navigation-stack bug;
- if Scripting navigation inside a grid remains ambiguous, use buttons that set/replace the selected detail/search state rather than nested NavigationLinks.

## Continue Reading
Use actual history/progress data.

Horizontal/scannable iPad cards:
- cover/thumb;
- title;
- optional uploader/author;
- reading percentage or `current / total`;
- compact progress indicator;
- tapping opens Reader at saved page.

Do not fabricate continue-reading records.

## Latest Galleries
Use existing Home gallery load.

On regular width show an adaptive card grid rather than a long phone-style List.

Each card may show only existing data:
- thumbnail;
- title;
- uploader;
- category;
- rating/pages if available.

Do not add fake views/likes statistics not returned by E-Hentai.

## External links
News / Forums / Wiki / Torrents should be visually secondary, e.g. a compact final section or Settings/More area. They must not compete with primary discovery cards.

---

# 5. Search target

Search is a dedicated root destination on iPad.

## Search header
- title `搜索`;
- full Search Composer;
- selected translated tags visibly represented;
- Search button / submit keyboard behavior;
- clear/remove actions as needed.

## Scope shortcuts
Only expose scopes/filters already supported by real code. Reuse current capabilities such as:
- normal;
- tag expression;
- uploader;
- categories/quick language;
- saved searches where appropriate.

Do not add unsupported `series`, `R-18`, etc. merely because a mockup shows them.

## Results
Regular width:
- adaptive `GalleryCard` grid;
- list/grid switch only if both renderers are simple and genuinely useful; otherwise start with one stable grid.

Compact width:
- use existing compact gallery row/list if it fits better.

## Filter panel
Regular-width iPad may show the existing advanced-search options as a persistent right-side panel **only if the current Scripting split/layout API supports it cleanly**.

Otherwise show `筛选` that opens existing `FilterView`.

Do not duplicate search/filter business logic.

Filter panel/page must edit the existing `GallerySearchState.advanced`, category and quick filter fields.

Applying filters must refresh the same results scene, preserving selected translated tags/free text.

---

# 6. Library target

Library becomes a true aggregation surface rather than only a list of links.

## Header tabs/segments
Use existing real datasets:
- 全部
- 收藏
- 历史
- 书签
- 下载

Do not duplicate persistent data between tabs.

## Continue Reading
Same `ContinueReadingCard` component as Discover.

## Content grid
Use actual cloud Favorites / local bookmarks / history/download data depending on selected tab.

On iPad:
- adaptive gallery grid;
- clear source/status badge only when useful;
- reading progress/download state shown only if that data exists.

On iPhone:
- compact list or 2-column grid depending on readability.

Cloud Favorites must use the corrected Favorites parser from current task.

## Existing specialized management
Complex download pause/resume/retry and detailed Favorites category operations may still open dedicated management scenes. The Library overview does not need to duplicate every management control.

---

# 7. Dedicated Favorites root

Sidebar `收藏` should open real cloud Favorites directly rather than burying them under Library.

Target:
- category selector for all / slot 0–9;
- real category names/counts from server;
- adaptive gallery grid/list;
- search within Favorites;
- pagination;
- open Gallery Detail;
- preserve current favorite mutation/note behavior in Detail.

No fake count based on locally cached bookmarks.

---

# 8. Downloads root

Sidebar `下载` opens existing downloads/offline data.

UI 2.0 may improve layout only:
- active/incomplete first;
- clear progress;
- pause/resume/retry/delete actions;
- completed downloads separated or filtered;
- tapping a completed item opens Offline Reader.

Do not redesign download engine in UI 2.0.

---

# 9. History root

Use existing history/progress data.

Regular width:
- adaptive cards/list with progress;
- newest first unless existing user preference says otherwise.

Actions:
- continue reading;
- remove/clear only using existing safe behavior.

No new analytics/statistics subsystem.

---

# 10. Gallery Detail target

This is the most important iPad-specific redesign.

## Regular-width iPad: two-column detail

Outer content stays centered and comfortably wide.

### Left column — identity + primary actions
Approximate width: 300–380 points depending on container.

Order:
1. cover;
2. title;
3. Japanese title if present;
4. uploader/category;
5. rating + rating count;
6. pages/metadata summary;
7. large primary `开始阅读` / `继续阅读` button;
8. compact actions:
   - 云收藏;
   - 下载;
   - 本地书签;
9. key metadata list;
10. resource/related actions when appropriate.

Do not invent follower/view counters.

### Right column — information + interaction
Order:
1. tags;
2. comments summary with `查看与互动`;
3. preview grid;
4. related galleries / uploader / cover search;
5. Torrent/Archive resources if not placed left.

Preview grid uses the already-fixed sprite/direct thumbnail implementation.

## Compact/iPhone
Collapse to one vertical column while preserving the same semantic section order.

Do not maintain separate business logic for iPad and iPhone; only layout composition differs.

## Comment display
Use real E-Hentai comment data. Do not imitate mockup rating/like UI if backend behavior is not available.

---

# 11. Settings / Account

Sidebar `设置` should become the stable place for:
- Account/login status;
- E/Ex site selector;
- Reader preferences;
- download/cache management;
- diagnostics/build marker if still needed.

Avoid presenting technical Cookie actions at the top after login is working. Keep manual Cookie import as advanced fallback.

If Account remains a dedicated child page, Settings can link to it; do not duplicate account state implementation.

---

# 12. Navigation correctness rules

These rules are mandatory because real-device QA already exposed stack bugs.

- Root sidebar switching must not push multiple root pages.
- One semantic `NavigationLink` per ordinary List row.
- Never put many unrelated `NavigationLink`s inside one aggregate `VStack`, `HStack`, `LazyVGrid`, or Glass surface that behaves as one List row.
- For visual card/chip grids where many destinations are needed, prefer a root-selection/state action or a navigation structure proven by the current Scripting API rather than relying on ambiguous nested row navigation.
- Do not fix navigation by adding multiple manual `dismiss()` calls.

Expected examples:
- Home/Discover → category results → Back = one level.
- Home/Discover → Gallery Detail → Back = one level.
- Sidebar Search → Gallery Detail → Back = Search, not Discover/Library.

---

# 13. Implementation sequence

Do not attempt a one-shot rewrite of `GalleryFlow.tsx`.

Recommended order:

1. Finish current functional P0/P1 slices (Favorites, category navigation, translated tag search).
2. Introduce responsive root shell.
3. Extract shared card/search components only as needed.
4. Rebuild Discover layout using existing data.
5. Rebuild Library aggregation.
6. Rebuild Search regular-width layout/filter integration.
7. Recompose Gallery Detail into regular two-column / compact one-column layouts.
8. Move root destinations (Favorites/Downloads/History/Settings) into sidebar shell.
9. Remove obsolete duplicate Home entry sections after replacements are proven.

Each step should leave a runnable app.

---

# 14. Verification / handoff

Developer checks only:
- TypeScript diagnostics;
- focused deterministic tests for any nontrivial pure layout-state/search logic.

Do not spend model quota on screenshot-perfect automated acceptance.

User performs real-device UI QA.

Ask the user to inspect only:
- iPad landscape root/sidebar;
- Discover;
- Search + translated tags + filters;
- Library;
- Gallery Detail;
- one iPhone/compact-width smoke if available.

Status remains **Implemented · needs user test** until user confirms.
