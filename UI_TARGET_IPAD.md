# UI_TARGET_IPAD — Native Responsive UI 2.0

This document defines the target information architecture and responsive layout for the Scripting E-Hentai client on both iPad and iPhone.

It is based on the user-approved iPad and iPhone mockups shown in conversation. Reproduce the **layout hierarchy and interaction model**, not placeholder artwork and not pixel-perfect web styling.

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

Use a native compact root shell with a **bottom tab bar** when current Scripting typings/runtime support the required tab container. If the exact tab API is unavailable, reproduce the same root-selection behavior with the simplest native bottom-root control supported by the runtime; do not fake it with a web/CSS overlay.

Compact root destinations:
- 发现
- 搜索
- 书库
- 收藏
- 设置

`下载` and `历史` remain first-class features but are reached from Library tabs/segments on compact width instead of consuming additional bottom-tab slots.

Root-tab switching must replace root content; it must not push root pages onto a navigation stack.

Each root tab owns a normal child `NavigationStack` for Gallery Detail / Reader / Filter / management pages.

Required behavior:
- same underlying data/actions as iPad;
- no horizontal overflow;
- no permanent sidebar;
- Search filters open as a pushed page/sheet rather than permanent right panel;
- Gallery Detail is one vertical column;
- root tabs remain stable when returning from child pages;
- do not maintain separate networking/store logic for iPhone.

## Adaptive rule

Use current Scripting-supported size-class/environment APIs rather than hardcoding a device model.

Regular width → iPad split layout.
Compact width → iPhone bottom-root layout.

Do not infer layout from screen pixel dimensions alone if size class is available.

---

# 2. Shared visual language

Use native Scripting/iOS components.

Target:
- light/clean native appearance;
- clear white/secondary grouped surfaces;
- system accent for primary actions/selection;
- rounded cards where a card genuinely improves scanning;
- generous iPad spacing and compact-but-readable iPhone spacing;
- restrained dividers/borders;
- no heavy custom animation project;
- no Canvas-based full UI rendering;
- no fake web CSS layout system.

Use existing `GlassUI` only where it remains stable and visually useful. Do not force every surface into glass styling.

Recommended spacing rhythm:
- major section gap: ~18–24 on iPad, ~14–20 on compact;
- card/internal gap: ~8–12;
- iPad main content horizontal padding: ~20–28;
- iPhone page horizontal padding: ~16–20;
- cap very wide readable content where appropriate.

Use real gallery thumbnails/data. Do not add placeholder illustration assets to imitate the mockups.

---

# 3. Reusable UI pieces

Create only small components that are clearly reused. Examples (names flexible):

- `AppSidebar`
- `CompactRootTabs`
- `SectionHeader`
- `GalleryCard`
- `ContinueReadingCard`
- `CategoryChip`
- `SearchComposer`

Do not create a general UI framework.

A new component should exist because at least two screens/rows need the same rendering or because it materially reduces a giant scene.

---

# 4. Discover / Home target

## Shared information hierarchy

1. Header/title
2. Primary Search Composer
3. Discovery cards
4. Category browsing
5. Continue Reading
6. Latest Galleries
7. External links as secondary content

## Regular-width iPad

### Header
- large title: `发现`;
- compact account/status affordance if useful;
- no fake notification feature if notifications do not exist.

### Primary search row
- wide Search Composer as the main control;
- right-side `筛选` / `+ 高级筛选` entry;
- Search Composer must support the translated multi-tag behavior defined in `CURRENT_TASK.md`.

### Discovery cards
A single responsive row/grid for existing features:
- 热门画廊;
- 图片搜索;
- 排行榜 / 订阅入口;
- 最近更新 / latest browse.

On narrower regular widths, allow the cards to wrap using an adaptive grid.

### Category browsing
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

### Continue Reading
Use actual history/progress data as horizontal/scannable cards.

### Latest Galleries
Use existing Home gallery load as an adaptive card grid.

## Compact iPhone Discover target

Match the user-approved mobile mockup behavior:

### Top header
- large `发现` title;
- optional account/status affordance only if backed by real state;
- no fake notification badge/service.

### Search
- full-width rounded Search Composer;
- compact `筛选` action on the trailing side;
- translated tag suggestions must remain usable without covering the entire screen unnecessarily.

### Discovery cards
Use a **2 × 2 card grid** on normal iPhone widths:
- 热门画廊;
- 图片搜索;
- 排行榜;
- 最近更新.

Cards use existing routes only. No fake statistics.

### Category browsing
Horizontal scrolling chips/buttons, beginning with `全部`, followed by the real categories.

Important:
- category chips are buttons/root-search actions, not many nested `NavigationLink`s inside one aggregate List row;
- selecting a category opens one result level; Back returns Discover once.

### Continue Reading
Horizontal card strip:
- cover/thumb;
- compact progress bar;
- percentage or current/total;
- title;
- uploader/author if available;
- overflow only for real supported actions.

Cards should be narrow enough that the next card is partially/fully visible, encouraging horizontal browsing.

### Latest Galleries
Use a **2-column compact card grid** on normal iPhone portrait widths when readable.
Each card may show only available data:
- thumbnail;
- title;
- uploader;
- category/tags when compact;
- rating/pages if available.

If very narrow width makes two columns unreadable, fall back to one column through adaptive layout rather than hardcoding device models.

## External links
News / Forums / Wiki / Torrents are visually secondary and should not compete with discovery content.

---

# 5. Search target

Search is a dedicated root destination on both iPad and iPhone.

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
- list/grid switch only if both renderers are simple and genuinely useful.

Compact width:
- compact list or adaptive 2-column grid depending on readability and existing row quality;
- preserve keyboard/suggestion usability;
- do not squeeze a permanent filter panel beside results.

## Filter panel
Regular-width iPad may show existing advanced-search options as a persistent right-side panel **only if the current Scripting split/layout API supports it cleanly**.

Compact width uses `筛选` to open the existing `FilterView` as a pushed page/sheet while preserving selected tags/free text.

Do not duplicate search/filter business logic.

Filter UI edits the existing `GallerySearchState.advanced`, category and quick-filter fields.

---

# 6. Library target

Library becomes a true aggregation surface rather than only a list of links.

## Shared tabs/segments
Use existing real datasets:
- 全部
- 收藏
- 历史
- 书签
- 下载

Do not duplicate persistent data between tabs.

## Regular-width iPad

### Continue Reading
Use the shared `ContinueReadingCard` component.

### Content grid
Adaptive gallery grid based on selected tab.

## Compact iPhone Library target

Match the approved mobile library mockup:

### Header
- app/account affordance may remain compact;
- large title `书库`;
- top segmented control: `全部 / 收藏 / 历史 / 书签 / 下载`.

### Controls
- compact sort control where supported by real data;
- optional grid/list toggle only if both modes remain simple; do not implement a second renderer merely for decoration.

### Continue Reading
Horizontal compact card strip with:
- thumbnail;
- progress bar / percentage;
- title;
- uploader/author;
- last-read time if already stored.

### Library content
Default/`全部` can show meaningful aggregated content without duplicating storage.

Use **2-column cards** on normal iPhone portrait width where readable.
Cards may display:
- thumbnail;
- title;
- uploader;
- source/status badge such as local bookmark/cloud favorite/download only if useful;
- reading/download state only when real data exists.

Cloud Favorites must use the corrected Favorites parser from current task.

## Existing specialized management
Complex download pause/resume/retry and detailed Favorites category operations may still open dedicated management scenes. The Library overview does not need to duplicate every management control.

---

# 7. Dedicated Favorites root

## iPad
Sidebar `收藏` opens real cloud Favorites directly.

## iPhone
Bottom-tab `收藏` opens real cloud Favorites directly.

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

# 8. Downloads root / compact Library integration

On iPad, Sidebar `下载` opens the existing downloads/offline data.

On iPhone, Downloads is accessible from Library segment `下载` and may also be reachable from Settings/management if useful; do not add a sixth/seventh bottom tab.

UI 2.0 may improve layout only:
- active/incomplete first;
- clear progress;
- pause/resume/retry/delete actions;
- completed downloads separated or filtered;
- tapping a completed item opens Offline Reader.

Do not redesign download engine in UI 2.0.

---

# 9. History root / compact Library integration

On iPad, Sidebar `历史` opens existing history/progress data.

On iPhone, History is accessible from Library segment `历史`; do not add another bottom tab.

Actions:
- continue reading;
- remove/clear only using existing safe behavior.

No new analytics/statistics subsystem.

---

# 10. Gallery Detail target

This is the most important responsive redesign.

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

### Right column — information + interaction
Order:
1. tags;
2. comments summary with `查看与互动`;
3. preview grid;
4. related galleries / uploader / cover search;
5. Torrent/Archive resources if not placed left.

Preview grid uses the already-fixed sprite/direct thumbnail implementation.

## Compact iPhone Gallery Detail target

Match the approved mobile detail mockup's hierarchy, using real E-Hentai fields only.

### Navigation header
- Back;
- centered/clear `画廊详情` title;
- trailing share/more only when backed by real actions. Do not add inert buttons.

### Hero cover
- large full-width cover with rounded corners;
- preserve aspect ratio and existing image/cache behavior;
- optional page count badge such as `1 / 48` only when the displayed value is meaningful from real data; do not imply cover swiping if it is not implemented.

### Identity
- main title;
- Japanese title if present and space allows;
- uploader row with navigation/search action where existing behavior supports it;
- category/status chips kept secondary.

### Summary metrics
Use a compact row/grid of **real existing values only**. Candidate cards:
- rating + count;
- page count;
- favorite state/category/count only if returned by the real page;
- posted/updated time where actually available.

Do **not** invent mockup-only view counts/like counts/follower counts.

If only 2–3 meaningful metrics exist, render 2–3 cards rather than forcing four fake cards.

### Primary actions
- full-width accent `开始阅读` / `继续阅读` button;
- secondary row: 云收藏 / 下载 / 本地书签.

Keep mutation confirmations and existing shared actions.

### Basic information card
Compact metadata card for existing fields such as:
- language;
- pages;
- file size;
- posted/updated time;
- visibility/category when useful.

No duplicated metadata already shown above unless it improves readability.

### Tags
- compact translated tag chips/rows;
- tapping a tag continues to open tag search;
- `更多` / expand behavior only if needed to avoid an enormous first screen.

### Comments
- show a short real comment summary/preview;
- `查看全部` opens existing Comments scene;
- do not add fake like counters/avatars/levels beyond returned/known data.

### Page previews
- horizontal preview strip or compact grid near the lower part of the detail page;
- `查看全部 N 页` where N is real;
- use the already-fixed sprite crop/direct preview implementation;
- tapping preview preserves current Reader/page behavior.

### Related/resources
Place Similar/relations/uploader/Torrent/Archive below primary information as secondary sections/actions.

Do not maintain separate iPad/iPhone business logic; only layout composition differs.

---

# 11. Settings / Account

## iPad
Sidebar `设置` is the stable home for account/login, E/Ex selector, Reader preferences, download/cache management and build info.

## iPhone
Bottom-tab `设置` uses the same settings/account data in a compact grouped layout.

Avoid presenting technical Cookie actions at the top after login is working. Keep manual Cookie import as advanced fallback.

If Account remains a dedicated child page, Settings can link to it; do not duplicate account state implementation.

---

# 12. Navigation correctness rules

These rules are mandatory because real-device QA already exposed stack bugs.

- Root sidebar/tab switching must not push multiple root pages.
- One semantic `NavigationLink` per ordinary List row.
- Never put many unrelated `NavigationLink`s inside one aggregate `VStack`, `HStack`, `LazyVGrid`, or Glass surface that behaves as one List row.
- For visual card/chip grids where many destinations are needed, prefer a root-selection/state action or a navigation structure proven by current Scripting API.
- Do not fix navigation by adding multiple manual `dismiss()` calls.

Expected examples:
- Discover → category results → Back = one level.
- Discover → Gallery Detail → Back = one level.
- Search → Gallery Detail → Back = Search.
- Library → Gallery Detail → Back = Library with the selected Library tab preserved.
- iPhone bottom root selection remains stable while child navigation occurs.

---

# 13. Implementation sequence

Do not attempt a one-shot rewrite of `GalleryFlow.tsx`.

Recommended order:

1. Finish current functional P0/P1 slices (Favorites, category navigation, translated tag search).
2. Introduce responsive root shell: iPad sidebar + iPhone bottom-root selection.
3. Extract shared card/search components only as needed.
4. Rebuild Discover for regular and compact layouts.
5. Rebuild Library aggregation for regular and compact layouts.
6. Rebuild Search regular-width layout/filter integration and compact Search page.
7. Recompose Gallery Detail into regular two-column / compact mobile layout.
8. Wire Favorites/Downloads/History/Settings into the responsive root shell.
9. Remove obsolete duplicate Home entry sections after replacements are proven.

Each step should leave a runnable app.

---

# 14. Verification / handoff

Developer checks only:
- TypeScript diagnostics;
- focused deterministic tests for nontrivial pure layout-state/search logic.

Do not spend model quota on screenshot-perfect automated acceptance.

User performs real-device UI QA.

Ask the user to inspect only:
- iPad landscape root/sidebar;
- iPad Discover/Search/Library/Detail;
- iPhone Discover bottom tabs + 2×2 discovery cards;
- iPhone Library segments + horizontal Continue Reading + 2-column content;
- iPhone Gallery Detail hierarchy/actions/previews;
- translated tag search/filter behavior on at least one device.

Status remains **Implemented · needs user test** until user confirms.
