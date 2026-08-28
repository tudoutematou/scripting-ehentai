# CURRENT_TASK — 1.1 Final Micro Polish: Reader Zoom + Glass Actions

Branch: `feat/1.1-gallery-interaction`

## Goal
The product is now close to a stable small app. Do **not** reopen already-working search, login, translated tags, favorites, Library, responsive gallery browsing, preview browser, Reader controls, Archive or other feature families unless a new real-device regression appears.

This final 1.1 micro-pass contains only:
1. native Reader image zoom/pan;
2. Gallery Detail action-button visual polish;
3. preserve the unresolved Torrent investigation if a known-positive gallery is available.

AI Assistant expansion is **next-version work**, not part of this stabilization pass.

## Workflow
- inspect current branch/head first;
- minimal root-cause/UI changes only;
- reuse existing `GlassUI` and Reader core;
- no architecture rewrite;
- TypeScript diagnostics + focused zoom/state checks only;
- sync isolated DEV once and stop for user QA;
- do not merge `main` automatically.

---

# A — Reader: pinch zoom + pan

## User need
Some galleries contain long strip pages or small text/details. Current Reader can fit the page but cannot magnify it interactively.

## Platform direction
Use Scripting native gestures supported by current runtime, especially `MagnifyGesture` for pinch zoom and `DragGesture` for panning. Verify current typings/docs before implementation rather than inventing a custom web/canvas reader.

## Required single-page behavior
- pinch with two fingers to zoom the current page;
- reasonable scale range, approximately `1.0x` to `4.0x` (adjust only if native behavior requires it);
- when zoom > 1x, allow dragging/panning the enlarged page to inspect details;
- clamp/settle translation so the page cannot be permanently lost far outside the viewport;
- changing page resets zoom and translation to the normal fitted state;
- leaving/re-entering Reader starts from normal scale unless there is a very strong existing preference reason to persist zoom;
- apply the same behavior to online and offline single-page Reader;
- continuous vertical Reader does not need this exact single-page zoom implementation unless it can be added safely without breaking scrolling.

## Interaction conflict rule
Reader tap zones and zoom gestures must not fight each other.

- at normal scale, existing left/right/center tap zones work normally;
- while a magnify/drag gesture is actively occurring, do not trigger a page turn;
- when meaningfully zoomed (> about 1.05x), dragging must pan the page rather than switch pages;
- avoid accidental left/right page turns while the user is inspecting a zoomed image;
- progress/settings overlays remain usable and take interaction priority when visible.

Optional only if trivial and stable with current gesture APIs:
- double-tap may toggle normal scale / a useful zoom scale.
Do not block the required pinch behavior on double-tap support.

## Visual rule
Zoom must not add a permanent toolbar. The Reader should remain image-first and immersive.

## Focused checks
- clamp scale lower/upper bounds;
- page change -> scale 1 / translation reset;
- zoomed state suppresses accidental page-turn action;
- online/offline state helpers behave the same where shared.

---

# B — Gallery Detail: frame all actual actions with native glass language

## User feedback
The current Detail page is visually close to final, but sections such as `关联内容` and `资源` still contain naked blue text actions. They look abrupt next to the rounded/glass cards used elsewhere.

The project already has reusable `GlassSurface` and `GlassActionButton` using native `thinMaterial`. Reuse them rather than creating another visual system.

## Required action hierarchy
Every **actual tappable action** in Gallery Detail should look tappable and framed consistently.

### Primary
`开始阅读 / 继续阅读`
- remains the strongest primary action;
- full-width or visually dominant;
- may use accent/blue prominent styling while staying consistent with the glass system.

### Secondary action group
- 云端收藏;
- 下载离线;
- 本地书签.

Render as a balanced row/grid of framed glass actions where width allows. On compact iPhone, allow wrapping/stacking without crushing labels.

### Related-content actions
Examples currently implemented:
- 查看上传者画廊;
- 搜索封面;
- any real related-gallery navigation action.

Put these inside one compact `关联内容` GlassSurface/card and use small framed glass action buttons rather than naked blue text links.

### Resource actions
Examples currently implemented:
- 在 Safari 打开;
- 查看种子列表;
- 归档选项.

Put these inside one `资源` GlassSurface/card and render each as a clear framed glass action. Use suitable SF Symbols when helpful, but do not depend on decorative icons for meaning.

## Do not over-style
- metadata key/value rows are information, not buttons;
- tags remain rounded tag chips and should not become large glass buttons;
- comments remain content cards;
- page preview thumbnails remain thumbnails;
- do not add extra `更多` menus;
- do not invent new actions merely to fill space.

## Responsive behavior
### iPad
Use compact rows/grids of glass actions; keep spacing aligned with Basic Information / Tags / Comments / Preview cards.

### iPhone
Actions may use full-width or 2-column arrangements where labels remain readable. Never squeeze three long labels into an unreadable row.

## Accessibility/interaction
- minimum comfortable touch target around 44pt where practical;
- disabled/unavailable actions use native disabled appearance;
- preserve existing action behavior exactly; this is presentation polish, not networking logic.

---

# C — Torrent remains a known QA item

Do not redesign Torrent again in this micro-pass unless testing uses a gallery known to actually contain a torrent.

Preserve structural EhViewer parsing rules:
- real torrent row only;
- no `All` false positive;
- no generic whole-form anchor fallback;
- real name + Posted;
- strip private `?p=`;
- truthful empty state.

If a known-positive gallery still returns zero, report only safe structural counts and continue root-cause diagnosis without exposing Cookie/HTML/gid/token/private URLs.

---

# D — AI Assistant is the next version

Do not implement this in the current stabilization PR.

The repository already contains:
- `assistant_tool.json`;
- `assistant_tool.tsx`;
- typed `src/ehAction.ts` actions for search/detail/favorites/history/account state.

After 1.1 is accepted/merged, create a fresh branch/task for an expanded Scripting AI Assistant. The preferred direction is to let AI call the same browser/search core rather than simulate screen taps.

Candidate next-version capabilities:
- natural-language gallery search;
- translated multi-tag/filter search state;
- inspect a returned gallery's safe metadata/tags;
- query cloud Favorites and local History;
- interactive AssistantTool result UI for selecting a returned gallery;
- investigate a safe handoff/deep-link/navigation path from an Assistant result into the app's Gallery Detail, only if current Scripting APIs support it cleanly.

Keep opaque gallery references and current credential/token redaction boundaries.

---

# Preserve
- Safari login / Cookie import;
- full EhTagTranslation;
- translated multi-tag search and category exclusion;
- full-state search bookmarks;
- Cloud Favorites;
- responsive iPad/iPhone gallery layouts;
- Library management/navigation;
- immersive Reader controls/tap zones/auto-page already working on current head;
- dedicated full Preview Browser;
- current balanced Gallery Detail structure;
- Archive flow.

# Execution order
1. Add single-page Reader pinch zoom/pan with safe gesture coexistence.
2. Apply equivalent behavior to offline single-page Reader.
3. Convert naked Gallery Detail actions to existing glass action/surface language.
4. Run TypeScript diagnostics + focused zoom/state checks.
5. If and only if a known-positive Torrent gallery is available, retain/continue safe Torrent diagnosis.
6. Push logical commit(s), sync isolated DEV once.
7. Stop for user QA.

# User test only
Ask the user to test:
1. pinch zoom from 1x to useful magnification;
2. drag/pan while zoomed and reset on page change;
3. no accidental page turns during zoom/pan;
4. online/offline single-page zoom parity;
5. Gallery Detail primary/secondary/related/resource actions are consistently framed/glass and remain readable on iPad/iPhone;
6. no regression to existing Detail actions.

Do not merge `main` automatically.
