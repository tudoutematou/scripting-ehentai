export type RootDestination="discover"|"library"|"settings"
export const SETTINGS_ROOT_SECTIONS=["account","reading","downloads","data"] as const
export function regularRootNavigationKey(selected:RootDestination,epoch=0){return `regular-root:${selected}:${epoch}`}
export function splitColumnVisibility(galleryPresented:boolean){return galleryPresented?"detailOnly":"doubleColumn"}
export function resolvedSplitColumnVisibility(galleryPresented:boolean,userVisibility:string){return galleryPresented?"detailOnly":userVisibility||"doubleColumn"}
