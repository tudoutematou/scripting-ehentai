import { Button, Canvas, HStack, Image, LazyVGrid, List, Navigation, NavigationLink, NavigationStack, ProgressView, Script, ScrollView, Section, Spacer, Text, TextField, VStack, useEffect, useRef, useState } from "scripting"
import { GalleryDetail, GalleryPageLink, GallerySummary, loadGalleryDetailCore, loadRemainingPreviewPages, resolveImagePage, searchGalleries } from "./ehentai"
import { getAccountStatus, getBaseUrl, getCookieHeader, importCookiesFromText, importSafariLogin, openSafariLogin, refreshAccountStatus, setActiveSite, signOut } from "./account"
import { reportDiagnostic } from "./githubBridge"
import { GalleryCategoryKey, GallerySearchState, GALLERY_CATEGORIES, QUICK_FILTERS, QuickFilterKey, buildGallerySearchUrl, cloneSearchState, createHomeSearchState, createTagSearchState, getCategoryOption, getQuickFilter, localizeCategory, localizeCommonTag, localizeMetadataKey, localizeTagNamespace, searchRawQuery, searchTitle } from "./tourist"
import { ensureTagTranslations, getTagTranslationStatus, translateTag } from "./tagTranslation"

const fileManager:any=(globalThis as any).FileManager
const imagePathCache=new Map<string,Promise<string>>()
const PREVIEW_WIDTH=96, PREVIEW_HEIGHT=128, IMAGE_TIMEOUT_MS=15_000, MAX_IMAGE_REQUESTS=3
type ImageStage="home-thumbnail"|"preview-thumbnail"|"reader-image"
type PendingImageTask={stage:ImageStage;sequence:number;enqueuedAt:number;start:()=>void}
const IMAGE_PRIORITY:Record<ImageStage,number>={"home-thumbnail":0,"preview-thumbnail":1,"reader-image":2}
const pendingImageTasks:PendingImageTask[]=[];let activeImageTasks=0;let imageTaskSequence=0
function drainImageTasks(){while(activeImageTasks<MAX_IMAGE_REQUESTS&&pendingImageTasks.length){pendingImageTasks.sort((a,b)=>IMAGE_PRIORITY[b.stage]-IMAGE_PRIORITY[a.stage]||a.sequence-b.sequence);pendingImageTasks.shift()?.start()}}
function enqueueImageTask<T>(stage:ImageStage,work:(queueMs:number)=>Promise<T>):Promise<T>{const enqueuedAt=Date.now();return new Promise((resolve,reject)=>{const start=()=>{activeImageTasks+=1;void work(Date.now()-enqueuedAt).then(resolve,reject).finally(()=>{activeImageTasks-=1;drainImageTasks()})};pendingImageTasks.push({stage,sequence:imageTaskSequence++,enqueuedAt,start});drainImageTasks()})}
function ErrorText({message}:{message:string}){if(!message)return null;return <Text foregroundStyle="systemRed" font="caption">{message}</Text>}
function hashText(value:string){let hash=2166136261;for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619)}return(hash>>>0).toString(16)}
function imageHost(url:string){try{return new URL(url).host}catch{return "invalid-host"}}
async function cachedImagePath(url:string,stage:ImageStage,options?:any){
  const existing=imagePathCache.get(url);if(existing)return existing
  const task=enqueueImageTask(stage,async queueMs=>{const started=Date.now();let fetchStarted=0;let response:any
    try{const dir=`${Script.directory}/.image-cache`;await fileManager.createDirectory(dir,true);const ext=new URL(url).pathname.match(/\.(jpg|jpeg|png|webp)$/i)?.[1]?.toLowerCase()||"jpg";const path=`${dir}/${hashText(url)}.${ext}`
      try{if(await fileManager.isFile(path)){await reportSafe({stage,ok:true,request:{url,status:200,statusText:"cache"},notes:`host=${imageHost(url)}; queueMs=${queueMs}; fetchMs=0; totalMs=${queueMs+Date.now()-started}; contentType=cache; settle=cache-hit`});return path}}catch{}
      fetchStarted=Date.now();response=await fetch(url,{...(options||{}),signal:AbortSignal.timeout(stage==="reader-image"?20_000:IMAGE_TIMEOUT_MS)} as any);const contentType=String(response.headers?.get?.("content-type")||"");if(!response.ok)throw new Error(`HTTP ${response.status}`);const data=await response.data();const fetchMs=Date.now()-fetchStarted;await fileManager.writeAsData(path,data)
      await reportSafe({stage,ok:true,request:{url,status:Number(response.status||0),statusText:String(response.statusText||"")},notes:`host=${imageHost(url)}; queueMs=${queueMs}; fetchMs=${fetchMs}; totalMs=${queueMs+Date.now()-started}; contentType=${contentType||"unknown"}; settle=written`});return path
    }catch(error){imagePathCache.delete(url);await reportSafe({stage,ok:false,error,request:{url,status:Number(response?.status||0),statusText:String(response?.statusText||"")},notes:`host=${imageHost(url)}; queueMs=${queueMs}; fetchMs=${fetchStarted?Date.now()-fetchStarted:0}; totalMs=${queueMs+Date.now()-started}; settle=failed`});throw error}
  });imagePathCache.set(url,task);return task
}
function CachedThumbnail({url,stage,frame,cornerRadius}:{url:string;stage:"home-thumbnail"|"preview-thumbnail";frame:{width:number;height:number};cornerRadius:number}){const[filePath,setFilePath]=useState("");const[error,setError]=useState("");useEffect(()=>{let cancelled=false;setFilePath("");setError("");void cachedImagePath(url,stage).then(path=>{if(!cancelled)setFilePath(path)}).catch(caught=>{if(!cancelled)setError("图片加载失败，请稍后重试")});return()=>{cancelled=true}},[url,stage]);if(error)return <Image systemName="exclamationmark.triangle" frame={frame} foregroundStyle="systemOrange"/>;if(!filePath)return <ProgressView progressViewStyle="circular" frame={frame}/>;return <Image filePath={filePath} resizable scaleToFill frame={frame} clipShape={{type:"rect",cornerRadius}}/>}
function PreviewThumbnail({page}:{page:GalleryPageLink}){const sprite=Boolean(page.thumb&&page.thumbWidth>0&&page.thumbHeight>0);if(!page.thumb)return <Image systemName="photo" frame={{width:PREVIEW_WIDTH,height:PREVIEW_HEIGHT}} foregroundStyle="secondaryLabel"/>;if(!sprite)return <CachedThumbnail url={page.thumb} stage="preview-thumbnail" frame={{width:PREVIEW_WIDTH,height:PREVIEW_HEIGHT}} cornerRadius={7}/>;return <SpritePreview page={page}/>}
function SpritePreview({page}:{page:GalleryPageLink}){const[filePath,setFilePath]=useState("");const[error,setError]=useState("");useEffect(()=>{let cancelled=false;void cachedImagePath(page.thumb,"preview-thumbnail").then(path=>{if(!cancelled)setFilePath(path)}).catch(()=>{if(!cancelled)setError("图片加载失败，请稍后重试")});return()=>{cancelled=true}},[page.thumb]);if(error)return <Image systemName="exclamationmark.triangle" frame={{width:PREVIEW_WIDTH,height:PREVIEW_HEIGHT}} foregroundStyle="systemOrange"/>;if(!filePath)return <ProgressView progressViewStyle="circular" frame={{width:PREVIEW_WIDTH,height:PREVIEW_HEIGHT}}/>;return <Canvas frame={{width:PREVIEW_WIDTH,height:PREVIEW_HEIGHT}} draw={(ctx:any,size:any)=>{ctx.fillStyle="systemGray6";ctx.fillRect(0,0,size.width,size.height);const sw=Math.max(1,page.thumbWidth),sh=Math.max(1,page.thumbHeight),scale=Math.min(size.width/sw,size.height/sh),dw=sw*scale,dh=sh*scale;ctx.drawImage({filePath},page.thumbX,page.thumbY,sw,sh,(size.width-dw)/2,(size.height-dh)/2,dw,dh)}}/>}
function CachedReaderImage({url,referer}:{url:string;referer:string}){const[filePath,setFilePath]=useState("");const[error,setError]=useState("");useEffect(()=>{let cancelled=false;const cookie=getCookieHeader(url);void cachedImagePath(url,"reader-image",{headers:{Accept:"image/avif,image/webp,image/apng,image/*,*/*;q=0.8",Referer:referer,...(cookie?{Cookie:cookie}:{})}}).then(path=>{if(!cancelled)setFilePath(path)}).catch(()=>{if(!cancelled)setError("图片加载失败或超时，请稍后重试")});return()=>{cancelled=true}},[url,referer]);if(error)return <ErrorText message={error}/>;if(!filePath)return <ProgressView title="加载图片…" progressViewStyle="circular"/>;return <Image filePath={filePath} resizable scaleToFit frame={{maxWidth:"infinity"}}/>}
function GalleryRow({item}:{item:GallerySummary}){return <HStack spacing={12}>{item.thumb?<CachedThumbnail url={item.thumb} stage="home-thumbnail" frame={{width:82,height:112}} cornerRadius={9}/>:<Image systemName="photo" frame={{width:82,height:112}} foregroundStyle="secondaryLabel"/>}<VStack alignment="leading" spacing={7} frame={{maxWidth:"infinity"}}><Text font="headline" lineLimit={3}>{item.title||"未命名画廊"}</Text>{item.category?<Text font="caption" padding={{horizontal:8,vertical:3}} background="secondarySystemBackground" clipShape={{ type: "rect", cornerRadius: 7 }}>{localizeCategory(item.category)}</Text>:null}<Text font="caption" foregroundStyle="secondaryLabel" lineLimit={2}>{[item.uploader,item.pages?`${item.pages} 页`:"",item.posted].filter(Boolean).join(" · ")}</Text></VStack></HStack>}
async function reportSafe(input:Parameters<typeof reportDiagnostic>[0]){try{await reportDiagnostic(input)}catch{}}

function FilterView({ initial, onApply, dismissAfterApply = true }: {
  initial: GallerySearchState
  onApply: (state: GallerySearchState) => void
  dismissAfterApply?: boolean
}) {
  const dismiss = Navigation.useDismiss()
  const [category, setCategory] = useState<GalleryCategoryKey>(initial.category)
  const [quick, setQuick] = useState<QuickFilterKey>(initial.quickFilter)
  const [advanced, setAdvanced] = useState(initial.advanced)
  const apply = () => {
    onApply({ ...cloneSearchState(initial), category, quickFilter: quick, advanced })
    if (dismissAfterApply) dismiss()
  }
  return <List navigationTitle="搜索筛选" navigationBarTitleDisplayMode="inline">
    <Section header={<Text textCase={null}>分类</Text>}><VStack alignment="leading" spacing={8}>{[GALLERY_CATEGORIES.slice(0, 4), GALLERY_CATEGORIES.slice(4, 8), GALLERY_CATEGORIES.slice(8)].map((row, index) => <HStack key={String(index)} spacing={7}>{row.map(item => <Button key={item.key} title={item.shortLabel} buttonStyle={category === item.key ? "borderedProminent" : "bordered"} action={() => setCategory(item.key)} />)}</HStack>)}</VStack></Section>
    <Section header={<Text textCase={null}>语言与常用筛选</Text>}><VStack alignment="leading" spacing={8}>{[QUICK_FILTERS.slice(0, 3), QUICK_FILTERS.slice(3)].map((row, index) => <HStack key={String(index)} spacing={7}>{row.map(item => <Button key={item.key} title={item.label} buttonStyle={quick === item.key ? "borderedProminent" : "bordered"} action={() => setQuick(item.key)} />)}</HStack>)}</VStack></Section>
    <Section header={<Text textCase={null}>高级搜索</Text>}><Button title={advanced.enabled ? "关闭高级搜索" : "启用高级搜索"} buttonStyle={advanced.enabled ? "borderedProminent" : "bordered"} action={() => setAdvanced({ ...advanced, enabled: !advanced.enabled })} />{advanced.enabled ? <VStack alignment="leading" spacing={8}><Button title={`${advanced.searchName ? "✓" : "○"} 搜索画廊名称`} action={() => setAdvanced({ ...advanced, searchName: !advanced.searchName })} /><Button title={`${advanced.searchTags ? "✓" : "○"} 搜索画廊标签`} action={() => setAdvanced({ ...advanced, searchTags: !advanced.searchTags })} /><Button title={`${advanced.searchDescription ? "✓" : "○"} 搜索画廊描述`} action={() => setAdvanced({ ...advanced, searchDescription: !advanced.searchDescription })} /></VStack> : null}</Section>
    <Section><Button title="应用筛选" buttonStyle="borderedProminent" action={apply} /></Section>
  </List>
}

function ResultsView({ initial }: { initial: GallerySearchState }) {
  const [state, setState] = useState(cloneSearchState(initial))
  const [items, setItems] = useState<GallerySummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resultCount, setResultCount] = useState("")
  const [prev, setPrev] = useState("")
  const [next, setNext] = useState("")
  const requestEpoch = useRef(0)
  const load = async (direct?: string, nextState: GallerySearchState = state) => {
    const epoch = ++requestEpoch.current
    setLoading(true); setError("")
    const url = direct || buildGallerySearchUrl(getBaseUrl(), nextState)
    try {
      const page = await searchGalleries("", url)
      if (epoch !== requestEpoch.current) return
      setItems(page.items); setResultCount(page.resultCount); setPrev(page.prevHref); setNext(page.nextHref)
      await reportSafe({ stage: "gallery-search-filter", ok: true, request: { url: page.url }, notes: `items=${page.items.length}; category=${nextState.category}; tagPresent=${nextState.mode === "tag"}` })
    } catch (caught) {
      if (epoch !== requestEpoch.current) return
      setError(caught instanceof Error ? caught.message : String(caught)); setItems([])
    } finally {
      if (epoch === requestEpoch.current) setLoading(false)
    }
  }
  useEffect(() => { void load(undefined, initial) }, [])
  const apply = (value: GallerySearchState) => { setState(value); setPrev(""); setNext(""); void load(undefined, value) }
  return <List navigationTitle={searchTitle(state)} navigationBarTitleDisplayMode="inline" overlay={loading && items.length === 0 ? <ProgressView title="正在搜索…" progressViewStyle="circular" /> : undefined}>
    <Section><HStack><VStack alignment="leading" spacing={3}><Text font="headline">{searchTitle(state)}</Text>{searchRawQuery(state) ? <Text font="caption" foregroundStyle="secondaryLabel">{searchRawQuery(state)}</Text> : null}<Text font="caption" foregroundStyle="secondaryLabel">{getCategoryOption(state.category).label} · {getQuickFilter(state.quickFilter).label}</Text></VStack><Spacer /><NavigationLink destination={<FilterView initial={state} onApply={apply} />}><Text>筛选</Text></NavigationLink></HStack><ErrorText message={error} /></Section>
    <Section header={<Text textCase={null}>{[resultCount ? `结果 ${resultCount}` : "", items.length ? `本页 ${items.length} 条` : ""].filter(Boolean).join(" · ") || "搜索结果"}</Text>}>{items.map(item => <NavigationLink key={item.id} destination={<GalleryDetailView summary={item} />}><GalleryRow item={item} /></NavigationLink>)}</Section>
    {prev || next ? <Section><HStack><Button title="上一页" systemImage="chevron.left" disabled={!prev || loading} action={() => { if (prev) void load(prev) }} /><Spacer /><Button title="下一页" systemImage="chevron.right" disabled={!next || loading} action={() => { if (next) void load(next) }} /></HStack></Section> : null}
  </List>
}

function HomeFilterEntry({ initial }: { initial: GallerySearchState }) {
  const [result, setResult] = useState<GallerySearchState | null>(null)
  return result ? <ResultsView initial={result} /> : <FilterView initial={initial} onApply={setResult} dismissAfterApply={false} />
}

function AccountSection({ account, onAccountContextChanged }: { account: ReturnType<typeof getAccountStatus>; onAccountContextChanged: (status: ReturnType<typeof getAccountStatus>) => void }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const updateContext = (status: ReturnType<typeof getAccountStatus>) => onAccountContextChanged(status)
  const run = async (action: "manual" | "safari" | "import" | "refresh" | "logout" | "e" | "ex") => {
    if (busy) return
    setBusy(true); setMessage("")
    try {
      if (action === "manual") {
        const text = await prompt({ title: "导入 Cookie", message: "仅保存到本机 Keychain。可粘贴 Cookie 字符串或 Cookie JSON 数组。", obscureText: true, placeholder: "ipb_member_id=…; ipb_pass_hash=…", confirmLabel: "导入" })
        if (text) updateContext(importCookiesFromText(text))
      } else if (action === "safari") {
        await openSafariLogin(); setMessage("已打开 Safari。Safari 登录桥为实验功能；完成登录并确认捕获后，再点“导入实验桥登录”。")
      } else if (action === "import") updateContext(await importSafariLogin())
      else if (action === "refresh") updateContext(await refreshAccountStatus())
      else if (action === "logout") { signOut(); updateContext(getAccountStatus()) }
      else { setActiveSite(action); updateContext(getAccountStatus()) }
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : String(caught)) }
    finally { setBusy(false) }
  }
  return <Section header={<Text textCase={null}>账号</Text>}><VStack alignment="leading" spacing={8}>
    <Text font="headline">{account.loggedIn ? "已登录" : "游客模式"}</Text>
    <Text font="caption" foregroundStyle="secondaryLabel">Cookie 仅存本机 Keychain · E：{String(account.eHentaiReachable ?? "待检测")} · Ex：{String(account.exAvailable ?? "待检测")}</Text>
    <HStack spacing={8}><Button title="手工导入 Cookie" disabled={busy} action={() => { void run("manual") }} /><Button title="刷新状态" disabled={busy || !account.loggedIn} action={() => { void run("refresh") }} /><Button title="退出" disabled={busy || !account.loggedIn} action={() => { void run("logout") }} /></HStack>
    <HStack spacing={8}><Button title="E-Hentai" buttonStyle={account.site === "e" ? "borderedProminent" : "bordered"} disabled={busy || account.site === "e"} action={() => { void run("e") }} /><Button title="ExHentai" buttonStyle={account.site === "ex" ? "borderedProminent" : "bordered"} disabled={busy || account.site === "ex" || account.exAvailable !== true} action={() => { void run("ex") }} /></HStack>
    <Text font="caption" foregroundStyle="secondaryLabel">Safari 登录桥（实验功能，不是核心登录路径）</Text>
    <HStack spacing={8}><Button title="在 Safari 登录" disabled={busy} action={() => { void run("safari") }} /><Button title="导入实验桥登录" disabled={busy} action={() => { void run("import") }} /></HStack>
    {busy ? <ProgressView progressViewStyle="circular" /> : null}<ErrorText message={message} />
  </VStack></Section>
}

function HomeView() {
  const dismiss = Navigation.useDismiss()
  const [account, setAccount] = useState(getAccountStatus())
  const [keyword, setKeyword] = useState("")
  const [items, setItems] = useState<GallerySummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const loadHome = async () => { setLoading(true); setError(""); try { setItems((await searchGalleries("", getBaseUrl())).items) } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)) } finally { setLoading(false) } }
  const onAccountContextChanged = (status: ReturnType<typeof getAccountStatus>) => { setAccount(status); void loadHome() }
  useEffect(() => { void loadHome(); void ensureTagTranslations() }, [])
  const searchState = createHomeSearchState(keyword)
  return <List navigationTitle={account.site === "ex" ? "ExHentai" : "E-Hentai"} navigationBarTitleDisplayMode="inline" refreshable={loadHome} toolbar={{ cancellationAction: <Button title="关闭" action={dismiss} /> }} overlay={loading && !items.length ? <ProgressView title="正在加载画廊…" progressViewStyle="circular" /> : undefined}>
    <AccountSection account={account} onAccountContextChanged={onAccountContextChanged} />
    <Section><VStack alignment="leading" spacing={10}><HStack><Text font="title3">发现画廊</Text><Spacer /><NavigationLink destination={<HomeFilterEntry initial={searchState} />}><Text>筛选</Text></NavigationLink></HStack><TextField title="搜索画廊" value={keyword} onChanged={setKeyword} prompt="标题、作者、标签…" submitLabel="search" /><NavigationLink destination={<ResultsView initial={searchState} />}><HStack><Image systemName="magnifyingglass" /><Text>搜索</Text></HStack></NavigationLink></VStack></Section>
    <Section header={<Text textCase={null}>快速分类</Text>}><VStack alignment="leading" spacing={8}>{[GALLERY_CATEGORIES.slice(1, 5), GALLERY_CATEGORIES.slice(5, 9)].map((row, index) => <HStack key={String(index)} spacing={8}>{row.map(item => <NavigationLink key={item.key} destination={<ResultsView initial={createHomeSearchState("", item.key, "none")} />}><Text>{item.shortLabel}</Text></NavigationLink>)}</HStack>)}</VStack></Section>
    <Section header={<Text textCase={null}>最新画廊</Text>}><ErrorText message={error} />{items.map(item => <NavigationLink key={item.id} destination={<GalleryDetailView summary={item} />}><GalleryRow item={item} /></NavigationLink>)}</Section>
  </List>
}

function GalleryDetailView({summary}:{summary:GallerySummary}){const[detail,setDetail]=useState<GalleryDetail|null>(null);const[loading,setLoading]=useState(true);const[previewsLoading,setPreviewsLoading]=useState(false);const[failed,setFailed]=useState<number[]>([]);const[error,setError]=useState("");const[translationTick,setTranslationTick]=useState(0);useEffect(()=>{let cancelled=false;(async()=>{setLoading(true);setError("");try{const core=await loadGalleryDetailCore(summary.url);if(cancelled)return;setDetail(core);setLoading(false);void ensureTagTranslations().then(()=>{if(!cancelled)setTranslationTick(v=>v+1)});if(core.previewPages>1){setPreviewsLoading(true);const result=await loadRemainingPreviewPages(core,(links,bad)=>{if(!cancelled){setDetail(current=>current?{...current,pageLinks:links}:current);setFailed(bad)}});if(!cancelled){setDetail(current=>current?{...current,pageLinks:result.pageLinks}:current);setFailed(result.failedPreviewPages);setPreviewsLoading(false)}}}catch(e){if(!cancelled){setError(e instanceof Error?e.message:String(e));setLoading(false);setPreviewsLoading(false)}}})();return()=>{cancelled=true}},[summary.url]);const translated=(namespace:string,name:string)=>translateTag(namespace,name)||localizeCommonTag(namespace,name)||name;return <ScrollView navigationTitle="画廊详情" navigationBarTitleDisplayMode="inline" overlay={loading?<ProgressView title="读取详情…" progressViewStyle="circular"/>:undefined}><VStack alignment="leading" spacing={18} padding={{horizontal:16,vertical:12}}><VStack alignment="leading" spacing={8} frame={{maxWidth:"infinity"}}>{detail?.cover||summary.thumb?<Image imageUrl={detail?.cover||summary.thumb} resizable scaleToFit frame={{maxWidth:"infinity",height:280}} clipShape={{ type: "rect", cornerRadius: 12 }} placeholder={<ProgressView progressViewStyle="circular"/>}/>:null}<Text font="title3">{detail?.title||summary.title}</Text>{detail?.titleJpn?<Text font="subheadline" foregroundStyle="secondaryLabel">{detail.titleJpn}</Text>:null}<Text font="caption" foregroundStyle="secondaryLabel">{[localizeCategory(detail?.category||summary.category),detail?.uploader||summary.uploader].filter(Boolean).join(" · ")}</Text>{detail?.rating!=null?<Text font="caption">评分 {detail.rating.toFixed(2)} · {detail.ratingCount} 次</Text>:null}<ErrorText message={error}/></VStack>{detail&&Object.keys(detail.metadata).length?<VStack alignment="leading" spacing={7} frame={{maxWidth:"infinity"}}><Text font="headline">信息</Text>{Object.entries(detail.metadata).map(([k,v])=><HStack key={k} frame={{maxWidth:"infinity"}}><Text foregroundStyle="secondaryLabel">{localizeMetadataKey(k)}</Text><Spacer/><Text>{v}</Text></HStack>)}</VStack>:null}{detail?.tags.length?<VStack alignment="leading" spacing={10} frame={{maxWidth:"infinity"}}><HStack><Text font="headline">标签</Text><Spacer/><Text font="caption2" foregroundStyle="secondaryLabel">{getTagTranslationStatus().count?"中文标签库已加载":"中文标签库加载中"}</Text></HStack>{detail.tags.map(group=><VStack key={group.namespace} alignment="leading" spacing={6}><Text font="caption" foregroundStyle="secondaryLabel">{localizeTagNamespace(group.namespace)}</Text><HStack spacing={6}>{group.tags.slice(0,6).map(tag=><NavigationLink key={tag.searchUrl||tag.name} destination={<ResultsView initial={createTagSearchState(tag.searchUrl,group.namespace,tag.name,translated(group.namespace,tag.name))}/>}><Text font="caption">{translated(group.namespace,tag.name)}</Text></NavigationLink>)}</HStack>{group.tags.length>6?<HStack spacing={6}>{group.tags.slice(6,12).map(tag=><NavigationLink key={tag.searchUrl||tag.name} destination={<ResultsView initial={createTagSearchState(tag.searchUrl,group.namespace,tag.name,translated(group.namespace,tag.name))}/>}><Text font="caption">{translated(group.namespace,tag.name)}</Text></NavigationLink>)}</HStack>:null}</VStack>)}</VStack>:null}{detail?<VStack alignment="leading" spacing={10} frame={{maxWidth:"infinity"}}><HStack><Text font="headline">图片 · {detail.pageLinks.length}</Text><Spacer/>{previewsLoading?<Text font="caption" foregroundStyle="secondaryLabel">正在后台加载更多预览…</Text>:<Text font="caption" foregroundStyle="secondaryLabel">点击缩略图阅读</Text>}</HStack>{failed.length?<Text font="caption" foregroundStyle="systemOrange">{failed.length} 个预览分页加载失败，不影响已加载内容。</Text>:null}<LazyVGrid columns={[{size:{type:"adaptive",min:112,max:150}}]} alignment="leading" spacing={12}>{detail.pageLinks.map((page,index)=><NavigationLink key={page.id} destination={<ReaderView pages={detail.pageLinks} startIndex={index}/>}><VStack spacing={6} frame={{maxWidth:"infinity"}}><PreviewThumbnail page={page}/><Text font="caption" foregroundStyle="secondaryLabel">第 {page.index} 页</Text></VStack></NavigationLink>)}</LazyVGrid></VStack>:null}</VStack></ScrollView>}

function ReaderView({pages,startIndex}:{pages:GalleryPageLink[];startIndex:number}){const[index,setIndex]=useState(startIndex);const[resolved,setResolved]=useState<{url:string;referer:string}|null>(null);const[loading,setLoading]=useState(true);const[error,setError]=useState("");const current=pages[index];useEffect(()=>{let cancelled=false;(async()=>{if(!current)return;setLoading(true);setResolved(null);setError("");try{const value=await resolveImagePage(current.pageUrl);if(!cancelled)setResolved({url:value.imageUrl,referer:value.pageUrl})}catch(e){if(!cancelled){setError("图片地址解析失败，请稍后重试");void reportSafe({stage:"reader-image",ok:false,error:e,request:{url:current.pageUrl,status:0,statusText:""},notes:`host=${imageHost(current.pageUrl)}; resolve=failed; settle=not-started`})}}finally{if(!cancelled)setLoading(false)}})();return()=>{cancelled=true}},[index,current?.pageUrl]);return <ScrollView navigationTitle={`${index+1} / ${pages.length}`} navigationBarTitleDisplayMode="inline"><VStack alignment="center" spacing={14} padding>{loading?<ProgressView title="解析图片地址…" progressViewStyle="circular"/>:null}{resolved?<CachedReaderImage url={resolved.url} referer={resolved.referer}/>:null}<ErrorText message={error}/><HStack spacing={18}><Button title="上一页" systemImage="chevron.left" disabled={index<=0||loading} action={()=>setIndex(v=>Math.max(0,v-1))}/><Text>{current?`第 ${current.index} 页`:""}</Text><Button title="下一页" systemImage="chevron.right" disabled={index>=pages.length-1||loading} action={()=>setIndex(v=>Math.min(pages.length-1,v+1))}/></HStack></VStack></ScrollView>}

export async function runAppV2(){await Navigation.present({element:<NavigationStack><HomeView/></NavigationStack>})}
