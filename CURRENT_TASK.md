# CURRENT_TASK — 1.1.x User QA Fix Pass 2

Branch: `feat/1.1-gallery-interaction`  
Current user-tested head: `8c0b40a742e49deb5c40ffff1d0a25a968cb5d37`

## User runtime truth

The user has tested the previous Stability + UI pass on a real device.

### Confirmed fixed — do not touch

- **Preview thumbnails are fixed.**
- Shared sprite previews now render correctly on the user's device.
- Do not reopen preview/parser/cache work unless a new preview bug is reported.

### Still broken

1. **P0 Safari Cookie helper is not appearing at all.**
   - After opening the E-Hentai login page in Safari, the expected lower-left Cookie helper button does not appear.
   - Because the UI never appears, do **not** start by changing cookie parsing, expiry, domain, Keychain, or validation again.
   - First prove whether `browser.tsx` is actually being built/injected by Scripting Safari Browser Scripts.

2. **P0 Navigation stack is wrong.**
   - From the login/account screen, Back returns to **Library** first, then another Back returns to Home.
   - Expected: Account/Login opened from Home must return directly to Home.

STOP adding new feature families. Fix only these two runtime bugs, then hand back to the user.

## Development contract

- User runtime evidence overrides passing tests.
- Trace the actual root cause before editing.
- TypeScript diagnostics + one focused check only when useful.
- No full regression, release audit, long acceptance, or repeated bootstrap ritual.
- Commit/push and report **Implemented · needs user test**.

---

# Fix A — P0 Safari Browser Script injection / permission

## Important distinction

The failure occurs **before Cookie acquisition**: the Cookie helper UI is absent.

Therefore do not spend this pass tuning:
- `sanitizeCookies()`;
- expiry conversion;
- domain/path matching;
- draft selection;
- Keychain validation.

Those paths cannot run successfully until the Safari browser script itself executes.

## Official Scripting behavior to verify

Use the current official Scripting **Safari Browser Scripts** documentation as the source of truth.

Relevant platform facts:
- Safari Browser Scripts are a **PRO** feature.
- a project-level `browser.tsx` is built to `browser.js`;
- browser userscripts run through the Scripting Safari Web Extension;
- the Scripting extension must be enabled/allowed for the current website;
- `GM.cookie` and `Scripting.FileManager` require their declared grants;
- installed/active browser scripts can be inspected from Scripting's Safari Browser Scripts development tooling / extension UI.

Do not invent a custom browser injection mechanism before checking the platform contract.

## Trace in this order

1. Confirm DEV bootstrap places `src/browser.tsx` at the **root of the local Scripting project as `browser.tsx`**.
2. Confirm the local DEV project build actually produces/activates the browser-script entry expected by Scripting.
3. Confirm current userscript metadata still matches:
   - `https://e-hentai.org/*`
   - `https://*.e-hentai.org/*`
   - `https://exhentai.org/*`
   - `https://*.exhentai.org/*`
4. Confirm required grants are valid for the current Scripting runtime.
5. Check whether Safari extension/site access is the real blocker.

## If Safari permission/enablement is required

This is a platform permission and cannot be truthfully "fixed" by changing cookie parser code.

Make the Account login UX explain the prerequisite **before/when opening Safari**, in concise Chinese:
- Scripting Safari extension must be enabled;
- website access for E-Hentai/ExHentai must be allowed;
- then reload/login and use the Cookie helper.

Do not claim the app can bypass Safari extension permission.

If there is a supported Scripting API/official mechanism to surface or install/activate the project's browser script, use that. Otherwise keep the project-level `browser.tsx` approach and provide the minimum setup guidance.

## Browser helper robustness

Only after injection is confirmed:
- ensure the helper visibly mounts on matched pages;
- preserve `GM.registerMenuCommand` as a secondary fallback entry;
- add missing `@connect` rules only if official Scripting semantics require them for the actual cross-origin cookie calls used;
- do not add unrelated credential fallbacks.

## Focused evidence

Do not simulate Safari acceptance. A static/metadata check is enough if code changes are non-trivial. The user will verify whether the helper appears.

---

# Fix B — P0 Navigation stack root cause

## Runtime behavior

Observed:

`Home → Account/Login → Back → Library → Back → Home`

Expected:

`Home → Account/Login → Back → Home`

## Likely root cause to inspect first

Current Home UI groups multiple `NavigationLink`s inside the same `VStack` / List row, including the `我的内容` section containing both:
- Library
- Account/Login

In native SwiftUI/Scripting list navigation, multiple navigation destinations embedded in one aggregate row can produce ambiguous/unintended navigation behavior.

Do not patch the Back button. Fix the source navigation structure.

## Required structure

For ordinary navigation lists:
- one semantic navigation destination per List row;
- do not place multiple unrelated `NavigationLink`s inside one `VStack`, `HStack`, `GlassSurface`, or other single List row;
- flatten Home `我的内容` so Library and Account/Login are independent rows;
- inspect other recently grouped navigation sections (especially Home Discover and Library sections) for the same pattern and flatten only where the same ambiguity exists.

Preserve the current visual hierarchy as much as possible. This is a navigation correctness fix, not another UI redesign.

## Acceptance handed to user

After the fix the user only needs to test:
1. Home → Login/Account → Back returns directly to Home.
2. Home → Library → Back returns directly to Home.

---

# Preserve

- Preview fix at `8c0b40a...`.
- Existing Cookie normalization / newest-draft / validate-before-overwrite behavior unless direct evidence shows a separate bug.
- Existing Gallery/Reader/download/search features.
- User-QA workflow.
- Private repository and authenticated GitHub API workflow.

# Final handoff

After A+B are implemented:
- push to `feat/1.1-gallery-interaction`;
- no new features;
- no full regression campaign;
- report only:
  - **Fix:** Safari browser-script path/permission UX + navigation stack;
  - **Commit:** SHA;
  - **Checks:** diagnostics + any focused check;
  - **Please test:** Cookie helper appears; Account Back goes directly Home.

Stop after that and wait for user feedback.
