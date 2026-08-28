# CURRENT_TASK — 1.1.x User QA Fix Pass 5

Branch: `feat/1.1-gallery-interaction`

## Real-device state

Confirmed working — freeze unless a new regression is reported:
- Preview thumbnail sprite fix.
- Safari login / Cookie helper / import + validation.
- Basic responsive split layout.
- Gallery Detail two-column direction is acceptable.

Current user-reported problems:

1. **P0 Cloud Favorites does not show real server favorites.**
   - Device screenshot previously showed `Can't find variable: loadFavorites`.
   - This wiring error has now been patched by importing `loadFavorites` / `FavoritesPage` into `LibraryScene.tsx`.
   - After syncing latest DEV, verify the actual authenticated Favorites parser path. If it still shows zero while the webpage has 20+ items, continue the parser/request fix; do not blame login.

2. **P0 Torrent list returns no usable torrents.**
   - Gallery Detail exposes the torrent entry, but the native torrent scene says the server returned no usable torrents.

3. **P0 Archive options are read-only.**
   - `Original / 800x / 1280x / 1920x` are shown, but there is no action that actually starts/resolves the archive download.

4. **P1 Information architecture is duplicated.**
   - Discover already contains Search, but the old root sidebar also had Search.
   - Library already contains Favorites / History / Downloads, but the old root sidebar repeated those items.
   - Account is already logged in and belongs under Settings rather than another root destination.

Do not add unrelated features in this pass.

## Workflow

- User real-device evidence is authoritative.
- Inspect current latest branch before editing; do not assume older task state.
- Reuse current session/network/parser/store/UI.
- TypeScript diagnostics + focused parser/action checks only.
- No broad regression ritual or screenshot-perfect self-acceptance.
- Commit logical fixes, sync DEV once, then hand back to the user.

---

# Fix A — Cloud Favorites

## Immediate wiring

`FavoritesScene` must import and call the real `loadFavorites()` implementation from `favorites.ts`; no runtime global/fallback hack.

Also fix any compile/runtime typo introduced around this file before handoff (for example an undefined saved-search delete symbol).

## Server/parser path

After the wiring error is gone, trace:

`Library → 收藏 → FavoritesScene → loadFavorites()`
→ authenticated `favorites.php`
→ Favorites categories
→ `.itg` gallery list
→ existing `GallerySummary` rows.

EhViewer reference:
- `FavoritesParser.java`
- `GalleryListParser.java`
- `FavListUrlBuilder.java`

Required:
- the account that shows 20+ items on the webpage must show those server favorites in App;
- first 10 `.fp` entries map positionally to slots 0–9;
- do not require `favcat` attribute on each `.fp`;
- gallery rows come from Favorites `.itg`;
- keep initial view as all Favorites;
- category names/counts and items must come from server;
- do not substitute local bookmarks for cloud Favorites.

If structural `/g/` rows exist but parsing returns zero, show a parser error rather than a false empty state.

Focused check: synthetic Favorites HTML with non-zero categories + at least two gallery rows.

---

# Fix B — Torrent list

Current parser is too heuristic and can skip valid E-Hentai torrent forms.

Use EhViewer `TorrentParser.java` behavior as the narrow reference.

Relevant upstream structure:
- each torrent is inside a `<form>...</form>` block;
- posted date is typically `Posted:` span + value span;
- torrent name/download URL come from the torrent row, notably the `<td colspan="5"> ... <a href="...">NAME</a>` structure;
- strip the private `?p=` suffix from the download URL before exposing it.

Required:
- parse the actual current torrent page structure, including harmless attribute/quote/whitespace variations;
- do not require the anchor text to literally contain the word `Download`;
- preserve torrent name, posted date and download URL;
- each item has a clear native action to hand the real torrent URL to Safari/system download;
- if parsing truly fails, keep the original torrent-page Safari fallback.

Do not log private torrent URLs or page contents.

Focused check: synthetic torrent HTML modeled after EhViewer's parser structure with at least two forms and `?p=` stripping.

---

# Fix C — Archive actual download flow

Current implementation only parses labels/resolutions. That is incomplete.

Use EhViewer `ArchiveParser.java`, `EhEngine.downloadArchive(...)` and `EhUrl.getDownloadArchive(...)` as behavior references.

Required flow:

1. GET the authenticated archive page from the current gallery.
2. Parse the archive form parameter `or` from `hathdl_form` action.
3. Parse available resolution choices from `do_hathdl('org' | numeric-resolution)`.
4. When the user taps a choice, POST the authenticated request with:
   - gallery `gid` / `token` from the current gallery;
   - `or` from the archive form;
   - form field `hathdl_xres=<selected resolution>`;
   - current gallery as Referer and active E/Ex origin/session.
5. Follow/parse the returned archiver flow until the real final download link is available (EhViewer looks for the `Click Here To Start Downloading` href in the later page).
6. If Scripting should not own the binary download, hand the resolved final URL to Safari/system download. The native list must still perform the authenticated selection/request flow first.

The archive options must be tappable actions, not static labels.

If the server returns insufficient funds/H@H/account restrictions, show the real safe user-facing reason rather than an empty list.

Focused checks:
- archive page parses `or` + options;
- selected `org`/numeric resolution builds the expected POST contract;
- final download-link parser extracts a synthetic `Click Here To Start Downloading` href.

---

# Fix D — Information architecture de-duplication

The authoritative UI contract is now `UI_TARGET_IPAD.md` UI 2.1.

## Root destinations

Both regular iPad and compact iPhone should expose only these product roots:
- **发现**
- **书库**
- **设置**

### Discover owns
- Search Composer;
- advanced search/filter;
- Popular / Image Search / ranking/subscription / latest;
- categories;
- Continue Reading / latest gallery browsing.

Do not keep a second permanent Search root.

### Library owns
Segments/child management for:
- 全部;
- 收藏;
- 历史;
- 书签;
- 下载.

Do not keep separate Favorites / Downloads / History roots in sidebar/tab bar.

### Settings owns
- account/login status;
- E/Ex site;
- Reader/download/cache settings;
- manual Cookie fallback.

Do not add a separate Account root.

## Navigation

- root switching replaces root content;
- child page pushes one level only;
- Library segment selection should remain meaningful when returning from management scenes;
- do not fix navigation using repeated manual dismiss calls.

This pass is navigation cleanup, not another visual redesign.

---

# Preserve

- current translated multi-tag search implementation;
- working login/Cookie flow;
- fixed preview thumbnails;
- current Gallery Detail responsive direction;
- Reader/download core;
- comments/rating/local bookmark behavior.

# Handoff

After fixes:
- push to current branch;
- sync isolated DEV once;
- no broad acceptance campaign;
- report only:
  - Cloud Favorites fix/result;
  - Torrent parser/list fix;
  - Archive actionable download flow;
  - root-navigation de-duplication;
  - commits + diagnostics/focused checks.

Ask the user to test only:
1. Library → 收藏 shows the real 20+ cloud favorites/categories;
2. one gallery's torrent list shows real torrent entries;
3. Archive choice can proceed to a real download handoff or a clear server restriction;
4. root navigation now contains only 发现 / 书库 / 设置.

Stop and wait for user feedback.
