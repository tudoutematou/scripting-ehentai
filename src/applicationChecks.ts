import { shouldRecoverReaderNetwork } from "./readerRecovery"
import { classifyNetworkError, httpStatusError, preserveNetworkErrorMetadata } from "./networkErrors"
import { galleryCardTitleLines, galleryOpenMode, swipeBackShouldPop } from "./galleryModel"
import { glassGroupMixesInPlaceAndNavigation } from "./searchModel"
import { readerControlActions } from "./readerModel"
import { fetchHtml, externalDestinationUrl, userSafeError } from "./ehentai"
import { sanitizeDiagnostic } from "./githubBridge"
import { SETTINGS_ROOT_SECTIONS as SettingsRootContract, regularRootNavigationKey, resolvedSplitColumnVisibility, splitColumnVisibility } from "./appNavigationModel"
import { continueReadingTitle, downloadPhaseLabel, historyStatusLabel, libraryDownloadNote, localBookmarkStatusLabel, readerPageCaption, readingProgressLabel, workTitle, workTitleFont, workTitleLines } from "./galleryCopy"
import { mountGalleryDetail, subscribeGalleryDetailCount } from "./galleryLifecycle"
import { type Check, assert, BASE, safeSelfTestFailureDetail } from "./selfTestSupport"

export const applicationChecks: Check[] = [
    { name: "ui.native-unification-contract", run: () => { assert(SettingsRootContract.join(",")==="account,reading,downloads,data"&&galleryCardTitleLines()===2&&readerControlActions().join(",")==="previous,play,next,jump,original,settings","统一设置分区、画廊卡片或 Reader 控制层契约错误") } },
    { name: "ui.shared-work-copy", run: () => { assert(workTitleFont()==="headline"&&workTitleLines("row")===3&&workTitleLines("card")===2&&workTitleLines("strip")===2&&workTitle("  ")==="未命名画廊"&&workTitle("作品")==="作品","发现、书库和阅读器作品卡字级不一致");assert(readingProgressLabel(12,500)==="阅读进度 · 第 12 页 / 500"&&readingProgressLabel(3)==="阅读进度 · 第 3 页"&&continueReadingTitle(null)==="开始阅读"&&continueReadingTitle(8)==="继续阅读 · 第 8 页"&&readerPageCaption(4)==="第 4 页","阅读进度文案不一致");assert(historyStatusLabel()==="历史记录"&&localBookmarkStatusLabel()==="本地书签"&&downloadPhaseLabel("failed")==="需要重试"&&libraryDownloadNote(2,10,"downloading")==="下载 2/10 页 · 正在下载"&&!libraryDownloadNote(1,2,"queued").includes("queued"),"书库状态仍泄漏英文状态") } },
    { name: "navigation.regular-root-reset-contract", run: () => { assert(regularRootNavigationKey("discover")!==regularRootNavigationKey("library")&&regularRootNavigationKey("library")!==regularRootNavigationKey("settings")&&regularRootNavigationKey("discover",0)!==regularRootNavigationKey("discover",1)&&regularRootNavigationKey("discover")==="regular-root:discover:0","iPad 根栏目切换或再次点当前栏目未重置 NavigationStack") } },
    { name: "navigation.gallery-swipe-back", run: () => { assert(swipeBackShouldPop(12,90)&&swipeBackShouldPop(24,72)&&!swipeBackShouldPop(80,120)&&!swipeBackShouldPop(12,20)&&!swipeBackShouldPop(12,90,-200)&&!swipeBackShouldPop(800,-90),"画廊详情未保留原生左缘侧滑返回") } },
    { name: "navigation.gallery-single-stack", run: () => { assert(["compact","regular",undefined].every(value=>galleryOpenMode(value)==="push"),"所有画廊必须在当前栈 push");const seen:number[]=[];const stop=subscribeGalleryDetailCount(count=>seen.push(count));const close=mountGalleryDetail(),closeNested=mountGalleryDetail();closeNested();closeNested();close();stop();assert(seen.join(",")==="0,1,2,1,0","嵌套详情或重复cleanup破坏侧栏计数");assert(splitColumnVisibility(true)==="detailOnly"&&splitColumnVisibility(false)==="doubleColumn"&&resolvedSplitColumnVisibility(true,"all")==="detailOnly"&&resolvedSplitColumnVisibility(false,"all")==="all","侧栏显隐或用户选择恢复错误") } },
    { name: "network.metadata-survives-stage-wrapping", run: () => {
      const wrapped=preserveNetworkErrorMetadata(new Error("safe stage"),httpStatusError(503));
      assert(classifyNetworkError(wrapped).status===503&&shouldRecoverReaderNetwork(wrapped),"包装丢失状态码");
      assert(!shouldRecoverReaderNetwork(preserveNetworkErrorMetadata(new Error("TLS"),httpStatusError(404))),"404包装后被误重试");
    } },
    { name: "network.classification-boundaries", run: () => {
      for(const status of [408,429,500,503,599])assert(shouldRecoverReaderNetwork({status}),"临时HTTP未允许恢复");
      for(const status of [200,400,401,403,404])assert(!shouldRecoverReaderNetwork({status,message:"网络连接超时"}),"HTTP证据未优先");
      assert(!shouldRecoverReaderNetwork({name:"AbortError",status:503})&&!shouldRecoverReaderNetwork({name:"ImageSessionCancelled",message:"TLS"}),"取消误恢复");
      assert(shouldRecoverReaderNetwork({code:"ECONNRESET"})&&shouldRecoverReaderNetwork({name:"NetworkError"})&&shouldRecoverReaderNetwork({name:"TimeoutError"}),"结构化传输错误遗漏");
      assert(shouldRecoverReaderNetwork(new TypeError("Load failed"))&&shouldRecoverReaderNetwork(new Error("TLS错误导致安全连接失败。")),"原生文字兜底失效");
    } },
    { name: "nav.no-mixed-glass-actions", run: () => { assert(glassGroupMixesInPlaceAndNavigation(["inplace","navigate"]),"应检出就地操作和跳转混排");assert(!glassGroupMixesInPlaceAndNavigation(["inplace","inplace"])&&!glassGroupMixesInPlaceAndNavigation(["navigate","navigate"]),"同类操作不应被误判");assert(!glassGroupMixesInPlaceAndNavigation(["inplace","inplace","inplace"]),"详情收藏/下载/书签全是就地操作");assert(!glassGroupMixesInPlaceAndNavigation(["navigate","navigate","navigate","navigate"]),"首页浏览入口全是跳转") } },
    { name: "external.destination-allowlist", run: () => { const values=[externalDestinationUrl("news",BASE),externalDestinationUrl("forums",BASE),externalDestinationUrl("wiki",BASE),externalDestinationUrl("torrents",BASE)];assert(values.every(value=>new URL(value).protocol==="https:")&&new URL(values[2]).hostname==="ehwiki.org","安全外部入口 URL 错误") } },
    { name: "diagnostic.sanitizer", run: () => { const payload = sanitizeDiagnostic({ stage: "search https://e-hentai.org/g/123/token", ok: false, request: { url: "https://e-hentai.org/g/123/token", status: 403 }, notes: "Cookie=secret ipb_pass_hash=secret ipb_session_id=abc", error: new Error("https://e-hentai.org/s/token /var/mobile/Library/secret") }); const text = JSON.stringify(payload); assert(!text.includes("secret") && !text.includes("/g/123/") && !text.includes("/var/mobile") && payload.error?.stack==="" && payload.request.host === "https://e-hentai.org/[redacted]", "诊断脱敏泄漏") } },
    { name: "network.user-safe-error", run: () => { const safe=userSafeError(new Error("fetch https://e-hentai.org/g/1/token Cookie=secret /private/path"));assert(!/https?:|token|secret|private/i.test(safe),"用户可见错误泄漏敏感底层内容") } },
    { name: "network.fetch-rejects-invalid-url", run: async () => { let message=""; try { await fetchHtml(undefined as any, "detail-core") } catch (error) { message=String((error as any)?.message||error) } assert(message.includes("detail-core") && !/Request\(input\)/i.test(message), "无效 URL 未在发起请求前拒绝") } },
    { name: "self-test.failure-sanitizer", run: () => { const detail = safeSelfTestFailureDetail("network.search-detail-reader", new Error("https://e-hentai.org/g/123/token/ Cookie=secret")); assert(!/https?:|token|secret|\/g\//i.test(detail) && detail.includes("stage=network.search-detail-reader"), "self-test 失败信息泄漏") } },
]
