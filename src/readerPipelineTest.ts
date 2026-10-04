import {createReaderPrefetchSession} from "./readerPrefetch"
function assert(value:unknown,message:string){if(!value)throw new Error(message)}
function gate<T>(){let resolve!:(value:T)=>void,reject!:(error:Error)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no});void promise.catch(()=>{});return {promise,resolve,reject}}
async function turns(){for(let i=0;i<100;i++)await Promise.resolve()}
export async function runReaderPipelineTests(){
 const resolves:number[]=[],downloads:number[]=[],aborts:number[]=[],cacheGates=new Map<number,ReturnType<typeof gate<string>>>(),missing:number[]=[]
 const session=createReaderPrefetchSession({totalPages:200,prepareAhead:true,backgroundConcurrency:3,isCurrent:()=>true,getPage:page=>page===7?undefined:{index:page,pageUrl:String(page)},loadPage:async page=>{missing.push(page);return{index:page,pageUrl:String(page)}},resolve:async link=>{resolves.push(link.index);return{imageUrl:"virtual:"+link.index,originalUrl:"original:"+link.index,pageUrl:link.pageUrl}},cache:async(value,signal)=>{const page=Number(value.url.split(":")[1]);downloads.push(page);const pending=gate<string>();cacheGates.set(page,pending);const abort=()=>{aborts.push(page);pending.reject(new Error("cancelled"))};signal.addEventListener("abort",abort);try{return await pending.promise}finally{signal.removeEventListener("abort",abort)}},promote:()=>{}})
 try{
  const current=session.foreground(1,false);session.update(1,6,false);await turns()
  assert(resolves.length===7&&[1,2,3,4,5,6,7].every(page=>resolves.includes(page)),"window addresses waited for blocked image completion")
  assert(downloads.length===4&&session.snapshot().backgroundActive===3,"background image limit not 3")
  assert(missing.length===1&&missing[0]===7,"missing PageLink was not filled")
  const shared=session.foreground(2,false);assert(shared===session.prefetchInFlight.get("2|0"),"foreground lost shared image job")
  session.update(2,6,false);await turns();assert(resolves.filter(page=>page===3).length===1&&resolves.includes(8),"window shift did not only extend address edge")
  assert(!aborts.length,"turn cancelled work")
  const before=resolves.length;session.update(2,6,false,false);cacheGates.get(2)!.resolve("path2");await turns();assert(resolves.length===before,"paused session prepared more addresses")
  session.dispose();await turns();assert(session.preparationSnapshot().tracked===0&&session.snapshot().tracked===0,"dispose retained caches")
  await Promise.allSettled([current.image,shared.image])
 }finally{session.dispose();for(const pending of cacheGates.values())pending.resolve("cleanup");await turns()}
 const resolveGate=gate<{imageUrl:string;pageUrl:string}>(),started:number[]=[]
 const stress=createReaderPrefetchSession({totalPages:1000,prepareAhead:true,backgroundConcurrency:3,isCurrent:()=>true,getPage:page=>({index:page,pageUrl:String(page)}),loadPage:async page=>({index:page,pageUrl:String(page)}),resolve:async link=>{started.push(link.index);return resolveGate.promise},cache:async()=>"path",promote:()=>{}})
 try{for(let page=1;page<=100;page++){stress.update(page,6,false);stress.foreground(page,false);await turns()}assert(started.length<=7&&stress.snapshot().tracked<=6,"100 rapid turns accumulated resolve/image tasks");stress.dispose();resolveGate.resolve({imageUrl:"virtual:done",pageUrl:"virtual"});await turns();assert(stress.snapshot().disposed,"stress exit failed")}finally{stress.dispose();resolveGate.resolve({imageUrl:"cleanup",pageUrl:"cleanup"})}
 console.log("[reader-pipeline] ahead resolution while images blocked / image3 / reuse / pause / fill / exit / stress100 PASS")
}
