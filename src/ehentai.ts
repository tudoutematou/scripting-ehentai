import { FormData } from "scripting"
import { GallerySummary, PageExtractData, SearchExtractData } from "./extractors"
import { GalleryPageLink, buildSearchUrl, dedupeAndSortPageLinks, normalizePageLinks, withPreviewPage } from "./pure"
import { parseSearchHtml } from "./searchHtml"
import { parseDetailHtml, parsePreviewPageHtml, parseTorrentListHtml, buildGalleryRatingRequest, parseRatingResponse, parseCommentMutationHtml, parseEditableCommentResponse, parseCommentVoteResponse, parseArchiveOptionsHtml, buildArchiveDownloadRequest, parseArchiveDownloadHtml, type RatingResult, type TorrentItem, type GalleryComment, type CommentVoteResult, type ArchiveOption } from "./detailHtml"
import { parseImagePageHtml } from "./pageHtml"
import { reportDiagnostic } from "./githubBridge"
import { getBaseUrl, getCookieHeader, productionRequestAuth, storeResponseCookies } from "./account"

export type { GalleryPageLink, GallerySummary }
export type SearchPage = SearchExtractData & { url: string }
export type GalleryDetail = Omit<ReturnType<typeof parseDetailHtml>, "pageLinks"> & { pageLinks: GalleryPageLink[]; sourceUrl: string; loadedPreviewPages: number[]; truncatedPreviewPages: boolean; failedPreviewPages: number[] }
export type PreviewLoadResult = { pageLinks: GalleryPageLink[]; loadedPreviewPages: number[]; failedPreviewPages: number[]; elapsedMs: number }
export type ResolvedImagePage = PageExtractData & { pageUrl: string }

const detailCoreCache = new Map<string, GalleryDetail>()
const previewPageCache = new Map<string, GalleryPageLink[]>()
const imagePageCache = new Map<string, Promise<ResolvedImagePage>>()
export function invalidateGalleryCaches(){detailCoreCache.clear();previewPageCache.clear();imagePageCache.clear()}
;(globalThis as any).__ehentaiInvalidateGalleryCaches=invalidateGalleryCaches

function httpError(message: string, response: any, url: string): Error {
  const error = new Error(message) as Error & { status?: number; statusText?: string; url?: string }
  error.status = Number(response?.status || 0); error.statusText = String(response?.statusText || ""); error.url = String(response?.url || url); return error
}
export function userSafeError(error:unknown,fallback="操作未完成，请稍后重试。"){const message=String((error as any)?.message||error||"");return /https?:|cookie|ipb_|apiuid|apikey|\/var\/|\/private\/|token/i.test(message)?fallback:message||fallback}
function stageError(stage: string, error: unknown): Error { const value = error as any; const wrapped = new Error(`[${stage}] ${userSafeError(value?.message || error)}`); wrapped.name = String(value?.name || "Error"); return wrapped }
async function reportSafely(input: Parameters<typeof reportDiagnostic>[0]) { try { await reportDiagnostic(input) } catch {} }
const HTML_REQUEST_TIMEOUT_MS = 20_000

function requestOptions(url: string): Record<string, any> { const context=productionRequestAuth(url); return { ...(Object.keys(context.headers).length ? { headers: context.headers } : {}), signal: AbortSignal.timeout(HTML_REQUEST_TIMEOUT_MS) } }
export async function authenticatedFetch(url:string,init:Record<string,any>={}):Promise<Response>{const cookie=getCookieHeader(url),headers={...(init.headers||{}),...(cookie?{Cookie:cookie}:{})},response=await fetch(url,{...init,headers});try{storeResponseCookies(Array.from((response as any).cookies||[]))}catch{}return response}
export async function fetchHtml(url: string, stagePrefix: string, referer = "", signal?:AbortSignal): Promise<{ html: string; finalUrl: string; response: Response }> {
  let response: Response; try { const options=requestOptions(url); response = await authenticatedFetch(url, { ...options, ...(signal?{signal}:{}), ...(referer ? { headers: { ...(options.headers || {}), Referer: referer } } : {}) }) } catch (error) { throw stageError(`${stagePrefix}.fetch`, error) }
  const finalUrl = String(response?.url || url); const status = Number(response?.status || 0); const statusText = String(response?.statusText || "")
  let html = ""; try { html = await response.text() } catch (error) { throw stageError(`${stagePrefix}.response.text`, error) }
  if (!response.ok) throw httpError(`E-Hentai 请求失败：HTTP ${status}${statusText ? ` ${statusText}` : ""}`, response, finalUrl)
  return { html, finalUrl, response }
}

export async function postForm(url: string, fields: Record<string, string>, stagePrefix: string): Promise<{ html: string; finalUrl: string; response: Response }> {
  const body = new URLSearchParams(fields).toString()
  let response: Response
  try { response = await authenticatedFetch(url, { ...requestOptions(url), method: "POST", headers: { ...(requestOptions(url).headers || {}), "Content-Type": "application/x-www-form-urlencoded", Origin: new URL(url).origin, Referer: url }, body }) } catch (error) { throw stageError(`${stagePrefix}.fetch`, error) }
  const finalUrl = String(response?.url || url); const status = Number(response?.status || 0); const statusText = String(response?.statusText || "")
  let html = ""; try { html = await response.text() } catch (error) { throw stageError(`${stagePrefix}.response.text`, error) }
  if (!response.ok) throw httpError(`E-Hentai 请求失败：HTTP ${status}${statusText ? ` ${statusText}` : ""}`, response, finalUrl)
  return { html, finalUrl, response }
}

export function imageSearchEndpoint(baseUrl=getBaseUrl()){const host=new URL(baseUrl).hostname;return host==="exhentai.org"?"https://upld.exhentai.org/upld/image_lookup.php":"https://upld.e-hentai.org/image_lookup.php"}
export type ImageSearchSource = Data | string
export function imageSearchData(source:ImageSearchSource):Data|null{return typeof source==="string"?Data.fromFile(source):source}
export async function imageSearch(source:ImageSearchSource,options:{similar?:boolean;coversOnly?:boolean;showExpunged?:boolean}={}):Promise<SearchPage>{const path=typeof source==="string"?source:"",data=imageSearchData(source);if(!data)throw new Error("无法读取要搜索的图片。");const endpoint=imageSearchEndpoint(),form=new FormData(),fileName=path.split("/").pop()||"search.jpg",contentType=path?String((globalThis as any).FileManager?.mimeType?.(path)||"image/jpeg"):"image/jpeg";form.append("sfile",data,contentType,fileName);if(options.similar)form.append("fs_similar","on");if(options.coversOnly)form.append("fs_covers","on");if(options.showExpunged)form.append("fs_exp","on");form.append("f_sfile","File Search");const cookie=getCookieHeader(endpoint);let response:Response;try{response=await authenticatedFetch(endpoint,{method:"POST",headers:{Referer:`${getBaseUrl().replace(/\/$/,"")}/`,Origin:new URL(getBaseUrl()).origin,...(cookie?{Cookie:cookie}:{})},body:form,signal:AbortSignal.timeout(HTML_REQUEST_TIMEOUT_MS)})}catch(error){throw stageError("image-search.fetch",error)}const html=await response.text(),finalUrl=String(response.url||endpoint);if(!response.ok)throw httpError(`图片搜索失败：HTTP ${response.status}`,response,finalUrl);const page=parseSearchHtml(html,finalUrl);if(page.error)throw new Error(page.error);return{...page,url:finalUrl}}
export async function searchGalleries(keyword: string, directUrl?: string): Promise<SearchPage> {
  const url = directUrl || buildSearchUrl(keyword, getBaseUrl()); const { html, finalUrl, response } = await fetchHtml(url, "search")
  let page: SearchExtractData; try { page = parseSearchHtml(html, finalUrl) } catch (error) { throw stageError("search.parseSearchHtml", error) }
  if (page.error) { const error = httpError(page.error, response, finalUrl); (error as any).responseLength = html.length; throw error }
  return { ...page, url: finalUrl }
}

async function fetchPreviewPage(url: string, previewPageIndex: number, signal?:AbortSignal): Promise<GalleryPageLink[]> {
  const cached = previewPageCache.get(url); if (cached) return cached
  const { html, finalUrl } = await fetchHtml(url, `preview[${previewPageIndex}]`, "", signal)
  try { const links = normalizePageLinks(parsePreviewPageHtml(html, finalUrl), previewPageIndex); previewPageCache.set(url, links); return links } catch (error) { throw stageError(`preview[${previewPageIndex}].parse`, error) }
}

export async function loadGalleryDetailCore(url: string): Promise<GalleryDetail> {
  const cached = detailCoreCache.get(url); if (cached) return cached
  const started = Date.now()
  try {
    const { html, finalUrl, response } = await fetchHtml(url, "detail-core")
    let parsed: ReturnType<typeof parseDetailHtml>; try { parsed = parseDetailHtml(html, finalUrl) } catch (error) { throw stageError("detail.parseDetailHtml", error) }
    if (parsed.error) { const error = httpError(parsed.error, response, finalUrl); (error as any).responseLength = html.length; throw error }
    const detail: GalleryDetail = { ...parsed, pageLinks: dedupeAndSortPageLinks(normalizePageLinks(parsed.pageLinks || [], 0)), sourceUrl: finalUrl, loadedPreviewPages: [0], truncatedPreviewPages: false, failedPreviewPages: [] }
    detailCoreCache.set(url, detail); detailCoreCache.set(finalUrl, detail)
    await reportSafely({ stage: "gallery-detail-core", ok: true, request: { url: finalUrl, status: Number(response?.status || 0), statusText: String(response?.statusText || "") }, notes: `coreMs=${Date.now() - started}; previewPages=${detail.previewPages}; loadedImages=${detail.pageLinks.length}` })
    return detail
  } catch (error) { const value = error as any; await reportSafely({ stage: "gallery-detail-core", ok: false, error, request: { url: String(value?.url || url), status: Number(value?.status || 0), statusText: String(value?.statusText || "") } }); throw error }
}

export function galleryPageCount(detail: Pick<GalleryDetail, "metadata" | "pageLinks">): number { const length = Object.entries(detail.metadata || {}).find(([key]) => key.trim().toLowerCase() === "length")?.[1] || ""; return Number(String(length).replace(/[^\d]/g, "")) || Math.max(0, ...detail.pageLinks.map(page => page.index)) }
export function nextPreviewPageIndex(detail: Pick<GalleryDetail, "previewPages" | "loadedPreviewPages">): number | null { const loaded = new Set(detail.loadedPreviewPages || []); for (let page = 0; page < Math.max(1, Number(detail.previewPages || 1)); page += 1) if (!loaded.has(page)) return page; return null }
export async function loadPreviewPageBatch(detail: GalleryDetail, startPage?: number, count = 2, signal?:AbortSignal): Promise<PreviewLoadResult> {
  const started = Date.now(), previewPages = Math.max(1, Number(detail.previewPages || 1)); startPage ??= nextPreviewPageIndex(detail); if (startPage == null) return { pageLinks: detail.pageLinks, loadedPreviewPages: detail.loadedPreviewPages, failedPreviewPages: detail.failedPreviewPages, elapsedMs: 0 }
  const loaded = new Set(detail.loadedPreviewPages || [0]), failed = new Set(detail.failedPreviewPages || []), results = new Map<number, GalleryPageLink[]>(); const pending = Array.from({ length: Math.max(0, Math.min(count, previewPages - startPage)) }, (_, offset) => startPage + offset)
  const worker = async () => { while (pending.length) { const page = pending.shift(); if (page == null) return; try { results.set(page, await fetchPreviewPage(withPreviewPage(detail.sourceUrl, page), page, signal)); loaded.add(page); failed.delete(page) } catch { failed.add(page) } } }
  await Promise.all(Array.from({ length: Math.min(2, pending.length) }, worker)); const result = { pageLinks: dedupeAndSortPageLinks([...detail.pageLinks, ...[...results.values()].flat()]), loadedPreviewPages: [...loaded].sort((a,b) => a-b), failedPreviewPages: [...failed].sort((a,b) => a-b), elapsedMs: Date.now() - started }
  await reportSafely({ stage: "gallery-detail-preview-batch", ok: result.failedPreviewPages.length === 0, request: { url: detail.sourceUrl, status: 0, statusText: "" }, notes: `previewMs=${result.elapsedMs}; loadedPreviewPages=${result.loadedPreviewPages.length}/${previewPages}; loadedImages=${result.pageLinks.length}` }); return result
}
export async function loadPreviewPageRange(detail: GalleryDetail, firstPage: number, lastPage: number, signal?:AbortSignal): Promise<PreviewLoadResult> { const total = Math.max(1, Number(detail.previewPages || 1)), first = Math.floor(firstPage), last = Math.floor(lastPage); if (!Number.isInteger(first) || !Number.isInteger(last) || first < 0 || last < first || last >= total) throw new Error("预览分页范围无效。"); return loadPreviewPageBatch(detail, first, last - first + 1, signal) }
export async function loadRemainingPreviewPages(detail: GalleryDetail, onProgress?: (links: GalleryPageLink[], failed: number[]) => void): Promise<PreviewLoadResult> { const started = Date.now(); let current = detail; for (let page = 1; page < Math.max(1, Number(detail.previewPages || 1)); page += 2) { current = applyPreviewLoadResult(current, await loadPreviewPageBatch(current, page, 2)); onProgress?.(current.pageLinks, current.failedPreviewPages) } return { pageLinks: current.pageLinks, loadedPreviewPages: current.loadedPreviewPages, failedPreviewPages: current.failedPreviewPages, elapsedMs: Date.now() - started } }
export function applyPreviewLoadResult(core: GalleryDetail, previews: PreviewLoadResult): GalleryDetail { return { ...core, pageLinks: previews.pageLinks, loadedPreviewPages: previews.loadedPreviewPages, failedPreviewPages: previews.failedPreviewPages } }
export function hasCompletePreviewInventory(detail: Pick<GalleryDetail, "metadata" | "pageLinks" | "previewPages" | "loadedPreviewPages" | "failedPreviewPages">): boolean { const total=galleryPageCount(detail),indexes=new Set(detail.pageLinks.map(page=>page.index)); return total>0 && detail.pageLinks.length===total && indexes.size===total && Array.from({length:total},(_,index)=>index+1).every(index=>indexes.has(index)) && (detail.loadedPreviewPages || []).length >= Math.max(1, Number(detail.previewPages || 1)) && detail.failedPreviewPages.length === 0 }
export function assertCompletePreviewInventory(detail: Pick<GalleryDetail, "metadata" | "pageLinks" | "previewPages" | "loadedPreviewPages" | "failedPreviewPages">): void { if (!hasCompletePreviewInventory(detail)) throw new Error("页面库存不完整，请重试预览加载后再下载。") }
export async function loadGalleryDetail(url: string, onProgress?: (loadedImages: number, totalImages: number) => void): Promise<GalleryDetail> { const core = await loadGalleryDetailCore(url); let current = core; onProgress?.(current.pageLinks.length, galleryPageCount(current)); for (let page = 1; page < Math.max(1, Number(core.previewPages || 1)); page += 2) { current = applyPreviewLoadResult(current, await loadPreviewPageBatch(current, page, 2)); onProgress?.(current.pageLinks.length, galleryPageCount(current)) } return current }

async function resolveImagePageFresh(pageUrl:string):Promise<ResolvedImagePage>{try { const { html, finalUrl, response } = await fetchHtml(pageUrl, "image-page"); let parsed: PageExtractData; try { parsed = parseImagePageHtml(html, finalUrl) } catch (error) { throw stageError("image-page.parse", error) }; if (parsed.error) throw httpError(parsed.error, response, finalUrl); const resolved = { ...parsed, pageUrl: finalUrl }; await reportSafely({ stage: "gallery-image-page", ok: true, request: { url: finalUrl, status: Number(response?.status || 0), statusText: String(response?.statusText || "") }, notes: `imageUrl=${resolved.imageUrl ? "yes" : "no"}; originalUrl=${resolved.originalUrl ? "yes" : "no"}` }); return resolved } catch (error) { const value = error as any; await reportSafely({ stage: "gallery-image-page", ok: false, error, request: { url: String(value?.url || pageUrl), status: Number(value?.status || 0), statusText: String(value?.statusText || "") } }); throw error }}
export function resolveImagePage(pageUrl: string, refresh=false): Promise<ResolvedImagePage> {
  if(refresh)imagePageCache.delete(pageUrl);const existing=imagePageCache.get(pageUrl);if(existing)return existing
  const task=resolveImagePageFresh(pageUrl).catch(error=>{imagePageCache.delete(pageUrl);throw error});imagePageCache.set(pageUrl,task);return task
}

export async function loadTorrentList(torrentUrl:string,sourceUrl:string):Promise<TorrentItem[]>{let target:URL;let source:URL;try{target=new URL(torrentUrl);source=new URL(sourceUrl)}catch{throw new Error("种子入口无效。")}if(target.protocol!=="https:"||target.hostname!==source.hostname||!/(?:^|\.)e-hentai\.org$|(?:^|\.)exhentai\.org$/i.test(target.hostname))throw new Error("种子入口无效。");const result=await fetchHtml(target.toString(),"torrent-list",source.toString());return parseTorrentListHtml(result.html,result.finalUrl)}

export async function submitGalleryComment(detail:Pick<GalleryDetail,"sourceUrl">,text:string,commentId?:number):Promise<GalleryComment[]>{const value=String(text||"").trim();if(!value)throw new Error("评论内容不能为空。");const fields=commentId?{commenttext_edit:value,edit_comment:String(commentId)}:{commenttext_new:value};const result=await postForm(detail.sourceUrl,fields,"gallery-comment");return parseCommentMutationHtml(result.html)}
export async function loadEditableGalleryComment(detail:Pick<GalleryDetail,"sourceUrl"|"ratingCredentials">,commentId:number){const credentials=detail.ratingCredentials;if(!credentials)throw new Error("编辑评论需要登录。");return postGalleryApi(detail.sourceUrl,{method:"geteditcomment",apiuid:credentials.apiUid,apikey:credentials.apiKey,gid:credentials.gid,token:credentials.token,comment_id:commentId},"gallery-comment-edit").then(parseEditableCommentResponse)}
export async function voteGalleryComment(detail:Pick<GalleryDetail,"sourceUrl"|"ratingCredentials">,commentId:number,vote:1|-1):Promise<CommentVoteResult>{const credentials=detail.ratingCredentials;if(!credentials)throw new Error("评论投票需要登录。");return postGalleryApi(detail.sourceUrl,{method:"votecomment",apiuid:credentials.apiUid,apikey:credentials.apiKey,gid:credentials.gid,token:credentials.token,comment_id:commentId,comment_vote:vote},"gallery-comment-vote").then(parseCommentVoteResponse)}
async function postGalleryApi(sourceUrl:string,payload:Record<string,unknown>,stage:string):Promise<string>{let source:URL;try{source=new URL(sourceUrl)}catch{throw new Error("画廊操作入口无效。")}if(source.protocol!=="https:"||!/(?:^|\.)e-hentai\.org$|(?:^|\.)exhentai\.org$/i.test(source.hostname))throw new Error("画廊操作入口无效。");const endpoint=new URL("/api.php",source).toString(),cookie=getCookieHeader(endpoint);let response:Response;try{response=await authenticatedFetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json",Referer:source.toString(),...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(payload),signal:AbortSignal.timeout(HTML_REQUEST_TIMEOUT_MS)})}catch(error){throw stageError(`${stage}.fetch`,error)}const raw=await response.text();if(!response.ok)throw httpError(`E-Hentai 请求失败：HTTP ${response.status}`,response,endpoint);return raw}
export async function loadArchiveOptions(archiveUrl:string,sourceUrl:string):Promise<ArchiveOption[]>{const target=new URL(archiveUrl),source=new URL(sourceUrl);if(target.protocol!=="https:"||target.hostname!==source.hostname||!/(?:^|\.)e-hentai\.org$|(?:^|\.)exhentai\.org$/i.test(target.hostname))throw new Error("归档入口无效。");const result=await fetchHtml(target.toString(),"archive-options",source.toString()),items=parseArchiveOptionsHtml(result.html);if(!items.length)throw new Error("未解析到可用归档选项，可能受到服务器限制。");return items}
export async function resolveArchiveDownload(archiveUrl:string,sourceUrl:string,option:ArchiveOption):Promise<string>{const contract=buildArchiveDownloadRequest(archiveUrl,sourceUrl,option),body=new URLSearchParams(contract.fields).toString(),cookie=getCookieHeader(contract.url);let response:Response;try{response=await authenticatedFetch(contract.url,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded",...contract.headers,...(cookie?{Cookie:cookie}:{})},body,signal:AbortSignal.timeout(HTML_REQUEST_TIMEOUT_MS)})}catch(error){throw stageError("archive-download.fetch",error)}const html=await response.text(),finalUrl=String(response.url||contract.url);if(!response.ok)throw httpError(`归档请求失败：HTTP ${response.status}`,response,finalUrl);return parseArchiveDownloadHtml(html,finalUrl)}
export async function submitGalleryRating(detail:Pick<GalleryDetail,"sourceUrl"|"ratingCredentials">,rating:number):Promise<RatingResult>{const credentials=detail.ratingCredentials;if(!credentials)throw new Error("评分需要登录。请先在 Safari 导入并验证账户。");const payload=buildGalleryRatingRequest(credentials,rating);let source:URL;try{source=new URL(detail.sourceUrl)}catch{throw new Error("评分入口无效。")}if(source.protocol!=="https:"||!/(?:^|\.)e-hentai\.org$|(?:^|\.)exhentai\.org$/i.test(source.hostname))throw new Error("评分入口无效。");const endpoint=new URL("/api.php",source).toString();const cookie=getCookieHeader(endpoint);let response:Response;try{response=await authenticatedFetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json",Referer:source.toString(),...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(payload),signal:AbortSignal.timeout(HTML_REQUEST_TIMEOUT_MS)})}catch(error){throw stageError("gallery-rating.fetch",error)}const status=Number(response?.status||0),statusText=String(response?.statusText||"");let raw="";try{raw=await response.text()}catch(error){throw stageError("gallery-rating.response.text",error)}if(!response.ok)throw httpError(`E-Hentai 请求失败：HTTP ${status}${statusText?` ${statusText}`:""}`,response,endpoint);return parseRatingResponse(raw)}

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
