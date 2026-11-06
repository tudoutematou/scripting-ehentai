import { GallerySearchState } from "./tourist"

export function searchComposerCanSubmit(state:GallerySearchState){return Boolean(String(state?.rawQuery||"").trim())}
export function searchComposerActionDestination(action:"search"|"save"|"filter"|"bookmarks"|"ai-search"|"ai-recommend",state:GallerySearchState){if(action==="save")return null;if(action==="search")return searchComposerCanSubmit(state)?"results":null;return action}
export function searchBookmarkDefaultTitle(state:GallerySearchState){return String(state.displayQuery||state.keyword||"搜索书签").trim().slice(0,80)||"搜索书签"}
export function glassGroupMixesInPlaceAndNavigation(items:Array<"inplace"|"navigate">){return items.includes("inplace")&&items.includes("navigate")}
