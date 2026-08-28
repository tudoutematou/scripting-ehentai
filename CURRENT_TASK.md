# CURRENT_TASK — 1.1 Final Real-device QA Cleanup

Branch: `feat/1.1-gallery-interaction`

## Goal
The major 1.1 feature/UI work is already implemented. This task is now intentionally narrow: fix only the remaining real-device QA problems below, then hand the DEV build back to the user.

Do **not** rerun or rewrite already-working Search/Reader/Login/UI work.

## Freeze / preserve
Keep working behavior unless a new regression is directly caused by this cleanup:
- Safari login / Cookie helper / import + validation.
- Preview sprite correctness.
- Full EhTagTranslation and translated multi-tag search.
- Search category exclusion / advanced filters / full-state search bookmarks.
- Reader tap zones / quick settings / progress / auto-page.
- Root areas = `发现 / 书库 / 设置`.
- Cloud Favorites server access.
- Current Gallery Detail visual direction and basic-information/tag/comment styling.
- Archive flow unless a new archive regression is reported.

## Workflow
- Inspect current head first.
- Minimal root-cause changes only.
- Reuse current GallerySummary/store/session/parser/Reader code.
- TypeScript diagnostics + focused Torrent/navigation/state checks only.
- No full acceptance run or repeated bootstrap ritual.
- Commit logical fixes, push, sync isolated DEV once, stop.
- Final status: **Implemented · needs user test**.

---

# A — Library gallery cards: one visual language everywhere

## Real-device problem
`书库 → 全部 / 历史 / 书签 / 下载` still squeezes gallery titles badly. Some specialized child lists also use wide/list-row compositions that feel inconsistent with Discover.

## Required UI
For **Library content browsing** use the same gallery card/grid language as the current Discover `最新画廊` layout.

### Regular iPad
- exactly **3 gallery cards per row** at normal landscape width;
- useful cover size;
- title gets about 2–3 readable lines;
- category + uploader/pages/date/progress/status remain compact secondary information;
- card dimensions should visually match the successful Discover grid.

Apply this browsing presentation to:
- 全部;
- 收藏;
- 历史;
- 书签;
- 下载.

Do not put a horizontal `GalleryRow` inside a 3-column grid. Create/reuse a true card composition suitable for a grid.

### History
Card may add a small progress line/bar such as `第 12 页 / 100` using existing history data.

### Bookmark
Card may show a small bookmark indicator/status.

### Download
Card may show compact download state/progress, but browsing the gallery remains card-based.
Complex actions such as pause/retry/delete may stay in a **single dedicated download-management child scene**, reached through one management action rather than being embedded into every card.

### Compact iPhone
Keep adaptive 1–2 columns.

---

# B — Library navigation stack: one gallery = one pushed level

## Real-device problem
Opening a gallery from Library History/Bookmarks/Downloads can create a layered navigation stack, so Back must be tapped repeatedly before returning to Library. The number of Back taps can grow with the number of items.

## Current risky pattern
Do not place many unrelated `NavigationLink` destinations inside one aggregate `LazyVGrid`/List row in a way that Scripting/SwiftUI interprets as nested navigation state.

## Required behavior
For every Library segment:

`Library → one Gallery Detail → Back → Library`

One Back only, regardless of whether Library contains 3 items or 300.

Required:
- use a navigation pattern proven to produce one push for the tapped gallery;
- keep the selected Library segment after returning;
- do not stack every card as a hidden navigation level;
- do not fix this with repeated dismiss/back calls;
- do not push `HistoryScene / LocalBookmarksScene / DownloadsScene` merely to open a normal gallery from the Library grid.

Specialized management scenes may remain, but they are separate explicit management destinations.

Focused/manual structural check:
- render multiple cards;
- opening the Nth card must not imply N navigation pushes;
- Gallery Detail Back returns directly to the originating Library segment.

---

# C — Gallery Detail preview architecture: compact summary + dedicated full browser

## Real-device problem
A gallery with 100+ pages renders every preview down the **right** column of the iPad Detail layout. The left Detail column ends much earlier, creating a huge blank left half while the right side continues for dozens of rows.

This is a layout architecture problem, not a thumbnail-spacing problem.

## Final design
Do **not** render the entire preview inventory inside the right Detail column.

### C1. Detail preview summary
Keep the approved two-column Detail content for identity/tags/comments/resources.

Then make `页面预览` a **full-width section below the two-column top content** on regular iPad.

In the Detail page:
- show only the first **12–18 previews** (choose a clean complete row count for the current grid, e.g. 15 or 18);
- header shows `页面预览 · <total>`;
- provide a clear `查看全部` action whenever total > summary limit;
- every visible preview still opens Reader at the correct page;
- keep retry/loading status when preview inventory is incomplete;
- do not discard the full `pageLinks` inventory internally; only limit what the Detail UI renders.

This removes the giant empty left column while keeping Detail fast to scan.

### C2. Full Preview Browser
Create one dedicated child scene, e.g. conceptually `AllPreviewsScene` / `PreviewBrowserScene`.

It receives the existing complete `pageLinks` + GallerySummary and displays all available previews.

Regular iPad:
- full content width;
- adaptive/lazy grid, roughly 5–7 thumbnails per row depending on available width;
- consistent thumbnail aspect/spacing;
- page number visible;
- tapping page N opens Reader at N;
- normal one-level Back returns to Gallery Detail.

Compact iPhone:
- adaptive 3–4 columns if readable.

Performance:
- use `LazyVGrid` / existing cached thumbnails so off-screen thumbnails do not all need to render at once;
- do not create 100 separate nested navigation levels;
- preserve existing preview sprite/direct-thumbnail cache and background preview-page loading.

### C3. Optional useful controls
Only if small and easy with current native APIs:
- page jump field/button in the full preview browser;
- current reading-progress marker.

Do not add sorting/filtering or another feature family.

---

# D — Torrent list: structural parser parity, no over-filtering

## Real-device problem
The fake `All` torrent is gone, but real galleries still frequently show `服务器未返回可用种子`.

## Important correction
Follow EhViewer `TorrentParser.java` **structurally**.

Upstream behavior:
1. split `<form>...</form>` blocks;
2. require the real torrent row containing `<td colspan="5"> ... <a href="...">NAME</a></td>`;
3. parse Posted spans;
4. strip private `?p=` suffix;
5. accept that structurally identified href.

EhViewer does **not** apply an extra `.torrent URL must look plausible` gate after locating the correct torrent cell.

## Required parser changes
- keep removal of the dangerous whole-form generic-anchor fallback;
- keep rejection of navigation/filter anchors by requiring the correct torrent cell;
- once an href is found inside the verified torrent cell, normalize it with the page base URL and strip `?p=`;
- **remove/relax the additional URL-shape plausibility filter if it can reject a structurally valid torrent row**;
- preserve real torrent name and Posted date;
- do not require link text to contain `Download`;
- do not fabricate `All` or any navigation item;
- zero structurally valid torrent rows => truthful empty state + Safari original-page fallback.

## Focused fixture
Mirror current EhViewer `TorrentParserTest` structure:
- two forms;
- `<td colspan="5">` torrent rows;
- expected two parsed items;
- Posted values parsed;
- `?p=` removed;
- names preserved;
- add a fake `All` outside/elsewhere and prove it is not parsed.

## Safe runtime diagnosis if the real device still returns zero
Do not log HTML, torrent URLs, gallery gid/token or Cookie.
Only expose/report safe structural counts such as:
- formCount;
- torrentCellCount;
- torrentAnchorCount;
- parsedItemCount.

This tells whether the current E-Hentai HTML shape has changed without leaking private data.

Reference:
- EhViewer `TorrentParser.java`
- EhViewer `TorrentParserTest.java`

---

# Preserve UI / behavior
- Discover current successful 3-column gallery design.
- Approved Gallery Detail top layout, Basic Information key/value card, rounded tag chips and comments.
- Reader behavior and search behavior already implemented.
- Cloud Favorites parsing.
- Existing image/cache priority scheduler.

# Execution order
1. Build/reuse a true Gallery Card for 3-column Library browsing.
2. Apply it to Library All/Favorites/History/Bookmarks/Downloads.
3. Fix Library gallery navigation to one push/one Back.
4. Refactor Gallery Detail so full-width preview summary is below the two-column top content.
5. Add dedicated full Preview Browser with lazy adaptive grid.
6. Align Torrent parser exactly to EhViewer structural behavior and remove over-filtering.
7. Run TS diagnostics + focused Torrent/navigation/state checks.
8. Push commits and sync isolated DEV once.
9. Stop.

# User test only
Ask the user to test:
1. Library `全部 / 收藏 / 历史 / 书签 / 下载` all use readable 3-column cards on iPad.
2. Open any Library gallery, Back once = same Library segment.
3. A 100+ page Gallery Detail no longer has a huge empty half-page; Detail shows a compact preview summary.
4. `查看全部` opens a dedicated full preview grid; tapping page N opens Reader at N; one Back returns Detail.
5. A gallery known to have torrents shows real torrent entries; no `All`; a gallery with no torrents shows a truthful empty state.

Do not merge `main` automatically.
