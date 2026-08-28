import { Button, EnvironmentValuesReader, Label, List, Navigation, NavigationLink, NavigationSplitView, NavigationStack, Section, TabView, Text, useEffect, useState } from "scripting"
import { AccountScene, HomeScene } from "./GalleryFlow"
import { LibraryScene, SettingsScene } from "./LibraryScene"
import { recoverInterruptedDownloads } from "./libraryStore"

type RootDestination="discover"|"library"|"settings"
const ROOTS:Array<{key:RootDestination;title:string;icon:string}>=[
  {key:"discover",title:"发现",icon:"safari"},
  {key:"library",title:"书库",icon:"books.vertical"},
  {key:"settings",title:"设置",icon:"gearshape"},
]

function SettingsRoot(){return <List navigationTitle="设置"><Section><NavigationLink destination={<AccountScene/>}><Text>账号与站点</Text></NavigationLink><NavigationLink destination={<SettingsScene/>}><Text>阅读、下载与缓存设置</Text></NavigationLink></Section></List>}
function RootScene({value}:{value:RootDestination}){if(value==="library")return <LibraryScene/>;if(value==="settings")return <SettingsRoot/>;return <HomeScene/>}
function RegularShell(){const[selected,setSelected]=useState<RootDestination>("discover");return <NavigationSplitView sidebar={<List navigationTitle="E-Hentai" navigationSplitViewColumnWidth={{min:220,ideal:240,max:280}}><Section>{ROOTS.map(item=><Button key={item.key} action={()=>setSelected(item.key)} buttonStyle="plain"><Label title={item.title} systemImage={item.icon}/></Button>)}</Section></List>}><NavigationStack><RootScene value={selected}/></NavigationStack></NavigationSplitView>}
function CompactShell(){return <TabView tabIndex={0}><NavigationStack tabItem={<Label title="发现" systemImage="safari"/>} tag={0}><HomeScene/></NavigationStack><NavigationStack tabItem={<Label title="书库" systemImage="books.vertical"/>} tag={1}><LibraryScene/></NavigationStack><NavigationStack tabItem={<Label title="设置" systemImage="gearshape"/>} tag={2}><SettingsRoot/></NavigationStack></TabView>}
function ResponsiveShell(){const[generation,setGeneration]=useState(0);useEffect(()=>{const previous=(globalThis as any).__ehAccountContextChanged;(globalThis as any).__ehAccountContextChanged=(value:number)=>setGeneration(Number(value)||Date.now());return()=>{(globalThis as any).__ehAccountContextChanged=previous}},[]);return <EnvironmentValuesReader key={generation} keys={["horizontalSizeClass"]}>{environment=>environment.horizontalSizeClass==="compact"?<CompactShell/>:<RegularShell/>}</EnvironmentValuesReader>}

export async function runAppV2(){try{await recoverInterruptedDownloads()}catch(error){console.error(error)}await Navigation.present({element:<ResponsiveShell/>})}
