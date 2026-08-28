# CURRENT_TASK — 1.1 Final Reader / Detail / Compact QA Cleanup

Branch: `feat/1.1-gallery-interaction`

## Goal
The app is functionally close to complete. Fix only the remaining real-device UX problems below. Do not reopen Search/Login/TagTranslation/Cloud Favorites/Archive or other already-working feature families.

## Real-device truth
Current HEAD already has:
- three-column regular-iPad gallery browsing and improved metadata rows;
- simplified root navigation;
- compact Detail preview summary + dedicated full Preview Browser;
- Reader quick settings, progress and auto-page code;
- iPhone compact root = TabView with Discover / Library / Settings.

New QA shows the remaining problems are implementation/layout details, not missing user settings.

## Workflow
- Inspect current head first.
- Root-cause changes only.
- No broad UI redesign or acceptance ritual.
- TypeScript diagnostics + focused pure/state checks only.
- Push logical commit(s), sync isolated DEV once, stop for user QA.

---

# A — Reader must default to immersive / clean reading

## Current bugs confirmed in code
Current `ReaderView` / `OfflineReaderView` initialize:
- `progressVisible = true`;
- permanently render the bottom `上一页 / 阅读设置 / 下一页 / 跳转` row;
- permanently render explanatory help text.

That is not the intended EhViewer-like reading experience.

## Required single-page default
When opening a page, the normal resting state should be:
- one large page image as the dominant content;
- no persistent progress card;
- no persistent page buttons;
- no persistent Reader settings button;
- no persistent explanatory text;
- auto-page is off unless the user explicitly starts it.

Set progress controls hidden by default.

If current Scripting APIs support a clean full-screen/presented Reader that hides the app split/sidebar/tab chrome, prefer that for single-page reading. Verify current Scripting API first. If full-screen presentation is not cleanly supported, keep the navigation container but still remove all nonessential Reader controls from the resting content area.

Do not add fake custom window chrome.

---

# B — Reader tap zones must work reliably without a setup step

## Expected behavior
In **single-page mode**, no extra user setting is required for tap-zone paging.

The reading-direction setting only changes the meaning of physical left/right:
- LTR: left = previous, right = next;
- RTL: left = next, right = previous.

Center area:
- center upper = quick Reader settings;
- center lower = progress / auto-page controls.

Continuous mode keeps vertical scrolling and does not need left/right single-page paging.

## Current implementation risk
`ReaderTapZones` currently uses almost-transparent (`opacity=0.01`) blank Buttons. Real-device QA shows left/right actions are not reliably hit-testable.

## Required fix
- replace the fragile nearly-transparent button technique with a tap surface proven to receive touches in current Scripting runtime;
- inspect current Scripting gesture / GeometryReader / content-shape APIs first;
- make hit regions cover the **actual visible reader/image interaction area**, not a nominal fixed box;
- physical regions approximately: left third / center third split upper-lower / right third;
- overlay must not shrink or block the image layout;
- add a small pure helper test for zone → action mapping, including RTL.

Do not require the user to enable tap paging in Settings.

---

# C — Reader overlays are on-demand and independently toggleable

## Progress / auto-page
- hidden on entry;
- tap center-lower → show bottom progress overlay;
- tap center-lower again (or close/outside when supported) → hide it;
- overlay contains current/total, slider/jump and play/pause;
- play starts configured auto-page interval;
- pause stops it;
- final page stops it;
- leaving Reader destroys timer;
- manual page changes stop auto-page unless a clearly consistent behavior is intentionally chosen.

## Quick Reader settings
Current real-device QA: center-upper can open settings once, then after dismissal another center-upper tap may fail.

Required:
- reopen unlimited times in the same Reader session;
- dismiss always resets presentation state;
- prefer one explicit Reader overlay state conceptually `none | settings | progress` over stale independent booleans;
- if native sheet dismissal is unreliable in Scripting, use an in-Reader native overlay/card with explicit close state;
- settings only contains working controls: layout, direction, fit, original preference, preload, auto-page interval;
- closing settings keeps current page/progress.

Visible overlay controls take priority over page tap zones.

---

# D — Reader image sizing / visual hierarchy

- image centered;
- preserve aspect ratio;
- `fit=width` uses useful available content width;
- `fit=screen` fits usable viewport;
- avoid fixed heights that unnecessarily shrink portrait pages;
- tap-zone overlay follows actual reader viewport/image area;
- no reserved blank panel below image when overlays are hidden;
- keep `查看原图` accessible but not permanently dominant if a cleaner contextual action is possible.

Apply equivalent single-page interaction to `OfflineReaderView`.

---

# E — Gallery Detail: remove the right-side blank area

## Current cause
Preview summary is below the top two-column content, but the first iPad HStack is still as tall as the longer left column. Sparse right-side tags/comments end early and leave a huge blank area.

## Required regular-iPad layout
Preserve the approved visual language but split the top content into balanced rows.

### Row 1 — identity / interaction
Left:
- cover;
- title/Japanese title/uploader/category;
- rating;
- Start/Continue Reading;
- cloud favorite / offline download / local bookmark.

Right:
- rounded tag chips;
- comment preview / interaction entry.

### Row 2 — information / resources
Below Row 1, outside the first fixed two-column row:
- Basic Information card;
- relations / uploader / cover-search;
- Safari / Torrent / Archive resources.

Use compact full-width or a balanced secondary two-card row according to real data. Do not let a short right column force a giant blank block.

### Row 3 — preview
Full-width `页面预览 · N` + `查看全部`, preserving the dedicated Preview Browser.

Compact iPhone remains a vertical stack.

---

# F — Preserve unresolved Torrent structural fix

Torrent remains a known real-device issue until a known-positive gallery parses successfully.

Keep:
- verified `<td colspan="5">` torrent row only;
- no `All` false positive;
- no whole-form generic-anchor fallback;
- do not reject a structurally valid torrent merely because an extra guessed URL-shape pattern fails;
- real name + Posted;
- strip private `?p=`;
- truthful empty state.

If real-device parsing still returns zero, expose only safe counts: `formCount`, `torrentCellCount`, `torrentAnchorCount`, `parsedItemCount` — never HTML/Cookie/gid/token/private URLs.

---

# G — iPhone compact gallery browsing: ONE gallery per row

## Real-device problem
Current compact gallery layout still uses two columns (`galleryGridColumnCount(compact) = 2` and adaptive cards around ~158pt). Real-device screenshots show title, uploader, page count and upload time are crushed/truncated and no longer scan-friendly.

This is not a font-size issue. The compact card is too narrow.

## Final compact rule
For normal iPhone portrait browsing, render **exactly one gallery per row**.

Apply to all ordinary gallery browsing surfaces:
- Discover latest galleries;
- Discover/category/search results where the same gallery-card language is used;
- Library All;
- Library Favorites;
- Library History;
- Library Bookmarks;
- Library Downloads browsing cards.

Do not keep a 2-column fallback merely because two cards technically fit.

## Compact card composition
Prefer a readable horizontal/landscape card rather than an oversized full-width poster card:
- thumbnail on the left, approximately 96–120pt wide with stable aspect;
- content on the right using remaining width;
- title gets 2–3 useful lines;
- category chip remains compact;
- metadata uses separate rows and must not be concatenated into one sentence:
  - uploader row;
  - page-count row, slightly stronger emphasis;
  - upload-time row;
- a long uploader may truncate only its own row and must never hide page count/date;
- history/download note may appear as one extra compact line/progress indicator.

Target scanning experience conceptually:

`[thumb]  Gallery title line 1`
`         Gallery title line 2`
`         [category]`
`         上传者 · ...`
`         页数 · 107 页`
`         上传时间 · ...`

One card consumes one row; then the next gallery starts below it.

## Continue Reading on iPhone
Do not show two tiny side-by-side Continue Reading cards.
Use either:
- one readable card per horizontal viewport (~85–92% width) in horizontal scrolling; or
- one-column vertical cards if simpler/more consistent.

Progress must remain readable.

## iPad preservation
Regular iPad remains 3 columns. Do not regress the successful iPad layout.

---

# H — Library management must be at the TOP on iPhone and iPad

## Real-device problem
The user still sees the Library management block only after scrolling below gallery content. With many history/bookmark/download items this can require a very long scroll.

Current source already attempts a `topBarTrailing` 管理 toolbar action, but real-device compact UI does not show it reliably inside the `TabView + NavigationStack` shell. Therefore source intent is not acceptance; real-device visibility is authoritative.

## Required behavior
Management must be reachable immediately when entering Library, before scrolling any gallery list.

Use a robust visible top-content action if toolbar propagation is unreliable:
- place a compact `管理` / gear button in the first Library header/control section, adjacent to or immediately above the segmented `全部 / 收藏 / 历史 / 书签 / 下载` control;
- it must be visible at the top on both iPhone and iPad;
- the existing toolbar button may remain only if it actually renders, but do not depend on it as the sole entry.

Do **not** render a duplicate management Section after all gallery content.

## Management destination
One management scene contains:
- 历史与进度;
- 本地书签;
- 下载与离线阅读;
- 搜索书签;
- 我的标签.

`订阅更新与排行榜` stays in Discover, not Library management.

Opening management = one navigation level. Back once returns to Library with the selected segment preserved.

---

# Preserve
- regular-iPad Discover/Library 3-column layout;
- current Gallery metadata semantics;
- Library one-push/one-back gallery navigation;
- dedicated full Preview Browser;
- Search/category exclusion/search bookmarks;
- full EhTagTranslation;
- Safari login;
- Cloud Favorites;
- Archive flow.

# Execution order
1. Fix Reader resting UI: progress hidden, remove permanent controls/help.
2. Replace fragile Reader hit zones and prove LTR/RTL mapping.
3. Make settings/progress overlays repeatedly toggleable/state-safe.
4. Improve Reader image sizing and online/offline parity.
5. Rebalance regular-iPad Gallery Detail to remove right dead space.
6. Change compact/iPhone normal gallery browsing from 2 columns to one readable gallery per row; fix Continue Reading density.
7. Put a reliable Library management action at the top; remove bottom management duplication.
8. Preserve/finish Torrent structural diagnosis if still failing.
9. Run TS diagnostics + focused Reader/grid/navigation/Torrent checks.
10. Push and sync isolated DEV once.
11. Stop.

# User test only
Ask the user to test:
1. Reader opens as clean large-image view with no permanent controls.
2. Single-page left/right tap works immediately; RTL reverses direction.
3. Center-upper settings can repeatedly open/close; center-lower progress/play toggles show/hide.
4. Gallery Detail no longer leaves the large blank right block.
5. iPhone Discover/search/library gallery lists show one readable gallery per row; title/uploader/pages/date are legible.
6. iPhone Continue Reading is not two squeezed cards at once.
7. Library management is visible immediately at the top, with no need to scroll to the end.
8. Torrent known-positive gallery returns real entries if available.

Do not merge `main` automatically.
