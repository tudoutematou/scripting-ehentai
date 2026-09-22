import { Button, EnvironmentValuesReader, Label, List, Navigation, NavigationLink, NavigationSplitView, NavigationStack, Section, TabView, Text, useEffect, useState } from "scripting"
import { AccountScene, HomeScene, subscribeGalleryDetailCount } from "./GalleryFlow"
import { CacheScene, DownloadsScene, HistoryScene, LibraryScene, SettingsScene } from "./LibraryScene"
import { recoverDownloadsOnStartup } from "./libraryStore"
import { getAccountSessionGeneration } from "./account"
import { SettingsRowLabel } from "./GlassUI"

type RootDestination="discover"|"library"|"settings"
const ROOTS:Array<{key:RootDestination;title:string;icon:string}>=[
  {key:"discover",title:"发现",icon:"safari"},
  {key:"library",title:"书库",icon:"books.vertical"},
  {key:"settings",title:"设置",icon:"gearshape"},
]

export const SETTINGS_ROOT_SECTIONS=["account","reading","downloads","data"] as const
function SettingsRoot(){return <List navigationTitle="设置" navigationBarTitleDisplayMode="large" listStyle="insetGroup" listSectionSpacing="compact"><Section title="账号"><NavigationLink destination={<AccountScene/>}><SettingsRowLabel title="账号与站点" subtitle="登录、切换账号与选择 E / Ex 站点" systemImage="person.crop.circle"/></NavigationLink></Section><Section title="阅读"><NavigationLink destination={<SettingsScene/>}><SettingsRowLabel title="阅读设置" subtitle="阅读模式、方向、图片显示与自动翻页" systemImage="book"/></NavigationLink></Section><Section title="下载与缓存"><NavigationLink destination={<DownloadsScene/>}><SettingsRowLabel title="下载与离线阅读" subtitle="管理下载任务与离线画廊" systemImage="arrow.down.circle"/></NavigationLink><NavigationLink destination={<CacheScene/>}><SettingsRowLabel title="图片缓存管理" subtitle="清理在线封面和阅读图片缓存" systemImage="externaldrive"/></NavigationLink></Section><Section title="数据"><NavigationLink destination={<HistoryScene/>}><SettingsRowLabel title="历史记录与继续阅读" subtitle="查看历史、重置或清除阅读进度" systemImage="clock.arrow.circlepath"/></NavigationLink><NavigationLink destination={<LibraryScene titleMode="inline"/>}><SettingsRowLabel title="完整书库" subtitle="收藏、书签、历史与下载内容" systemImage="books.vertical"/></NavigationLink></Section></List>}
function RootScene({value}:{value:RootDestination}){if(value==="library")return <LibraryScene sessionGeneration={getAccountSessionGeneration()}/>;if(value==="settings")return <SettingsRoot/>;return <HomeScene/>}
export function regularRootNavigationKey(selected:RootDestination,epoch=0){return `regular-root:${selected}:${epoch}`}
export function splitColumnVisibility(galleryPresented:boolean){return galleryPresented?"detailOnly":"doubleColumn"}
export function resolvedSplitColumnVisibility(galleryPresented:boolean,userVisibility:string){return galleryPresented?"detailOnly":userVisibility||"doubleColumn"}
function RegularShell({selected,onSelectedChanged}:{selected:RootDestination;onSelectedChanged:(value:RootDestination)=>void}){
  const[epoch,setEpoch]=useState(0)
  const[galleryCount,setGalleryCount]=useState(0)
  const[userColumnVisibility,setUserColumnVisibility]=useState<any>("doubleColumn")
  useEffect(()=>subscribeGalleryDetailCount(setGalleryCount),[])
  const choose=(value:RootDestination)=>{if(value!==selected){onSelectedChanged(value);setEpoch(0)}else setEpoch(count=>count+1)}
  return <NavigationSplitView columnVisibility={{value:resolvedSplitColumnVisibility(galleryCount>0,userColumnVisibility) as any,onChanged:(value:any)=>{if(galleryCount===0)setUserColumnVisibility(value)}}} sidebar={<List navigationTitle="E-Hentai" listStyle="sidebar" navigationSplitViewColumnWidth={{min:220,ideal:240,max:280}}><Section>{ROOTS.map(item=><Button key={item.key} buttonStyle="plain" action={()=>choose(item.key)} padding={{horizontal:10,vertical:9}} frame={{maxWidth:"infinity",alignment:"leading"}} background={selected===item.key?"tertiarySystemFill":"clear"} clipShape={{type:"rect",cornerRadius:10,style:"continuous"}}><Label title={item.title} systemImage={item.icon}/></Button>)}</Section></List>}>
    <NavigationStack key={regularRootNavigationKey(selected,epoch)}><RootScene value={selected}/></NavigationStack>
  </NavigationSplitView>
}
function CompactShell({selected,onSelectedChanged,generation}:{selected:RootDestination;onSelectedChanged:(value:RootDestination)=>void;generation:number}){const tabIndex=ROOTS.findIndex(item=>item.key===selected);return <TabView tabIndex={Math.max(0,tabIndex)} onTabIndexChanged={index=>{const next=ROOTS[index];if(next)onSelectedChanged(next.key)}}><NavigationStack tabItem={<Label title="发现" systemImage="safari"/>} tag={0}><HomeScene/></NavigationStack><NavigationStack tabItem={<Label title="书库" systemImage="books.vertical"/>} tag={1}><LibraryScene sessionGeneration={generation}/></NavigationStack><NavigationStack tabItem={<Label title="设置" systemImage="gearshape"/>} tag={2}><SettingsRoot/></NavigationStack></TabView>}
function ResponsiveShell(){const[generation,setGeneration]=useState(0),[selected,setSelected]=useState<RootDestination>("discover");useEffect(()=>{const previous=(globalThis as any).__ehAccountContextChanged;(globalThis as any).__ehAccountContextChanged=(value:number)=>{setGeneration(Number(value)||Date.now())};return()=>{(globalThis as any).__ehAccountContextChanged=previous}},[]);return <EnvironmentValuesReader key={generation} keys={["horizontalSizeClass"]}>{environment=>environment.horizontalSizeClass==="compact"?<CompactShell selected={selected} onSelectedChanged={setSelected} generation={generation}/>:<RegularShell selected={selected} onSelectedChanged={setSelected}/>}</EnvironmentValuesReader>}

export async function runAppV2(){try{await recoverDownloadsOnStartup()}catch(error){console.error(error)}await Navigation.present({element:<ResponsiveShell/>})}
