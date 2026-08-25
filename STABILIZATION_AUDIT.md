# STABILIZATION_AUDIT — 0.9 First Whole-Repo Audit

Audit head: `3eb858dcbabf3f97d4e5eec431b0beb005d1b08d`  
Branch: `feat/0.9-stabilization`  
PR: #28  
Date: 2026-08-24

## Result

- S0: **2**
- S1: **6**
- S2: **20**
- S3: **2**
- A-01 and A-02 are `fixed`; all later findings remain `open`.
- Batch 0 intentionally did not start S1/S2 fixes.

## Verification performed

- TypeScript diagnostics: **0 diagnostics**.
- `src/runSelfTests.ts`: **29/29 passed**.
- `src/runActionSmoke.ts`: **passed**.
- `src/runAssistantToolSmoke.ts`: **passed**.
- `src/runNetworkSelfTest.ts`: **30/30 passed**, including live Search -> Detail Core -> Image Page.
- Current-tree privacy scan originally confirmed 134 committed `runtime/events` files and multiple complete `/g/` and `/s/` URLs; Batch 0 removed the entire `runtime/` tree and the final deterministic scan reports 0 findings.
- Existing green tests do not cover the later S1/S2 races, restart states, alternate list layouts, filesystem failure combinations, or responsive layouts listed below.

# S0

## A-01 — Committed runtime diagnostics expose gallery/page/image URLs

- **severity:** S0
- **symptom / user risk:** The repository contains browsing-history artifacts with complete gallery gid/token URLs, image-page tokens, and signed Hath image URLs. Anyone able to read the repository can infer specific viewed content; signed URLs may remain usable until expiry.
- **root cause:** Legacy diagnostics under `runtime/events/` persisted unsanitized request URLs and were committed. The current `reportDiagnostic` is console-only and host-redacted, but old artifacts remain and there is no root ignore rule.
- **affected paths/features:** diagnostics privacy, gallery/page tokens, repository history and release/source archives.
- **smallest correct fix location:** remove `runtime/` artifacts from the current tree, add a root ignore rule and a deterministic sensitive-artifact scan; separately assess history rewrite because deleting the current files does not erase already-pushed commits.
- **validation needed:** deterministic current-tree/source-archive scan for materialized gallery/page URLs, signed parameters, Cookie values, search queries, private paths and any `runtime/` member.
- **fix:** removed all 135 current-tree `runtime/` artifacts, added root `/runtime/` ignore and `tools/scan_sensitive_artifacts.py`; current-tree scan is clean. Previously pushed commits still expose old diagnostics; release handling must assess history cleanup separately, with no history rewrite performed in Batch 0.
- **status:** fixed

## A-02 — Safari bridge plaintext credentials have no bounded failure/logout lifecycle

- **severity:** S0
- **symptom / user risk:** `login.json` contains complete authentication Cookies in plaintext and can remain indefinitely after malformed input, an expired capture, incomplete Cookies, Keychain failure, or app logout. Logout can therefore leave a reusable credential copy outside Keychain.
- **root cause:** `importSafariLogin()` deletes bridge files only after successful Keychain round-trip; terminal failure paths and `signOut()` do not clean bridge credentials.
- **affected paths/features:** Safari login, Cookie/Keychain lifecycle, logout/relogin, local credential privacy.
- **smallest correct fix location:** the shared account bridge boundary in `src/account.ts`; provide one async credential cleanup used by terminal import failures and logout, while preserving only explicitly recoverable short-lived failures.
- **validation needed:** deterministic in-memory fixtures for expired, malformed, incomplete and Keychain-failure captures; logout must remove every candidate `login.json`, and old data must not re-authenticate afterward.
- **fix:** centralized all-candidate async cleanup in `src/account.ts`; every terminal import outcome and async `signOut()` uses it, cleanup continues across candidate failures, and no recoverable plaintext failure is retained. Product caller now awaits logout before refreshing state.
- **status:** fixed

# S1

## A-03 — The 31st download silently drops the oldest manifest entry

- **severity:** S1
- **symptom / user risk:** Creating or updating enough tasks can remove the oldest task from the UI while leaving its downloaded files on disk. The user loses the normal read/resume/delete path and storage becomes orphaned.
- **root cause:** `saveDownloads()` applies `items.slice(0, 30)` in the generic persistence boundary without rejecting creation, confirming eviction, or deleting the evicted directory.
- **affected paths/features:** download creation, manifest persistence, offline library, storage cleanup and restart recovery.
- **smallest correct fix location:** `saveDownloads()` / `createDownload()` in `src/libraryStore.ts`; never silently truncate in the generic writer. If a limit is required, reject creation or perform an explicit confirmed transactional eviction.
- **validation needed:** create 30 then 31 tasks and assert no record or directory is silently detached; inject manifest/directory failures for any chosen eviction policy.
## A-09 — Expired/revoked Cookies remain locally “logged in”

- **severity:** S2
- **symptom / user risk:** Expired core Cookies remain in request headers and UI/AI account status can stay logged in even after validation fails, leaving Favorites/My Tags/My Home in a persistent false-auth state.
- **root cause:** auth-cookie presence checks and reinsertion bypass expiry; `refreshAccountStatus()` deliberately preserves `loggedIn: true` whenever core names exist.
- **affected paths/features:** account status, E/Ex availability, Favorites, My Tags and Assistant account status.
- **smallest correct fix location:** one shared Cookie-validity predicate and an explicit distinction between stored credentials and server-validated session in `src/account.ts`.
- **validation needed:** expired Cookie, server login redirect and transient offline failure must produce distinct safe states without deleting valid credentials on a network outage.
- **status:** open

## A-10 — Opaque `galleryRef` is not bound to account/site generation

- **severity:** S2
- **symptom / user risk:** A ref created under account/site A remains usable after logout or relogin during its TTL and can target old-session content under a new context.
- **root cause:** ref entries contain only URL and expiry; account lifecycle never invalidates them.
- **affected paths/features:** typed AI search/detail chain, logout/relogin and E/Ex switching.
- **smallest correct fix location:** gallery-ref entry/resolve boundary in `src/ehAction.ts`, keyed to a shared account/session generation.
- **validation needed:** TTL boundaries, 99/100/101 capacity, A -> logout, A -> B and E -> Ex.
- **status:** open

## A-11 — Home account/site state is stale after returning from Account

- **severity:** S2
- **symptom / user risk:** After login/logout or E/Ex switch, Home can show the old title and old list while new requests use the new global site.
- **root cause:** Home and Account own independent account state; account changes are not returned through navigation and Home loads only on initial mount/manual refresh.
- **affected paths/features:** Home, Search routing, E/Ex switch and login/logout.
- **smallest correct fix location:** existing Home -> Account navigation boundary; return an account-changed signal and refresh only when needed.
- **validation needed:** E -> Account -> Ex -> Back, Ex -> E -> Ex, login and logout while preserving request-epoch safety.
- **status:** open

## A-12 — Account overview can write stale data after logout/site switch

- **severity:** S2
- **symptom / user risk:** A slow overview request can complete after logout and re-display old account quotas; site changes do not retrigger because the effect depends only on `loggedIn`.
- **root cause:** `AccountOverviewEntry` lacks cancellation/request generation and omits site/session from dependencies.
- **affected paths/features:** Account overview, logout and E/Ex switch.
- **smallest correct fix location:** the existing overview effect/load boundary.
- **validation needed:** deferred request completed after logout and after site switch must not commit stale data.
- **status:** open

## A-13 — Home/Favorites/Discovery allow stale request overwrite

- **severity:** S2
- **symptom / user risk:** Rapid refresh, favorite-category changes, or Watched/Toplists switches can let an older slow request overwrite the latest selection.
- **root cause:** these scenes lack the request-epoch guard already used correctly by `ResultsView`.
- **affected paths/features:** Home, Favorites and Discovery.
- **smallest correct fix location:** each existing scene load function; reuse the local epoch pattern, not a new request framework.
- **validation needed:** deferred A then B, B completes first, A last; only B may own data/error/loading.
- **status:** open

## A-14 — Toplists is parsed as a flat generic gallery page

- **severity:** S2
- **symptom / user risk:** Rank, list type and time range are lost; duplicate galleries across lists are collapsed and non-gallery leaderboard sections silently disappear.
- **root cause:** Discovery sends the Toplists summary page through `parseSearchHtml`, whose model has no rank/list identity.
- **affected paths/features:** Toplists and Discovery.
- **smallest correct fix location:** Toplists entry plus a bounded dedicated leaderboard parsing boundary; do not rewrite generic search parsing.
- **validation needed:** supported Gallery Toplists preserve list identity and rank; unsupported non-gallery lists are explicitly hidden or labeled.
- **status:** open

## A-15 — Watched pagination is discarded

- **severity:** S2
- **symptom / user risk:** Users can view only the first Watched page even though the parser returns previous/next links.
- **root cause:** `DiscoveryScene` stores only `.items` and has no paging state/actions.
- **affected paths/features:** Watched and Discovery.
- **smallest correct fix location:** `DiscoveryScene`, reusing existing `SearchPage` paging data and Results-style controls.
- **validation needed:** previous/next round trip, empty list, login failure and stale-response guard.
- **status:** open

## A-16 — Search-list titles absorb nested tag text

- **severity:** S2
- **symptom / user risk:** Titles can become “title + tags”, then pollute Detail summaries, History, Bookmarks and Downloads. Live action-smoke output reproduced this shape.
- **root cause:** parser prefers cleaned text of the entire gallery anchor; `.glink/.glname` is only a fallback.
- **affected paths/features:** all gallery lists and local persisted titles.
- **smallest correct fix location:** title extraction priority in `src/searchHtml.ts`.
- **validation needed:** anchor containing `.glink` plus multiple tag elements must return only `.glink`; retain a safe fallback when absent.
- **status:** open

## A-17 — Parent/version relation parsing loses links when the label is outside the anchor

- **severity:** S2
- **symptom / user risk:** Metadata can visibly contain Parent/Older/Newer while no navigation action appears.
- **root cause:** metadata strips URLs; relation detection searches only anchor text/title/class for English keywords and ignores the enclosing labeled row.
- **affected paths/features:** Detail parent/version/replacement navigation.
- **smallest correct fix location:** metadata/relation row parsing in `src/detailHtml.ts`.
- **validation needed:** outer `Parent:` cell with a plain-title anchor, Older/Newer/Replacement fixtures and ordinary-link false-positive checks.
- **status:** open

## A-18 — Relation navigation constructs summaries with empty gid/token

- **severity:** S2
- **symptom / user risk:** A related gallery can be read/bookmarked, but reopening it through the relation path fails to find its Continue Reading and bookmark state.
- **root cause:** relation `GallerySummary` explicitly sets `gid` and `token` to empty strings while read-side lookups use those fields.
- **affected paths/features:** parent/version navigation, History, Continue Reading and Bookmarks.
- **smallest correct fix location:** normalize identity once when creating/entering relation summaries.
- **validation needed:** saved progress/bookmark reopened through E and Ex relation links.
- **status:** open

## A-19 — Reader advances progress before an image succeeds

- **severity:** S2
- **symptom / user risk:** Parse/fetch/display failure can advance Continue Reading to a page never seen; continuous mode records only batch starts rather than successful pages.
- **root cause:** progress is written on `index` change independently of image success.
- **affected paths/features:** single/continuous Reader, retry, History and Continue Reading.
- **smallest correct fix location:** Reader image-success commit boundary.
- **validation needed:** failed resolve/fetch must preserve old progress; retry success commits current page; stale prior-page completion cannot overwrite the new page.
- **status:** open

## A-20 — Persisted `downloading` status survives restart without a worker

- **severity:** S2
- **symptom / user risk:** After termination, Downloads can say “downloading” although no in-memory controller/worker exists, making pause/status semantics misleading.
- **root cause:** parsed manifests retain `downloading`; controller state is process-local and no startup normalization occurs.
- **affected paths/features:** restart recovery and download controls.
- **smallest correct fix location:** download load/recovery boundary; normalize orphaned `downloading` to resumable state and reconcile final files.
- **validation needed:** simulated new process with persisted downloading, final files and leftover `.tmp`.
- **status:** open

## A-21 — Completed status is not reconciled with actual offline files

- **severity:** S2
- **symptom / user risk:** A completed manifest with missing files still shows completed and enters Offline Reader only to fail page by page; file-check rejection is not handled by the UI action.
- **root cause:** UI derives completion only from `done.length`; open action neither requires all paths nor repairs the manifest and lacks rejection handling.
- **affected paths/features:** Downloads status, Offline Reader and storage drift recovery.
- **smallest correct fix location:** shared download reconciliation/open boundary.
- **validation needed:** remove a middle final file from a completed task and inject file API failure; UI must show missing count and offer resume without an unhandled rejection.
- **status:** open

## A-22 — Offline Reader does not update reading progress

- **severity:** S2
- **symptom / user risk:** Reading offline does not update History/Continue Reading, so online reopening resumes from an older page.
- **root cause:** Offline Reader receives only files/title and never calls the shared progress function.
- **affected paths/features:** Offline Reader, History and online/offline parity.
- **smallest correct fix location:** Downloads -> Offline Reader parameter boundary; pass the stored summary and commit only after a local image is available.
- **validation needed:** airplane-mode read to page N updates history; missing pages do not advance it.
- **status:** open

## A-23 — Quick Search mutations are not serialized

- **severity:** S2
- **symptom / user risk:** Rapid concurrent saves/deletes can lose a newly saved item or resurrect a deleted one.
- **root cause:** saved-search read-modify-write has no queue, unlike History and Bookmarks.
- **affected paths/features:** Quick Search persistence.
- **smallest correct fix location:** saved-search mutation boundary in `src/libraryStore.ts`, using the existing small serial-queue pattern.
- **validation needed:** concurrent save/save, delete/delete and save/delete with deterministic delayed writes.
- **status:** open

## A-24 — Corrupt primary JSON does not recover from a valid backup

- **severity:** S2
- **symptom / user risk:** History, Quick Search or Preferences can remain unusable after primary corruption even when a valid `.bak` exists; Quick Search shows error plus normal empty state and Settings can retain a permanent spinner.
- **root cause:** backup recovery runs only when the primary is missing, not when read/parse validation fails; UIs conflate loading, error and empty states.
- **affected paths/features:** History/Continue, Quick Search, Preferences/Settings and old-version recovery.
- **smallest correct fix location:** shared validated file-store recovery, with UI retry/confirmed reset only when no valid backup exists.
- **validation needed:** corrupt primary + valid backup, both corrupt, missing primary + valid backup and any real previous-version fixture; never overwrite unrecovered originals without confirmation.
- **status:** open

## A-25 — Detail operation feedback is treated as a detail-load error

- **severity:** S2
- **symptom / user risk:** Successful Favorite/Bookmark/Download messages render in red and expose an unrelated “retry detail” action; operation failures also offer the wrong recovery.
- **root cause:** one `error` state stores detail-load errors, action errors and success notices.
- **affected paths/features:** Detail, Favorites, Bookmarks and Downloads.
- **smallest correct fix location:** split detail-load error from action notice/error in `GalleryDetailView`; only load failure may show detail retry.
- **validation needed:** success uses non-error styling; favorite/download failure offers relevant feedback; detail failure alone exposes retry.
- **status:** open

## A-26 — History and Quick Search single-item deletes lack confirmation

- **severity:** S2
- **symptom / user risk:** A narrow crowded row allows an irreversible local record/search deletion on one tap, inconsistent with existing clear/bookmark confirmations.
- **root cause:** single-item button actions call delete directly.
- **affected paths/features:** History and Quick Search.
- **smallest correct fix location:** the two existing UI actions, reusing the native confirmation pattern.
- **validation needed:** cancel performs no write; confirm removes only the selected item.
- **status:** open

## A-27 — Raw lower-layer errors can be shown directly in manual UI

- **severity:** S2
- **symptom / user risk:** A runtime fetch/FileManager error containing a complete URL, search query, token or private path can appear in the UI and screenshots even though diagnostics/AI paths are sanitized.
- **root cause:** `stageError` preserves underlying messages and multiple scenes directly render `error.message`; browser bridge status also carries raw error summaries.
- **affected paths/features:** Search, Detail, Account bridge/overview, Favorites and My Tags.
- **smallest correct fix location:** one shared user-safe error mapper at the network/storage boundary, retaining raw errors only for sanitized local diagnostics.
- **validation needed:** mocked URL/Cookie/private-path errors across success and failure paths must show safe stage/category text only.
- **status:** open

## A-28 — Fixed horizontal action groups are likely unusable on narrow iPhone widths

- **severity:** S2
- **symptom / user risk:** Several rows contain 3–6 long buttons or up to 12 tags with no adaptive wrapping, risking clipped labels and undersized tap targets on narrow screens or larger Dynamic Type.
- **root cause:** fixed `HStack` usage in advanced filters, Account, Detail, Reader, History, tags and Downloads.
- **affected paths/features:** Filter, Account, Detail, Reader, History and Downloads UI.
- **smallest correct fix location:** existing local layouts; split into rows/vertical groups or use the existing adaptive grid, without a design-system rewrite.
- **validation needed:** screenshots at 320/375/430 pt and one larger Dynamic Type size. Highest-priority evidence: Reader, History, Detail tags/actions and Downloads.
- **status:** open

# S3

## A-29 — Results error state retains prior count and paging links

- **severity:** S3
- **symptom / user risk:** A failed page request clears items but can leave the old result count and previous/next controls, allowing navigation with stale context.
- **root cause:** `ResultsView.load` failure clears only items.
- **affected paths/features:** Search/Filter/Results pagination.
- **smallest correct fix location:** Results failure state transition.
- **validation needed:** page 1 success with next, page 2 failure; no stale count/links, and retry targets the failed request explicitly.
- **status:** open

## A-30 — Wide iPad layouts lack a readable content-width constraint

- **severity:** S3
- **symptom / user risk:** Detail metadata, comments and management lists may stretch across the full landscape width, producing long lines and awkward key/value spacing.
- **root cause:** major content groups use `maxWidth: "infinity"` without a centered readable-width container.
- **affected paths/features:** iPad Detail and Library management screens.
- **smallest correct fix location:** root content containers only; retain the accepted navigation and adaptive preview grid.
- **validation needed:** iPad portrait/landscape and split-view screenshots before deciding whether a code change is warranted.
- **status:** open

## UI evidence still required

The code establishes credible narrow-width risk, but final layout decisions need runtime screenshots/recordings for:

- 320/375 pt Advanced Filter, Account, Detail action/tag groups, Reader controls, History rows and Download controls;
- larger Dynamic Type on the same high-density rows;
- iPad portrait/landscape/split view for Detail and Library;
- the visual state after successful Favorite/Bookmark/Download and after corrupt Preferences/Quick Search loads.

These evidence requests do not block recording the code-backed findings; they determine the smallest final UI patch.

## Final independent S1 review — 2026-08-26

- **result:** two additional S1 findings were fixed; no remaining known open S0/S1.
- **online image cache:** rejects non-image/empty/invalid-signature HTTP 200 responses and Reader retry replaces an old cached response.
- **favorite mutation:** verifies the post-mutation popup state before cache invalidation or UI success feedback.
- **validation:** deterministic regressions added for both findings; TypeScript diagnostics and full self-test remain green.
