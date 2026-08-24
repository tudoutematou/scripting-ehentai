# CURRENT_TASK — 0.8 UI/UX Consolidation

Branch: `feat/0.8-ui-ux-consolidation`
Base: accepted 0.7 head `74660b5138458b09d89947254108bd8121b60701`
Reference: current project behavior first; EhViewer may be used only for information hierarchy / workflow inspiration, not pixel-perfect Android copying.

Read `AGENTS.md` first. 0.8 is a **UI/UX consolidation package**, not a feature-expansion package and not the broad stabilization pass.

## Core goal
Turn the current feature-complete DEV build from a developer-oriented collection of buttons/scenes into a coherent Scripting/iOS/iPadOS app experience while preserving all accepted 0.7 behavior.

Do not add broad new capabilities. Do not rewrite the network/parser/store/core architecture just to make the UI cleaner.

Use the current native Scripting UI stack first (`NavigationStack`, `List`, `Section`, `VStack`, `HStack`, `NavigationLink`, native buttons/forms). Inspect current typings before using any new container such as tabs/sidebar; if a clean native primitive is not verified, keep the existing NavigationStack architecture.

## Runtime / session rules
- Never overwrite the stable local `E-Hentai 浏览器`.
- Continue using the isolated `E-Hentai 浏览器 DEV` and mark it clearly as 0.8 DEV.
- Keep repository source authoritative.
- Before automatic context compression becomes likely: finish active tool calls, commit/push completed work, update `DEV_PROGRESS.md`, stop the conversation, then resume in a fresh Agent session.
- Do not depend on compressed tool-call history.

## Preserve exactly
Do not intentionally regress or remove:
- Home / Search / Filter / Results / Detail / Reader / Account;
- E-Hentai + ExHentai routing;
- Popular / Watched / Toplists / My Tags / external destinations;
- cloud Favorites + notes;
- local Bookmarks;
- History / Continue Reading / Quick Search;
- foreground resumable Downloads + offline Reader;
- single + bounded continuous Reader + current-image retry;
- uploader / parent / version / tag/category navigation;
- advanced search parameters;
- safe storage / manifest recovery / bounded network/image work;
- opaque `galleryRef` AI boundary and sanitized diagnostics.

Accepted PLATFORM_GAP remains accepted. Do not reopen reverse image search, rating submission, or comment writes in 0.8.

# UI rules

## 1. Native before custom
Prefer existing native Scripting controls. No custom design-system framework, CSS-like abstraction layer, icon library, animation engine, custom gesture system, or new dependency.

A tiny shared UI helper/component is allowed only when the same visual pattern is genuinely repeated across several screens. Reuse current `GalleryRow`, `StateView`, image cache components, and existing scene functions before creating anything new.

## 2. Information hierarchy before decoration
Fix hierarchy, grouping, labels, spacing, and primary/secondary actions first. Do not spend significant time on ornamental visuals.

Use SF Symbols/system images already supported by Scripting when they improve recognition, but text labels must remain clear.

## 3. iPhone + iPad friendly
Avoid hard-coded screen widths for page-level layout. Existing fixed thumbnail dimensions are fine. Lists/forms/actions must remain usable on iPhone and iPad.

## 4. Consistent Chinese product language
User-facing UI should use concise, consistent Chinese. Remove developer-facing wording, internal implementation terms, confusing English leftovers, and inconsistent verbs where practical.

Examples of consistent concepts:
- 收藏 = cloud Favorites;
- 本地书签 = local bookmark;
- 历史记录;
- 下载 / 离线阅读;
- 继续阅读;
- 设置;
- 登录状态;

Do not rename two different concepts to the same visible label.

# 0.8 work packages

## Package A — App navigation and Home
Inspect the current `HomeScene` and reorganize entry points by user intent.

Target structure should make these immediately understandable without a wall of equal-weight buttons:
- primary search/discovery;
- quick discovery: Popular / Watched / Toplists;
- Library;
- Account / Settings;
- low-frequency external destinations grouped separately.

Keep existing navigation mechanics unless a verified native Scripting tab/sidebar primitive clearly reduces complexity. Do not build a custom tab bar.

Home should expose the most common actions first and push maintenance/external links lower in hierarchy.

## Package B — Gallery lists and search
Unify the visual/list behavior of gallery results wherever the same `GallerySummary` data is used.

- reuse one `GalleryRow` presentation for Home/Results/Popular/Watched/Toplists/Favorites/Bookmarks where structurally possible;
- keep title, category, uploader/pages/date readable and not visually equal-weight;
- loading, empty, error, retry, pagination controls should look and read consistently;
- Previous/Next pagination actions should be obvious but not dominate the list;
- preserve thumbnail priority/cache behavior.

### Search / Filter
Restructure the existing Filter UI into compact native sections:
- category;
- language/common quick filters;
- advanced options;
- one obvious Apply action.

Do not add new search parameters in 0.8. Improve clarity of the parameters already implemented.

## Package C — Gallery Detail
This is the highest-priority UI consolidation area.

Reorganize the existing Detail into a clear top-to-bottom hierarchy:
1. identity: thumbnail/title/category/core metadata;
2. primary actions: Read / Continue Reading where applicable;
3. ownership/library actions: cloud Favorite, local Bookmark, Download;
4. relationship/discovery actions: uploader, parent/version, tags/category;
5. resource/external actions: Torrent / Archive / Safari only when available;
6. metadata/tags/previews/comments/content.

Avoid a long undifferentiated block of buttons.

Use grouped rows/sections or compact horizontal button groups only where they remain readable on narrow screens.

Destructive actions must remain visually and semantically distinct and keep their existing confirmation behavior.

Do not change favorite/download/bookmark business logic unless required to keep the same action working after UI reorganization.

## Package D — Library
Turn `LibraryScene` into one understandable personal-content hub.

Group existing capabilities by meaning, for example:
- Cloud: Favorites;
- Local: Bookmarks / History / Continue Reading;
- Offline: Downloads;
- Discovery/account tools: Quick Search / My Tags as appropriate.

Do not duplicate content just to fill sections. Keep navigation shallow.

For list screens inside Library:
- one consistent row style;
- obvious empty state;
- destructive clear/delete actions separated from normal navigation;
- preserve confirmation and safe storage behavior.

## Package E — Downloads / offline
Improve presentation only; keep foreground-resumable model unchanged.

Each download should communicate state clearly:
- downloading / paused(stopped but resumable) / failed / completed;
- progress if known;
- primary next action (continue/open/retry) should be obvious;
- delete must stay secondary/destructive and confirmed.

Do not invent background-download claims, notifications, or queue features.

Offline Reader should visually feel like the normal Reader where the underlying capabilities overlap.

## Package F — Reader
Do not redesign the rendering engine.

Polish only the existing controls:
- clear page position;
- previous / next / jump;
- retry current image/page;
- original-image behavior;
- continuous-mode load-next-batch control;
- Continue/reset progress where already exposed;
- reader settings entry if it already exists.

Controls should not obscure the image unnecessarily. Avoid adding custom gestures or animations.

Single-page and continuous mode should use consistent terminology and error states.

## Package G — Account / Settings / maintenance
Group the existing screen into user-understandable sections:
- account/site/login state;
- reader preferences;
- downloads/offline/cache;
- history/data maintenance;
- external/help destinations if appropriate;
- development diagnostics only if still useful in DEV and clearly separated.

Do not expose internal technical settings or controls that do nothing.

My Home read-only overview should be presented as account information, not as a raw webpage dump.

## Package H — State, copy, and consistency sweep
After A–G, do one focused UI consistency sweep only:
- navigation titles;
- button verbs;
- section names;
- empty states;
- error/retry copy;
- loading labels;
- spacing/grouping inconsistencies;
- SF Symbol usage where already easy/native.

Use existing `StateView` rather than creating competing error/empty frameworks.

This is not the 0.9 bug sweep: do not go hunting parser/network/storage bugs unrelated to the visible UI unless the UI package directly exposes a blocker.

# Explicit non-goals for 0.8
- no new major feature family;
- no reverse image search retry;
- no rating/comment write work;
- no new background download model;
- no database/storage rewrite;
- no network/parser rewrite;
- no AI capability expansion unless a renamed UI breaks an existing smoke test;
- no custom theme engine;
- no custom tab bar/sidebar unless Scripting already provides a verified native primitive and using it is clearly less code;
- no animation/gesture framework;
- no pixel-perfect EhViewer Android clone.

# Visual acceptance criteria
A user opening the DEV build should be able to answer quickly:
- Where do I search/browse?
- Where is my library?
- How do I read/download/bookmark/favorite this gallery?
- Where are my downloads/history/settings?
- What is the primary action on each screen?

The app should no longer feel like every implemented capability has equal visual priority.

# Verification
For each package:
- TypeScript diagnostics;
- relevant existing smoke/self-test only if touched;
- real `E-Hentai 浏览器 DEV` launch and navigate through the changed screen;
- do not write new parser/store tests for purely visual rearrangement.

At 0.8 completion run the existing full harness once:
- `src/runSelfTests.ts`;
- `src/runActionSmoke.ts`;
- `src/runAssistantToolSmoke.ts`;
- `src/runNetworkSelfTest.ts`.

Then perform one concentrated DEV runtime walkthrough:
1. Home -> search/results -> Detail -> Reader;
2. Detail -> Favorite / local Bookmark / Download entry visibility;
3. Library -> Favorites / Bookmarks / History / Downloads;
4. Discovery -> Popular / Watched / Toplists / My Tags;
5. Account / Settings;
6. iPad-width and narrower-width sanity check where practical.

Do not require exhaustive manual retesting of every underlying network mutation in 0.8 if the action wiring did not change.

# Context checkpoint rule
If the Agent session becomes large before all packages finish:
- finish the current package;
- run its focused checks;
- commit/push;
- update `DEV_PROGRESS.md` with current head, packages completed, next package, known UI-only deferred issues;
- stop the session and resume from GitHub in a fresh conversation.

# Completion
0.8 is complete when:
1. packages A–H are attempted;
2. all major existing feature families are reachable through a coherent hierarchy;
3. Detail, Library, Search/Results, Downloads, Reader, Account/Settings have consistent primary/secondary actions and state language;
4. DEV launches and the concentrated walkthrough succeeds;
5. full existing harness is green;
6. no new privacy/data-loss/destructive-write/startup blocker exists.

At completion freeze 0.8 and report:
- UI areas consolidated;
- intentionally unchanged architecture;
- DEV runtime walkthrough result;
- tests;
- final head SHA;
- any UI-only issues deferred to 0.9;
- at most 3–5 visual acceptance items.

Do not start 0.9 automatically. 0.9 is the separate consolidated stabilization/bug-fix phase after 0.8 acceptance.
