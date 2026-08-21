import { GallerySummary } from "./extractors"
import { parseSearchHtml } from "./searchHtml"
import { getBaseUrl, getCookieHeader, getAccountStatus } from "./account"
import { reportDiagnostic } from "./githubBridge"

export type FavoriteCategory = { slot: number; name: string; count: number }
export type FavoritesPage = {
  categories: FavoriteCategory[]
  items: GallerySummary[]
  prevHref: string
  nextHref: string
  url: string
}

function favoritesUrl(category = "all", page = 0): string {
  const url = new URL("favorites.php", getBaseUrl())
  url.searchParams.set("favcat", category)
  if (page > 0) url.searchParams.set("page", String(page))
  return url.toString()
}

function categoriesFromHtml(html: string): FavoriteCategory[] {
  const result: FavoriteCategory[] = []
  // 当前 favorites.php 的 .ido 下有 10 个 .fp；仅保留数字计数和可见文字，不上传 HTML。
  const re = /<[^>]*class\s*=\s*(["'])[^"']*\bfp\b[^"']*\1[^>]*>([\s\S]*?)<\/[^>]+>/gi
  const clean = (value: string) => value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim()
  let match: RegExpExecArray | null
  while ((match = re.exec(html)) && result.length < 10) {
    const text = clean(match[2])
    const count = Number((text.match(/^\s*([\d,]+)/)?.[1] || "0").replace(/,/g, "")) || 0
    const name = text.replace(/^[\d,]+\s*/, "").trim() || `收藏夹 ${result.length}`
    result.push({ slot: result.length, name, count })
  }
  while (result.length < 10) result.push({ slot: result.length, name: `收藏夹 ${result.length}`, count: 0 })
  return result
}

async function report(input: Parameters<typeof reportDiagnostic>[0]) {
  try { await reportDiagnostic(input) } catch { /* 诊断不可阻断收藏操作 */ }
}

export async function loadFavorites(category = "all", page = 0, directUrl?: string): Promise<FavoritesPage> {
  if (!getAccountStatus().loggedIn) throw new Error("请先登录后查看收藏。")
  const url = directUrl || favoritesUrl(category, page)
  let response: any
  try {
    response = await fetch(url, { headers: { Cookie: getCookieHeader(url) } })
    const html = await response.text()
    if (!response.ok) throw new Error(`收藏请求失败：HTTP ${response.status}`)
    if (/This page requires you to log on\.<\/p>/i.test(html)) throw new Error("收藏页要求登录；请刷新账号状态或重新导入 Cookie。")
    const parsed = parseSearchHtml(html, String(response.url || url))
    const data = { categories: categoriesFromHtml(html), items: parsed.items, prevHref: parsed.prevHref, nextHref: parsed.nextHref, url: String(response.url || url) }
    await report({ stage: "favorites-list", ok: true, request: { url: data.url, status: Number(response.status || 0), statusText: String(response.statusText || "") }, notes: `items=${data.items.length}; categories=${data.categories.length}` })
    return data
  } catch (error) {
    await report({ stage: "favorites-list", ok: false, error, request: { url, status: Number(response?.status || 0), statusText: String(response?.statusText || "") } })
    throw error
  }
}

export async function updateFavorite(gid: string, token: string, category: number | -1, note = ""): Promise<void> {
  if (!getAccountStatus().loggedIn) throw new Error("请先登录后操作收藏。")
  if (category < -1 || category > 9) throw new Error("收藏夹必须为 0 到 9。")
  if (note.length > 250) throw new Error("收藏备注最多 250 个字符。")
  const url = new URL(`gallerypopups.php?gid=${encodeURIComponent(gid)}&t=${encodeURIComponent(token)}&act=addfav`, getBaseUrl()).toString()
  const body = `favcat=${encodeURIComponent(category === -1 ? "favdel" : String(category))}&favnote=${encodeURIComponent(note)}&submit=${encodeURIComponent("Apply Changes")}&update=1`
  let response: any
  try {
    response = await fetch(url, { method: "POST", headers: { Cookie: getCookieHeader(url), "Content-Type": "application/x-www-form-urlencoded", Referer: url, Origin: new URL(url).origin }, body })
    if (!response.ok) throw new Error(`收藏更新失败：HTTP ${response.status}`)
    await report({ stage: "favorites-update", ok: true, request: { url, status: Number(response.status || 0), statusText: String(response.statusText || "") }, notes: `action=${category === -1 ? "remove" : "set"}; category=${category}; notePresent=${Boolean(note)}` })
  } catch (error) {
    await report({ stage: "favorites-update", ok: false, error, request: { url, status: Number(response?.status || 0), statusText: String(response?.statusText || "") }, notes: `category=${category}` })
    throw error
  }
}
