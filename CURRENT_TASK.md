# CURRENT_TASK — Feature Completion Wave

Branch: `feat/0.6-interactions-offline`
Base: `38b55d331c82c40bac4e384df1f78888d17c4797`
Reference: `xiaojieonly/Ehviewer_CN_SXJ` current behavior.

Read `AGENTS.md` first. The project is now in **feature-completion mode**: keep building until the practical high-value EhViewer feature set is substantially complete. Do not stop for repeated bug-review rounds.

## Runtime rule
Do **not** overwrite the user's existing stable local `E-Hentai 浏览器` script.

Create/update a separate local Scripting project for runtime validation:
- display name: `E-Hentai 浏览器 DEV`;
- distinct internal script name;
- `script.json` clearly identifies DEV + current package/version;
- current branch source is copied into that DEV project's actual script root;
- production entry remains `index.tsx -> runAppV2()`.

A development package is considered runnable when the DEV script launches in the real Scripting app and the newly added main capability is visible/usable. This is enough to continue development; do not wait for exhaustive bug hunting.

## Development loop
Work continuously:
`inspect -> implement -> focused tests -> run DEV script -> fix blockers -> commit logical capability -> continue`.

Immediately fix only:
- startup/build/runtime blockers;
- data-loss/privacy/security issues;
- destructive wrong writes;
- defects that make the current claimed feature fundamentally unusable.

Record and defer ordinary UI quirks, edge cases, minor parser gaps, visual polish and isolated regressions to the final stabilization phase.

## Preserve
Do not intentionally remove working behavior:
- Home / Search / Filter / Detail / Reader / Account;
- E-Hentai + ExHentai routing;
- Favorites / History / Continue Reading / Quick Search;
- Watched / Toplist / My Tags read path;
- continuous + single reader;
- foreground downloads / offline reader;
- image priority/bounded requests;
- opaque short-lived `galleryRef` AI boundary;
- sanitized diagnostics and safe local storage.

Never expose Cookie, password, apiuid/apikey, gallery/page token, full sensitive URL, search text, user comment text, private local path or full HTML.

# Project-completion targets

The agent should continue through the targets below without stopping for a Technical Closure Review after each section.

## 1. Make the DEV script real and keep it current
Before adding more features:
- create/update the separate `E-Hentai 浏览器 DEV` local script;
- populate it from the current branch source without modifying the stable script;
- verify the real Scripting app shows current 0.6 UI, including `下载离线` on Gallery Detail and Library download/My Tags entries;
- update the DEV copy as development continues.

Do not build a complex updater. A simple agent-managed copy/sync into the DEV project is enough.

## 2. Finish core Gallery/Library interactions
Build on existing paths; no second network stack.

Attempt the remaining useful interactions where the actual endpoint is verifiable:
- favorite category + note read/update;
- rating submit;
- comment post/edit;
- Torrent / Archive open/share;
- gallery version/parent/uploader navigation when exposed;
- useful comment/resource status presentation.

If a write endpoint cannot be verified safely, record `PLATFORM_GAP` and keep the read side. Do not invent forms or credentials.

Skip moderation/admin-only workflows unless nearly free from an already-verified path.

## 3. Complete Downloads / offline daily use
The existing foreground queue is the base. Improve only practical gaps:
- download list/status that stays accurate across restarts;
- pause/resume/retry/cancel/delete;
- partial download recovery;
- offline open with no network;
- clear distinction between completed / partial / failed;
- original-image preference where practical;
- safe storage cleanup;
- no fake background claim.

If Scripting cannot provide persistent background execution, foreground-resumable is the final supported model.

## 4. Reader daily-use completion
Keep both single-page and bounded continuous mode.

Add only high-value controls that map cleanly to native Scripting UI:
- jump/page navigation;
- retry current failed page;
- original image preference;
- bounded preload;
- sensible offline-reader parity;
- a small reader settings surface for implemented behavior.

Do not build gesture engines, page-turn animation systems, or custom rendering frameworks.

## 5. Discovery / search completion
Reuse existing list/search paths.

Complete useful native coverage for:
- Watched/subscriptions;
- Toplists;
- Quick Search/saved searches;
- My Tags read/browse;
- tag navigation;
- advanced/multi-tag search where it maps directly to current E-Hentai URL parameters;
- uploader/category links where useful.

Cloud writes for My Tags remain optional unless the endpoint is clearly verified.

## 6. Account / Settings / maintenance completion
Keep one compact native Settings/Account experience.

Only include controls that actually work:
- active E/Ex site and login/account status/actions;
- reader preferences;
- cache clear;
- download/offline management entry;
- history/progress maintenance;
- Quick Search maintenance if useful;
- diagnostics/self-test entry only if it helps development.

Remove/no-op controls rather than keeping placeholders.

## 7. Typed AI boundary
Keep AI secondary to the manual app.

Add only useful read-only structured access such as:
- search/list/detail;
- favorites/history;
- download status/list if safe and implemented.

Never expose gid/token/full URL/local path/api credentials. Do not expose destructive/comment/rating/favorite writes through AI just for parity.

## 8. Remaining EhViewer parity triage
After the above, inspect the current EhViewer reference feature/navigation set once and classify remaining gaps:

- `HIGH_VALUE_FEASIBLE`: implement now;
- `PLATFORM_GAP`: Scripting/iOS limitation or unsafe/unverified endpoint;
- `LOW_VALUE_DEFERRED`: niche/admin/Android-specific behavior not needed for a practical daily-driver.

Implement all reasonable `HIGH_VALUE_FEASIBLE` items before declaring feature completion.

Do not mechanically port Android services, notifications, SAF, VPN/system hooks, background services, gesture engines, or preferences that have no Scripting equivalent.

# Verification during feature-completion mode

For each logical capability:
- TypeScript diagnostics;
- focused existing harness checks;
- one real DEV-script launch/path that proves the new main capability works.

At checkpoints, run the baseline harnesses, but **do not stop development merely because a non-blocking bug is found**. Record it and continue unless it meets the blocker criteria in `AGENTS.md`.

Automated tests must never perform real cloud writes, delete real downloads/history, or expose sensitive data.

# When feature development finally stops

Stop feature development only when:
1. targets 1-8 have all been attempted;
2. all `HIGH_VALUE_FEASIBLE` items are implemented;
3. remaining gaps are explicitly classified as `PLATFORM_GAP` or `LOW_VALUE_DEFERRED`;
4. the separate `E-Hentai 浏览器 DEV` script launches and the major feature families are reachable;
5. there is no known privacy/data-loss/startup blocker.

Then enter a **separate final stabilization phase**:
- one broad bug review;
- fix blockers and high-impact defects in consolidated passes;
- concentrated user acceptance;
- only after that consider replacing/promoting the stable local script.

## Reporting
At each feature checkpoint report only:
- newly completed capabilities;
- DEV-script runtime result;
- tests;
- final head SHA;
- new PLATFORM_GAP items;
- deferred non-blocking bugs.

Do not ask for review approval before continuing to the next feature target.
