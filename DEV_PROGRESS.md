# DEV_PROGRESS — 1.0 Release Prep

Branch: `release/1.0`  
Base: accepted/frozen 0.9 RC head `765fe97d52d3f9f9ce709685d862048d28188351`

## Current phase

1.0 Release Prep started. Feature scope and the 0.9 stabilization result remain frozen.

- Open S0: **0**
- Open S1: **0**
- Starting RC evidence inherited from 0.9:
  - TypeScript diagnostics: 0;
  - self-tests: all 55 executed checks passed;
  - action/assistant/network smoke: passed;
  - isolated DEV launch: no startup exception during observation window.

## Release Prep work remaining

1. Release-facing metadata/version cleanup in isolated DEV only.
2. Verified concise README + `RELEASE_NOTES_1.0.md`.
3. One final release verification cycle and sensitive-artifact scan.
4. Historical `runtime/events` exposure assessment and recommendation only — no history rewrite/force-push without explicit instruction.
5. Freeze exact 1.0 release-candidate head and stop before merge/promotion.

## Preserve

- Stable local `E-Hentai 浏览器` remains untouched during Release Prep.
- A-28/A-30 remain post-1.0 evidence items.
- Remaining A-09 presentation semantics remain post-1.0 unless a concrete release blocker is reproduced.
- Accepted PLATFORM_GAP remains unchanged: reverse image upload, rating write, comment write.

## Promotion boundary

Release Prep completion does not authorize PR merge, Git history rewrite, tag/release publication, or stable-local-script overwrite. Those require the user's explicit final promotion instruction.
