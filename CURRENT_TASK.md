# CURRENT_TASK — Final Combined Batch: Stabilize + AI Assistant 1.0

Branch: `feat/1.1-gallery-interaction`
Companion spec: `AI_ASSISTANT_1_0.md`

## Goal
The user has authorized a larger Sol pass. Execute continuously instead of stopping after every small item.

**Order is mandatory:**
1. fix current real-device regressions first;
2. finish the already-approved micro polish;
3. then implement AI Assistant 1.0 from `AI_ASSISTANT_1_0.md`;
4. diagnostics + focused checks;
5. **run short targeted real DEV runtime smoke for the affected production paths**;
6. fix failures found by that runtime smoke;
7. sync isolated DEV once and stop for final user experience checks.

Do not merge `main` automatically.

## Development style
- inspect current code before modifying;
- consult current Scripting docs for APIs that changed or are newly available;
- reuse existing network/parser/search/library/Reader/AssistantTool cores;
- root-cause fixes only; no architecture rewrite;
- do not perform a long whole-product acceptance run;
- **for bug fixes, real DEV runtime verification is required when the affected production path can be executed from Scripting**;
- user remains authoritative for visual quality, gesture feel and other behavior the Agent cannot reliably automate/observe.

## Runtime verification rule for this batch
Do not stop at fixture/self-test PASS when a real production path is available.

Use the current `E-Hentai 浏览器 DEV` runtime, real current Keychain/session/network and the user's configured Scripting AI provider where the bug depends on them.

The runtime smoke should be short and targeted — normally a few minutes for the changed paths, not a broad release certification.

Required principles:
- exercise the same production core/action used by the visible UI;
- do not create a separate fake QA implementation;
- do not log or expose credentials/private URLs/HTML;
- if a runtime check fails, fix the direct root cause and rerun only that failing scenario;
- if a gesture/visual interaction cannot be automated reliably, report that boundary honestly and hand only that item to the user.

---

# A — Fix ExHentai 404 before AI work

## Real-device evidence
The same account can access ExHentai in Safari/EhViewer, but this app can report both E-Hentai and ExHentai as `可用` and then show a 404 when actually entering/using the Ex site.

Do not assume the cause. Trace the first failing app request and distinguish:
1. exact Ex-domain Cookie/session mismatch;
2. stale E-Hentai URL/cache/state surviving site switch;
3. production request path differing from the `validateSite("ex")` probe.

## Required investigation/fix
- compare `refreshAccountStatus()/validateSite("ex")` with the exact request options used by normal Ex browse/search/detail;
- the same Cookie-header builder/request semantics must be used for validation and production;
- for an Ex request, inspect only safe booleans/name presence for `ipb_member_id`, `ipb_pass_hash`, `igneous` — never values;
- treat empty/`mystery`/`null`-like igneous as not a valid Ex session;
- if Safari bridge currently captures only the E-Hentai domain, add a real Ex-domain capture/merge flow:
  - Browser Script must be allowed on `exhentai.org`;
  - when Ex sync is needed, open the real Ex site in Safari and capture cookies that Safari actually has for Ex;
  - merge valid E + Ex cookie records into Keychain without dropping the working E session;
  - do not blindly clone cookie values across domains as a substitute for real capture;
- expose one clear action such as `同步里站登录` only if automatic capture cannot be made reliable;
- after import/sync, validate Ex with the exact production header/path before enabling/confirming the Ex selector.

## Site-switch correctness
- changing E/Ex invalidates relevant gallery/search/detail caches;
- a gallery/result object created under E must not cause a stale E route/token/host to be used as if it were an Ex result after switching;
- if current code reuses stale screen state, reset/reload the active root scene on site change with the smallest fix.

## Safe diagnostics
If needed, show only:
- `statusCode`;
- `finalHost`;
- route kind (`home/search/detail`);
- auth cookie-name presence booleans;
- whether igneous is structurally valid.

Never output Cookie values, gid/token, private URL/path or HTML.

Focused check:
- valid E-only session does not falsely pass Ex readiness;
- valid Ex session passes production-equivalent validation;
- site switch invalidates stale session/cache generation;
- no 404 caused by stale base host in a deterministic URL helper test.

### Required real DEV runtime smoke
After the fix, using the current imported account/session:
1. run the same production-equivalent Ex request path used by normal browsing;
2. verify it does not return the previous 404;
3. perform one real Ex browse/search request through the normal production core;
4. report only status/route/host-safe facts.

Do not report ExHentai fixed solely because a synthetic Cookie fixture passes.

---

# B — Replace fake glass with real Scripting Liquid Glass

## Current cause
`src/GlassUI.tsx` currently implements `GlassSurface/GlassActionButton` with `thinMaterial + shadow`. This is older frosted material, not native iOS 26 Liquid Glass.

Current Scripting supports real Liquid Glass through:
- `glassEffect`;
- `UIGlass`;
- `GlassEffectContainer`;
- button styles `glass` / `glassProminent`.

Consult current official typings/docs before coding.

## Required visual behavior
- actual tappable action buttons use true Liquid Glass on supported runtime;
- primary action (`开始阅读/继续阅读`) uses `glassProminent` or equivalent native prominent glass;
- secondary actions (`云端收藏/收藏分类`, `下载离线`, `本地书签`) use native `glass`;
- `关联内容` action group and `资源` action group use framed glass actions inside a restrained shared glass container/surface;
- use `GlassEffectContainer` for related nearby actions where it improves native rendering;
- avoid deeply nested glass effects;
- do not turn metadata/tag/comment/preview content into buttons;
- keep iPhone labels readable; wrap/stack rather than compress.

If the API needs a compatibility fallback on older OS/runtime, preserve a minimal `thinMaterial` fallback, but current iOS/iPadOS should visibly use native Liquid Glass.

Focused check:
- `GlassActionButton` no longer renders the supported-runtime path solely through `thinMaterial`;
- primary/secondary disabled states still work;
- action behavior is unchanged.

### Runtime boundary
Launch the real DEV Detail screen to ensure the new glass components render without runtime errors and all actions remain tappable. Visual quality/appearance still needs user judgment; do not claim the glass looks correct based on code inspection alone.

---

# C — Finish Reader pinch zoom + pan

Use current Scripting native `MagnifyGesture` + `DragGesture` for online and offline **single-page** Reader.

Required:
- pinch ~1x–4x;
- pan while zoomed;
- reset zoom/translation on page change;
- meaningful zoom suppresses accidental left/right page-turn taps;
- no permanent zoom toolbar;
- progress/settings overlays remain usable;
- continuous vertical mode need not receive the same implementation if it would break scrolling.

Focused checks only: scale clamp, reset, page-turn suppression, online/offline parity.

### Runtime boundary
Open a real online Reader page and an offline Reader page in DEV and confirm they load through the new Reader path without runtime exceptions. If Scripting exposes reliable gesture automation, exercise pinch/pan; otherwise leave gesture feel/accuracy to user QA and say so explicitly.

---

# D — Finish Cloud Favorite server-state parity

Server favorite popup state is authoritative.

Required:
- already-favorited gallery shows the real category name, e.g. `♥ 性转`;
- unfavorited gallery shows `♡ 云端收藏/添加收藏`;
- do not ask the user to type `0–9`;
- clicking opens a native category-name chooser;
- current category is selected;
- existing favorite exposes `移除收藏` separately with confirmation;
- category change/remove updates Detail only after server verification;
- keep local bookmark independent.

Load lightweight favorite state asynchronously even when cached `detail.isFavorited` says false, so stale detail parsing cannot force the add path.

Preserve note support without forcing a note prompt on every category change.

Focused checks: popup selected category/name/options/note parsing and mutation mismatch rejection.

### Required real DEV runtime smoke
Use a real gallery that is already in a known cloud category:
1. call the same production favorite-state path used by Detail;
2. confirm the real category name is returned;
3. open the Detail state through the normal production core and confirm it resolves to favorited instead of the add path.

Do not mutate/remove the user's real favorite during automated QA unless using a clearly reversible operation and the task requires it. UI chooser appearance/removal confirmation can remain user QA.

---

# E — AI Assistant 1.0 (authorized now)

Read and follow `AI_ASSISTANT_1_0.md` as the detailed contract.

## E1 — In-app AI Search (primary daily-use AI)
Add `✨ AI 搜索` to the Discover/Search Composer area.

Flow:
1. native prompt receives a natural-language search request;
2. `Assistant.requestStructuredData()` converts it to a strict structured intent;
3. omit provider/model options so Scripting's currently configured provider/model is reused;
4. model output is treated as untrusted;
5. use existing full EhTagTranslation/local tag index + current normalizers to resolve Chinese concepts into real tags/categories/language/advanced values;
6. produce one normal `GallerySearchState`;
7. open the existing normal Results view;
8. existing Search Bookmark can save/reopen the AI-generated search.

Examples that must be useful:
- `中文女性性转，30到80页，排除AI生成`
- `同人志，最低4星，中文，页数不要超过100`
- `找巨乳和汉语，同时排除Cosplay`

Do not let the model directly construct an E-Hentai URL.
Do not invent unresolved tags.
Ambiguous Chinese terms should produce multiple candidates/chooser rather than random selection.

### Required real DEV runtime smoke
Use the user's configured Scripting AI provider for one real prompt, for example:
`中文女性性转，30到80页，排除AI生成`

Then:
1. obtain structured intent from the real Assistant provider;
2. validate/resolve through the local tag/search layer;
3. execute the resulting real normal search core;
4. confirm a valid results response or a truthful no-results state;
5. ensure no private credentials/URLs appear in AI/tool output.

Do not substitute a hard-coded structured fixture for this runtime smoke.

## E2 — Managed in-app AI Assistant
Add `💬 AI 助手` beside/near AI Search without cluttering normal search.

Use:
- `Assistant.startConversation()`;
- `Assistant.present()`.

Important:
- **do not pass a custom `systemPrompt`**, because Scripting disables Assistant Tools when one is supplied;
- omit `provider/modelId` to reuse Scripting settings;
- handle an already-active conversation gracefully;
- no API-key/model configuration page inside this project.

Runtime check: start/present one real managed conversation in DEV and ensure the entry path works without asking for a second API configuration. Conversation quality remains user QA.

## E3 — Scripting Agent compatibility
Upgrade the existing `assistant_tool.json` + `assistant_tool.tsx` from search-only into an E-Hentai browser tool that dispatches through `runEhAction()`.

Agent read capabilities for AI 1.0:
- `account.status`;
- `search`;
- `gallery.detail`;
- `favorites.list`;
- `history.list`.

Use an explicit action enum + validated action-specific params.
Keep opaque `galleryRef` boundaries.

Verify whether AssistantTool invocations share module memory. If they do not, make follow-up `gallery.detail` refs work using the smallest private short-lived TTL mechanism supported by Scripting (local/private only, max bounded, session-generation invalidation, no logs/cloud sync). Do not expose URLs to solve the lifecycle problem.

Write operations are optional in this batch. Only add them if they reuse existing core cleanly and require explicit approval. Do not delay the read/search assistant path for writes.

### Required real DEV runtime smoke
Invoke the actual Assistant Tool entry with at least:
1. one real `search` action;
2. one follow-up `gallery.detail` using the returned opaque ref;
3. one read-only `favorites.list` or `history.list` action.

Confirm outputs are usable and redacted. Do not declare Agent compatibility complete based only on a direct `runEhAction()` call that bypasses the Assistant Tool wrapper.

## E4 — Gallery Detail `✨ 问 AI`
After E1–E3 work, add a small secondary action if it fits cleanly.

It may start managed chat with safe current-gallery metadata:
- title/titleJpn;
- category/uploader;
- rating/page count;
- safe tag labels;
- optionally short sanitized comment text.

Never send gallery/page URLs, gid/token, Cookie or rating credentials.

Useful requests:
- `找类似这个的，但排除 AI generated`
- `总结这个画廊主要标签`
- `这个作者还有哪些中文作品`
- `评论大概在说什么`

## E5 — Explicit AI 1.0 exclusions
Do NOT add:
- manga OCR;
- page-image understanding;
- speech-bubble retypesetting;
- real-time manga translation overlays.

Text-only title/comment translation or summarization is optional after core AI search/chat works.

---

# F — Torrent remains a bounded known QA item

Do not spend this large AI batch repeatedly guessing Torrent behavior.
Only continue if a gallery known to contain a real torrent is available.
Preserve structural parser rules, no `All`, no generic anchor fallback, safe counts only.

If a known-positive gallery is available, run the real authenticated production parser path rather than a fixture-only check.

---

# Privacy rules
Never log/store/send to AI:
- Cookie values;
- password/member/pass-hash/igneous values;
- full gallery/page URLs or gid/token;
- rating apiuid/apikey;
- raw HTML;
- private favorite popup HTML;
- private filesystem paths.

AI Search user prompt/search text necessarily goes to the user's configured Scripting model only when the user invokes AI; keep normal browsing non-AI.

Runtime-QA reports must obey the same privacy boundary.

---

# Execution order
1. Inspect current head + current Scripting APIs.
2. Reproduce/fix ExHentai production 404.
3. Replace supported-runtime action styling with true Liquid Glass.
4. Finish Reader zoom/pan.
5. Finish Cloud Favorite state/category UI.
6. Implement AI Search structured intent -> normal SearchState.
7. Implement in-app managed AI Assistant.
8. Upgrade Agent/AssistantTool read dispatcher and multi-turn galleryRef lifecycle.
9. Add optional Gallery Detail `问 AI` if clean.
10. Run TS diagnostics + focused Ex/glass/zoom/favorite/AI-state/tool checks.
11. **Run the short targeted real DEV runtime smoke scenarios defined above.**
12. Fix failures discovered in those same paths and rerun only failing scenarios until they pass or a true automation/runtime blocker is identified.
13. Push logical commits and sync `E-Hentai 浏览器 DEV` once.
14. Stop and report exact runtime paths actually executed plus only remaining human-experience checks.

Do not run a long unrelated whole-product acceptance ritual.
Do not merge `main` automatically.

# Final handoff format
Report:
- **Implemented:** exact changes;
- **Commit:** SHA(s);
- **Checks:** diagnostics + focused checks;
- **Runtime:** each real DEV path actually executed and result;
- **Needs user test:** only visual/gesture/subjective items that could not be reliably automated.

# User QA checklist
Only ask the user to check what runtime automation could not reliably certify, especially:
1. Liquid Glass visual quality;
2. Reader pinch/drag feel and gesture conflicts;
3. Favorite chooser/removal UI ergonomics;
4. AI conversation usefulness/UX;
5. any remaining device-specific layout issue.

Do not ask the user to re-test Ex/Search/AI Tool network paths if the Agent actually executed those exact real runtime scenarios successfully.
