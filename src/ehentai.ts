import { Script, UIImage } from "scripting"

import {
  DETAIL_EXTRACT_SCRIPT,
  DetailExtractData,
  GallerySummary,
  PAGE_EXTRACT_SCRIPT,
  PREVIEW_EXTRACT_SCRIPT,
  PageExtractData,
  SearchExtractData,
  SEARCH_EXTRACT_SCRIPT,
} from "./extractors"
import {
  GalleryPageLink,
  buildSearchUrl,
  dedupeAndSortPageLinks,
  normalizePageLinks,
  withPreviewPage,
} from "./pure"

export type { GalleryPageLink, GallerySummary }

export type SearchPage = SearchExtractData & {
  url: string
}

export type GalleryDetail = Omit<DetailExtractData, "pageLinks"> & {
  pageLinks: GalleryPageLink[]
  sourceUrl: string
  truncatedPreviewPages: boolean
}

export type ResolvedImagePage = PageExtractData & {
  pageUrl: string
}

const MAX_PREVIEW_LIST_PAGES = 50
const IMAGE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"

function scraperError(result: any): string {
  if (result?.error?.message) return String(result.error.message)
  if (result?.error?.code) return String(result.error.code)
  return "网页抓取失败"
}

function requirePro(): void {
  if (!Script.hasFullAccess()) {
    throw new Error("第一阶段使用 Scripting 官方 WebScraper，需要 Scripting PRO。")
  }
}

export async function searchGalleries(keyword: string, directUrl?: string): Promise<SearchPage> {
  requirePro()
  const url = directUrl || buildSearchUrl(keyword)
  const result = await WebScraper.scrape<SearchExtractData>({
    url,
    wait: "domComplete",
    extractScript: SEARCH_EXTRACT_SCRIPT,
  })
  if (!result.ok || !result.data) throw new Error(scraperError(result))
  if (result.data.error) throw new Error(result.data.error)
  return {
    ...result.data,
    url: result.url || url,
  }
}

async function scrapePreviewPage(url: string, previewPageIndex: number): Promise<GalleryPageLink[]> {
  const result = await WebScraper.scrape<{ pageLinks: Array<{ index?: number; pageUrl?: string; thumb?: string }> }>({
    url,
    wait: "domComplete",
    extractScript: PREVIEW_EXTRACT_SCRIPT,
  })
  if (!result.ok || !result.data) throw new Error(scraperError(result))
  return normalizePageLinks(result.data.pageLinks || [], previewPageIndex)
}

export async function loadGalleryDetail(url: string): Promise<GalleryDetail> {
  requirePro()
  const result = await WebScraper.scrape<DetailExtractData>({
    url,
    wait: "domComplete",
    extractScript: DETAIL_EXTRACT_SCRIPT,
  })
  if (!result.ok || !result.data) throw new Error(scraperError(result))
  if (result.data.error) throw new Error(result.data.error)

  const firstLinks = normalizePageLinks(result.data.pageLinks || [], 0)
  const allLinks: GalleryPageLink[] = [...firstLinks]
  const previewPages = Math.max(1, Number(result.data.previewPages || 1))
  const pagesToLoad = Math.min(previewPages, MAX_PREVIEW_LIST_PAGES)

  for (let p = 1; p < pagesToLoad; p += 1) {
    const links = await scrapePreviewPage(withPreviewPage(url, p), p)
    allLinks.push(...links)
  }

  return {
    ...result.data,
    pageLinks: dedupeAndSortPageLinks(allLinks),
    sourceUrl: result.url || url,
    truncatedPreviewPages: previewPages > MAX_PREVIEW_LIST_PAGES,
  }
}

export async function resolveImagePage(pageUrl: string): Promise<ResolvedImagePage> {
  requirePro()
  const result = await WebScraper.scrape<PageExtractData>({
    url: pageUrl,
    wait: "domComplete",
    extractScript: PAGE_EXTRACT_SCRIPT,
  })
  if (!result.ok || !result.data) throw new Error(scraperError(result))
  if (result.data.error) throw new Error(result.data.error)
  return {
    ...result.data,
    pageUrl: result.url || pageUrl,
  }
}

export async function fetchPageImage(imageUrl: string, referer: string): Promise<UIImage> {
  const headers: Record<string, string> = {
    "User-Agent": IMAGE_UA,
    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    "Referer": referer,
  }
  const response = await (globalThis as any).fetch(imageUrl, { headers })
  if (!response.ok) {
    throw new Error(`图片请求失败：HTTP ${response.status}`)
  }
  const data = await response.data()
  const image = UIImage.fromData(data)
  if (!image) throw new Error("图片数据已下载，但无法解码。")
  return image
}
