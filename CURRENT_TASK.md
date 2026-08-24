# CURRENT_TASK — 0.7 Feature Gap Sweep

Branch: `feat/0.7-feature-gap-sweep`
Base: accepted 0.6 head `739be76bc8c51d097afa4086a04bfaeb12de5984`
Reference: `xiaojieonly/Ehviewer_CN_SXJ` branch `BiLi_PC_Gamer`.

Read `AGENTS.md` first. This is the **last feature-gap sweep before UI/UX consolidation**. Do not turn 0.7 into a stabilization round and do not spend the package polishing already-working screens unless a defect blocks the new capability.

## Runtime / session rules
- Keep the stable local `E-Hentai 浏览器` untouched.
- Continue using the separate `E-Hentai 浏览器 DEV` script and keep it synced with this branch.
- Real Scripting DEV launch is required for each logical package's main path.
- A package may span multiple Agent conversations. Repository state is authoritative; conversation history is not.
- Before automatic context compression becomes likely: finish active tool calls, commit/push completed work, update `DEV_PROGRESS.md` with current head + next step, then stop the session. Resume from GitHub in a fresh conversation. Never rely on a compressed/broken tool-call chain.

## Preserve
Do not regress the accepted 0.6 families:
- Home/Search/Filter/Detail/Reader/Account;
- E + Ex routing;
- cloud Favorites + note, History/Continue, Quick Search;
- Watched, Toplists, My Tags read/browse;
- single + bounded continuous Reader and current-image retry;
- foreground resumable Downloads + offline Reader;
- safe storage/manifest recovery, bounded requests, sanitized diagnostics;
- opaque short-lived `galleryRef` AI boundary.

Never expose Cookie, password, apiuid/apikey, gallery/page token, full sensitive URL, search text, user comment text, private local path, or full HTML.

## Development mode
Work continuously:
`inspect existing path -> compare matching EhViewer behavior -> implement smallest reusable path -> focused test -> real DEV run -> commit -> continue`.

Fix immediately only startup/runtime blockers, privacy/data-loss/security issues, destructive wrong writes, or defects that make the newly claimed feature unusable. Record ordinary polish/edge bugs for 0.9 stabilization.

# 0.7 capability targets

## 1. Popular + account overview
These are confirmed first-class EhViewer/E-Hentai destinations and are absent from the current app.

### Popular
- add native `Popular` entry using current E/Ex base URL and the existing gallery-list request/parser/UI path;
- pagination/detail navigation must reuse existing Results/Detail behavior;
- no second gallery parser.

### My Home / account overview (read-only)
Use `home.php` only for small useful status, not a full website clone.
Attempt to parse and show:
- image-limit current/limit;
- reset cost when present;
- a small set of clearly exposed account overview values only if cheap and stable.

Do **not** implement reset-image-limit, torrent-key reset, GP/Hath exchange, moderation or other destructive/economic actions in 0.7.

Add realistic fixtures and sanitized errors.

## 2. Local Bookmarks / Local Favorites
EhViewer has local favorite/bookmark storage; current app only has cloud Favorites/History.

Implement one small local bookmark system:
- add/remove bookmark from Gallery Detail;
- Library entry with newest-first list;
- reopen existing Detail;
- delete one / clear all with confirmation;
- versioned local storage with the same safe read/write principles already used by History/Settings/Downloads;
- E/Ex identity must remain correct;
- do not mix or pretend-sync with cloud Favorites.

No folders/tags/cloud sync unless they fall out nearly free; one useful local list is enough for 0.7.

## 3. Gallery relationship and discovery navigation
Extend existing Detail/search rather than adding a new scene stack.

Where the actual page exposes a verified target, attempt:
- uploader -> existing search/results flow;
- parent / newer-version / gallery-version relationship -> existing Detail;
- useful category/tag navigation already represented by current search state;
- safe `Open in Safari` for the current gallery if native `Safari.openURL` is already verified.

Do not expose full gallery URLs through AI or diagnostics. Manual UI may open the current gallery URL because that is the user's explicit action.

If a relation is not present in the page, simply omit the control.

## 4. Advanced search completion
Compare current `GallerySearchState` with EhViewer's `ListUrlBuilder` / current E-Hentai URL parameters and add only high-value options that map cleanly to one request path.

Prioritize, if verified by current URL behavior:
- minimum rating;
- page-count bounds;
- torrent-related search flag;
- show/allow expunged or other directly supported advanced flags;
- multi-tag/raw advanced query without breaking existing translated tag navigation.

Do not make a giant filter screen. Add only options that materially improve search and are actually wired into the builder.

Each added option gets one deterministic URL-builder check.

## 5. Reverse image search — attempt once
EhViewer exposes image search. Attempt it only if current Scripting typings/runtime provide a clean native file/photo picker and the E-Hentai upload form/multipart request can be verified.

If feasible:
- pick one local image explicitly by user action;
- upload through the verified form/request;
- feed results into the existing gallery-list/results flow;
- never persist the selected image or upload path in diagnostics/AI.

If native picker or multipart/form behavior is unreliable after one minimal probe, record `PLATFORM_GAP` and move on. No custom picker or upload framework.

## 6. Safe external destinations
Add only small read/open shortcuts that are useful and already clear in E-Hentai/EhViewer, for example:
- News;
- Forums/Wiki;
- My Uploads / Torrents if a stable authenticated URL is directly available.

Prefer `Safari.openURL` over building native replicas. Do not spend significant code on these links.

## 7. Final parity triage for handoff to 0.8
After targets 1-6, inspect the current EhViewer primary navigation / practical daily-use features once and classify every remaining meaningful gap:
- `HIGH_VALUE_FEASIBLE` — implement before ending 0.7;
- `PLATFORM_GAP` — Scripting/iOS limitation or unsafe/unverified endpoint;
- `LOW_VALUE_DEFERRED` — Android-only, moderation/admin/economic/niche behavior, or not worth owning.

Do not mechanically port background services, Android SAF/notifications/VPN/system hooks, gesture engines, H@H administration, GP/Hath economy actions, moderation/tag-voting/expunge workflows, or every preference.

## Typed AI boundary
Only add structured read-only actions if a new 0.7 feature clearly benefits from them. Local bookmarks, account overview, or Popular do not automatically need AI actions.

Never add cloud mutation, local deletion, image upload, rating/comment, or bookmark mutation through AI just for parity.

# Verification
For each logical package:
- TypeScript diagnostics;
- one focused deterministic check for new parser/builder/store logic;
- relevant existing smoke test;
- real `E-Hentai 浏览器 DEV` launch/path proving the new main capability.

At the end of 0.7 run the existing full harness once:
- `src/runSelfTests.ts`;
- `src/runActionSmoke.ts`;
- `src/runAssistantToolSmoke.ts`;
- `src/runNetworkSelfTest.ts`;
- focused new 0.7 checks.

Automated tests must not perform real cloud writes, image-limit resets, economic/account actions, or delete real user data.

# Completion
0.7 stops only when:
1. targets 1-6 have all been attempted;
2. all remaining `HIGH_VALUE_FEASIBLE` items from target 7 are implemented;
3. unresolved items are explicitly `PLATFORM_GAP` or `LOW_VALUE_DEFERRED`;
4. DEV script launches and major new 0.7 families are reachable;
5. no startup/privacy/data-loss/destructive-write blocker is known.

Then freeze features and report one compact checkpoint. **Do not begin UI redesign inside 0.7.** The planned next phase is 0.8 UI/UX consolidation, followed by 0.9 stabilization and then 1.0 release candidate/promotion.

## Report
- completed 0.7 capabilities;
- DEV runtime result;
- tests;
- final head SHA;
- PLATFORM_GAP / LOW_VALUE_DEFERRED list;
- deferred non-blocking bugs;
- at most 3-5 human-only acceptance flows.
