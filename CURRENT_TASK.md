# CURRENT_TASK — 0.4 Library / Favorites / History

Branch: `feat/0.4-library`
Base: `ba192e16f04e7f834a2e0a1bdfe54edb5e470600`

Read `AGENTS.md` first, then only the relevant `src/` files. Do not reread historical planning unless this task explicitly requires it.

## Accepted baseline
0.3 is accepted. Preserve these behaviors and regression checks:
- Home / Search / Filter / Detail Core-first / background previews / Reader / Account;
- image priority `reader-image > preview-thumbnail > home-thumbnail`;
- typed `runEhAction()` with opaque short-lived `galleryRef`;
- approved Scripting `AssistantTool` search path;
- diagnostics and errors must not expose Cookie, full gallery/page URL, gallery token, search text, or full HTML;
- current checks: SelfTest 8/8, Action Smoke PASS, AssistantTool Smoke PASS, Network SelfTest 9/9.

Do not change 0.3 architecture simply to make this task look cleaner.

## Reference behavior already confirmed
Use EhViewer_CN_SXJ as behavior reference, not as code to port mechanically.

Relevant reference files:
- `ui/scene/gallery/list/FavoritesScene.kt`
- `client/data/FavListUrlBuilder.java`
- `client/parser/FavoritesParser.java`
- `ui/scene/history/HistoryScene.java`
- `dao/HistoryInfo.java`

Reference findings:
- cloud Favorites is the E-Hentai/ExHentai `favorites.php` list, with 10 remote favorite categories (0-9), category names/counts, pagination and favorite search;
- favorite search uses `f_search` plus name/tag/note search flags;
- Favorites gallery rows ultimately use the normal gallery/detail flow;
- History is local data and opens the same Gallery Detail flow, not a separate detail implementation;
- EhViewer history keeps gallery identity plus display metadata and visit time.

Do not combine cloud Favorites and local History into one storage model.

## Goal
Deliver one coherent Library package with:
1. read-only cloud Favorites browsing;
2. local History;
3. local Reading Progress / Continue Reading;
4. a small Library UI entry that reuses existing Gallery Detail and Reader;
5. read-only typed AI actions for the new data without exposing sensitive gallery identity.

This is a foundation package. Do not add cloud favorite writes yet.

## A. Cloud Favorites — read only
Add a focused Favorites core on top of the existing account/network/parser code.

Requirements:
- reuse `getBaseUrl()`, `getCookieHeader()` and the existing bounded HTML request path; do not create a second HTTP stack;
- Favorites root is the active E/Ex site `favorites.php`;
- support all remote favorites plus category 0-9;
- parse and expose category names and counts from the favorites page;
- parse gallery items using the existing gallery-list/search parser where structurally compatible; do not duplicate the normal gallery-list parser;
- support favorites pagination using returned hrefs;
- support optional favorite search using the server behavior represented by `FavListUrlBuilder` (`f_search`, name/tag/note flags);
- detect login-required responses and return a sanitized user-facing error;
- Favorites UI must open the existing `GalleryDetailView`, not another detail screen.

Suggested public shape; exact names may differ if existing types make a smaller API:
```ts
type FavoriteCategory = { index: number; name: string; count: number }
type FavoritesPage = {
  categories: FavoriteCategory[]
  items: GallerySummary[]
  resultCount: string
  prevHref: string
  nextHref: string
}
```

Parser-only logic should live outside the UI and have a fixture test.

## B. Local History + Reading Progress
Implement a small local persistence module. First inspect current Scripting typings/docs for the supported persistent file/KV APIs and reuse an existing project mechanism if suitable. Do not add SQLite, ORM, state-management or storage dependencies for this package.

Store enough internal identity to reopen the gallery without depending on an in-memory `galleryRef`. Prefer an internal identity such as `gid + token` parsed from an already validated E/Ex gallery URL rather than persisting arbitrary full URLs.

The token may exist only in the local persistence/internal core required to reopen a gallery. It must never appear in:
- UI text;
- logs or diagnostics;
- exceptions returned to the user;
- `runEhAction()` results;
- AssistantTool output;
- committed fixtures.

History record should contain only the useful minimum, for example:
```ts
type HistoryRecordV1 = {
  gid: string
  token: string // internal persistence only
  title: string
  titleJpn?: string
  thumb?: string
  category?: string
  uploader?: string
  pages?: number
  lastPageIndex?: number
  viewedAt: number
  updatedAt: number
}
```

Behavior:
- dedupe/update by stable gallery identity;
- successful Gallery Detail visit creates/refreshes History;
- opening Reader records `lastPageIndex`;
- changing Reader page updates progress without blocking image navigation;
- Detail shows a clear `继续阅读` action when saved progress is valid;
- History is newest-first;
- allow deleting one history item;
- allow clearing all history only behind an explicit confirmation UI;
- storage parse/corruption failure must fail safely and preserve a recoverable path where possible; do not silently overwrite unreadable real data during startup;
- tests must use an injected/temp store and must never clear or mutate the user's real History.

Do not implement cross-device sync in 0.4.

## C. Library UI
Add a small Library entry from Home with two destinations:
- 收藏 Favorites
- 历史 History / Continue Reading

Keep new screens out of `GalleryFlow.tsx` as much as practical. Prefer files such as:
- `src/library.ts` or `src/libraryStore.ts`
- `src/favorites.ts`
- `src/favoritesHtml.ts`
- `src/LibraryScene.tsx`

Exact filenames are not important.

Rules:
- do not move all existing scenes merely for folder aesthetics;
- extract only the smallest shared presentation piece necessary to avoid duplicating gallery rows;
- reuse `GalleryDetailView` and `ReaderView`;
- use existing `StateView` patterns for loading/empty/error/retry;
- wide/iPad layout must remain usable;
- no fake local Favorite category presented as if it were an E-Hentai cloud category.

## D. Typed AI boundary — read only
Extend `EhAction` without weakening the opaque reference boundary.

Minimum useful actions:
```ts
| { type: "favorites.list"; category?: number; query?: string }
| { type: "history.list"; limit?: number }
```

Requirements:
- results return sanitized display fields plus short-lived `galleryRef` where follow-up detail is needed;
- no `gid`, token, full URL or local storage path in action results;
- reuse the same Favorites/History core called by manual UI;
- clamp unreasonable limits;
- malformed category/query/limit returns a typed validation failure;
- keep the existing AssistantTool search registration working;
- do NOT add cloud favorite write/delete actions or automatic mutations in this package;
- a second user-facing AssistantTool registration is not required unless current Scripting API makes it trivial and clearly useful. Typed dispatcher support is required.

## E. Tests and verification
Extend the existing harness instead of creating competing test systems.

Add coverage for at least:
- favorites URL/category state builder;
- favorites HTML fixture: 10 category names/counts + gallery list + pagination;
- favorites login-required/error sanitization;
- History create/update/dedupe/sort;
- Reading Progress update and resume index validation;
- storage malformed-data behavior using temp/injected storage;
- `favorites.list` and `history.list` action output contains no URL/token/gid leakage;
- existing search `galleryRef -> gallery.detail` behavior still works.

Before upload, run and fix until green:
- existing `src/runSelfTests.ts` plus new tests;
- `src/runActionSmoke.ts`;
- `src/runAssistantToolSmoke.ts`;
- `src/runNetworkSelfTest.ts`;
- any new focused Favorites/Library smoke test you add;
- `tsconfig.test.json` must include all new non-runtime entry points.

Runtime exercise at least once:
1. Home -> Library -> Favorites -> category -> gallery -> Detail;
2. Home/Search -> Detail -> Reader -> change page -> back -> Continue Reading;
3. Home -> Library -> History -> reopen gallery;
4. delete one History item and verify persistence;
5. do not clear the user's real History as part of automated verification.

If the account is logged out, Favorites network verification may report a clear authenticated-skip/login-required result; it must not fabricate PASS data.

## Out of scope
Do not implement in 0.4:
- add/move/delete cloud favorites;
- favorite notes editing;
- local Favorites clone unless it is strictly necessary for the cloud Favorites architecture (normally it is not);
- Downloads;
- Comments / Rating writes;
- Watched / My Tags;
- Torrent / Archive;
- History sync/export/import;
- full parser rewrite;
- new state-management framework;
- new login architecture;
- writes to `main`.

## Completion
Work continuously on `feat/0.4-library`: inspect -> implement -> self-test -> runtime check -> fix routine failures -> rerun -> commit logical package.

When complete:
1. push only logical commits to `feat/0.4-library`;
2. if PR #22 is still unmerged, create one Draft PR targeting `feat/0.3-ui-foundation`; if #22 has been merged, target the branch that now contains the accepted 0.3 baseline;
3. report completed features, test/runtime results, changed files, final commit SHA, known issues and at most 2-5 human-only acceptance items;
4. stop for technical review. Do not begin Downloads or the next feature package.
