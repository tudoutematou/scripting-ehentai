import { Script } from "scripting"
import { runSelfTests } from "./selfTest"

runSelfTests()
  .then(results => {
    console.log(JSON.stringify(results))
    if (results.some(result => !result.ok)) throw new Error("runSelfTests failed")
  })
  .catch(error => { console.error(error); throw error })
  .finally(() => Script.exit())
