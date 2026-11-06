import { AbortController, Button, DragGesture, EnvironmentValuesReader, GeometryReader, HStack, Image, LazyVGrid, Navigation, NavigationLink, ProgressView, ScrollView, Text, VStack, useEffect, useRef, useState } from "scripting"
import { GallerySummary, searchGalleries, openExternalDestination } from "./ehentai"
import { getAccountStatus, getBaseUrl, routeUrlForSite } from "./account"
import { GalleryCategoryKey, GALLERY_CATEGORIES, createHomeSearchState, localizeCategory } from "./tourist"
import { PageBackground, ShelfHeader } from "./GlassUI"
import { ErrorText, EmptyState } from "./StateView"
import { subscribeHistory, loadHistory, historySummary } from "./libraryStore"
import { galleryIdentity } from "./galleryIdentity"
import { workTitle } from "./galleryCopy"
import { CachedThumbnail } from "./GalleryImages"
import { GalleryRating } from "./GalleryCards"
import { discoverGridMetrics, discoverCoverFrame, type DiscoverFeed, discoverFeedUrl, mergeDiscoverGalleries, discoverNextCursor } from "./discoverModel"
import { type SceneDestinations } from "./sceneDestinations"

export function createDiscoverScene(destinations: Pick<SceneDestinations, "AIRecommendationFlow" | "DiscoveryScene" | "HistoryScene" | "ImageSearchScene" | "QuickSearchScene" | "ResultsView" | "SearchComposer" | "listedGalleryDestination" | "openListedGallery">) {
const { AIRecommendationFlow, DiscoveryScene, HistoryScene, ImageSearchScene, QuickSearchScene, ResultsView, SearchComposer, listedGalleryDestination, openListedGallery } = destinations
function DiscoverWidthProbe({width,onWidth}:{width:number;onWidth:(width:number)=>void}){useEffect(()=>{if(width>0)onWidth(width)},[width]);return <VStack/>}
function DiscoverCoverCard({item,width=164}:{item:GallerySummary;width?:number}){const imageFrame=discoverCoverFrame(width);return <VStack alignment="leading" spacing={5} frame={{width:imageFrame.width,alignment:"topLeading"}}>{item.thumb?<CachedThumbnail url={item.thumb} stage="home-thumbnail" frame={imageFrame} cornerRadius={7}/>:<Image systemName="books.vertical" frame={imageFrame} foregroundStyle="secondaryLabel"/>}<Text font="subheadline" fontWeight="semibold" lineLimit={2} frame={{minHeight:44,alignment:"topLeading"}}>{workTitle(item.title)}</Text><Text font="caption" foregroundStyle="secondaryLabel" lineLimit={1}>{localizeCategory(item.category)}{item.pages>0?` · ${item.pages} 页`:""}</Text><GalleryRating rating={item.rating} compact/></VStack>}
function DiscoverShowcase({items}:{items:GallerySummary[]}){const[selected,setSelected]=useState<GallerySummary|null>(null),[width,setWidth]=useState(0);return <EnvironmentValuesReader keys={["horizontalSizeClass"]}>{environment=>{const grid=discoverGridMetrics(width|| (environment.horizontalSizeClass==="regular"?880:320));return <VStack alignment="leading" frame={{maxWidth:"infinity"}} background={<GeometryReader>{geometry=><DiscoverWidthProbe width={geometry.size.width} onWidth={setWidth}/>}</GeometryReader>} navigationDestination={listedGalleryDestination(environment.horizontalSizeClass,selected,setSelected)}><LazyVGrid columns={Array.from({length:grid.columns},()=>({size:{type:"flexible" as const},spacing:grid.spacing}))} alignment="leading" spacing={12}>{items.map(item=><Button key={galleryIdentity(item)} buttonStyle="plain" action={()=>openListedGallery(environment.horizontalSizeClass,item,setSelected)}><DiscoverCoverCard item={item} width={grid.cardWidth}/></Button>)}</LazyVGrid></VStack>}}</EnvironmentValuesReader>}
function ContinueReadingCard({item,page}:{item:GallerySummary;page:number|null}){return <HStack spacing={8} padding={8} background="secondarySystemGroupedBackground" clipShape={{type:"rect",cornerRadius:12}}>{item.thumb?<CachedThumbnail url={item.thumb} stage="home-thumbnail" frame={{width:48,height:67}} cornerRadius={6}/>:<Image systemName="books.vertical" frame={{width:48,height:67}} foregroundStyle="secondaryLabel"/>}<VStack alignment="leading" spacing={4} frame={{maxWidth:"infinity"}}><Text font="subheadline" fontWeight="semibold" lineLimit={2}>{workTitle(item.title)}</Text>{page!=null&&item.pages>0?<ProgressView value={Math.max(0,Math.min(1,page/item.pages))} progressViewStyle="linear"/>:null}<Text font="caption" foregroundStyle="secondaryLabel" lineLimit={1}>{page!=null?`${page} / ${item.pages>0?item.pages:"—"} 页`:"尚未记录阅读页码"}</Text></VStack></HStack>}
function ContinueReadingStrip(){const[records,setRecords]=useState<Awaited<ReturnType<typeof loadHistory>>>([]),[selected,setSelected]=useState<GallerySummary|null>(null);useEffect(()=>{let cancelled=false,revision=0;const unsubscribe=subscribeHistory(value=>{revision++;if(!cancelled)setRecords(value)});const initialRevision=revision;void loadHistory().then(value=>{if(!cancelled&&revision===initialRevision)setRecords(value)}).catch(()=>{});return()=>{cancelled=true;unsubscribe()}},[]);if(!records.length)return <VStack/>;return <EnvironmentValuesReader keys={["horizontalSizeClass"]}>{environment=><VStack alignment="leading" spacing={6} frame={{maxWidth:"infinity"}} navigationDestination={listedGalleryDestination(environment.horizontalSizeClass,selected,setSelected)}><ShelfHeader title="继续阅读" action={<NavigationLink destination={<HistoryScene/>}><Text font="subheadline">查看全部</Text></NavigationLink>}/><ScrollView axes="horizontal"><HStack spacing={10}>{records.slice(0,8).map(record=>{const item=historySummary(record);return <Button key={`${record.gid}:${record.token}`} buttonStyle="plain" action={()=>openListedGallery(environment.horizontalSizeClass,item,setSelected)} frame={{width:260}}><ContinueReadingCard item={item} page={record.lastPageIndex!=null?record.lastPageIndex+1:null}/></Button>})}</HStack></ScrollView></VStack>}</EnvironmentValuesReader>}

function RecentDiscoverShelf({refresh}:{refresh:number}){const[items,setItems]=useState<GallerySummary[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");useEffect(()=>{const controller=new AbortController();let cancelled=false;setLoading(true);setError("");void searchGalleries("",discoverFeedUrl(getBaseUrl(),"latest"),controller.signal).then(page=>{if(!cancelled)setItems(mergeDiscoverGalleries([],page.items).slice(0,5))}).catch(caught=>{if(!cancelled&&!controller.signal.aborted)setError(caught instanceof Error?caught.message:"最新画廊加载失败。")}).finally(()=>{if(!cancelled)setLoading(false)});return()=>{cancelled=true;controller.abort()}},[refresh]);return <VStack alignment="leading" spacing={8} frame={{maxWidth:"infinity"}}><ShelfHeader title="最近更新" action={<NavigationLink destination={<ResultsView initial={createHomeSearchState()}/>}><Text font="subheadline">查看全部</Text></NavigationLink>}/>{loading&&!items.length?<ProgressView title="加载最近更新…"/>:null}{error?<ErrorText message={error}/>:null}<DiscoverShowcase items={items}/></VStack>}
function HomeScene() {
  const dismiss=Navigation.useDismiss()
  const [feed,setFeed]=useState<DiscoverFeed>("popular"),feedRef=useRef<DiscoverFeed>("popular")
  const [items,setItems]=useState<GallerySummary[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("")
  const [nextHomeUrl,setNextHomeUrl]=useState(""),[loadingMore,setLoadingMore]=useState(false),[moreError,setMoreError]=useState("")
  const requestEpoch=useRef(0),requestController=useRef<AbortController|null>(null),moreBusy=useRef(false),visited=useRef(new Set<string>())
  const nearBottom=useRef(false),scrollArmed=useRef(false),dragStarted=useRef(false)
  const [recentRefresh,setRecentRefresh]=useState(0)
  const [browse,setBrowse]=useState<{kind:"image"|"discovery"|"category"|"recommend"|"bookmarks";category?:GalleryCategoryKey}|null>(null)
  const loadHome=async(nextFeed:DiscoverFeed=feedRef.current,clear=false)=>{
    requestController.current?.abort();const controller=new AbortController();requestController.current=controller
    const epoch=++requestEpoch.current;feedRef.current=nextFeed;setFeed(nextFeed);moreBusy.current=false;scrollArmed.current=false;nearBottom.current=false
    visited.current=new Set();setNextHomeUrl("");setMoreError("");setLoadingMore(false);if(clear)setItems([]);setLoading(true);setError("")
    const current=()=>epoch===requestEpoch.current&&!controller.signal.aborted
    try{const url=discoverFeedUrl(getBaseUrl(),nextFeed),page=await searchGalleries("",url,controller.signal);if(current()){visited.current.add(url);setItems(mergeDiscoverGalleries([],page.items));setNextHomeUrl(discoverNextCursor(url,page.nextHref||""))}}
    catch(caught){if(current())setError(caught instanceof Error?caught.message:"画廊加载失败，请重试。")}
    finally{if(current())setLoading(false)}
  }
  const loadMoreHome=async()=>{
    if(moreBusy.current||loading||!nextHomeUrl)return
    moreBusy.current=true;scrollArmed.current=false;const epoch=requestEpoch.current,url=routeUrlForSite(nextHomeUrl),controller=new AbortController();requestController.current=controller
    const current=()=>epoch===requestEpoch.current&&!controller.signal.aborted
    setLoadingMore(true);setMoreError("")
    try{const page=await searchGalleries("",url,controller.signal);if(!current())return;visited.current.add(url);setItems(items=>mergeDiscoverGalleries(items,page.items));const next=discoverNextCursor(url,page.nextHref||"");setNextHomeUrl(visited.current.has(next)?"":next)}
    catch(caught){if(current())setMoreError(caught instanceof Error?caught.message:"加载下一页失败，请重试。")}
    finally{if(current()){moreBusy.current=false;setLoadingMore(false)}}
  }
  const requestMore=()=>{if(nearBottom.current&&scrollArmed.current&&!moreError)void loadMoreHome()}
  useEffect(()=>{void loadHome();return()=>{requestEpoch.current++;requestController.current?.abort()}},[])
  return <ScrollView navigationTitle="发现" navigationBarTitleDisplayMode="large" refreshable={()=>{setRecentRefresh(value=>value+1);return loadHome()}} background={<PageBackground/>}
    toolbar={{cancellationAction:<Button title="关闭" action={dismiss}/>}}
    onScrollTargetVisibilityChange={{idType:"string",threshold:0.01,onChanged:ids=>{nearBottom.current=ids.some(id=>id==="discover-load-boundary");requestMore()}}}
    simultaneousGesture={DragGesture({minDistance:12}).onChanged((value:any)=>{if(dragStarted.current)return;const dx=Number(value.translation?.width||0),dy=Number(value.translation?.height||0);if(dy>=-12||Math.abs(dy)<=Math.abs(dx))return;dragStarted.current=true;scrollArmed.current=true;requestMore()}).onEnded(()=>{dragStarted.current=false})}
    navigationDestination={{isPresented:Boolean(browse),onChanged:shown=>{if(!shown)setBrowse(null)},content:browse?.kind==="image"?<ImageSearchScene/>:browse?.kind==="recommend"?<AIRecommendationFlow/>:browse?.kind==="bookmarks"?<QuickSearchScene/>:browse?.kind==="discovery"?<DiscoveryScene initialKind="top"/>:browse?.kind==="category"&&browse.category?<ResultsView initial={createHomeSearchState("",browse.category,"none")}/>:<VStack/>}}>
    <VStack scrollTargetLayout alignment="leading" spacing={10} padding={{horizontal:16,vertical:8}} frame={{maxWidth:"infinity",alignment:"leading"}}>
      <Text font="caption" foregroundStyle="secondaryLabel">{getAccountStatus().site==="ex"?"ExHentai":"E-Hentai"} · 搜索、分类与发现</Text>
      <SearchComposer initial={createHomeSearchState()} compact/>
      <HStack spacing={4}><ScrollView axes="horizontal"><HStack spacing={16}><Button title="推荐" buttonStyle="plain" action={()=>setBrowse({kind:"recommend"})}/><Button buttonStyle="plain" action={()=>{if(feedRef.current!=="latest")void loadHome("latest",true)}}><Text fontWeight={feed==="latest"?"semibold":"regular"} foregroundStyle={feed==="latest"?"systemBlue":"secondaryLabel"} padding={{vertical:10}}>最新</Text></Button><Button buttonStyle="plain" action={()=>{if(feedRef.current!=="popular")void loadHome("popular",true)}}><Text fontWeight={feed==="popular"?"semibold":"regular"} foregroundStyle={feed==="popular"?"systemBlue":"secondaryLabel"} padding={{vertical:10}}>热门</Text></Button><Button title="排行榜" buttonStyle="plain" action={()=>setBrowse({kind:"discovery"})}/></HStack></ScrollView><Button title="搜索书签" systemImage="bookmark" labelStyle="iconOnly" buttonStyle="plain" frame={{minWidth:44,minHeight:44}} action={()=>setBrowse({kind:"bookmarks"})}/></HStack>

      {loading?<HStack spacing={8}><ProgressView progressViewStyle="circular"/><Text font="caption" foregroundStyle="secondaryLabel">正在加载{feed==="popular"?"热门":"最新"}画廊…</Text></HStack>:null}
      {error?<VStack alignment="leading" spacing={8}><ErrorText message={error}/><Button title="重试加载" buttonStyle="bordered" action={()=>void loadHome()}/></VStack>:null}
      {!loading&&!error&&!items.length?<EmptyState message="暂时没有可显示的画廊，可刷新或切换最新／热门。"/>:null}
      <ShelfHeader title={feed==="popular"?"热门发现":"最近更新"} /><DiscoverShowcase items={items.slice(0,5)}/>
      <ContinueReadingStrip/>
      {feed==="popular"?<RecentDiscoverShelf refresh={recentRefresh}/>:null}
      <ShelfHeader title={feed==="popular"?"更多热门":"更多最新"}/>
      <ScrollView axes="horizontal"><HStack spacing={8}>{GALLERY_CATEGORIES.map(item=><Button key={item.key} buttonStyle="plain" action={()=>setBrowse({kind:"category",category:item.key})}><Text padding={{horizontal:12,vertical:8}} background="secondarySystemBackground" clipShape={{type:"capsule",style:"continuous"}}>{item.shortLabel}</Text></Button>)}</HStack></ScrollView>
      <DiscoverShowcase items={items.slice(5)}/>
      {nextHomeUrl?<VStack key="discover-load-boundary" spacing={8} frame={{maxWidth:"infinity",minHeight:80}}>{loadingMore?<ProgressView title="加载更多画廊…" progressViewStyle="circular"/>:<><Text font="caption" foregroundStyle="secondaryLabel">继续上推浏览更多画廊</Text>{moreError?<ErrorText message={moreError}/>:null}<Button title={moreError?"重试加载更多":"加载更多"} buttonStyle="bordered" action={()=>void loadMoreHome()}/></>}</VStack>:null}
      <HStack spacing={12}><Button title="图片搜索" systemImage="photo.on.rectangle" action={()=>setBrowse({kind:"image"})}/><Button title="新闻" systemImage="newspaper" action={()=>void openExternalDestination("news").catch(caught=>setError(String(caught)))}/><Button title="论坛" systemImage="bubble.left.and.bubble.right" action={()=>void openExternalDestination("forums").catch(caught=>setError(String(caught)))}/></HStack>
    </VStack>
  </ScrollView>
}


return { DiscoverWidthProbe, DiscoverCoverCard, DiscoverShowcase, ContinueReadingCard, ContinueReadingStrip, RecentDiscoverShelf, HomeScene }
}
