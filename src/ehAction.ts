import { getAccountStatus, getBaseUrl } from "./account"
import { loadGalleryDetailCore, searchGalleries } from "./ehentai"
import { buildGallerySearchUrl, createHomeSearchState, type GalleryCategoryKey, type QuickFilterKey } from "./tourist"

export type EhAction =
  | { type: "account.status" }
  | { type: "search"; query: string; category?: GalleryCategoryKey; language?: QuickFilterKey }
  | { type: "gallery.detail"; url: string }

type ActionErrorCode = "INVALID_ACTION" | "INVALID_URL" | "REQUEST_FAILED" | "UNAVAILABLE"
export type EhActionFailure = { ok: false; code: ActionErrorCode; stage: string; message: string }
export type EhActionSuccess =
  | { ok: true; type: "account.status"; account: ReturnType<typeof getAccountStatus> }
  | { ok: true; type: "search"; resultCount: string; items: Array<{ title: string; category: string; pages: number; uploader: string }> }
  | { ok: true; type: "gallery.detail"; detail: { title: string; titleJpn: string; category: string; uploader: string; rating: number | null; ratingCount: number; previewPages: number; pageCount: number; tags: Array<{ namespace: string; names: string[] }> } }
export type EhActionResult = EhActionSuccess | EhActionFailure

function failure(code: ActionErrorCode, stage: string, message: string): EhActionFailure {
  return { ok: false, code, stage, message }
}

function safeMessage(error: unknown): string {
  const name = String((error as any)?.name || "Error")
  if (/abort|timeout/i.test(name)) return "请求超时，请稍后重试。"
  return "请求未完成，请检查登录状态或网络后重试。"
}

function isGalleryUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && (url.hostname === "e-hentai.org" || url.hostname === "exhentai.org") && /^\/g\/\d+\/[a-f0-9]+\/?$/i.test(url.pathname)
  } catch {
    return false
  }
}

export async function runEhAction(action: EhAction): Promise<EhActionResult> {
  if (!action || typeof action.type !== "string") return failure("INVALID_ACTION", "validate", "不支持的操作。")
  try {
    if (action.type === "account.status") return { ok: true, type: action.type, account: getAccountStatus() }
    if (action.type === "search") {
      const query = String(action.query || "").trim()
      if (!query) return failure("INVALID_ACTION", "validate", "搜索词不能为空。")
      const state = createHomeSearchState(query, action.category || "all", action.language || "none")
      const page = await searchGalleries(query, buildGallerySearchUrl(getBaseUrl(), state))
      return { ok: true, type: action.type, resultCount: page.resultCount, items: page.items.slice(0, 20).map(item => ({ title: item.title, category: item.category, pages: item.pages, uploader: item.uploader })) }
    }
    if (action.type === "gallery.detail") {
      if (!isGalleryUrl(action.url)) return failure("INVALID_URL", "validate", "仅允许 E-Hentai 或 ExHentai 的画廊详情地址。")
      const detail = await loadGalleryDetailCore(action.url)
      return { ok: true, type: action.type, detail: { title: detail.title, titleJpn: detail.titleJpn, category: detail.category, uploader: detail.uploader, rating: detail.rating, ratingCount: detail.ratingCount, previewPages: detail.previewPages, pageCount: detail.pageLinks.length, tags: detail.tags.map(group => ({ namespace: group.namespace, names: group.tags.map(tag => tag.name) })) } }
    }
    return failure("INVALID_ACTION", "validate", "不支持的操作。")
  } catch (error) {
    return failure("REQUEST_FAILED", "core", safeMessage(error))
  }
}
