import { getAccountStatus } from "./account"
import { parseDetailHtml, parsePreviewPageHtml } from "./detailHtml"
import { sanitizeDiagnostic } from "./githubBridge"
import { parseImagePageHtml } from "./pageHtml"
import { parseSearchHtml } from "./searchHtml"
import { buildGallerySearchUrl, createHomeSearchState, createTagSearchState } from "./tourist"

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

export type SelfTestResult = { name: string; ok: boolean; durationMs: number; detail?: string }
function selfAssert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message) }
/** Side-effect-free parser, search-state and privacy regression checks for development and CI. */
export async function runSelfTests(): Promise<SelfTestResult[]> {
  const checks: Array<{ name: string; run: () => void }> = [
    { name: "account.local-state", run: () => { const status = getAccountStatus(); selfAssert(typeof status.loggedIn === "boolean", "账号状态无效") } },
    { name: "search.url-builder", run: () => { const url = new URL(buildGallerySearchUrl(E_HENTAI_BASE, createHomeSearchState("test", "manga", "chinese"))); selfAssert(url.searchParams.get("f_search") === "test language:chinese" && url.searchParams.get("f_cats") === "1019", "搜索筛选错误") } },
    { name: "search.tag-state", run: () => { const state = createTagSearchState("https://e-hentai.org/?f_search=female%3Atest", "female", "test", "测试"); selfAssert(state.mode === "tag" && state.rawQuery === "female:test", "标签搜索状态错误") } },
    { name: "parser.search", run: () => { const page = parseSearchHtml('<div class="searchtext">Found 1 results</div><table><tr><td class="glname"><a href="/g/123/abcdef/">Sample &amp; Title</a></td><td class="cn">Manga</td><td>12 pages</td><img src="/thumb.jpg"></tr></table>', E_HENTAI_BASE); selfAssert(page.items.length === 1 && page.items[0].pages === 12, "搜索解析错误") } },
    { name: "parser.detail-preview", run: () => { const html='<div id="gn">Detail title</div><div id="gdn">tester</div><div id="gdc"><span class="cn">Manga</span></div><div id="rating_label">Average: 4.5</div><table id="taglist"><tr><td>language:</td><td><a href="/?f_search=x">chinese</a></td></tr></table><div id="gdt"><a href="/s/token/123-1"><img title="Page 1" src="/1.jpg"></a></div>'; const detail=parseDetailHtml(html,E_HENTAI_BASE); selfAssert(detail.title === "Detail title" && detail.rating === 4.5 && parsePreviewPageHtml(html,E_HENTAI_BASE).length === 1, "详情解析错误") } },
    { name: "parser.image-page", run: () => { const page=parseImagePageHtml('<img id="img" src="/image.jpg"><a href="/fullimg.php?x=1">Original</a>',E_HENTAI_BASE); selfAssert(page.imageUrl === "https://e-hentai.org/image.jpg" && page.originalUrl.includes("fullimg"), "图片页解析错误") } },
    { name: "diagnostic.sanitizer", run: () => { const payload=sanitizeDiagnostic({stage:"https://e-hentai.org/g/123/token",ok:false,request:{url:"https://e-hentai.org/g/123/token"},notes:"Cookie=secret"}); const text=JSON.stringify(payload); selfAssert(!text.includes("secret") && !text.includes("/g/123/"), "诊断脱敏泄漏") } },
  ]
  return checks.map(check => { const started=Date.now(); try { check.run(); return { name:check.name,ok:true,durationMs:Date.now()-started } } catch (error) { return { name:check.name,ok:false,durationMs:Date.now()-started,detail:String((error as Error)?.message||error).slice(0,160) } } })
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
