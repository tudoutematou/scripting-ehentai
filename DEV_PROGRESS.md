# DEV_PROGRESS — 0.9 Stabilization

Base: accepted 0.8 head `61e826e3cff9dc87bc81d4d037c8390303a8a2ad`  
Branch: `feat/0.9-stabilization`

## Current phase

S1 stabilization batches are complete on the current release-candidate source head. A-01 through A-08 are fixed; S2/S3 findings remain deferred for their explicitly scoped follow-up phase.

- Effective audit result: **S0 2 / S1 6 / S2 20 / S3 2**
- Fixed in 0.9 batches: **A-01–A-08**
- DEV runtime target: isolated `E-Hentai 浏览器 DEV`, manifest `0.9.0-rc-dev`. Stable local `E-Hentai 浏览器` remains untouched.

## S1 completion

- **A-03:** download manifest writer no longer truncates; creation rejects the 31st task.
- **A-04:** active delete awaits the worker and recovers interrupted `.deleting` transaction states.
- **A-05:** Reader/offline creation waits for complete preview inventory; failures/truncation are preserved and retryable.
- **A-06:** supported list layouts use per-item parser boundaries.
- **A-07:** image requests are individually time-bounded and verify image payload signatures before atomic commit.
- **A-08:** site/session and favorite changes invalidate account-sensitive detail/preview caches.

## Consolidated verification

- TypeScript diagnostics using `src/tsconfig.test.json`: **0 diagnostics**.
- `src/runSelfTests.ts`: **39/39 passed**, including six focused S1 regression checks.
- `src/runActionSmoke.ts`: passed.
- `src/runAssistantToolSmoke.ts`: passed.
- `src/runNetworkSelfTest.ts`: **40/40 passed**, including live Search -> Detail Core -> Image Page.
- DEV launch invoked for `E-Hentai 浏览器 DEV`; it remained active for the CLI observation window without startup exception output.

## Remaining / frozen scope

- S2 and S3 findings recorded in `STABILIZATION_AUDIT.md` are not started in this S1-only pass.
- Accepted PLATFORM_GAP remains frozen: reverse image upload/multipart, rating submission, and comment post/edit authenticated paths.
- Before 1.0 promotion, perform the mandated fresh independent final review and the full interactive DEV walkthrough; do not overwrite the stable script or merge without explicit instruction.
