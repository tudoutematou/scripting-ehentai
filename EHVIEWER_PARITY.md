# EhViewer Feature Parity Map

Reference: `xiaojieonly/Ehviewer_CN_SXJ`  
Target: Scripting iOS/iPadOS client  
Baseline: `main` after 1.0 promotion

Legend: ✅ usable | 🟡 partial | 🔴 missing | ⚪ platform/deferred | 🔵 intentionally not copied

| Area | Capability | Status | Current Scripting state | Priority |
|---|---|---:|---|---:|
| Browse | Home / latest galleries | ✅ | Native list + detail navigation | — |
| Browse | Search | ✅ | Keyword + pagination | — |
| Browse | Advanced search | ✅ | Category, language/quick filters, rating/pages/torrent/expunged filters | — |
| Browse | Popular / Toplist | ✅ | Popular search + public toplist | — |
| Browse | Watched | ✅ | Logged-in watched feed | — |
| Account | Cookie login / E / Ex | ✅ | Safari/manual import, Keychain, validation, site switch | — |
| Account | Account overview | 🟡 | Image limit/basic values only | 4 |
| Detail | Core metadata | ✅ | Titles, cover, uploader, rating aggregate, metadata, tags | — |
| Detail | Related galleries / uploader | ✅ | Native navigation | — |
| Detail | Comments read | 🟡 | Parsed and rendered inline; no dedicated scene | 1 |
| Detail | Comment post/edit | 🔴 | Cookie/form path exists in EhViewer reference but is not implemented here | 2 |
| Detail | Comment vote | 🔴 | EhViewer uses gallery-page `apiuid` / `apikey`; implement only after rating path proves safe | 3 |
| Detail | Gallery rating write | 🟡 | Feasible: EhViewer extracts `apiuid` / `apikey` from current Gallery HTML and calls site `/api.php`; Scripting parser does not yet expose them | 1 |
| Detail | Torrent list | 🟡 | Popup URL only; no internal list | 1 |
| Detail | Archive options | 🟡 | External archive URL only | 3 |
| Favorites | Cloud favorites | ✅ | 0–9 categories, note, add/change/remove with verification | — |
| Library | Local bookmarks | ✅ | Local add/remove/list | — |
| Library | History | ✅ | History + clear/delete | — |
| Library | Reading progress | ✅ | Stored/resume from Gallery | — |
| Library | Saved searches | ✅ | Local saved search list | — |
| Tags | Tag translation | ✅ | Translation + localized common tags | — |
| Tags | My Tags | ✅ | Logged-in My Tags list/search | — |
| Reader | Single-page reader | ✅ | Prev/next/jump/original | — |
| Reader | Continuous reader | 🟡 | Batched vertical reader, not full EhViewer parity | 2 |
| Reader | Preload | 🟡 | Adjacent preload; limited controls | 2 |
| Reader | Tap zones / immersive controls | 🔴 | Not implemented | 2 |
| Reader | Reading direction / fit modes | 🔴 | Not implemented | 2 |
| Reader | Thumbnail page navigator | 🟡 | Detail preview grid can enter Reader; no in-reader navigator | 3 |
| Reader | Zoom gestures | ⚪ | Depends on current Scripting native image/gesture support | 3 |
| Download | Offline gallery download | ✅ | Create/run/pause/resume/retry/delete | — |
| Download | Queue / concurrency manager UX | 🟡 | Core exists; UI/state model is basic and foreground-bound | 2 |
| Download | Background downloading | ⚪ | Platform capability must be verified; do not fake it | — |
| Download | Integrity / recovery | ✅ | Atomic writes + reconcile checks | — |
| Cache | Image cache | ✅ | Disk cache + clear/reconciliation support | — |
| Settings | Reader preferences | 🟡 | Layout, original preference, preload count | 3 |
| Settings | EhViewer-level power-user controls | 🔴 | Deferred until Reader/Download parity is stronger | 4 |

## Delivery order

1. **1.1 Gallery Interaction** — dedicated comments scene, internal torrent list, gallery rating write with ephemeral Gallery credentials.
2. **1.2 Reader Parity** — reading direction, tap zones, immersive controls, navigation/fallback/preload improvements.
3. **1.3 Download Manager** — queue/state UX, progress visibility, retry/detail management, platform-background feasibility.
4. **1.4 Library Integration** — expose favorite/history/progress/download state coherently around the same gallery.
5. **1.5 Discovery & Tags** — polish existing Watched/Toplist/My Tags/saved-search flows rather than rebuild them.
6. **1.6 Settings / Power User** — only controls backed by real implemented behavior.

## Rating credential rule

EhViewer's `GalleryDetailParser` reads `apiuid` and `apikey` from the current Gallery page JavaScript and uses them for `rategallery`. The Scripting implementation may mirror that behavior only as transient in-memory Gallery data. Never persist, print, report, or include either value in diagnostics, sync manifests, errors, or repository fixtures.

## Reference rule

EhViewer defines expected behavior, not target architecture. Reuse the current Scripting network/account/parser/store/UI paths. Never port `SpiderQueen`, Android Activities/Fragments, managers, repositories, or Java abstractions just to resemble the reference source.
