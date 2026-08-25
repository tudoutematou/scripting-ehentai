# DEV_PROGRESS — 0.9 Stabilization

Base: accepted 0.8 head `61e826e3cff9dc87bc81d4d037c8390303a8a2ad`  
Branch: `feat/0.9-stabilization`

## Current phase

Batch 0 / S0 is complete. The audit triage correction is recorded in `STABILIZATION_AUDIT.md`; A-01 and A-02 are fixed, and no S1/S2 work was started.

- Batch 0 baseline: `455d1da49ccf39c5d06762aa3cd5dcb23126fdeb`
- Effective audit result: **S0 2 / S1 6 / S2 20 / S3 2**
- Fixed in this batch: **A-01, A-02**
- Remaining findings: all A-03 and later findings remain `open`.

## Batch 0 fixes

- **A-01 diagnostics privacy:** removed the full current-tree `runtime/` directory (134 event files plus `latest.json`), added root `/runtime/` ignore, and added the dependency-free deterministic `tools/scan_sensitive_artifacts.py` gate. The current tree reports 0 findings for materialized gallery/page URLs, signed parameters, Cookie values, search-query URLs, private iOS paths and runtime artifacts.
- **History boundary:** deleting the current tree does not remove sensitive diagnostics from previously pushed Git history. Batch 0 did not rewrite history; release handling must assess it separately.
- **A-02 Safari bridge credentials:** added one all-candidate plaintext `login.json` cleanup in `src/account.ts`; malformed, expired, incomplete, Keychain write/round-trip failures and success all consume the capture. `signOut()` is async, independently removes both Keychain items and every candidate login file, and the UI awaits it before refreshing account state. No recoverable plaintext failure is retained.

## Batch 0 verification

- TypeScript diagnostics using `src/tsconfig.test.json`: 0 diagnostics.
- `src/runSelfTests.ts`: **33/33 passed**, including 4 new bridge lifecycle checks.
- `src/runActionSmoke.ts`: passed.
- `src/runAssistantToolSmoke.ts`: passed.
- Sensitive-artifact current-tree scan: **0 findings**.
- Synthetic scanner regression: complete gallery URL fixture was rejected deterministically.
- Tests use in-memory FileManager/Keychain fixtures only; no real credentials or cloud writes.

## Next consolidated fix batches

1. **S1 data integrity**
   - stop silent download-manifest truncation;
   - make active-delete and `.deleting` recovery quiescent/recoverable.
2. **S1 Reader/download/parser/account reliability**
   - preserve complete preview inventory before Reader/download completion;
   - validate/time-bound image downloads;
   - isolate all supported list layouts;
   - invalidate account-sensitive caches on session/favorite changes.
3. **S2 state, storage and product consistency**
   - account/site and request-generation consistency;
   - Watched/Toplists and relation identity;
   - Reader/offline progress and restart reconciliation;
   - Quick Search/file backup recovery and user-safe error states.
4. **Evidence-based UI pass**
   - obtain narrow-iPhone/Dynamic Type and iPad screenshots for the specific groups listed in the audit;
   - apply only bounded native-layout fixes supported by runtime evidence.

## Required workflow remaining

1. Consolidated root-cause fix passes by severity.
2. Full DEV regression + `0.9.0-rc-dev` runtime walkthrough.
3. Fresh independent high-reasoning final review.
4. Freeze 0.9 only when no open S0/S1 remains.

## Starting baseline retained

- 0.8 UI/UX A–H accepted.
- Stable local `E-Hentai 浏览器` remains untouched.
- Runtime target remains isolated `E-Hentai 浏览器 DEV`.

## Accepted PLATFORM_GAP — do not reopen

- Reverse image search upload/multipart path unverified.
- Rating submission authenticated API/form path unverified.
- Comment post/edit action + CSRF/edit-ownership path unverified.
