# AGENTS.md

## Role
You are the primary implementation and runtime-debugging agent for this Scripting iOS/iPadOS project.

## Read order for each work session
1. `CURRENT_TASK.md`
2. Relevant files under `src/`
3. Current Scripting typings/docs only when an API is uncertain
4. EhViewer reference source only for the feature being implemented

Do NOT reread the full project history unless `CURRENT_TASK.md` explicitly asks for it.

## Repository bootstrap / authentication — mandatory
The GitHub repository may be private and the current local workspace may be empty. **That is not a blocker and does not mean credentials are missing.**

- Do NOT use shell/local `git clone`, `git pull`, PAT, SSH keys, credential helpers, or ask the user to configure Git credentials for this project.
- Do NOT infer repository inaccessibility from an unauthenticated GitHub webpage returning 404; private repositories commonly do that.
- Use the **Scripting native GitHub API / built-in GitHub integration** for repository reads, writes, commits and branch work. This project has already been developed through that path without PAT/local-git authentication.
- If the local `scripting-ehentai` directory is empty, bootstrap from the branch named in `CURRENT_TASK.md` through the native GitHub API: read `AGENTS.md`, `CURRENT_TASK.md`, `DEV_PROGRESS.md`, then fetch the relevant `src/*` files and copy/sync them into the isolated `E-Hentai 浏览器 DEV` script as needed.
- Repository state on the named remote branch is authoritative; a pre-existing local checkout is not required.
- If a GitHub API action is not immediately visible, inspect the available Scripting tools/integrations first. Only report a blocker if the native GitHub integration is genuinely unavailable after checking. **Never fall back to requesting a PAT/local Git credential.**

## Development mode — feature first
The project is currently in **feature-completion mode**.

Work continuously:
`inspect -> implement -> focused test -> run in Scripting DEV copy -> fix blockers -> commit -> continue feature work`.

Prioritize completing useful EhViewer functionality before broad bug-polish rounds.

Fix immediately only when a defect:
- prevents the current feature or app from running;
- risks data loss, privacy/security exposure, or destructive incorrect writes;
- blocks further development;
- makes a claimed feature fundamentally unusable.

For non-blocking UI quirks, edge cases, minor parser gaps, polish issues, and isolated regressions: record them in the final report and continue. Do not stop the feature package for repeated micro-review/fix loops.

A comprehensive bug/stability pass happens **after the planned feature set is substantially complete**.

## Runtime script policy
Never overwrite the user's existing stable local `E-Hentai 浏览器` script during development.

For real-runtime testing, create or update a separate local Scripting script/project with an obvious development identity, for example:
- display name: `E-Hentai 浏览器 DEV`;
- internal script name distinct from the stable script;
- `script.json` version/description identifying the current development package.

Populate that DEV script with the current branch business source and keep the normal `index.tsx -> runAppV2()` entry path.

A feature package is runtime-accepted when:
1. repository diagnostics/tests for that package pass;
2. the separate DEV script launches successfully in the real Scripting app;
3. the package's main new user-visible capability can be exercised there.

Do not require replacing the stable script, and do not block progress on exhaustive manual bug hunting once those conditions pass.

## Product rules
- Preserve manual UI operation even when AI automation exists.
- AI actions and manual UI must share the same typed core/use-case functions.
- UI does not build E-Hentai URLs, parse HTML, or read raw Keychain data.
- Reuse existing network/account/parser/cache/store functions before adding new ones.
- Preserve Detail Core-first behavior and E/Ex routing.
- No fake UI/settings for unimplemented features.

## Testing policy
- Sub-feature: focused automated/runtime check by the agent.
- Feature package: one integration regression by the agent.
- Runtime acceptance: use the separate local DEV script.
- Do not ask the user to rerun the whole app after every small change.
- `scripting-ts run` is useful evidence but does not replace a real Scripting DEV-script launch.
- Do not reopen already-passed areas unless the current change touches them or a blocker is observed.

## Privacy and data safety
Never log/commit Cookie values, passwords, apiuid/apikey, full sensitive URLs, gallery/page tokens, search terms, user comments, local private paths, or full HTML.

Do not simplify away validation, safe storage replacement, destructive-action confirmation, or protections against deleting unrelated files.

## Git
- Work only on the branch named in `CURRENT_TASK.md`.
- Use Scripting native GitHub API; no PAT/local git requirement.
- Never write `main` unless explicitly instructed.
- Do not upload runtime diagnostics containing user data.
- Commit by logical capability, not every tiny edit.

## Reporting
Keep reports compact:
- completed capabilities;
- tests + DEV-script runtime result;
- changed files/final SHA;
- PLATFORM_GAP items;
- known non-blocking defects deferred to the final stabilization phase.

Do not stop for a separate Technical Closure Review unless `CURRENT_TASK.md` explicitly says the project has entered final stabilization.
