# ARCHIVED — HISTORICAL AUDIT ONLY

This is the retained 0.9/1.0 root-cause history. It is **not** part of the normal Agent read order and must not trigger a new whole-repository audit, regression campaign, screenshot request, or acceptance pass.

Use it only when the user explicitly asks about an old finding, or when a new bug clearly points back to one of these historical root causes. The active rules are `AGENTS.md` and `CURRENT_TASK.md`.

# STABILIZATION_AUDIT — 0.9 Whole-Repo Audit and S2 Consolidation

Branch: `feat/0.9-stabilization`  
DEV target: isolated `E-Hentai 浏览器 DEV` (`0.9.0-rc-dev`)  
Audit opened: 2026-08-24 · status consolidated: 2026-08-26

## Authoritative historical status

The detailed findings below are retained as the original root-cause record. They describe past work only.

- **S0:** A-01, A-02 — **fixed**.
- **S1:** A-03 through A-08 — **fixed**. Final independent review additionally fixed online image-cache payload poisoning, unconfirmed Favorite mutations, and preview-inventory gate bypasses. **No known open S0/S1 remained at that historical checkpoint.**
- **S2 fixed:** A-10 through A-27, except A-28; A-09 was partially resolved as noted below.
- **S3 fixed:** A-29.
- **Historical evidence-deferred:** A-28 and A-30.

## Consolidated fixes and evidence

| Finding | Status | Root-cause fix / validation |
|---|---|---|
| A-01 | fixed | Runtime artifacts removed, ignored and deterministically scanned. |
| A-02 | fixed | Shared Safari bridge credential cleanup covers terminal import failures and logout. |
| A-03 | fixed | Download capacity rejects the 31st task; manifest no longer silently detaches data. |
| A-04 | fixed | Delete waits for active workers and recovers transactional `.deleting` state. |
| A-05 | fixed | Reader/download require a complete preview inventory; incomplete inventory is retryable, and every preview-thumbnail Reader entrance is disabled until this invariant holds. |
| A-06 | fixed | Search entries use real row/container boundaries. |
| A-07 | fixed | Per-image timeout plus Content-Type and JPEG/PNG/WebP payload validation. |
| A-08 | fixed | Account lifecycle and server-confirmed Favorite mutation invalidate gallery caches. |
| A-09 | deferred-post-1.0 (partial) | Expired auth Cookies are excluded consistently from status and request headers. Stored credential presence is still intentionally separate from a failed/transient network probe. |
| A-10 | fixed | Opaque `galleryRef` is session-generation-bound and expires on logout/site change. |
| A-11 | fixed | Account changes return to Home and trigger a fresh load. |
| A-12 | fixed | Account overview uses an epoch and site-aware dependencies. |
| A-13 | fixed | Home, Favorites and Discovery ignore stale request completions. |
| A-14 | fixed | Dedicated Toplists parser preserves each Gallery Toplist identity and rank; Discovery renders both. |
| A-15 | fixed | Discovery preserves Watched previous/next navigation. |
| A-16 | fixed | `.glink`/`.glname` title extraction precedes broad anchor text. |
| A-17 | fixed | Detail relations inspect labeled rows before anchor fallback. |
| A-18 | fixed | Relation summaries reconstruct gid/token from the relation URL. |
| A-19 | fixed | Online Reader writes progress only from successful cached-image callbacks; continuous Reader commits successful individual pages. |
| A-20 | fixed | Persisted orphan `downloading` state normalizes to resumable state on load. |
| Final review — download creation | fixed | `createDownload()` enforces complete preview inventory at the storage boundary and rejects a partial second detail load. |
| A-21 | fixed | Offline open reconciles the manifest with final files and returns to resume flow when incomplete. |
| A-22 | fixed | Offline Reader shares reading-progress updates only for a present local file. |
| A-23 | fixed | Saved-search mutations use the existing small serialized write queue. |
| A-24 | fixed | Valid `.bak` recovers malformed/missing primary History, Quick Search and Preferences storage. |
| A-25 | fixed | Detail load error, action error and success notice are independent UI states. |
| A-26 | fixed | Single History and Quick Search deletions use native confirmation. |
| A-27 | fixed | Shared user-safe error mapping avoids propagating raw URL/Cookie/path text into UI. |
| A-28 | historical deferred | Narrow iPhone / larger Dynamic Type evidence was not available at that checkpoint. |
| A-29 | fixed | Results failure clears stale result count and paging controls. |
| A-30 | historical deferred then addressed | Later iPad evidence led to the retained readable-width/detail layout fix. |

## Historical regression coverage

The deterministic suite at that checkpoint covered parser/store/security boundaries including expired cookies, session-bound gallery references, title isolation, relation identity, Toplist rank preservation, image payload validation, Favorite confirmation, complete-preview inventory gates, Reader progress, download recovery, saved-search serialization, backup recovery, and safe error mapping.

This section is evidence about past work, **not an instruction to rerun the suite**.

## Current handling of related bugs

If the user now reports a symptom related to one of these findings, treat the user's real-device report as current truth. Inspect the present code, fix the root cause, run only the focused check needed for that change, commit, and hand it back for user testing. Do not reopen the whole historical audit unless the user explicitly requests it.
