# DEV_PROGRESS — 0.9 Stabilization RC

Branch: `feat/0.9-stabilization`  
DEV target: isolated `E-Hentai 浏览器 DEV` (`0.9.0-rc-dev`)

## RC status — 2026-08-26

- **S0:** A-01, A-02 fixed.
- **S1:** A-03 through A-08 fixed. Independent final review also fixed image-cache HTML/invalid-payload poisoning, unconfirmed Favorite mutation feedback, preview-thumbnail Reader gate bypass, and partial-inventory download creation. **No known open S0/S1.**
- **S2:** practical code-backed consolidation complete: session/account lifecycle, stale requests, Watched paging, Toplists identity/rank, parser relations, monotonic reader/offline progress, download recovery/reconciliation plus complete-inventory enforcement, storage backup recovery, destructive confirmations, and safe UI errors.
- **Deferred with explicit evidence requirement:** A-28 narrow/Dynamic-Type layout and A-30 iPad readable-width behavior. No unsupported layout rewrite was made.
- **A-09 partial/deferred:** expired Cookies are filtered at the shared boundary; the remaining stored-credential versus server-validated-session presentation distinction requires product semantics/runtime evidence and is deferred post-1.0.

## Final verification

- TypeScript diagnostics: **0 diagnostics**.
- `src/runSelfTests.ts`: **all 55 executed checks passed** (including final-review inventory-gate and monotonic-reader-progress regressions).
- `src/runActionSmoke.ts`: **passed**; live search -> Detail Core and invalid gallery-ref rejection behaved correctly.
- `src/runAssistantToolSmoke.ts`: **passed**; live typed search returned 20 gallery summaries.
- `src/runNetworkSelfTest.ts`: **passed** after final-review fixes; live Search -> Detail Core -> Image Page completed, with all deterministic checks green.
- Live Toplists structural probe: HTTP 200, 40 Gallery links; `tdo` list containers and `pso` rank cells verified. Dedicated parser now retains per-list identity/time range (for example All-Time/Past-* labels) and rank.
- DEV launch: isolated `E-Hentai 浏览器 DEV` remained active through the 25-second CLI observation window with no startup exception output; CLI timeout is expected for its persistent interactive UI session.

## Freeze boundary

- Stable local `E-Hentai 浏览器` remains untouched.
- This branch is a DEV RC only: do not merge/promote or overwrite the stable script without explicit 1.0 release instruction.
- Temporary inspection/repair scripts were deleted and are not part of the sync.
