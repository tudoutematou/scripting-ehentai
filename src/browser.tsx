// ==UserScript==
// @name E-Hentai Login Bridge
// @namespace scripting-ehentai
// @version 0.2.1
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

async function collectAuthCookies() {
  const map = new Map<string, ReturnType<typeof normalizeCookie>>()
  for (const url of TARGETS) {
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

function hasLogin(cookies: Array<{ name: string }>) {
  const names = new Set(cookies.map(cookie => cookie.name))
  return names.has("ipb_member_id") && names.has("ipb_pass_hash")
}

function showCapturedBadge() {
  if (document.getElementById("scripting-eh-login-bridge")) return
  const badge = document.createElement("div")
  badge.id = "scripting-eh-login-bridge"
  badge.textContent = "✓ Scripting 已捕获登录状态"
  Object.assign(badge.style, {
    position: "fixed",
    right: "12px",
    bottom: "12px",
    zIndex: "2147483647",
    padding: "8px 12px",
    borderRadius: "10px",
    background: "rgba(20, 130, 70, 0.92)",
    color: "white",
    fontSize: "13px",
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    boxShadow: "0 2px 10px rgba(0,0,0,.2)",
  })
  document.documentElement.appendChild(badge)
  setTimeout(() => badge.remove(), 5000)
}

async function writeBridge(cookies: any[]) {
  const fm = Scripting.FileManager
  const root = fm.appGroupDocumentsDirectory ?? fm.documentsDirectory
  const directory = `${root}/ehentai-browser`
  const path = `${directory}/safari-login.json`
  await fm.createDirectory(directory, true)
  await fm.writeAsString(path, JSON.stringify({
    time: new Date().toISOString(),
    source: location.hostname,
    cookies,
  }))
}

async function runBridge() {
  try {
    const cookies = await collectAuthCookies()
    if (!hasLogin(cookies)) return
    await writeBridge(cookies)
    showCapturedBadge()
    GM.log("E-Hentai login captured", cookies.map(cookie => cookie.name))
  } catch (error) {
    GM.log("E-Hentai login bridge failed", error)
  }
}

void runBridge()
