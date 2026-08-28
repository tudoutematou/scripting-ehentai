# CURRENT_TASK — 1.1 Final Micro Polish

Branch: `feat/1.1-gallery-interaction`

## Goal
The product is close to a stable 1.1. Fix only the remaining real-device polish/regressions below. Do not reopen already-working Search, Login, TagTranslation, Library, Preview Browser, Reader navigation, Archive or other feature families.

This pass contains only:
1. Reader pinch zoom + pan;
2. Gallery Detail glass action polish;
3. Cloud Favorite state/UI parity with EhViewer;
4. preserve Torrent as a known QA item when a known-positive gallery is available.

AI Assistant expansion is next-version work, not part of this stabilization pass.

## Workflow
- inspect current branch/head first;
- minimal root-cause/UI changes only;
- reuse existing `GlassUI`, Reader core and Favorites network layer;
- no architecture rewrite;
- TypeScript diagnostics + focused state/parser checks only;
- sync isolated DEV once and stop for user QA;
- do not merge `main` automatically.

---

# A — Reader pinch zoom + pan

Use current Scripting native gesture APIs (`MagnifyGesture`, `DragGesture`) for single-page Reader.

Required:
- pinch to zoom current page, approximately 1x–4x;
- drag/pan while zoomed;
- page change resets scale/translation;
- online and offline single-page Reader behave the same;
- while actively zooming/panning or meaningfully zoomed, do not accidentally trigger left/right page turns;
- no permanent zoom toolbar; preserve immersive image-first Reader;
- continuous mode does not need the exact same zoom implementation if it would break vertical scrolling.

Focused checks:
- clamp scale;
- reset on page change;
- zoomed state suppresses accidental page turn;
- online/offline shared behavior stays aligned.

---

# B — Gallery Detail glass action polish

Reuse existing `GlassSurface` / `GlassActionButton`; do not invent a second visual system.

Keep the hierarchy:
- primary: `开始阅读 / 继续阅读`;
- secondary: cloud favorite / offline download / local bookmark;
- related-content actions inside one compact glass card;
- resource actions (`Safari / Torrent / Archive`) inside one compact glass card.

Actual tappable actions should look framed/tappable. Metadata rows, tags, comments and preview thumbnails remain information/content, not oversized glass buttons.

On iPhone, wrap/stack actions rather than crushing labels. On iPad, use compact balanced rows/grids.

---

# C — Cloud Favorite parity: server state is authoritative

## Real-device regression
A gallery can already exist in a cloud favorite category (for example `性转`) while Gallery Detail still shows the unfavorited-style cloud favorite action and asks the user to enter a numeric 0–9 category.

This is incorrect.

## EhViewer target behavior
- if the gallery is already favorited, the Detail favorite action visibly shows the **current favorite category name** (for example `性转`, `生肉`, etc.);
- if the gallery is not favorited, the action shows an add-favorite state;
- tapping an unfavorited gallery opens a category chooser;
- tapping an already-favorited gallery opens the category chooser with the current category selected/highlighted and also provides a clear `移除收藏` action;
- changing category updates the visible category name immediately after the server confirms it;
- removing favorite returns the button to the unfavorited/add state;
- keep local bookmark as its own existing feature; do not silently merge local bookmark semantics into cloud favorite.

## Root cause direction
Current Detail derives `existing` from cached/parsed `detail.isFavorited`, and only calls `loadFavoriteState()` when it already believes the gallery is favorited. That allows stale/incorrect Detail state to enter the add-favorite path.

Fix this by treating the authenticated `gallerypopups.php?...act=addfav` response as the authoritative cloud favorite operation state.

### Required data model
Extend the favorite popup parser/state so one popup fetch can provide:
- current category index (`0..9` or null);
- current **category display name**;
- current note;
- the available cloud favorite categories with index + display name, when present in the popup HTML.

Do not require a second heavy Favorites-list page merely to map `0..9` to a name if the popup already contains the option labels.

### Detail synchronization
When a logged-in Gallery Detail opens:
1. render Detail quickly from existing core;
2. asynchronously call `loadFavoriteState(summary)` regardless of cached `detail.isFavorited`;
3. synchronize the visible favorite button from the server result;
4. do not block the rest of Detail while this lightweight state check runs.

When the user taps the cloud favorite action:
1. refresh/read the server favorite state again before presenting destructive/change actions;
2. present a native category picker/list using **category names**, not a freeform numeric text prompt;
3. current category is visibly selected when favorited;
4. if currently favorited, expose `移除收藏` separately and require confirmation;
5. preserve/edit the existing optional cloud favorite note without forcing an extra prompt on every category tap if a cleaner native flow is possible;
6. call existing `changeFavorite()` for the mutation;
7. rely on its post-mutation server verification;
8. update Detail state only after server confirmation.

### Button presentation
Examples:
- not favorited: `♡ 云端收藏` or `♡ 添加收藏`;
- favorited in `性转`: `♥ 性转` (or `♥ 已收藏 · 性转` if space permits).

Prefer the actual server category name over generic `收藏夹 0`.

### Failure behavior
- if the lightweight state refresh fails, do not silently assume unfavorited;
- keep the last truthful state if one exists and show a safe retry/error for management action;
- never log popup HTML, Cookie, gid/token, notes or private URLs.

### Focused checks
Add pure tests for:
- unfavorited popup -> category null;
- favorited popup -> category index + selected category display name;
- category option list parsing;
- note parsing remains intact;
- mutation verification still rejects server mismatch.

---

# D — Torrent remains a known QA item

Do not redesign Torrent again unless testing uses a gallery known to actually contain a torrent.

Preserve:
- real torrent row only;
- no `All` false positive;
- no generic whole-form anchor fallback;
- real name + Posted;
- strip private `?p=`;
- truthful empty state.

If a known-positive gallery still returns zero, report only safe structural counts and continue root-cause diagnosis without exposing Cookie/HTML/gid/token/private URLs.

---

# E — AI Assistant is next-version work

Do not implement AI expansion in this stabilization PR.

After 1.1 is accepted/merged, create a fresh branch/task. Preferred architecture:
- in-script AI is the primary UX;
- Scripting Agent/Assistant Tool remains compatible;
- Scripting-configured provider/model is reused;
- AI calls typed E-Hentai core actions rather than simulating screen taps.

---

# Preserve
- Safari login / Cookie import;
- full EhTagTranslation;
- translated multi-tag search and exclusion;
- full-state search bookmarks;
- working cloud Favorites list;
- responsive iPad/iPhone gallery layouts;
- Library management/navigation;
- immersive Reader controls/tap zones/auto-page;
- dedicated full Preview Browser;
- current balanced Gallery Detail structure;
- Archive flow.

# Execution order
1. Reader pinch zoom/pan.
2. Offline Reader parity.
3. Gallery Detail glass action polish.
4. Fix cloud Favorite authoritative-state sync + named category chooser + remove flow.
5. Run TS diagnostics + focused zoom/favorite parser-state checks.
6. If and only if a known-positive Torrent gallery is available, continue safe Torrent diagnosis.
7. Push logical commit(s), sync isolated DEV once.
8. Stop for user QA.

# User test only
Ask the user to test:
1. Reader pinch zoom/pan and page-change reset;
2. no accidental page turns while zoomed;
3. Detail glass actions on iPad/iPhone;
4. open a gallery already in `性转` (or another cloud folder): Detail immediately resolves to the real category name rather than `添加收藏`;
5. tap the favorite action: current category is selected, changing category works, and `移除收藏` works;
6. open an unfavorited gallery: category chooser appears by name and successful add updates the Detail button;
7. no regression to Library cloud Favorites.

Do not merge `main` automatically.
