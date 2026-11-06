import { Button, EnvironmentValuesReader, LazyVGrid, VStack, useState } from "scripting"
import { GallerySummary } from "./ehentai"
import { galleryIdentity } from "./galleryIdentity"
import { galleryGridColumnCount, eagerHomeThumb } from "./galleryModel"
import { GalleryRow, GalleryCard } from "./GalleryCards"
import { type SceneDestinations } from "./sceneDestinations"

export function createGalleryNavigation(destinations: Pick<SceneDestinations, "GalleryDetailView">) {
const { GalleryDetailView } = destinations
function openListedGallery(_sizeClass:string|null|undefined,item:GallerySummary,setSelected:(item:GallerySummary|null)=>void){setSelected(item)}
function listedGalleryDestination(_sizeClass:string|null|undefined,selected:GallerySummary|null,setSelected:(item:GallerySummary|null)=>void){return {isPresented:Boolean(selected),onChanged:(presented:boolean)=>{if(!presented)setSelected(null)},content:selected?<GalleryDetailView key={galleryIdentity(selected)} summary={selected}/>:<VStack/>}}
function LibraryGalleryGrid({items,noteForItem}:{items:GallerySummary[];noteForItem?:(item:GallerySummary)=>string}){const[selected,setSelected]=useState<GallerySummary|null>(null);return <EnvironmentValuesReader keys={["horizontalSizeClass"]}>{environment=><LazyVGrid columns={Array.from({length:galleryGridColumnCount(environment.horizontalSizeClass)},()=>({size:{type:"flexible" as const}}))} alignment="leading" spacing={12} navigationDestination={listedGalleryDestination(environment.horizontalSizeClass,selected,setSelected)}>{items.map((item,index)=><Button key={galleryIdentity(item)} buttonStyle="plain" action={()=>openListedGallery(environment.horizontalSizeClass,item,setSelected)}>{environment.horizontalSizeClass==="compact"?<GalleryRow item={item} note={noteForItem?.(item)||""} eager={eagerHomeThumb(index)}/>:<GalleryCard item={item} note={noteForItem?.(item)||""} eager={eagerHomeThumb(index)}/>}</Button>)}</LazyVGrid>}</EnvironmentValuesReader>}
function GalleryGrid({items}:{items:GallerySummary[]}){return <LibraryGalleryGrid items={items}/>}

return { openListedGallery, listedGalleryDestination, LibraryGalleryGrid, GalleryGrid }
}
