# CURRENT_TASK — 0.9 Stabilization / Release Candidate Hardening

Branch: `feat/0.9-stabilization`
Base: accepted 0.8 head `61e826e3cff9dc87bc81d4d037c8390303a8a2ad`
Target after acceptance: 1.0 release candidate preparation.

Read `AGENTS.md` first. This is the **single consolidated stabilization phase** promised by the previous roadmap. Feature scope and the 0.8 information architecture are frozen.

## Goal
Find real defects across the complete daily-use product, fix them by root cause in consolidated passes, perform only evidence-based UI polish, then leave one clean DEV release candidate for 1.0.

This is not another feature milestone. Do not reopen accepted PLATFORM_GAP items or invent replacement functionality.

## Model strategy
Use model capability where it has leverage rather than for every edit:

1. **Audit pass:** prefer the strongest reasoning/code-review model available. It should trace cross-file state, persistence, async/race/error paths, security/privacy boundaries and end-to-end UI wiring before proposing fixes.
2. **Fix pass:** routine, well-scoped fixes may be implemented by the normal coding model. Keep each fix root-cause based and tested.
3. **Final independent review:** use the strongest reasoning model again, preferably in a fresh conversation, to review the post-fix branch rather than merely validating its own earlier assumptions.
4. **UI polish:** a stronger multimodal/reasoning model is useful for screenshots/recordings, hierarchy, narrow/iPad layouts and inconsistent states. Do not use it to redesign already-good screens without concrete evidence.

Repository state, tests and real DEV runtime behavior remain authoritative regardless of model.

## Runtime / context rules
- Never overwrite stable local `E-Hentai 浏览器` during 0.9.
- Continue with isolated `E-Hentai 浏览器 DEV`, marked as `0.9.0-rc-dev` only when the stabilization work is near completion.
- Use Scripting native GitHub API / built-in integration. Never request PAT, SSH key or local-git authentication.
- If the conversation becomes large: finish current tool calls and logical fix batch, run focused checks, commit/push, update `DEV_PROGRESS.md`, then stop and resume from GitHub in a fresh session. Do not rely on automatic context compression.

## Preserve
Do not intentionally remove or weaken accepted behavior from 0.8:
- Home/Search/Filter/Results/Detail/Reader/Account;
- E-Hentai and ExHentai routing/account state;
- Popular/Watched/Toplists/My Tags/external destinations;
- cloud Favorites + note;
- local Bookmarks;
- History / Continue Reading / Quick Search;
- foreground resumable Downloads + true offline Reader;
- single + bounded continuous Reader + retry/original behavior;
- uploader/parent/version/tag/category navigation;
- advanced search;
- safe local storage and manifest recovery;
- bounded image/network work;
- sanitized diagnostics;
- opaque short-lived `galleryRef` AI boundary.

Accepted PLATFORM_GAP stays frozen:
- reverse image search upload/multipart path unverified;
- rating submission authenticated API/form path unverified;
- comment post/edit action + CSRF/edit-ownership path unverified.

# Phase 1 — One broad audit, no piecemeal review loop

Perform one deliberate whole-product audit before large-scale fixing. Inspect the current branch, current tests and real runtime paths. Create/update a compact `STABILIZATION_AUDIT.md` containing only actionable findings.

For every finding record:
- severity: `S0`, `S1`, `S2`, or `S3`;
- user-visible symptom/risk;
- root cause / shared path;
- affected feature families;
- smallest correct fix location;
- validation needed.

Severity:
- `S0`: privacy/security/data loss/destructive wrong write/startup corruption. Fix immediately.
- `S1`: core daily-use path broken, major state corruption, repeatable crash/hang, offline/download/reader/favorite/account function fundamentally unreliable. Must fix before 1.0.
- `S2`: meaningful usability/reliability issue with a reasonable root-cause fix. Fix in consolidated 0.9 passes when practical.
- `S3`: cosmetic/niche/low-risk edge case. Fix only if nearly free; otherwise record for post-1.0.

Do not stop after discovering the first few bugs. Complete the broad audit first unless an S0 is found.

## Audit areas

### A. Startup / navigation / state lifecycle
- launch/exit behavior;
- stale async results after navigation/state changes;
- duplicate requests/races;
- empty/error/retry state transitions;
- Home -> Results -> Detail -> Reader and back navigation;
- repeated opening/closing of scenes.

### B. Account / E vs Ex / authentication
- site switching and account refresh;
- Cookie/keychain boundaries;
- Ex availability versus logged-in state;
- logout/relogin state invalidation;
- account overview failure handling;
- ensure no sensitive diagnostic leakage.

### C. Search / list / parsing
- Home/Popular/Watched/Toplists/Favorites search/list paging;
- category, quick filters and advanced parameters;
- uploader/tag/category navigation;
- empty pages and malformed/missing optional fields;
- parser assumptions that can break normal galleries.

Do not broadly rewrite parsers. Fix demonstrated/shared assumptions only.

### D. Detail / Favorites / Bookmarks
- Core-first detail load and background preview completion;
- favorite category/note read/edit/remove state;
- local bookmark identity across E/Ex;
- parent/version/resource buttons only when valid;
- repeated mutation/reload state consistency;
- confirmations preserved.

### E. Reader
- saved progress bounds;
- single and continuous layouts;
- page jump / previous / next;
- retry failures without unintended progress changes;
- original image preference;
- preload/cache limits;
- network reader versus offline reader parity;
- galleries with incomplete preview/page-link knowledge.

### F. Downloads / offline / filesystem safety
High priority.
- restart recovery;
- concurrent queue state and manifest serialization;
- pause/continue/retry/stop/delete;
- partial/failed/completed state accuracy;
- atomic `.tmp -> final` behavior;
- deletion rollback if manifest/storage write fails;
- filename/path validation and traversal resistance;
- true offline opening without hidden network dependency;
- cache clear must never delete unrelated/offline user files.

### G. History / Quick Search / local persistence
- malformed/old version storage;
- duplicate identity and ordering;
- delete/clear confirmations;
- reading progress/history consistency;
- corrupted JSON or partial write recovery where current architecture supports it.

### H. Typed AI / diagnostics privacy
- `galleryRef` remains opaque/short-lived;
- AI tools cannot expose gid/token/full URL/private local path/Cookie/api credentials;
- no destructive/cloud write surface added through AI;
- diagnostics remain sanitized in both success and failure paths.

### I. UI/UX release polish
0.8 hierarchy is the baseline; optimize, do not redesign.

Look for actual problems such as:
- important actions clipped or crowded on narrow iPhone width;
- wasteful or awkward layout on iPad;
- confusing primary/secondary/destructive hierarchy;
- inconsistent Chinese terminology;
- repeated buttons/sections created by state conditions;
- unreadable progress/status/error copy;
- tap targets or controls that become unusable with long titles/metadata;
- offline and online Reader presenting contradictory controls;
- stale DEV/developer wording visible to normal users.

Prefer small native-layout edits. No new theme/design system, custom TabBar/sidebar, gesture/animation engine or dependency.

# Phase 2 — Consolidated root-cause fix passes

After the audit, fix findings in severity/order groups rather than reopening review after each individual bug:

1. S0/S1 safety + core reliability;
2. download/offline/reader/storage correctness;
3. account/network/parser shared reliability;
4. S2 UI/UX and state-consistency fixes;
5. nearly-free S3 cleanup only if it does not increase risk.

Rules:
- trace all callers before editing a shared function;
- fix once at the common boundary where possible;
- no speculative refactor;
- no architecture migration merely because code is untidy;
- delete dead/duplicate code only when its deadness is proven and removal reduces risk;
- each non-trivial root-cause fix needs the smallest deterministic regression check that would fail before the fix;
- do not create a giant new testing framework.

Commit by logical fix batch and keep `STABILIZATION_AUDIT.md` status current (`open` / `fixed` / `deferred-post-1.0`).

# Phase 3 — Real DEV regression

After fixes:
- sync current branch to `E-Hentai 浏览器 DEV`;
- mark manifest/version clearly as `0.9.0-rc-dev`;
- run TypeScript diagnostics;
- run the full existing harness:
  - `src/runSelfTests.ts`;
  - `src/runActionSmoke.ts`;
  - `src/runAssistantToolSmoke.ts`;
  - `src/runNetworkSelfTest.ts`;
- run any focused regression checks added for 0.9.

Perform one concentrated real-runtime walkthrough:
1. launch -> Home -> search/filter -> Results -> Detail -> Reader;
2. Popular/Watched/Toplists/My Tags;
3. Favorite category/note + local Bookmark;
4. Download -> stop/pause -> continue/retry -> complete -> offline Reader -> confirmed delete;
5. History / Continue Reading / Quick Search;
6. E/Ex/account state and My Home overview;
7. settings/cache/data maintenance;
8. narrow-width and iPad-width UI sanity where practical.

Do not perform unsafe account/economic/admin actions.

# Phase 4 — Independent final review

After the fix branch is green, start a **fresh high-reasoning review session** against the final remote head.

The reviewer should:
- read `STABILIZATION_AUDIT.md` and inspect the final code paths changed by 0.9;
- look specifically for missed S0/S1 regressions, incorrect root-cause fixes and privacy/storage mistakes;
- sample untouched high-risk paths (downloads/offline/account/reader) rather than re-reviewing every cosmetic line;
- verify tests actually cover the bug classes they claim;
- perform a final UI consistency sanity check from runtime evidence/screenshots if available.

This is one final review, not an endless review/fix cycle. Any new S0/S1 must be fixed. New S2 should be fixed only when clearly high-impact and bounded. New S3 is deferred post-1.0.

# Non-goals
- no 0.10 feature scope;
- no new feature family;
- no reopening accepted PLATFORM_GAP;
- no broad parser/network/store rewrite;
- no new dependency for cleanup;
- no speculative performance optimization without observed issue;
- no pixel-perfect EhViewer Android clone;
- no large UI redesign after accepted 0.8 hierarchy;
- do not touch stable local `E-Hentai 浏览器` until explicit release/promotion instruction.

# Completion / 1.0 gate
0.9 is complete only when:
1. one broad audit is recorded;
2. all S0 and S1 findings are fixed;
3. practical high-impact S2 findings are resolved or explicitly justified/deferred;
4. full harness + 0.9 regression checks are green;
5. real DEV walkthrough passes;
6. independent final review has no open S0/S1;
7. no privacy/data-loss/destructive-write/startup blocker is known;
8. `DEV_PROGRESS.md` records the release-candidate head and remaining post-1.0 S2/S3 items.

Then freeze 0.9 and report. Do **not** promote/overwrite the stable local script or merge PRs until the user explicitly starts the 1.0 release step.
