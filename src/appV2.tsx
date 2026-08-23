import { Navigation, NavigationStack } from "scripting"
import { HomeScene } from "./scenes/GalleryFlow"

export async function runAppV2() {
  await Navigation.present({ element: <NavigationStack><HomeScene /></NavigationStack> })
}
