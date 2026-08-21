export const E_HENTAI_BASE = "https://e-hentai.org/"

export type GalleryRef = {
  gid: string
  token: string
}

export type RawPageLink = {
  index?: number
  pageUrl?: string
  thumb?: string
  thumbX?: number
  thumbY?: number
  thumbWidth?: number
  thumbHeight?: number
}

export type GalleryPageLink = {
  id: string
  index: number
  pageUrl: string
  thumb: string
  thumbX: number
  thumbY: number
  thumbWidth: number
  thumbHeight: number
}

export function buildSearchUrl(keyword: string, baseUrl = E_HENTAI_BASE): string {
  const url = new URL(baseUrl)
  const value = keyword.trim()
  if (value) {
    url.searchParams.set("f_search", value)
  }
  return url.toString()
}

export function parseGalleryRef(url: string): GalleryRef | null {
  const match = url.match(/\/g\/(\d+)\/([a-f0-9]+)\/?/i)
  if (!match) return null
  return { gid: match[1], token: match[2] }
}

export function galleryDetailUrl(gid: string, token: string): string {
  return `${E_HENTAI_BASE}g/${gid}/${token}/`
}

export function withPreviewPage(detailUrl: string, page: number): string {
  const url = new URL(detailUrl)
  if (page > 0) url.searchParams.set("p", String(page))
  else url.searchParams.delete("p")
  return url.toString()
}

export function normalizePageLinks(
  rawItems: RawPageLink[],
  previewPageIndex = 0,
  fallbackPageSize = 40,
): GalleryPageLink[] {
  return rawItems
    .map((raw, localIndex) => {
      const pageUrl = String(raw.pageUrl || "").trim()
      if (!pageUrl) return null
      const parsedIndex = Number(raw.index || 0)
      const index = parsedIndex > 0
        ? parsedIndex
        : previewPageIndex * fallbackPageSize + localIndex + 1
      return {
        id: pageUrl,
        index,
        pageUrl,
        thumb: String(raw.thumb || "").trim(),
        thumbX: Math.max(0, Number(raw.thumbX || 0)),
        thumbY: Math.max(0, Number(raw.thumbY || 0)),
        thumbWidth: Math.max(0, Number(raw.thumbWidth || 0)),
        thumbHeight: Math.max(0, Number(raw.thumbHeight || 0)),
      }
    })
    .filter((item): item is GalleryPageLink => item != null)
}

export function dedupeAndSortPageLinks(items: GalleryPageLink[]): GalleryPageLink[] {
  const map = new Map<string, GalleryPageLink>()
  for (const item of items) {
    if (!map.has(item.pageUrl)) map.set(item.pageUrl, item)
  }
  return [...map.values()].sort((a, b) => a.index - b.index)
}
