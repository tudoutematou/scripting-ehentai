export type SharedAbortSignal={readonly aborted:boolean;addEventListener(type:"abort",listener:()=>void,options?:any):void;removeEventListener(type:"abort",listener:()=>void):void}
// A caller releases only its interest; the underlying task stops when nobody needs it.
export function sharedRequestConsumers<T>(task:Promise<T>,onUnused:()=>void,cancellation:()=>Error){
  let count=0,settled=false
  void task.then(()=>{settled=true},()=>{settled=true})
  return(signal?:SharedAbortSignal):Promise<T>=>{count++;return new Promise((resolve,reject)=>{let finished=false;const finish=()=>{if(finished)return false;finished=true;signal?.removeEventListener("abort",abort);count--;return true};const abort=()=>{if(!finish())return;reject(cancellation());if(!settled&&count===0)onUnused()};signal?.addEventListener("abort",abort,{once:true});task.then(value=>{if(finish())resolve(value)},error=>{if(finish())reject(error)});if(signal?.aborted)abort()})}
}
