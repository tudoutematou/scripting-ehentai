import { Script } from "scripting"
import { executeSearchTool } from "../assistant_tool"

void executeSearchTool({ query: "test" }).then(result => {
  const payload = JSON.parse(result.message)
  console.log(JSON.stringify({ success: result.success, type: payload.type, itemCount: payload.items?.length || 0, first: payload.items?.[0] }))
  if (!result.success || payload.type !== "search" || !payload.items?.length || /https?:|\/g\/|token/i.test(result.message)) throw new Error("Assistant Tool smoke failed")
}).catch(error => { console.error(error); throw error }).finally(() => Script.exit())
