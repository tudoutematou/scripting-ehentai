import { AbortController } from "scripting"
import { enqueueImageTask,imageQueueIdle,imageRequestCacheKey,promoteReaderImage } from "./GalleryFlow"
function assert(value:unknown,message:string){if(!value)throw new Error(message)}
function deferred(){let resolve!:()=>void;return {promise:new Promise<void>(yes=>{resolve=yes}),release:()=>resolve()}}
async function turns(){for(let i=0;i<80;i++)await Promise.resolve()}
export async function runReaderImageQueueTests(){
  assert(imageQueueIdle(),"queue test requires idle queue")
  const gates:ReturnType<typeof deferred>[]=[];const owners:AbortController[]=[];const tasks:Promise<unknown>[]=[];const started:string[]=[]
  const add=(name:string,priority:number,url=`https://queue-test.invalid/${name}`)=>{const gate=deferred(),owner=new AbortController();gates.push(gate);owners.push(owner);const task=enqueueImageTask("reader-image",async()=>{started.push(name);await gate.promise;return name},owner.signal,url,false,priority,imageRequestCacheKey(url,"reader-image"));void task.catch(()=>{});tasks.push(task);return {gate,owner,task}}
  try{
    for(let i=0;i<8;i++)add(`hold-${i}`,0)
    const background=add("background",0),cover=add("cover",3),front=add("front",5)
    await turns();assert(started.length===8,"blocked queue did not hold 8 slots")
    gates[0].release();await turns();assert(started[8]==="front","foreground did not outrank cover/background")
    const url="https://queue-test.invalid/promoted",promoted=add("promoted",0,url)
    promoteReaderImage(url);gates[1].release();await turns();assert(started[9]==="promoted","pending prefetch promotion did not outrank cover")
    // Abort must not release a running request before work actually settles.
    promoted.owner.abort();await turns();assert(started.length===10,"aborted active request released slot too early")
    promoted.gate.release();await turns();assert(started[10]==="cover","slot not released after cancelled work settled")
    background.owner.abort();await turns();assert(!started.includes("background"),"cancelled pending work started")
    front.gate.release();cover.gate.release()
  }finally{for(const owner of owners)owner.abort();for(const gate of gates)gate.release();await Promise.allSettled(tasks);await turns()}
  assert(imageQueueIdle(),"queue did not become idle after cleanup")
  console.log("[reader-image-queue] foreground priority / promote / abort settlement PASS; no network")
}
