import { GalleryPageLink, GallerySummary } from "./ehentai"

export function galleryIdentity(item:Pick<GallerySummary,"id"|"gid"|"token"|"url">){return item.id||[item.gid,item.token].filter(Boolean).join(":")||item.url||""}
export function mergePreviewPages(current:GalleryPageLink[],incoming:GalleryPageLink[]){const merged=new Map(current.map(page=>[page.pageUrl,page]));for(const page of incoming)merged.set(page.pageUrl,page);return [...merged.values()].sort((a,b)=>a.index-b.index)}
