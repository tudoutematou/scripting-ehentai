import { getAccountStatus } from "./account"
import { parseDetailHtml, parsePreviewPageHtml } from "./detailHtml"
import { parseImagePageHtml } from "./pageHtml"
import { parseSearchHtml } from "./searchHtml"
import { sanitizeDiagnostic } from "./githubBridge"
import { buildGallerySearchUrl, createHomeSearchState, createTagSearchState } from "./tourist"

export type SelfTestResult = { name: string; ok: boolean; durationMs: number; detail?: string }

type Check = { name: string; run: () => void | Promise<void> }

const BASE = "https://e-hentai.org/"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

export async function runSelfTests(): Promise<SelfTestResult[]> {
  const checks: Check[] = [
    { name: "account.local-state", run: () => { const status = getAccountStatus(); assert(typeof status.loggedIn === "boolean" && (status.site === "e" || status.site === "ex"), "账号本地状态无效") } },
    { name: "search.url-builder", run: () => { const url = new URL(buildGallerySearchUrl(BASE, createHomeSearchState("test", "manga", "chinese"))); assert(url.searchParams.get("f_search") === "test language:chinese", "搜索词或语言筛选错误"); assert(url.searchParams.get("f_cats") === "1019", "分类筛选错误") } },
    { name: "search.tag-state", run: () => { const state = createTagSearchState("https://e-hentai.org/?f_search=female%3Atest", "female", "test", "测试"); assert(state.mode === "tag" && state.rawQuery === "female:test" && state.displayQuery === "测试", "标签搜索状态错误") } },
    { name: "parser.search", run: () => { const page = parseSearchHtml('<div class="searchtext">Found 1 results</div><table><tr><td class="glname"><a href="/g/123/abcdef/">Sample &amp; Title</a></td><td class="cn">Manga</td><td>12 pages</td><td id="posted_123">today</td><img src="/thumb.jpg"></tr></table>', BASE); assert(page.items.length === 1 && page.items[0].title === "Sample & Title" && page.items[0].pages === 12, "搜索解析错误") } },
    { name: "parser.detail-preview", run: () => { const html = '<div id="gn">Detail title</div><div id="gdn">tester</div><div id="gdc"><span class="cn">Manga</span></div><div id="rating_label">Average: 4.5</div><div id="rating_count">12</div><table id="gdd"><tr><td>Length:</td><td>2 pages</td></tr></table><table id="taglist"><tr><td>language:</td><td><a href="/?f_search=language%3Achinese">chinese</a></td></tr></table><div id="gdt"><a href="/s/token/123-1"><img title="Page 1" src="/1.jpg"></a></div>'; const detail = parseDetailHtml(html, BASE); const preview = parsePreviewPageHtml(html, BASE); assert(detail.title === "Detail title" && detail.rating === 4.5 && detail.tags[0]?.tags[0]?.name === "chinese" && preview.length === 1, "详情或预览解析错误") } },
    { name: "parser.image-page", run: () => { const result = parseImagePageHtml('<div id="i3"><img id="img" src="/image.jpg"></div><a href="/fullimg.php?x=1">Download original</a>', BASE); assert(result.imageUrl === "https://e-hentai.org/image.jpg" && result.originalUrl.includes("fullimg"), "图片页解析错误") } },
    { name: "diagnostic.sanitizer", run: () => { const payload = sanitizeDiagnostic({ stage: "search https://e-hentai.org/g/123/token", ok: false, request: { url: "https://e-hentai.org/g/123/token", status: 403 }, notes: "Cookie=secret ipb_pass_hash=secret", error: new Error("https://e-hentai.org/s/token") }); const text = JSON.stringify(payload); assert(!text.includes("secret") && !text.includes("/g/123/") && payload.request.host === "https://e-hentai.org/[redacted]", "诊断脱敏泄漏") } },
  ]
  const results: SelfTestResult[] = []
  for (const check of checks) {
    const started = Date.now()
    try { await check.run(); results.push({ name: check.name, ok: true, durationMs: Date.now() - started }) }
    catch (error) { results.push({ name: check.name, ok: false, durationMs: Date.now() - started, detail: String((error as Error)?.message || error).slice(0, 160) }) }
  }
  return results
}
