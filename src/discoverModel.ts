import { GallerySummary } from "./ehentai"
import { buildGallerySearchUrl, createHomeSearchState, createPopularSearchState } from "./tourist"
import { galleryIdentity } from "./galleryIdentity"

export function discoverGridMetrics(width:number){const available=Math.max(1,Number(width)||1),columns=available>=680?5:available>=460?3:2,spacing=12;return{columns,spacing,cardWidth:Math.max(1,Math.floor((available-spacing*(columns-1))/columns))}}
export function discoverCoverFrame(width=164){return {width:Math.max(1,Math.floor(width)),height:Math.min(178,Math.max(110,Math.round(width*1.12)))}}
export type DiscoverFeed = "latest" | "popular"
export function discoverFeedUrl(base:string,feed:DiscoverFeed){return buildGallerySearchUrl(base,feed==="popular"?createPopularSearchState():createHomeSearchState())}
export function mergeDiscoverGalleries(current:GallerySummary[],incoming:GallerySummary[]){const seen=new Set(current.map(galleryIdentity));return [...current,...incoming.filter(item=>{const key=galleryIdentity(item);if(seen.has(key))return false;seen.add(key);return true})]}
export function discoverNextCursor(requested:string,next:string){return next&&next!==requested?next:""}

