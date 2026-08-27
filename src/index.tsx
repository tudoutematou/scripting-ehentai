import { Script } from "scripting"

import "./dialogCompat"
import { runAppV2 } from "./appV2"

runAppV2()
  .catch(error => console.error(error))
  .finally(() => Script.exit())
