# CURRENT_TASK — 1.1 Runtime Bug Sweep

Branch: `feat/1.1-gallery-interaction`
Primary spec: `BUG_SWEEP_1_1.md`
Findings registry: `BUG_SWEEP_FINDINGS.md`
Parity reference: `EHVIEWER_PARITY.md`

## Goal
Freeze unrelated feature expansion and finish the current real-device stabilization sweep. User-reported runtime behavior is authoritative.

Do not merge `main` automatically.
Do not add unrelated EhViewer parity features until the current S1 regressions below are resolved.

## Immediate priority 1 — BS-14 systemic navigation stacking
The user supplied a real iPad recording showing one search-result tap followed by more than ten Back presses through different Gallery Detail pages.

Do not patch only one search screen.
Audit every dynamic collection where an item/tag/relation/record directly owns its own `NavigationLink` or destination-style action.
Prefer one controlled navigation state per collection:

`Button -> selected item/state -> one navigationDestination`

Reuse the safe pattern already used by `LibraryGalleryGrid`.

Required target paths include at minimum:
- ordinary gallery search/results;
- image search;
- cover search;
- continue reading;
- Discovery/watched/toplist;
- History;
- My Tags -> results;
- saved searches;
- local bookmarks;
- Gallery Detail tags;
- Gallery Detail relations/similar destinations.

Static settings/menu links do not need to be rewritten merely for style.

Acceptance rule for each exercised path:
**one user tap = one push; one Back = original list/page.**
If a second Back is needed to undo one item selection, the finding is not closed.

## Immediate priority 2 — BS-15 selected tag must be an exact-tag search
Real user reproduction:
1. type a Chinese concept such as a translated tag name in the search box;
2. local tag suggestions appear;
3. select the intended tag suggestion;
4. press Search;
5. result set is only dozens and is biased toward galleries whose title contains the Chinese draft text;
6. opening a gallery and tapping the same tag directly produces tens of thousands of tag results.

Current proven cause:
- `SearchComposer.select()` converts the suggestion into a `GallerySearchTag`, but builds the next state with `inputRef.current` as `plainText` before/while clearing the visible field;
- `composeGallerySearchState()` correctly combines `plainText + exact tags`, so the hidden state can become `Chinese draft + exact E-Hentai tag` even though the text field visually becomes empty;
- the bug is the suggestion-selection semantics, not the general compose helper.

Required fix:
1. Selecting a tag suggestion must **consume the current suggestion draft**.
2. The next state must explicitly use empty plain text for the consumed draft and preserve/add the selected exact tag.
3. Do not depend on mutable-ref timing. Do not pass `inputRef.current` into the state updater and then clear the ref afterward.
4. The resulting `rawQuery` for a default one-tag search must contain only the exact E-Hentai tag term (plus any explicitly selected quick/advanced filters), not the Chinese suggestion text.
5. If the user selects a tag and then intentionally types new free text afterward, that later text may combine with the selected exact tag. That is valid behavior.
6. Removing the tag must not resurrect the already-consumed Chinese suggestion draft.
7. Saved search/bookmark must preserve the corrected exact-tag state.

Required focused regression:
- input Chinese translated concept -> choose suggestion -> assert `keyword === ""`;
- assert `rawQuery` contains the chosen `galleryExactTagTerm()` and not the consumed Chinese draft;
- then type a new plain term -> assert new term + exact tag are both present;
- remove the tag -> assert only the newly typed plain term remains.

Required real DEV comparison:
Under the same site/category/language/advanced filters:
- Path A: search box Chinese concept -> choose the exact tag suggestion -> Search;
- Path B: Gallery Detail -> tap that same tag.
Both must generate equivalent exact-tag search semantics and return the same order-of-magnitude/result family. Compare the built safe query structure, not private gallery URLs.

Do not close BS-15 from a pure URL unit test alone; run the real DEV search path if technically possible.

## Immediate priority 3 — BS-16 preview inventory must be incremental/on-demand
Real user recording shows a 1323-page gallery whose Detail preview stays in background loading and stops at 1000 pages.

Current proven cause:
- `loadGalleryDetailCore()` sets `truncatedPreviewPages` when server preview pagination exceeds `MAX_PREVIEW_LIST_PAGES`;
- `MAX_PREVIEW_LIST_PAGES` is currently 50;
- `loadRemainingPreviewPages()` eagerly queues every preview-list page from 1 up to that cap as soon as Gallery Detail mounts;
- on the observed server layout this becomes about 1000 page links;
- `inventoryReady` also waits for `!previewsLoading` and `hasCompletePreviewInventory()`, while `hasCompletePreviewInventory()` rejects every truncated gallery;
- as a result ordinary preview/Reader UX is incorrectly coupled to full-gallery inventory enumeration.

Required architecture/behavior:
1. Gallery Detail must render immediately from the first/core preview page. Do **not** enumerate the complete gallery merely because Detail opened.
2. The displayed total page count must come from the authoritative server/detail metadata/summary count, not from `pageLinks.length`.
3. Detail preview summary should show only the first small set already available (currently about 18 is fine) and remain usable while more links are absent.
4. `查看全部` must open an incremental preview browser immediately; it must not be disabled until the complete inventory is known.
5. The all-preview browser should fetch the next preview-list page only when the user approaches the end of the currently loaded window. Small look-ahead/prefetch (for example next 1–2 preview-list pages) is fine; whole-gallery eager enumeration is not.
6. A known target page should be loadable by its corresponding preview-list page when practical. Do not require loading pages 1..N sequentially just to reach a distant page.
7. Reader must not require the entire page-link inventory before starting. It should start from currently known links and request the next required preview-list page as the reading cursor approaches or crosses the loaded boundary. If a robust direct page-index mapping is available from E-Hentai preview pagination, use it.
8. Remove the current 50-preview-page cap as a user-visible functional ceiling. Keep only bounded concurrency/cache/memory windows.
9. Download may keep a stronger completeness requirement, but full inventory enumeration must start only after the user explicitly starts a download. Download should fetch inventory incrementally with visible progress; its completeness requirement must not block normal preview or Reader.
10. Keep request/site/session generation guards so late preview loads cannot overwrite a newer gallery/account/site.

Focused regression:
- 100+ page gallery: Detail first previews available without waiting for all preview pages;
- 1000+ page gallery: first preview summary available quickly and `查看全部` can open before full inventory;
- simulated/real pagination beyond preview-list page 50 is reachable and not truncated at 1000 gallery pages;
- scrolling the preview browser near the loaded tail triggers only the next bounded batch;
- total page label remains the server total even while only a subset of page links is loaded;
- Reader start is not gated on whole-gallery inventory.

Required real DEV smoke:
Use the user's 1323-page gallery or another known 1000+ gallery:
- Detail opens and first previews appear quickly;
- no prolonged whole-gallery background enumeration before preview is usable;
- `查看全部` opens immediately;
- scrolling progressively loads beyond 1000 and can ultimately reach the real tail (1323 in the recorded case);
- ordinary reading can start without first loading all 1323 preview links.

Do not solve this by merely raising `MAX_PREVIEW_LIST_PAGES`; that would preserve the wrong eager architecture and only move the freeze point.

## Immediate priority 4 — BS-17 replace generic chat Assistant with real AI recommendations
Real user evidence: the in-app `💬 AI 助手` was asked to find/recommend VR-related galleries. It returned generic suggested keywords/tags and did not perform an E-Hentai search or present any real gallery candidates.

Current proven architecture problem:
- `presentManagedAssistant()` only opens Scripting's managed Conversation;
- whether the model calls `ehentai_browser` Assistant Tool is optional/model-controlled;
- the tool itself exposes only basic `search(query/category/language)` plus detail/favorites/history, not the app's full validated SearchState;
- therefore the visible app entry behaves like a generic chatbot and cannot guarantee the user's required `search -> inspect -> recommend` workflow.

Decision:
**Remove the generic in-app chat Assistant as a primary UX. Do not try to solve this by prompt wording alone.**
Keep `assistant_tool.tsx/json` as a compatibility surface for users who intentionally use Scripting's Agent/Assistant interface, but do not advertise that generic conversation as the app's recommendation feature.

### Required front-end behavior
1. Remove/hide the Search-page `💬 AI 助手` button.
2. Replace it with a deterministic `✨ AI 推荐` entry.
3. Replace generic Gallery Detail `✨ 问 AI` with a focused action such as `✨ 找类似` only if it can use the same real recommendation pipeline; otherwise remove the generic action for this release.
4. Keep existing `✨ AI 搜索` if it continues to produce a validated normal SearchState and real search results.

### Required AI recommendation pipeline
The script owns the workflow. The model may help plan/rank, but **cannot choose to skip the real search**.

1. User enters a natural-language preference/request.
2. Ask Scripting Assistant for a small structured recommendation plan, preferably 1–3 search plans when useful for fuzzy concepts/synonyms. Plans may contain only fields the app can validate: plain text, include/exclude tag concepts, category/language, rating/page constraints, and other already-supported advanced filters.
3. Resolve every tag concept through the local EhTagTranslation database and existing exact-tag machinery. Never let model-produced raw E-Hentai syntax/URL bypass local validation.
4. Execute the resulting real `searchGalleries()` queries against the active E/Ex site. If multiple plans are used, merge/dedupe by gallery identity. Cap the candidate pool to a bounded size (for example 20–30) and stop early when enough useful candidates exist.
5. For a bounded subset (recommended 8–12 candidates), load only **lightweight detail/core metadata** needed for recommendation: title/titleJpn, category, uploader, authoritative page count, rating/ratingCount, tags, and optionally a very small safe comment summary. Do **not** call an API that enumerates the complete preview inventory merely for recommendation; this must remain compatible with BS-16.
6. Send only those safe candidate records plus the user's original preference to Scripting Assistant for ranking. No Cookie, raw URLs, gid/token, rating credentials, preview/page tokens, raw HTML, local paths or private notes.
7. Require structured ranking output referencing only candidate IDs/indices from the supplied candidate list. The model cannot invent a gallery.
8. Render 3–5 actual recommendation cards in native UI. Each card should show the real cover/summary already owned by the app plus a short reason such as `符合 VRMMO/游戏世界标签 · 评分较高 · 52 页`.
9. Tapping a recommendation opens the existing `GalleryDetailView` through the single controlled navigation pattern from BS-14.
10. If the real searches produce no candidates, show a truthful `没有找到符合条件的结果` and optionally offer one explicit `放宽条件重试` action. **Never fall back to a pure-text list of suggested search keywords and call that a recommendation.**

### Recommendation planning for fuzzy concepts
For concepts such as `VR`, `进入虚拟世界`, `全沉浸`, the planner may propose multiple *validated* search plans using synonyms/title terms and resolvable tags. Example shape only:
- exact/resolved tag-oriented plan;
- title/plain-text synonym plan such as VRMMO/full-dive equivalents;
- broader related plan if the first two produce too few candidates.

The app executes and merges these searches. The planner never directly returns final gallery recommendations.

### Gallery Detail `找类似`
If implemented in this pass:
- seed the recommendation plan from the current gallery's safe tags/category/uploader/rating/page count;
- let the user optionally add a constraint like `不要 AI generated`;
- execute real searches and rank real candidates;
- exclude the current gallery itself;
- show actual cards, not a chat transcript.

### Verification
Focused checks:
- planner output cannot contain/use raw URL or E-Hentai query syntax;
- ranking cannot select an unknown candidate ID;
- dedupe candidate merge is stable;
- recommendation detail enrichment uses core/lightweight detail and does not enumerate whole preview inventory;
- no recommendation result leaks sensitive fields.

Required real DEV smoke:
- input a fuzzy request similar to `帮我找带设备进入虚拟世界/VRMMO 设定的本子，标题不一定有 VR`;
- observe at least one actual E/Ex search request executed;
- final UI must contain actual gallery cards from those searches, or a truthful no-results state;
- it is a failure if the final result is only generic keyword/tag advice;
- tap one recommendation -> one Gallery Detail push -> one Back returns to recommendation list.

## Other open/blocked findings
Continue using `BUG_SWEEP_FINDINGS.md` as the registry. Do not erase previous evidence.
After BS-14, BS-15, BS-16 and BS-17 are resolved, resume the remaining defined Runtime Bug Sweep families in `BUG_SWEEP_1_1.md`.

## Verification policy
For each fix:
1. confirm current DEV build/head;
2. trace the production state/navigation path;
3. smallest root-cause fix;
4. TypeScript diagnostics;
5. focused deterministic regression;
6. targeted real DEV runtime smoke when automatable;
7. update `BUG_SWEEP_FINDINGS.md` truthfully;
8. sync isolated `E-Hentai 浏览器 DEV` once at the logical checkpoint.

Do not use fixture/self-test success as a substitute for the user-visible path.
Do not perform a long whole-product acceptance ritual.
Do not expose cookies, private URLs/tokens, raw HTML, favorite notes, AI credentials or local private paths.

## Handoff
Report only:
- finding IDs fixed;
- root cause;
- commit SHA;
- exact runtime paths actually exercised;
- 1–3 remaining user gestures if UI automation cannot verify them.
