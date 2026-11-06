/** Shared image queue/cache/download pipeline. No view or navigation dependencies. */
import { AbortController, AbortSignal, Script } from "scripting"
import { httpStatusError } from "./networkErrors"
import { sharedRequestConsumers } from "./sharedRequest"
import { startPerformanceRecord } from "./imagePerformance"
import { IMAGE_DIAGNOSTIC_BUILD, imageDiagnostics, type ImageTrace } from "./imageDiagnostics"
import { getAccountSessionGeneration, getBaseUrl, getCookieHeader } from "./account"
import { invalidateFailedImagePage } from "./ehentai"
import { imageCacheDirectory, isImagePayload } from "./imageStorage"
import { reportDiagnostic } from "./githubBridge"

async function reportSafe(input:Parameters<typeof reportDiagnostic>[0]){try{await reportDiagnostic(input)}catch{}}
const imagePathCache=new Map<string,Promise<string>>(),imagePathCacheOrder:string[]=[]
export const IMAGE_MEMORY_CACHE_LIMIT=300
function rememberImageCache(key:string,task:Promise<string>){if(!imagePathCache.has(key))imagePathCacheOrder.push(key);imagePathCache.set(key,task);while(imagePathCacheOrder.length>IMAGE_MEMORY_CACHE_LIMIT){const oldest=imagePathCacheOrder.shift();if(oldest&&oldest!==key)imagePathCache.delete(oldest)}}
;(globalThis as any).__ehentaiClearImageMemoryCache=()=>{imagePathCache.clear();imagePathCacheOrder.length=0;cancelImageTasks()}
const fileManager:any=(globalThis as any).FileManager
const IMAGE_TIMEOUT_MS=15_000, MAX_IMAGE_REQUESTS=8
export type ImageStage="detail-cover"|"home-thumbnail"|"preview-thumbnail"|"reader-image"
type PendingImageTask={stage:ImageStage;priority:number;key:string;hostLimit?:number;sequence:number;enqueuedAt:number;host:string;start:()=>void;cancel:()=>void}
const IMAGE_PRIORITY:Record<ImageStage,number>={"reader-image":4,"home-thumbnail":3,"detail-cover":2,"preview-thumbnail":1}
export function imageStagePriority(stage:ImageStage){return IMAGE_PRIORITY[stage]}
export function imageRequestLimit(){return MAX_IMAGE_REQUESTS}
export const MAX_SLOW_HOST_IMAGE_REQUESTS=2
export function imageTaskHost(url:string){try{return new URL(url).hostname.toLowerCase()||"unknown"}catch{return "unknown"}}
export function imageHostRequestLimit(host:string){return host==="s.exhentai.org"?MAX_SLOW_HOST_IMAGE_REQUESTS:MAX_IMAGE_REQUESTS}
export function shouldRetryImageLoad(error:unknown){const name=String((error as any)?.name||"");return name!=="ImageSessionCancelled"&&name!=="ImageTimeout"}
function imageTimeoutError(){const error=new Error("图片请求超时");error.name="ImageTimeout";return error}
export function imageTimeoutMs(stage:ImageStage){return stage==="reader-image"?20_000:IMAGE_TIMEOUT_MS}
export function isPublicThumbHost(url:string){try{const host=new URL(url).hostname.toLowerCase();return host==="ehgt.org"||host.endsWith(".ehgt.org")}catch{return false}}
export { imageCacheDirectory }
let legacyImageCacheAbandoned=false
async function abandonLegacyImageCache(){if(legacyImageCacheAbandoned)return;legacyImageCacheAbandoned=true;try{const legacy=`${String((Script as any).directory||"").replace(/\/$/,"")}/.image-cache`;if(legacy.endsWith("/.image-cache")&&await fileManager.exists(legacy))await fileManager.remove(legacy)}catch{}}
let performanceNormalRequests=0
const pendingImageTasks:PendingImageTask[]=[];let activeImageTasks=0;let imageTaskSequence=0
const activeImageHosts=new Map<string,number>()
function drainImageTasks(){pendingImageTasks.sort((a,b)=>b.priority-a.priority||a.sequence-b.sequence);let i=0;while(activeImageTasks<MAX_IMAGE_REQUESTS&&i<pendingImageTasks.length){const task=pendingImageTasks[i];if((activeImageHosts.get(task.host)||0)>=(task.hostLimit??imageHostRequestLimit(task.host))){i++;continue}pendingImageTasks.splice(i,1);task.start()}}
const activeImageControllers=new Set<AbortController>()
let imageCacheEpoch=0
function imageCancellation(){const error=new Error("图片请求已取消");error.name="ImageSessionCancelled";return error}
function cancelImageTasks(){imageCacheEpoch++;for(const task of pendingImageTasks.splice(0))task.cancel();for(const controller of activeImageControllers)controller.abort()}
export function imageQueueIdle(){return activeImageTasks===0&&pendingImageTasks.length===0}
export function enqueueImageTask<T>(stage:ImageStage,work:(queueMs:number,signal:AbortSignal,trace:ImageTrace)=>Promise<T>,ownerSignal?:AbortSignal,diagnosticUrl="",diagnosticRetry=false,priority=IMAGE_PRIORITY[stage],queueKey="",hostLimit?:number):Promise<T>{
  const enqueuedAt=Date.now(),trace=imageDiagnostics.begin(stage,diagnosticUrl,diagnosticRetry)
  return new Promise((resolve,reject)=>{
    const controller=new AbortController()
    let started=false
    const noteCancel=()=>trace.cancel()
    controller.signal.addEventListener("abort",noteCancel,{once:true})
    const cleanup=()=>{ownerSignal?.removeEventListener("abort",cancel);controller.signal.removeEventListener("abort",noteCancel)}
    const cancel=()=>{controller.abort();if(!started){const index=pendingImageTasks.indexOf(entry);if(index>=0)pendingImageTasks.splice(index,1);cleanup();trace.finish("cancelled");reject(imageCancellation())}}
    const host=imageTaskHost(diagnosticUrl)
    const start=()=>{started=true;trace.step("started");activeImageControllers.add(controller);activeImageTasks++;activeImageHosts.set(host,(activeImageHosts.get(host)||0)+1)
      // An aborted request still owns its slot until the actual work settles.
      void (async()=>{try{const result=await work(Date.now()-enqueuedAt,controller.signal,trace);if(controller.signal.aborted)throw imageCancellation();trace.finish("success");resolve(result)}catch(error){trace.finish(controller.signal.aborted?"cancelled":"failed");reject(error)}finally{cleanup();activeImageControllers.delete(controller);activeImageTasks--;const remaining=(activeImageHosts.get(host)||1)-1;if(remaining<=0)activeImageHosts.delete(host);else activeImageHosts.set(host,remaining);drainImageTasks()}})()
    }
    const entry:PendingImageTask={stage,priority,key:queueKey,hostLimit,sequence:imageTaskSequence++,enqueuedAt,host,start,cancel}
    ownerSignal?.addEventListener("abort",cancel,{once:true})
    if(ownerSignal?.aborted){cancel();return}
    pendingImageTasks.push(entry);drainImageTasks()
  })
}
// A shared URL continues while any mounted consumer (including an unscoped caller) needs it.
export function imageConsumers<T>(task:Promise<T>,onUnused:()=>void){return sharedRequestConsumers(task,onUnused,imageCancellation)}
const pendingImageConsumers=new Map<string,{task:Promise<string>;consume:(signal?:AbortSignal)=>Promise<string>}>()
export function hashText(value:string){const part=(seed:number)=>{let hash=seed;for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619)}return(hash>>>0).toString(16).padStart(8,"0")};return part(2166136261)+part(0x811c9dc5^value.length)}
function imageHost(url:string){try{return new URL(url).host}catch{return "invalid-host"}}
export function validCachedImagePayload(contentType:string,data:any){return isImagePayload(contentType,data)}
export type ImageLoadProgress={received:number;expected:number;fraction:number;determinate:boolean}
const imageProgressListeners=new Map<string,Set<(progress:ImageLoadProgress)=>void>>()
export function imageResponseExpectedBytes(response:any){const header=Number(response?.headers?.get?.("content-length")||0),expected=Number(response?.expectedContentLength||0),total=expected>0?expected:header;return Number.isFinite(total)&&total>0?Math.trunc(total):0}
export function imageLoadProgress(received:number,expected:number):ImageLoadProgress{const got=Math.max(0,Math.trunc(Number(received)||0)),total=Math.max(0,Math.trunc(Number(expected)||0)),determinate=total>0;return{received:got,expected:total,fraction:determinate?Math.min(1,got/total):0,determinate}}
export function formatImageLoadBytes(bytes:number){const n=Math.max(0,Math.trunc(Number(bytes)||0));if(n<1024)return `${n} B`;if(n<1048576){const kb=n/1024;return `${kb<10?kb.toFixed(1):Math.round(kb)} KB`}return `${(n/1048576).toFixed(1)} MB`}
export function imageLoadProgressLabel(progress:ImageLoadProgress){if(progress.determinate)return `${formatImageLoadBytes(progress.received)} / ${formatImageLoadBytes(progress.expected)}`;if(progress.received>0)return `已加载 ${formatImageLoadBytes(progress.received)}`;return "正在连接…"}
export function subscribeImageProgress(cacheKey:string,listener:(progress:ImageLoadProgress)=>void){let listeners=imageProgressListeners.get(cacheKey);if(!listeners){listeners=new Set();imageProgressListeners.set(cacheKey,listeners)}listeners.add(listener);return()=>{listeners!.delete(listener);if(!listeners!.size)imageProgressListeners.delete(cacheKey)}}
function emitImageProgress(cacheKey:string,progress:ImageLoadProgress){const listeners=imageProgressListeners.get(cacheKey);if(!listeners?.size)return;for(const listener of listeners)listener(progress)}
async function readResponseDataWithProgress(response:any,signal:AbortSignal,onProgress:(progress:ImageLoadProgress)=>void,onFirstChunk?:()=>void){const expected=imageResponseExpectedBytes(response),emit=(received:number)=>onProgress(imageLoadProgress(received,expected));emit(0);const stream=response?.dataStream||response?.body;if(stream&&typeof stream[Symbol.asyncIterator]==="function"){const chunks:any[]=[];let received=0,last=0;for await(const chunk of stream){if(signal.aborted)throw imageCancellation();const data=chunk&&typeof chunk.size==="number"?chunk:Data.fromUint8Array(chunk instanceof Uint8Array?chunk:new Uint8Array(chunk));if(!data)continue;if(received===0&&Number(data.size||0)>0)onFirstChunk?.();chunks.push(data);received+=Number(data.size||0);const now=Date.now();if(now-last>=80){last=now;emit(received)}}emit(received);if(!chunks.length)throw new Error("图片响应为空。");const combined=chunks.length===1?chunks[0]:Data.combine(chunks);if(!combined)throw new Error("图片响应为空。");return combined}const data=await response.data();emit(Number(data?.size||data?.length||0)||expected);return data}
export function imageRequestCacheKey(url:string,stage:ImageStage,_referer=""){const session=stage==="reader-image"?`${getAccountSessionGeneration()}|`:"";return `${session}${url}`}
export async function cachedImagePath(url:string,stage:ImageStage,options?:any,refresh=false){
  const performance=startPerformanceRecord(url,{page:options?.galleryPage,resolveMs:options?.resolveMs,foreground:stage==="reader-image"&&!options?.prefetch,prefetch:Boolean(options?.prefetch),testConcurrency:options?.testConcurrency}),metric=performance?.record
  if(!options?.testDirectory)performanceNormalRequests++
  let published=false;const publishPerformance=()=>{if(published)return;published=true;performance?.finish();if(metric)options?.onPerformance?.({...metric})}
  const consumerSignal:AbortSignal|undefined=options?.signal
  if(consumerSignal?.aborted){if(metric)metric.aborted=true;publishPerformance();throw imageCancellation()}
  const epoch=imageCacheEpoch
  const cacheKey=imageRequestCacheKey(url,stage,String(options?.headers?.Referer||""))
  const existing=options?.testDirectory?undefined:imagePathCache.get(cacheKey);if(existing){if(stage==="reader-image"&&!options?.prefetch)promoteReaderImage(url);const pending=pendingImageConsumers.get(cacheKey);imageDiagnostics.countReuse(pending?.task===existing);if(metric){metric.reusedPromise=pending?.task===existing;metric.cacheHit=!metric.reusedPromise}try{return await (pending?.task===existing?pending.consume(consumerSignal):existing)}catch(error){if(metric){metric.aborted=Boolean(consumerSignal?.aborted);metric.failed=!metric.aborted}throw error}finally{publishPerformance()}}
  void abandonLegacyImageCache()
  const run=async(queueMs:number,signal:AbortSignal,trace:ImageTrace)=>{const started=Date.now();if(metric){metric.queueMs=queueMs;metric.activeRequests=activeImageTasks}let fetchStarted=0;let response:any;const controller=new AbortController(),abort=()=>controller.abort();signal.addEventListener("abort",abort,{once:true});if(signal.aborted)abort();let timeout:ReturnType<typeof setTimeout>|undefined,timedOut=false;const checkCurrent=()=>{if(signal.aborted||epoch!==imageCacheEpoch)throw imageCancellation()}
    try{const dir=options?.testDirectory||imageCacheDirectory();trace.step("mkdir");await fileManager.createDirectory(dir,true);const ext=new URL(url).pathname.match(/\.(jpg|jpeg|png|webp|gif)$/i)?.[1]?.toLowerCase()||"jpg";const path=`${dir}/${hashText(cacheKey)}.${ext}`
      try{checkCurrent();trace.step("cache-check");if(!options?.testDirectory&&!refresh&&await fileManager.isFile(path)){if(metric){metric.cacheHit=true;metric.cacheReadMs=Date.now()-started}trace.cacheHit();trace.step("report");await reportSafe({stage,ok:true,request:{url,status:200,statusText:"cache"},notes:`host=${imageHost(url)}; queueMs=${queueMs}; fetchMs=0; totalMs=${queueMs+Date.now()-started}; contentType=cache; settle=cache-hit`});return path}}catch{trace.cacheError()}
      checkCurrent();if(metric)metric.cacheReadMs=Date.now()-started;fetchStarted=Date.now();if(metric)metric.networkStarted=true;timeout=setTimeout(()=>{timedOut=true;trace.timeout();abort()},imageTimeoutMs(stage));trace.step("fetch");response=await fetch(url,{...(options||{}),signal:controller.signal} as any);if(metric)metric.responseAvailableMs=Date.now()-fetchStarted;const contentType=String(response.headers?.get?.("content-type")||"");trace.response(Number(response.status||0),contentType);if(!response.ok)throw httpStatusError(Number(response.status));trace.step("body");const data=await readResponseDataWithProgress(response,signal,progress=>{if(metric){metric.bytes=progress.received}if(!options?.testDirectory)emitImageProgress(cacheKey,progress)},()=>{if(metric&&metric.firstChunkObservedMs===null)metric.firstChunkObservedMs=Date.now()-fetchStarted});trace.bytes(Number(data?.size||data?.length||0));if(metric){metric.downloadMs=Date.now()-fetchStarted;metric.bytes=Number(data?.size||data?.length||0)}checkCurrent();trace.step("validate");if(!validCachedImagePayload(contentType,data))throw new Error("图片响应无效。");const fetchMs=Date.now()-fetchStarted;trace.step("write");const writeStarted=Date.now();await fileManager.writeAsData(path,data);if(metric)metric.cacheWriteMs=Date.now()-writeStarted;checkCurrent()
      trace.step("report");await reportSafe({stage,ok:true,request:{url,status:Number(response.status||0),statusText:String(response.statusText||"")},notes:`host=${imageHost(url)}; queueMs=${queueMs}; fetchMs=${fetchMs}; totalMs=${queueMs+Date.now()-started}; contentType=${contentType||"unknown"}; settle=written`});return path
    }catch(error){if(metric){metric.aborted=Boolean(signal.aborted||controller.signal.aborted||epoch!==imageCacheEpoch);metric.failed=!metric.aborted}if(signal.aborted||epoch!==imageCacheEpoch)throw imageCancellation();const failed=timedOut?imageTimeoutError():error;if(stage==="reader-image"&&!options?.testDirectory)await invalidateFailedImagePage(String(options?.headers?.Referer||""),url);trace.failure();trace.step("report");await reportSafe({stage,ok:false,error:failed,request:{url,status:Number(response?.status||0),statusText:String(response?.statusText||"")},notes:`host=${imageHost(url)}; queueMs=${queueMs}; fetchMs=${fetchStarted?Date.now()-fetchStarted:0}; totalMs=${queueMs+Date.now()-started}; settle=${timedOut?"timeout":"failed"}`});throw failed}finally{if(timeout!==undefined)clearTimeout(timeout);signal.removeEventListener("abort",abort)}
  }
  const owner=new AbortController(),task=enqueueImageTask(stage,run,owner.signal,url,refresh,stage==="reader-image"?(options?.prefetch?0:5):IMAGE_PRIORITY[stage],cacheKey,options?.testConcurrency)
  if(options?.testDirectory){const consume=imageConsumers(task,()=>owner.abort());try{return await consume(consumerSignal)}catch(error){if(metric){metric.aborted=Boolean(consumerSignal?.aborted);metric.failed=!metric.aborted}throw error}finally{await task.catch(()=>{});publishPerformance()}}
  const forget=()=>{if(imagePathCache.get(cacheKey)===task){imagePathCache.delete(cacheKey);const index=imagePathCacheOrder.indexOf(cacheKey);if(index>=0)imagePathCacheOrder.splice(index,1)}if(pendingImageConsumers.get(cacheKey)?.task===task)pendingImageConsumers.delete(cacheKey)}
  const consume=imageConsumers(task,()=>{forget();owner.abort()})
  pendingImageConsumers.set(cacheKey,{task,consume});rememberImageCache(cacheKey,task)
  void task.then(()=>{if(pendingImageConsumers.get(cacheKey)?.task===task)pendingImageConsumers.delete(cacheKey)},forget)
  try{return await consume(consumerSignal)}catch(error){if(metric){metric.aborted=Boolean(consumerSignal?.aborted);metric.failed=!metric.aborted}throw error}finally{publishPerformance()}
}
export function promoteReaderImage(url:string){const key=imageRequestCacheKey(url,"reader-image");for(const task of pendingImageTasks)if(task.key===key)task.priority=5;drainImageTasks()}
export function imageRequestOptions(url:string,referer=getBaseUrl()){const cookie=getCookieHeader(url);return{headers:{Accept:"image/webp,image/png,image/jpeg,image/gif,image/*,*/*;q=0.8",Referer:referer,...(cookie?{Cookie:cookie}:{})}}}

export function imageDiagnosticSnapshot(){return{build:IMAGE_DIAGNOSTIC_BUILD,active:activeImageTasks,queued:pendingImageTasks.length,limit:MAX_IMAGE_REQUESTS,...imageDiagnostics.snapshot()}}

export function imageNormalRequestCount(){return performanceNormalRequests}
