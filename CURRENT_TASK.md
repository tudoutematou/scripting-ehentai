# CURRENT_TASK — Final Combined Batch: Stabilize + AI Assistant 1.0

Branch: `feat/1.1-gallery-interaction`
Companion spec: `AI_ASSISTANT_1_0.md`

## Goal
The user has authorized a larger Sol pass. Execute continuously instead of stopping after every small item.

**Order is mandatory:**
1. fix current real-device regressions first;
2. finish the already-approved micro polish;
3. then implement AI Assistant 1.0 from `AI_ASSISTANT_1_0.md`;
4. diagnostics/focused checks only;
5. sync isolated DEV once and stop for user testing.

Do not merge `main` automatically.

## Development style
- inspect current code before modifying;
- consult current Scripting docs for APIs that changed or are newly available;
- reuse existing network/parser/search/library/Reader/AssistantTool cores;
- root-cause fixes only; no architecture rewrite;
- do not perform a long simulated acceptance run;
- real-device user feedback is the acceptance source.

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
11. Push logical commits and sync `E-Hentai 浏览器 DEV` once.
12. Stop and report only what the user needs to test.

Do not run a long whole-product acceptance ritual.
Do not merge `main` automatically.

# User QA checklist
Ask the user to test:
1. E-Hentai still works and ExHentai no longer 404s with their known-good account;
2. Detail actions visibly use real native Liquid Glass;
3. Reader pinch zoom/pan;
4. existing favorite shows real folder name and chooser/remove works;
5. AI Search: `中文女性性转，30-80页，排除AI生成`;
6. save/reopen that AI search bookmark;
7. AI Assistant opens using the already-configured Scripting model with no extra API setup;
8. Scripting Agent can call the E-Hentai tool to search and then inspect one result;
9. no credentials/private URLs appear in AI/tool output.
