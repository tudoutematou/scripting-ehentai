const LOGIN_URL = "https://forums.e-hentai.org/index.php?act=Login"
const E_BASE = "https://e-hentai.org/"
const EX_BASE = "https://exhentai.org/"
const COOKIE_KEY = "ehentai.account.cookies.v1"
const SITE_KEY = "ehentai.account.site.v1"
const SAFARI_BRIDGE_DIRECTORY = "ehentai-login-bridge"
const SAFARI_LOGIN_FILE = "login.json"
const SAFARI_STATUS_FILE = "status.json"
const AUTH_COOKIE_NAMES = new Set(["ipb_member_id", "ipb_pass_hash", "ipb_session_id", "igneous"])
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
  eHentaiReachable: boolean | null
  exAvailable: boolean | null
}

export type SafariBridgeRootProbe = {
  root: "safariBrowserStorageDirectory" | "safariBrowserDirectory" | "appGroupDocumentsDirectory" | "documentsDirectory"
  rootHash: string
  basename: string
  available: boolean
  statusExists: boolean
  loginExists: boolean
}

export type SafariBridgeProbe = {
  roots: SafariBridgeRootProbe[]
  gmStorageFiles: string[]
  gmStorageProbeFound: boolean
  gmStorageProbeNonce: string
  loginCaptured: boolean
}

export type AccountDiagnostic = {
  stage: string
  searchedPaths: string[]
  bridgeProbe: SafariBridgeProbe
  loginPath: string
  loginExists: boolean
  jsonParsed: boolean
  hasMemberId: boolean
  hasPassHash: boolean
  keychainSet: boolean
  keychainRoundTrip: boolean
  loggedIn: boolean
  eHentaiReachable: boolean | null
  exAvailable: boolean | null
  notes: string
}

let latestDiagnostic: AccountDiagnostic = {
  stage: "startup",
  searchedPaths: [],
  bridgeProbe: { roots: [], gmStorageFiles: [], gmStorageProbeFound: false, gmStorageProbeNonce: "", loginCaptured: false },
  loginPath: "",
  loginExists: false,
  jsonParsed: false,
  hasMemberId: false,
  hasPassHash: false,
  keychainSet: false,
  keychainRoundTrip: false,
  loggedIn: false,
  eHentaiReachable: null,
  exAvailable: null,
  notes: "",
}

export function getAccountDiagnostic(): AccountDiagnostic {
  return {
    ...latestDiagnostic,
    searchedPaths: [...latestDiagnostic.searchedPaths],
    bridgeProbe: { ...latestDiagnostic.bridgeProbe, roots: latestDiagnostic.bridgeProbe.roots.map(root => ({ ...root })) },
  }
}

function updateDiagnostic(update: Partial<AccountDiagnostic>) {
  latestDiagnostic = { ...latestDiagnostic, ...update }
}

function keychainRoundTrip(): boolean {
  return hasAuthCookies(loadCookies())
}

function diagnosticNotes(status: AccountStatus) {
  return `stage=${latestDiagnostic.stage}; searched=${latestDiagnostic.searchedPaths.join(" | ")}; loginPath=${latestDiagnostic.loginPath || "none"}; loginExists=${latestDiagnostic.loginExists}; jsonParsed=${latestDiagnostic.jsonParsed}; hasMemberId=${latestDiagnostic.hasMemberId}; hasPassHash=${latestDiagnostic.hasPassHash}; keychainSet=${latestDiagnostic.keychainSet}; keychainRoundTrip=${latestDiagnostic.keychainRoundTrip}; loggedIn=${status.loggedIn}; eHentaiReachable=${String(status.eHentaiReachable)}; exAvailable=${String(status.exAvailable)}; ${latestDiagnostic.notes}`
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
  observedCookieNames?: string[]
  cookieReadErrorCount?: number
  cookieReadErrors?: string[]
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

export function importCookiesFromText(value: string): AccountStatus {
  const text = String(value || "").trim()
  if (!text) throw new Error("Cookie 内容为空。")

  let cookies: StoredCookie[]
  try {
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed)) throw new Error("不是数组")
    cookies = sanitizeCookies(parsed)
  } catch {
    const pairs = text.split(/;\s*/).map(part => {
      const index = part.indexOf("=")
      return index > 0 ? { name: part.slice(0, index).trim(), value: part.slice(index + 1), domain: "e-hentai.org", path: "/", secure: true } : null
    }).filter(Boolean)
    cookies = sanitizeCookies(pairs)
  }

  saveCookies(cookies)
  setActiveSite("e")
  return getAccountStatus()
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

function stableHash(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}

function rootBasename(path: string): string {
  return path.split("/").filter(Boolean).pop() || ""
}

function safariBridgeRootEntries() {
  return [
    { root: "safariBrowserStorageDirectory" as const, path: String(fileManager?.safariBrowserStorageDirectory || "").trim() },
    { root: "safariBrowserDirectory" as const, path: String(fileManager?.safariBrowserDirectory || "").trim() },
    { root: "appGroupDocumentsDirectory" as const, path: String(fileManager?.appGroupDocumentsDirectory || "").trim() },
    { root: "documentsDirectory" as const, path: String(fileManager?.documentsDirectory || "").trim() },
  ]
}

function safariBridgeRoots(): string[] {
  const roots = [...new Set(safariBridgeRootEntries().map(entry => entry.path).filter(Boolean))]
  if (!roots.length) throw new Error("当前 Scripting 运行时未提供 Safari Browser 共享目录。")
  return roots
}

function safariBridgePaths(file: string): string[] {
  return safariBridgeRoots().map(root => `${root}/${SAFARI_BRIDGE_DIRECTORY}/${file}`)
}

async function fileExists(path: string): Promise<boolean> {
  try {
    return Boolean(await fileManager.exists(path))
  } catch {
    return false
  }
}

async function findSafariBridgeFile(file: string): Promise<string | null> {
  for (const path of safariBridgePaths(file)) {
    if (await fileExists(path)) return path
  }
  return null
}

async function readSafariBridgeStatus(): Promise<SafariBridgeStatus | null> {
  const candidates: SafariBridgeStatus[] = []
  for (const path of safariBridgePaths(SAFARI_STATUS_FILE)) {
    if (!await fileExists(path)) continue
    try {
      candidates.push(JSON.parse(String(await fileManager.readAsString(path) || "{}")) as SafariBridgeStatus)
    } catch {
      // 继续尝试其他共享目录。
    }
  }
  if (!candidates.length) return null
  return candidates.sort((a, b) => Date.parse(String(b.time || 0)) - Date.parse(String(a.time || 0)))[0]
}

async function safariBridgeExists(): Promise<boolean> {
  return Boolean(await findSafariBridgeFile(SAFARI_LOGIN_FILE))
}

async function safariBrowserStorageProbe() {
  const root = String(fileManager?.safariBrowserStorageDirectory || "").trim()
  if (!root) return { files: [] as string[], found: false, nonce: "" }
  try {
    const paths: string[] = await fileManager.readDirectory(root, true)
    const files = paths.map(path => rootBasename(String(path))).filter(Boolean).sort().slice(0, 64)
    for (const path of paths.slice(0, 64)) {
      try {
        const data = JSON.parse(String(await fileManager.readAsString(String(path)) || "{}"))
        const probe = data?.ehentai_bridge_probe
        if (probe && typeof probe.nonce === "string") return { files, found: true, nonce: probe.nonce }
      } catch { /* 非 JSON 或非本桥接的 GM storage 文件 */ }
    }
    return { files, found: false, nonce: "" }
  } catch {
    return { files: [] as string[], found: false, nonce: "" }
  }
}

export async function probeSafariBridge(): Promise<SafariBridgeProbe> {
  const roots: SafariBridgeRootProbe[] = []
  for (const entry of safariBridgeRootEntries()) {
    const available = Boolean(entry.path)
    const directory = available ? `${entry.path}/${SAFARI_BRIDGE_DIRECTORY}` : ""
    roots.push({
      root: entry.root,
      rootHash: entry.path ? stableHash(entry.path) : "",
      basename: entry.path ? rootBasename(entry.path) : "",
      available,
      statusExists: available && await fileExists(`${directory}/${SAFARI_STATUS_FILE}`),
      loginExists: available && await fileExists(`${directory}/${SAFARI_LOGIN_FILE}`),
    })
  }
  const gmStorage = await safariBrowserStorageProbe()
  const probe = { roots, gmStorageFiles: gmStorage.files, gmStorageProbeFound: gmStorage.found, gmStorageProbeNonce: gmStorage.nonce, loginCaptured: roots.some(root => root.loginExists) }
  updateDiagnostic({ stage: "safari-bridge-probe", bridgeProbe: probe, searchedPaths: roots.map(root => `${root.root}/login.json`), loginExists: probe.loginCaptured, notes: `Safari Bridge Probe complete; canonicalRootHash=${roots.find(root => root.root === "safariBrowserStorageDirectory")?.rootHash || ""}; gmStorageProbeFound=${gmStorage.found}; gmStorageProbeNonce=${gmStorage.nonce || "none"}; paths are root labels only.` })
  return probe
}

export async function hasSafariLoginCapture(): Promise<boolean> {
  return (await probeSafariBridge()).loginCaptured
}

function bridgeMissingMessage(status: SafariBridgeStatus | null): string {
  if (!status) {
    return "Safari 登录桥没有运行。请在 Safari 地址栏点扩展按钮，确认 Scripting 已启用并允许访问 forums.e-hentai.org / e-hentai.org，然后刷新已登录页面。"
  }
  if (status.phase === "error") {
    return `Safari 登录桥已运行但报错：${status.errorCode ? `${status.errorCode}: ` : ""}${status.errorMessage || "未知错误"}`
  }
  if (status.phase === "propagating-to-gallery") {
    return "论坛登录已确认，Safari 正在把会话同步到 e-hentai.org。请等待主站打开并看到绿色“已捕获登录状态”，再返回 Scripting。"
  }
  if (status.phase === "waiting-cookie") {
    const names = status.observedCookieNames?.length ? `；当前可见 Cookie：${status.observedCookieNames.join(", ")}` : ""
    const errors = status.cookieReadErrorCount ? `；Cookie API 错误数：${status.cookieReadErrorCount}` : ""
    return `Safari 登录桥已运行，但尚未读到完整登录 Cookie（member_id=${Boolean(status.hasMemberId)}, pass_hash=${Boolean(status.hasPassHash)}）${names}${errors}。请打开或刷新 e-hentai.org 后再试。`
  }
  if (status.phase === "captured") {
    return "Safari 登录桥显示已捕获 Cookie，但主脚本没有找到登录文件。请再刷新一次 Safari 页面后重试。"
  }
  return `Safari 登录桥状态：${status.phase || "unknown"}。请刷新 Safari 已登录页面后再返回重试。`
}

export async function openSafariLogin(): Promise<void> {
  const opened = await Safari.openURL(LOGIN_URL)
  if (!opened) throw new Error("无法打开系统浏览器。请手动用 Safari 打开 E-Hentai 登录页。")
}

export async function importSafariLogin(): Promise<AccountStatus> {
  const searchedPaths = safariBridgeRootEntries().filter(entry => entry.path).map(entry => `${entry.root}/login.json`)
  updateDiagnostic({
    stage: "safari-import", searchedPaths, loginPath: "", loginExists: false,
    jsonParsed: false, hasMemberId: false, hasPassHash: false,
    keychainSet: false, keychainRoundTrip: false, notes: "开始导入 Safari 登录桥数据（不记录 Cookie 值）",
  })
  const loginPath = await findSafariBridgeFile(SAFARI_LOGIN_FILE)
  if (!loginPath) {
    updateDiagnostic({ notes: "未在候选共享目录中找到 login.json" })
    throw new Error(bridgeMissingMessage(await readSafariBridgeStatus()))
  }
  updateDiagnostic({ loginPath: safariBridgeRootEntries().find(entry => loginPath.startsWith(entry.path))?.root || "unknown-root", loginExists: true })

  let payload: SafariLoginPayload
  try {
    const raw = await fileManager.readAsString(loginPath)
    payload = JSON.parse(String(raw || "{}"))
    updateDiagnostic({ jsonParsed: true })
  } catch (error) {
    updateDiagnostic({ notes: `login.json 读取或解析失败：${String((error as Error)?.message || error)}` })
    throw new Error(`Safari 登录桥数据读取失败：${String((error as Error)?.message || error)}`)
  }

  const cookies = sanitizeCookies(payload.cookies || []).filter(cookie => AUTH_COOKIE_NAMES.has(cookie.name))
  const names = new Set(cookies.map(cookie => cookie.name))
  updateDiagnostic({ hasMemberId: names.has("ipb_member_id"), hasPassHash: names.has("ipb_pass_hash") })
  if (!hasAuthCookies(cookies)) {
    updateDiagnostic({ notes: `JSON 已解析，但核心 Cookie 不完整；names=${[...names].join(",") || "none"}` })
    throw new Error("Safari 已回传数据，但没有检测到完整 E-Hentai 登录 Cookie。请在 Safari 保持登录状态并刷新 e-hentai.org 后重试。")
  }

  if (payload.time) {
    const age = Date.now() - Date.parse(payload.time)
    if (Number.isFinite(age) && age > 2 * 60 * 60 * 1000) throw new Error("Safari 登录桥数据已超过 2 小时，请重新在 Safari 打开 E-Hentai 页面后再导入。")
  }

  try {
    saveCookies(cookies)
    updateDiagnostic({ keychainSet: true })
  } catch (error) {
    updateDiagnostic({ notes: `Keychain.set 失败：${String((error as Error)?.message || error)}` })
    throw error
  }
  const roundTrip = keychainRoundTrip()
  updateDiagnostic({ keychainRoundTrip: roundTrip })
  if (!roundTrip) {
    updateDiagnostic({ notes: "Keychain.set 返回成功，但立即重新读取未发现完整核心 Cookie；保留 login.json 供重试。" })
    throw new Error("Keychain 写入后校验失败；已保留 Safari login.json，请重试。")
  }
  setActiveSite("e")

  // 仅在 Keychain 写入并立即回读确认成功后删除临时明文文件。
  for (const path of safariBridgePaths(SAFARI_LOGIN_FILE)) {
    try { if (await fileExists(path)) await fileManager.remove(path) } catch { /* 已持久化，不影响登录 */ }
  }
  const status = getAccountStatus()
  updateDiagnostic({ stage: "safari-import-complete", loggedIn: status.loggedIn, eHentaiReachable: status.eHentaiReachable, exAvailable: status.exAvailable, notes: `导入成功；Cookie names=${[...names].join(",")}` })
  return status
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
  throw new Error("已打开 Safari。完成论坛登录后，登录桥会自动跳到 e-hentai.org 同步 Cookie；看到绿色“✓ Scripting 已捕获登录状态”后返回本脚本，再点一次“网页登录”完成导入。")
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
    eHentaiReachable: null,
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
  const eHentaiReachable = await validateSite("e")
  const exAvailable = await validateSite("ex")
  const status = {
    ...base,
    // 本地 Keychain 中的两个核心 Cookie 是唯一的登录判据；网络探测既不覆盖它，也不修改用户选择的站点。
    loggedIn: true,
    site: base.site,
    eHentaiReachable,
    exAvailable,
  }
  updateDiagnostic({ stage: "network-validation", loggedIn: true, eHentaiReachable, exAvailable, notes: diagnosticNotes(status) })
  return status
}

export function signOut(): void {
  keychain().remove(COOKIE_KEY)
  keychain().remove(SITE_KEY)
}
