# RELEASE_CHECKLIST — 1.0

## Release surface
- [ ] Isolated DEV identifies itself as 1.0 release candidate; stable local script untouched.
- [ ] README is accurate, concise and contains no invented setup/feature claims.
- [ ] `RELEASE_NOTES_1.0.md` summarizes verified capabilities and stabilization.
- [ ] No stale 0.9/dev wording is misleading in the normal user-facing release surface.

## Code / runtime gates
- [ ] TypeScript diagnostics: 0.
- [ ] `runSelfTests.ts`: all checks pass.
- [ ] `runActionSmoke.ts`: pass.
- [ ] `runAssistantToolSmoke.ts`: pass.
- [ ] `runNetworkSelfTest.ts`: pass.
- [ ] Sensitive-artifact scanner: current tree clean.
- [ ] Any generated release/source archive: sensitive-artifact scan clean.
- [ ] Real isolated DEV launch: no startup exception.
- [ ] Concentrated online/offline/account/library/assistant walkthrough passes.

## Stability gate
- [x] 0.9 independent final review completed.
- [x] Open S0: 0.
- [x] Open S1: 0.
- [x] A-28/A-30 explicitly evidence-deferred; no speculative UI rewrite.
- [x] Accepted PLATFORM_GAP remains frozen.

## Privacy / release history
- [x] Current tree no longer contains committed runtime diagnostics.
- [ ] Verify whether historical sensitive `runtime/events` commits remain reachable.
- [ ] Record recommendation for wider distribution.
- [ ] No force-push/history rewrite without explicit user authorization.

## Final promotion — intentionally blocked until explicit instruction
- [ ] User explicitly approves final 1.0 promotion.
- [ ] PR merge/integration strategy executed only after approval.
- [ ] Stable local `E-Hentai 浏览器` updated only after approval.
- [ ] Optional tag/GitHub Release created only if requested/supported.
