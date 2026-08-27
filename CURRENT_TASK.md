# CURRENT_TASK — 1.1 Gallery Interaction

Branch: `feat/1.1-gallery-interaction`  
Base: `main` at `f74c4578993e8ed4e7f7481393df998449ea0660`

## Repository role

- `main` is the authoritative long-term development baseline.
- `release/1.0` is a historical 1.0 snapshot; do not develop on it.
- Active work is on the branch above and returns to `main` only when the user explicitly approves integration.

## Working contract

The Agent implements code. The user performs real-device QA.

For every feature/fix:
1. inspect the current Scripting code and trace the affected flow;
2. inspect only the narrow EhViewer behavior needed for parity when relevant;
3. implement the smallest complete flow/root-cause fix;
4. run TypeScript diagnostics;
5. run one focused deterministic check for new non-trivial logic when useful;
6. commit/push;
7. give the user a short 1–3 step real-device test;
8. stop and wait for the user's result.

Do not run a broad acceptance campaign, full regression ritual, repeated bootstrap, or long simulated walkthrough unless the user explicitly asks.

A feature that depends on real Scripting/device/account/network behavior is reported as **Implemented · needs user test**, not “accepted” or “runtime verified”.

If the user reports a bug, that report overrides assumptions from passing tests. Fix the root cause, run only the focused check needed for the change, commit, and return it for another quick user test.

## Product direction

Use `xiaojieonly/Ehviewer_CN_SXJ` as the behavioral reference for missing E-Hentai client capabilities. Do not translate its Android architecture into Scripting.

Reuse the existing account/network/parser/store/UI paths. Do not create speculative frameworks or duplicate working functionality.

`EHVIEWER_PARITY.md` tracks product gaps and priorities. It does not authorize starting a later milestone automatically.

## 1.1 scope — Gallery Interaction

### A. Comments experience — Implemented
- Dedicated native comments scene from Gallery Detail.
- Detail keeps compact comment preview/entry instead of an unbounded full list.
- Existing author/date/text sanitization is preserved.

### B. Torrent list — Implemented
- Internal torrent list when `torrentUrl` exists.
- Stable fields only: name, posted date, download URL.
- Private `?p=` suffix removed as EhViewer does.
- External opening remains fallback; no torrent client is built.

### C. Gallery rating — Implemented
- `apiuid` / `apikey` are parsed from the current Gallery HTML into transient in-memory detail state only.
- They must never be persisted, printed, reported, synced, added to fixtures, or exposed in errors.
- `rategallery` is submitted to the active site's `/api.php` with the existing account/session path.
- Rating input is 0.5–5.0 in 0.5 steps; API encoding is `Math.ceil(rating * 2)`.
- Only `rating_avg` / `rating_cnt` are consumed and the current Detail state is updated locally.
- Invalid/negative identity data is login-required; do not invent alternate credential storage.

## Current status

All three 1.1 slices are **implemented in code**. Do not spend agent/model quota trying to certify real-device behavior.

The user may now test whichever behavior matters to them. Any reported failure becomes the next bug-fix task on this same branch unless the user says otherwise.

Do not enter 1.2 Reader Parity until the user explicitly authorizes it.

## Preserve

- Detail Core-first and background preview loading.
- Existing E/Ex routing and Cookie/Keychain safety.
- Current accepted iPad Detail width/layout behavior.
- Existing Reader/download/library core behavior unless a user-reported bug requires touching it.
- Stable local `E-Hentai 浏览器` unless the user explicitly asks to replace/update it.
- No broad parser/network/store rewrite.

## Default checks

For a normal implementation or bug fix:
- TypeScript diagnostics.
- One focused check for newly changed non-trivial logic.

Do not automatically run the whole self-test/smoke/network/release suite.

## Reporting

Return only:
- **Implemented/Fix:** what changed.
- **Commit:** SHA.
- **Checks:** diagnostics + focused checks actually run.
- **Please test:** at most 1–3 concrete device actions if runtime confirmation is needed.

No long acceptance report unless the user asks.
