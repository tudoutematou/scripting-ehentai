import { foregroundImageLoad } from "./readerRecovery"
function assert(c:unknown,m:string){if(!c)throw new Error(m)}
async function main(){
  const failed=Promise.reject(new Error("HTTP 503"));failed.catch(()=>{})
  const job={image:failed,value:{url:"https://x/a.jpg",referer:"https://x/s/1"}}
  let calls=0
  const fresh=await foregroundImageLoad(job,true,async v=>{calls++;return "/tmp/"+v.url.length})
  assert(calls===1&&fresh.startsWith("/tmp/"),"refresh=true 必须重新请求")
  assert(foregroundImageLoad(job,false,async()=>{calls++;return ""})===failed&&calls===1,"refresh=false 应复用当前任务")
  console.log("readerRecoveryTest 2/2 passed")
}
main().catch(e=>{console.error(e);process.exit(1)})
