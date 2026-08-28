# CURRENT_TASK — 1.1.x User QA Fix Pass 5

Branch: `feat/1.1-gallery-interaction`

## Freeze
User-confirmed working unless a new regression appears:
- Preview thumbnail sprite fix.
- Safari login / Cookie helper / import + validation.
- Current responsive Gallery Detail direction.

## Execute in order
Complete this pass without asking between fixes:

1. **P0 Cloud Favorites** — real web Favorites has 20+ items; App must show them.
2. **P0 Complete translated tag database** — current runtime effectively falls back to only two hard-coded suggestions (`汉语`, `巨乳`). Restore the full EhTagTranslation index.
3. **P0 Torrent list** — parse real E-Hentai torrent rows and expose usable download actions.
4. **P0 Archive actual download flow** — choices must perform the authenticated archive request and resolve a real download handoff.
5. **P1 Information architecture cleanup** — root navigation only 发现 / 书库 / 设置.

Do not add another feature family.

## Workflow
- User real-device evidence is authoritative.
- Inspect current branch before editing.
- Reuse current session/network/parser/store/UI.
- Root-cause fixes only; do not patch symptoms with more hard-coded examples.
- TypeScript diagnostics after logical fixes.
- Focused deterministic checks only for Favorites / tag database / Torrent / Archive.
- No broad regression ritual or screenshot-perfect self-acceptance.
- Commit logical fixes, sync isolated DEV once, then stop for user testing.

---

# Fix A — Cloud Favorites

Immediate known runtime bug:
- `FavoritesScene` previously referenced `loadFavorites` / `FavoritesPage` without importing them from `favorites.ts`.
- Ensure that wiring is present and fix any nearby compile/runtime typo before handoff, including an undefined saved-search delete symbol if present.

Then trace the real path:
`Library → 收藏 → FavoritesScene → loadFavorites() → authenticated favorites.php → categories + .itg gallery rows`.

Required:
- initial view = all cloud Favorites;
- first 10 `.fp` entries map positionally to slots 0–9;
- category names/counts come from server;
- `.itg` gallery rows become existing `GallerySummary` items;
- never replace cloud Favorites with local bookmarks;
- if structural gallery rows exist but parsing returns zero, surface parser error rather than false empty state.

References: EhViewer `FavoritesParser.java`, `GalleryListParser.java`, `FavListUrlBuilder.java`.

Focused check: synthetic Favorites HTML with non-zero categories and at least two gallery rows.

---

# Fix B — Full EhTagTranslation database + search suggestions

## Confirmed root symptom

Current `src/tagTranslation.ts` contains exactly two hard-coded fallback suggestions:
- `language:chinese / 汉语`
- `female:big breasts / 巨乳`

Real-device QA shows those two work while ordinary translated tags do not. Treat this as evidence that the full translation database/index is not successfully available at search time.

Do **not** solve this by adding more `BUILTIN_SUGGESTIONS`.

## Upstream format

Current source is:
`xiaojieonly/EhTagTranslation/tag-translations/tag-translations-zh-rCN.json`

Despite the `.json` extension, upstream `main.py` writes it as a binary-style payload:
- 4-byte big-endian size header;
- repeated UTF-8 key;
- CR byte;
- Base64-encoded UTF-8 Chinese translation;
- LF byte.

Inspect current Scripting `fetch` / `Data` APIs and load this payload in a way that preserves bytes. Do not assume a normal JSON document.

The current `parseDatabase(text)` / `response.text()` path must be verified against the actual binary payload. Prefer a byte-safe parser if text decoding can corrupt or silently fail.

## Required behavior

- full upstream database successfully builds the local translation map and suggestion index;
- cache stores/reads a representation that preserves the payload correctly;
- a failed download/parse must not silently pretend that the two built-ins are the full database;
- while the database is loading, preserve the user's current input and recompute suggestions when loading completes;
- Chinese substring search and English search both work;
- duplicate namespace/tag suggestions are de-duplicated;
- selecting a suggestion continues using exact E-Hentai search syntax through existing search state.

## Mandatory focused examples

The upstream database contains `gender change` in both namespaces:
- `female:gender change` → `性转换`
- `male:gender change` → `性转换`

Therefore typing `性转` must return **both** candidates, not zero and not one.

Also check:
- `性转换` → both female/male `gender change`;
- `gender change` → both namespaces;
- `女体化` → `male:gender morph`;
- `男体化` → `female:gender morph`;
- existing `汉语` and `巨乳` still work through the real database/index, not because they are the only hard-coded exceptions.

Do not ship if the loaded translation count is only the two fallback entries. Expose a safe translation-load status/count somewhere developer-visible or in the final report so user QA can distinguish `full DB loaded` from fallback mode.

References:
- `xiaojieonly/EhTagTranslation/main.py`
- `EhTagTranslation/Database` male/female tag tables
- existing `tagTranslation.ts`, `SearchComposer`.

Focused check must exercise a representative parsed binary fixture and the five queries above.

---

# Fix C — Torrent list

Use EhViewer `TorrentParser.java` as the narrow behavior reference.

Required:
- parse each `<form>...</form>` torrent block;
- read torrent name/download URL from the real torrent row, including `<td colspan="5"> ... <a href="...">NAME</a>` structure;
- parse Posted date span structure;
- tolerate harmless quote/attribute/whitespace differences;
- do not require anchor text to contain `Download`;
- strip private `?p=` suffix;
- each native item has a clear Safari/system download action;
- keep original torrent-page fallback only for genuine request/parse failure;
- do not log private torrent URLs or HTML.

Focused check: at least two torrent forms + `?p=` stripping.

---

# Fix D — Archive actual download flow

Current option labels alone are incomplete.

Use EhViewer `ArchiveParser.java`, `EhEngine.downloadArchive(...)`, `EhUrl.getDownloadArchive(...)`.

Required flow:
1. authenticated GET archive page;
2. parse `hathdl_form` action parameter `or`;
3. parse `do_hathdl('org' | numeric)` choices;
4. tapping a choice POSTs `hathdl_xres=<resolution>` to the correct `archiver.php?gid=...&token=...&or=...` using current E/Ex Cookie, gallery Referer and origin;
5. follow/parse server response until the real `Click Here To Start Downloading` href is available;
6. hand the resolved final URL to Safari/system download if Scripting should not own the binary archive.

Options must be actions, not read-only labels.
Show safe server restriction/error messages when applicable.

Focused checks: parse `or` + choices; build POST contract; parse final download href.

---

# Fix E — Information architecture de-duplication

`UI_TARGET_IPAD.md` UI 2.1 is authoritative.

Both iPad and iPhone roots:
- **发现**
- **书库**
- **设置**

Discover owns Search Composer, advanced filter, categories, Popular/Image Search/ranking/latest and browsing.
Library owns 全部 / 收藏 / 历史 / 书签 / 下载.
Settings owns account/login/site/Reader/download/cache/manual Cookie fallback.

Do not restore separate root Search/Favorites/Downloads/History/Account destinations.
Root switching replaces root content; child pages push one logical level only.

---

# Preserve
- working login/Cookie flow;
- fixed preview thumbnails;
- multi-tag exact-query model;
- current Gallery Detail responsive layout direction;
- Reader/offline core;
- comments/rating/bookmark behavior.

# Handoff
After all five fixes:
- push logical commits;
- sync isolated DEV once;
- no long acceptance run;
- report Favorites / full tag DB / Torrent / Archive / navigation + commit(s) + diagnostics/focused checks.

Ask user to test only:
1. Library → 收藏 shows real cloud favorites/categories;
2. typing `性转` shows both `female:gender change` and `male:gender change`;
3. a real gallery Torrent page lists usable torrent entries;
4. an Archive option actually proceeds to download handoff or a clear server restriction;
5. root navigation only contains 发现 / 书库 / 设置.

Stop and wait for user feedback.
