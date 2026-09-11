import { Button, EnvironmentValuesReader, Label, List, Navigation, NavigationLink, NavigationSplitView, NavigationStack, Section, TabView, Text, ZStack, useEffect, useRef, useState } from "scripting"
import { AccountScene, GalleryDetailView, HomeScene, presentRootGallery, subscribeRootGallery } from "./GalleryFlow"
import { LibraryScene, SettingsScene } from "./LibraryScene"
import { recoverDownloadsOnStartup } from "./libraryStore"
import { getAccountSessionGeneration } from "./account"
import type { GallerySummary } from "./extractors"

type RootDestination="discover"|"library"|"settings"
const ROOTS:Array<{key:RootDestination;title:string;icon:string}>=[
  {key:"discover",title:"发现",icon:"safari"},
  {key:"library",title:"书库",icon:"books.vertical"},
  {key:"settings",title:"设置",icon:"gearshape"},
]

function SettingsRoot(){return <List navigationTitle="设置"><Section><NavigationLink destination={<AccountScene/>}><Text>账号与站点</Text></NavigationLink><NavigationLink destination={<SettingsScene/>}><Text>阅读、下载与缓存设置</Text></NavigationLink></Section></List>}
function RootScene({value}:{value:RootDestination}){if(value==="library")return <LibraryScene sessionGeneration={getAccountSessionGeneration()}/>;if(value==="settings")return <SettingsRoot/>;return <HomeScene/>}
export function regularRootNavigationKey(selected:RootDestination,epoch=0){return `regular-root:${selected}:${epoch}`}
function RegularShell({selected,onSelectedChanged}:{selected:RootDestination;onSelectedChanged:(value:RootDestination)=>void}){
  const[epoch,setEpoch]=useState(0)
  const[gallery,setGallery]=useState<GallerySummary|null>(null)
  const galleryRef=useRef<GallerySummary|null>(null)
  galleryRef.current=gallery
  useEffect(()=>subscribeRootGallery(setGallery),[])
  const choose=(value:RootDestination)=>{
    const hadGallery=Boolean(galleryRef.current)
    presentRootGallery(null)
    if(value!==selected){onSelectedChanged(value);setEpoch(0)}
    else if(!hadGallery)setEpoch(count=>count+1)
  }
  return <NavigationSplitView sidebar={<List navigationTitle="E-Hentai" navigationSplitViewColumnWidth={{min:220,ideal:240,max:280}} selection={{value:selected,onChanged:value=>{if(value)choose(value as RootDestination)}}}><Section>{ROOTS.map(item=><Button key={item.key} tag={item.key} action={()=>choose(item.key)} buttonStyle="plain"><Label title={item.title} systemImage={item.icon}/></Button>)}</Section></List>}>
    <ZStack>
      <NavigationStack key={regularRootNavigationKey(selected,epoch)}><RootScene value={selected}/></NavigationStack>
      {gallery?<NavigationStack><GalleryDetailView summary={gallery} onClose={()=>presentRootGallery(null)}/></NavigationStack>:null}
    </ZStack>
  </NavigationSplitView>
}
function CompactShell({selected,onSelectedChanged,generation}:{selected:RootDestination;onSelectedChanged:(value:RootDestination)=>void;generation:number}){const tabIndex=ROOTS.findIndex(item=>item.key===selected);return <TabView tabIndex={Math.max(0,tabIndex)} onTabIndexChanged={index=>{const next=ROOTS[index];if(next)onSelectedChanged(next.key)}}><NavigationStack tabItem={<Label title="发现" systemImage="safari"/>} tag={0}><HomeScene/></NavigationStack><NavigationStack tabItem={<Label title="书库" systemImage="books.vertical"/>} tag={1}><LibraryScene sessionGeneration={generation}/></NavigationStack><NavigationStack tabItem={<Label title="设置" systemImage="gearshape"/>} tag={2}><SettingsRoot/></NavigationStack></TabView>}
function ResponsiveShell(){const[generation,setGeneration]=useState(0),[selected,setSelected]=useState<RootDestination>("discover");useEffect(()=>{const previous=(globalThis as any).__ehAccountContextChanged;(globalThis as any).__ehAccountContextChanged=(value:number)=>{setGeneration(Number(value)||Date.now())};return()=>{(globalThis as any).__ehAccountContextChanged=previous}},[]);return <EnvironmentValuesReader key={generation} keys={["horizontalSizeClass"]}>{environment=>environment.horizontalSizeClass==="compact"?<CompactShell selected={selected} onSelectedChanged={setSelected} generation={generation}/>:<RegularShell selected={selected} onSelectedChanged={setSelected}/>}</EnvironmentValuesReader>}

export async function runAppV2(){try{await recoverDownloadsOnStartup()}catch(error){console.error(error)}await Navigation.present({element:<ResponsiveShell/>})}
