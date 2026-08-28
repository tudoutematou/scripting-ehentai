# UI_TARGET_IPAD — Native Responsive UI 2.1

This file is the current responsive UI contract after real-device QA.

The visual direction from the approved iPad/iPhone mockups remains valid: clean native layout, cards, adaptive grids, clear hierarchy, iPad split layout and compact mobile layout. However, device QA showed that the previous root navigation duplicated the same features too many times. UI 2.1 therefore simplifies the information architecture.

## Core rule

Do not create a root navigation item merely because a feature exists.

Top-level navigation represents **product areas**, while actions and content types live inside those areas.

Reuse all existing business/network/store/parser actions. This is navigation/layout cleanup, not a core rewrite.

---

# 1. Top-level information architecture

## iPad regular width

Persistent sidebar has only:

- **发现**
- **书库**
- **设置**

Remove separate sidebar roots for:
- 搜索
- 收藏
- 下载
- 历史

Reason:
- Search Composer already belongs at the top of Discover.
- 收藏 / 历史 / 书签 / 下载 are Library content types.
- Account/login belongs in Settings.

Root switching replaces content. It must never push several root pages onto one stack.

## iPhone compact width

Use the same product hierarchy with three stable bottom roots when current Scripting tab APIs allow it:

- **发现**
- **书库**
- **设置**

Do not duplicate Search/Favorites as extra bottom tabs.

Child pages use a normal NavigationStack.

---

# 2. Discover

Discover is the browsing + search home.

Order:
1. title/header;
2. **Search Composer** — the only primary ordinary search entry;
3. advanced-filter action;
4. discovery cards;
5. category browsing;
6. Continue Reading;
7. latest galleries;
8. external links as secondary content.

## Search Composer

Keep the translated multi-tag behavior:
- Chinese/English local suggestions;
- selected real tags;
- multiple tags;
- ordinary text coexistence;
- `+ 高级筛选` reuses existing FilterView.

Do not also expose a permanent root Search page in the sidebar/tab bar.

A dedicated Search/Results child scene may still exist internally for focused search, saved searches or results. It is not a root destination.

## iPad

Discovery cards can use a responsive row/grid.
Categories use compact chips/buttons.
Latest galleries use adaptive cards.

## iPhone

Use the approved compact hierarchy:
- 2×2 discovery cards;
- horizontal category chips;
- horizontal Continue Reading strip;
- adaptive 2-column latest gallery cards when readable.

---

# 3. Library

Library is the single root for saved/local/persistent content.

Top segmented content types:
- **全部**
- **收藏**
- **历史**
- **书签**
- **下载**

Do not repeat these same destinations in the sidebar/tab bar.

## 收藏

Uses real E-Hentai cloud Favorites.
Must show real category names/counts and actual gallery items.
A detailed Favorites management scene may remain as a child page if needed for category/search/pagination controls.

## 历史

Uses existing local history/progress.

## 书签

Uses existing local bookmarks.

## 下载

Uses existing offline download records and management actions.

## 全部

May aggregate Continue Reading + useful saved content without duplicating storage.

## iPad

Use adaptive card grids and Continue Reading strip.

## iPhone

Use the approved compact layout:
- segmented control at top;
- horizontal Continue Reading;
- 2-column cards where readable;
- management child pages for complex actions.

---

# 4. Settings / Account

Settings is the single root for:
- current login state;
- account overview;
- E-Hentai / ExHentai site selection;
- Safari login / import+validate flow when needed;
- Reader preferences;
- download preferences;
- cache management;
- diagnostics/build info where useful.

Do not create another Account root destination.
Manual Cookie import stays an advanced fallback.

---

# 5. Gallery Detail

Keep the current responsive direction.

## iPad regular width

Two-column composition.

Left:
- cover;
- title/Japanese title;
- uploader/category;
- rating + count;
- primary Start/Continue Reading;
- cloud favorite / offline download / local bookmark;
- key metadata;
- related/resource actions where appropriate.

Right:
- translated tags;
- comment preview + interaction entry;
- page preview grid;
- relations/uploader/cover search;
- Torrent/Archive resources.

## iPhone compact

One vertical composition:
1. navigation header;
2. large cover;
3. identity;
4. real summary metrics only;
5. full-width Start/Continue Reading;
6. cloud favorite / download / local bookmark;
7. metadata;
8. tags;
9. comments preview;
10. page previews;
11. related/resources.

Never invent view/like/follower/notification counters to imitate a mockup.

---

# 6. Torrent / Archive UI

These are **Gallery Detail resource actions**, not root navigation destinations.

## Torrent

- open native list;
- show real torrent name + posted date;
- each parsed torrent has a clear `下载 / 在 Safari 下载` action;
- fallback to original torrent page only if parsing/request genuinely fails.

## Archive

- show real archive/resolution choices;
- choices must be actionable, not read-only labels;
- implement the actual authenticated archive request/download flow supported by E-Hentai/EhViewer behavior;
- if a final binary/archive must be handed to Safari/system download due Scripting platform limits, resolve the real authenticated final download URL first and then hand it off;
- do not show a fake `Original / 800x / 1280x / 1920x` menu with no action.

---

# 7. Navigation correctness

Mandatory:
- only one root level for Discover / Library / Settings;
- root selection replaces root content;
- child content pushes exactly one logical level;
- no many unrelated NavigationLinks inside one aggregate List row;
- no repeated dismiss/back hacks.

Expected:
- Discover → category/results → Back = Discover;
- Discover → Gallery Detail → Back = previous Discover/results scene;
- Library → Favorites management → Back = Library with selected segment preserved;
- Settings → Account → Back = Settings.

---

# 8. Visual language

Keep the approved visual direction:
- native iOS/iPadOS appearance;
- system accent;
- rounded cards where useful;
- clear white/secondary grouped surfaces;
- restrained borders/shadows;
- adaptive grids;
- generous iPad spacing and compact readable iPhone spacing;
- no full-screen Canvas/Web/CSS recreation;
- no placeholder images merely to match mockups.

Use real gallery thumbnails/data.

---

# 9. Implementation principle

Do not rewrite `GalleryFlow.tsx` in one shot.

Reuse current scenes and business actions. Split a scene/component only when it becomes a real reusable or independent UI unit.

Priority after current device QA:
1. Cloud Favorites runtime fix;
2. Torrent parser/list fix;
3. Archive actionable download flow;
4. root navigation de-duplication;
5. polish Discover / Library / Detail layouts around the simplified structure.

Developer checks only. User performs real-device QA.
