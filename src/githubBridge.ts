import { Script } from "scripting"

const fileManager: any = (globalThis as any).FileManager
const scriptDirectory: string = (Script as any).directory
const REPO = { owner: "tudoutematou", repo: "scripting-ehentai" }
const SOURCE_ROOT = "src"
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".json"]
const EXCLUDED_SEGMENTS = new Set([".git", "node_modules", "tests", "runtime", "bridge"])

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

function isBusinessSource(relativePath: string) {
  const parts = relativePath.split("/")
  return !parts.some(part => EXCLUDED_SEGMENTS.has(part) || part.startsWith("."))
    && SOURCE_EXTENSIONS.some(extension => relativePath.endsWith(extension))
}

function safeRequestUrl(value?: string) {
  if (!value) return ""
  try {
    const url = new URL(value)
    return `${url.protocol}//${url.hostname}/[redacted]`
  } catch {
    return ""
  }
}

function safeText(value?: unknown) {
  return String(value || "")
    .replace(/https?:\/\/[^\s"')]+/gi, "[redacted-url]")
    .replace(/\b(?:ipb_member_id|ipb_pass_hash|igneous|Cookie)\s*[=:]\s*[^;\s,]+/gi, "$1=[redacted]")
    .slice(0, 500)
}

function safeError(error: unknown) {
  if (!error) return undefined
  const value = error as { name?: unknown; message?: unknown; stack?: unknown }
  return {
    name: safeText(value.name || "Error"),
    message: safeText(value.message || error),
    stack: safeText(value.stack || "").slice(0, 1200),
  }
}

export function sanitizeDiagnostic(input: DiagnosticInput) {
  return {
    time: new Date().toISOString(),
    stage: safeText(input.stage),
    ok: Boolean(input.ok),
    error: safeError(input.error),
    request: { host: safeRequestUrl(input.request?.url), status: Number(input.request?.status || 0), statusText: safeText(input.request?.statusText) },
    notes: safeText(input.notes),
  }
}

export async function reportDiagnostic(input: DiagnosticInput) {
  const payload = sanitizeDiagnostic(input)
  // 诊断只保留在本机控制台：绝不将搜索词、画廊 URL、token 或 Cookie 上传至仓库。
  console.log("[ehentai diagnostic]", JSON.stringify(payload))
  return payload
}

async function listLocalSource(relativeDirectory = ""): Promise<string[]> {
  const absoluteDirectory = joinPath(scriptDirectory, relativeDirectory)
  const entries = await fileManager.readDirectory(absoluteDirectory)
  const files: string[] = []
  for (const entry of entries) {
    const relativePath = joinPath(relativeDirectory, entry.split("/").pop() || entry)
    const absolutePath = joinPath(scriptDirectory, relativePath)
    if (await fileManager.isDirectory(absolutePath)) {
      if (isBusinessSource(`${relativePath}/placeholder.ts`)) files.push(...await listLocalSource(relativePath))
    } else if (await fileManager.isFile(absolutePath) && !await fileManager.isBinaryFile(absolutePath) && isBusinessSource(relativePath)) files.push(relativePath)
  }
  return files.sort()
}

async function getRemoteSha(branch: string, path: string): Promise<string | undefined> {
  try {
    const content = await GitHub.getContent({ ...REPO, path, ref: branch }) as { sha?: string }
    return content.sha
  } catch (error) {
    if (/404|not found/i.test(String((error as Error)?.message || error))) return undefined
    throw error
  }
}

async function putTextContent(branch: string, path: string, message: string, content: string) {
  if (!branch || branch === "main") throw new Error("源码同步必须显式指定非 main 的临时分支。")
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await GitHub.putContent({ ...REPO, path, message, content, sha: await getRemoteSha(branch, path), branch })
    } catch (error) {
      if (attempt || !/409|does not match.*sha/i.test(String((error as Error)?.message || error))) throw error
    }
  }
}

export async function ensureGitHubPermissions() {
  if (!GitHub.isAvailable()) throw new Error("GitHub API 不可用。")
  const required = ["read_contents", "write_contents"] as const
  const allowed = await GitHub.requestPermissions([...required])
  const missing = required.filter(permission => !allowed.includes(permission))
  if (missing.length) throw new Error(`GitHub API 权限未授予：${missing.join(", ")}`)
  return allowed
}

export async function readSetupRules(branch: string) {
  if (!branch || branch === "main") throw new Error("读取同步规则必须显式指定非 main 的临时分支。")
  await ensureGitHubPermissions()
  return GitHub.getTextContent({ ...REPO, path: "bridge/SCRIPTING_SETUP.md", ref: branch })
}

/** 仅供明确指定的临时分支使用；生产入口不调用此函数。 */
export async function pushSourceToGitHub(branch: string) {
  if (!branch || branch === "main") throw new Error("源码同步必须显式指定非 main 的临时分支。")
  await ensureGitHubPermissions()
  const files = await listLocalSource()
  for (const relativePath of files) {
    const content = await fileManager.readAsString(joinPath(scriptDirectory, relativePath))
    await putTextContent(branch, joinPath(SOURCE_ROOT, relativePath), `sync: ${relativePath}`, content)
  }
  return files
}

export async function pullSourceFromGitHub() {
  await ensureGitHubPermissions()
  throw new Error("稳定化分支禁止在运行时覆盖本地源码；请通过技术负责人审核后的版本更新。")
}
