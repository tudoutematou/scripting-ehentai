import { Script } from "scripting"
import { runEhAction } from "./ehAction"

void runEhAction({ type: "search", query: "test" }).then(result => {
  const payload: any = result
  console.log(JSON.stringify({ success: result.ok, type: payload.type, itemCount: payload.items?.length || 0, first: payload.items?.[0] }))
  if (!result.ok || payload.type !== "search" || !payload.items?.length || /https?:|\/g\/|token/i.test(JSON.stringify(payload))) throw new Error("Assistant Tool smoke failed")
}).catch(error => { console.error(error); throw error }).finally(() => Script.exit())
