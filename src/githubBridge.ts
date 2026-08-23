import { Script } from "scripting"

const fileManager: any = (globalThis as any).FileManager
const scriptDirectory: string = (Script as any).directory
const REPO = { owner: "tudoutematou", repo: "scripting-ehentai", branch: "fix/0.2.9-stabilization" }
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
  const value = error as { name?: unknown; message?: unknown }
  return { name: safeText(value.name || "Error"), message: safeText(value.message || error) }
}

export async function reportDiagnostic(input: DiagnosticInput) {
  const payload = {
    time: new Date().toISOString(),
    stage: safeText(input.stage),
    ok: Boolean(input.ok),
    error: safeError(input.error),
    request: { host: safeRequestUrl(input.request?.url), status: Number(input.request?.status || 0), statusText: safeText(input.request?.statusText) },
    notes: safeText(input.notes),
  }
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

async function getRemoteSha(path: string): Promise<string | undefined> {
  try {
    const content = await GitHub.getContent({ ...REPO, path, ref: REPO.branch }) as { sha?: string }
    return content.sha
  } catch (error) {
    if (/404|not found/i.test(String((error as Error)?.message || error))) return undefined
    throw error
  }
}

async function putTextContent(path: string, message: string, content: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await GitHub.putContent({ ...REPO, path, message, content, sha: await getRemoteSha(path), branch: REPO.branch })
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

export async function readSetupRules() {
  await ensureGitHubPermissions()
  return GitHub.getTextContent({ ...REPO, path: "bridge/SCRIPTING_SETUP.md", ref: REPO.branch })
}

export async function pushSourceToGitHub() {
  await ensureGitHubPermissions()
  const files = await listLocalSource()
  for (const relativePath of files) {
    const content = await fileManager.readAsString(joinPath(scriptDirectory, relativePath))
    await putTextContent(joinPath(SOURCE_ROOT, relativePath), `sync: ${relativePath}`, content)
  }
  return files
}

export async function pullSourceFromGitHub() {
  await ensureGitHubPermissions()
  throw new Error("稳定化分支禁止在运行时覆盖本地源码；请通过技术负责人审核后的版本更新。")
}
