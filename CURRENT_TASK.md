# CURRENT_TASK — 0.5 EhViewer Core Feature Expansion

Branch: `feat/0.5-core-expansion`
Base: `289d997ed6fda15a41528a7b7c0d591556b6a5c5`
Reference: `xiaojieonly/Ehviewer_CN_SXJ` current `BiLi_PC_Gamer` behavior.

Read `AGENTS.md` first. Then inspect only the current feature's existing `src/` files and the matching EhViewer reference files. Do not reread project history.

## Working mode
This is a **large continuous feature package**, not another small review loop.

Work continuously:
`inspect -> implement -> self-test/runtime -> fix ordinary failures -> commit logical package -> continue next capability`.

Do **not** stop for Technical Review after each sub-feature. Do not ask the user to retest routine changes. Stop only for the true blockers already defined in `AGENTS.md`.

The goal is practical EhViewer-like daily-driver coverage on Scripting/iOS/iPadOS, not a mechanical Android port or pixel-perfect clone. Reuse current code first; do not introduce frameworks or architecture layers unless the existing code genuinely cannot support the feature.

## Preserve throughout
Never regress:
- Home / Search / Filter / Detail Core-first / background previews / Reader / Account;
- E-Hentai + ExHentai account/site handling;
- image priority `reader-image > preview-thumbnail > home-thumbnail`;
- local History / Reading Progress;
- typed `runEhAction()` + opaque short-lived `galleryRef`;
- AssistantTool search path;
- bounded requests and sanitized diagnostics.

Never expose Cookie, password, gallery/page token, full sensitive URL, search text, user comment text, local path, or full HTML in logs/diagnostics/AI output.

## Carry-forward cleanup — fix while continuing, do not stop afterward
Close the known 0.4 review items before/while touching these paths:
1. Favorites query from the real UI must use `f_search + sn=on + st=on + sf=on` for the single search box.
2. Favorites category parser must correctly parse all 10 real `.fp onclick=...favcat=N` blocks, including category 9 without swallowing later HTML.
3. Destructive History clear must use the verified Scripting native confirmation API (`Dialog.confirm` if current typings confirm it).
4. Continue Reading must never navigate to an index not yet present in `pageLinks`; show it only when the saved page is currently navigable, then recompute after background previews finish.
5. Successful Favorites/History AI-item mapping must have a deterministic privacy check without mutating real user data.

These are carry-forward bugs, **not a separate milestone**.

## Capability targets
Attempt the following in order. Finish as much as Scripting can safely support before stopping for milestone review.

### 1. Library / Favorites complete
Build on the existing 0.4 core.
- cloud Favorites: all categories, counts, search, pagination, Detail reuse;
- show a gallery's favorite state where the server exposes it;
- add to Favorites, move/change category, remove from Favorites;
- favorite note only if the current server/API path is clear and small;
- destructive/removal actions require explicit confirmation;
- local History: reopen/delete/clear, newest-first, Continue Reading, reset progress;
- never mix cloud Favorites and local History storage.

### 2. Gallery Detail complete
Use EhViewer behavior as the reference and extend the existing Detail rather than replacing it.
- complete useful metadata/tags/preview handling;
- Comments: load/read first; posting/editing only after verifying the current server form/API and with explicit user action;
- rating display; rating submission only if the current request path is verified;
- favorite actions from Detail;
- expose Torrent / Archive information or safe external/open actions when supported;
- retry/error states must use existing shared state patterns.

Do not duplicate Detail or create a second HTTP/parser stack.

### 3. Reader daily-use features
Keep the current Reader and add only native/useful behavior supported by Scripting:
- reliable previous/next and page jump;
- Continue Reading and reset progress;
- bounded nearby-page prefetch/cache without defeating reader-image priority;
- retry failed image/page resolution;
- prefer normal image and offer original/full image when the page exposes a safe path;
- at least one practical reading layout beyond the current single-page flow if Scripting UI supports it cleanly (for example continuous vertical reading);
- persist only a small reader preference set that is actually used.

Do not build gesture engines or custom rendering frameworks merely to imitate Android.

### 4. Downloads / offline reading
Implement a practical Scripting-native download manager using existing `fetch`, `FileManager` and current gallery/image resolution paths.

Minimum useful behavior:
- start gallery download from Detail;
- persistent download record/queue;
- download pages with bounded concurrency;
- progress + failed-page state;
- pause/cancel/retry/resume as far as Scripting runtime permits;
- completed gallery opens in an offline reader without network;
- delete downloaded gallery only after explicit confirmation;
- safe filenames/paths and no silent overwrite of unrelated files;
- corrupt/incomplete state fails safely and remains recoverable.

If Scripting cannot continue execution in the background, **do not fake background downloading**. Implement resumable foreground downloading and record the platform limitation for final report.

Reading-while-downloading is optional only if it falls naturally out of the queue/cache design.

### 5. Discovery features
Reuse the existing gallery-list parser/request path wherever structurally compatible.
Attempt:
- Watched / subscriptions;
- Toplists;
- Quick Search / saved searches;
- My Tags / tag-oriented navigation;
- useful advanced/multi-tag search behavior already present in EhViewer when it maps cleanly to E-Hentai URLs.

Prefer read/browse support first. Add server writes only when the existing authenticated endpoint is verified and the UI makes the mutation explicit.

### 6. Settings / app controls
Add one small native Settings scene rather than scattering controls.
Only settings that change implemented behavior belong here, for example:
- active E/Ex site/account actions;
- reader mode/preload preference;
- download concurrency or cache behavior where useful;
- image/cache clear with explicit confirmation;
- history/progress maintenance;
- diagnostics/self-test entry for development if already useful.

Do not port Android-only preferences just because EhViewer has them.

### 7. Typed AI boundary
Extend `EhAction` only for capabilities where structured AI access is actually useful.
- browsing/list/status actions may be exposed read-only;
- keep `galleryRef` opaque and short-lived;
- no gid/token/full URL/local path in action output;
- manual UI and AI actions must share the same core;
- do not expose destructive cloud/local mutations to AI merely for feature parity.

## Platform-gap rule
For an EhViewer feature that depends on Android-only services, unrestricted background execution, SAF/storage permissions, notification services, VPN/system hooks, or another capability Scripting genuinely lacks:
1. check current Scripting typings/docs;
2. make one minimal runtime probe only if needed;
3. implement the closest safe native equivalent when useful;
4. otherwise skip it and record one concise `PLATFORM_GAP` item for final report.

Do not write compatibility scaffolding for unavailable APIs.

## Safety rules for mutations
Cloud Favorites changes, comments, ratings, downloaded-file deletion and bulk local-data deletion are user-visible mutations.
- no automatic mutation during tests;
- require an explicit UI action;
- destructive actions require confirmation;
- never test against real user data when an injected/temp fixture can prove the logic;
- network failure must not leave local state claiming a remote write succeeded.

## Verification while developing
Keep using the existing harness; extend it instead of creating competing test systems.

After each logical package, run only the affected focused checks plus baseline smoke tests when needed. Fix ordinary failures yourself and continue.

At the **end of the whole 0.5 package**, run one closure pass:
- `src/runSelfTests.ts`;
- `src/runActionSmoke.ts`;
- `src/runAssistantToolSmoke.ts`;
- `src/runNetworkSelfTest.ts`;
- any focused download/library/discovery checks added during development;
- real Scripting runtime flows for Browse -> Detail -> Reader, Favorites, History/Resume, Downloads/Offline, and each implemented discovery scene;
- verify E and Ex reopening/routing where applicable;
- verify no sensitive diagnostics/output;
- verify destructive actions are never triggered by automated tests.

A green harness is evidence, not permission to ignore a broken real UI path.

## Git / reporting
- Work only on `feat/0.5-core-expansion`.
- Keep commits grouped by logical capability, not tiny fixes.
- Do not write `main`.
- Do not wait for review between capabilities.
- A Draft PR may target `feat/0.4-library` while PR #23 remains unmerged; retarget later if the accepted baseline moves.

## Completion / stop condition
Do not stop after Library, Downloads, Reader, or any single feature.

Stop for Technical Closure Review only when:
1. capabilities 1-6 have all been attempted;
2. every feasible high-value capability is implemented or has a concrete `PLATFORM_GAP` reason;
3. end-of-package verification has been run and ordinary failures fixed;
4. no known data-loss/privacy blocker remains.

Final report must be compact:
- implemented capabilities;
- skipped `PLATFORM_GAP` items;
- test/runtime results;
- changed files and final head SHA;
- known remaining defects;
- at most 2-5 human-only acceptance items.

Then stop. Do not start another feature package until Closure Review is complete.
