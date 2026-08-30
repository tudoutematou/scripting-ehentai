# CURRENT_TASK — 1.1 Runtime Bug Sweep

Branch: `feat/1.1-gallery-interaction`
Primary spec: `BUG_SWEEP_1_1.md`
Findings registry: `BUG_SWEEP_FINDINGS.md`
Parity reference: `EHVIEWER_PARITY.md`

## Goal
Freeze feature expansion and finish the current real-device stabilization sweep. User-reported runtime behavior is authoritative.

Do not merge `main` automatically.
Do not add new EhViewer parity features until the current S1 regressions below are resolved.

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

## Other open/blocked findings
Continue using `BUG_SWEEP_FINDINGS.md` as the registry. Do not erase previous evidence.
After BS-14 and BS-15 are resolved, resume the remaining defined Runtime Bug Sweep families in `BUG_SWEEP_1_1.md`.

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
