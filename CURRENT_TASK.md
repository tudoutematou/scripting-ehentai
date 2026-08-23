# CURRENT_TASK — 0.6 EhViewer Interactions & Offline

Branch: `feat/0.6-interactions-offline`
Base: `38b55d331c82c40bac4e384df1f78888d17c4797`
Reference: `xiaojieonly/Ehviewer_CN_SXJ` current behavior.

Read `AGENTS.md` first. Then inspect only the existing code touched by the current capability and the matching EhViewer reference files. Reuse current request/parser/store/UI paths before writing anything new.

## Working mode
This is another **large continuous feature package**.

Work continuously:
`inspect -> implement -> focused self-test/runtime -> fix ordinary failures -> commit logical package -> continue`.

Do not stop for review after each sub-feature. Stop only for a real platform/credential/destructive-data blocker as defined in `AGENTS.md`.

The target is practical EhViewer-like daily use on Scripting/iOS/iPadOS, not an Android clone. Prefer one small working path over parallel implementations.

## Preserve throughout
Do not regress the accepted 0.5 behavior:
- Home / Search / Filter / Detail Core-first / background previews / Reader / Account;
- Favorites categories/search/add/move/remove + `#gdf` state;
- Comments read parsing and Torrent/Archive detection;
- History / Continue Reading / reset progress;
- Quick Search / Watched / Toplist / Settings;
- E-Hentai + ExHentai routing;
- image priority `reader-image > preview-thumbnail > home-thumbnail`;
- opaque short-lived `galleryRef` AI boundary;
- bounded requests and sanitized diagnostics.

Never log or expose Cookie, password, apiuid/apikey, gallery/page token, full sensitive URL, search text, user comment text, local path, or full HTML.

## Carry-forward — first item, then continue
The remote 0.5 branch still contains the known continuous-reader issue. Fix it first on this branch; do not wait for another 0.5 upload.

### Continuous Reader safety
Current behavior must not mount/resolve the whole gallery at once and must not treat `resolveImagePage()` completion as “visible”.

Implement the smallest safe continuous mode:
- only mount a bounded window/batch around the current position;
- advance/load more by explicit user action or a verified Scripting visibility/appear callback;
- reading progress updates only from explicit navigation or a verified visible-page signal;
- never allow background resolution order to jump saved progress;
- keep reader-image priority and bounded image work;
- preserve single-page mode.

If Scripting has no trustworthy visibility callback, use explicit bounded “load more / next batch” behavior rather than inventing one.

## Capability targets
Attempt in order. Finish all feasible high-value items before milestone review.

### 1. Foreground Downloads / Offline Reader
Re-attempt Downloads using only already-verified platform primitives and existing code paths.

Important: the previous CommonJS/ESM loader failure may have been caused by introducing a new module, not by `fetch`/`FileManager` themselves. Therefore:
- first try the smallest implementation inside an already-loading module, or a new module only after a minimal import probe succeeds;
- do not build a service/background framework;
- do not claim background download support.

Minimum useful implementation:
- start download from Gallery Detail;
- persist a small gallery download manifest/record;
- resolve/download pages with bounded concurrency;
- progress, failed pages, retry, cancel/pause/resume as far as foreground runtime permits;
- interrupted partial downloads remain recoverable and resumable;
- completed gallery opens in a real offline reader with network disabled/unavailable;
- safe directory/file names and atomic/backup-safe manifest writes;
- deleting a downloaded gallery requires explicit confirmation;
- never silently overwrite unrelated files;
- no automatic real-user download mutation in tests.

A foreground-only resumable queue is fully acceptable. If even that cannot be made reliable after one minimal runtime probe, record the exact PLATFORM_GAP and stop adding download scaffolding.

### 2. Gallery Detail interactions
Extend the existing Detail. No second network stack.

Attempt:
- favorite note read/edit when server path is verified;
- rating submission using the exact verified EhViewer/E-Hentai API path;
- comment post and edit using the exact verified server form/API;
- safe Torrent / Archive open/export action when Scripting has a verified native external-open/share path.

Rules:
- every write is explicit UI action;
- destructive/replacing actions need confirmation where appropriate;
- no AI write actions;
- no automatic tests against the real account;
- request-builder/parser logic can use pure fixtures;
- apiuid/apikey, tokens and comment text must never enter diagnostics;
- if current page/API does not expose required credentials safely, record PLATFORM_GAP instead of guessing.

Do not implement comment voting, tag voting, expunge/rename petitions, or moderation workflows unless they fall out trivially from already-verified paths. YAGNI.

### 3. My Tags / tag-oriented discovery
Implement the smallest useful native My Tags experience if the authenticated endpoint can be read reliably.

Prefer:
- list the user's tag sets/tags;
- open a tag into the existing Results flow;
- reuse current tag translation/display helpers;
- read-only first.

Only add tag create/edit/delete if the endpoint is already clear and the mutation is explicit. Otherwise record the write side as PLATFORM_GAP.

### 4. Resource / cache maintenance
Add only controls backed by real implemented behavior:
- clear image cache with explicit confirmation;
- if Downloads works: show downloaded galleries and delete/retry/resume there;
- show small cache/offline status only if it can be obtained cheaply;
- keep History/Quick Search maintenance in their existing scenes rather than duplicating controls.

Do not add fake download settings when Downloads is unavailable.

### 5. Reader polish that reuses current paths
After continuous mode is safe:
- original-image preference must also behave sensibly in continuous/offline mode when available;
- failed page retry should not reset unrelated pages;
- bounded preload should remain bounded in both layouts;
- offline reader should share as much UI/state logic with normal Reader as practical.

No custom gesture engine, no page-turn animation framework, no image rendering rewrite.

### 6. Typed AI boundary
Only expose new **read-only** capabilities where useful, for example download status/list if Downloads is real.

Keep:
- opaque `galleryRef`;
- no gid/token/full URL/local path/api credentials;
- same core functions as manual UI;
- no comment/rating/favorite/download deletion writes through AI.

Skip AI additions entirely if they do not improve the implemented feature.

## Platform-gap rule
For any missing EhViewer feature:
1. inspect current Scripting typings/docs;
2. run at most one minimal runtime probe if necessary;
3. use the closest safe native equivalent;
4. otherwise record one concise `PLATFORM_GAP` and move on.

Do not keep dead UI, dead settings, or unused scaffolding for a PLATFORM_GAP feature.

## Data safety
For History, Settings, Quick Search, download manifests and offline files:
- malformed/unreadable state must fail safely;
- do not overwrite unreadable real data with empty defaults;
- use temp/backup/restore or another verified atomic-enough replacement pattern;
- concurrent writes must not lose records;
- tests use injected/temp stores only.

## Verification
Extend the existing harness instead of creating another test system.

At package end run:
- TypeScript diagnostics;
- `src/runSelfTests.ts`;
- `src/runActionSmoke.ts`;
- `src/runAssistantToolSmoke.ts`;
- `src/runNetworkSelfTest.ts`;
- focused pure/parser/store tests for every new write/download path;
- real runtime: single Reader + continuous Reader; Favorites; Detail interactions that can be safely human-tested; My Tags; download -> interrupt/resume -> offline open -> delete if Downloads is implemented;
- verify no sensitive diagnostics/output;
- verify tests never perform cloud writes or delete real user files/history.

A green harness does not override a broken runtime path.

## Git / reporting
- Work only on `feat/0.6-interactions-offline`.
- Group commits by capability.
- Do not write `main`.
- Do not stop between capabilities for review.
- Draft PR targets `feat/0.5-core-expansion` while PR #24 remains open.

## Completion / stop condition
Stop for one Closure Review only when:
1. carry-forward continuous Reader is fixed;
2. capabilities 1-5 have all been attempted;
3. feasible items are implemented and infeasible items have concrete PLATFORM_GAP reasons;
4. all ordinary failures are fixed;
5. no known privacy/data-loss blocker remains.

Final report only:
- implemented capabilities;
- PLATFORM_GAP items;
- diagnostics/tests/runtime results;
- changed files and final head SHA;
- known remaining defects;
- at most 2-5 human-only acceptance items.

Then stop. Do not start 0.7 until Closure Review is complete.
