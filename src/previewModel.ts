import { Device } from "scripting"
import { GalleryPageLink } from "./ehentai"
import { type OfflineDownloadDestination } from "./libraryStore"
import { readerJumpTarget } from "./readerModel"

export const PREVIEW_SUMMARY_LIMIT=18
export const MOBILE_PREVIEW_LIMIT=6
export const MOBILE_DETAIL_SECTION_ORDER=["hero","reading","actions","preview","tags","basic","resources","related"] as const
export function previewSummaryPages<T>(pages:T[],limit=PREVIEW_SUMMARY_LIMIT){return pages.slice(0,Math.max(0,limit))}
export function mobilePreviewSummaryPages<T>(pages:T[]){return previewSummaryPages(pages,MOBILE_PREVIEW_LIMIT)}
export function previewNeedsMore(loaded:number,total:number,visibleIndex:number){return loaded<total&&visibleIndex>=Math.max(0,loaded-3)}
export const PREVIEW_SCROLL_LEADING_THRESHOLD=15
export function previewScrollLeadingShouldLoad(leadingIndex:number,loaded:number,total:number,loading:boolean,threshold=PREVIEW_SCROLL_LEADING_THRESHOLD){if(loading||!Number.isFinite(leadingIndex)||leadingIndex<0||loaded<=0||loaded>=total)return false;return leadingIndex>=Math.max(0,loaded-Math.max(1,threshold))}
export const PREVIEW_BROWSER_WINDOW=80
export function previewBrowserWindow<T>(pages:T[],anchor:number,window=PREVIEW_BROWSER_WINDOW){if(pages.length<=window)return pages;const index=Math.max(0,Math.min(pages.length-1,Number(anchor)||0)),start=Math.max(0,Math.min(index-Math.floor(window/4),pages.length-window));return pages.slice(start,start+window)}
export function previewPageRangeForIndexes(first:number,last:number,totalPages:number,previewPages:number){const start=Math.max(0,Math.floor((Math.max(1,first)-1)/20)),end=Math.min(Math.max(0,previewPages-1),Math.floor((Math.max(1,last)-1)/20));return{start:Math.min(start,end),end:Math.max(start,end)}}
export function togglePreviewSelection(selected:ReadonlySet<number>,index:number){const next=new Set(selected);next.has(index)?next.delete(index):next.add(index);return next}
export function selectedPreviewPages(pages:GalleryPageLink[],selected:ReadonlySet<number>){return pages.filter(page=>selected.has(page.index)).map(page=>({index:page.index,pageUrl:page.pageUrl}))}
export function selectionModeAfterDone(){return false}
export function downloadSelectionSnapshot(pages:GalleryPageLink[],selected:ReadonlySet<number>){return selectedPreviewPages(pages,new Set(selected))}
export type SelectionGestureMode="select"|"deselect"|null
export function dragSelectionTarget(anchor:number,translation:{x?:number;y?:number},columns:number,count:number){const row=Math.round(Number(translation.y||0)/164),column=Math.round(Number(translation.x||0)/128);return Math.max(0,Math.min(Math.max(0,count-1),anchor+row*Math.max(1,columns)+column))}
export function applySelectionGesture(selected:ReadonlySet<number>,pages:GalleryPageLink[],anchor:number,target:number,mode:SelectionGestureMode,visited:ReadonlySet<number>){const next=new Set(selected),handled=new Set(visited),start=Math.max(0,Math.min(anchor,target)),end=Math.min(pages.length-1,Math.max(anchor,target));for(let index=start;index<=end;index+=1){const page=pages[index];if(!page||handled.has(page.index))continue;handled.add(page.index);if(mode==="select")next.add(page.index);else if(mode==="deselect")next.delete(page.index)}return{selected:next,visited:handled}}
export type PreviewDownloadState={id:string;scope:"all"|"partial";pages:Array<{index:number;pageUrl:string}>;done:number[];libraryDone:number[];photosDone:number[];photosPending:number[];failed:number[];status:string;destination:OfflineDownloadDestination;totalPages:number}
export function downloadDestinationLabel(destination:OfflineDownloadDestination){return destination==="both"?"离线书库 + 系统图库":destination==="photos"?"系统图库":"离线书库"}
export function photosProgressLabel(item:Pick<PreviewDownloadState,"destination"|"photosDone"|"pages">){return item.destination==="photos"||item.destination==="both"?`正在保存到图库 ${item.photosDone.length} / ${item.pages.length}`:""}
export function compactPreviewColumnCount(width=Device.screen.width){return Number(width)<360?2:3}
export function previewScrollRequestAllowed(nearBottom:boolean,armed:boolean,loading:boolean,loaded:number,total:number){return nearBottom&&armed&&!loading&&loaded>0&&loaded<total}
export function nextPreviewRange(pages:GalleryPageLink[],total:number,from=1){const indexes=new Set(pages.map(page=>page.index)),scan=(start:number)=>{let first=start;while(first<=total&&indexes.has(first))first++;return first};let first=scan(Math.max(1,Math.trunc(from)));if(first>total&&from>1)first=scan(1);return {first,last:Math.min(total,first+59)}}
export function previewBatchRange(batch:number,total:number){const count=Math.max(0,Math.ceil(total/60));if(!Number.isInteger(batch)||batch<1||batch>count)return null;const first=(batch-1)*60+1;return {first,last:Math.min(total,first+59)}}
export function previewJumpRange(page:number,total:number){const target=readerJumpTarget(String(page),total);if(target==null)return null;const first=Math.floor((target-1)/20)*20+1;return {first,last:Math.min(total,first+19)}}
