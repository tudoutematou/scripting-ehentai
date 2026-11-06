import { imageDiagnosticSnapshot, enqueueImageTask, imageQueueIdle, imageConsumers, imageHostRequestLimit, imageTaskHost, shouldRetryImageLoad, IMAGE_MEMORY_CACHE_LIMIT, hashText, validCachedImagePayload } from "./imageLoader"
import { createImageDiagnostics, diagnosticImageHost, localImageSnapshotFile } from "./imageDiagnostics"
import { AbortController, AbortSignal } from "scripting"
import { setActiveSite } from "./account"
import { type Check, assert } from "./selfTestSupport"

export const imageChecks: Check[] = [
    { name: "image-queue.slow-host-limit-and-timeout-no-retry", run: async () => {
      assert(imageQueueIdle(),"每主机上限自测需要空闲队列");
      assert(imageHostRequestLimit("s.exhentai.org")===2&&imageHostRequestLimit("ehgt.org")>=8&&imageTaskHost("https://s.exhentai.org/a.jpg")==="s.exhentai.org","封面慢主机并发上限不正确");
      assert(!shouldRetryImageLoad({name:"ImageTimeout"})&&!shouldRetryImageLoad({name:"ImageSessionCancelled"})&&shouldRetryImageLoad({name:"Error"}),"超时封面仍会自动重试");
      const release:Array<()=>void>=[];let slow=0,fast=0;
      const slowTasks=Array.from({length:3},(_,i)=>enqueueImageTask("home-thumbnail",async()=>{slow++;await new Promise<void>(resolve=>release.push(resolve));return "slow"},undefined,`https://s.exhentai.org/t/${i}.jpg`).then(()=>"done",()=>"cancelled"));
      const other=enqueueImageTask("home-thumbnail",async()=>{fast++;return "fast"},undefined,"https://ehgt.org/t/ok.jpg");
      try{
        assert(slow===2,"s.exhentai.org 仍占用全部8路");
        assert(fast===1,"ehgt 封面被 s.exhentai.org 超时堵住");
        assert(await other==="fast","其他主机封面未完成");
      }finally{(globalThis as any).__ehentaiClearImageMemoryCache();release.forEach(resolve=>resolve());await Promise.all(slowTasks)}
    } },

    {name:"image-diagnostics.local-snapshot-boundary",run:()=>{let settled=0;const source=createImageDiagnostics(()=>0,()=>{settled++});source.begin("reader-image","https://example.invalid/private?token=SECRET").finish("success");assert(settled===1&&!JSON.stringify(source.snapshot()).includes("SECRET")&&localImageSnapshotFile().endsWith("/ehentai-image-diagnostics-v1.json"),"自动诊断保存包含敏感 URL 或未在结算后触发")}},
    {name:"image-diagnostics.hung-body-after-abort",run:async()=>{
      assert(imageQueueIdle(),"挂起诊断验证需要空闲队列");const owner=new AbortController();let release!:()=>void;
      const task=enqueueImageTask("home-thumbnail",async(_ms,signal,trace)=>{trace.step("body");trace.timeout();await new Promise<void>(resolve=>{release=resolve});return "late"},owner.signal,"https://ehgt.org/test.jpg").catch(()=>"cancelled");
      try{owner.abort();const waiting=imageDiagnosticSnapshot(),record=waiting.pending[waiting.pending.length-1];assert(waiting.active===1&&record.phase==="body"&&record.timeoutAt!==null&&record.cancelAt!==null&&record.outcome===null,"取消后的真实挂起任务未被诊断识别");release();await task;const done=imageDiagnosticSnapshot();assert(done.active===0&&done.recent[0].id===record.id&&done.recent[0].outcome==="cancelled","真正结束后诊断或槽位未更新")}
      finally{release();await task}
    }},

    {name:"image-diagnostics.phase-timeout-and-privacy",run:()=>{
      let clock=0;const diagnostics=createImageDiagnostics(()=>clock),trace=diagnostics.begin("home-thumbnail","https://user:secret@ehgt.org/private/image.jpg?token=SECRET",true);
      clock=10;trace.step("started");clock=20;trace.step("fetch");clock=50;trace.response(200,"image/webp;private=SECRET");trace.step("body");clock=100;trace.timeout();clock=110;trace.cancel();clock=150;
      const captured=diagnostics.snapshot(),item=captured.pending[0];assert(item.phase==="body"&&item.timeoutWaitMs===50&&item.cancelWaitMs===40&&item.queueMs===10&&item.phaseMs===100,"超时/取消覆盖了停滞阶段或耗时错误");
      assert(!JSON.stringify(captured).includes("SECRET")&&!JSON.stringify(captured).includes("private")&&item.host==="ehgt.org","诊断保留了URL或响应头原文");
      clock=200;trace.finish("cancelled");trace.finish("failed");const ended=diagnostics.snapshot();assert(ended.pending.length===0&&ended.recent.length===1&&ended.recent[0].outcome==="cancelled"&&ended.recent[0].timeoutWaitMs===100,"结算诊断重复或未保留超时后等待");assert(captured.pending[0].ended===null,"快照被后续记录篡改");
      assert(diagnosticImageHost("https://secret.host.invalid/path")==="other"&&diagnosticImageHost("bad")==="unknown","域名未白名单化");
    }},
    {name:"image-diagnostics.bounded-memory",run:()=>{
      const diagnostics=createImageDiagnostics(()=>0);const tasks=Array.from({length:520},()=>diagnostics.begin("home-thumbnail"));assert(diagnostics.snapshot().pending.length===512&&diagnostics.snapshot().dropped===8,"诊断无限增长");tasks.forEach(task=>task.finish("success"));const final=diagnostics.snapshot();assert(final.pending.length===0&&final.recent.length===80,"完成记录不受限或pending泄漏");
    }},
    { name: "image-cache.shared-consumers", run: async () => {
      let unused=0,resolveTask!:(value:string)=>void;const task=new Promise<string>(resolve=>{resolveTask=resolve}),consume=imageConsumers(task,()=>unused++);
      const a=new AbortController(),b=new AbortController();const first=consume(a.signal).catch(()=>"cancelled"),second=consume(b.signal);a.abort();assert(await first==="cancelled"&&unused===0,"取消一个消费者中断了共享封面");resolveTask("cached");assert(await second==="cached","剩余消费者未取得封面");b.abort();assert(unused===0,"完成后错误取消缓存");
      let finish!:(value:string)=>void;const pending=new Promise<string>(resolve=>{finish=resolve}),join=imageConsumers(pending,()=>unused++),c=new AbortController(),last=join(c.signal).catch(()=>"cancelled");c.abort();c.abort();assert(await last==="cancelled"&&Number(unused)===1,"最后消费者退出未取消任务或重复取消");finish("late");
      const d=new AbortController();let done!:(value:string)=>void;const retained=imageConsumers(new Promise<string>(resolve=>{done=resolve}),()=>unused++),background=retained(),scoped=retained(d.signal).catch(()=>"cancelled");d.abort();await scoped;assert(Number(unused)===1,"缩略图卸载误伤无signal的详情/预加载消费者");done("ok");assert(await background==="ok","共享非UI调用未完成");
    } },
    { name: "image-queue.consumer-cancel", run: async () => {
      assert(imageQueueIdle(),"图片队列自测需要空闲队列");
      const release:Array<()=>void>=[],controllers=Array.from({length:9},()=>new AbortController());let starts=0;const signals:AbortSignal[]=[];
      const tasks=controllers.map(controller=>(enqueueImageTask as any)("home-thumbnail",async(_ms:number,signal:AbortSignal)=>{starts++;signals.push(signal);await new Promise<void>(resolve=>release.push(resolve));},controller.signal).then(()=>"done",()=>"cancelled"));
      try{controllers.forEach(controller=>controller.abort());assert(starts===8&&signals.every(signal=>signal.aborted),"离开旧列表没有中止旧封面");release.forEach(resolve=>resolve());const results=await Promise.all(tasks);assert(starts===8&&results.every(value=>value==="cancelled"),"旧排队封面仍被下载");}
      finally{(globalThis as any).__ehentaiClearImageMemoryCache();release.forEach(resolve=>resolve());await Promise.all(tasks)}
    } },
    { name: "image-queue.cancel-obsolete-session", run: async () => {
      assert(imageQueueIdle(),"请在图片请求结束后运行队列自测");
      let started=0; const release:Array<()=>void>=[],signals:AbortSignal[]=[];
      const tasks=Array.from({length:10},()=>enqueueImageTask("home-thumbnail",async(_queueMs,signal)=>{signals.push(signal);started++;if(started<=8)await new Promise<void>(resolve=>release.push(resolve));return "done"}).then(()=>"done",()=>"cancelled"));
      try{
      assert(started===8,"图片并发超过8路");
      const api={get:()=>null,set:()=>true};setActiveSite("e",api);
      assert(signals.length===8&&signals.every(signal=>signal.aborted),"会话切换未取消8个在途请求");
      let newStarted=false;const next=enqueueImageTask("home-thumbnail",async()=>{newStarted=true;return "new"}).catch(()=>"cancelled");
      assert(!newStarted,"旧请求未结束就释放槽位，导致超过8路");
      release.forEach(resolve=>resolve());
      const results=await Promise.all(tasks);
      assert(started===8&&results.slice(8).every(x=>x==="cancelled"),"切账号/清缓存后旧排队图片仍被启动");
      assert(await next==="new","取消后新图片无法开始");
      }finally{(globalThis as any).__ehentaiClearImageMemoryCache();release.forEach(resolve=>resolve());await Promise.all(tasks)}
    } },
    { name: "image-cache.payload-validation", run: () => { const data=(bytes:number[])=>({toUint8Array:()=>new Uint8Array(bytes)});assert(validCachedImagePayload("image/jpeg",data([255,216,255,1])),"图片缓存拒绝了有效 JPEG");assert(validCachedImagePayload("image/gif",data([71,73,70,56,57,97])),"图片缓存拒绝了有效 GIF 封面");assert(validCachedImagePayload("application/octet-stream",data([255,216,255,1])),"无 image Content-Type 的 JPEG 被拒绝");assert(!validCachedImagePayload("text/html",data([60,104,116,109,108])),"图片缓存接受了 HTTP 200 HTML");assert(!validCachedImagePayload("text/html",data([255,216,255,1])),"HTML 类型的 JPEG 魔数被接受");assert(!validCachedImagePayload("image/png",data([])),"图片缓存接受了空图片");assert(IMAGE_MEMORY_CACHE_LIMIT>=100&&IMAGE_MEMORY_CACHE_LIMIT<=1000,"图片内存缓存上限未设置");assert(hashText("a").length>=16&&hashText("a")!==hashText("b"),"图片缓存 hash 过短或未区分不同 URL") } },

]
