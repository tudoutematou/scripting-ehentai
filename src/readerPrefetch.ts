import { AbortController } from "scripting"

export type ReaderPrefetchImage={url:string;referer:string;original:string}
export type ReaderPrefetchLink={index:number;pageUrl:string}
export type ReaderPrefetchJob={page:number;original:boolean;resolved:Promise<ReaderPrefetchImage>;image:Promise<string>;foreground:boolean;state:"active"|"done"|"failed";value?:ReaderPrefetchImage}
type Options={prepareAhead?:boolean;backgroundConcurrency?:number;totalPages:number;isCurrent:()=>boolean;getPage:(page:number)=>ReaderPrefetchLink|undefined;loadPage:(page:number,signal:any)=>Promise<ReaderPrefetchLink>;resolve:(link:ReaderPrefetchLink,signal:any,refresh:boolean)=>Promise<{imageUrl:string;originalUrl?:string;pageUrl:string}>;cache:(image:ReaderPrefetchImage,signal:any,background:boolean,refresh:boolean,page:number,resolveMs:number)=>Promise<string>;promote:(image:ReaderPrefetchImage)=>void;observeReuse?:(page:number,image:ReaderPrefetchImage|undefined,pending:boolean)=>void}
export function readerPrefetchWindow(current:number,total:number,preload:number){const next:number[]=[];for(let page=current+1;page<=Math.min(total,current+Math.max(0,Math.trunc(preload)));page++)next.push(page);if(current>1)next.push(current-1);return next}
// Lifetime belongs to a mounted Reader, never to the current page effect.
export function createReaderPrefetchSession(options:Options){
  const controller=new AbortController(),prefetchInFlight=new Map<string,ReaderPrefetchJob>()
  const backgroundLimit=Number.isFinite(options.backgroundConcurrency)?Math.max(1,Math.min(3,Math.trunc(options.backgroundConcurrency!))):2
  type Prepared={promise:Promise<{value:{imageUrl:string;originalUrl?:string;pageUrl:string};resolveMs:number}>;state:"active"|"done"|"failed"}
  const prepared=new Map<number,Prepared>();let preparationActive=0
  let current=1,preload=0,original=false,enabled=true,backgroundActive=0,foregroundActive=0,disposed=false
  let queuedForeground:{job:ReaderPrefetchJob;run:()=>void;reject:()=>void}|null=null
  const key=(page:number,mode:boolean)=>`${page}|${mode?1:0}`
  const valid=()=>!disposed&&!controller.signal.aborted&&options.isCurrent()
  const check=()=>{if(!valid()){dispose();throw new Error("Reader 会话已失效。")}}
  const desired=()=>enabled?readerPrefetchWindow(current,options.totalPages,preload):[]
  const prune=()=>{const keep=new Set([current,...desired()].map(page=>key(page,original)));for(const [id,job] of prefetchInFlight)if(job.state!=="active"&&!keep.has(id))prefetchInFlight.delete(id);const keepPages=new Set([current,...desired()]);for(const [page,item] of prepared)if(item.state!=="active"&&!keepPages.has(page))prepared.delete(page)}
  const prepare=(page:number,refresh=false):Prepared=>{
    const existing=prepared.get(page);if(existing&&!refresh)return existing
    check();preparationActive++;let item:Prepared
    const promise=Promise.resolve().then(async()=>{check();const link=options.getPage(page)||await options.loadPage(page,controller.signal);check();const started=Date.now(),value=await options.resolve(link,controller.signal,refresh);check();return{value,resolveMs:Date.now()-started}})
    item={promise,state:"active"};prepared.set(page,item);void promise.then(()=>{item.state="done"},()=>{item.state="failed"}).then(()=>{preparationActive--;if(valid()){prune();pumpPrepare();pump()}else dispose()});return item
  }
  const pumpPrepare=()=>{if(!options.prepareAhead||!valid()||!enabled)return;for(const page of desired()){if(preparationActive>=2)break;if(!prepared.has(page))prepare(page)}}
  const start=(page:number,mode:boolean,foreground:boolean,refresh=false):ReaderPrefetchJob=>{
    check();const id=key(page,mode),existing=prefetchInFlight.get(id)
    if(foreground&&queuedForeground&&queuedForeground.job!==existing){queuedForeground.reject();queuedForeground=null}
    if(existing&&!refresh){if(foreground){if(existing.value)options.observeReuse?.(page,existing.value,existing.state==="active");else void existing.resolved.then(value=>{if(valid())options.observeReuse?.(page,value,true)}).catch(()=>{});existing.foreground=true;if(existing.value)options.promote(existing.value)}return existing}
    let resolveImage!:(value:ReaderPrefetchImage)=>void,rejectResolved!:(error:Error)=>void,resolvePath!:(value:string)=>void,rejectImage!:(error:Error)=>void
    const resolved=new Promise<ReaderPrefetchImage>((yes,no)=>{resolveImage=yes;rejectResolved=no}),image=new Promise<string>((yes,no)=>{resolvePath=yes;rejectImage=no})
    const job:ReaderPrefetchJob={page,original:mode,resolved,image,foreground,state:"active"};prefetchInFlight.set(id,job)
    // Consumers may observe only image; still handle the resolver branch rejection.
    void resolved.catch(()=>{});void image.catch(()=>{})
    const run=()=>{
      if(foreground)foregroundActive++;else backgroundActive++
      void (async()=>{try{check();let value:{imageUrl:string;originalUrl?:string;pageUrl:string},resolveMs:number;if(options.prepareAhead){const result=await prepare(page,refresh).promise;value=result.value;resolveMs=result.resolveMs}else{const link=options.getPage(page)||await options.loadPage(page,controller.signal);check();const started=Date.now();value=await options.resolve(link,controller.signal,refresh);resolveMs=Date.now()-started}check();const selected={url:mode&&value.originalUrl?value.originalUrl:value.imageUrl,referer:value.pageUrl,original:value.originalUrl||""};if(!selected.url)throw new Error("图片地址为空。");job.value=selected;resolveImage(selected);const path=await options.cache(selected,controller.signal,!job.foreground,refresh,page,resolveMs);check();job.state="done";resolvePath(path)}catch(error){job.state="failed";rejectResolved(error as Error);rejectImage(error as Error)}finally{if(foreground)foregroundActive--;else backgroundActive--;if(valid()){prune();pump()}else dispose()}})()
    }
    if(foreground&&foregroundActive>=2){
      // Coalesce obsolete *unstarted* foreground requests. Started work is never
      // aborted on turns. This bounds 100 rapid jumps to 2 background + 2 front.
      queuedForeground?.reject()
      queuedForeground={job,run,reject:()=>{const error=new Error("前台定位已被新页替代。");job.state="failed";rejectResolved(error);rejectImage(error);if(prefetchInFlight.get(id)===job)prefetchInFlight.delete(id)}}
    }else run()
    return job
  }
  const dropStaleQueued=()=>{if(queuedForeground&&(queuedForeground.job.page!==current||queuedForeground.job.original!==original||!enabled)){queuedForeground.reject();queuedForeground=null}}
  const pump=()=>{if(!valid()){dispose();return}dropStaleQueued();if(queuedForeground&&foregroundActive<2){const queued=queuedForeground;queuedForeground=null;queued.run()}if(!enabled)return;for(const page of desired()){if(backgroundActive>=backgroundLimit)break;if(options.prepareAhead&&!prepared.has(page)&&preparationActive>=2)break;if(!prefetchInFlight.has(key(page,original)))start(page,original,false)}}
  function dispose(){if(disposed)return;disposed=true;controller.abort();queuedForeground?.reject();queuedForeground=null;prefetchInFlight.clear();prepared.clear()}
  return {
    prefetchInFlight,
    update(page:number,count:number,preferOriginal:boolean,active=true){if(!valid()){dispose();return}current=Math.max(1,Math.min(options.totalPages,Math.trunc(page)));preload=Math.max(0,Math.trunc(count));original=preferOriginal;enabled=active;dropStaleQueued();prune();pumpPrepare();pump()},
    foreground(page:number,preferOriginal:boolean,refresh=false){return start(page,preferOriginal,true,refresh)},
    dispose,
    preparationSnapshot:()=>({active:preparationActive,tracked:prepared.size}),
    snapshot:()=>({backgroundActive,tracked:prefetchInFlight.size,disposed})
  }
}
export type ReaderPrefetchSession=ReturnType<typeof createReaderPrefetchSession>
