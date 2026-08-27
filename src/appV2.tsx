import { Navigation, NavigationStack } from "scripting"
import { HomeScene } from "./GalleryFlow"
import { recoverInterruptedDownloads } from "./libraryStore"

/** App assembly: routes the shell to the composable gallery flow. */
export async function runAppV2() {
  try { await recoverInterruptedDownloads() } catch (error) { console.error(error) }
  await Navigation.present({ element: <NavigationStack><HomeScene /></NavigationStack> })
}
