import { Script } from "scripting"

const owner = "tudoutematou"
const repo = "scripting-ehentai"
const branch = "feat/1.1-gallery-interaction"
let sourceRef = branch
const root = "src"
const fileManager: any = (globalThis as any).FileManager
const scriptDirectory = (Script as any).directory as string
const extensions = [".ts", ".tsx", ".json"]
const excluded = new Set([".git", "node_modules", "runtime", "bridge", "tests"])

const join = (...parts: string[]) => parts.filter(Boolean).join("/").replace(/\/{2,}/g, "/")
const businessFile = (relative: string) => !relative.split("/").some(part => excluded.has(part) || part.startsWith(".")) && extensions.some(extension => relative.endsWith(extension))

async function list(relative = ""): Promise<string[]> {
  const path = join(root, relative)
  const entries = await GitHub.getContent({ owner, repo, path, ref: sourceRef }) as Record<string, any>[]
  const files: string[] = []
  for (const entry of entries) {
    const next = join(relative, String(entry.name || ""))
    if (entry.type === "dir" && !excluded.has(String(entry.name))) files.push(...await list(next))
    else if (entry.type === "file" && businessFile(next)) files.push(next)
  }
  return files
}

async function main() {
  const head = await GitHub.getBranch({ owner, repo, branch })
  const commit = String((head as any).commit?.sha || "")
  if (!commit) throw new Error(`无法解析 ${branch} 的远端 head`)
  sourceRef = commit
  const files = await list()
  const snapshot = await Promise.all(files.map(async relativePath => ({
    relativePath,
    text: String((await GitHub.getTextContent({ owner, repo, path: join(root, relativePath), ref: sourceRef })).text || ""),
  })))
  for (const item of snapshot) {
    const destination = join(scriptDirectory, item.relativePath)
    const parent = destination.split("/").slice(0, -1).join("/")
    if (parent) await fileManager.createDirectory(parent, true)
    await fileManager.writeAsString(destination, item.text)
  }
  const manifest = { version: "1.1.0-dev", branch, commit, syncedAt: new Date().toISOString(), fileCount: snapshot.length }
  await fileManager.writeAsString(join(scriptDirectory, "sync-manifest.json"), JSON.stringify(manifest, null, 2))
  console.log(JSON.stringify({ ...manifest, files: snapshot.map(item => item.relativePath) }, null, 2))
}
main().catch(console.error).finally(() => Script.exit())
