import { performanceUrlIdentity,percentile,summarizePerformance,performanceRecommendation,performanceTextReport,startPerformanceRecord,setPerformanceCapture,performanceSnapshot,type PerformanceRecord } from "./imagePerformance"
function assert(value:unknown,message:string){if(!value)throw new Error(message)}
export async function runImagePerformanceTests(){
 const secret="https://node.example.org/image/private-token/path?key=SECRET",identity=performanceUrlIdentity(secret);assert(identity.host==="node.example.org"&&identity.urlHash.length===16,"identity invalid");assert(!JSON.stringify(identity).includes("SECRET"),"URL leaked")
 setPerformanceCapture(false);assert(startPerformanceRecord(secret)===null,"capture not disabled")
 const rows:PerformanceRecord[]=[];for(let i=0;i<8;i++){const handle=startPerformanceRecord(secret+String(i),{page:i+1,testConcurrency:1})!;Object.assign(handle.record,{networkStarted:true,downloadMs:1000,bytes:2000000,queueMs:100,resolveImagePageMs:50});handle.finish();rows.push({...handle.record})}
 const summary=summarizePerformance(rows,4000);assert(summary.averageMBps===2&&summary.medianMBps===2&&summary.p90DownloadMs===1000&&summary.throughputMBps===4,"summary calculations wrong")
 assert(percentile([1,2,3,4,5,6,7,8],0.9)===8,"P90 wrong")
 const groups=[1,2,3,4,6].map(concurrency=>({concurrency,records:rows,elapsedMs:4000}));assert(performanceRecommendation(groups).includes("候选图片并发：1"),"minimum efficient candidate wrong")
 assert(performanceRecommendation(groups.slice(0,4)).includes("样本不足"),"incomplete experiment recommended")
 assert(performanceRecommendation(groups.map(group=>({...group,records:rows.slice(0,5)}))).includes("样本不足"),"cancelled missing rows recommended")
 assert(performanceRecommendation(groups.map(group=>({...group,interfered:true}))).includes("样本不足"),"contaminated experiment recommended")
 const report=performanceTextReport(groups);assert(!report.includes("SECRET")&&!report.includes("private-token")&&!report.includes("https://"),"report URL leaked");assert(report.includes("精确TTFB：API不可获得"),"unsupported timings mislabeled")
 assert(rows.every(row=>row.ttfbMs===null&&row.dnsMs===null&&row.connectMs===null),"fake native timings")
 assert(performanceSnapshot().length<=320,"unbounded recorder")
 console.log("[image-performance] privacy/statistics/no-cache-recommendation guards PASS; zero network")
}
