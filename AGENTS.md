# AGENTS.md

## Role
You are the primary implementation and runtime-debugging agent for this Scripting iOS/iPadOS project.

## Read order for each work session
1. `CURRENT_TASK.md`
2. Relevant files under `src/`
3. Current Scripting typings/docs only when an API is uncertain
4. EhViewer reference source only for the feature being implemented

Do NOT reread the full project history or governance docs unless `CURRENT_TASK.md` explicitly asks for them.

## Development loop
Work continuously inside the current feature package:

`inspect existing code -> implement -> run diagnostics/self-test -> run in Scripting -> fix ordinary bugs yourself -> repeat -> commit package`

Do not stop for ordinary TypeScript errors, component prop errors, parser errors, timeouts, non-2xx responses, layout/navigation bugs, or routine runtime failures. Diagnose and fix them yourself.

Only stop early for a true blocker:
- user credential/Cookie/CAPTCHA/system permission required;
- destructive migration of real user data;
- human-only visual/gesture/product decision;
- Scripting capability remains unknown after checking typings/docs and a minimal real-runtime reproduction;
- a product/architecture decision changes scope materially.

## Product rules
- Preserve manual UI operation even when AI automation exists.
- AI actions and manual UI MUST call the same typed core/use-case functions; never automate the UI by simulated taps when a direct action exists.
- UI does not build E-Hentai URLs, parse HTML, or read raw Keychain data.
- Reuse existing network/account/parser/cache functions before adding new ones.
- Preserve Detail Core-first behavior.
- Preserve TagRef raw namespace/href semantics.
- Keep `loggedIn`, E-Hentai reachability, and Ex availability separate.

## Testing policy
- Sub-feature: self-test locally/runtime yourself.
- Feature package: one integration regression by you.
- Milestone: user performs one concentrated acceptance pass.
- Do not ask the user to rerun the whole app after every small fix.
- `scripting-ts run` is useful evidence but does not override behavior observed in the real Scripting App.

## Privacy
Never log/commit Cookie values, passwords, full sensitive URLs, gallery/page tokens, search terms, comments, or full HTML. Diagnostics may contain sanitized stage, host, status, duration, counts, error type, and non-sensitive metrics.

## Git
- Work only on the branch named in `CURRENT_TASK.md`.
- Use Scripting native GitHub API; no PAT/local git requirement.
- Never write `main` unless explicitly instructed.
- Do not upload runtime diagnostics.
- Commit by logical package, not every tiny edit.

## Reporting
Do not produce long progress reports during implementation. At completion, report only:
- completed features;
- self-tests/runtime checks;
- changed files/commit SHA;
- known remaining issues;
- at most 2-5 human-only acceptance items.
