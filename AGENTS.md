# AGENTS.md

## Role
You are the primary implementation and runtime-debugging agent for this Scripting iOS/iPadOS project.

## Read order for each work session
1. `CURRENT_TASK.md`
2. `STABILIZATION_AUDIT.md` / `DEV_PROGRESS.md` when present for the active phase
3. Relevant files under `src/`
4. Current Scripting typings/docs only when an API is uncertain
5. EhViewer reference source only when `CURRENT_TASK.md` requires it

Do NOT reread the full project history unless `CURRENT_TASK.md` explicitly asks for it.

## Repository bootstrap / authentication — mandatory
The GitHub repository may be private and the current local workspace may be empty. **That is not a blocker and does not mean credentials are missing.**

- Do NOT use shell/local `git clone`, `git pull`, PAT, SSH keys, credential helpers, or ask the user to configure Git credentials for this project.
- Do NOT infer repository inaccessibility from an unauthenticated GitHub webpage returning 404.
- Use the **Scripting native GitHub API / built-in GitHub integration** for repository reads, writes, commits and branch work.
- If the local workspace is empty, bootstrap from the branch named in `CURRENT_TASK.md` through the native GitHub integration: read the repository task/checkpoint files, then fetch only the relevant source files and sync them into the isolated `E-Hentai 浏览器 DEV` script as needed.
- Repository state on the named remote branch is authoritative; a pre-existing local checkout is not required.
- **Repository files are the authoritative execution contract. PR/Issue comments are supplemental only. Never require `read_issues` / `read_pull_requests` permission merely to continue work when the same instructions are already present in `CURRENT_TASK.md`, `STABILIZATION_AUDIT.md`, or `DEV_PROGRESS.md`. If a PR comment cannot be read without an extra authorization prompt, skip it and continue from repository documents.**
- Do not call `GitHub.requestPermissions(...)` solely to read a referenced PR/Issue comment unless `CURRENT_TASK.md` explicitly says the comment contains unique instructions unavailable in repository files.
- If a GitHub API action is not immediately visible, inspect available Scripting tools/integrations first. Only report a blocker if repository file read/write itself is genuinely unavailable after checking. **Never fall back to requesting PAT/local Git credentials.**

## Development mode
`CURRENT_TASK.md` is authoritative for the current project phase.

- If it says feature-completion: prioritize completing useful functionality and defer broad polish.
- If it says UI/UX consolidation: preserve feature behavior and reorganize native UI without expanding scope.
- If it says stabilization/final review: **freeze feature scope**, perform the requested broad audit, fix defects by root cause in severity groups, run consolidated regression, and do not reopen feature work.

Never invent a new phase or continue into the next version automatically.

## Root-cause rule
A bug report names a symptom, not necessarily the fix location.

Before editing a shared function/store/parser/network path:
- inspect its callers and related state flow;
- prefer one fix at the common boundary over repeated guards in individual screens;
- preserve validation, error handling, privacy/security and data-safety behavior;
- add the smallest deterministic regression check for non-trivial logic.

Do not perform speculative architecture rewrites during bug fixing.

## Runtime script policy
Never overwrite the user's existing stable local `E-Hentai 浏览器` script during development or stabilization.

Use the separate local `E-Hentai 浏览器 DEV` project for real-runtime validation. Keep the normal `index.tsx -> runAppV2()` entry path and identify the active DEV/RC version in `script.json` as required by `CURRENT_TASK.md`.

Real-runtime evidence from the Scripting app takes precedence over assumptions from repository-only execution.

## Product rules
- Preserve manual UI operation even when AI automation exists.
- AI actions and manual UI must share the same typed core/use-case functions.
- UI does not build E-Hentai URLs, parse HTML, or read raw Keychain data.
- Reuse existing network/account/parser/cache/store functions before adding new ones.
- Preserve Detail Core-first behavior and E/Ex routing.
- No fake UI/settings for unimplemented features.

## Testing policy
- Use focused checks while changing one root cause or UI path.
- Run the complete existing harness only at checkpoints/final verification unless `CURRENT_TASK.md` says otherwise.
- Do not ask the user to rerun the whole app after every small fix.
- `scripting-ts run` is useful evidence but does not replace a real Scripting DEV-script launch.
- Do not reopen already-passed areas unless the current change touches them or the active audit/review explicitly samples them.

## Privacy and data safety
Never log/commit Cookie values, passwords, apiuid/apikey, full sensitive URLs, gallery/page tokens, search terms, user comments, private local paths, or full HTML.

Do not simplify away validation, safe storage replacement, destructive-action confirmation, atomic/recoverable writes, or protections against deleting unrelated files.

## Context safety
Never rely on automatic conversation compression during an active tool-call chain.

When a session becomes large:
- finish active tool calls and the current logical batch;
- run its focused checks;
- commit/push completed work;
- update `DEV_PROGRESS.md` (and the active audit file when relevant);
- stop the session and resume from repository state in a fresh conversation.

## Git
- Work only on the branch named in `CURRENT_TASK.md`.
- Use Scripting native GitHub API; no PAT/local git requirement.
- Never write `main` unless explicitly instructed.
- Do not upload runtime diagnostics containing user data.
- Commit by logical capability/fix batch, not every tiny edit.
- Never merge a PR unless the user explicitly asks.

## Reporting
Follow the report format in `CURRENT_TASK.md`.

Keep interim reports compact. During stabilization, do not stop after each bug for another review round; complete the requested audit/fix batch unless an S0 safety blocker requires immediate interruption.
