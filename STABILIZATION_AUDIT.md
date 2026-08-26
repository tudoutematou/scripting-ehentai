# STABILIZATION_AUDIT — 0.9 Whole-Repo Audit and S2 Consolidation

Branch: `feat/0.9-stabilization`  
DEV target: isolated `E-Hentai 浏览器 DEV` (`0.9.0-rc-dev`)  
Audit opened: 2026-08-24 · status consolidated: 2026-08-26

## Authoritative status

The detailed findings below are retained as the original root-cause record. This section is authoritative for their current status; it replaces the stale inline `open` markers from the first audit.

- **S0:** A-01, A-02 — **fixed**.
- **S1:** A-03 through A-08 — **fixed**. Final independent review additionally fixed online image-cache payload poisoning and unconfirmed Favorite mutations. **No known open S0/S1 remains.**
- **S2 fixed:** A-10 through A-27, except A-28; A-09 is partially resolved as noted below.
- **S3 fixed:** A-29.
- **Evidence-deferred:** A-28 and A-30 — `deferred-post-1.0`; no speculative layout rewrite was made without required device evidence.

## Consolidated fixes and evidence

| Finding | Status | Root-cause fix / validation |
|---|---|---|
| A-01 | fixed | Runtime artifacts removed, ignored and deterministically scanned. |
| A-02 | fixed | Shared Safari bridge credential cleanup covers terminal import failures and logout. |
| A-03 | fixed | Download capacity rejects the 31st task; manifest no longer silently detaches data. |
| A-04 | fixed | Delete waits for active workers and recovers transactional `.deleting` state. |
| A-05 | fixed | Reader/download require a complete preview inventory; incomplete inventory is retryable. |
| A-06 | fixed | Search entries use real row/container boundaries. |
| A-07 | fixed | Per-image timeout plus Content-Type and JPEG/PNG/WebP payload validation. |
| A-08 | fixed | Account lifecycle and server-confirmed Favorite mutation invalidate gallery caches. |
| A-09 | deferred-post-1.0 (partial) | Expired auth Cookies are excluded consistently from status and request headers. Stored credential presence is still intentionally separate from a failed/transient network probe; the requested explicit server-validated-session UI state needs product-level semantics/evidence. |
| A-10 | fixed | Opaque `galleryRef` is session-generation-bound and expires on logout/site change. |
| A-11 | fixed | Account changes return to Home and trigger a fresh load. |
| A-12 | fixed | Account overview uses an epoch and site-aware dependencies. |
| A-13 | fixed | Home, Favorites and Discovery ignore stale request completions. |
| A-14 | fixed | Dedicated Toplists parser preserves each Gallery Toplist identity (including its All-Time/Past-* range) and rank; Discovery renders both. Non-gallery leaderboard content remains explicitly unsupported/hidden. |
| A-15 | fixed | Discovery preserves Watched previous/next navigation. |
| A-16 | fixed | `.glink`/`.glname` title extraction precedes broad anchor text. |
| A-17 | fixed | Detail relations inspect labeled rows before anchor fallback. |
| A-18 | fixed | Relation summaries reconstruct gid/token from the relation URL. |
| A-19 | fixed | Online Reader writes progress only from successful cached-image callbacks; continuous Reader commits successful individual pages. |
| A-20 | fixed | Persisted orphan `downloading` state normalizes to resumable state on load. |
| A-21 | fixed | Offline open reconciles the manifest with final files and returns to resume flow when incomplete. |
| A-22 | fixed | Offline Reader shares reading-progress updates only for a present local file. |
| A-23 | fixed | Saved-search mutations use the existing small serialized write queue. |
| A-24 | fixed | Valid `.bak` recovers malformed/missing primary History, Quick Search and Preferences storage. |
| A-25 | fixed | Detail load error, action error and success notice are independent UI states. |
| A-26 | fixed | Single History and Quick Search deletions use native confirmation. |
| A-27 | fixed | Shared user-safe error mapping avoids propagating raw URL/Cookie/path text into UI. |
| A-28 | deferred-post-1.0 | Requires 320/375/430pt and larger Dynamic Type runtime screenshots before any local adaptive-layout patch. |
| A-29 | fixed | Results failure clears stale result count and paging controls. |
| A-30 | deferred-post-1.0 | Requires iPad portrait/landscape/split-view screenshots before deciding whether a readable-width constraint is necessary. |

## Regression coverage

The deterministic suite covers each parser/store/security boundary amenable to fixture testing, including expired cookies, session-bound gallery references, title isolation, relation identity, Toplist list/rank preservation, image payload validation, Favorite confirmation, preview inventory, download capacity/delete/restart/reconciliation, serialized saved searches, backup recovery, and safe error mapping. UI lifecycle changes retain focused code-path verification plus the full runtime smoke chain.

## Final independent S1 review

- **Result:** no remaining known open S0/S1.
- **Additional fixes:** cache rejects non-image/empty/invalid-signature HTTP 200 responses; Reader retry replaces the old cached response; Favorite UI success follows popup-state confirmation.

## UI evidence boundary

A-28/A-30 stay deferred rather than claimed fixed. Required future evidence: narrow iPhone and larger Dynamic Type for high-density action rows, and iPad portrait/landscape/split view for Detail and Library. This does not block the code-backed S0/S1 and practical S2 consolidation above.
