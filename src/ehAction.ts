import { loadFavorites } from "./favorites"
import { historySummary, loadHistory } from "./libraryStore"
import { getAccountStatus, getBaseUrl } from "./account"
import { loadGalleryDetailCore, searchGalleries } from "./ehentai"
import { buildGallerySearchUrl, createHomeSearchState, type GalleryCategoryKey, type QuickFilterKey } from "./tourist"

export type EhAction =
  | { type: "account.status" }
  | { type: "search"; query: string; category?: GalleryCategoryKey; language?: QuickFilterKey }
  | { type: "gallery.detail"; galleryRef: string }
  | { type: "favorites.list"; category?: number; query?: string }
  | { type: "history.list"; limit?: number }

type ActionErrorCode = "INVALID_ACTION" | "INVALID_GALLERY_REF" | "GALLERY_REF_EXPIRED" | "REQUEST_FAILED"
type ActionStage = "validate" | "gallery-ref" | "core"
export type EhActionFailure = { ok: false; code: ActionErrorCode; stage: ActionStage; message: string }
export type GallerySearchItem = { galleryRef: string; title: string; category: string; pages: number; uploader: string }
export type EhActionSuccess =
  | { ok: true; type: "account.status"; account: ReturnType<typeof getAccountStatus> }
  | { ok: true; type: "search"; resultCount: string; items: GallerySearchItem[] }
  | { ok: true; type: "gallery.detail"; detail: { title: string; titleJpn: string; category: string; uploader: string; rating: number | null; ratingCount: number; previewPages: number; pageCount: number; tags: Array<{ namespace: string; names: string[] }> } }
  | { ok: true; type: "favorites.list"; categories: Array<{ index: number; name: string; count: number }>; resultCount: string; items: GallerySearchItem[] }
  | { ok: true; type: "history.list"; items: GallerySearchItem[] }
export type EhActionResult = EhActionSuccess | EhActionFailure

type GalleryRefEntry = { url: string; expiresAt: number }
const GALLERY_REF_TTL_MS = 10 * 60 * 1000
const MAX_GALLERY_REFS = 100
const galleryRefs = new Map<string, GalleryRefEntry>()

function failure(code: ActionErrorCode, stage: ActionStage, message: string): EhActionFailure {
  return { ok: false, code, stage, message }
}

function safeMessage(error: unknown): string {
  const name = String((error as any)?.name || "Error")
  if (/abort|timeout/i.test(name)) return "请求超时，请稍后重试。"
  return "请求未完成，请检查登录状态或网络后重试。"
}

function pruneGalleryRefs(now = Date.now()) {
  for (const [ref, entry] of galleryRefs) if (entry.expiresAt <= now) galleryRefs.delete(ref)
  while (galleryRefs.size >= MAX_GALLERY_REFS) {
    const oldest = galleryRefs.keys().next().value
    if (!oldest) break
    galleryRefs.delete(oldest)
  }
}

function createGalleryRef(url: string): string {
  pruneGalleryRefs()
  let ref = ""
  do { ref = `gallery_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}` } while (galleryRefs.has(ref))
  galleryRefs.set(ref, { url, expiresAt: Date.now() + GALLERY_REF_TTL_MS })
  return ref
}

function resolveGalleryRef(galleryRef: unknown): { ok: true; url: string } | EhActionFailure {
  if (typeof galleryRef !== "string" || !/^gallery_[a-z0-9]+_[a-z0-9]+$/i.test(galleryRef)) return failure("INVALID_GALLERY_REF", "validate", "画廊引用无效，请先重新搜索。")
  const entry = galleryRefs.get(galleryRef)
  if (!entry || entry.expiresAt <= Date.now()) {
    galleryRefs.delete(galleryRef)
    return failure("GALLERY_REF_EXPIRED", "gallery-ref", "画廊引用已过期，请重新搜索。")
  }
  return { ok: true, url: entry.url }
}

/** Typed AI boundary: opaque search references keep gallery URLs and tokens inside this dispatcher. */
export async function runEhAction(action: EhAction): Promise<EhActionResult> {
  if (!action || typeof action.type !== "string") return failure("INVALID_ACTION", "validate", "不支持的操作。")
  try {
    if (action.type === "account.status") return { ok: true, type: action.type, account: getAccountStatus() }
    if (action.type === "search") {
      const query = String(action.query || "").trim()
      if (!query) return failure("INVALID_ACTION", "validate", "搜索词不能为空。")
      const state = createHomeSearchState(query, action.category || "all", action.language || "none")
      const page = await searchGalleries(query, buildGallerySearchUrl(getBaseUrl(), state))
      return { ok: true, type: action.type, resultCount: page.resultCount, items: page.items.slice(0, 20).map(item => ({ galleryRef: createGalleryRef(item.url), title: item.title, category: item.category, pages: item.pages, uploader: item.uploader })) }
    }
    if (action.type === "favorites.list") { const category = action.category; const query = String(action.query || "").trim(); if (category != null && (!Number.isInteger(category) || category < 0 || category > 9)) return failure("INVALID_ACTION", "validate", "收藏分类必须为 0 到 9。") ; if (query.length > 200) return failure("INVALID_ACTION", "validate", "搜索词过长。") ; const page = await loadFavorites(category, { query }); return { ok: true, type: action.type, categories: page.categories.map(x => ({ index: x.index, name: x.name, count: x.count })), resultCount: page.resultCount, items: page.items.slice(0, 20).map(item => ({ galleryRef: createGalleryRef(item.url), title: item.title, category: item.category, pages: item.pages, uploader: item.uploader })) }
    }
    if (action.type === "history.list") { const limit = action.limit == null ? 20 : Number(action.limit); if (!Number.isInteger(limit) || limit < 1 || limit > 50) return failure("INVALID_ACTION", "validate", "历史记录数量必须为 1 到 50。") ; return { ok: true, type: action.type, items: (await loadHistory()).slice(0, limit).map(record => { const item = historySummary(record); return { galleryRef: createGalleryRef(item.url), title: item.title, category: item.category, pages: item.pages, uploader: item.uploader } }) }
    }
    if (action.type === "gallery.detail") {
      const resolved = resolveGalleryRef(action.galleryRef)
      if (!resolved.ok) return resolved
      const detail = await loadGalleryDetailCore(resolved.url)
      return { ok: true, type: action.type, detail: { title: detail.title, titleJpn: detail.titleJpn, category: detail.category, uploader: detail.uploader, rating: detail.rating, ratingCount: detail.ratingCount, previewPages: detail.previewPages, pageCount: detail.pageLinks.length, tags: detail.tags.map(group => ({ namespace: group.namespace, names: group.tags.map(tag => tag.name) })) } }
    }
    return failure("INVALID_ACTION", "validate", "不支持的操作。")
  } catch (error) {
    return failure("REQUEST_FAILED", "core", safeMessage(error))
  }
}
