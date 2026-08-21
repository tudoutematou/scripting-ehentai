import { Safari } from "scripting"

const LOGIN_URL = "https://forums.e-hentai.org/index.php?act=Login"
const E_BASE = "https://e-hentai.org/"
const EX_BASE = "https://exhentai.org/"
const COOKIE_KEY = "ehentai.account.cookies.v1"
const SITE_KEY = "ehentai.account.site.v1"
const SAFARI_BRIDGE_DIRECTORY = "ehentai-browser"
const SAFARI_BRIDGE_FILE = "safari-login.json"
const AUTH_COOKIE_NAMES = new Set(["ipb_member_id", "ipb_pass_hash", "igneous"])
const fileManager: any = (globalThis as any).FileManager

export type GallerySite = "e" | "ex"

export type StoredCookie = {
  name: string
  value: string
  domain: string
  path: string
  isSecure?: boolean
  isHTTPOnly?: boolean
  isSessionOnly?: boolean
  expiresDate?: string | null
}

export type AccountStatus = {
  loggedIn: boolean
  memberIdPresent: boolean
  passHashPresent: boolean
  igneousPresent: boolean
  site: GallerySite
  exAvailable: boolean | null
}

type SafariLoginPayload = {
  time?: string
  source?: string
  cookies?: Array<Record<string, unknown>>
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

function keychain(): any {
  const api = (globalThis as any).Keychain
  if (!api) throw new Error("当前 Scripting 运行时未提供 Keychain API。")
  return api
}

function normalizeDomain(value: string): string {
  return String(value || "").trim().toLowerCase().replace(/^\./, "")
}

function isEhDomain(domain: string): boolean {
  const value = normalizeDomain(domain)
  return value === "e-hentai.org" || value.endsWith(".e-hentai.org") || value === "exhentai.org" || value.endsWith(".exhentai.org")
}

function domainMatches(host: string, domain: string): boolean {
  const normalizedHost = String(host || "").toLowerCase()
  const normalizedDomain = normalizeDomain(domain)
  return normalizedHost === normalizedDomain || normalizedHost.endsWith(`.${normalizedDomain}`)
}

function cookiePathMatches(requestPath: string, cookiePath: string): boolean {
  const path = cookiePath || "/"
  return requestPath.startsWith(path)
}

function normalizeExpiry(raw: any): string | null {
  const value = raw?.expiresDate ?? raw?.expirationDate ?? raw?.expires ?? null
  if (value == null || value === "") return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function sanitizeCookies(cookies: any[]): StoredCookie[] {
  const map = new Map<string, StoredCookie>()
  for (const raw of cookies || []) {
    const name = String(raw?.name || "").trim()
    const value = String(raw?.value || "")
    const domain = String(raw?.domain || "").trim()
    if (!name || !value || !domain || !isEhDomain(domain)) continue
    const item: StoredCookie = {
      name,
      value,
      domain,
      path: String(raw?.path || "/"),
      isSecure: Boolean(raw?.isSecure ?? raw?.secure),
      isHTTPOnly: Boolean(raw?.isHTTPOnly ?? raw?.httpOnly),
      isSessionOnly: Boolean(raw?.isSessionOnly ?? raw?.session),
      expiresDate: normalizeExpiry(raw),
    }
    map.set(`${normalizeDomain(domain)}|${item.path}|${name}`, item)
  }
  return [...map.values()]
}

function hasAuthCookies(cookies: StoredCookie[]): boolean {
  const names = new Set(cookies.map(cookie => cookie.name))
  return names.has("ipb_member_id") && names.has("ipb_pass_hash")
}

export function loadCookies(): StoredCookie[] {
  try {
    const raw = keychain().get(COOKIE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(String(raw))
    return Array.isArray(parsed) ? sanitizeCookies(parsed) : []
  } catch {
    return []
  }
}

function saveCookies(cookies: StoredCookie[]): void {
  const safeCookies = sanitizeCookies(cookies)
  if (!hasAuthCookies(safeCookies)) throw new Error("登录数据缺少 ipb_member_id 或 ipb_pass_hash。")
  const ok = keychain().set(COOKIE_KEY, JSON.stringify(safeCookies), {
    accessibility: "first_unlock_this_device",
    synchronizable: false,
  })
  if (!ok) throw new Error("登录 Cookie 写入 Keychain 失败。")
}

function safariBridgePath(): string {
  const root = String(fileManager?.appGroupDocumentsDirectory || "")
  if (!root) throw new Error("当前 Scripting 运行时未提供 App Group 共享目录，无法接收 Safari 登录状态。")
  return `${root}/${SAFARI_BRIDGE_DIRECTORY}/${SAFARI_BRIDGE_FILE}`
}

async function safariBridgeExists(): Promise<boolean> {
  try {
    return Boolean(await fileManager.exists(safariBridgePath()))
  } catch {
    return false
  }
}

export async function openSafariLogin(): Promise<void> {
  const opened = await Safari.openURL(LOGIN_URL)
  if (!opened) throw new Error("无法打开系统 Safari 登录页面。")
}

export async function importSafariLogin(): Promise<AccountStatus> {
  const path = safariBridgePath()
  if (!await safariBridgeExists()) {
    throw new Error("尚未收到 Safari 登录状态。请确认 Safari 中已启用 Scripting 扩展并允许 E-Hentai 站点访问，然后在 Safari 完成登录并刷新一次页面。")
  }

  let payload: SafariLoginPayload
  try {
    const raw = await fileManager.readAsString(path)
    payload = JSON.parse(String(raw || "{}"))
  } catch (error) {
    throw new Error(`Safari 登录桥数据读取失败：${String((error as Error)?.message || error)}`)
  }

  const cookies = sanitizeCookies(payload.cookies || []).filter(cookie => AUTH_COOKIE_NAMES.has(cookie.name))
  if (!hasAuthCookies(cookies)) {
    throw new Error("Safari 已回传数据，但没有检测到完整 E-Hentai 登录 Cookie。请在 Safari 确认账号已登录，并刷新一次 e-hentai.org 后重试。")
  }

  if (payload.time) {
    const age = Date.now() - Date.parse(payload.time)
    if (Number.isFinite(age) && age > 2 * 60 * 60 * 1000) {
      throw new Error("Safari 登录桥数据已超过 2 小时，请重新在 Safari 打开 E-Hentai 页面后再导入。")
    }
  }

  saveCookies(cookies)
  setActiveSite("e")

  try {
    await fileManager.remove(path)
  } catch {
    // 登录 Cookie 已进入 Keychain，临时文件清理失败不影响会话。
  }

  return await refreshAccountStatus()
}

// 兼容现有首页调用名称：0.2.1 起不再使用内嵌 WebView，改为真正的系统 Safari。
// 首次点击打开 Safari；用户完成 CF/登录并返回 Scripting 后，本 Promise 会检测桥接文件并自动导入。
export async function signInWithWebView(): Promise<AccountStatus> {
  if (await safariBridgeExists()) return importSafariLogin()

  await openSafariLogin()
  for (let i = 0; i < 600; i += 1) {
    await sleep(1000)
    if (await safariBridgeExists()) return importSafariLogin()
  }
  throw new Error("等待 Safari 登录状态超时。请回到 Safari 确认已登录并允许 Scripting 扩展访问 E-Hentai 页面，然后再次点击网页登录。")
}

export function getActiveSite(): GallerySite {
  try {
    return keychain().get(SITE_KEY) === "ex" ? "ex" : "e"
  } catch {
    return "e"
  }
}

export function setActiveSite(site: GallerySite): void {
  const ok = keychain().set(SITE_KEY, site, {
    accessibility: "first_unlock_this_device",
    synchronizable: false,
  })
  if (!ok) throw new Error("站点设置写入 Keychain 失败。")
}

export function getBaseUrl(site = getActiveSite()): string {
  return site === "ex" ? EX_BASE : E_BASE
}

function currentAuthCookieByName(cookies: StoredCookie[], name: string): StoredCookie | undefined {
  const candidates = cookies.filter(cookie => cookie.name === name && cookie.value)
  return candidates.find(cookie => normalizeDomain(cookie.domain) === "e-hentai.org")
    || candidates.find(cookie => normalizeDomain(cookie.domain) === "forums.e-hentai.org")
    || candidates[0]
}

export function getCookieHeader(url: string): string {
  let target: URL
  try {
    target = new URL(url)
  } catch {
    return ""
  }

  const cookies = loadCookies()
  const now = Date.now()
  const pairs = new Map<string, string>()

  for (const cookie of cookies) {
    if (AUTH_COOKIE_NAMES.has(cookie.name)) continue
    if (!domainMatches(target.hostname, cookie.domain)) continue
    if (!cookiePathMatches(target.pathname || "/", cookie.path || "/")) continue
    if (cookie.expiresDate && Number.isFinite(Date.parse(cookie.expiresDate)) && Date.parse(cookie.expiresDate) <= now) continue
    pairs.set(cookie.name, cookie.value)
  }

  if (target.hostname === "e-hentai.org" || target.hostname === "exhentai.org") {
    for (const name of AUTH_COOKIE_NAMES) {
      const cookie = currentAuthCookieByName(cookies, name)
      if (cookie) pairs.set(name, cookie.value)
    }
  }

  if (target.hostname === "e-hentai.org" && !pairs.has("nw")) pairs.set("nw", "1")
  return [...pairs.entries()].map(([name, value]) => `${name}=${value}`).join("; ")
}

export function getAccountStatus(): AccountStatus {
  const cookies = loadCookies()
  const names = new Set(cookies.map(cookie => cookie.name))
  const memberIdPresent = names.has("ipb_member_id")
  const passHashPresent = names.has("ipb_pass_hash")
  return {
    loggedIn: memberIdPresent && passHashPresent,
    memberIdPresent,
    passHashPresent,
    igneousPresent: names.has("igneous"),
    site: getActiveSite(),
    exAvailable: null,
  }
}

async function validateSite(site: GallerySite): Promise<boolean> {
  const url = site === "ex" ? EX_BASE : `${E_BASE}home.php`
  const cookie = getCookieHeader(url)
  if (!cookie) return false
  try {
    const response = await fetch(url, {
      headers: { Cookie: cookie },
      timeout: 20,
    })
    const finalUrl = String(response.url || url)
    if (!response.ok) return false
    if (/forums\.e-hentai\.org\/index\.php\?act=Login/i.test(finalUrl)) return false
    if (/act=Login/i.test(finalUrl) && /forums\.e-hentai\.org/i.test(finalUrl)) return false

    const contentType = String(response.headers?.get?.("content-type") || "")
    if (site === "ex" && /^image\//i.test(contentType)) return false
    const text = await response.text()
    if (site === "ex" && /sadpanda|kokomade/i.test(text)) return false
    return true
  } catch {
    return false
  }
}

export async function refreshAccountStatus(): Promise<AccountStatus> {
  const base = getAccountStatus()
  if (!base.loggedIn) return base
  const eValid = await validateSite("e")
  if (!eValid) return { ...base, loggedIn: false, exAvailable: false }

  const exAvailable = await validateSite("ex")
  if (!exAvailable && base.site === "ex") setActiveSite("e")
  return {
    ...base,
    loggedIn: true,
    site: exAvailable ? getActiveSite() : "e",
    exAvailable,
  }
}

export function signOut(): void {
  keychain().remove(COOKIE_KEY)
  keychain().remove(SITE_KEY)
}
