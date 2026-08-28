# UI_TARGET_IPAD — Native Responsive UI 2.2 Final

This is the final responsive UI contract for the current optimization batch.

The goal is a clean native iOS/iPadOS E-Hentai client with clear product areas, readable gallery cards, compact navigation, and a polished Gallery Detail page. Reuse all existing business/network/parser/store actions. This is UI composition, not a core rewrite.

## 1. Root information architecture

### iPad regular width
Persistent sidebar contains only:
- **发现**
- **书库**
- **设置**

Do not restore separate root items for 搜索 / 收藏 / 下载 / 历史 / 账号.

Search belongs to Discover. 收藏 / 历史 / 书签 / 下载 belong to Library. Account/login belongs to Settings.

Make the sidebar visibly narrower than the current oversized column. Prefer the native split-column width API supported by current Scripting/SwiftUI typings; preserve system collapse behavior.

### iPhone compact width
Use the same three product roots in a compact bottom/root navigation when supported:
- 发现
- 书库
- 设置

Child pages use normal navigation push/pop.

## 2. Discover

Order:
1. title/header;
2. Search Composer;
3. advanced-filter entry;
4. discovery cards;
5. category browsing;
6. Continue Reading;
7. latest galleries;
8. secondary external links.

Search Composer keeps:
- Chinese/English local tag suggestions;
- multiple selected exact tags;
- free text coexistence;
- existing FilterView / advanced filtering;
- search-bookmark action.

Do not also expose Search as a root sidebar/tab destination.

### Gallery grid density
On regular iPad, use a stable **3-column** gallery card grid where practical so titles have useful width. Cards should allow about 2–3 useful title lines before truncation.

On iPhone, use adaptive 1–2 columns depending on available width.

## 3. Library

Top content segments:
- 全部
- 收藏
- 历史
- 书签
- 下载

### 收藏
Selecting Library → 收藏 directly displays real E-Hentai cloud favorites in the content area.
- default = All Favorites;
- show real category names/counts;
- use the same readable gallery-card language as Discover;
- regular iPad = 3 columns;
- compact iPhone = adaptive 1–2 columns;
- keep at most one secondary action such as `管理收藏分类` if a dedicated management scene remains useful.

Remove duplicate routes such as both `打开云端收藏与分类管理` and another `云端收藏` management row.

History, local bookmarks and downloads remain Library content types, not root navigation items.

## 4. Settings / Account

Settings is the single root for:
- login status / account overview;
- E-Hentai / ExHentai site selection;
- Safari login / import+validate;
- manual Cookie fallback;
- Reader preferences;
- download preferences;
- cache / diagnostics where useful.

Do not create another Account root destination.

## 5. Gallery Detail — FINAL APPROVED DESIGN

The user approved the final Gallery Detail visual direction. Follow this structure closely while using real project data and native Scripting components.

Do **not** add a `更多` button/section merely because the reference mockup contains one. Do not invent metrics that the project/server does not actually provide.

### iPad regular width
Use a polished two-column content composition inside the existing root shell.

#### Left identity/action column
Upper block:
- real cover image with stable aspect ratio;
- gallery title and Japanese title when available;
- uploader/creator line;
- compact real summary metrics only (for example rating, rating count, page count, favorite state if actually available);
- prominent full-width `开始阅读` / `继续阅读` primary button;
- three secondary actions arranged cleanly: 云端收藏 / 下载离线 / 本地书签.

Below it, one large rounded **基本信息** card.

Basic Information must use a clean key/value layout inside one card, not scattered vertical text.
Each row is visually aligned as:
`字段名称` on the left and `真实值` on the right.

Use available fields such as:
- 语言
- 原作/父画廊 when meaningful
- 分类
- 上传者
- 上传时间 / 更新时间 when available
- 文件大小
- 页数
- other existing metadata that fits naturally

Do not fabricate fields just to fill space.

#### Right content column
Stack rounded cards in this order:

1. **标签**
   - each tag is an individual rounded capsule/chip;
   - use translated Chinese label when available while preserving correct click-to-search behavior;
   - wrap naturally into multiple rows;
   - no `更多` button in this design;
   - show the useful available tags directly and allow normal scrolling/wrapping.

2. **评论**
   - compact preview of a few real comments;
   - author/date/text;
   - existing comment interactions remain reachable;
   - provide the existing `查看全部/查看与互动` entry only when needed.

3. **页面预览**
   - native preview thumbnail grid;
   - consistent thumbnail size and spacing;
   - page number below/with each preview;
   - keep already-fixed sprite/direct preview behavior;
   - clicking opens the reader at the correct page when current behavior supports it.

4. **关联 / 资源** below the primary content
   - uploader/relations/search cover where already implemented;
   - Torrent and Archive actions;
   - visually secondary, not mixed into the primary identity buttons.

### iPhone compact Gallery Detail
Use the same information hierarchy as one vertical composition:
1. navigation header;
2. large cover;
3. title/Japanese title/uploader/category;
4. real compact summary metrics;
5. full-width Start/Continue Reading;
6. 云端收藏 / 下载 / 本地书签;
7. one Basic Information card using aligned key/value rows;
8. rounded tag chips;
9. short comments preview;
10. compact/horizontal page previews;
11. relations/resources.

Do not squeeze the iPad two-column layout onto iPhone.

## 6. Torrent / Archive resource UI

Torrent:
- native list of real parsed torrents only;
- real name + Posted date;
- clear Safari/system download action;
- never display navigation/filter text such as `All` as a torrent;
- truthful empty state if no real torrent exists.

Archive:
- real archive/resolution choices;
- choices are actions, not labels;
- complete authenticated request until a real download handoff or a clear server restriction is reached.

## 7. Search Filter visual behavior

Category controls follow EhViewer semantics:
- bright = included;
- dim = excluded;
- multiple categories can be excluded independently;
- compact grid/chip layout;
- short explanatory text such as `点按可排除分类；变暗 = 排除`.

Advanced options stay compact/collapsible and reuse the existing filter model. Do not let advanced controls dominate ordinary search.

## 8. Reader interaction UI

Single-page Reader must prioritize content and gestures/tap zones over permanent buttons.
- physical left/right zones page according to reading direction;
- center-upper opens quick Reader settings;
- center-lower opens progress + play/pause auto-page controls;
- continuous mode preserves vertical scrolling.

Quick Reader settings should use a native sheet/card and contain only working settings.

## 9. Visual language

- native iOS/iPadOS appearance;
- system accent blue;
- rounded cards with restrained borders/shadows;
- consistent horizontal/vertical spacing;
- avoid giant unused blank areas;
- avoid overly narrow gallery cards;
- use real gallery thumbnails/data;
- no full-screen Canvas/Web/CSS recreation;
- no placeholder artwork in the shipped app merely to imitate a mockup;
- no mockup-only notification/like/view/follower counters.

## 10. Navigation correctness

Mandatory:
- one root level: Discover / Library / Settings;
- root selection replaces root content;
- child pages push one logical level;
- no aggregate List row containing many unrelated NavigationLinks;
- no dismiss/back hacks.

Expected:
- Discover → category/results → Back = Discover;
- Discover/results → Gallery Detail → Back = previous scene;
- Library → Favorites management → Back = Library with segment preserved;
- Settings → Account → Back = Settings.

## 11. Implementation principle

Do not rewrite `GalleryFlow.tsx` in one shot.
Reuse existing scenes/actions and extract only small real reusable UI units where needed, such as gallery cards, metadata rows, tag chips, or Reader overlay controls.

Developer performs diagnostics/focused checks only. User performs real-device QA.
