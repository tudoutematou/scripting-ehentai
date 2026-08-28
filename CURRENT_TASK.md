# CURRENT_TASK — 1.1.x User QA Fix Pass 4 + Search Parity

Branch: `feat/1.1-gallery-interaction`

## Confirmed by user — freeze these

- Preview thumbnail duplication is fixed on the real device.
- Safari login + Cookie helper + import/validation now works on the real device.
- Do not reopen Preview or Login/Cookie work unless the user reports a new regression.

## Authorized work for this pass

Complete the following in order, without asking between slices:

1. **P0 — Cloud Favorites:** web has 20+ cloud favorites; App shows zero.
2. **P0 — Home category navigation:** category results require many Back taps instead of one.
3. **P1 — EhViewer-style translated tag search:** Chinese/English input must suggest real E-Hentai tags, allow multiple selected tags in one search, and preserve the existing advanced-search filters.

Do not add any other feature family in this pass.

## Development contract

- User real-device evidence is authoritative.
- Trace the real flow before editing.
- Reuse existing session/search/tag-translation code; no second search engine or second tag database.
- TypeScript diagnostics + one focused deterministic check per non-trivial parser/search-expression change.
- No full regression, release audit, simulated acceptance, or broad refactor.
- Do not log/commit full authenticated HTML, Cookie values, gallery titles, gids/tokens, private URLs, user search history, or other user data.
- Commit logical slices and push to the current branch.
- Final status: **Implemented · needs user test**.

---

# Slice A — P0 Cloud Favorites

## Runtime truth

The same authenticated account has **20+ cloud favorites on the E-Hentai Favorites webpage**, while App → Library → Cloud Favorites shows no galleries.

Treat this as a Favorites parser/request integration bug, not as an empty account and not as a login bug.

## Current flow

`FavoritesScene`
→ `loadFavorites()`
→ `buildFavoritesUrl()`
→ authenticated `fetchHtml(favorites.php)`
→ `parseFavoriteCategories()`
→ generic `parseSearchHtml()`
→ `FavoritesPage.items`

## Reference behavior

Use only the narrow EhViewer reference:

- `FavoritesParser.java`
- `GalleryListParser.java`
- `FavListUrlBuilder.java`

Important behavior:

1. All cloud favorites uses `favorites.php` without requiring `favcat=all`.
2. Favorites has a dedicated parser boundary.
3. Categories come from `.ido` → `.fp`; upstream expects 11 `.fp` entries and uses the first 10 as slots 0–9.
4. Slot number is positional. Count is child 0 and category name is child 2. Do **not** require a `favcat` attribute on the `.fp` opening tag.
5. Gallery rows come from the Favorites page `.itg` gallery-list container.

## Known suspicious code

Current `parseFavoriteCategories()` requires a `favcat=0..9` attribute on each `.fp` tag, which does not match upstream behavior and can turn real categories into ten zero-count placeholders.

Current `loadFavorites()` also reuses generic `parseSearchHtml()` for the Favorites gallery list. Verify compatibility with the authenticated `favorites.php` structure returned by the real site.

## Required fix

- Parse 10 favorite slots by Favorites page structure/position.
- Parse actual gallery rows from the Favorites `.itg` container into the existing `GallerySummary` model.
- Reuse existing gallery-summary parsing where compatible; extract/adapt the minimum list parsing needed rather than creating a parallel gallery model.
- Preserve Favorites search, category selection, pagination, notes, mutations, and active E/Ex routing.
- Initial Favorites view means **all cloud favorites** and must display the server items.
- If structural evidence says galleries exist but parsing returns zero items, surface a parser error rather than the misleading empty-state message.

## Safe runtime inspection

If local DEV runtime inspection is available, only inspect safe structural facts:
- pathname `favorites.php`;
- response status;
- counts of `.ido`, `.fp`, `.itg`, `/g/` anchors;
- parsed category/item counts.

Never print/save/report full authenticated HTML or gallery identities/titles/tokens.

## Focused check

Use a synthetic Favorites HTML fixture with:
- 10 favorite slots (+ summary slot if needed);
- non-zero category counts;
- at least two `.itg` gallery rows;
- assertions for category indexes/counts/names and non-empty distinct gallery summaries.

Do not use the user's real Favorites data in fixtures.

---

# Slice B — P0 Home category navigation

## Runtime truth

From Home → 分类 → `其他` (and likely sibling categories), Back requires many taps before Home is reached.

Expected:

`Home → category results → Back → Home`

with one Back action.

## Root-cause area

Current Home Categories is:

`List → Section → LazyVGrid → many NavigationLink destinations`

This is the same aggregate-List-row navigation pattern that previously caused extra Account/Library stack levels.

## Required fix

- One semantic category `NavigationLink` per List row.
- Do not put multiple unrelated navigation destinations inside one `LazyVGrid`, `VStack`, `HStack`, or other aggregate List row.
- Preserve the current category labels and `GallerySearchState` values.
- Do not patch the Back button, manually call dismiss to compensate, or imperatively manipulate the navigation stack.
- Inspect only immediate Home/List siblings for the exact same anti-pattern and flatten them if necessary; do not start another UI redesign.

## User check

- Home → 其他 → Back = Home in one tap.
- Home → one other category → Back = Home in one tap.

---

# Slice C — P1 EhViewer-style translated tag search

## User expectation

Match the **behavior** shown by EhViewer, while keeping native Scripting/iOS UI:

1. User types Chinese such as `汉语` or `巨乳`.
2. Local tag database immediately shows matching real E-Hentai tag suggestions, for example:
   - `language:chinese` / `汉语`
   - `female:big breasts` / `巨乳`
   - other tags whose English or Chinese translation contains the typed text.
3. Tapping a suggestion commits the real tag into the search expression rather than searching the Chinese display text as a gallery-title keyword.
4. User can continue typing and select a second, third, or later tag.
5. Multiple selected tags are combined in one E-Hentai search (logical AND by space-separated exact tag terms).
6. The user can remove one selected tag without clearing the whole search.
7. Ordinary free-text search must still work when the user does not select a tag suggestion.
8. Existing category/language/advanced filters must apply to the same composed search, not a separate search system.

## Existing assets to reuse

The project already has `tagTranslation.ts`:
- downloads/caches the EhTagTranslation database;
- parses English tag key → Chinese translation;
- exposes `ensureTagTranslations()` and `translateTag()`.

Do **not** download a second tag database and do not call a remote autocomplete API on every keystroke.

Extend the current in-memory parsed database so it can also support **reverse suggestions** from both Chinese and English input.

## EhViewer reference behavior

Use only:
- `EhTagDatabase.java`
- `Tag.java`
- `SearchBar.java`

Relevant upstream behavior:

- `Tag.involve(keyword)` matches if either the English tag or Chinese translation contains the input.
- `EhTagDatabase.suggest()` returns matching tag pairs and caps the suggestion list.
- SearchBar only treats the current unfinished text fragment as the suggestion input; already committed tag expressions remain intact.
- Selecting a tag converts it into an exact E-Hentai search term. Example upstream expressions:
  - `female:big breasts` → `f:"big breasts$"`
  - `language:chinese` → `l:"chinese$"`
- A second selected tag is appended instead of replacing the first, e.g.:
  - `f:"big breasts$" l:"chinese$"`

Reproduce the protocol/behavior, not the Android widget architecture.

## Tag suggestion model

Add the smallest useful typed representation, e.g. conceptually:

`TagSuggestion { namespace, tag, english, translated, exactQuery }`

The exact naming is up to the implementation.

Build the suggestion index when the existing translation database is parsed/loaded; do not re-decode Base64 or reparse the file on every keystroke.

The suggestion matcher must:
- normalize case/underscore/hyphen/space consistently with existing translation logic;
- match both normalized English and Chinese display text;
- cap visible results (roughly 20–40; use a small UI-friendly number initially);
- prefer stronger/exact/prefix matches ahead of weak contains matches when practical without building a large search framework;
- return no suggestions cleanly while the translation DB is unavailable/loading.

## Exact query builder

Add one pure helper for exact tag search expressions.

Use EhViewer-compatible namespace prefix behavior where known from the existing map/reference:
- `female` → `f:`
- `male` → `m:`
- `language` → `l:`
- `artist` → `a:`
- `group` → `g:`
- `parody` → `p:`
- `character` → `c:`
- `cosplayer` → `cos:`
- `mixed` → `x:`
- `other` → `o:`
- `reclass` → `r:`
- `rows` → `n:`
- misc/no-prefix tags remain valid exact tag terms.

Quote tags containing spaces and include the trailing `$` exact-match marker in the same form EhViewer uses.
Do not blindly concatenate unescaped user input into exact tag syntax; the exact term must come from a known suggestion record.

## Search UI

Do not copy the Android dark overlay literally. Build a stable native Scripting layout.

The existing Home search area should become a small **search composer** rather than a bare keyword box.

Required behavior:

### Active input
- one normal `TextField` for the current unfinished word/phrase;
- typing updates local suggestions from the already loaded tag index.

### Suggestions
- show candidate rows directly below the input while there is an active input;
- each row shows the real English tag (for example `female:big breasts`) and the Chinese translation (`巨乳`) when available;
- tapping a row adds it to selected tags and clears only the active input, ready for the next tag.

### Selected tags
- show already committed tags above/below the input as compact independent rows/tokens;
- display a human-friendly label plus the English tag;
- each selected tag has an explicit remove action;
- prevent accidental duplicate identical tags.

Do not place many selectable tag `NavigationLink`s inside one aggregate List row; suggestions are actions, not navigation destinations.

### Search action
Compose the raw query from:

`selected exact tag terms + remaining free text`

Example:

Selected `巨乳` (`female:big breasts`) + selected `汉语` (`language:chinese`)
→ raw search query approximately:

`f:"big breasts$" l:"chinese$"`

If the user also leaves a plain title/keyword fragment, append it as ordinary search text.

Pass this query into the existing `GallerySearchState` / `buildGallerySearchUrl()` / `ResultsView` pipeline. Do not bypass it and do not create a second Results scene.

### Advanced search `+`
Provide a clear `+ / 高级筛选` entry in the search composer, analogous in purpose to EhViewer's top-right plus button.

It must open the **existing `FilterView`** with the currently composed tag/free-text query preserved.
When the user applies category/language/rating/page/torrent/expunged filters, those filters must apply to the same selected tags.

Do not duplicate advanced-search controls inside the composer.

## Search display

Results should distinguish:
- human-readable selected-tag display (Chinese when available);
- actual raw E-Hentai query used for the request.

Existing `displayQuery` / `rawQuery` fields should be reused rather than inventing another search-state model.

Do not expose internal syntax as the only user-facing label when a translation is available.

## Preserve

- Clicking a tag from Gallery Detail must continue to open tag search as it already does.
- Quick language filters must continue to work.
- Image Search, uploader search, Popular, Watched, Toplist, saved searches, and ordinary keyword search must continue using their existing routes.
- Tag translation failure must not block ordinary text search.

## Focused checks

Add small deterministic pure checks using synthetic tag records (not the network DB):

1. Chinese `汉语` matches `language:chinese`.
2. Chinese `巨乳` can return `female:big breasts` plus other translated matches where appropriate.
3. English partial input can match the same records.
4. Exact query building:
   - `female / big breasts` → `f:"big breasts$"`
   - `language / chinese` → `l:"chinese$"`
5. Combining two selected tags preserves both terms in order and does not replace the first.
6. Duplicate selection is ignored or de-duplicated.
7. Plain text can coexist after selected tags.

No full UI automation is required.

---

# Preserve / do not touch

- Working Preview sprite fix.
- Working Safari/Cookie/login flow.
- Existing E/Ex site selection and Keychain/session behavior.
- Gallery Detail, Reader, downloads, image search, comments, rating, torrent/archive behavior.
- User-QA workflow.

No broad navigation/UI redesign beyond Slice B and the search composer required by Slice C.

# Final handoff

After A+B+C:
- push to `feat/1.1-gallery-interaction`;
- sync isolated DEV once if needed;
- do not run a broad acceptance campaign;
- report only:
  - **Fix:** Cloud Favorites + category navigation;
  - **Search:** translated tag suggestions + multi-tag query + advanced-filter integration;
  - **Commit(s):** SHA(s);
  - **Checks:** diagnostics + focused Favorites/search-expression checks;
  - **Please test:**
    1. cloud Favorites now shows real categories/items;
    2. Home → category → Back returns Home once;
    3. type `汉语`, select `language:chinese`, then type/select a second translated tag, search, and confirm results use both tags; open `+ 高级筛选` and confirm the selected tags remain in the query.

Stop and wait for user feedback. Do not automatically begin another milestone.
