import { runEhAction } from "./ehAction"
import { buildFavoritesUrl, favoriteLoginError, parseFavoriteCategories } from "./favorites"
import { deleteHistory, historySummary, loadHistory, recordHistory, resumeIndex, updateReadingProgress, type HistoryStore } from "./libraryStore"
import { getAccountStatus, getBaseUrl } from "./account"
import { loadGalleryDetailCore, resolveImagePage, searchGalleries } from "./ehentai"
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

export function safeSelfTestFailureDetail(stage: string, error: unknown): string {
  const value = error as { name?: unknown; code?: unknown }
  const rawName = String(value?.name || "Error")
  const errorName = /abort|timeout/i.test(rawName) ? "TimeoutError" : rawName === "TypeError" ? "TypeError" : rawName === "Error" ? "Error" : "UnknownError"
  const rawCode = String(value?.code || "")
  const code = /^(?:[A-Z_]+|\d{3})$/.test(rawCode) ? rawCode : "CHECK_FAILED"
  return `stage=${stage}; errorName=${errorName}; code=${code}; description=check-failed`
}

export type SelfTestOptions = { network?: boolean }

export async function runSelfTests(options: SelfTestOptions = {}): Promise<SelfTestResult[]> {
  const checks: Check[] = [
    { name: "account.local-state", run: () => { const status = getAccountStatus(); assert(typeof status.loggedIn === "boolean" && (status.site === "e" || status.site === "ex"), "账号本地状态无效") } },
    { name: "search.url-builder", run: () => { const url = new URL(buildGallerySearchUrl(BASE, createHomeSearchState("test", "manga", "chinese"))); assert(url.searchParams.get("f_search") === "test language:chinese", "搜索词或语言筛选错误"); assert(url.searchParams.get("f_cats") === "1019", "分类筛选错误") } },
    { name: "search.tag-state", run: () => { const state = createTagSearchState("https://e-hentai.org/?f_search=female%3Atest", "female", "test", "测试"); assert(state.mode === "tag" && state.rawQuery === "female:test" && state.displayQuery === "测试", "标签搜索状态错误") } },
    { name: "parser.search", run: () => { const page = parseSearchHtml('<div class="searchtext">Found 1 results</div><table><tr><td class="glname"><a href="/g/123/abcdef/">Sample &amp; Title</a></td><td class="cn">Manga</td><td>12 pages</td><td id="posted_123">today</td><img src="/thumb.jpg"></tr></table>', BASE); assert(page.items.length === 1 && page.items[0].title === "Sample & Title" && page.items[0].pages === 12, "搜索解析错误") } },
    { name: "parser.detail-preview", run: () => { const html = '<div id="gn">Detail title</div><div id="gdn">tester</div><div id="gdc"><span class="cn">Manga</span></div><div id="rating_label">Average: 4.5</div><div id="rating_count">12</div><table id="gdd"><tr><td>Length:</td><td>2 pages</td></tr></table><table id="taglist"><tr><td>language:</td><td><a href="/?f_search=language%3Achinese">chinese</a></td></tr></table><div id="gdt"><a href="/s/token/123-1"><img title="Page 1" src="/1.jpg"></a></div>'; const detail = parseDetailHtml(html, BASE); const preview = parsePreviewPageHtml(html, BASE); assert(detail.title === "Detail title" && detail.rating === 4.5 && detail.tags[0]?.tags[0]?.name === "chinese" && preview.length === 1, "详情或预览解析错误") } },
    { name: "parser.image-page", run: () => { const result = parseImagePageHtml('<div id="i3"><img id="img" src="/image.jpg"></div><a href="/fullimg.php?x=1">Download original</a>', BASE); assert(result.imageUrl === "https://e-hentai.org/image.jpg" && result.originalUrl.includes("fullimg"), "图片页解析错误") } },
    { name: "favorites.fixture-parser", run: () => { const html = `<div class="ido">${Array.from({ length: 10 }, (_, i) => `<div class="fp" onclick="location='favorites.php?favcat=${i}'"><div>${i + 1}</div><div class="ficon"></div><div>Category ${i}</div></div>`).join("")}<a id="uprev" href="favorites.php?favcat=1&page=1">prev</a><a id="unext" href="favorites.php?favcat=1&page=3">next</a><table><tr><td class="glname"><a href="/g/123/abcdef/">Favorite title</a></td><td class="cn">Manga</td><td>12 pages</td></tr></table></div>`; const categories = parseFavoriteCategories(html); const parsed = parseSearchHtml(html, BASE); const search = new URL(buildFavoritesUrl(BASE, 3, { query: "x", searchTags: true, searchNote: true })); assert(categories.length === 10 && categories[3].name === "Category 3" && categories[3].count === 4 && parsed.items.length === 1 && Boolean(parsed.prevHref) && Boolean(parsed.nextHref) && search.searchParams.get("sn") === "1" && search.searchParams.get("st") === "1" && search.searchParams.get("sf") === "1" && !search.searchParams.has("f_sname"), "收藏真实结构、查询或分页解析错误") } },
    { name: "favorites.login-required", run: () => { const message = favoriteLoginError("<p>This page requires you to log on.</p>"); assert(Boolean(message) && !/https?:|token/i.test(message), "收藏登录错误未脱敏") } },
    { name: "history.progress-store", run: async () => { let raw: string | null = null; const store: HistoryStore = { read: async () => raw, write: async value => { raw = value } }; const item: any = { id: "1:abcdef", gid: "1", token: "abcdef", url: "https://exhentai.org/g/1/abcdef/", title: "Title", category: "Manga", thumb: "", posted: "", uploader: "u", pages: 120 }; await recordHistory(item, store); await updateReadingProgress(item, 4, store); const history = await loadHistory(store); assert(history.length === 1 && history[0].site === "ex" && history[0].lastPageIndex === 4 && resumeIndex(history[0], 120) === 4 && historySummary(history[0]).url.startsWith("https://exhentai.org/"), "历史或进度保存错误"); await deleteHistory("1", "abcdef", store); assert((await loadHistory(store)).length === 0, "历史删除错误") } },
    { name: "history.malformed-store", run: async () => { const store: HistoryStore = { read: async () => "{bad", write: async () => { throw new Error("must not overwrite") } }; let failed = false; try { await loadHistory(store) } catch { failed = true } assert(failed, "损坏历史数据不应被静默覆盖") } },
    { name: "library.action-privacy", run: async () => { const history = await runEhAction({ type: "history.list", limit: 1 }); assert(history.ok && history.type === "history.list", "history action 未执行"); const serialized = JSON.stringify(history); assert(!/https?:|\/g\/|\"gid\"|\"token\"/i.test(serialized), "History action 输出泄漏身份"); const invalid = await runEhAction({ type: "favorites.list", category: 11 }); assert(!invalid.ok && invalid.code === "INVALID_ACTION", "Favorites action 未验证非法分类") } },
    { name: "diagnostic.sanitizer", run: () => { const payload = sanitizeDiagnostic({ stage: "search https://e-hentai.org/g/123/token", ok: false, request: { url: "https://e-hentai.org/g/123/token", status: 403 }, notes: "Cookie=secret ipb_pass_hash=secret", error: new Error("https://e-hentai.org/s/token") }); const text = JSON.stringify(payload); assert(!text.includes("secret") && !text.includes("/g/123/") && payload.request.host === "https://e-hentai.org/[redacted]", "诊断脱敏泄漏") } },
    { name: "self-test.failure-sanitizer", run: () => { const detail = safeSelfTestFailureDetail("network.search-detail-reader", new Error("https://e-hentai.org/g/123/token/ Cookie=secret")); assert(!/https?:|token|secret|\/g\//i.test(detail) && detail.includes("stage=network.search-detail-reader"), "self-test 失败信息泄漏") } },
  ]
  if (options.network) checks.push({ name: "network.search-detail-reader", run: async () => { const list = await searchGalleries("", getBaseUrl()); assert(list.items.length > 0, "画廊列表为空"); const detail = await loadGalleryDetailCore(list.items[0].url); assert(Boolean(detail.title) && detail.pageLinks.length > 0, "画廊详情或预览为空"); const image = await resolveImagePage(detail.pageLinks[0].pageUrl); assert(Boolean(image.imageUrl), "阅读器图片页未解析到图片") } })
  const results: SelfTestResult[] = []
  for (const check of checks) {
    const started = Date.now()
    try { await check.run(); results.push({ name: check.name, ok: true, durationMs: Date.now() - started }) }
    catch (error) { results.push({ name: check.name, ok: false, durationMs: Date.now() - started, detail: safeSelfTestFailureDetail(check.name, error) }) }
  }
  return results
}
