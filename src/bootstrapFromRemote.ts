import { Script } from "scripting"

const owner = "tudoutematou"
const repo = "scripting-ehentai"
const branch = "feat/0.9-stabilization"
const root = "src"
const fileManager: any = (globalThis as any).FileManager
const scriptDirectory = (Script as any).directory as string
const extensions = [".ts", ".tsx", ".json"]
const excluded = new Set([".git", "node_modules", "runtime", "bridge", "tests"])

const join = (...parts: string[]) => parts.filter(Boolean).join("/").replace(/\/{2,}/g, "/")
const businessFile = (relative: string) => !relative.split("/").some(part => excluded.has(part) || part.startsWith(".")) && extensions.some(extension => relative.endsWith(extension))

async function list(relative = ""): Promise<string[]> {
  const path = join(root, relative)
  const entries = await GitHub.getContent({ owner, repo, path, ref: branch }) as Record<string, any>[]
  const files: string[] = []
  for (const entry of entries) {
    const next = join(relative, String(entry.name || ""))
    if (entry.type === "dir" && !excluded.has(String(entry.name))) files.push(...await list(next))
    else if (entry.type === "file" && businessFile(next)) files.push(next)
  }
  return files
}

async function main() {
  const files = await list()
  const snapshot = await Promise.all(files.map(async relativePath => ({
    relativePath,
    text: String((await GitHub.getTextContent({ owner, repo, path: join(root, relativePath), ref: branch })).text || ""),
  })))
  for (const item of snapshot) {
    const destination = join(scriptDirectory, item.relativePath)
    const parent = destination.split("/").slice(0, -1).join("/")
    if (parent) await fileManager.createDirectory(parent, true)
    await fileManager.writeAsString(destination, item.text)
  }
  console.log(JSON.stringify({ branch, fileCount: snapshot.length, files: snapshot.map(item => item.relativePath) }, null, 2))
}
main().catch(console.error).finally(() => Script.exit())
