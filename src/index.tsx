import { NavigationStack, Script } from "scripting"

;(globalThis as any).NavigationStack = NavigationStack

import { runAppV2 } from "./appV2"

runAppV2()
  .catch(error => console.error(error))
  .finally(() => Script.exit())
