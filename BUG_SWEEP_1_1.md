# BUG_SWEEP_1_1 — Autonomous Runtime Bug Sweep

Branch: `feat/1.1-gallery-interaction`
Target: `E-Hentai 浏览器 DEV`

## Mission
Run a bounded stabilization sweep focused on **real bugs**, especially regressions related to historical root causes.

The Agent may proactively detect, reproduce and fix bugs in this sweep, but it must not treat code smell or theoretical risk as a bug by itself.

A bug is actionable only when at least one of these is true:
1. a real DEV runtime scenario fails;
2. a deterministic invariant/check fails;
3. present code demonstrably violates a server/protocol/UI contract already established by EhViewer or this project;
4. a historical bug pattern is still present in current code and can be reproduced or proven reachable.

Do not perform speculative rewrites.

---

# 1. Historical bug families to replay

These families come from the retained 0.9/1.0 audit, later hotfixes and repeated project regressions. Do not blindly re-fix old commits; use them as regression targets.

## H1 — Account / Cookie / E↔Ex site state
Historical patterns:
- Safari bridge storage/capture failures;
- capture accidentally active outside explicit login flow;
- expired auth cookies treated inconsistently;
- account state and production request state diverging;
- E/Ex site change leaving stale cached/request state;
- DEV saying Ex is available while normal Ex browse returns 404.

Runtime replay:
- current real E session -> production-equivalent E browse/search;
- current real Ex session -> production-equivalent Ex browse/search;
- E -> Ex -> E switch, verify host/site generation/caches follow the active site;
- logout/account refresh must invalidate session-bound refs/caches.

Never output cookie values or private URLs.

## H2 — Deployment / wrong-code / stale-branch failures
Historical patterns:
- bootstrap/read task pointing at stale branch;
- DEV sync claimed successful while local code was from another branch/head;
- manifest/build marker mismatch.

Check:
- remote branch/head, `sync-manifest.json` and visible DEV build marker agree;
- bootstrap reads one immutable resolved head for a sync;
- never debug behavior before confirming the DEV build under test is the intended head.

## H3 — Async race / stale completion
Historical patterns:
- Home/Favorites/Discovery/account overview accepting stale request completion;
- site/account switch allowing old responses to overwrite new state;
- search failure leaving stale count/pagination.

Inspect/test current async screens:
- Discover/Home;
- Search/Results;
- Favorites/Library cloud state;
- Gallery Detail background preview/favorite state;
- Account status;
- AI search request state.

Look for request epoch/generation/site guards where overlapping requests are possible. Only fix when a stale overwrite is reachable/proven.

## H4 — Search parser / search state integrity
Historical patterns:
- broad anchors creating wrong gallery boundaries;
- stale pagination after failure;
- translated tag concepts not resolving to the real E-Hentai tag syntax;
- saved search state losing filters.

Runtime replay:
- ordinary search;
- translated Chinese multi-tag search;
- include + exclude conditions;
- category exclusion / advanced filters;
- search bookmark save -> reopen -> state equivalence;
- AI search -> validated normal `GallerySearchState` -> real results.

Verify no AI-generated URL bypasses the normal search core.

## H5 — Cloud Favorite state/mutation
Historical patterns:
- cache not invalidated after mutation;
- mutation trusted before server confirmation;
- Detail incorrectly considered an already-favorited gallery unfavorited;
- favorites list/detail state disagreement.

Runtime replay:
- read a real already-favorited gallery through the same favorite-state path as Detail;
- category name must match server state;
- Favorites list and Detail must agree;
- avoid destructive mutation unless a reversible test is explicitly chosen;
- if mutation is tested, verify server state after mutation before updating UI.

## H6 — Gallery Detail / preview inventory / resource parsing
Historical patterns:
- incomplete preview inventory entering Reader/download;
- duplicate sprite thumbnails caused by losing sprite coordinates;
- relations parsing broad fallback;
- Torrent false-positive `All` and later over-filtering;
- Archive/Torrent presence not matching actual server resource state.

Runtime replay:
- short gallery and 100+ page gallery;
- preview summary -> full Preview Browser;
- ensure unique preview pages/links/coordinates where sprite sheets are used;
- Reader/download gate only when required preview inventory is complete;
- known-positive Torrent/Archive gallery when available.

Do not spend time guessing Torrent behavior without a known-positive real gallery.

## H7 — Online image cache / Reader
Historical patterns:
- invalid HTML/error payload cached as an image;
- Reader progress written before successful image load;
- failed image retry changed page unexpectedly;
- online/offline progress divergence;
- tap zones / overlay state / zoom gesture runtime mismatch.

Runtime replay:
- online Reader page load -> next/previous through production core;
- failed image retry path if safely inducible;
- progress updates only after successful page/image state;
- offline Reader opens existing local files and updates the same logical progress;
- zoom state resets on page change;
- no permanent controls in immersive resting state.

Gesture feel remains user QA when reliable automation is unavailable.

## H8 — Download / offline storage recovery
Historical patterns:
- 31st task/capacity overflow;
- active worker deletion race;
- orphan `downloading` persisted across restart;
- partial preview inventory accepted as a download;
- offline manifest/file mismatch;
- page writes/deletes not recoverable.

Check current invariants and run only safe runtime cases:
- queued/downloading/paused/resumable state transitions;
- restart normalization;
- open incomplete offline task -> resume/recovery, not false-complete Reader;
- deletion waits for active worker / recoverable transaction state.

Do not create large downloads merely for QA.

## H9 — Library / history / bookmark / persistence
Historical patterns:
- saved-search write races;
- malformed primary storage not recovering from valid `.bak`;
- library navigation building multiple stack levels;
- iPhone narrow cards crushing metadata;
- management controls buried below long content.

Runtime/check replay:
- Library segment switches preserve state;
- open one gallery -> one Back returns to original Library segment;
- History/Bookmark/Download cards use correct metadata and identities;
- backup recovery deterministic checks for stores that support it;
- iPhone uses readable one-row gallery cards; iPad preserves intended grid.

Visual density remains user QA.

## H10 — UI error/notice/state separation
Historical patterns:
- normal success/notice shown as red error;
- empty error component construction causing startup/runtime issue;
- one action error overwriting unrelated Detail load state;
- raw sensitive URLs/paths leaking into UI errors.

Inspect shared error mapping and changed screens.
Runtime launch must have no startup exception.
Do not log raw server HTML, credentials or private paths.

## H11 — Navigation / presentation lifecycle
Recent repeated regressions:
- one gallery requiring multiple Back presses;
- account/category routes nested unexpectedly;
- sheet/overlay opening once then failing to reopen;
- toolbar action invisible under `TabView + NavigationStack`.

Runtime replay where automatable:
- root -> Library -> Detail -> Back = one level;
- root -> Account/Settings -> Back = one level;
- Reader settings/progress overlay may open/close/open repeatedly;
- required top actions are reachable without scrolling to the end.

Do not add manual `dismiss()` loops to hide a broken stack.

## H12 — AI Assistant / Tool boundary
New high-risk family:
- AI structured output bypassing local validation;
- Assistant Tool wrapper behaving differently from direct `runEhAction()`;
- opaque gallery refs failing across separate Assistant Tool invocations;
- sensitive data leaking in AI/tool output;
- provider/model accidentally requiring duplicate configuration.

Runtime replay using the real configured Scripting provider:
- AI Search prompt -> structured intent -> local resolution -> real search;
- actual Assistant Tool `search` -> returned opaque ref -> `gallery.detail`;
- read-only Favorites/History action;
- managed conversation launches without project-local API config;
- output contains no cookie, gid/token, private URL, rating credentials or raw HTML.

---

# 2. Current-code hotspot scan

After historical replay, perform a narrow source scan only for bug-prone patterns connected to the families above.

Inspect, but do not automatically rewrite, occurrences such as:
- raw network requests that bypass the central account/request layer;
- async screen loads without a request/site/session generation guard when overlaps are possible;
- fire-and-forget mutations whose UI updates before server confirmation;
- broad HTML anchor/regex fallbacks that can cross gallery/resource row boundaries;
- persisted state that uses `downloading`/temporary states without startup normalization;
- UI actions that depend on stale parser/cache state when an authoritative server state exists;
- repeated `NavigationLink`/presentation wrappers that can create one stack level per list child;
- bare browser globals (`confirm`, `prompt`) in native Scripting runtime;
- caught errors silently discarded on a user-visible production path;
- sensitive values interpolated into errors/logs/diagnostics;
- duplicate manual implementations of logic that already exists in `runEhAction`, account/network/parser/store cores.

A hotspot becomes a finding only after proving reachability/failure/invariant violation.

---

# 3. Autonomous fix loop

For each finding:

1. Assign ID `BS-01`, `BS-02`, ...
2. Record a short non-sensitive symptom and reproduction path.
3. Classify severity:
   - S0: credential/data-loss/security/privacy;
   - S1: core flow broken (login, browse, detail, Reader, Favorites, Download, AI tool);
   - S2: important state/navigation/recovery bug;
   - S3: visual/minor UX defect.
4. Trace the shared root cause before editing.
5. Apply the smallest fix.
6. Run TypeScript diagnostics.
7. Run one focused deterministic regression check when meaningful.
8. Run the exact real DEV runtime scenario again when automatable.
9. If it still fails, continue on the same finding; do not mark it fixed.
10. If it passes, mark `Runtime checked` for only that exact scenario.
11. Commit logical related fixes together.

If the same symptom survives two attempted fixes, stop patching local guards and re-trace the end-to-end path/reference behavior.

---

# 4. Runtime sweep order

Run in this order so foundational failures do not contaminate later results:

1. DEV build/head identity.
2. Startup exception-free launch.
3. E session and ordinary browse/search.
4. Ex session and ordinary browse/search.
5. E↔Ex switching/cache invalidation.
6. Search + translated tags + exclusions + bookmark restore.
7. Gallery Detail + preview summary/full browser.
8. Cloud Favorite real-state read.
9. Online Reader basic page path + progress/zoom state logic.
10. Library History/Bookmark/Download navigation one-push/one-back.
11. Download/offline safe state checks.
12. AI Search real provider -> real search.
13. Assistant Tool search -> detail -> Favorites/History read.
14. Torrent/Archive only with a known-positive real gallery.

Do not run destructive operations just to get a green result.

---

# 5. Stop conditions

This sweep is intentionally bounded.

Stop when:
- all S0/S1 findings discovered by the defined sweep are fixed or have a real external blocker;
- S2 findings on the exercised paths are fixed or recorded clearly;
- no new finding appears after one final pass through the affected runtime scenarios;
- remaining items are purely visual/gesture-feel/user-preference issues that cannot be reliably automated.

Do not keep expanding into unrelated new features.
Do not redesign UI for taste during this sweep.
Do not implement new EhViewer parity milestones.
Do not merge `main` automatically.

---

# 6. Final report

Keep the report compact:

- **Findings discovered:** `BS-xx` + severity + one-line symptom.
- **Fixed:** IDs + root-cause summary + commit(s).
- **Runtime checked:** exact real DEV scenarios actually executed.
- **Blocked:** exact capability/external-input blocker.
- **Needs user test:** only visual/gesture/subjective items.

Never claim the whole application is bug-free.
The correct outcome is: `defined Runtime Bug Sweep passed on the exercised paths`.
