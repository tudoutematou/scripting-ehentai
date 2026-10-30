/** Decode the site's 16px star sprite. Unknown styles remain unknown. */
export function parseListRatingStyle(style: string): number | null {
  const position = style.match(/(?:^|;)\s*background-position\s*:\s*(-?\d+)(?:px)?\s+(-?\d+)px\s*(?:;|$)/i)
  if (!position) return null
  const x = Number(position[1]), y = Number(position[2])
  if (x > 0 || x < -80 || x % 16 !== 0 || (y !== -1 && y !== -21)) return null
  const rating = 5 + x / 16 - (y === -21 ? 0.5 : 0)
  return rating >= 0 && rating <= 5 ? rating : null
}
function validListRating(rating: number | null | undefined): rating is number {
  return typeof rating === "number" && Number.isFinite(rating) && rating >= 0 && rating <= 5
}
export function galleryRatingLabel(rating: number | null | undefined): string {
  return validListRating(rating) ? `≈${rating.toFixed(1)}` : "评分未知"
}
export function galleryRatingStars(rating: number | null | undefined): string[] {
  const value = validListRating(rating) ? rating : 0
  return [1, 2, 3, 4, 5].map(slot => value >= slot ? "star.fill" : value >= slot - 0.5 ? "star.leadinghalf.filled" : "star")
}

export const E_HENTAI_BASE = "https://e-hentai.org/"

export type GalleryRef = { gid: string; token: string }

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
  if (value) url.searchParams.set("f_search", value)
  return url.toString()
}

export function parseGalleryRef(url: string): GalleryRef | null {
  const match = url.match(/\/g\/(\d+)\/([a-f0-9]+)\/?/i)
  return match ? { gid: match[1], token: match[2] } : null
}

export function galleryDetailUrl(gid: string, token: string): string { return `${E_HENTAI_BASE}g/${gid}/${token}/` }
export function withPreviewPage(detailUrl: string, page: number): string { const url = new URL(detailUrl); if (page > 0) url.searchParams.set("p", String(page)); else url.searchParams.delete("p"); return url.toString() }

export function normalizePageLinks(rawItems: RawPageLink[], previewPageIndex = 0, fallbackPageSize = 40): GalleryPageLink[] {
  return rawItems.map((raw, localIndex) => {
    const pageUrl = String(raw.pageUrl || "").trim()
    if (!pageUrl) return null
    const parsedIndex = Number(raw.index || 0)
    return { id: pageUrl, index: parsedIndex > 0 ? parsedIndex : previewPageIndex * fallbackPageSize + localIndex + 1, pageUrl, thumb: String(raw.thumb || "").trim(), thumbX: Math.max(0, Number(raw.thumbX || 0)), thumbY: Math.max(0, Number(raw.thumbY || 0)), thumbWidth: Math.max(0, Number(raw.thumbWidth || 0)), thumbHeight: Math.max(0, Number(raw.thumbHeight || 0)) }
  }).filter((item): item is GalleryPageLink => item != null)
}

export function dedupeAndSortPageLinks(items: GalleryPageLink[]): GalleryPageLink[] {
  const map = new Map<string, GalleryPageLink>()
  for (const item of items) if (!map.has(item.pageUrl)) map.set(item.pageUrl, item)
  return [...map.values()].sort((a, b) => a.index - b.index)
}
