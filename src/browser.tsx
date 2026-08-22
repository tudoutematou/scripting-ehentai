// ==UserScript==
// @name E-Hentai Login Bridge
// @namespace scripting-ehentai
// @version 0.2.8
// @description Capture E-Hentai login cookies from real Safari for the Scripting app.
// @match https://forums.e-hentai.org/*
// @match https://e-hentai.org/*
// @match https://exhentai.org/*
// @grant GM.cookie
// @grant GM.setValue
// @grant GM.log
// @grant Scripting.FileManager
// @connect forums.e-hentai.org
// @connect e-hentai.org
// @connect exhentai.org
// @connect https://forums.e-hentai.org/*
// @connect https://e-hentai.org/*
// @connect https://exhentai.org/*
// @run-at document-idle
// @inject-into content
// @noframes
// ==/UserScript==

const REQUIRED_COOKIE_NAMES = new Set(["ipb_member_id", "ipb_pass_hash"])
const CAPTURE_COOKIE_NAMES = new Set([
  "ipb_member_id",
  "ipb_pass_hash",
  "ipb_session_id",
  "igneous",
])
const TARGETS = [
  "https://forums.e-hentai.org/",
  "https://e-hentai.org/",
  "https://exhentai.org/",
]
const E_BASE = "https://e-hentai.org/"
const BRIDGE_DIRECTORY = "ehentai-login-bridge"
const LOGIN_FILE = "login.json"
const STATUS_FILE = "status.json"

function normalizeCookie(raw: any, fallbackDomain = location.hostname) {
  return {
    name: String(raw?.name || ""),
    value: String(raw?.value || ""),
    domain: String(raw?.domain || fallbackDomain || ""),
    path: String(raw?.path || "/"),
    secure: Boolean(raw?.secure ?? raw?.isSecure ?? location.protocol === "https:"),
    httpOnly: Boolean(raw?.httpOnly ?? raw?.isHTTPOnly),
    session: Boolean(raw?.session ?? raw?.isSessionOnly),
    expirationDate: raw?.expirationDate ?? raw?.expiresDate ?? null,
  }
}

function errorSummary(error: unknown): string {
  const value = error as { code?: unknown; name?: unknown; message?: unknown }
  const code = String(value?.code || value?.name || "Error")
  const message = String(value?.message || error || "未知错误")
  return `${code}: ${message}`
}

type BridgeRoot = {
  type: "safariBrowserStorageDirectory" | "safariBrowserDirectory" | "appGroupDocumentsDirectory" | "documentsDirectory"
  path: string
}

function stableHash(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}

function rootBasename(path: string) {
  return path.split("/").filter(Boolean).pop() || ""
}

function bridgeRootCandidates(): BridgeRoot[] {
  const fm = Scripting.FileManager as any
  const candidates: BridgeRoot[] = [
    { type: "safariBrowserStorageDirectory", path: String(fm.safariBrowserStorageDirectory || "").trim() },
    { type: "safariBrowserDirectory", path: String(fm.safariBrowserDirectory || "").trim() },
    { type: "appGroupDocumentsDirectory", path: String(fm.appGroupDocumentsDirectory || "").trim() },
    { type: "documentsDirectory", path: String(fm.documentsDirectory || "").trim() },
  ]
  const seen = new Set<string>()
  return candidates.filter(root => root.path && !seen.has(root.path) && Boolean(seen.add(root.path)))
}

let writableRootsPromise: Promise<BridgeRoot[]> | null = null

async function writableBridgeRoots(): Promise<BridgeRoot[]> {
  if (writableRootsPromise) return writableRootsPromise
  writableRootsPromise = (async () => {
    const fm = Scripting.FileManager
    const canonical = bridgeRootCandidates().find(root => root.type === "safariBrowserStorageDirectory")
    if (!canonical) throw new Error("Scripting.FileManager 未提供 safariBrowserStorageDirectory。")
    const directory = `${canonical.path}/${BRIDGE_DIRECTORY}`
    const probe = `${directory}/.bridge-probe-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`
    await fm.createDirectory(directory, true)
    await fm.writeAsString(probe, "ok")
    if (!await fm.exists(probe)) throw new Error("官方 Safari Browser Storage Directory 写入探针后文件不存在")
    await fm.readAsString(probe)
    await fm.remove(probe)
    return [canonical]
  })()
  return writableRootsPromise
}

function rootDiagnostics(roots: BridgeRoot[]) {
  return roots.map(root => ({ root: root.type, rootHash: stableHash(root.path), basename: rootBasename(root.path) }))
}

async function writeBridgeFile(file: string, payload: unknown) {
  const roots = await writableBridgeRoots()
  const text = JSON.stringify(payload)
  const failures: string[] = []
  const verified: BridgeRoot[] = []
  for (const root of roots) {
    try {
      const directory = `${root.path}/${BRIDGE_DIRECTORY}`
      const path = `${directory}/${file}`
      await Scripting.FileManager.createDirectory(directory, true)
      await Scripting.FileManager.writeAsString(path, text)
      if (!await Scripting.FileManager.exists(path)) throw new Error("写入后文件不存在")
      await Scripting.FileManager.readAsString(path)
      verified.push(root)
    } catch (error) {
      failures.push(`${root.type}: ${errorSummary(error)}`)
    }
  }
  const canonical = verified.find(root => root.type === "safariBrowserStorageDirectory")
  if (!canonical) throw new Error(`官方 Safari Browser Storage Directory 写入或读回验证失败。${failures.join(" | ")}`)
  return { roots: verified, canonical }
}

async function writeStatus(input: Record<string, unknown>) {
  const candidates = bridgeRootCandidates()
  const result = await writeBridgeFile(STATUS_FILE, {
    time: new Date().toISOString(),
    host: location.hostname,
    href: `${location.origin}${location.pathname}`,
    storageCandidates: rootDiagnostics(candidates),
    ...input,
  })
  return { ...result, storageRoots: rootDiagnostics(result.roots), storageRootHash: stableHash(result.canonical.path) }
}

function setBadge(text: string, background: string) {
  const existing = document.getElementById("scripting-eh-login-bridge") as HTMLDivElement | null
  const badge = existing || document.createElement("div")
  if (!existing) {
    badge.id = "scripting-eh-login-bridge"
    Object.assign(badge.style, {
      position: "fixed",
      right: "12px",
      bottom: "12px",
      zIndex: "2147483647",
      maxWidth: "min(620px, calc(100vw - 24px))",
      padding: "8px 12px",
      borderRadius: "10px",
      color: "white",
      fontSize: "13px",
      lineHeight: "1.35",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      boxShadow: "0 2px 10px rgba(0,0,0,.22)",
      pointerEvents: "none",
      whiteSpace: "normal",
      overflowWrap: "anywhere",
    })
    document.documentElement.appendChild(badge)
  }
  badge.textContent = text
  badge.style.background = background
}

function targetDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return location.hostname
  }
}

function parseDocumentCookies() {
  return String(document.cookie || "")
    .split(";")
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const index = part.indexOf("=")
      if (index <= 0) return null
      return normalizeCookie({
        name: part.slice(0, index).trim(),
        value: part.slice(index + 1),
        domain: location.hostname,
        path: "/",
      })
    })
    .filter(Boolean) as ReturnType<typeof normalizeCookie>[]
}

async function collectAuthCookies() {
  const captured = new Map<string, ReturnType<typeof normalizeCookie>>()
  const observedNames = new Set<string>()
  const readErrors: string[] = []

  const addCookies = (cookies: any[], fallbackDomain = location.hostname) => {
    for (const raw of cookies || []) {
      const cookie = normalizeCookie(raw, fallbackDomain)
      if (!cookie.name) continue
      observedNames.add(cookie.name)
      if (!CAPTURE_COOKIE_NAMES.has(cookie.name) || !cookie.value) continue
      captured.set(`${cookie.name}|${cookie.domain}|${cookie.path}`, cookie)
    }
  }

  // 非 HttpOnly Cookie 可以从 document.cookie 直接读取；这也是 Safari 扩展
  // Cookie API 行为异常时的第一层兜底。
  addCookies(parseDocumentCookies(), location.hostname)

  const urls = [...new Set([location.href, ...TARGETS])]
  for (const url of urls) {
    const domain = targetDomain(url)
    try {
      addCookies(await GM.cookie.list({ url }), domain)
    } catch (error) {
      readErrors.push(`${domain}:all:${errorSummary(error)}`)
    }

    // 某些 Cookie API 对“列出全部”与“按名称查询”的结果不完全一致；
    // 对核心 Cookie 再逐个查询一次。
    for (const name of CAPTURE_COOKIE_NAMES) {
      try {
        addCookies(await GM.cookie.list({ url, name }), domain)
      } catch (error) {
        readErrors.push(`${domain}:${name}:${errorSummary(error)}`)
      }
    }
  }

  return {
    cookies: [...captured.values()],
    observedNames: [...observedNames].sort(),
    readErrors,
  }
}

function loginState(cookies: Array<{ name: string }>) {
  const names = new Set(cookies.map(cookie => cookie.name))
  return {
    names,
    complete: [...REQUIRED_COOKIE_NAMES].every(name => names.has(name)),
  }
}

function forumPageShowsLoggedIn(): boolean {
  if (location.hostname !== "forums.e-hentai.org") return false
  const text = String(document.body?.innerText || document.body?.textContent || "")
  return /Logged\s+in\s+as\s*:/i.test(text) || /\bLog\s*Out\b/i.test(text)
}

async function writeLogin(cookies: any[]) {
  return writeBridgeFile(LOGIN_FILE, {
    time: new Date().toISOString(),
    source: location.hostname,
    cookies,
  })
}

async function writeGmStorageProbe() {
  const nonce = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  await (GM as any).setValue("ehentai_bridge_probe", { time: new Date().toISOString(), nonce })
  return nonce
}

async function runBridge() {
  setBadge("Scripting 登录桥已运行 · 0.2.8", "rgba(35, 105, 210, 0.92)")
  try {
    const roots = await writableBridgeRoots()
    const gmStorageNonce = await writeGmStorageProbe()
    await writeStatus({ phase: "running", version: "0.2.8", writableRootCount: roots.length, gmStorageNonce })

    const captured = await collectAuthCookies()
    const state = loginState(captured.cookies)
    const cookieNames = [...state.names]

    if (!state.complete && forumPageShowsLoggedIn()) {
      await writeStatus({
        phase: "propagating-to-gallery",
        version: "0.2.8",
        cookieNames,
        observedCookieNames: captured.observedNames,
        cookieReadErrorCount: captured.readErrors.length,
        hasMemberId: state.names.has("ipb_member_id"),
        hasPassHash: state.names.has("ipb_pass_hash"),
        hasIgneous: state.names.has("igneous"),
        writableRootCount: roots.length,
      })
      setBadge("论坛已登录 · 正在跳转 E-Hentai 主站同步 Cookie…", "rgba(210, 130, 20, 0.94)")
      setTimeout(() => location.assign(E_BASE), 900)
      return
    }

    if (!state.complete) {
      await writeStatus({
        phase: "waiting-cookie",
        version: "0.2.8",
        cookieNames,
        observedCookieNames: captured.observedNames,
        cookieReadErrorCount: captured.readErrors.length,
        cookieReadErrors: captured.readErrors.slice(0, 8),
        hasMemberId: state.names.has("ipb_member_id"),
        hasPassHash: state.names.has("ipb_pass_hash"),
        hasIgneous: state.names.has("igneous"),
        writableRootCount: roots.length,
      })
      const seen = captured.observedNames.length ? captured.observedNames.slice(0, 8).join(", ") : "无"
      setBadge(`等待登录 Cookie · 当前可见 Cookie：${seen}`, "rgba(210, 130, 20, 0.94)")
      return
    }

    const loginWrite = await writeLogin(captured.cookies)
    const capturedStatus = await writeStatus({
      phase: "captured",
      version: "0.2.8",
      cookieNames,
      observedCookieNames: captured.observedNames,
      cookieReadErrorCount: captured.readErrors.length,
      hasMemberId: true,
      hasPassHash: true,
      hasIgneous: state.names.has("igneous"),
      writableRootCount: roots.length,
      storageRoots: rootDiagnostics(loginWrite.roots),
      storageRootHash: stableHash(loginWrite.canonical.path),
      storageRootBasename: rootBasename(loginWrite.canonical.path),
      gmStorageNonce,
    })
    const storageRootHash = capturedStatus.storageRootHash
    setBadge(
      `${state.names.has("igneous") ? "✓ Scripting 已捕获 E-Hentai + ExHentai 登录状态" : "✓ Scripting 已捕获 E-Hentai 登录状态"} · storageRootHash=${storageRootHash}`,
      "rgba(20, 130, 70, 0.94)",
    )
    GM.log("E-Hentai login captured", cookieNames)
  } catch (error) {
    const summary = errorSummary(error)
    try {
      await writeStatus({
        phase: "error",
        version: "0.2.8",
        errorMessage: summary,
      })
    } catch {
      // 如果共享目录本身不可写，页面上的错误详情就是最终诊断渠道。
    }
    setBadge(`Scripting 登录桥失败 · ${summary}`.slice(0, 520), "rgba(190, 45, 45, 0.96)")
    GM.log("E-Hentai login bridge failed", error)
  }
}

void runBridge()
