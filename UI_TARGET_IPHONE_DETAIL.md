# UI_TARGET_IPHONE_DETAIL — Mobile Gallery Detail Redesign

Status: approved UI target
Scope: iPhone / compact-width Gallery Detail only
Reference: user-approved mockup generated 2026-08-31

## Goal
Make Gallery Detail on iPhone reading-first instead of metadata-first.

The current mobile layout pushes preview thumbnails too far down because tags, basic information, resources and related content expand before preview. On compact width, preview and reading actions are the primary content.

Do not redesign iPad/regular-width layout in this task.
Do not change E-Hentai data/network semantics.
Do not remove existing capabilities; only change mobile hierarchy/presentation unless explicitly stated below.

## Approved visual hierarchy

Compact-width Gallery Detail must render in this order:

1. navigation header
2. compact hero: cover + title + concise metadata
3. primary reading action
4. favorite / download / local bookmark actions
5. page preview summary
6. collapsed Tags section
7. collapsed Basic Info section
8. collapsed Resources section
9. collapsed Related Content section

Preview must be visible within roughly the first 1–2 screens for a normal gallery.

## 1. Navigation header

Keep current back behavior from the navigation bug sweep.

Compact header:
- Back button on leading side;
- centered `画廊详情`;
- optional share/menu on trailing side only if already supported;
- do not add a second redundant title bar.

## 2. Compact hero card

Use a compact two-column hero on iPhone:

Left:
- cover image;
- fixed readable aspect ratio;
- use existing authenticated image loader;
- loading must not spin forever: success / placeholder-error / retry states must be explicit.

Right:
- title, maximum about 3 lines before truncation;
- uploader/artist when available;
- language/category compact chips;
- rating + rating count;
- authoritative page count;
- optional view/favorite count only if already available without extra heavy request.

Do not place the full Basic Info table here.
Do not allow the title/metadata to squeeze into unreadable single-line fragments.

Suggested component structure:

```tsx
function MobileGalleryHero(props: {
  detail: GalleryDetail;
  summary: GallerySummary;
  coverState: CoverState;
}) { ... }
```

Use existing typography/tokens; do not hard-code visual metrics if shared responsive tokens already exist.

## 3. Reading and primary actions

Immediately below hero:

Primary full-width action:
- `开始阅读` when no progress;
- `继续阅读 · 第 N 页` when progress exists.

Below it, one row of 3 actions:
- `收藏` / current cloud-favorite category state;
- `下载` / current download state;
- `本地书签`.

Use the current app glass/card language where supported by Scripting, but do not depend on unavailable native blur APIs. A rounded translucent card is acceptable fallback.

Do not put `资源`, `关联内容`, or long metadata before page preview.

## 4. Page preview — move before secondary metadata

This is the most important change.

Render `页面预览 · <authoritative total pages>` directly after primary actions.

Initial compact preview:
- show 6 thumbnails on iPhone, 3 columns × 2 rows;
- use existing first/incremental preview inventory from BS-16;
- never wait for complete gallery inventory;
- `查看全部` opens the existing incremental all-preview browser;
- thumbnail page labels are 1-based and truthful;
- if reading progress exists, prefer a useful nearby window around the current page when practical, otherwise first 6 pages is acceptable for phase 1.

Suggested API:

```tsx
function MobilePreviewCard({
  items,
  totalPages,
  currentPage,
  onOpenAll,
  onOpenPage,
}: MobilePreviewCardProps) { ... }
```

The preview component must not trigger whole-gallery eager enumeration.

## 5. Secondary sections become collapsed cards

After page preview, use four compact disclosure cards:

### Tags
Collapsed row example:
`标签 · 14    虚拟现实、VRMMO、游戏…    v`

Expanded state:
- existing namespace grouping/chips;
- clicking a tag preserves exact-tag search semantics fixed by BS-15;
- expansion is local UI state only.

### Basic Info
Collapsed row example:
`基本信息    语言 / 上传者 / 上传时间 / 文件大小    v`

Expanded content uses current data fields, for example:
- category;
- uploader;
- upload time;
- page count;
- parent gallery;
- visibility;
- language;
- file size;
- favorite count if already available.

Do not duplicate values already shown prominently in hero unless needed for completeness.

### Resources
Collapsed row:
`资源    种子 / 归档 / Safari    v`

Expanded content reuses current actions:
- torrent list;
- archive options;
- Safari open;
- other current resource actions.

Do not fetch torrent/archive data just because the disclosure row is visible; load on user expansion/action where possible.

### Related Content
Collapsed row:
`关联内容    上传者画廊 / 封面搜索 / 相似内容    v`

Expanded content reuses existing related actions.

All four sections should default to collapsed on iPhone.

Suggested reusable component:

```tsx
function MobileDisclosureCard({
  title,
  summary,
  expanded,
  onToggle,
  children,
}: MobileDisclosureCardProps) { ... }
```

## 6. Responsive split

Use compact-width detection already available in the project if possible.

Pseudo-structure:

```tsx
function GalleryDetailView(props) {
  const compact = useCompactLayout();

  if (compact) {
    return <MobileGalleryDetailLayout {...props} />;
  }

  return <RegularGalleryDetailLayout {...props} />;
}
```

Do not fork data loading into two independent implementations.
Both layouts must consume the same detail state, favorite state, reading progress, preview inventory, download state and navigation state.

Only presentation/order differs.

## 7. Mobile layout constraints

- one readable vertical column;
- no 2-column metadata table that causes labels/values to be clipped;
- no large empty spacer blocks;
- no permanently expanded long tag/resource/basic-info sections before preview;
- action tap targets remain comfortable;
- respect safe area / bottom navigation if present;
- avoid horizontal overflow;
- long title/uploader names wrap or truncate predictably;
- preview thumbnails preserve aspect ratio without forcing giant card heights.

## 8. Preserve current behavior

Must preserve:
- favorite state/category chooser;
- rating;
- download/offline flow;
- local bookmarks;
- comments/interactions;
- tag exact search;
- torrent/archive actions;
- uploader/cover/related searches;
- Reader/continue-reading progress;
- BS-14 controlled navigation;
- BS-16 incremental preview inventory.

Do not reintroduce per-item dynamic `NavigationLink` patterns while moving components.

## 9. Cover loading bug guard

While touching the hero, fix/verify the known symptom where Gallery Detail content/previews load but cover spinner never ends.

Required states:
- loading;
- loaded;
- failed placeholder;
- retry.

A canceled/obsolete request must leave loading state.
Use the existing authenticated/session-aware image path; do not create a second unauthenticated cover loader.

## 10. History pollution guard

Do not call `recordHistory()` merely because Gallery Detail mounted or preloaded during layout rendering.

Preferred semantics:
- opening Detail alone does not create a reading-history item;
- starting/continuing Reader creates or updates history;
- page progress updates existing history.

If changing this behavior would broaden the task too much, at minimum ensure the UI refactor does not create any additional Detail mounts or history writes.

## Verification

### Deterministic/static
- compact and regular layouts share one source of detail state;
- Preview appears before Tags/Basic Info/Resources/Related in compact layout;
- no full-inventory gate for compact preview;
- no new dynamic per-item NavigationLink stacking pattern;
- collapsed sections do not eagerly fetch heavy resource data merely to render their header.

### Required iPhone DEV smoke
Use at least:
1. a normal ~20–100 page gallery;
2. a long 1000+ page gallery;
3. one gallery with many tags/resources.

Confirm:
- Detail opens with hero/actions quickly;
- page preview is visible within roughly first 1–2 screens;
- first 6 previews display without waiting for all pages;
- `查看全部` works with incremental loading;
- Tags/Basic Info/Resources/Related default collapsed and expand repeatedly;
- cover never remains infinite-spinner after the rest of Detail has settled;
- start/continue reading works;
- one Back returns to the previous list;
- no horizontal clipping on iPhone.

## Handoff
Report only:
- files/components changed;
- commit SHA;
- exact iPhone runtime paths exercised;
- any Scripting framework limitation that prevents matching the approved mockup exactly.
