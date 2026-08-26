# RELEASE_CHECKLIST — 1.0

## Release surface
- [x] Isolated DEV identifies itself as `1.0.0-rc`; stable local script untouched. Reconfirmed after correcting the stale `0.9.0-rc-dev` manifest. Reconfirmed in remote `src/script.json` after correcting the stale `0.9.0-rc-dev` manifest.
- [x] README is accurate, concise and contains no invented setup/feature claims.
- [x] `RELEASE_NOTES_1.0.md` summarizes verified capabilities and stabilization.
- [x] No stale 0.9 wording is present in normal user-facing release metadata; the isolated DEV name remains intentionally explicit.

## Code / runtime gates
- [x] TypeScript diagnostics: 0.
- [x] `runSelfTests.ts`: 53/53 pass.
- [x] `runActionSmoke.ts`: pass.
- [x] `runAssistantToolSmoke.ts`: pass.
- [x] `runNetworkSelfTest.ts`: pass.
- [x] Sensitive-artifact scanner: generated current release/source archive clean.
- [x] Any generated release/source archive: sensitive-artifact scan clean.
- [x] Real isolated DEV launch: no startup exception after fixing empty error component construction.
- [x] Concentrated online/offline/account/library/assistant walkthrough is covered by final smoke/runtime evidence and retained 0.9 focused walkthrough evidence.

## Stability gate
- [x] 0.9 independent final review completed.
- [x] Open S0: 0.
- [x] Open S1: 0.
- [x] A-28/A-30 explicitly evidence-deferred; no speculative UI rewrite.
- [x] Real-device Hotfix Pass: Safari Bridge root fallback and explicit capture gate fixed; download resume updates immediately; iPad landscape Detail width/metadata/tags corrected from runtime evidence.
- [x] Sync chain corrected: `bootstrapFromRemote.ts` and `readRemoteTask.ts` target `release/1.0`; bootstrap resolves one immutable remote head, writes `sync-manifest.json`, and the Account page displays the synced build marker.
- [ ] Re-run targeted iPad acceptance only after the local marker shows the current release/1.0 head.

## Privacy / release history
- [x] Current release tree/archive contains no runtime diagnostics or materialized secrets.
- [x] Historical sensitive `runtime/events` exposure remains reachable in prior pushed history, per the repository's phase record.
- [x] Recommendation recorded: rewrite history before broader distribution; until then keep history private and distribute only the clean release tree/archive.
- [x] No force-push/history rewrite was performed.

## Final promotion — intentionally blocked until explicit instruction
- [ ] User explicitly approves final 1.0 promotion.
- [ ] PR merge/integration strategy executed only after approval.
- [ ] Stable local `E-Hentai 浏览器` updated only after approval.
- [ ] Optional tag/GitHub Release created only if requested/supported.
