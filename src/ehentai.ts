import { UIImage } from "scripting"
import { GallerySummary, PageExtractData, SearchExtractData } from "./extractors"
import { GalleryPageLink, buildSearchUrl, dedupeAndSortPageLinks, normalizePageLinks, withPreviewPage } from "./pure"
import { parseSearchHtml } from "./searchHtml"
import { parseDetailHtml, parsePreviewPageHtml } from "./detailHtml"
import { parseImagePageHtml } from "./pageHtml"
import { reportDiagnostic } from "./githubBridge"
import { getBaseUrl, getCookieHeader } from "./account"

export type { GalleryPageLink, GallerySummary }
export type SearchPage = SearchExtractData & { url: string }
export type GalleryDetail = Omit<ReturnType<typeof parseDetailHtml>, "pageLinks"> & { pageLinks: GalleryPageLink[]; sourceUrl: string; truncatedPreviewPages: boolean }
export type PreviewLoadResult = { pageLinks: GalleryPageLink[]; failedPreviewPages: number[]; elapsedMs: number }
export type ResolvedImagePage = PageExtractData & { pageUrl: string }

const MAX_PREVIEW_LIST_PAGES = 50
const detailCoreCache = new Map<string, GalleryDetail>()
const previewPageCache = new Map<string, GalleryPageLink[]>()

function httpError(message: string, response: any, url: string): Error {
  const error = new Error(message) as Error & { status?: number; statusText?: string; url?: string }
  error.status = Number(response?.status || 0); error.statusText = String(response?.statusText || ""); error.url = String(response?.url || url); return error
}
function stageError(stage: string, error: unknown): Error { const value = error as any; const wrapped = new Error(`[${stage}] ${String(value?.message || error || "未知错误")}`); wrapped.name = String(value?.name || "Error"); if (value?.stack) wrapped.stack = `${wrapped.name}: ${wrapped.message}\nCaused by:\n${String(value.stack)}`; return wrapped }
async function reportSafely(input: Parameters<typeof reportDiagnostic>[0]) { try { await reportDiagnostic(input) } catch {} }
const HTML_REQUEST_TIMEOUT_MS = 20_000

function requestOptions(url: string): Record<string, any> { const cookie = getCookieHeader(url); return { ...(cookie ? { headers: { Cookie: cookie } } : {}), signal: AbortSignal.timeout(HTML_REQUEST_TIMEOUT_MS) } }
async function fetchHtml(url: string, stagePrefix: string): Promise<{ html: string; finalUrl: string; response: Response }> {
  let response: Response; try { response = await fetch(url, requestOptions(url)) } catch (error) { throw stageError(`${stagePrefix}.fetch`, error) }
  const finalUrl = String(response?.url || url); const status = Number(response?.status || 0); const statusText = String(response?.statusText || "")
  let html = ""; try { html = await response.text() } catch (error) { throw stageError(`${stagePrefix}.response.text`, error) }
  if (!response.ok) throw httpError(`E-Hentai 请求失败：HTTP ${status}${statusText ? ` ${statusText}` : ""}`, response, finalUrl)
  return { html, finalUrl, response }
}

export async function searchGalleries(keyword: string, directUrl?: string): Promise<SearchPage> {
  const url = directUrl || buildSearchUrl(keyword, getBaseUrl()); const { html, finalUrl, response } = await fetchHtml(url, "search")
  let page: SearchExtractData; try { page = parseSearchHtml(html, finalUrl) } catch (error) { throw stageError("search.parseSearchHtml", error) }
  if (page.error) { const error = httpError(page.error, response, finalUrl); (error as any).responseLength = html.length; throw error }
  return { ...page, url: finalUrl }
}

async function fetchPreviewPage(url: string, previewPageIndex: number): Promise<GalleryPageLink[]> {
  const cached = previewPageCache.get(url); if (cached) return cached
  const { html, finalUrl } = await fetchHtml(url, `preview[${previewPageIndex}]`)
  try { const links = normalizePageLinks(parsePreviewPageHtml(html, finalUrl), previewPageIndex); previewPageCache.set(url, links); return links } catch (error) { throw stageError(`preview[${previewPageIndex}].parse`, error) }
}

export async function loadGalleryDetailCore(url: string): Promise<GalleryDetail> {
  const cached = detailCoreCache.get(url); if (cached) return cached
  const started = Date.now()
  try {
    const { html, finalUrl, response } = await fetchHtml(url, "detail-core")
    let parsed: ReturnType<typeof parseDetailHtml>; try { parsed = parseDetailHtml(html, finalUrl) } catch (error) { throw stageError("detail.parseDetailHtml", error) }
    if (parsed.error) { const error = httpError(parsed.error, response, finalUrl); (error as any).responseLength = html.length; throw error }
    const detail: GalleryDetail = { ...parsed, pageLinks: dedupeAndSortPageLinks(normalizePageLinks(parsed.pageLinks || [], 0)), sourceUrl: finalUrl, truncatedPreviewPages: Number(parsed.previewPages || 1) > MAX_PREVIEW_LIST_PAGES }
    detailCoreCache.set(url, detail); detailCoreCache.set(finalUrl, detail)
    await reportSafely({ stage: "gallery-detail-core", ok: true, request: { url: finalUrl, status: Number(response?.status || 0), statusText: String(response?.statusText || "") }, notes: `coreMs=${Date.now() - started}; previewPages=${detail.previewPages}; loadedImages=${detail.pageLinks.length}` })
    return detail
  } catch (error) { const value = error as any; await reportSafely({ stage: "gallery-detail-core", ok: false, error, request: { url: String(value?.url || url), status: Number(value?.status || 0), statusText: String(value?.statusText || "") } }); throw error }
}

export async function loadRemainingPreviewPages(detail: GalleryDetail, onProgress?: (links: GalleryPageLink[], failed: number[]) => void): Promise<PreviewLoadResult> {
  const started = Date.now(); const previewPages = Math.max(1, Number(detail.previewPages || 1)); const pagesToLoad = Math.min(previewPages, MAX_PREVIEW_LIST_PAGES)
  let allLinks = [...detail.pageLinks]; const failed: number[] = []; const pending: number[] = []; for (let p = 1; p < pagesToLoad; p += 1) pending.push(p)
  const worker = async () => { while (pending.length) { const p = pending.shift(); if (p == null) return; try { const links = await fetchPreviewPage(withPreviewPage(detail.sourceUrl, p), p); allLinks = dedupeAndSortPageLinks([...allLinks, ...links]) } catch { failed.push(p) } onProgress?.(allLinks, [...failed]) } }
  await Promise.all(Array.from({ length: Math.min(3, pending.length) }, () => worker()))
  const result = { pageLinks: dedupeAndSortPageLinks(allLinks), failedPreviewPages: failed.sort((a,b) => a-b), elapsedMs: Date.now() - started }
  await reportSafely({ stage: "gallery-detail-previews", ok: failed.length === 0, request: { url: detail.sourceUrl, status: 0, statusText: "" }, notes: `previewMs=${result.elapsedMs}; previewPages=${previewPages}; loadedImages=${result.pageLinks.length}; failedPreviewPages=${failed.join(",") || "none"}` })
  return result
}

export async function loadGalleryDetail(url: string): Promise<GalleryDetail> { const core = await loadGalleryDetailCore(url); const previews = await loadRemainingPreviewPages(core); return { ...core, pageLinks: previews.pageLinks } }

export async function resolveImagePage(pageUrl: string): Promise<ResolvedImagePage> {
  try { const { html, finalUrl, response } = await fetchHtml(pageUrl, "image-page"); let parsed: PageExtractData; try { parsed = parseImagePageHtml(html, finalUrl) } catch (error) { throw stageError("image-page.parse", error) }; if (parsed.error) throw httpError(parsed.error, response, finalUrl); const resolved = { ...parsed, pageUrl: finalUrl }; await reportSafely({ stage: "gallery-image-page", ok: true, request: { url: finalUrl, status: Number(response?.status || 0), statusText: String(response?.statusText || "") }, notes: `imageUrl=${resolved.imageUrl ? "yes" : "no"}; originalUrl=${resolved.originalUrl ? "yes" : "no"}` }); return resolved } catch (error) { const value = error as any; await reportSafely({ stage: "gallery-image-page", ok: false, error, request: { url: String(value?.url || pageUrl), status: Number(value?.status || 0), statusText: String(value?.statusText || "") } }); throw error }
}

export async function fetchPageImage(imageUrl: string, referer: string): Promise<UIImage> {
  try { const cookie = getCookieHeader(imageUrl); const response = await fetch(imageUrl, { headers: { Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8", Referer: referer, ...(cookie ? { Cookie: cookie } : {}) } }); const finalUrl = String(response?.url || imageUrl); if (!response.ok) throw httpError(`图片请求失败：HTTP ${response.status}`, response, finalUrl); const data: any = await (response as any).data(); const image = (UIImage as any).fromData?.(data); if (!image) throw new Error("当前 Scripting 运行时不支持 UIImage.fromData；ReaderView 将继续使用 imageUrl。"); return image } catch (error) { throw error }
}
