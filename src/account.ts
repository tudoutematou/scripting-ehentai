const LOGIN_URL = "https://forums.e-hentai.org/index.php?act=Login"
const E_BASE = "https://e-hentai.org/"
const EX_BASE = "https://exhentai.org/"
const COOKIE_KEY = "ehentai.account.cookies.v1"
const SITE_KEY = "ehentai.account.site.v1"

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

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

function keychain(): any {
  const api = (globalThis as any).Keychain
  if (!api) throw new Error("当前 Scripting 运行时未提供 Keychain API。")
  return api
}

function webViewController(): any {
  const Controller = (globalThis as any).WebViewController
  if (!Controller) throw new Error("当前 Scripting 运行时未提供 WebViewController API。")
  return Controller
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

function sanitizeCookies(cookies: any[]): StoredCookie[] {
  const map = new Map<string, StoredCookie>()
  for (const raw of cookies || []) {
    const name = String(raw?.name || "").trim()
    const value = String(raw?.value || "")
    const domain = String(raw?.domain || "").trim()
    if (!name || !domain || !isEhDomain(domain)) continue
    const item: StoredCookie = {
      name,
      value,
      domain,
      path: String(raw?.path || "/"),
      isSecure: Boolean(raw?.isSecure),
      isHTTPOnly: Boolean(raw?.isHTTPOnly),
      isSessionOnly: Boolean(raw?.isSessionOnly),
      expiresDate: raw?.expiresDate ? new Date(raw.expiresDate).toISOString() : null,
    }
    map.set(`${normalizeDomain(domain)}|${item.path}|${name}`, item)
  }
  return [...map.values()]
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
  const ok = keychain().set(COOKIE_KEY, JSON.stringify(sanitizeCookies(cookies)), {
    accessibility: "first_unlock_this_device",
    synchronizable: false,
  })
  if (!ok) throw new Error("登录 Cookie 写入 Keychain 失败。")
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

export function getCookieHeader(url: string): string {
  let target: URL
  try {
    target = new URL(url)
  } catch {
    return ""
  }

  const now = Date.now()
  const pairs = loadCookies()
    .filter(cookie => {
      if (!domainMatches(target.hostname, cookie.domain)) return false
      if (!cookiePathMatches(target.pathname || "/", cookie.path || "/")) return false
      if (cookie.expiresDate && Number.isFinite(Date.parse(cookie.expiresDate)) && Date.parse(cookie.expiresDate) <= now) return false
      return true
    })
    .map(cookie => `${cookie.name}=${cookie.value}`)

  // Ehviewer 对 E-Hentai 请求固定附加 nw=1，用于跳过内容警告页。
  if (target.hostname === "e-hentai.org" && !pairs.some(pair => pair.startsWith("nw="))) {
    pairs.push("nw=1")
  }
  return pairs.join("; ")
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
    const text = await response.text()
    if (!response.ok) return false
    if (/forums\.e-hentai\.org\/index\.php\?act=Login/i.test(finalUrl)) return false
    if (/act=Login/i.test(finalUrl) && /forums\.e-hentai\.org/i.test(finalUrl)) return false
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
  if (!eValid) {
    return { ...base, loggedIn: false, exAvailable: false }
  }
  const exAvailable = await validateSite("ex")
  if (!exAvailable && base.site === "ex") setActiveSite("e")
  return {
    ...base,
    loggedIn: true,
    site: exAvailable ? getActiveSite() : "e",
    exAvailable,
  }
}

export async function signInWithWebView(): Promise<AccountStatus> {
  const Controller = webViewController()
  const webView = new Controller({ ephemeral: false })
  let captured: StoredCookie[] = []
  let detected = false

  try {
    const loaded = await webView.loadURL(LOGIN_URL)
    if (!loaded) throw new Error("E-Hentai 官方登录页加载失败。")

    const presentation = webView.present({
      fullscreen: true,
      navigationTitle: "登录 E-Hentai",
    })

    // 用户在官方网页中输入账号；脚本只轮询 WebKit Cookie，不接触密码字段。
    for (let i = 0; i < 600; i += 1) {
      await sleep(1000)
      const cookies = sanitizeCookies(await webView.getAllCookies())
      const names = new Set(cookies.map(cookie => cookie.name))
      if (names.has("ipb_member_id") && names.has("ipb_pass_hash")) {
        captured = cookies
        detected = true
        webView.dismiss()
        break
      }
    }

    await presentation

    // 如果用户主动关闭登录页，关闭后再检查一次 Cookie。
    if (!detected) {
      const cookies = sanitizeCookies(await webView.getAllCookies())
      const names = new Set(cookies.map(cookie => cookie.name))
      if (names.has("ipb_member_id") && names.has("ipb_pass_hash")) {
        captured = cookies
        detected = true
      }
    }

    if (!detected) throw new Error("没有检测到登录 Cookie。请确认已在官方页面完成登录后再关闭窗口。")
    saveCookies(captured)
    setActiveSite("e")
    return await refreshAccountStatus()
  } finally {
    webView.dispose()
  }
}

export function signOut(): void {
  keychain().remove(COOKIE_KEY)
  keychain().remove(SITE_KEY)
}
