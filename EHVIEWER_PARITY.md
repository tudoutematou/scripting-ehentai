# EhViewer Feature Parity Map — refreshed 2026-08-30

Reference: `xiaojieonly/Ehviewer_CN_SXJ`  
Reference branch: `BiLi_PC_Gamer`  
Reference head checked: `daa1510554c7109a586a20ee69ea348c63ffaa05` (2026-08-28)  
Target: Scripting iOS/iPadOS client  
Active branch: `feat/1.1-gallery-interaction`

This map tracks current code capability and meaningful behavioral parity. It does **not** claim the Android architecture should be copied. Runtime-dependent capabilities still require the real Scripting environment.

Legend: ✅ implemented | 🟡 partial / active bug | 🔴 missing | ⚪ platform/deferred | 🔵 intentionally not copied

## Browse / Search

| Capability | Status | Current Scripting state | Priority |
|---|---:|---|---:|
| Home / latest galleries | ✅ | Native responsive gallery browsing | — |
| Keyword search + paging | ✅ | Normal search core + paging | — |
| Advanced search | ✅ | Category exclusion, language, rating/pages, torrent, expunged and related flags | — |
| Translated multi-tag search | ✅ | Full EhTagTranslation-backed resolution and exact tag composition | — |
| Popular / Toplist | ✅ | Popular + public Toplist | — |
| Watched / subscriptions | ✅ | Logged-in Watched feed | — |
| Image search | ✅ | Native image picker/search flow; race guard added in bug sweep | — |
| Saved search / full-state restore | ✅ | Tags + exclusions + language + advanced state round-trip | — |
| AI natural-language search | ✅ | Scripting Assistant -> validated normal SearchState -> normal search core | project extension |

## Account / Site

| Capability | Status | Current Scripting state | Priority |
|---|---:|---|---:|
| E-Hentai Cookie login | 🟡 | Safari/manual import + Keychain + live validation; current import/navigation UI regression tracked as BS-11 | **0** |
| ExHentai login/site switch | 🟡 | Real Ex-domain auth validation and explicit Ex sync exist, but ordinary E-page capture cannot be assumed to provide Ex host cookies; current real-device gap tracked as BS-12 | **0** |
| Account overview / image limits | 🟡 | Stable basic values only | 4 |
| UConfig / site account configuration | 🔴 | Not implemented as a native account-settings screen | 2 |
| Identity Cookie management | 🟡 | Manual Cookie import exists; no EhViewer-style dedicated identity-cookie editor | 4 |
| My Tags | ✅ | Logged-in My Tags list with translated display/search | — |

## Gallery Detail / Interaction

| Capability | Status | Current Scripting state | Priority |
|---|---:|---|---:|
| Core metadata / cover / tags | ✅ | Native Detail with translated tags | — |
| Uploader navigation / related links | ✅ | Native navigation | — |
| Explicit Similar-gallery action | 🟡 | Server-provided relations are shown, but no dedicated EhViewer-style Similar action/core yet | 3 |
| Cover image search | ✅ | Native cover-search entry | — |
| Cloud Favorites | 🟡 | Named categories/counts, note, add/change/remove and server verification work; category rename/default/sort and batch move/delete/download are not implemented | 2 |
| Rating write | ✅ | `rategallery` using transient in-memory credentials only | — |
| Comments read | ✅ | Detail preview + dedicated comments scene | — |
| Comment post/edit | ✅ | Native confirmed mutations | — |
| Comment vote | ✅ | Native up/down/cancel behavior via server response | — |
| Torrent list | ✅ | Internal parser/list; known-positive real gallery fixed during Runtime Bug Sweep | — |
| Archive choices | 🟡 | Internal archive option parsing/request works, but not EhViewer's newest managed archive-download service/progress/pause-resume UX | 2 |
| Native share | 🔴 | No system Share action yet | 2 |
| H@H action/client | ⚪ | Not implemented; low-value/platform-specific for this Scripting client | deferred |
| Gallery newer-version/update detection | 🔴 | No EhViewer-style new-version/update flow identified in current Scripting code | 3 |
| Open in browser | ✅ | Safe external Safari action | — |
| Detail `问 AI` | ✅ | Safe metadata-only managed Assistant entry | project extension |

## Reader

| Capability | Status | Current Scripting state | Priority |
|---|---:|---|---:|
| Single-page reader | ✅ | Online/offline | — |
| Continuous vertical reader | 🟡 | Implemented; recent progress-write regression fixed, still less mature than EhViewer | 2 |
| Reading direction | ✅ | LTR / RTL page actions | — |
| Fit modes | ✅ | Screen / width | — |
| Tap zones / immersive overlays | ✅ | Left/right page zones + settings/progress overlays | — |
| Pinch zoom + pan | ✅ | Native MagnifyGesture + DragGesture; gesture feel remains device QA | — |
| Auto page | ✅ | Single-page timed auto advance | — |
| Adjacent preload | ✅ | Configurable limited preload | — |
| Original image preference | ✅ | Reader preference + per-page original action | — |
| In-reader thumbnail page navigator | 🔴 | Detail/Preview Browser can jump into Reader, but Reader has no EhViewer-style thumbnail navigator | 2 |
| Screen rotation/orientation preference | 🔴 | Not implemented | 3 |
| Start-position preference | 🔴 | Not implemented | 3 |
| Keep screen awake | 🔴 | Not implemented; verify Scripting API before promising | 3 |
| Reader HUD toggles (clock/battery/page interval) | 🔴 | Not implemented; progress itself exists | 4 |
| Custom brightness | ⚪ | Not implemented; platform/API feasibility first | deferred |
| Volume-button page turn | ⚪ | Android-oriented; do not emulate unless Scripting exposes a clean supported API | deferred |

## Download / Offline

| Capability | Status | Current Scripting state | Priority |
|---|---:|---|---:|
| Offline gallery download | ✅ | Create/run/pause/resume/retry/delete | — |
| Integrity / interrupted-state recovery | ✅ | Atomic writes + startup/reconcile recovery | — |
| Queue / concurrency controls | 🟡 | Core queue and limited concurrency; management UI remains basic | 2 |
| Background download | ⚪ | Current project is foreground-bound; must be proven possible before implementation | deferred |
| Resolution controls | 🟡 | Standard/original only; no EhViewer-style richer resolution list | 3 |
| Download timeout control | 🔴 | Not exposed | 4 |
| Queue ordering / sort | 🔴 | No EhViewer-style ascending/order controls | 3 |
| Sync/preload while reading | 🔴 | No dedicated download-while-reading pipeline | 3 |
| Restore/clean redundant/invalid downloads | 🟡 | Core recovery/delete exists, but no full EhViewer maintenance UX | 3 |
| Custom download location / media scan | ⚪ | Android filesystem/media behavior; not a direct parity target | deferred |

## Library

| Capability | Status | Current Scripting state | Priority |
|---|---:|---|---:|
| Cloud Favorites browser | ✅ | Server category names/counts/search/paging; production UI is bound to the active site and account session, and stale responses cannot overwrite the current page | — |
| Favorite category rename / default / sorting | 🔴 | No native UConfig-backed category management yet | 2 |
| Favorite batch move / delete / download | 🔴 | No multi-select cloud Favorite actions yet | 2 |
| Local bookmarks | ✅ | Add/remove/list | — |
| History | ✅ | History + clear/delete/reset progress | — |
| Reading progress / resume | ✅ | Online/offline, single/continuous paths | — |
| Saved searches | ✅ | Local full-state bookmarks | — |
| Download state integration | ✅ | Library shows download items/state | — |
| Rich sorting/filtering of local library | 🔴 | No EhViewer-style broader list/power-user sorting/filter controls | 3 |

## Settings / Power-user parity

| Capability | Status | Current Scripting state | Priority |
|---|---:|---|---:|
| Core Reader preferences | ✅ | Layout/direction/fit/original/preload/auto-page | — |
| Gallery site selector | 🟡 | Exists; current BS-11/BS-12 account-state UX must be fixed | **0** |
| Tag translation toggle/source | 🟡 | Translation cache/source is implemented internally; no user-facing toggle/source selector | 3 |
| Persistent filter / blacklist rules | 🔴 | Search filters exist, but no EhViewer-style persistent filter/blacklist engine | **2** |
| UConfig | 🔴 | Missing | **2** |
| Theme / automatic theme switch | 🔴 | No app-level EhViewer theme configuration | 4 |
| Launch page preference | 🔴 | No user-selectable initial Discover/Library/etc. | 3 |
| List/detail/thumb density/size controls | 🔴 | Responsive defaults only | 4 |
| Show Japanese title / comments / rating toggles | 🔴 | Content is shown when available; no per-feature display switches | 4 |
| Cache-size control | 🔴 | Clear cache exists; no size limit UI | 3 |
| Export/import local data backup | 🔴 | No full settings/library backup package | **2** |
| Proxy / custom hosts / DoH / domain fronting | ⚪ | Android/network-workaround features; only add if a concrete Scripting need appears | deferred |
| Wi-Fi server/client transfer | 🔵 | Android-specific transfer workflow; not a current target | — |
| Parse-body/crash-log diagnostic switches | 🔵 | Avoid copying broadly because this project has stricter privacy/no-raw-HTML rules | — |

## Recommended next additions after current Bug Sweep

Do not implement these until BS-11 / BS-12 and other active S0/S1 findings are closed.

1. **Account parity:** make E/Ex login/site state trustworthy and understandable; then add UConfig if useful.
2. **Persistent filter / blacklist:** high-value EhViewer behavior that normal one-off search filters do not replace.
3. **Reader navigation polish:** in-reader thumbnail navigator, start-position and orientation/keep-awake only where Scripting supports them cleanly.
4. **Download Manager parity:** better queue/order/progress, richer quality options, maintenance/restore; background behavior only if supported.
5. **Data backup/import:** export local Library/History/Search Bookmarks/Reader preferences without credentials.
6. **Small Detail actions:** native Share, explicit Similar flow, gallery newer-version handling where protocol behavior is clear.

## Do not copy merely for parity

- Android Activity/Fragment/SpiderQueen architecture.
- H@H client unless a real iOS/Scripting use case appears.
- Android media scan/download-folder semantics.
- Volume-button paging without a supported Scripting API.
- Custom hosts/DoH/domain-fronting/Wi-Fi transfer unless a concrete user problem requires them.
- Raw parse-error body/crash logging that weakens current privacy boundaries.

## Rating credential rule

EhViewer's Gallery detail parser reads `apiuid` and `apikey` transiently from the current Gallery page and uses them for `rategallery`. The Scripting implementation keeps equivalent credentials transient/in-memory only. Never persist, print, report or include them in diagnostics/fixtures.

## Reference rule

EhViewer defines expected behavior, not target architecture. Reuse the current Scripting network/account/parser/store/UI paths. Never port Android managers/Activities/Fragments/SpiderQueen/repository layers merely to resemble the reference source.
