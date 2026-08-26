# DEV_PROGRESS — 1.0 Release Prep

Branch: `release/1.0`  
Base: accepted/frozen 0.9 RC head `765fe97d52d3f9f9ce709685d862048d28188351`

## Release-candidate status — 2026-08-26

Release surface is frozen at `1.0.0-rc` in the isolated `E-Hentai 浏览器 DEV` runtime. The local stable `E-Hentai 浏览器` has not been changed.

- Open S0: **0**
- Open S1: **0**
- Release blocker fixed during verification: Scripting's component builder cannot consume a function component returning `null`. `ErrorText` now always returns a node and all Gallery/Library callers conditionally create it only when an error exists. DEV startup subsequently stayed active for the full 25-second observation window with no exception output.

## Final Release Prep verification

- TypeScript project diagnostics: **0**.
- `src/runSelfTests.ts`: **53/53 passed**.
- `src/runActionSmoke.ts`: **passed**; search → Detail Core works and invalid opaque gallery references are rejected.
- `src/runAssistantToolSmoke.ts`: **passed**; typed search returns 20 summaries.
- `src/runNetworkSelfTest.ts`: **passed**; live Search → Detail Core → Image Page completed, plus all deterministic checks.
- `tools/scan_sensitive_artifacts.py --self-test`: **passed**.
- Generated `release/1.0` source archive: **0 sensitive-artifact findings** after archive member paths are normalized to repository-relative paths.
- Isolated DEV launch: **passed**; interactive process remained open through the 25-second observation window with no startup exception output.

## Concentrated walkthrough coverage

The final smoke/runtime chain covers the normal Home → Search/Filter → Results → Detail → Reader data path, safe invalid-reference handling, and typed assistant search. Existing 0.9 runtime evidence remains the focused walkthrough record for Favorites/local Bookmark, foreground download resume/retry/completion → Offline Reader → confirmed delete, Library/history/continue/quick search, Popular/Watched/Toplists/My Tags, and Account E/Ex/site switching plus maintenance. No feature or UI redesign was introduced during Release Prep.

## Historical privacy assessment

The current release tree/archive is clean. Repository task records confirm that older pushed history previously contained sensitive `runtime/events` gallery/page URLs and tokens; no destructive history operation was performed here.

**Recommendation: rewrite history before broader distribution.** Until an explicitly approved rewrite is planned and collaborators are coordinated, keep the repository history private and distribute only the clean current release tree/archive. Do not force-push, delete branches, merge PRs, tag a release, or overwrite the stable local script during this phase.

## Preserve

- A-28/A-30 remain post-1.0 evidence items.
- Remaining A-09 presentation semantics remain post-1.0 unless a concrete release blocker is reproduced.
- Accepted PLATFORM_GAP remains unchanged: reverse image upload, rating write, comment write.
- Release Prep completion does not authorize PR merge, history rewrite, tag/release publication, or stable-local-script overwrite.
