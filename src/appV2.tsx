import { Navigation, NavigationStack } from "scripting"
import { HomeScene } from "./GalleryFlow"

/** App assembly: routes the shell to the composable gallery flow. */
export async function runAppV2() {
  await Navigation.present({ element: <NavigationStack><HomeScene /></NavigationStack> })
}
