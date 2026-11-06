
export function workTitle(title?:string){const value=String(title||"").trim();return value||"未命名画廊"}
export function workTitleFont(){return "headline" as const}
export function workTitleLines(layout:"row"|"card"|"strip"="card"){return layout==="row"?3:2}
export function readingProgressLabel(page:number,total=0){const current=Math.max(1,Math.trunc(Number(page)||1)),pages=Math.max(0,Math.trunc(Number(total)||0));return pages>0?`阅读进度 · 第 ${current} 页 / ${pages}`:`阅读进度 · 第 ${current} 页`}
export function continueReadingTitle(page:number|null|undefined){return page?`继续阅读 · 第 ${page} 页`:"开始阅读"}
export function readerPageCaption(page:number){return `第 ${Math.max(1,Math.trunc(Number(page)||1))} 页`}
export function historyStatusLabel(){return "历史记录"}
export function localBookmarkStatusLabel(){return "本地书签"}
export function downloadPhaseLabel(status:string,failedCount=0){if(status==="completed")return "已完成";if(status==="downloading")return "正在下载";if(status==="queued")return "排队中";if(status==="failed"||failedCount>0)return "需要重试";if(status==="cancelled")return "已停止，可继续";return "已暂停，可继续"}
export function libraryDownloadNote(done:number,target:number,status:string,failedCount=0){return `下载 ${Math.max(0,Math.trunc(done))}/${Math.max(0,Math.trunc(target))} 页 · ${downloadPhaseLabel(status,failedCount)}`}
