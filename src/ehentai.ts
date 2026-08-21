import { UIImage } from "scripting"

import {
  GallerySummary,
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
import { parseImagePageHtml } from "./pageHtml"
import { reportDiagnostic } from "./githubBridge"
import { getBaseUrl, getCookieHeader } from "./account"

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

function requestOptions(url: string): Record<string, any> | undefined {
  const cookie = getCookieHeader(url)
  if (!cookie) return undefined
  return { headers: { Cookie: cookie } }
}

async function fetchHtml(url: string, stagePrefix: string): Promise<{ html: string; finalUrl: string; response: Response }> {
  let response: Response
  try {
    response = await fetch(url, requestOptions(url))
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
  const url = directUrl || buildSearchUrl(keyword, getBaseUrl())
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
  try {
    const { html, finalUrl, response } = await fetchHtml(pageUrl, "image-page")
    let parsed: PageExtractData
    try {
      parsed = parseImagePageHtml(html, finalUrl)
    } catch (error) {
      throw stageError("image-page.parse", error)
    }

    if (parsed.error) {
      const error = httpError(parsed.error, response, finalUrl)
      ;(error as any).responseLength = html.length
      throw error
    }

    const resolved: ResolvedImagePage = {
      ...parsed,
      pageUrl: finalUrl,
    }

    await reportSafely({
      stage: "gallery-image-page",
      ok: true,
      request: { url: finalUrl, status: Number(response?.status || 0), statusText: String(response?.statusText || "") },
      notes: `imageUrl=${resolved.imageUrl ? "yes" : "no"}; originalUrl=${resolved.originalUrl ? "yes" : "no"}`,
    })
    return resolved
  } catch (error) {
    const value = error as { status?: number; statusText?: string; url?: string }
    await reportSafely({
      stage: "gallery-image-page",
      ok: false,
      error,
      request: {
        url: String(value?.url || pageUrl),
        status: Number(value?.status || 0),
        statusText: String(value?.statusText || ""),
      },
    })
    throw error
  }
}

// 保留给后续需要自定义 Referer/下载原图的场景；当前 ReaderView 已直接使用 Image.imageUrl。
export async function fetchPageImage(imageUrl: string, referer: string): Promise<UIImage> {
  try {
    let response: Response
    try {
      const cookie = getCookieHeader(imageUrl)
      response = await fetch(imageUrl, {
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          Referer: referer,
          ...(cookie ? { Cookie: cookie } : {}),
        },
      })
    } catch (error) {
      throw stageError("image.fetch", error)
    }

    const finalUrl = String(response?.url || imageUrl)
    const status = Number(response?.status || 0)
    const statusText = String(response?.statusText || "")
    if (!response.ok) {
      throw httpError(`图片请求失败：HTTP ${status}${statusText ? ` ${statusText}` : ""}`, response, finalUrl)
    }

    let data: any
    try {
      data = await response.data()
    } catch (error) {
      throw stageError("image.response.data", error)
    }

    const image = (UIImage as any).fromData?.(data)
    if (!image) throw new Error("当前 Scripting 运行时不支持 UIImage.fromData；ReaderView 将继续使用 imageUrl。")

    await reportSafely({
      stage: "gallery-image-binary",
      ok: true,
      request: { url: finalUrl, status, statusText },
      notes: "decoded=yes",
    })
    return image
  } catch (error) {
    const value = error as { status?: number; statusText?: string; url?: string }
    await reportSafely({
      stage: "gallery-image-binary",
      ok: false,
      error,
      request: {
        url: String(value?.url || imageUrl),
        status: Number(value?.status || 0),
        statusText: String(value?.statusText || ""),
      },
    })
    throw error
  }
}
