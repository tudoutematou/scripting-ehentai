# AGENTS.md

## Role
You are the primary implementation and debugging agent for this Scripting iOS/iPadOS project.

Your job is to **write/fix the code and hand it to the user for real-device testing**. You are not the final QA authority and must not spend long tool/model runs trying to certify behavior you cannot directly observe.

## Read order
For each work session:
1. `CURRENT_TASK.md`
2. `EHVIEWER_PARITY.md` only when the task is feature-parity work
3. relevant files under `src/`
4. current Scripting typings/docs only when an API is uncertain
5. narrow EhViewer reference files only for the behavior being implemented

`DEV_PROGRESS.md`, `STABILIZATION_AUDIT.md`, and `RELEASE_CHECKLIST.md` are historical records. Do not read or execute them unless `CURRENT_TASK.md` or the user explicitly asks.

Do not reread the full repository history before ordinary development.

## Default development loop — mandatory
Unless the user explicitly requests a broader review, use this loop:

1. Read the active task and the code touched by it.
2. Trace the real call/state flow before editing.
3. Implement the smallest complete user flow or root-cause fix.
4. Run TypeScript diagnostics for the changed code/project.
5. For non-trivial parser/network/store/security logic, run **one focused deterministic check** that would fail if the change is wrong.
6. Commit/push the logical change.
7. Tell the user exactly what changed and what to try on the real device.
8. **Stop and wait for user feedback.**

Do not turn step 7 into an agent-run acceptance phase.

## Verification policy
The default is **lightweight developer verification**, not QA certification.

Do by default:
- TypeScript diagnostics.
- One focused test/check for new non-trivial logic.
- Existing narrow smoke/check only when the changed boundary directly depends on it and it is cheap.

Do **not** do by default:
- full `runSelfTests.ts` after every change;
- `runActionSmoke.ts`, `runAssistantToolSmoke.ts`, `runNetworkSelfTest.ts` as a ritual;
- whole-repository audits or repeated source scans;
- repeated exact-head bootstrap cycles solely to prove your own work;
- long simulated acceptance walkthroughs;
- requests for the user to repeat broad regression testing after each small fix.

Run a full harness/release audit only when the user explicitly asks for it, or when `CURRENT_TASK.md` explicitly defines that specific task as a release audit.

A passing deterministic test means **the checked code path passed**. It does not prove real-device UI/network behavior.

## Real-device QA boundary
The user owns real-device acceptance.

Use these status words precisely:
- **Implemented** — code is committed and lightweight developer checks passed.
- **Needs user test** — behavior depends on real Scripting/device/account/network interaction.
- **Confirmed by user** — the user explicitly reports the real-device behavior works.
- **Blocked** — implementation cannot proceed because a required capability/input is unavailable.

Never write `runtime verified`, `real-device passed`, `accepted`, or equivalent unless the user supplied that evidence or explicitly asked you to perform a runtime action that you actually executed and observed.

Do not say both “completed” and “still needs runtime evidence”. Use **Implemented · needs user test** instead.

Do not bootstrap or launch `E-Hentai 浏览器 DEV` solely for self-certification. Sync DEV once when needed to deliver the code for the user's test, then stop. The stable local `E-Hentai 浏览器` must not be overwritten unless the user explicitly asks.

## User bug reports are authoritative runtime evidence
When the user says something is broken on the real device, treat that report as the current runtime truth.

Do not answer with “tests passed” as a rebuttal. Instead:
1. inspect the full relevant state/call flow and sibling callers;
2. identify the root cause;
3. fix it at the shared boundary when possible;
4. add/adjust one focused regression check when useful;
5. commit;
6. return the fix to the user for another quick real-device test.

If the same symptom survives two fixes, stop adding local guards. Re-trace the end-to-end flow, inspect the corresponding EhViewer behavior when relevant, and question the earlier root-cause assumption.

## Feature-completeness rule
A feature is not implemented merely because a button, route, parser, or external fallback exists.

For EhViewer parity work, implement the smallest **complete user flow** requested by `CURRENT_TASK.md`:
- entry/action;
- required request/parse/state behavior;
- success and useful failure behavior;
- native UI result.

EhViewer defines expected behavior, not target architecture. Do not port Android Activities/Fragments, managers, repositories, `SpiderQueen`, or Java abstractions just to resemble the reference app.

No fake UI/settings for behavior that does not exist.

## Root-cause and architecture rules
- Reuse existing network/account/parser/cache/store/UI helpers before adding new ones.
- Prefer one shared root-cause fix over guards in multiple screens.
- No speculative framework/refactor while fixing a bug.
- No one-implementation interfaces, factories, repositories, event buses, or future-proof scaffolding unless a current requirement needs them.
- Preserve input validation, security, privacy, destructive-action confirmation, atomic/recoverable writes, and data-loss protections.
- Preserve manual UI operation even when AI automation exists.
- AI actions and manual UI should share the same typed core functions.
- UI must not build raw E-Hentai protocol requests, parse HTML, or read raw Keychain values.
- In native Scripting app code, use `Dialog.confirm()` / `Dialog.prompt()` (or the existing project compatibility wrapper). Never assume browser DOM globals such as bare `confirm()` / `prompt()` exist just because TypeScript DOM typings accept them. Browser-script code is a separate runtime.

## Repository / GitHub
The repository may be private and the local workspace may be empty. Use Scripting's native GitHub integration/API for repository work.

- Never ask the user to paste a GitHub token.
- Never put PATs, SSH keys, cookies, passwords, `apiuid`/`apikey`, gallery/page tokens, private paths, full sensitive URLs, user comments, or full HTML in source, prompts, logs, diagnostics, fixtures, or repository files.
- Work on the branch named in `CURRENT_TASK.md`.
- Do not write `main`, merge PRs, rewrite history, tag, or publish releases unless the user explicitly asks.
- Commit by logical feature/fix batch, not every tiny edit.
- Repository state on the active remote branch is authoritative.

## Context / efficiency
Do not burn context or model quota on ceremonial verification.

When the task is implemented and the lightweight checks pass, commit and hand off. If the conversation becomes large, finish the current logical batch, commit it, leave a compact task/progress note if necessary, and stop.

## Reporting
Keep the handoff short:

- **Implemented:** what changed.
- **Commit:** SHA.
- **Checks:** diagnostics + focused check(s) actually run.
- **Please test:** 1–3 concrete real-device actions, only if needed.

Do not produce long acceptance reports unless the user explicitly asks for one.
