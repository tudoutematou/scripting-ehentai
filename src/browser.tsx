// ==UserScript==
// @name E-Hentai Login Bridge
// @namespace scripting-ehentai
// @version 0.2.4
// @description Capture E-Hentai login cookies from real Safari for the Scripting app.
// @match https://forums.e-hentai.org/*
// @match https://e-hentai.org/*
// @match https://exhentai.org/*
// @grant GM.cookie
// @grant GM.log
// @grant Scripting.FileManager
// @connect https://forums.e-hentai.org/*
// @connect https://e-hentai.org/*
// @connect https://exhentai.org/*
// @run-at document-idle
// @inject-into content
// @noframes
// ==/UserScript==

const AUTH_COOKIE_NAMES = new Set(["ipb_member_id", "ipb_pass_hash", "igneous"])
const TARGETS = [
  "https://forums.e-hentai.org/",
  "https://e-hentai.org/",
  "https://exhentai.org/",
]
const BRIDGE_DIRECTORY = "ehentai-login-bridge"
const LOGIN_FILE = "login.json"
const STATUS_FILE = "status.json"

function normalizeCookie(raw: any) {
  return {
    name: String(raw?.name || ""),
    value: String(raw?.value || ""),
    domain: String(raw?.domain || ""),
    path: String(raw?.path || "/"),
    secure: Boolean(raw?.secure ?? raw?.isSecure),
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

function bridgeRootCandidates(): string[] {
  const fm = Scripting.FileManager as any
  const values = [
    fm.appGroupDocumentsDirectory,
    fm.safariBrowserDirectory,
    fm.documentsDirectory,
  ]
    .map((value: unknown) => String(value || "").trim())
    .filter(Boolean)
  return [...new Set(values)]
}

let writableRootsPromise: Promise<string[]> | null = null

async function writableBridgeRoots(): Promise<string[]> {
  if (writableRootsPromise) return writableRootsPromise

  writableRootsPromise = (async () => {
    const fm = Scripting.FileManager
    const roots = bridgeRootCandidates()
    if (!roots.length) throw new Error("Scripting.FileManager 没有暴露可写共享目录。")

    const writable: string[] = []
    const failures: string[] = []
    for (const root of roots) {
      const directory = `${root}/${BRIDGE_DIRECTORY}`
      const probe = `${directory}/.bridge-probe-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`
      try {
        await fm.createDirectory(directory, true)
        await fm.writeAsString(probe, "ok")
        if (await fm.exists(probe)) await fm.remove(probe)
        writable.push(root)
      } catch (error) {
        failures.push(`${root}: ${errorSummary(error)}`)
      }
    }

    if (!writable.length) {
      throw new Error(`Safari 登录桥找不到可写共享目录。${failures.join(" | ")}`)
    }
    return writable
  })()

  return writableRootsPromise
}

async function writeBridgeFile(file: string, payload: unknown) {
  const roots = await writableBridgeRoots()
  const text = JSON.stringify(payload)
  const failures: string[] = []
  let success = 0

  for (const root of roots) {
    try {
      const directory = `${root}/${BRIDGE_DIRECTORY}`
      await Scripting.FileManager.createDirectory(directory, true)
      await Scripting.FileManager.writeAsString(`${directory}/${file}`, text)
      success += 1
    } catch (error) {
      failures.push(`${root}: ${errorSummary(error)}`)
    }
  }

  if (!success) throw new Error(`共享文件写入失败。${failures.join(" | ")}`)
}

async function writeStatus(input: Record<string, unknown>) {
  await writeBridgeFile(STATUS_FILE, {
    time: new Date().toISOString(),
    host: location.hostname,
    href: `${location.origin}${location.pathname}`,
    ...input,
  })
}

function setBadge(text: string, background: string) {
  let badge = document.getElementById("scripting-eh-login-bridge") as HTMLDivElement | null
  if (!badge) {
    badge = document.createElement("div")
    badge.id = "scripting-eh-login-bridge"
    Object.assign(badge.style, {
      position: "fixed",
      right: "12px",
      bottom: "12px",
      zIndex: "2147483647",
      maxWidth: "min(560px, calc(100vw - 24px))",
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

async function collectAuthCookies() {
  const map = new Map<string, ReturnType<typeof normalizeCookie>>()
  const urls = [location.href, ...TARGETS]
  for (const url of urls) {
    try {
      const cookies = await GM.cookie.list({ url })
      for (const raw of cookies || []) {
        const cookie = normalizeCookie(raw)
        if (!AUTH_COOKIE_NAMES.has(cookie.name) || !cookie.value) continue
        map.set(`${cookie.name}|${cookie.domain}|${cookie.path}`, cookie)
      }
    } catch (error) {
      GM.log("cookie read failed", url, error)
    }
  }
  return [...map.values()]
}

function loginState(cookies: Array<{ name: string }>) {
  const names = new Set(cookies.map(cookie => cookie.name))
  return {
    names,
    complete: names.has("ipb_member_id") && names.has("ipb_pass_hash"),
  }
}

async function writeLogin(cookies: any[]) {
  await writeBridgeFile(LOGIN_FILE, {
    time: new Date().toISOString(),
    source: location.hostname,
    cookies,
  })
}

async function runBridge() {
  setBadge("Scripting 登录桥已运行 · 0.2.4", "rgba(35, 105, 210, 0.92)")
  try {
    const roots = await writableBridgeRoots()
    await writeStatus({ phase: "running", version: "0.2.4", writableRootCount: roots.length })

    const cookies = await collectAuthCookies()
    const state = loginState(cookies)
    const cookieNames = [...state.names]

    if (!state.complete) {
      await writeStatus({
        phase: "waiting-cookie",
        version: "0.2.4",
        cookieNames,
        hasMemberId: state.names.has("ipb_member_id"),
        hasPassHash: state.names.has("ipb_pass_hash"),
        hasIgneous: state.names.has("igneous"),
        writableRootCount: roots.length,
      })
      setBadge("Scripting 登录桥已运行 · 等待登录 Cookie", "rgba(210, 130, 20, 0.94)")
      return
    }

    await writeLogin(cookies)
    await writeStatus({
      phase: "captured",
      version: "0.2.4",
      cookieNames,
      hasMemberId: true,
      hasPassHash: true,
      hasIgneous: state.names.has("igneous"),
      writableRootCount: roots.length,
    })
    setBadge("✓ Scripting 已捕获登录状态", "rgba(20, 130, 70, 0.94)")
    GM.log("E-Hentai login captured", cookieNames)
  } catch (error) {
    const summary = errorSummary(error)
    try {
      await writeStatus({
        phase: "error",
        version: "0.2.4",
        errorMessage: summary,
      })
    } catch {
      // 如果共享目录本身不可写，页面上的错误详情就是最终诊断渠道。
    }
    setBadge(`Scripting 登录桥失败 · ${summary}`.slice(0, 420), "rgba(190, 45, 45, 0.96)")
    GM.log("E-Hentai login bridge failed", error)
  }
}

void runBridge()
