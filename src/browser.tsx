// ==UserScript==
// @name E-Hentai Login Bridge
// @namespace scripting-ehentai
// @version 0.2.3
// @description Capture E-Hentai login cookies from real Safari for the Scripting app.
// @match https://forums.e-hentai.org/*
// @match https://e-hentai.org/*
// @match https://exhentai.org/*
// @grant GM.cookie
// @grant GM.log
// @grant Scripting.FileManager
// @connect forums.e-hentai.org
// @connect e-hentai.org
// @connect exhentai.org
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

function bridgeRoot(): string {
  const fm = Scripting.FileManager
  return String(fm.safariBrowserDirectory || fm.appGroupDocumentsDirectory || fm.documentsDirectory)
}

function bridgePath(file: string): string {
  return `${bridgeRoot()}/${BRIDGE_DIRECTORY}/${file}`
}

async function ensureBridgeDirectory() {
  await Scripting.FileManager.createDirectory(`${bridgeRoot()}/${BRIDGE_DIRECTORY}`, true)
}

async function writeStatus(input: Record<string, unknown>) {
  await ensureBridgeDirectory()
  await Scripting.FileManager.writeAsString(
    bridgePath(STATUS_FILE),
    JSON.stringify({
      time: new Date().toISOString(),
      host: location.hostname,
      href: `${location.origin}${location.pathname}`,
      ...input,
    }),
  )
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
      padding: "8px 12px",
      borderRadius: "10px",
      color: "white",
      fontSize: "13px",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      boxShadow: "0 2px 10px rgba(0,0,0,.22)",
      pointerEvents: "none",
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
  await ensureBridgeDirectory()
  await Scripting.FileManager.writeAsString(bridgePath(LOGIN_FILE), JSON.stringify({
    time: new Date().toISOString(),
    source: location.hostname,
    cookies,
  }))
}

async function runBridge() {
  setBadge("Scripting 登录桥已运行", "rgba(35, 105, 210, 0.92)")
  try {
    await writeStatus({ phase: "running", version: "0.2.3" })
    const cookies = await collectAuthCookies()
    const state = loginState(cookies)
    const cookieNames = [...state.names]

    if (!state.complete) {
      await writeStatus({
        phase: "waiting-cookie",
        version: "0.2.3",
        cookieNames,
        hasMemberId: state.names.has("ipb_member_id"),
        hasPassHash: state.names.has("ipb_pass_hash"),
        hasIgneous: state.names.has("igneous"),
      })
      setBadge("Scripting 登录桥已运行 · 等待登录 Cookie", "rgba(210, 130, 20, 0.94)")
      return
    }

    await writeLogin(cookies)
    await writeStatus({
      phase: "captured",
      version: "0.2.3",
      cookieNames,
      hasMemberId: true,
      hasPassHash: true,
      hasIgneous: state.names.has("igneous"),
    })
    setBadge("✓ Scripting 已捕获登录状态", "rgba(20, 130, 70, 0.94)")
    GM.log("E-Hentai login captured", cookieNames)
  } catch (error) {
    const value = error as { code?: unknown; message?: unknown }
    try {
      await writeStatus({
        phase: "error",
        version: "0.2.3",
        errorCode: String(value?.code || ""),
        errorMessage: String(value?.message || error),
      })
    } catch {
      // 状态文件自身写入失败时只保留页面提示。
    }
    setBadge("Scripting 登录桥运行失败", "rgba(190, 45, 45, 0.94)")
    GM.log("E-Hentai login bridge failed", error)
  }
}

void runBridge()
