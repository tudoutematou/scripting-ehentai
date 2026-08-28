# CURRENT_TASK — 1.1 Final Reader / Detail QA Cleanup

Branch: `feat/1.1-gallery-interaction`

## Goal
The app is functionally close to complete. Fix only the remaining real-device UX problems below. Do not reopen Search/Login/TagTranslation/Cloud Favorites/Archive or other already-working feature families.

## Real-device truth
Current HEAD already has:
- three-column gallery browsing and improved metadata rows;
- simplified root navigation;
- compact Detail preview summary + dedicated full Preview Browser;
- Reader quick settings, progress and auto-page code.

New QA shows the remaining problems are implementation details, not missing settings.

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

If current Scripting APIs support a clean full-screen/presented Reader that hides the app split sidebar/navigation chrome, prefer that for single-page reading. Verify the current Scripting API before changing navigation architecture. If full-screen presentation is not cleanly supported, keep the current navigation container but still remove all nonessential Reader controls from the resting content area.

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
`ReaderTapZones` currently uses almost-transparent (`opacity=0.01`) `Button`s with blank text and max-size frames. Real-device QA shows the left/right actions are not reliably hit-testable.

## Required fix
- replace the fragile nearly-transparent button technique with a tap surface proven to receive touches in current Scripting runtime;
- inspect current Scripting gesture / GeometryReader / content-shape APIs first;
- make the hit regions cover the **actual visible page/image interaction area**, not a nominal 520pt box;
- use physical regions approximately:
  - left third;
  - center third, split upper/lower;
  - right third;
- the overlay must not block the image itself from laying out at maximum readable size;
- add a small pure helper test for zone → action mapping, including RTL.

Do not require the user to enable tap paging in Settings.

---

# C — Reader overlays are on-demand and independently toggleable

## Progress / auto-page
Current progress UI is always visible because state starts true. Change behavior to EhViewer-like:
- hidden on entry;
- tap center-lower → show bottom progress overlay;
- tap center-lower again (or tap outside/close) → hide it;
- progress overlay contains current/total, slider/jump and play/pause;
- pressing play starts auto-page using the configured seconds;
- pressing pause stops it;
- reaching the final logical page stops it;
- leaving Reader destroys the timer;
- changing pages manually stops auto-page unless intentionally preserving playback is clearly better and consistent.

## Quick Reader settings
Current real-device QA: center-upper opens settings once, but after dismissing it, another center-upper tap may not reopen it.

Treat this as a presentation-state lifecycle bug.

Required:
- make quick settings reopenable unlimited times in one Reader session;
- closing/dismissing settings must always reset presentation state;
- prefer a single explicit Reader overlay state such as conceptually `none | settings | progress` rather than independent booleans that can become stale;
- if the current native `sheet` dismissal callback is unreliable in Scripting, use an in-Reader native overlay/card with explicit close state instead of repeatedly fighting sheet state;
- quick settings only contains actually working controls: layout, direction, fit, original preference, preload, auto-page interval;
- closing quick settings returns to the same page without changing progress.

When settings/progress overlay is visible, its controls take interaction priority over the page tap zones.

---

# D — Reader image sizing / visual hierarchy

The page image should be as large and distraction-free as practical.

Required:
- image centered;
- preserve aspect ratio;
- `fit=width` uses useful available content width;
- `fit=screen` fits within usable screen/content area;
- avoid fixed heights that unnecessarily shrink portrait pages on iPad;
- the tap-zone overlay must follow the actual reader viewport/image area;
- no large blank panel is reserved below the image when progress/settings are hidden.

Keep `查看原图` accessible only when needed; it does not need to be permanently prominent if a cleaner contextual action is possible with current APIs.

Apply equivalent single-page interaction to `OfflineReaderView` so online/offline Reader behavior does not diverge.

---

# E — Gallery Detail: remove the new right-side blank area

## Current cause
The Preview summary was correctly moved below the two-column top content, but the top iPad Detail is still one `HStack` whose height is the taller column.

Current left column contains cover/title/actions/basic information/relations/resources, while the right often contains only tags/comments/resource note. For sparse galleries, the right column ends early and leaves a very large blank area before the full-width Preview section can begin.

## Required regular-iPad layout
Keep the approved visual language, but rebalance the top content so the preview can begin much sooner.

Preferred structure:

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

Use either a compact full-width arrangement or a balanced secondary 2-column card row, whichever produces less dead space with real data.

### Row 3 — preview
Full-width `页面预览 · N` summary + `查看全部`, as already designed.

Key rule: **do not let a short right column force hundreds of points of empty white area before preview begins.**

Compact iPhone remains one vertical stack.

Do not change the approved Basic Information key/value style, rounded tag chips, comments or Preview Browser behavior.

---

# F — Preserve previous unresolved Torrent fix

Torrent remains a known real-device issue until a gallery with a real torrent is parsed successfully.

Keep the existing structural-parser task:
- verified torrent `<td colspan="5">` row only;
- no `All` false positive;
- no whole-form generic-anchor fallback;
- do not reject a structurally valid torrent only because the URL does not match an extra guessed `.torrent` pattern;
- parse real name + Posted;
- strip private `?p=`;
- truthful empty state if there is genuinely no torrent.

If real-device parsing still returns zero, expose only safe structural counts (`formCount`, `torrentCellCount`, `torrentAnchorCount`, `parsedItemCount`) and never HTML/Cookie/gid/token/private URLs.

---

# Preserve
- current Discover/Library three-column card design;
- Gallery metadata rows;
- Library one-push/one-back navigation fix;
- dedicated full Preview Browser;
- Search/category exclusion/search bookmarks;
- full EhTagTranslation;
- Safari login;
- Cloud Favorites;
- Archive download flow.

# Execution order
1. Fix Reader resting UI: progress hidden, remove permanent control row/help text.
2. Replace fragile Reader hit zones and prove LTR/RTL zone mapping.
3. Make settings/progress overlays repeatedly toggleable and state-safe.
4. Improve Reader image sizing / online+offline parity.
5. Rebalance Gallery Detail top content to remove the right-side dead area.
6. Preserve/finish Torrent structural parser diagnosis if still failing.
7. Run TS diagnostics + focused Reader zone/state + Torrent checks.
8. Push and sync isolated DEV once.
9. Stop.

# User test only
Ask the user to test:
1. Reader opens as a clean large-image view with no permanent progress/buttons/settings row.
2. LTR single-page: left tap previous, right tap next; RTL reverses it, with no extra enable switch.
3. Center-upper settings can open → close → open repeatedly.
4. Center-lower progress/play panel toggles show/hide; auto-page starts/stops correctly.
5. Online and offline single-page Reader behave the same.
6. Gallery Detail no longer has the large empty right block before preview.
7. Torrent known-positive gallery returns real entries if available.

Do not merge `main` automatically.
