/** Explicit, typed navigation targets wired once by GalleryFlow. No runtime registry. */
import { type GallerySummary } from "./ehentai"
import { type GallerySearchState } from "./tourist"
export type SceneDestinations = {
  AIRecommendationFlow: () => any
  CoverSearchScene: (props: {coverUrl:string;referer:string}) => any
  DiscoveryScene: (props?: {initialKind?:"watched"|"top"}) => any
  GalleryDetailView: (props: {summary:GallerySummary}) => any
  GalleryGrid: (props: {items:GallerySummary[]}) => any
  HistoryScene: () => any
  ImageSearchScene: () => any
  LibraryGalleryGrid: (props: {items:GallerySummary[];noteForItem?:(item:GallerySummary)=>string}) => any
  QuickSearchScene: () => any
  ResultsView: (props: { initial: GallerySearchState }) => any
  SearchComposer: (props: {initial:GallerySearchState;compact?:boolean}) => any
  listedGalleryDestination: (_sizeClass:string|null|undefined,selected:GallerySummary|null,setSelected:(item:GallerySummary|null)=>void) => any
  openListedGallery: (_sizeClass:string|null|undefined,item:GallerySummary,setSelected:(item:GallerySummary|null)=>void) => any
}
