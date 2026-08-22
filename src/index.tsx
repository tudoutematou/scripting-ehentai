import { Script } from "scripting"
import { runAppV2 } from "./appV2"

runAppV2()
  .catch(error => console.error(error))
  .finally(() => Script.exit())
