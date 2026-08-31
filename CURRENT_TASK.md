# CURRENT_TASK — Cloud Favorites Management / UConfig Phase 1

Branch: `feat/1.1-gallery-interaction`
Parity reference: `EHVIEWER_PARITY.md`

## Goal
Add native management for E-Hentai cloud favorite categories now that the Runtime Bug Sweep is stable enough for normal use.

Do not merge `main` automatically.
Do not reopen unrelated bug-sweep work unless a regression is directly caused by this task.

## Required scope

### 1. Favorite category rename
Add a native `收藏分类管理` entry under Library/Favorites management.

Load the authoritative current 10 cloud favorite categories from the active logged-in site/account.
Show each category with:
- index 0–9;
- current server name;
- current item count when available.

Allow the user to edit the display name of each category.

Rules:
- changes must be submitted to E-Hentai server-side UConfig/My Settings, not stored as a local-only alias;
- never silently replace server names with `Favorites 0..9` because parsing failed;
- do not write anything until the user explicitly saves;
- after save, re-fetch authoritative server state and only report success if returned names match the requested values;
- validation errors/server rejection must keep the old truthful state;
- no Cookie/raw HTML/private URL logging.

### 2. Default favorite category
If current server UConfig exposes a clear default-favorite-category field and EhViewer behavior is unambiguous, add a native picker in the same management scene.

Requirements:
- show current server value;
- submit through the same UConfig mutation path;
- verify by re-fetching after save.

If protocol/field semantics are unclear, implement rename first and leave default-category as a documented follow-up instead of guessing.

### 3. Favorite category ordering
Inspect current EhViewer/default server behavior first.
Only implement category ordering if the server actually supports persistent ordering independently of category index and the behavior is clearly reproducible.
Do not fake reordering locally while server categories remain fixed 0–9.

### 4. UI behavior
Use the current app visual language:
- one compact management card/list for the 10 categories;
- editable text fields or a simple edit sheet;
- one explicit `保存` action;
- disabled/busy state while submitting;
- concise success/error notice;
- on iPhone use a single-column readable list;
- on iPad keep it compact, not a huge settings form.

After successful save:
- Library → Favorites category chips/names refresh immediately;
- Gallery Detail favorite chooser uses the new names immediately;
- no app restart required.

### 5. Shared state / cache invalidation
Reuse the existing favorites/account/network layer.
Do not create a second local source of truth for category names.

After a successful server mutation:
- invalidate/reload any cached favorites category metadata;
- refresh visible Library/Favorites state;
- refresh any Detail favorite chooser/category label that is already mounted when technically safe;
- respect account/session/site generation guards so late responses from another account/site cannot overwrite current state.

### 6. Verification
Focused deterministic checks:
- parse current UConfig favorite category names;
- build a valid rename submission without dropping unrelated required UConfig fields;
- reject malformed/empty invalid submissions according to actual server behavior;
- post-save verification detects mismatch;
- no local fallback overwrites verified server names.

Required real DEV runtime smoke with the current real account:
1. open `收藏分类管理`;
2. read current 10 server names;
3. rename one currently-default category (for example a `Favorites N` slot) to a temporary harmless test name;
4. submit and verify server returns the new name;
5. confirm Library Favorites and Gallery Detail chooser display the new name;
6. rename it back to its original value and verify again, unless the user intentionally wants to keep the new name.

Do not modify the user's already-custom category names merely for testing.
Do not perform broad destructive batch changes.

## Preserve
- current cloud Favorites browsing/search/paging;
- add/change/remove favorite for individual galleries;
- favorite notes;
- account/session separation;
- E/Ex site switching;
- AI recommendation/search;
- Reader/preview/download behavior;
- navigation fixes from the Runtime Bug Sweep.

## Handoff
Report only:
- what was implemented;
- commit SHA;
- exact real DEV rename/verify/restore runtime result;
- whether default category and ordering were implemented or deferred, with one-line reason.
