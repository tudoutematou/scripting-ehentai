import { Script } from "scripting"

const fileManager: any = (globalThis as any).FileManager
const scriptDirectory: string = (Script as any).directory

const REPO = { owner: "tudoutematou", repo: "scripting-ehentai", branch: "main" }
const SOURCE_ROOT = "src"
const DIAGNOSTIC_PATH = "runtime/latest.json"
const DIAGNOSTIC_EVENTS_ROOT = "runtime/events"
const SCRIPT_VERSION = "0.1.8"
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".json"]
const EXCLUDED_SEGMENTS = new Set([".git", "node_modules", "tests", "runtime", "bridge"])

let diagnosticQueue: Promise<void> = Promise.resolve()

export type DiagnosticInput = {
  stage: string
  ok: boolean
  error?: unknown
  request?: { url?: string; status?: number; statusText?: string }
  notes?: string
}

function joinPath(...parts: string[]) {
  return parts.filter(Boolean).join("/").replace(/\/+/g, "/")
}

function errorData(error: unknown) {
  if (!error) return undefined
  const value = error as { name?: unknown; message?: unknown; stack?: unknown }
  return {
    name: String(value.name || "Error"),
    message: String(value.message || error),
    stack: String(value.stack || ""),
  }
}

function safeRequestUrl(value?: string) {
  if (!value) return ""
  try {
    const url = new URL(value)
    if (url.searchParams.has("f_search")) {
      url.searchParams.set("f_search", url.searchParams.get("f_search") === "naruto" ? "naruto" : "[redacted]")
    }
    return url.toString()
  } catch {
    return ""
  }
}

function isBusinessSource(relativePath: string) {
  const parts = relativePath.split("/")
  if (parts.some(part => EXCLUDED_SEGMENTS.has(part) || part.startsWith("."))) return false
  return SOURCE_EXTENSIONS.some(extension => relativePath.endsWith(extension))
}

async function listLocalSource(relativeDirectory = ""): Promise<string[]> {
  const absoluteDirectory = joinPath(scriptDirectory, relativeDirectory)
  const entries = await fileManager.readDirectory(absoluteDirectory)
  const files: string[] = []
  for (const entry of entries) {
    const relativePath = joinPath(relativeDirectory, entry.split("/").pop() || entry)
    const absolutePath = joinPath(scriptDirectory, relativePath)
    if (await fileManager.isDirectory(absolutePath)) {
      if (!relativePath.split("/").some(part => EXCLUDED_SEGMENTS.has(part) || part.startsWith("."))) {
        files.push(...await listLocalSource(relativePath))
      }
    } else if (await fileManager.isFile(absolutePath) && !await fileManager.isBinaryFile(absolutePath) && isBusinessSource(relativePath)) {
      files.push(relativePath)
    }
  }
  return files
}

async function getRemoteSha(path: string): Promise<string | undefined> {
  try {
    const content = await GitHub.getContent({ ...REPO, path, ref: REPO.branch }) as Record<string, any>
    return typeof content.sha === "string" ? content.sha : undefined
  } catch (error) {
    const message = String((error as Error)?.message || error)
    if (/404|not found/i.test(message)) return undefined
    throw error
  }
}

function isShaConflict(error: unknown) {
  const value = error as { status?: unknown; message?: unknown }
  return Number(value?.status) === 409 || /\b409\b|does not match.*sha/i.test(String(value?.message || error))
}

async function putTextContent(path: string, message: string, content: string) {
  const put = async () => {
    const sha = await getRemoteSha(path)
    return GitHub.putContent({ ...REPO, path, message, content, sha, branch: REPO.branch })
  }
  try {
    return await put()
  } catch (error) {
    if (!isShaConflict(error)) throw error
    return put()
  }
}

function diagnosticEventPath(stage: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const safeStage = String(stage || "unknown").replace(/[^a-z0-9_-]+/gi, "-")
  const random = Math.random().toString(36).slice(2, 8)
  return `${DIAGNOSTIC_EVENTS_ROOT}/${timestamp}-${safeStage}-${random}.json`
}

async function putDiagnosticEvent(path: string, message: string, content: string) {
  return GitHub.putContent({
    owner: REPO.owner,
    repo: REPO.repo,
    path,
    message,
    content,
  })
}

async function listRemoteSource(relativeDirectory = ""): Promise<string[]> {
  const path = joinPath(SOURCE_ROOT, relativeDirectory)
  let entries: Record<string, any> | Record<string, any>[]
  try {
    entries = await GitHub.getContent({ ...REPO, path, ref: REPO.branch })
  } catch (error) {
    if (/404|not found/i.test(String((error as Error)?.message || error))) return []
    throw error
  }
  if (!Array.isArray(entries)) return []
  const files: string[] = []
  for (const entry of entries) {
    const relativePath = joinPath(relativeDirectory, String(entry.name || ""))
    if (entry.type === "dir") {
      files.push(...await listRemoteSource(relativePath))
    } else if (entry.type === "file" && isBusinessSource(relativePath)) {
      files.push(relativePath)
    }
  }
  return files
}

function compareVersion(a: string, b: string): number {
  const pa = String(a || "0").split(".").map(value => Number(value.replace(/\D.*$/, "")) || 0)
  const pb = String(b || "0").split(".").map(value => Number(value.replace(/\D.*$/, "")) || 0)
  const length = Math.max(pa.length, pb.length)
  for (let i = 0; i < length; i += 1) {
    const av = pa[i] || 0
    const bv = pb[i] || 0
    if (av > bv) return 1
    if (av < bv) return -1
  }
  return 0
}

async function localScriptVersion(): Promise<string> {
  try {
    const raw = await fileManager.readAsString(joinPath(scriptDirectory, "script.json"))
    return String(JSON.parse(raw)?.version || "0.0.0")
  } catch {
    return "0.0.0"
  }
}

async function remoteScriptVersion(): Promise<string> {
  try {
    const remote = await GitHub.getTextContent({ ...REPO, path: `${SOURCE_ROOT}/script.json`, ref: REPO.branch })
    return String(JSON.parse(remote.text)?.version || "0.0.0")
  } catch (error) {
    if (/404|not found/i.test(String((error as Error)?.message || error))) return "0.0.0"
    throw error
  }
}

export async function ensureGitHubPermissions() {
  if (!GitHub.isAvailable()) {
    throw new Error("GitHub 不可用：请确认 Scripting PRO 已启用且已在设置中配置 GitHub Token。")
  }
  const requested = ["read_contents", "write_contents", "read_issues", "write_issues"] as const
  const allowed = await GitHub.requestPermissions([...requested])
  const missing = requested.filter(permission => !allowed.includes(permission))
  if (missing.length) throw new Error(`GitHub 权限未授予：${missing.join(", ")}`)
  return allowed
}

export async function readSetupRules() {
  await ensureGitHubPermissions()
  return GitHub.getTextContent({ ...REPO, path: "bridge/SCRIPTING_SETUP.md", ref: REPO.branch })
}

export async function reportDiagnostic(input: DiagnosticInput) {
  const payload = {
    time: new Date().toISOString(),
    scriptVersion: SCRIPT_VERSION,
    stage: input.stage,
    ok: input.ok,
    error: errorData(input.error),
    request: {
      url: safeRequestUrl(input.request?.url),
      status: Number(input.request?.status || 0),
      statusText: String(input.request?.statusText || ""),
    },
    notes: String(input.notes || ""),
  }
  const content = JSON.stringify(payload, null, 2)
  const task = diagnosticQueue.then(async () => {
    const message = `runtime: ${payload.stage} ${payload.ok ? "ok" : "failed"}`

    await putDiagnosticEvent(diagnosticEventPath(payload.stage), message, content)

    try {
      await putTextContent(DIAGNOSTIC_PATH, message, content)
    } catch {
      // latest 只是便捷镜像；事件文件才是联调权威记录。
    }
  })
  diagnosticQueue = task.then(() => undefined, () => undefined)
  await task
  return payload
}

export async function pushSourceToGitHub() {
  await ensureGitHubPermissions()

  const [localVersion, remoteVersion] = await Promise.all([
    localScriptVersion(),
    remoteScriptVersion(),
  ])
  if (compareVersion(localVersion, remoteVersion) < 0) {
    throw new Error(`拒绝推送：本地版本 ${localVersion} 低于 GitHub ${remoteVersion}。请先“从 GitHub 拉取源码”，重新运行后再推送。`)
  }

  const files = await listLocalSource()
  for (const relativePath of files) {
    const content = await fileManager.readAsString(joinPath(scriptDirectory, relativePath))
    const path = joinPath(SOURCE_ROOT, relativePath)
    await putTextContent(path, `sync: ${relativePath}`, content)
  }
  return files
}

export async function pullSourceFromGitHub() {
  await ensureGitHubPermissions()
  const files = await listRemoteSource()
  for (const relativePath of files) {
    const remote = await GitHub.getTextContent({ ...REPO, path: joinPath(SOURCE_ROOT, relativePath), ref: REPO.branch })
    const localPath = joinPath(scriptDirectory, relativePath)
    const parent = localPath.split("/").slice(0, -1).join("/")
    if (parent) await fileManager.createDirectory(parent, true)
    await fileManager.writeAsString(localPath, remote.text)
  }
  return files
}
