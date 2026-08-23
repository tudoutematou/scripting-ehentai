import { Script } from "scripting"
import { runEhAction } from "./ehAction"

Promise.all([
  runEhAction({ type: "account.status" }),
  runEhAction({ type: "gallery.detail", url: "https://example.com/g/1/token/" }),
]).then(results => {
  console.log(JSON.stringify(results))
  if (!results[0].ok || results[1].ok || results[1].code !== "INVALID_URL") throw new Error("AI action boundary smoke failed")
}).catch(error => { console.error(error); throw error }).finally(() => Script.exit())
