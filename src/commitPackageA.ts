import { Script } from "scripting"

const owner = "tudoutematou"
const repo = "scripting-ehentai"
const branch = "feat/0.8-ui-ux-consolidation"
const fileManager: any = (globalThis as any).FileManager
const root = (Script as any).directory as string
const join = (...parts: string[]) => parts.filter(Boolean).join("/")

async function put(path: string, message: string, content: string) {
  const remote = await GitHub.getContent({ owner, repo, path, ref: branch }) as { sha: string }
  return GitHub.putContent({ owner, repo, path, message, content, sha: remote.sha, branch })
}

async function main() {
  const allowed = await GitHub.requestPermissions(["read_contents", "write_contents"])
  if (!allowed.includes("read_contents") || !allowed.includes("write_contents")) throw new Error("GitHub 读写权限未授予")
  const source = await fileManager.readAsString(join(root, "GalleryFlow.tsx"))
  const sourceResult = await put("src/GalleryFlow.tsx", "ui: consolidate home navigation", source)
  const progress = `# DEV_PROGRESS — 0.8 UI/UX Consolidation\n\nStart base: accepted 0.7 head \`74660b5138458b09d89947254108bd8121b60701\`\nTask commit: \`a263d5bc5c19f50e505ec5b7f4bf58fc7a1e16ad\`\nBranch: \`feat/0.8-ui-ux-consolidation\`\n\n## Current phase\nPackage A — App navigation + Home complete.\n\n## Completed\n- Home reorganized by user intent: search/browse, quick discovery, personal content, category browsing, latest galleries, and low-frequency external destinations.\n- Account/login and My Home overview moved off the Home top-level into \`账号与设置\`; Home now links to that scene and the Library.\n- Reused existing NavigationStack/List/Section/NavigationLink and current scenes; no tab bar, dependency, network/parser/store change.\n\n## Verification\n- \`src/runSelfTests.ts\`: passed (29 items).\n- DEV script \`E-Hentai 浏览器 DEV\` launch was invoked; CLI remained attached to the interactive Navigation session until its 45-second timeout, with no startup exception output.\n\n## Preserve\n- All accepted 0.7 feature families and safe storage/network/privacy behavior.\n- Stable local \`E-Hentai 浏览器\` remains untouched.\n- Runtime target is \`E-Hentai 浏览器 DEV\`.\n\n## Accepted PLATFORM_GAP — do not reopen in 0.8\n- Reverse image search upload path/multipart behavior unverified.\n- Rating submission authenticated API/form path unverified.\n- Comment post/edit action + CSRF/edit-ownership path unverified.\n\n## Work order\nA. App navigation + Home — completed\nB. Gallery lists + Search/Filter — next\nC. Gallery Detail\nD. Library\nE. Downloads/offline\nF. Reader\nG. Account/Settings/maintenance\nH. UI copy/state/consistency sweep\n\n## Next step\nBegin Package B. Reuse the current \`GalleryRow\`, \`StateView\`, native List/Section controls and existing search state; do not add search parameters or rewrite core architecture.\n`
  const progressResult = await put("DEV_PROGRESS.md", "chore: checkpoint package A", progress)
  console.log(JSON.stringify({ sourceCommit: sourceResult.commit?.sha, progressCommit: progressResult.commit?.sha }, null, 2))
}
main().catch(console.error).finally(() => Script.exit())
