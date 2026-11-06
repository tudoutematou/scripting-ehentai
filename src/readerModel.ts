import { GalleryPageLink, GallerySummary } from "./ehentai"
import { type ReaderPreferences, downloadWritesLibrary, type OfflineDownload } from "./libraryStore"

export function readerSwipeAction(dx:number,dy:number,zoomed:boolean,direction:ReaderPreferences["direction"]="ltr",distance=48):"previous"|"next"|null{if(zoomed)return null;const x=Number(dx),y=Number(dy);if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)<distance||Math.abs(x)<=Math.abs(y))return null;const swipeLeft=x<0;return direction==="rtl"?(swipeLeft?"previous":"next"):(swipeLeft?"next":"previous")}
export type ReaderTapZone="left"|"right"|"centerUpper"|"centerLower"
export type ReaderTapAction="previous"|"next"|"settings"|"progress"
export type ReaderOverlay="none"|"settings"|"progress"
export function readerOverlayAfterAction(current:ReaderOverlay,action:ReaderTapAction):ReaderOverlay{if(action==="settings")return"settings";if(action==="progress")return current==="progress"?"none":"progress";return"none"}
export function readerOverlayAfterAutoPlay(playing:boolean,overlay:ReaderOverlay):ReaderOverlay{return playing?"none":overlay}
export function readerTapAction(zone:ReaderTapZone,direction:ReaderPreferences["direction"]):ReaderTapAction{if(zone==="centerUpper"||zone==="centerLower")return"progress";return zone==="left"?(direction==="rtl"?"next":"previous"):(direction==="rtl"?"previous":"next")}
export function readerTargetIndex(index:number,count:number,action:"previous"|"next"){if(count<=0)return 0;return Math.max(0,Math.min(count-1,index+(action==="next"?1:-1)))}
export function readerPageNumber(page:Pick<GalleryPageLink,"index">|undefined,fallbackIndex=0){const value=Number(page?.index);return Number.isInteger(value)&&value>0?value:Math.max(1,Math.trunc(Number(fallbackIndex)||0)+1)}
export function readerTargetGalleryPage(currentPage:number,totalPages:number,action:"previous"|"next"){const total=Math.max(1,Math.trunc(Number(totalPages)||1)),current=Math.max(1,Math.min(total,Math.trunc(Number(currentPage)||1)));return Math.max(1,Math.min(total,current+(action==="next"?1:-1)))}
export function readerInventoryGap(indexes:readonly number[],currentPage:number,totalPages:number,keepAhead=20){const total=Math.max(0,Math.trunc(Number(totalPages)||0));if(total<=1)return null;const current=Math.max(1,Math.min(total,Math.trunc(Number(currentPage)||1))),ahead=Math.max(1,Math.trunc(Number(keepAhead)||20)),needUntil=Math.min(total,current+ahead);if(needUntil<=current)return null;const have=new Set(indexes.map(index=>Math.trunc(Number(index)||0)));let first=current+1;while(first<=needUntil&&have.has(first))first++;if(first>needUntil)return null;return {first,last:Math.min(total,Math.ceil(first/20)*20)}}
export function readerNavigationRequestIsCurrent(request:number,current:number){return request===current}
export function readerJumpTarget(input:string,totalPages:number){const value=Number(String(input||"").trim()),total=Math.max(0,Math.trunc(Number(totalPages)||0));return Number.isInteger(value)&&value>=1&&value<=total?value:null}
export function shouldScheduleAutoPage(playing:boolean,continuous:boolean,index:number,loadedCount:number,totalCount=loadedCount){return playing&&!continuous&&index>=0&&index<Math.max(loadedCount,totalCount)-1}
export function canAdvanceReaderPage(index:number,loadedCount:number){return index>=0&&index<loadedCount-1}
export function readerControlActions(){return ["previous","play","next","jump","original","settings"] as const}
export function readerSliderDisplayPage(pageNumber:number,draft:number,dragging:boolean){return dragging?Math.max(1,Math.round(draft)):pageNumber}
export type ReaderZoomState={scale:number;offset:{x:number;y:number}}
export function clampReaderScale(value:number){return Math.max(1,Math.min(4,value))}
export function readerZoomed(scale:number){return scale>1.05}
export function clampReaderOffset(offset:{x:number;y:number},scale:number,viewport:{width?:number;height?:number}){const maxX=Math.max(0,((viewport.width||0)*(scale-1))/2),maxY=Math.max(0,((viewport.height||0)*(scale-1))/2);return{x:Math.max(-maxX,Math.min(maxX,offset.x)),y:Math.max(-maxY,Math.min(maxY,offset.y))}}
export function readerZoomAfterPageChange():ReaderZoomState{return{scale:1,offset:{x:0,y:0}}}
export function readerViewportFrame(fit:ReaderPreferences["fit"],width:number,height:number){const w=Math.max(1,width-24),h=Math.max(320,height-24);return fit==="screen"?{width:w,height:h}:{width:w,minHeight:h}}
// Explicit preview page is a one-based gallery page, never an inventory offset or history fallback.
export function continueReadingPage(resume:number|null,totalPages:number){if(resume==null||!Number.isInteger(resume))return null;if(resume<0||resume>=Math.max(0,totalPages))return null;return resume+1}
export function offlineResumeDownload(items:ReadonlyArray<OfflineDownload>,summary:Pick<GallerySummary,"gid"|"token"|"url">,page:number){return items.filter(item=>item.summary?.gid===summary.gid&&item.summary?.token===summary.token&&item.summary?.url&&new URL(item.summary.url).hostname===new URL(summary.url).hostname&&downloadWritesLibrary(item)&&item.libraryDone.includes(page)).sort((a,b)=>(b.scope==="all"?1:0)-(a.scope==="all"?1:0)||b.updatedAt-a.updatedAt)[0]||null}
export function readerInitialGalleryPage(pages:ReadonlyArray<Pick<GalleryPageLink,"index">>,startIndex:number,startPage?:number){if(startPage!=null&&pages.some(page=>page.index===startPage))return startPage;const offset=Number.isFinite(startIndex)?Math.trunc(startIndex):0;return pages[Math.max(0,Math.min(offset,pages.length-1))]?.index??0}
export function previewReaderSessionKey(gallery:string,page:number,sequence:number){return `preview-reader:${gallery}:${page}:${sequence}`}
export type OfflineReaderPage={filePath:string;galleryIndex:number}
export function offlineReaderPositionLabel(index:number,count:number,page:OfflineReaderPage|undefined){return `${index+1} / ${count} · 原第 ${page?.galleryIndex||"?"} 页`}
export function mergeOfflineReaderPages(current:ReadonlyArray<OfflineReaderPage>,incoming:ReadonlyArray<OfflineReaderPage>){return[...new Map([...current,...incoming].filter(page=>page?.filePath&&Number.isInteger(page?.galleryIndex)).map(page=>[page.galleryIndex,page])).values()].sort((a,b)=>a.galleryIndex-b.galleryIndex)}
export function offlineReaderTargetIndex(pages:ReadonlyArray<OfflineReaderPage>,galleryPage:number){const target=Math.trunc(Number(galleryPage));return pages.findIndex(page=>page.galleryIndex===target)}
export function offlineReaderAdvanceIndex(pages:ReadonlyArray<OfflineReaderPage>,galleryIndex:number,action:"previous"|"next",sequential=false){if(sequential)return offlineReaderTargetIndex(pages,action==="next"?galleryIndex+1:galleryIndex-1);const index=Math.max(0,offlineReaderIndexForGalleryIndex(pages,galleryIndex));return readerTargetIndex(index,pages.length,action)}
export function offlineReaderIndexForGalleryIndex(pages:ReadonlyArray<OfflineReaderPage>,galleryIndex:number|undefined){return galleryIndex==null?-1:pages.findIndex(page=>page.galleryIndex===galleryIndex)}
