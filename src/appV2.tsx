import { Button, EnvironmentValuesReader, Label, List, Navigation, NavigationLink, NavigationSplitView, NavigationStack, Section, TabView, Text, useEffect, useState } from "scripting"
import { AccountScene, HomeScene } from "./GalleryFlow"
import { LibraryScene, SettingsScene } from "./LibraryScene"
import { recoverDownloadsOnStartup } from "./libraryStore"
import { getAccountSessionGeneration } from "./account"

type RootDestination="discover"|"library"|"settings"
const ROOTS:Array<{key:RootDestination;title:string;icon:string}>=[
  {key:"discover",title:"发现",icon:"safari"},
  {key:"library",title:"书库",icon:"books.vertical"},
  {key:"settings",title:"设置",icon:"gearshape"},
]

function SettingsRoot(){return <List navigationTitle="设置"><Section><NavigationLink destination={<AccountScene/>}><Text>账号与站点</Text></NavigationLink><NavigationLink destination={<SettingsScene/>}><Text>阅读、下载与缓存设置</Text></NavigationLink></Section></List>}
function RootScene({value}:{value:RootDestination}){if(value==="library")return <LibraryScene sessionGeneration={getAccountSessionGeneration()}/>;if(value==="settings")return <SettingsRoot/>;return <HomeScene/>}
export function regularRootNavigationKey(selected:RootDestination){return `regular-root:${selected}`}
function RegularShell({selected,onSelectedChanged}:{selected:RootDestination;onSelectedChanged:(value:RootDestination)=>void}){return <NavigationSplitView sidebar={<List navigationTitle="E-Hentai" navigationSplitViewColumnWidth={{min:220,ideal:240,max:280}}><Section>{ROOTS.map(item=><Button key={item.key} action={()=>onSelectedChanged(item.key)} buttonStyle="plain"><Label title={item.title} systemImage={item.icon}/></Button>)}</Section></List>}><NavigationStack key={regularRootNavigationKey(selected)}><RootScene value={selected}/></NavigationStack></NavigationSplitView>}
function CompactShell({selected,onSelectedChanged,generation}:{selected:RootDestination;onSelectedChanged:(value:RootDestination)=>void;generation:number}){const tabIndex=ROOTS.findIndex(item=>item.key===selected);return <TabView tabIndex={Math.max(0,tabIndex)} onTabIndexChanged={index=>{const next=ROOTS[index];if(next)onSelectedChanged(next.key)}}><NavigationStack tabItem={<Label title="发现" systemImage="safari"/>} tag={0}><HomeScene/></NavigationStack><NavigationStack tabItem={<Label title="书库" systemImage="books.vertical"/>} tag={1}><LibraryScene sessionGeneration={generation}/></NavigationStack><NavigationStack tabItem={<Label title="设置" systemImage="gearshape"/>} tag={2}><SettingsRoot/></NavigationStack></TabView>}
function ResponsiveShell(){const[generation,setGeneration]=useState(0),[selected,setSelected]=useState<RootDestination>("discover");useEffect(()=>{const previous=(globalThis as any).__ehAccountContextChanged;(globalThis as any).__ehAccountContextChanged=(value:number)=>{setGeneration(Number(value)||Date.now())};return()=>{(globalThis as any).__ehAccountContextChanged=previous}},[]);return <EnvironmentValuesReader key={generation} keys={["horizontalSizeClass"]}>{environment=>environment.horizontalSizeClass==="compact"?<CompactShell selected={selected} onSelectedChanged={setSelected} generation={generation}/>:<RegularShell selected={selected} onSelectedChanged={setSelected}/>}</EnvironmentValuesReader>}

export async function runAppV2(){try{await recoverDownloadsOnStartup()}catch(error){console.error(error)}await Navigation.present({element:<ResponsiveShell/>})}
