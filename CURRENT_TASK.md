# CURRENT_TASK — 1.1 Gallery Interaction

Branch: `feat/1.1-gallery-interaction`  
Base: `main` at `f74c4578993e8ed4e7f7481393df998449ea0660`

## Repository role

- `main` is now the authoritative long-term development baseline.
- `release/1.0` is retained as the 1.0 release snapshot and must not receive new feature work.
- New work branches from `main` and returns to `main` through focused PRs.

## Product direction

Use `xiaojieonly/Ehviewer_CN_SXJ` as the primary behavioral reference for missing E-Hentai client capabilities.

Do not translate Android/Java architecture into Scripting. For each capability:
1. inspect the current Scripting implementation first;
2. inspect the narrow EhViewer scene/engine/parser path that defines behavior;
3. write the smallest behavior contract;
4. reuse the existing account/network/parser/store/UI paths;
5. add one focused deterministic regression check for non-trivial parser/action logic;
6. verify in the isolated `E-Hentai 浏览器 DEV` script before declaring runtime acceptance.

`EHVIEWER_PARITY.md` is the feature map and priority source. It is not permission to implement later milestones automatically.

## 1.1 scope — Gallery Interaction

The existing 1.0 Detail already reads comments, shows aggregate rating, exposes torrent/archive URLs, manages favorites/bookmarks, and starts downloads. Do not rebuild those paths.

Implement the missing interaction layer in small vertical slices, in this order:

### A. Comments experience
- Give existing parsed comments a dedicated native comments scene reachable from Gallery Detail.
- Keep a compact comment preview/count in Detail instead of rendering an unbounded full comment list there.
- Preserve author/date/text and existing sanitization; do not log comment text.
- Do not add comment posting/editing/voting in this slice unless the existing cookie/form path is verified end-to-end first.

### B. Torrent list
- Replace the current torrent-popup-only experience with an internal list when `torrentUrl` exists.
- Parse only stable fields needed by the UI: torrent name, posted date, download URL.
- Normalize the download URL the same way EhViewer does by removing the private `?p=` suffix when present.
- Keep “open externally” as a fallback; do not build a torrent client.

### C. Rating feasibility
- Investigate EhViewer `rategallery` behavior and document whether the current account model has the required `apiuid`/`apikey` material.
- If credentials are not already available through a safe existing path, mark rating write as blocked/deferred rather than inventing credential storage or scraping secrets.

## Preserve

- Detail Core-first loading and preview background loading.
- Existing E/Ex routing and Cookie/Keychain safety.
- Current 760pt centered iPad landscape Detail width, vertical metadata label/value layout, and adaptive tag grid.
- Existing Reader/download/library core behavior.
- Stable local `E-Hentai 浏览器`; runtime work uses only `E-Hentai 浏览器 DEV`.
- No broad parser/network/store rewrite and no speculative abstractions.

## Acceptance for this branch

- Comments scene works from real Gallery Detail and does not duplicate network loading unnecessarily.
- Torrent parser has one deterministic self-test fixture and invalid/empty input is safe.
- Torrent scene loads through the existing authenticated `fetchHtml` path and external fallback remains available.
- Rating feasibility is recorded in `DEV_PROGRESS.md` / parity map with concrete evidence.
- Existing self tests and smoke checks stay green.

## Reporting

Report only:
1. completed vertical slice;
2. focused verification result;
3. runtime evidence still needed;
4. next authorized slice.
