# DEV_PROGRESS — 0.9 Stabilization

Base: accepted 0.8 head `61e826e3cff9dc87bc81d4d037c8390303a8a2ad`  
Branch: `feat/0.9-stabilization`

## Current phase

The first whole-repo stabilization audit is complete and recorded in `STABILIZATION_AUDIT.md`.

- Audited head: `3eb858dcbabf3f97d4e5eec431b0beb005d1b08d`
- Audit result: **S0 0 / S1 8 / S2 20 / S3 2**
- All findings remain `open`.
- No broad fix pass was started because the audit found no S0.

## Audit verification

- TypeScript diagnostics: 0 diagnostics.
- `src/runSelfTests.ts`: 29/29 passed.
- `src/runActionSmoke.ts`: passed.
- `src/runAssistantToolSmoke.ts`: passed.
- `src/runNetworkSelfTest.ts`: 30/30 passed, including live Search -> Detail Core -> Image Page.
- Current-tree privacy scan confirmed committed legacy runtime diagnostics containing complete gallery/page/image URLs; this is recorded as S1 A-01.

## Next consolidated fix batches

1. **S1 privacy + data integrity**
   - remove/ignore committed runtime diagnostics and assess history cleanup;
   - bound Safari bridge plaintext credential lifetime;
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
