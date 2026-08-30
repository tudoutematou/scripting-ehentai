# CURRENT_TASK — 1.1 Runtime Bug Sweep

Branch: `feat/1.1-gallery-interaction`
Primary spec: `BUG_SWEEP_1_1.md`
Findings registry: `BUG_SWEEP_FINDINGS.md`
Parity reference: `EHVIEWER_PARITY.md`

## Goal
Freeze new feature work temporarily and run one bounded **autonomous bug-fix sweep** over the current DEV build.

The Agent is explicitly authorized to:
- inspect historical bug records for regression clues;
- reproduce bugs using the real `E-Hentai 浏览器 DEV` runtime when possible;
- create `BS-xx` findings only for reproduced/proven failures;
- fix those findings at the shared root cause;
- rerun the exact failing runtime path until it passes or a real blocker is identified.

The Agent is **not** authorized to redesign the app, start new EhViewer parity milestones, or add unrelated features during this sweep.

Do not merge `main` automatically.

## Immediate priority — BS-11 / BS-12 account login loop
The user supplied fresh iPad real-device evidence on 2026-08-30. Treat it as authoritative and fix these before resuming lower-priority sweep items.

### BS-11 — import should not throw the user out of Account; selected site must not look unavailable
Current proven flow:
- browser Cookie import validates E-Hentai successfully;
- `saveAndValidateCookieDraft()` unconditionally calls `setActiveSite("e")`;
- `setActiveSite()` invalidates account/session generation and triggers the global account-context callback;
- `ResponsiveShell` remounts; on regular-width iPad `RegularShell.selected` defaults back to `discover`;
- returning to Account shows E as `可用`, but the E button is grey because the UI disables the already-selected site; Ex is grey because it is genuinely unavailable. These two different states look identical.

Required fix:
1. importing/refreshing credentials must not change the selected root sidebar destination merely because account/session data changed;
2. do not reset the active site to E unless the current site is no longer valid or the user explicitly chooses E;
3. decouple shell refresh/cache invalidation from root-navigation selection state;
4. render site states distinctly:
   - current + available = visibly selected, not visually "unavailable";
   - other + available = tappable;
   - unavailable = disabled with a clear reason/status;
5. after login import, remain on `账号与设置` and show the verified result there.

Required real DEV runtime smoke:
- Account -> Safari E login/capture -> return -> `导入并验证登录状态`;
- Account remains visible after success;
- E shows available/current distinctly rather than disabled-grey-as-error;
- if Ex is unavailable, only Ex is visually unavailable;
- repeat Refresh without root navigation jumping to Discover.

### BS-12 — real ExHentai Cookie acquisition must be a complete flow
Do not assume a normal E-Hentai page capture can read Ex cookies.

Reference/current architecture facts:
- browser helper's `document.cookie` is only same-origin reliable;
- cross-domain E/Ex discovery currently depends on `GM.cookie.list({url})`, whose availability/behavior must be proven in this Scripting Safari environment;
- Android EhViewer uses an OkHttp persistent CookieJar and receives cookies from actual network responses, so it does not rely on scraping one browser origin;
- current app correctly requires real Ex-domain `ipb_member_id`, `ipb_pass_hash`, and structurally valid `igneous` before declaring Ex ready. Do not weaken that rule and do not clone E cookies into Ex as a fake solution.

Required diagnosis/fix:
1. with the current user's already-valid account, inspect only cookie-name/domain presence booleans — never values;
2. while on an E page, determine whether `GM.cookie.list` can really see the required Ex-domain cookies;
3. if not, make `同步里站登录` a clean guided second step:
   - open real `https://exhentai.org/`;
   - user confirms Safari can enter it;
   - Cookie helper captures the actual Ex-origin session there;
   - return to Account and import/merge without losing the working E cookies;
   - validate Ex using the exact production request path;
4. if current Scripting/Safari APIs can safely obtain Ex cookies automatically after E login, use that only when runtime evidence proves it; otherwise keep the explicit Ex sync flow truthful;
5. successful Ex sync should leave the user on Account and make Ex available/tappable without requiring app restart.

Required safe runtime result:
Report only booleans such as `E member/pass present`, `Ex member/pass present`, `Ex igneous valid`, `Ex production validation passed`; never report cookie values or private URLs.

Do not start new parity features (UConfig/blacklist/share/etc.) until BS-11 and BS-12 are fixed or have a genuine platform blocker.

## Read order for this task
1. `AGENTS.md`
2. this `CURRENT_TASK.md`
3. `BUG_SWEEP_1_1.md`
4. `BUG_SWEEP_FINDINGS.md`
5. current relevant source files
6. historical records below only as regression clues:
   - `STABILIZATION_AUDIT.md`
   - `DEV_PROGRESS.md`
   - `RELEASE_CHECKLIST.md`
7. narrow EhViewer/current Scripting docs only when a reproduced bug requires reference behavior/API confirmation.

For this task only, reading the archived historical records above is explicitly authorized. They are **not** acceptance checklists and must not trigger a ceremonial whole-repo audit by themselves.

## First gate — prove the DEV build under test
Before debugging behavior:
- resolve the current remote head of `feat/1.1-gallery-interaction`;
- confirm the isolated DEV sync/build marker corresponds to the intended head;
- if the DEV build is stale, fix/sync that first and do not misdiagnose old code as a current bug.

Historical branch/bootstrap mismatch has happened before, so this is mandatory.

## Sweep mode
Follow `BUG_SWEEP_1_1.md` in its defined runtime order.

Prioritize:
1. S0 privacy/data-loss/credential issues;
2. S1 broken core flows;
3. S2 state/navigation/recovery regressions;
4. S3 only when it is a clear functional UX defect, not subjective styling.

Recent/new code deserves extra attention because regressions often cluster there:
- E/Ex session and site switching;
- Liquid Glass action wrappers only for runtime breakage, not visual taste;
- Reader state/zoom/navigation;
- cloud Favorite state;
- AI Search / managed Assistant / Assistant Tool;
- Library/navigation changes.

## Autonomous fix contract
For each real finding:
1. create/update one row in `BUG_SWEEP_FINDINGS.md` as `BS-xx`;
2. record only a short non-sensitive reproduction;
3. trace the actual production path;
4. fix the smallest shared root cause;
5. TypeScript diagnostics;
6. one focused deterministic regression check when meaningful;
7. rerun the exact real DEV runtime path when automatable;
8. do not mark fixed if runtime still fails;
9. update the row to `runtime checked`, `blocked`, or `needs user gesture/visual test`;
10. continue to the next defined sweep family.

If one symptom survives two attempted fixes, stop adding local guards and re-trace the full end-to-end flow/reference behavior.

## Runtime QA rules
Real runtime is preferred over fixtures whenever the affected path can be executed safely.

Use:
- current real E/Ex session for account/network bugs;
- real search/detail/favorite production cores;
- current configured Scripting AI provider for AI bugs;
- actual Assistant Tool wrapper, not only direct `runEhAction()`;
- small/reversible state checks for Library/Download/Offline.

Do not perform destructive operations merely for QA.
Do not expose Cookie values, gid/token, private URLs, raw HTML, favorite notes, AI credentials, filesystem paths or rating credentials.

Visual quality and gesture feel remain user QA when reliable automation is unavailable.

## Stop conditions
Stop the sweep when:
- all S0/S1 findings discovered by the defined sweep are fixed or genuinely blocked;
- discovered S2 findings on exercised paths are fixed or clearly recorded;
- one final rerun of the affected runtime paths produces no new actionable finding;
- remaining issues are only subjective visual/gesture/device-specific observations that the Agent cannot reliably automate.

Do not claim the application is bug-free.
Report only that the **defined Runtime Bug Sweep passed on the exercised paths**.

## Final handoff
Keep it short:
- **Findings:** `BS-xx` + severity + symptom.
- **Fixed:** IDs + root-cause summary + commit(s).
- **Runtime checked:** exact real DEV paths actually executed.
- **Blocked:** exact external/runtime limitation.
- **Needs user test:** only visual/gesture/subjective checks.

Sync isolated DEV once at the final sweep head, then stop.