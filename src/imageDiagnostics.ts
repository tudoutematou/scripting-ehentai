// Local-only, bounded in-memory instrumentation. Never retains URLs, headers or errors.
export const IMAGE_DIAGNOSTIC_BUILD = "封面诊断 D1 · 2026-09-12"
export type ImagePhase = "queued" | "started" | "mkdir" | "cache-check" | "fetch" | "body" | "validate" | "write" | "report"
type Outcome = "success" | "failed" | "cancelled"
const noTrace={id:0,step:(_phase:ImagePhase)=>{},cancel:()=>{},timeout:()=>{},cacheHit:()=>{},cacheError:()=>{},failure:()=>{},response:(_status:number,_mime:string)=>{},bytes:(_bytes:number)=>{},finish:(_outcome:Outcome)=>{}}
const stages = ["home-thumbnail", "detail-cover", "preview-thumbnail", "reader-image"]
export function diagnosticImageHost(url:string){try{const host=new URL(url).hostname.toLowerCase();return host==="ehgt.org"||host.endsWith(".ehgt.org")?"ehgt.org":host==="s.exhentai.org"?host:host==="exhentai.org"?host:host==="e-hentai.org"?host:"other"}catch{return "unknown"}}
type RecordEntry = {id:number;stage:string;host:string;retry:boolean;phase:ImagePhase;created:number;changed:number;started:number|null;ended:number|null;cancelAt:number|null;timeoutAt:number|null;status:number;mime:string;bytes:number;cacheHit:boolean;cacheError:boolean;outcome:Outcome|null;failurePhase:ImagePhase|null;durations:Partial<Record<ImagePhase,number>>}
export function createImageDiagnostics(now=()=>Date.now()){
  let sequence=0,dropped=0,memoryHits=0,sharedHits=0
  const pending=new Map<number,RecordEntry>(),history:RecordEntry[]=[]
  const countReuse=(shared:boolean)=>{if(shared)sharedHits++;else memoryHits++}
  function begin(stage:string,url="",retry=false){
    const t=now(),id=++sequence
    if(pending.size>=512){dropped++;return noTrace}
    const item:RecordEntry={id,stage:stages.includes(stage)?stage:"other",host:diagnosticImageHost(url),retry,phase:"queued",created:t,changed:t,started:null,ended:null,cancelAt:null,timeoutAt:null,status:0,mime:"unknown",bytes:0,cacheHit:false,cacheError:false,outcome:null,failurePhase:null,durations:{}}
    // Do not change the actual queue when diagnostics reach capacity.
    pending.set(id,item)
    const step=(phase:ImagePhase)=>{if(item.ended!==null)return;const at=now();item.durations[item.phase]=(item.durations[item.phase]||0)+Math.max(0,at-item.changed);item.phase=phase;item.changed=at;if(phase==="started")item.started=at}
    return {
      id,step,failure:()=>{item.failurePhase=item.phase},
      cancel:()=>{if(item.cancelAt===null)item.cancelAt=now()},
      timeout:()=>{if(item.timeoutAt===null)item.timeoutAt=now()},
      cacheHit:()=>{item.cacheHit=true},cacheError:()=>{item.cacheError=true},
      response:(status:number,mime:string)=>{item.status=Number.isFinite(status)?Math.max(0,Math.min(599,Math.trunc(status))):0;const type=String(mime).split(";")[0].trim().toLowerCase();item.mime=["image/jpeg","image/png","image/gif","image/webp","image/avif","text/html","application/octet-stream"].includes(type)?type:"other"},
      bytes:(bytes:number)=>{item.bytes=Number.isFinite(bytes)?Math.max(0,bytes):0},
      finish:(outcome:Outcome)=>{if(item.ended!==null)return;const at=now();item.durations[item.phase]=(item.durations[item.phase]||0)+Math.max(0,at-item.changed);item.ended=at;item.outcome=outcome;pending.delete(id);history.push(item);if(history.length>80)history.shift()},
    }
  }
  function snapshot(){const at=now();const copy=(item:RecordEntry)=>{const end=item.ended??at;return {...item,durations:{...item.durations},elapsedMs:Math.max(0,end-item.created),phaseMs:Math.max(0,end-item.changed),queueMs:Math.max(0,(item.started??end)-item.created),cancelWaitMs:item.cancelAt===null?null:Math.max(0,end-item.cancelAt),timeoutWaitMs:item.timeoutAt===null?null:Math.max(0,end-item.timeoutAt)}};return{capturedAt:at,total:sequence,dropped,memoryHits,sharedHits,pending:[...pending.values()].map(copy),recent:history.slice().reverse().map(copy)}}
  return {begin,snapshot,countReuse}
}
export type ImageTrace = ReturnType<ReturnType<typeof createImageDiagnostics>["begin"]>
export const imageDiagnostics=createImageDiagnostics()
