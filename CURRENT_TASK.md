# CURRENT_TASK — 1.1.x Stability + UI Cleanup

Branch: `feat/1.1-gallery-interaction`  
Base: `main` at `f74c4578993e8ed4e7f7481393df998449ea0660`

## Goal

STOP adding new EhViewer feature families for this pass.

The user has confirmed three real-device problems/needs:

1. **P0 — Gallery preview thumbnails:** many different pages display the same thumbnail.
2. **P0 — Login / Cookie acquisition:** the Safari → Cookie helper → App import flow is still unreliable and too cumbersome.
3. **P1 — UI layout:** the app now has many features, but several screens still look like early functional scaffolding with crowded horizontal actions and weak information hierarchy.

Complete all three slices below in one development session unless genuinely blocked. Do not wait for user approval between slices. After A+B+C are implemented, commit/push and hand the build to the user for real-device testing.

## Working contract

The Agent implements and debugs code. The user performs real-device QA.

For this pass:
- inspect the full affected flow before editing;
- use EhViewer only as a behavioral/parser reference;
- fix root causes, not symptoms;
- run TypeScript diagnostics after changes;
- leave only the smallest focused deterministic check needed for non-trivial parser/login logic;
- do **not** run full regression, release audit, repeated bootstrap, or simulated acceptance;
- do **not** claim runtime verification;
- report the final result as **Implemented · needs user test**.

User-reported runtime behavior is authoritative even if old self-tests pass.

---

# Slice A — P0 Preview thumbnail root cause

## Runtime fact

Different gallery pages frequently show the same preview image.

E-Hentai commonly uses one sprite image for multiple page previews. Therefore multiple pages sharing the same `thumb` URL is normal. The bug is only fixed when each page renders the correct crop/preview.

## Trace before editing

Trace this exact flow end to end:

`Gallery HTML`
→ `parsePreviewPageHtml()` / preview style parsing
→ `normalizePageLinks()`
→ `GalleryPageLink.thumb / thumbX / thumbY / thumbWidth / thumbHeight`
→ `PreviewThumbnail`
→ `SpritePreview` Canvas source rectangle.

Compare the relevant behavior with EhViewer `GalleryDetailParser` preview handling, including the actually needed variants among:
- small preview;
- normal preview;
- newer normal preview;
- label wrappers;
- large/direct preview.

Do not port the Java architecture or copy all parser variants blindly. Support the HTML forms the current site/reference parser actually expects.

## Required result

- Pages that share one sprite URL retain distinct correct crop coordinates.
- Direct/large preview images continue to work.
- Page index and page URL remain tied to the correct preview.
- Multi-preview-page loading must not collapse distinct entries.
- Existing image cache remains shared by URL.

## Forbidden fake fixes

Do NOT:
- disable image caching;
- append random query strings;
- download the same sprite once per page;
- use page index as an artificial image URL;
- replace previews with full reader images merely to hide the parser bug.

## Focused check

Add/adjust one small parser/render-data check proving that at least two pages can share the same sprite URL while producing different page indexes and different crop coordinates. Also preserve a direct-image preview case if already covered.

Commit this slice logically before moving on.

---

# Slice B — P0 Login / Cookie flow

## Current problem

The current user journey is too long and still fails in real use:

`App → Safari login → userscript GM.cookie → shared cookies.json → return to App → import draft → save → validate`

Trace the real code path before changing UI:

`browser.tsx GM.cookie.list()`
→ cookie normalization/domain/path
→ writable shared roots
→ `cookies.json`
→ `importBrowserCookieDraft()`
→ `sanitizeCookies()`
→ Keychain save
→ `getCookieHeader()`
→ E-Hentai / ExHentai validation.

## Root-cause requirements

Inspect especially:
- whether required auth cookies are collected from the correct E/Ex domains;
- whether multiple shared-root cookie drafts can cause an older valid file to be imported before a newer one;
- whether expiry/domain/path normalization can discard a valid login;
- whether E and Ex validation is using the correct cookies without weakening credential checks.

If multiple valid shared drafts exist, prefer the newest valid payload using the payload timestamp instead of blindly accepting the first candidate path.

Do not weaken the requirement for `ipb_member_id` + `ipb_pass_hash`. Keep `igneous` handling appropriate for ExHentai without inventing alternate credentials.

## UX simplification

Normal user flow should become at most:

1. **在 Safari 登录**
2. **导入并验证登录状态**

The second action should combine browser-draft import + Keychain save + status validation. Do not expose a separate ordinary-user “导入草稿” then “保存并验证” ceremony.

Keep manual Cookie import only as an **advanced/fallback** action, not the primary login path.

After successful browser import, avoid leaving stale browser drafts able to override a later login. Use the smallest safe solution; do not build a credential-sync subsystem.

## Security

- Raw Cookie values remain local only.
- Never log/report/store them in GitHub diagnostics.
- No PAT/password/token prompts.
- Do not make the GitHub repository public for this work.

## Focused check

Use one narrow deterministic check for cookie draft selection/normalization if that logic changes. No broad account acceptance suite.

Commit this slice logically before moving on.

---

# Slice C — P1 UI layout cleanup

This is a layout/information-architecture pass, **not** a visual redesign.

Preserve native Scripting/iOS components and existing `GlassUI`. No animation project, no new design system, no broad component framework.

## Global layout rules

- Avoid long rows of unrelated buttons.
- Prefer `List` / `Section` / `VStack` for primary hierarchy.
- Use `HStack` only for 2–3 closely related compact actions that fit on iPhone.
- Use adaptive grids only where a compact category/action grid is genuinely useful.
- Keep major content centered/capped on iPad instead of stretching excessively.
- No horizontal overflow on iPhone.
- Keep loading / empty / error / retry states visible and simple.
- Preserve current native navigation behavior.

## Home

Target hierarchy:

`Search`
- search field as the primary control;
- search + filter kept compact and obvious.

`Discover`
- Popular;
- Image Search;
- Watched / Toplist entry.

`My Content`
- Library;
- Account / Login.

`Categories`
- compact, balanced category grid/list rather than manually packed rows that depend on width.

`Latest Galleries`
- preserve existing gallery cards/list.

`External`
- keep News / Forums / Wiki / Torrents visually secondary.

## Account

Target hierarchy:

`Login status`
- clear logged-in / guest state;
- E/Ex availability readable without exposing implementation details.

`Primary login`
- Safari login;
- import + validate login state.

`Site`
- E-Hentai / ExHentai selector only when appropriate.

`Advanced account actions`
- manual Cookie import;
- refresh status;
- logout.

Then keep Account Overview, Reader Settings, Downloads/Cache, and Library/History as separate sections.

Do not present six or seven technical actions as equal-weight buttons in two HStacks.

## Gallery Detail

Keep existing features, but group actions by meaning instead of adding more horizontal button rows:

- Reading
- Library / Favorite / Offline
- Gallery interactions (rating/comments)
- Related content
- Resources (Torrent/Archive)
- Metadata
- Tags
- Preview grid

Do not remove working functionality. Do not redesign Reader in this pass.

## Search / Filter

Only fix obvious layout crowding/overflow. Do not redesign search behavior or add new filters.

## UI completion rule

The goal is that existing features have a clear place and normal iPhone/iPad layout. Do not create new functionality just to fill the new layout.

No separate UI test framework is required. TypeScript diagnostics are enough for purely presentational edits.

Commit this slice logically.

---

# Preserve / out of scope

Preserve:
- current search/network/session core unless required by the Cookie root cause;
- favorites/history/progress/download data behavior;
- Reader behavior;
- image cache architecture;
- transient `apiuid` / `apikey` safety;
- current feature set already implemented on this branch.

Out of scope for this pass:
- new EhViewer feature families;
- Reader 1.2 parity expansion;
- Download Manager redesign;
- database/framework migration;
- broad folder restructuring;
- speculative refactor;
- full automated acceptance campaign.

# Final handoff

After A+B+C:

- push all commits to `feat/1.1-gallery-interaction`;
- sync DEV once only if needed to deliver the code;
- do not run a long final acceptance routine;
- stop and report only:
  - **Implemented:** Preview / Login / UI changes;
  - **Commit(s):** SHA(s);
  - **Checks:** diagnostics + focused checks actually run;
  - **Please test:** no more than 3 device checks:
    1. open a gallery with many previews and confirm thumbnails are distinct/correct;
    2. perform Safari login → import/validate once;
    3. quickly inspect Home / Account / Detail on iPad (and iPhone if available) for layout issues.

Do not start the next feature milestone automatically.
