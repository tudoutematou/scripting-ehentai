# CURRENT_TASK — 1.1 Runtime Bug Sweep

Branch: `feat/1.1-gallery-interaction`
Primary spec: `BUG_SWEEP_1_1.md`
Findings registry: `BUG_SWEEP_FINDINGS.md`

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
