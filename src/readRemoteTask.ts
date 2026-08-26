import { Script } from "scripting"

const owner = "tudoutematou"
const repo = "scripting-ehentai"
const ref = "release/1.0"

async function main() {
  const files = await Promise.all(
    ["AGENTS.md", "CURRENT_TASK.md", "STABILIZATION_AUDIT.md", "DEV_PROGRESS.md"].map(path => GitHub.getTextContent({ owner, repo, path, ref })),
  )
  console.log(JSON.stringify({
    ref,
    files: Object.fromEntries(files.map(file => [file.path, { sha: file.sha, text: file.text }])),
  }, null, 2))
}

main()
  .catch(error => console.error(error))
  .finally(() => Script.exit())
