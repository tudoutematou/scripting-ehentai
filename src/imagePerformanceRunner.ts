/** Explicit performance experiment orchestration, separate from image loading and UI. */
import { AbortSignal } from "scripting"
import { getAccountSessionGeneration } from "./account"
import { resolveImagePageForPerformance, type GalleryPageLink } from "./ehentai"
import type { ReaderPrefetchSession } from "./readerPrefetch"
import type { PerformanceRecord } from "./imagePerformance"
import { cachedImagePath, imageQueueIdle, imageRequestOptions, imageNormalRequestCount } from "./imageLoader"
const fileManager:any=(globalThis as any).FileManager
function imageCancellation(){const error=new Error("图片请求已取消");error.name="ImageSessionCancelled";return error}
export async function runGalleryPerformance(startPage:number,totalPages:number,preferOriginal:boolean,onLoadRange:(first:number,last:number,signal?:AbortSignal)=>Promise<GalleryPageLink[]>,session:ReaderPrefetchSession,count:number,signal:AbortSignal,onProgress:(message:string)=>void){
  const generation=getAccountSessionGeneration(),isCurrent=()=>!signal.aborted&&generation===getAccountSessionGeneration()
  const check=()=>{if(!isCurrent())throw imageCancellation()}
  const directory=`${fileManager.temporaryDirectory}/ehentai-performance-${Date.now()}`,groups:import("./imagePerformance").PerformanceGroup[]=[]
  try{
    const waitStarted=Date.now();while(!imageQueueIdle()||session.preparationSnapshot().active>0||session.snapshot().backgroundActive>0||[...session.prefetchInFlight.values()].some(job=>job.state==="active")){check();if(Date.now()-waitStarted>45000)throw new Error("其他图片请求未结算。");await new Promise(resolve=>setTimeout(resolve,100))}
    const first=Math.max(1,Math.min(startPage,Math.max(1,totalPages-count+1))),last=Math.min(totalPages,first+count-1),pages=await onLoadRange(first,last,signal);check()
    const selected=pages.filter(page=>page.index>=first&&page.index<=last).sort((a,b)=>a.index-b.index)
    if(selected.length<8)throw new Error("至少需要8个可用页面。")
    const samples=Array.from({length:8},(_,index)=>selected[Math.floor(index*(selected.length-1)/7)]),prepared:Array<{page:number;url:string;referer:string;resolveMs:number}>=[]
    // Resolve once before experimental download groups; HTML time does not confound image concurrency.
    for(const page of samples){check();onProgress(`准备图片地址 · ${prepared.length+1}/8`);const started=Date.now(),value=await resolveImagePageForPerformance(page.pageUrl,signal);check();prepared.push({page:page.index,url:preferOriginal&&value.originalUrl?value.originalUrl:value.imageUrl,referer:value.pageUrl,resolveMs:Date.now()-started})}
    await fileManager.createDirectory(directory,true)
    for(const concurrency of [1,2,3,4,6]){
      if(!isCurrent())break;const rows:PerformanceRecord[]=[],started=Date.now(),normalRequests=imageNormalRequestCount();let next=0,completed=0
      const worker=async()=>{while(next<prepared.length&&isCurrent()){const value=prepared[next++];try{await cachedImagePath(value.url,"reader-image",{...imageRequestOptions(value.url,value.referer),headers:{...imageRequestOptions(value.url,value.referer).headers,"Cache-Control":"no-cache, no-store","Pragma":"no-cache"},signal,testDirectory:directory,testConcurrency:concurrency,galleryPage:value.page,resolveMs:value.resolveMs,onPerformance:(row:PerformanceRecord)=>{if(row)rows.push({...row})}},true)}catch{}completed++;onProgress(`并发 ${concurrency} · ${completed}/8 张结算`)}}
      await Promise.allSettled(Array.from({length:concurrency},worker));groups.push({concurrency,elapsedMs:Date.now()-started,records:rows,interfered:imageNormalRequestCount()!==normalRequests});if(!isCurrent())break
    }
    return groups
  }finally{try{await fileManager.remove(directory)}catch{}}
}
