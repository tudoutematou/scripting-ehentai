# CURRENT_TASK — 1.0 First Stable Release

Branch: `release/1.0`
Base: accepted/frozen 0.9 RC head `765fe97d52d3f9f9ce709685d862048d28188351`
Source RC: `feat/0.9-stabilization`

Read `AGENTS.md`, `STABILIZATION_AUDIT.md`, `DEV_PROGRESS.md`, and `RELEASE_CHECKLIST.md` first.

## Goal
Turn the accepted 0.9 RC into the first stable 1.0 release **without reopening feature development or another broad bug-hunt cycle**.

1.0 means the defined Scripting baseline is complete and release-quality; it does **not** mean 100% Android EhViewer parity.

## Release rules
- Feature scope is frozen.
- Do not reopen reverse image upload, rating submission, comment writes, Android background services, or other accepted PLATFORM_GAP / low-value items.
- Do not redesign the accepted 0.8 UI hierarchy.
- Do not perform speculative parser/network/store refactors.
- Fix only a reproducible release blocker introduced/exposed during release verification: startup, privacy/security, data loss/destructive write, S1 core reliability, or a bounded packaging/versioning defect.
- A-28 (narrow/Dynamic Type) and A-30 (iPad readable width) remain evidence-deferred post-1.0; do not guess layout changes without runtime screenshots.
- A-09's remaining stored-credential vs server-validated-session presentation distinction stays post-1.0 unless a concrete release-breaking state is reproduced.

## Runtime safety
- Stable local `E-Hentai 浏览器` must remain untouched during Release Prep.
- Reuse isolated `E-Hentai 浏览器 DEV` for final release-candidate verification, with a clear `1.0.0-rc`/release-candidate marker.
- Do not overwrite/promote the stable script until an explicit final promotion step after Release Prep is accepted.
- Use the persistent Scripting GitHub context and normal `read_contents` / `write_contents`; do not request PR/Issue permissions for project instructions.

# Phase 1 — Release surface cleanup

Inspect only release-facing metadata and packaging surfaces. Keep code logic frozen unless a blocker is found.

## Required
1. Update user-facing version/description markers from `0.9.0-rc-dev` to an appropriate `1.0.0-rc` marker in the isolated DEV runtime. Do not rename/overwrite the stable script yet.
2. Remove stale development-facing wording that would be misleading in a 1.0 release, but keep diagnostics/dev-only tooling clearly separated from normal UI.
3. Expand the currently minimal `README.md` into a concise verified 1.0 project README covering:
   - what the Scripting app/script does;
   - major supported capability families;
   - E-Hentai/ExHentai/account expectation at a high level;
   - offline/download model truthfully described as foreground resumable, not unrestricted background downloading;
   - accepted PLATFORM_GAP/non-goals;
   - privacy note: credentials remain in Scripting Keychain boundaries and sensitive runtime diagnostics are not committed;
   - no invented install/update process if not verified.
4. Create/update concise `RELEASE_NOTES_1.0.md` summarizing meaningful 0.3→1.0 capability growth and 0.9 stabilization, not every commit.
5. Keep `tools/scan_sensitive_artifacts.py` as a release gate.

# Phase 2 — Release verification

Run only one final release verification cycle against the exact `release/1.0` head after release-surface edits.

Required:
- TypeScript diagnostics: 0;
- `src/runSelfTests.ts` all green;
- `src/runActionSmoke.ts` green;
- `src/runAssistantToolSmoke.ts` green;
- `src/runNetworkSelfTest.ts` green;
- `tools/scan_sensitive_artifacts.py` clean on the current tree and any generated source archive/package;
- real isolated DEV launch with no startup exception;
- one concise walkthrough of:
  1. Home -> Search/Filter -> Results -> Detail -> Reader;
  2. Favorite/local Bookmark;
  3. foreground Download -> resume/retry -> complete -> Offline Reader -> confirmed delete;
  4. Library/History/Continue Reading/Quick Search;
  5. Popular/Watched/Toplists/My Tags;
  6. Account/E vs Ex/site switch and Settings/maintenance;
  7. typed assistant action smoke without exposing sensitive identifiers.

Do not repeat a broad exploratory audit. 0.9 already supplied that evidence.

# Phase 3 — Historical privacy decision (assessment only)

The current tree is clean, but old pushed Git history previously contained `runtime/events` with sensitive gallery/page URLs/tokens.

During Release Prep:
- verify and document whether those commits remain reachable in repository history;
- assess impact given the repository's current visibility and intended 1.0 distribution model;
- produce a short recommendation: `rewrite history before broader distribution` or `keep private history and distribute only clean release tree/archive`;
- **do not rewrite history, force-push, delete branches, or invalidate collaborator clones automatically.** History rewrite is destructive and requires an explicit separate user instruction.

This historical issue does not permit reintroducing runtime diagnostics into the current tree.

# Phase 4 — 1.0 release candidate freeze

When Release Prep is green:
- update `DEV_PROGRESS.md` with exact release-candidate head, tests, runtime walkthrough and sensitive-artifact scan;
- update `RELEASE_CHECKLIST.md`;
- keep the branch frozen;
- report any release blocker and the historical-privacy recommendation;
- stop before merge, tag/release creation, or stable-local-script overwrite.

## Final promotion boundary
The final promotion step may include, only after explicit instruction:
- merge/retargeting decisions;
- stable branch/main integration;
- optional tag/release creation if supported/requested;
- replacing/updating local stable `E-Hentai 浏览器` from the accepted 1.0 release tree.

Never merge a PR or overwrite the stable script merely because Release Prep completed.

## Completion criteria for Release Prep
1. 1.0 release metadata/docs are coherent and truthful.
2. No open S0/S1 exists.
3. Full release verification is green.
4. Current release tree/archive passes sensitive-artifact scanning.
5. Stable local script remains untouched.
6. Historical privacy exposure is assessed with a recommendation, not destructively rewritten.
7. Exact release-candidate head is frozen and ready for the user's final promotion instruction.
