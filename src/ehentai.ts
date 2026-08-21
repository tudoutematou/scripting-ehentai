import { Script, UIImage } from "scripting"

import {
  GallerySummary,
  PAGE_EXTRACT_SCRIPT,
  PageExtractData,
  SearchExtractData,
} from "./extractors"
import {
  GalleryPageLink,
  buildSearchUrl,
  dedupeAndSortPageLinks,
  normalizePageLinks,
  withPreviewPage,
} from "./pure"
import { parseSearchHtml } from "./searchHtml"
import { parseDetailHtml, parsePreviewPageHtml } from "./detailHtml"
import { reportDiagnostic } from "./githubBridge"

export type { GalleryPageLink, GallerySummary }

export type SearchPage = SearchExtractData & {
  url: string
}

export type GalleryDetail = ReturnType<typeof parseDetailHtml> & {
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
    throw new Error("图片页当前仍使用 Scripting WebScraper，需要 Scripting PRO。")
  }
}

function httpError(message: string, response: any, url: string): Error {
  const error = new Error(message) as Error & {
    status?: number
    statusText?: string
    url?: string
  }
  error.status = Number(response?.status || 0)
  error.statusText = String(response?.statusText || "")
  error.url = String(response?.url || url)
  return error
}

function stageError(stage: string, error: unknown): Error {
  const value = error as { name?: unknown; message?: unknown; stack?: unknown }
  const rawMessage = String(value?.message || error || "未知错误")
  const wrapped = new Error(`[${stage}] ${rawMessage}`)
  wrapped.name = String(value?.name || "Error")
  if (value?.stack) wrapped.stack = `${wrapped.name}: ${wrapped.message}\nCaused by:\n${String(value.stack)}`
  return wrapped
}

async function reportSafely(input: Parameters<typeof reportDiagnostic>[0]) {
  try {
    await reportDiagnostic(input)
  } catch {
    // 诊断通道失败不能覆盖真实业务错误。
  }
}

async function fetchHtml(url: string, stagePrefix: string): Promise<{ html: string; finalUrl: string; response: Response }> {
  let response: Response
  try {
    response = await fetch(url)
  } catch (error) {
    throw stageError(`${stagePrefix}.fetch`, error)
  }

  const finalUrl = String(response?.url || url)
  const status = Number(response?.status || 0)
  const statusText = String(response?.statusText || "")

  let html = ""
  try {
    html = await response.text()
  } catch (error) {
    throw stageError(`${stagePrefix}.response.text`, error)
  }

  if (!response.ok) {
    throw httpError(`E-Hentai 请求失败：HTTP ${status}${statusText ? ` ${statusText}` : ""}`, response, finalUrl)
  }

  return { html, finalUrl, response }
}

export async function searchGalleries(keyword: string, directUrl?: string): Promise<SearchPage> {
  const url = directUrl || buildSearchUrl(keyword)
  const { html, finalUrl, response } = await fetchHtml(url, "search")

  let page: SearchExtractData
  try {
    page = parseSearchHtml(html, finalUrl)
  } catch (error) {
    throw stageError("search.parseSearchHtml", error)
  }

  if (page.error) {
    const error = httpError(page.error, response, finalUrl)
    ;(error as any).responseLength = html.length
    throw error
  }

  return {
    ...page,
    url: finalUrl,
  }
}

async function fetchPreviewPage(url: string, previewPageIndex: number): Promise<GalleryPageLink[]> {
  const { html, finalUrl } = await fetchHtml(url, `preview[${previewPageIndex}]`)
  try {
    return normalizePageLinks(parsePreviewPageHtml(html, finalUrl), previewPageIndex)
  } catch (error) {
    throw stageError(`preview[${previewPageIndex}].parse`, error)
  }
}

export async function loadGalleryDetail(url: string): Promise<GalleryDetail> {
  try {
    const { html, finalUrl, response } = await fetchHtml(url, "detail")

    let parsed: ReturnType<typeof parseDetailHtml>
    try {
      parsed = parseDetailHtml(html, finalUrl)
    } catch (error) {
      throw stageError("detail.parseDetailHtml", error)
    }

    if (parsed.error) {
      const error = httpError(parsed.error, response, finalUrl)
      ;(error as any).responseLength = html.length
      throw error
    }

    const firstLinks = normalizePageLinks(parsed.pageLinks || [], 0)
    const allLinks: GalleryPageLink[] = [...firstLinks]
    const previewPages = Math.max(1, Number(parsed.previewPages || 1))
    const pagesToLoad = Math.min(previewPages, MAX_PREVIEW_LIST_PAGES)

    for (let p = 1; p < pagesToLoad; p += 1) {
      const links = await fetchPreviewPage(withPreviewPage(finalUrl, p), p)
      allLinks.push(...links)
    }

    const detail: GalleryDetail = {
      ...parsed,
      pageLinks: dedupeAndSortPageLinks(allLinks),
      sourceUrl: finalUrl,
      truncatedPreviewPages: previewPages > MAX_PREVIEW_LIST_PAGES,
    }

    await reportSafely({
      stage: "gallery-detail",
      ok: true,
      request: { url: finalUrl, status: Number(response?.status || 0), statusText: String(response?.statusText || "") },
      notes: `title=${detail.title ? "yes" : "no"}; tags=${detail.tags.length}; images=${detail.pageLinks.length}; previewPages=${previewPages}`,
    })
    return detail
  } catch (error) {
    const value = error as { status?: number; statusText?: string; url?: string }
    await reportSafely({
      stage: "gallery-detail",
      ok: false,
      error,
      request: {
        url: String(value?.url || url),
        status: Number(value?.status || 0),
        statusText: String(value?.statusText || ""),
      },
    })
    throw error
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
  const response = await fetch(imageUrl, { headers, timeout: 30, debugLabel: "E-Hentai Image" })
  if (!response.ok) {
    throw new Error(`图片请求失败：HTTP ${response.status}`)
  }
  const data = await response.data()
  const image = UIImage.fromData(data)
  if (!image) throw new Error("图片数据已下载，但无法解码。")
  return image
}
