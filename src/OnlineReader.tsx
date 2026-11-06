import { cachedImagePath, promoteReaderImage, imageRequestOptions } from "./imageLoader"
import { runGalleryPerformance } from "./imagePerformanceRunner"
import { createReaderRecovery } from "./readerRecovery"
import { startPerformanceRecord } from "./imagePerformance"
import { ImagePerformanceScene } from "./ImagePerformanceUI"
import { createReaderPrefetchSession, type ReaderPrefetchSession, type ReaderPrefetchJob } from "./readerPrefetch"
import { AbortSignal, Button, GeometryReader, HStack, LazyVStack, Navigation, ProgressView, Rectangle, ScrollView, Text, VStack, ZStack, useEffect, useRef, useState } from "scripting"
import { GalleryPageLink, GallerySummary, resolveImagePage, userSafeError } from "./ehentai"
import { loadPreferences, type ReaderPreferences, savePreferences, updateReadingProgress } from "./libraryStore"
import { ErrorText } from "./StateView"
import { type ReaderTapAction, type ReaderOverlay, readerOverlayAfterAction, readerOverlayAfterAutoPlay, readerPageNumber, readerTargetGalleryPage, readerInventoryGap, readerNavigationRequestIsCurrent, readerViewportFrame, readerInitialGalleryPage } from "./readerModel"
import { ReaderQuickSettings, ReaderProgressOverlay, ReaderTapZones, ReaderZoomSurface } from "./ReaderUI"
import { CachedReaderImage, ContinuousReaderImage } from "./ReaderImages"
import { useViewScope } from "./viewScope"
import { galleryIdentity, mergePreviewPages } from "./galleryIdentity"
import { previewNeedsMore } from "./previewModel"

export function ReaderView({pages:initialPages,startIndex,startPage,summary,totalPages=initialPages.length,onNeedMore,onLoadRange}:{pages:GalleryPageLink[];startIndex:number;startPage?:number;summary:GallerySummary;totalPages?:number;onNeedMore?:()=>void;onLoadRange?:(first:number,last:number,signal?:AbortSignal)=>Promise<GalleryPageLink[]>}) {
  const dismissReader=Navigation.useDismiss(),scope=useViewScope(galleryIdentity(summary))
  const [pages,setPages]=useState(()=>mergePreviewPages([],initialPages)),pagesRef=useRef<GalleryPageLink[]>(mergePreviewPages([],initialPages))
  const [currentGalleryIndex,publishCurrentGalleryIndex]=useState(()=>readerInitialGalleryPage(initialPages,startIndex,startPage))
  const visiblePage=useRef(currentGalleryIndex),loadedPages=useRef<Set<string>>(new Set());
  const recordVisiblePage=(page:GalleryPageLink)=>{if(scope.isCurrent()&&visiblePage.current===page.index&&loadedPages.current.has(page.pageUrl))void updateReadingProgress(summary,page.index-1).catch(()=>{})}
  const setCurrentGalleryIndex=(page:number)=>{if(!scope.isCurrent())return;visiblePage.current=page;publishCurrentGalleryIndex(page);const loaded=pagesRef.current.find(item=>item.index===page);if(loaded)recordVisiblePage(loaded)}
  const imageLoaded=(page:GalleryPageLink)=>{if(!scope.isCurrent())return;loadedPages.current.add(page.pageUrl);recordVisiblePage(page)}
  const index=Math.max(0,pages.findIndex(page=>page.index===currentGalleryIndex)),current=pages[index],pageNumber=readerPageNumber(current,index)
  const [resolved,setResolved]=useState<{url:string;referer:string;original:string}|null>(null),[loading,setLoading]=useState(true),[pageLoading,setPageLoading]=useState(false),[jumpError,setJumpError]=useState<{page:number;message:string}|null>(null),[error,setError]=useState(""),[retry,setRetry]=useState(0),retryPage=useRef<number|null>(null),[prefs,setPrefs]=useState<ReaderPreferences|null>(null),[overlay,setOverlay]=useState<ReaderOverlay>("none"),[imageFailed,setImageFailed]=useState(false),[imageFailureMessage,setImageFailureMessage]=useState(""),recovery=useRef<ReturnType<typeof createReaderRecovery>|null>(null),[autoPlaying,setAutoPlaying]=useState(false),[zoomed,setZoomed]=useState(false)
  if(!recovery.current)recovery.current=createReaderRecovery()
  const continuous=prefs?.layout==="continuous",fit=prefs?.fit||"width",navigationEpoch=useRef(0),preferenceEpoch=useRef(0)
  useEffect(()=>{const next=mergePreviewPages(pagesRef.current,initialPages);pagesRef.current=next;setPages(next)},[initialPages])
  const inventoryInflight=useRef(new Map<string,Promise<GalleryPageLink[]>>())
  const ensurePreviewChunk=async(page:number,signal:AbortSignal=scope.signal)=>{
    if(!onLoadRange)throw new Error("目标页尚未加载，请重试。")
    const chunk=Math.floor((Math.max(1,Math.trunc(page))-1)/20),key=String(chunk),existing=inventoryInflight.current.get(key)
    if(existing)return existing
    const first=chunk*20+1,last=Math.min(Math.max(1,totalPages),first+19)
    const task=onLoadRange(first,last,signal).then(loaded=>{if(!scope.isCurrent())return pagesRef.current;const next=mergePreviewPages(pagesRef.current,loaded);pagesRef.current=next;setPages(next);return next}).finally(()=>{if(inventoryInflight.current.get(key)===task)inventoryInflight.current.delete(key)})
    inventoryInflight.current.set(key,task)
    return task
  }
  const latestScope=useRef(scope);latestScope.current=scope
  const ensureChunkRef=useRef(ensurePreviewChunk);ensureChunkRef.current=ensurePreviewChunk
  const sessionRef=useRef<{signal:AbortSignal;session:ReaderPrefetchSession}|null>(null)
  if(!sessionRef.current||sessionRef.current.signal!==scope.signal){
    sessionRef.current?.session.dispose()
    const ownerSignal=scope.signal,session=createReaderPrefetchSession({totalPages,prepareAhead:true,backgroundConcurrency:3,isCurrent:()=>!ownerSignal.aborted&&latestScope.current.isCurrent(),getPage:page=>pagesRef.current.find(link=>link.index===page),loadPage:async(page,signal)=>{const loaded=await ensureChunkRef.current(page,signal);const link=loaded.find(item=>item.index===page);if(!link)throw new Error(`未读取到第 ${page} 页。`);return link},resolve:(link,signal,refresh)=>resolveImagePage(link.pageUrl,refresh,signal),cache:(value,signal,background,refresh,page,resolveMs)=>cachedImagePath(value.url,"reader-image",{...imageRequestOptions(value.url,value.referer),signal,prefetch:background,galleryPage:page,resolveMs},refresh),promote:value=>promoteReaderImage(value.url),observeReuse:(page,value,pending)=>{if(value){const trace=startPerformanceRecord(value.url,{page,foreground:true});if(trace){trace.record.reusedPromise=true;trace.record.cacheHit=!pending;trace.finish()}}}})
    sessionRef.current={signal:ownerSignal,session}
  }
  const session=sessionRef.current.session
  const [performanceShown,setPerformanceShown]=useState(false)
  useEffect(()=>{const cancel=()=>session.dispose();scope.signal.addEventListener("abort",cancel);return()=>{scope.signal.removeEventListener("abort",cancel);session.dispose()}},[session,scope.signal])
  const [foregroundJob,setForegroundJob]=useState<ReaderPrefetchJob|null>(null)
  const foregroundLoader=useRef<{job:ReaderPrefetchJob|null;load:(refresh:boolean)=>Promise<string>}|null>(null)
  if(foregroundLoader.current?.job!==foregroundJob)foregroundLoader.current={job:foregroundJob,load:()=>foregroundJob!.image}
  const goToGalleryPage=async(target:number)=>{
    if(!scope.isCurrent())return
    const page=Math.max(1,Math.min(Math.max(1,totalPages),Math.trunc(target))),request=++navigationEpoch.current
    const isCurrent=()=>scope.isCurrent()&&readerNavigationRequestIsCurrent(request,navigationEpoch.current)
    // A newer cached-page jump owns the loading flag too, even though it needs no request.
    setPageLoading(false);setJumpError(null)
    if(pagesRef.current.some(item=>item.index===page)){setCurrentGalleryIndex(page);return}
    if(!onLoadRange){onNeedMore?.();setJumpError({page,message:"目标页尚未加载，请重试。"});return}
    setPageLoading(true)
    try{
      const next=await ensurePreviewChunk(page)
      if(!isCurrent())return
      if(!next.some(item=>item.index===page))throw new Error(`未读取到第 ${page} 页。`)
      setCurrentGalleryIndex(page)
    }catch(caught){if(isCurrent()){setAutoPlaying(false);setJumpError({page,message:caught instanceof Error?caught.message:"页码跳转失败，请重试。"})}}
    finally{if(isCurrent())setPageLoading(false)}
  }
  useEffect(()=>setZoomed(false),[currentGalleryIndex])
  useEffect(()=>{const request=preferenceEpoch.current;void loadPreferences().then(value=>{if(scope.isCurrent()&&request===preferenceEpoch.current)setPrefs(value)}).catch(()=>{if(scope.isCurrent()){setError("阅读设置读取失败，请返回后重试。");setLoading(false)}})},[scope.signal])
  useEffect(()=>{if(!autoPlaying||continuous||pageLoading||overlay==="settings")return;if(pageNumber>=totalPages){setAutoPlaying(false);return}const timer=setTimeout(()=>void goToGalleryPage(readerTargetGalleryPage(pageNumber,totalPages,"next")),(prefs?.autoPageSeconds||8)*1000);return()=>clearTimeout(timer)},[autoPlaying,continuous,pageLoading,overlay,pageNumber,pages.length,totalPages,prefs?.autoPageSeconds])
  useEffect(()=>{if(continuous){setAutoPlaying(false);setOverlay("none")}},[continuous])
  useEffect(()=>{if(!onLoadRange)return;const gap=readerInventoryGap(pagesRef.current.map(page=>page.index),currentGalleryIndex,totalPages,20);if(!gap)return;void ensurePreviewChunk(gap.first).catch(()=>{})},[currentGalleryIndex,pages.length,totalPages,scope.signal])
  useEffect(()=>{if(continuous||!prefs)return;const refresh=retry>0&&retryPage.current===currentGalleryIndex;retryPage.current=null;let cancelled=false;setImageFailed(false);setLoading(true);setResolved(null);setForegroundJob(null);setError("");try{const job=session.foreground(currentGalleryIndex,Boolean(prefs?.preferOriginal),refresh);setForegroundJob(job);void job.resolved.then(value=>{if(!cancelled&&scope.isCurrent())setResolved(value)}).catch(caught=>{if(!cancelled&&scope.isCurrent()){setAutoPlaying(false);setError(userSafeError(caught,"图片地址解析失败，请重试"))}}).finally(()=>{if(!cancelled&&scope.isCurrent())setLoading(false)})}catch{if(scope.isCurrent()){setError("阅读会话已失效，请返回后重试。");setLoading(false)}}return()=>{cancelled=true}},[currentGalleryIndex,retry,prefs?.preferOriginal,continuous,session,scope.signal])
  // Moving the window never aborts existing work; settled entries block requeue.
  useEffect(()=>{session.update(currentGalleryIndex,prefs?.preload||0,Boolean(prefs?.preferOriginal),Boolean(prefs)&&!continuous&&!performanceShown)},[currentGalleryIndex,prefs?.preload,prefs?.preferOriginal,continuous,performanceShown,session,scope.signal])
  const persist=(update:Partial<ReaderPreferences>)=>{const request=++preferenceEpoch.current;void savePreferences(update).then(value=>{if(scope.isCurrent()&&request===preferenceEpoch.current)setPrefs(value)}).catch(()=>{if(scope.isCurrent()&&request===preferenceEpoch.current)setError("阅读设置保存失败。")})};
  const act=(action:ReaderTapAction)=>{setOverlay(current=>readerOverlayAfterAction(current,action));if(action==="previous"||action==="next"){const target=readerTargetGalleryPage(pageNumber,totalPages,action);if(target!==pageNumber)void goToGalleryPage(target)}}
  const toggleAuto=()=>setAutoPlaying(playing=>{const next=!playing;setOverlay(current=>readerOverlayAfterAutoPlay(next,current));return next})
  const settingsSheet={isPresented:overlay==="settings",onChanged:(shown:boolean)=>{if(!shown)setOverlay("none")},content:prefs?<ReaderQuickSettings prefs={prefs} onChange={persist}/>:<ProgressView/>}
  if(continuous)return <ScrollView scrollPosition={{value:current?.id||null,onChanged:id=>{const page=pages.find(page=>page.id===id);if(page)setCurrentGalleryIndex(page.index)},anchor:"top"}} navigationTitle={current?`${current.index} / ${totalPages}`:`连续阅读 · ${totalPages} 页`} navigationBarTitleDisplayMode="inline" sheet={settingsSheet} toolbar={{topBarTrailing:<Button title="阅读设置" systemImage="textformat.size" action={()=>setOverlay("settings")}/>}}><LazyVStack scrollTargetLayout alignment="center" spacing={16} padding>{pages.map((page,pageIndex)=><ContinuousReaderImage key={page.id} page={page} preferOriginal={Boolean(prefs?.preferOriginal)} fit={fit} onTap={()=>setOverlay("settings")} onLoaded={()=>imageLoaded(page)} onAppear={()=>{if(onNeedMore&&previewNeedsMore(pages.length,totalPages,pageIndex))onNeedMore()}}/>)}</LazyVStack></ScrollView>
  return <GeometryReader>{proxy=>{const viewport=readerViewportFrame(fit,proxy.size.width,proxy.size.height);return <ScrollView navigationTitle={`${pageNumber} / ${totalPages}`} navigationBarTitleDisplayMode="inline" navigationBarBackButtonHidden toolbar={{topBarLeading:<Button title="返回" systemImage="chevron.left" action={dismissReader}/>,topBarTrailing:<HStack><Button title="图片性能测试" systemImage="waveform.path.ecg" labelStyle="iconOnly" action={()=>{setAutoPlaying(false);setPerformanceShown(true)}}/><Button title="阅读设置" systemImage="textformat.size" action={()=>setOverlay("settings")}/></HStack>}} sheet={settingsSheet} navigationDestination={{isPresented:performanceShown,onChanged:setPerformanceShown,content:<ImagePerformanceScene run={(count,signal,progress)=>runGalleryPerformance(currentGalleryIndex,totalPages,Boolean(prefs?.preferOriginal),(first,last,rangeSignal)=>{if(!onLoadRange)throw new Error("范围加载不可用");return onLoadRange(first,last,rangeSignal)},session,count,signal,progress)}/>}}><VStack alignment="center" spacing={0} frame={{maxWidth:"infinity"}}><ZStack frame={viewport}><ReaderZoomSurface key={currentGalleryIndex} viewport={viewport} direction={prefs?.direction||"ltr"} onZoomedChanged={setZoomed} onSwipe={action=>{if(overlay==="none")act(action)}} tapZones={<ReaderTapZones direction={prefs?.direction||"ltr"} disabled={zoomed||overlay==="settings"} onAction={action=>overlay==="progress"?setOverlay("none"):act(action)}/>}><ZStack frame={viewport}><Rectangle fill="rgba(0,0,0,0.001)" frame={viewport}/>{resolved?<CachedReaderImage url={resolved.url} referer={resolved.referer} fit={fit} onFailure={caught=>{setAutoPlaying(false);if(scope.isCurrent()&&recovery.current!.recoverImage(currentGalleryIndex,Boolean(prefs?.preferOriginal),caught)){retryPage.current=currentGalleryIndex;setRetry(v=>v+1);return}setImageFailureMessage(userSafeError(caught,"图片加载失败或超时，请稍后重试"));setImageFailed(true)}} load={foregroundJob&&resolved.url===foregroundJob.value?.url?foregroundLoader.current?.load:undefined} onLoaded={()=>{if(current)imageLoaded(current)}}/>:loading||pageLoading?<ProgressView title={pageLoading?"正在定位页码…":"解析图片地址…"} progressViewStyle="circular"/>:error?<ErrorText message={error}/>:null}</ZStack></ReaderZoomSurface>{overlay==="progress"?<VStack frame={{maxWidth:"infinity",maxHeight:"infinity",alignment:"bottom"}} padding={12} transition={Transition.move("bottom").combined(Transition.opacity()).animation(Animation.snappy({duration:0.22}))}><ReaderProgressOverlay pageNumber={pageNumber} count={totalPages} playing={autoPlaying} canPrevious={pageNumber>1} canNext={pageNumber<totalPages} onPrevious={()=>act("previous")} onNext={()=>act("next")} onJump={value=>{setAutoPlaying(false);void goToGalleryPage(value)}} onToggle={toggleAuto} onSettings={()=>setOverlay("settings")} onClose={()=>setOverlay("none")} onOriginal={resolved?.original&&!prefs?.preferOriginal?()=>setResolved(current=>current?{...current,url:current.original}:current):undefined}/></VStack>:null}{imageFailed?<VStack spacing={8}><ErrorText message={imageFailureMessage||"图片加载失败或超时，请稍后重试"}/><Button title="重试图片" buttonStyle="bordered" action={()=>{setImageFailed(false);setAutoPlaying(false);retryPage.current=currentGalleryIndex;setRetry(v=>v+1)}}/></VStack>:null}</ZStack>{pageLoading?<Text font="caption" foregroundStyle="secondaryLabel">正在准备后续页面…</Text>:null}{jumpError?<VStack spacing={8} padding><ErrorText message={jumpError.message}/><Button title={`重试跳转第 ${jumpError.page} 页`} buttonStyle="bordered" action={()=>void goToGalleryPage(jumpError.page)}/></VStack>:null}{error&&!resolved?<VStack spacing={8} padding><Button title="重试当前页" buttonStyle="bordered" action={()=>{retryPage.current=currentGalleryIndex;setRetry(v=>v+1)}}/></VStack>:null}</VStack></ScrollView>}}</GeometryReader>
}
