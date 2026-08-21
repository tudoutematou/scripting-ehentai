const LOGIN_URL = "https://forums.e-hentai.org/index.php?act=Login"
const E_BASE = "https://e-hentai.org/"
const EX_BASE = "https://exhentai.org/"
const COOKIE_KEY = "ehentai.account.cookies.v1"
const SITE_KEY = "ehentai.account.site.v1"
const SAFARI_BRIDGE_DIRECTORY = "ehentai-login-bridge"
const SAFARI_LOGIN_FILE = "login.json"
const SAFARI_STATUS_FILE = "status.json"
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

type SafariBridgeStatus = {
  time?: string
  host?: string
  phase?: string
  version?: string
  cookieNames?: string[]
  hasMemberId?: boolean
  hasPassHash?: boolean
  hasIgneous?: boolean
  errorCode?: string
  errorMessage?: string
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

function safariBridgeRoot(): string {
  const root = String(fileManager?.safariBrowserDirectory || fileManager?.appGroupDocumentsDirectory || "")
  if (!root) throw new Error("当前 Scripting 运行时未提供 Safari Browser 共享目录。")
  return root
}

function safariBridgePath(file: string): string {
  return `${safariBridgeRoot()}/${SAFARI_BRIDGE_DIRECTORY}/${file}`
}

async function fileExists(path: string): Promise<boolean> {
  try {
    return Boolean(await fileManager.exists(path))
  } catch {
    return false
  }
}

async function readSafariBridgeStatus(): Promise<SafariBridgeStatus | null> {
  const path = safariBridgePath(SAFARI_STATUS_FILE)
  if (!await fileExists(path)) return null
  try {
    return JSON.parse(String(await fileManager.readAsString(path) || "{}")) as SafariBridgeStatus
  } catch {
    return null
  }
}

async function safariBridgeExists(): Promise<boolean> {
  return fileExists(safariBridgePath(SAFARI_LOGIN_FILE))
}

function bridgeMissingMessage(status: SafariBridgeStatus | null): string {
  if (!status) {
    return "Safari 登录桥没有运行。请在 Safari 地址栏点扩展按钮（拼图图标），确认 Scripting 已启用并允许访问 forums.e-hentai.org / e-hentai.org，然后刷新已登录页面。刷新后页面右下角应出现“Scripting 登录桥已运行”。"
  }
  if (status.phase === "error") {
    return `Safari 登录桥已运行但报错：${status.errorCode ? `${status.errorCode}: ` : ""}${status.errorMessage || "未知错误"}`
  }
  if (status.phase === "waiting-cookie") {
    return `Safari 登录桥已运行，但尚未读到完整登录 Cookie（member_id=${Boolean(status.hasMemberId)}, pass_hash=${Boolean(status.hasPassHash)}）。请保持 Safari 已登录，刷新 forums.e-hentai.org 或打开 e-hentai.org 后再返回重试。`
  }
  if (status.phase === "captured") {
    return "Safari 登录桥显示已捕获 Cookie，但主脚本没有找到登录文件。请再刷新一次 Safari 页面后重试；如果仍出现此提示，说明 Safari 与主 App 的共享目录需要继续校准。"
  }
  return `Safari 登录桥状态：${status.phase || "unknown"}。请刷新 Safari 已登录页面后再返回重试。`
}

export async function openSafariLogin(): Promise<void> {
  const opened = await Safari.openURL(LOGIN_URL)
  if (!opened) throw new Error("无法打开系统浏览器。请手动用 Safari 打开 E-Hentai 登录页。")
}

export async function importSafariLogin(): Promise<AccountStatus> {
  const loginPath = safariBridgePath(SAFARI_LOGIN_FILE)
  if (!await safariBridgeExists()) {
    throw new Error(bridgeMissingMessage(await readSafariBridgeStatus()))
  }

  let payload: SafariLoginPayload
  try {
    const raw = await fileManager.readAsString(loginPath)
    payload = JSON.parse(String(raw || "{}"))
  } catch (error) {
    throw new Error(`Safari 登录桥数据读取失败：${String((error as Error)?.message || error)}`)
  }

  const cookies = sanitizeCookies(payload.cookies || []).filter(cookie => AUTH_COOKIE_NAMES.has(cookie.name))
  if (!hasAuthCookies(cookies)) {
    throw new Error("Safari 已回传数据，但没有检测到完整 E-Hentai 登录 Cookie。请在 Safari 保持登录状态并刷新页面后重试。")
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
    await fileManager.remove(loginPath)
  } catch {
    // 登录 Cookie 已进入 Keychain，临时明文文件清理失败不影响会话。
  }

  return await refreshAccountStatus()
}

// 兼容现有首页“网页登录”按钮：第一次打开真实 Safari；
// 登录完成后第二次点击会尝试从 Safari Browser 共享目录导入。
export async function signInWithWebView(): Promise<AccountStatus> {
  if (await safariBridgeExists()) return importSafariLogin()

  const status = await readSafariBridgeStatus()
  if (status && status.phase !== "running") {
    throw new Error(bridgeMissingMessage(status))
  }

  await openSafariLogin()
  throw new Error("已打开 Safari。完成登录后请刷新一次已登录页面：如果页面右下角出现“✓ Scripting 已捕获登录状态”，返回本脚本再点一次“网页登录”。如果连“Scripting 登录桥已运行”都看不到，请检查 Safari 的 Scripting 扩展与网站访问权限。")
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
