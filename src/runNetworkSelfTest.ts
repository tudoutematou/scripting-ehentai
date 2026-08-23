import { Script } from "scripting"
import { runSelfTests } from "./selfTest"

void runSelfTests({ network: true }).then(results => {
  console.log(JSON.stringify(results))
  if (results.some(result => !result.ok)) throw new Error("network self-test failed")
}).catch(error => { console.error(error); throw error }).finally(() => Script.exit())
