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
export type GalleryDetail = Omit<ReturnType<typeof parseDetailHtml>, "pageLinks"> & { pageLinks: GalleryPageLink[]; sourceUrl: string; truncatedPreviewPages: boolean; failedPreviewPages: number[] }
export type PreviewLoadResult = { pageLinks: GalleryPageLink[]; failedPreviewPages: number[]; elapsedMs: number }
export type ResolvedImagePage = PageExtractData & { pageUrl: string }

const MAX_PREVIEW_LIST_PAGES = 50
const detailCoreCache = new Map<string, GalleryDetail>()
const previewPageCache = new Map<string, GalleryPageLink[]>()
export function invalidateGalleryCaches(){detailCoreCache.clear();previewPageCache.clear()}
;(globalThis as any).__ehentaiInvalidateGalleryCaches=invalidateGalleryCaches

function httpError(message: string, response: any, url: string): Error {
  const error = new Error(message) as Error & { status?: number; statusText?: string; url?: string }
  error.status = Number(response?.status || 0); error.statusText = String(response?.statusText || ""); error.url = String(response?.url || url); return error
}
export function userSafeError(error:unknown,fallback="操作未完成，请稍后重试。"){const message=String((error as any)?.message||error||"");return /https?:|cookie|ipb_|\/var\/|\/private\/|token/i.test(message)?fallback:message||fallback}
function stageError(stage: string, error: unknown): Error { const value = error as any; const wrapped = new Error(`[${stage}] ${userSafeError(value?.message || error)}`); wrapped.name = String(value?.name || "Error"); return wrapped }
async function reportSafely(input: Parameters<typeof reportDiagnostic>[0]) { try { await reportDiagnostic(input) } catch {} }
const HTML_REQUEST_TIMEOUT_MS = 20_000

function requestOptions(url: string): Record<string, any> { const cookie = getCookieHeader(url); return { ...(cookie ? { headers: { Cookie: cookie } } : {}), signal: AbortSignal.timeout(HTML_REQUEST_TIMEOUT_MS) } }
export async function fetchHtml(url: string, stagePrefix: string): Promise<{ html: string; finalUrl: string; response: Response }> {
  let response: Response; try { response = await fetch(url, requestOptions(url)) } catch (error) { throw stageError(`${stagePrefix}.fetch`, error) }
  const finalUrl = String(response?.url || url); const status = Number(response?.status || 0); const statusText = String(response?.statusText || "")
  let html = ""; try { html = await response.text() } catch (error) { throw stageError(`${stagePrefix}.response.text`, error) }
  if (!response.ok) throw httpError(`E-Hentai 请求失败：HTTP ${status}${statusText ? ` ${statusText}` : ""}`, response, finalUrl)
  return { html, finalUrl, response }
}

export async function postForm(url: string, fields: Record<string, string>, stagePrefix: string): Promise<{ html: string; finalUrl: string; response: Response }> {
  const body = new URLSearchParams(fields).toString()
  let response: Response
  try { response = await fetch(url, { ...requestOptions(url), method: "POST", headers: { ...(requestOptions(url).headers || {}), "Content-Type": "application/x-www-form-urlencoded", Origin: new URL(url).origin, Referer: url }, body }) } catch (error) { throw stageError(`${stagePrefix}.fetch`, error) }
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
    const detail: GalleryDetail = { ...parsed, pageLinks: dedupeAndSortPageLinks(normalizePageLinks(parsed.pageLinks || [], 0)), sourceUrl: finalUrl, truncatedPreviewPages: Number(parsed.previewPages || 1) > MAX_PREVIEW_LIST_PAGES, failedPreviewPages: [] }
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

export function applyPreviewLoadResult(core: GalleryDetail, previews: PreviewLoadResult): GalleryDetail { return { ...core, pageLinks: previews.pageLinks, failedPreviewPages: previews.failedPreviewPages } }
export function hasCompletePreviewInventory(detail: Pick<GalleryDetail, "pageLinks" | "failedPreviewPages" | "truncatedPreviewPages">): boolean { return detail.pageLinks.length > 0 && !detail.truncatedPreviewPages && detail.failedPreviewPages.length === 0 }
export function assertCompletePreviewInventory(detail: Pick<GalleryDetail, "pageLinks" | "failedPreviewPages" | "truncatedPreviewPages">): void { if (!hasCompletePreviewInventory(detail)) throw new Error("页面库存不完整，请重试预览加载后再下载。") }
export async function loadGalleryDetail(url: string): Promise<GalleryDetail> { const core = await loadGalleryDetailCore(url); return applyPreviewLoadResult(core, await loadRemainingPreviewPages(core)) }

export async function resolveImagePage(pageUrl: string): Promise<ResolvedImagePage> {
  try { const { html, finalUrl, response } = await fetchHtml(pageUrl, "image-page"); let parsed: PageExtractData; try { parsed = parseImagePageHtml(html, finalUrl) } catch (error) { throw stageError("image-page.parse", error) }; if (parsed.error) throw httpError(parsed.error, response, finalUrl); const resolved = { ...parsed, pageUrl: finalUrl }; await reportSafely({ stage: "gallery-image-page", ok: true, request: { url: finalUrl, status: Number(response?.status || 0), statusText: String(response?.statusText || "") }, notes: `imageUrl=${resolved.imageUrl ? "yes" : "no"}; originalUrl=${resolved.originalUrl ? "yes" : "no"}` }); return resolved } catch (error) { const value = error as any; await reportSafely({ stage: "gallery-image-page", ok: false, error, request: { url: String(value?.url || pageUrl), status: Number(value?.status || 0), statusText: String(value?.statusText || "") } }); throw error }
}

export type MyTag={name:string;searchUrl:string}
export type AccountOverview={imageLimitCurrent:string;imageLimitMax:string;resetCost:string;values:Array<{label:string;value:string}>}
export function parseAccountOverviewHtml(html:string):AccountOverview{const text=String(html||"").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/\s+/g," ").trim();const image=text.match(/(?:image\s*)?limits?\s*[:：]?\s*(\d[\d,]*)\s*(?:\/|of)\s*(\d[\d,]*)/i)||text.match(/(\d[\d,]*)\s*(?:\/|of)\s*(\d[\d,]*)\s*(?:image\s*)?limits?/i);const cost=text.match(/(?:reset(?:\s+cost)?|cost\s+to\s+reset)\s*[:：]?\s*([\d,.]+\s*(?:GP|C|credits?)?)/i);const values:Array<{label:string;value:string}>=[];for(const match of text.matchAll(/\b(GP|Hath|Credits?|Power)\s*[:：]\s*([\d,.]+)/gi)){const label=String(match[1]);if(!values.some(item=>item.label.toLowerCase()===label.toLowerCase()))values.push({label,value:String(match[2])})}return{imageLimitCurrent:image?image[1].replace(/,/g,""):"",imageLimitMax:image?image[2].replace(/,/g,""):"",resetCost:cost?String(cost[1]).trim():"",values:values.slice(0,4)}}
export async function loadAccountOverview():Promise<AccountOverview>{const result=await fetchHtml(new URL("home.php",getBaseUrl()).toString(),"account-overview");if(/requires you to log on|not logged in/i.test(result.html))throw new Error("账户概览需要登录。");return parseAccountOverviewHtml(result.html)}
export function parseMyTagsHtml(html:string,baseUrl:string):MyTag[]{const tags=[...html.matchAll(/\bid\s*=\s*(["'])tagpreview[^"']*\1[^>]*\btitle\s*=\s*(["'])(.*?)\2/gi)].map(match=>String(match[3]).replace(/&amp;/g,"&").trim()).filter(Boolean);return [...new Set(tags)].slice(0,200).map(name=>({name,searchUrl:new URL(`?f_search=${encodeURIComponent(name)}`,baseUrl).toString()}))}
export async function loadMyTags(){const result=await fetchHtml(new URL("mytags",getBaseUrl()).toString(),"my-tags");if(/requires you to log on|not logged in/i.test(result.html))throw new Error("我的标签需要登录。");return parseMyTagsHtml(result.html,result.finalUrl)}

export type ExternalDestination="news"|"forums"|"wiki"|"torrents"
export function externalDestinationUrl(destination:ExternalDestination,baseUrl=getBaseUrl()):string{const base=new URL(baseUrl);switch(destination){case"news":return new URL("news.php",base).toString();case"torrents":return new URL("torrents.php",base).toString();case"forums":return"https://forums.e-hentai.org/";case"wiki":return"https://ehwiki.org/wiki/Main_Page"}}
export async function openExternalDestination(destination:ExternalDestination){return openResource(externalDestinationUrl(destination))}
export async function openResource(url:string):Promise<void>{const target=new URL(url);if(target.protocol!=="https:"||!/(?:^|\.)e-hentai\.org$|(?:^|\.)exhentai\.org$|(?:^|\.)ehwiki\.org$/i.test(target.hostname))throw new Error("资源地址无效。");if(!await Safari.openURL(target.toString()))throw new Error("无法打开系统浏览器。")}

export async function fetchPageImage(imageUrl: string, referer: string): Promise<UIImage> {
  try { const cookie = getCookieHeader(imageUrl); const response = await fetch(imageUrl, { headers: { Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8", Referer: referer, ...(cookie ? { Cookie: cookie } : {}) } }); const finalUrl = String(response?.url || imageUrl); if (!response.ok) throw httpError(`图片请求失败：HTTP ${response.status}`, response, finalUrl); const data: any = await (response as any).data(); const image = (UIImage as any).fromData?.(data); if (!image) throw new Error("当前 Scripting 运行时不支持 UIImage.fromData；ReaderView 将继续使用 imageUrl。"); return image } catch (error) { throw error }
}
