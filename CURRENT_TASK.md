# CURRENT_TASK — 1.1.x User QA Fix Pass 4

Branch: `feat/1.1-gallery-interaction`

## Confirmed by user — freeze these

- Preview thumbnail duplication is fixed on the real device.
- Safari login + Cookie helper + import/validation now works on the real device.
- Do not reopen Preview or Login/Cookie work unless the user reports a new regression.

## New real-device bugs

1. **P0 — Cloud Favorites shows zero items in the App**
   - The same logged-in account has **20+ cloud favorites on the E-Hentai Favorites webpage**.
   - App → Library → Cloud Favorites currently shows no galleries.
   - Treat this as a parser/request integration bug, not as “the account has no favorites”.

2. **P0 — Home category navigation pushes extra stack levels**
   - From Home → 分类 → `其他` (and likely sibling categories), pressing Back requires many taps before Home is reached.
   - Expected: `Home → category results → Back → Home` in one Back action.

STOP adding new feature families. Fix only these two runtime bugs and hand back to the user.

## Development contract

- User real-device evidence is authoritative.
- Trace the real flow before editing.
- TypeScript diagnostics + one focused deterministic parser check where useful.
- No full regression, release audit, simulated acceptance, or feature expansion.
- Do not log/commit full authenticated HTML, Cookie values, gallery titles, gids/tokens, private URLs, or user data.
- Commit/push and report **Implemented · needs user test**.

---

# Fix A — P0 Cloud Favorites

## Current implementation to inspect

`FavoritesScene`
→ `loadFavorites()`
→ `buildFavoritesUrl()`
→ authenticated `fetchHtml(favorites.php)`
→ `parseFavoriteCategories()`
→ generic `parseSearchHtml()`
→ `FavoritesPage.items`

The account/session is now confirmed working on the real device. Do not restart by changing login/Cookie code.

## Reference behavior

Use EhViewer as the narrow behavioral/parser reference:

- `FavoritesParser.java`
- `GalleryListParser.java`
- `FavListUrlBuilder.java`

Important upstream facts:

1. “All cloud favorites” uses `favorites.php` without requiring `favcat=all`.
2. EhViewer treats Favorites as a dedicated page parser, not merely a normal search page.
3. Favorite categories are read from `.ido` → `.fp` entries. Upstream expects 11 `.fp` nodes; the first 10 are the actual favorite slots.
4. For each slot, the slot number is positional (0–9); count comes from child 0 and category name from child 2. Do **not** require a `favcat` attribute to exist on the `.fp` opening tag.
5. Gallery rows come from the `.itg` gallery-list container using the normal gallery-list behavior.

## Known suspicious code

Current `parseFavoriteCategories()` searches each `.fp` opening tag for a `favcat=0..9` attribute. That does not match EhViewer's parser model and can collapse all categories to the default zero-count placeholders.

Current `loadFavorites()` then reuses generic `parseSearchHtml()` for the gallery list. The user's real page has favorites but App gets zero items, so verify whether the current generic parser actually handles the authenticated Favorites `.itg` structure returned on this device.

## Required approach

1. Fetch the real authenticated `favorites.php` through existing `fetchHtml()` in the local DEV runtime if runtime inspection is available.
2. Inspect only safe structural facts in memory / local console when necessary:
   - final pathname (`favorites.php` only, no tokens/query dump);
   - response status;
   - number of `.ido`, `.fp`, `.itg` structures;
   - number of gallery-detail `/g/` anchors;
   - parsed item count and category counts.
3. Never print/save/report the full HTML or gallery identity/title/token data.
4. Implement a **favorites-specific parser boundary** in `favorites.ts` (or the smallest appropriate existing parser file):
   - parse 10 category slots by Favorites page structure/position;
   - parse the gallery list from `.itg` using existing gallery-summary parsing where it is actually compatible;
   - if generic `parseSearchHtml()` is the incompatible part, adapt/extract only the minimum `.itg` behavior required instead of building a second unrelated gallery model.
5. Preserve search, category filter, pagination, favorite mutation, notes, and current session routing.
6. The initial Favorites view must represent **all cloud favorites** and show the actual server items.

## Error behavior

If the authenticated response contains category counts or gallery `/g/` anchors but parser returns zero items, show a parser error rather than the misleading empty-state text “该收藏分类暂无画廊”.

A genuine server empty page may still show the empty state.

## Focused check

Add one deterministic fixture/check representing the Favorites page structure needed here:
- `.ido` with 10 favorite slots (+ summary slot if applicable);
- at least 2 gallery rows in `.itg`;
- assert correct category indexes/counts/names;
- assert gallery items are non-empty and keep distinct gid/token/url internally;
- do not use the user's real private favorites/HTML in the fixture.

---

# Fix B — P0 Home category navigation stack

## Confirmed root-cause area

Current Home Categories is rendered as:

`List → Section → LazyVGrid → many NavigationLink destinations`

This repeats the same class of bug previously seen when multiple unrelated `NavigationLink`s shared one aggregate List row.

## Required fix

- One semantic navigation destination per List row for Home categories.
- Do not keep all category `NavigationLink`s inside one `LazyVGrid`/VStack/HStack that is itself one List row.
- Prefer the simple reliable structure:
  - Section “分类”
  - one `NavigationLink` row per category
- Preserve the same category search states and labels.
- Do not patch Back/dismiss manually and do not manipulate the navigation stack imperatively.
- Do not redesign ResultsView.

## Narrow sibling check

Inspect only Home/List sections recently changed for the same exact pattern: multiple unrelated `NavigationLink`s inside one aggregate List row. Flatten those only if present. Do not start another UI redesign.

## User acceptance

After the fix the user should only need to test:
1. Home → 其他 → Back = Home with one tap.
2. Home → one other category → Back = Home with one tap.

---

# Preserve

- Working Preview sprite fix.
- Working Safari/Cookie/login flow.
- Existing E/Ex site selection and Keychain/session behavior.
- Gallery Detail, Reader, downloads, search, image search, comments, rating, torrent/archive features.
- User-QA workflow.

# Final handoff

After A+B:
- push to `feat/1.1-gallery-interaction`;
- no new features;
- no broad acceptance run;
- report only:
  - **Fix:** Cloud Favorites parser + Home category navigation;
  - **Commit:** SHA;
  - **Checks:** diagnostics + focused Favorites parser check;
  - **Please test:** cloud favorite count/items; one-tap category Back.

Stop and wait for user feedback.
