export type GalleryCategoryKey = "all" | "doujinshi" | "manga" | "artistcg" | "gamecg" | "western" | "non-h" | "imageset" | "cosplay" | "asianporn" | "misc"
export type GalleryCategoryOption = { key: GalleryCategoryKey; label: string; shortLabel: string; rawLabel: string; bit: number }
export const ALL_CATEGORY_MASK = 0x3ff
export const GALLERY_CATEGORIES: GalleryCategoryOption[] = [
  { key:"all",label:"全部分类",shortLabel:"全部",rawLabel:"All",bit:0 },
  { key:"doujinshi",label:"同人志",shortLabel:"同人",rawLabel:"Doujinshi",bit:0x2 },
  { key:"manga",label:"漫画",shortLabel:"漫画",rawLabel:"Manga",bit:0x4 },
  { key:"artistcg",label:"画师 CG",shortLabel:"画师 CG",rawLabel:"Artist CG",bit:0x8 },
  { key:"gamecg",label:"游戏 CG",shortLabel:"游戏 CG",rawLabel:"Game CG",bit:0x10 },
  { key:"western",label:"欧美",shortLabel:"欧美",rawLabel:"Western",bit:0x200 },
  { key:"non-h",label:"全年龄",shortLabel:"全年龄",rawLabel:"Non-H",bit:0x100 },
  { key:"imageset",label:"图集",shortLabel:"图集",rawLabel:"Image Set",bit:0x20 },
  { key:"cosplay",label:"Cosplay",shortLabel:"Cosplay",rawLabel:"Cosplay",bit:0x40 },
  { key:"asianporn",label:"亚洲真人",shortLabel:"亚洲真人",rawLabel:"Asian Porn",bit:0x80 },
  { key:"misc",label:"其他",shortLabel:"其他",rawLabel:"Misc",bit:0x1 },
]

export type QuickFilterKey = "none" | "chinese" | "japanese" | "english" | "translated" | "speechless"
export type QuickFilterOption = { key: QuickFilterKey; label: string; query: string }
export const QUICK_FILTERS: QuickFilterOption[] = [
  { key:"none",label:"不限语言",query:"" },
  { key:"chinese",label:"中文",query:"language:chinese" },
  { key:"japanese",label:"日文",query:"language:japanese" },
  { key:"english",label:"英文",query:"language:english" },
  { key:"translated",label:"翻译本",query:"language:translated" },
  { key:"speechless",label:"无对白",query:"language:speechless" },
]

export type GallerySearchMode = "normal" | "tag" | "uploader" | "popular"
export type AdvancedSearchOptions = {
  enabled:boolean
  searchName:boolean
  searchTags:boolean
  searchDescription:boolean
  minimumRating:""|"2"|"3"|"4"|"5"
  pageFrom:string
  pageTo:string
  searchTorrents:boolean
  showExpunged:boolean
  searchTorrentFilenames:boolean
  searchLowPowerTags:boolean
  searchDownvotedTags:boolean
  disableLanguageFilter:boolean
  disableUploaderFilter:boolean
  disableTagFilter:boolean
}
export const DEFAULT_ADVANCED_SEARCH:AdvancedSearchOptions={enabled:false,searchName:true,searchTags:true,searchDescription:false,minimumRating:"",pageFrom:"",pageTo:"",searchTorrents:false,showExpunged:false,searchTorrentFilenames:false,searchLowPowerTags:false,searchDownvotedTags:false,disableLanguageFilter:false,disableUploaderFilter:false,disableTagFilter:false}
export type GallerySearchTag={namespace:string;tag:string;display:string}
export type GallerySearchState={keyword:string;excludedCategoryMask:number;quickFilter:QuickFilterKey;mode:GallerySearchMode;sourceUrl:string;rawQuery:string;displayQuery:string;selectedTags:GallerySearchTag[];advanced:AdvancedSearchOptions}

const CATEGORY_ZH:Record<string,string>={doujinshi:"同人志",manga:"漫画","artist cg":"画师 CG","game cg":"游戏 CG",western:"欧美","non h":"全年龄","image set":"图集",cosplay:"Cosplay","asian porn":"亚洲真人",misc:"其他",private:"私有"}
const NAMESPACE_ZH:Record<string,string>={reclass:"重新分类",language:"语言",parody:"原作",character:"角色",group:"社团",artist:"艺术家",male:"男性",female:"女性",mixed:"混合",other:"其他",cosplayer:"Coser",location:"地点",temp:"临时标签"}
const METADATA_ZH:Record<string,string>={posted:"发布时间",parent:"父画廊",visible:"可见性",language:"语言","file size":"文件大小",length:"页数",favorited:"收藏",rating:"评分",uploader:"上传者"}
const COMMON_TAG_ZH:Record<string,string>={"language:chinese":"汉语","language:japanese":"日语","language:english":"英语","language:korean":"韩语","language:french":"法语","language:german":"德语","language:spanish":"西班牙语","language:russian":"俄语","language:thai":"泰语","language:vietnamese":"越南语","language:translated":"翻译","language:rewrite":"改写","language:speechless":"无对白","other:full color":"全彩","other:anthology":"选集","other:story arc":"剧情连续","other:uncensored":"无修正","other:censored":"有修正","reclass:non-h":"全年龄"}
function normalize(value:string){return String(value||"").trim().toLowerCase().replace(/[_-]+/g," ").replace(/\s+/g," ")}
const TAG_PREFIX_BY_NAMESPACE:Record<string,string>={rows:"n",artist:"a",cosplayer:"cos",character:"c",female:"f",group:"g",language:"l",male:"m",mixed:"x",other:"o",parody:"p",reclass:"r"}
function normalizeTagPart(value:string){return String(value||"").trim().toLowerCase().replace(/\s+/g," ").replace(/:$/g,"")}
function normalizeDigits(value:unknown){const text=String(value??"").replace(/\D/g,"").slice(0,8);return text&&Number(text)>0?String(Math.floor(Number(text))):""}
export function normalizeExcludedCategoryMask(value:unknown){const number=Number(value);return Number.isInteger(number)&&number>=0?number&ALL_CATEGORY_MASK:0}
export function excludedMaskForOnlyCategory(key:GalleryCategoryKey){const bit=getCategoryOption(key).bit;return bit?ALL_CATEGORY_MASK&~bit:0}
export function toggleExcludedCategory(mask:number,bit:number){return normalizeExcludedCategoryMask(normalizeExcludedCategoryMask(mask)^(bit&ALL_CATEGORY_MASK))}
export function normalizeAdvancedSearch(value:Partial<AdvancedSearchOptions>|null|undefined):AdvancedSearchOptions{const rating=["","2","3","4","5"].includes(String(value?.minimumRating??""))?String(value?.minimumRating??"") as AdvancedSearchOptions["minimumRating"]:"";return{enabled:Boolean(value?.enabled),searchName:value?.searchName!==false,searchTags:value?.searchTags!==false,searchDescription:Boolean(value?.searchDescription),minimumRating:rating,pageFrom:normalizeDigits(value?.pageFrom),pageTo:normalizeDigits(value?.pageTo),searchTorrents:Boolean(value?.searchTorrents),showExpunged:Boolean(value?.showExpunged),searchTorrentFilenames:Boolean(value?.searchTorrentFilenames),searchLowPowerTags:Boolean(value?.searchLowPowerTags),searchDownvotedTags:Boolean(value?.searchDownvotedTags),disableLanguageFilter:Boolean(value?.disableLanguageFilter),disableUploaderFilter:Boolean(value?.disableUploaderFilter),disableTagFilter:Boolean(value?.disableTagFilter)}}
export function createGallerySearchTag(namespace:string,tag:string,display=""):GallerySearchTag|null{const ns=normalizeTagPart(namespace),value=normalizeTagPart(tag);if(!TAG_PREFIX_BY_NAMESPACE[ns]||!value)return null;return{namespace:ns,tag:value,display:String(display||"").trim()||value}}
function gallerySearchTagKey(value:GallerySearchTag){return`${TAG_PREFIX_BY_NAMESPACE[value.namespace]||value.namespace}:${normalizeTagPart(value.tag)}`}
export function galleryExactTagTerm(value:GallerySearchTag){const prefix=TAG_PREFIX_BY_NAMESPACE[normalizeTagPart(value.namespace)];if(!prefix)return"";const tag=normalizeTagPart(value.tag).replace(/\\/g,"\\\\").replace(/"/g,'\\"');return tag?`${prefix}:"${tag}$"`:""}
export function composeGallerySearchState(state:GallerySearchState,plainText:string,selectedTags:readonly GallerySearchTag[]):GallerySearchState{const tags:GallerySearchTag[]=[],seen=new Set<string>();for(const item of selectedTags){const tag=createGallerySearchTag(item.namespace,item.tag,item.display);if(!tag)continue;const key=gallerySearchTagKey(tag);if(seen.has(key))continue;seen.add(key);tags.push(tag)}const keyword=String(plainText||"").trim(),rawQuery=[keyword,...tags.map(galleryExactTagTerm)].filter(Boolean).join(" "),displayQuery=[keyword,...tags.map(tag=>tag.display||tag.tag)].filter(Boolean).join(" · ");return{...state,keyword,rawQuery,displayQuery,selectedTags:tags,excludedCategoryMask:normalizeExcludedCategoryMask(state.excludedCategoryMask),advanced:normalizeAdvancedSearch(state.advanced)}}
export function removeGallerySearchTag(state:GallerySearchState,tag:GallerySearchTag){const key=gallerySearchTagKey(tag);return composeGallerySearchState(state,state.keyword,(state.selectedTags||[]).filter(item=>gallerySearchTagKey(item)!==key))}
export function getCategoryOption(key:GalleryCategoryKey){return GALLERY_CATEGORIES.find(item=>item.key===key)||GALLERY_CATEGORIES[0]}
export function getQuickFilter(key:QuickFilterKey){return QUICK_FILTERS.find(item=>item.key===key)||QUICK_FILTERS[0]}
export function localizeCategory(value:string){const raw=String(value||"").trim();return CATEGORY_ZH[normalize(raw)]||raw}
export function localizeTagNamespace(value:string){const raw=String(value||"").trim().replace(/:$/,"");return NAMESPACE_ZH[normalize(raw)]||raw}
export function localizeMetadataKey(value:string){const raw=String(value||"").trim().replace(/:$/,"");return METADATA_ZH[normalize(raw)]||raw}
export function localizeCommonTag(namespace:string,tag:string){return COMMON_TAG_ZH[`${normalize(namespace)}:${normalize(tag)}`]||""}
export function createHomeSearchState(keyword="",category:GalleryCategoryKey="all",quickFilter:QuickFilterKey="none"):GallerySearchState{const q=String(keyword||"").trim();return{keyword:q,excludedCategoryMask:excludedMaskForOnlyCategory(category),quickFilter,mode:"normal",sourceUrl:"",rawQuery:q,displayQuery:q,selectedTags:[],advanced:{...DEFAULT_ADVANCED_SEARCH}}}
export function createTagSearchState(searchUrl:string,namespace:string,tag:string,translated:string):GallerySearchState{const base:GallerySearchState={keyword:"",excludedCategoryMask:0,quickFilter:"none",mode:"tag",sourceUrl:String(searchUrl||""),rawQuery:"",displayQuery:"",selectedTags:[],advanced:{...DEFAULT_ADVANCED_SEARCH}},selected=createGallerySearchTag(namespace,tag,translated);return selected?composeGallerySearchState(base,"",[selected]):base}
export function createUploaderSearchState(uploader:string):GallerySearchState{const value=String(uploader||"").trim();return{keyword:value,excludedCategoryMask:0,quickFilter:"none",mode:"uploader",sourceUrl:"",rawQuery:value?`uploader:${value}`:"",displayQuery:value?`上传者：${value}`:"上传者",selectedTags:[],advanced:{...DEFAULT_ADVANCED_SEARCH}}}
export function createPopularSearchState():GallerySearchState{return{keyword:"",excludedCategoryMask:0,quickFilter:"none",mode:"popular",sourceUrl:"",rawQuery:"",displayQuery:"热门画廊",selectedTags:[],advanced:{...DEFAULT_ADVANCED_SEARCH}}}
export function cloneSearchState(state:GallerySearchState):GallerySearchState{return{...state,excludedCategoryMask:normalizeExcludedCategoryMask(state.excludedCategoryMask),selectedTags:[...(state.selectedTags||[])],advanced:normalizeAdvancedSearch(state.advanced)}}
function applyCategory(url:URL,mask:number){const value=normalizeExcludedCategoryMask(mask);if(value)url.searchParams.set("f_cats",String(value));else url.searchParams.delete("f_cats")}
function applyAdvanced(url:URL,advancedValue:AdvancedSearchOptions){const keys=["advsearch","f_sname","f_stags","f_sdesc","f_srdd","f_spf","f_spt","f_sto","f_sh","f_storr","f_sdt1","f_sdt2","f_sfl","f_sfu","f_sft"];for(const key of keys)url.searchParams.delete(key);const advanced=normalizeAdvancedSearch(advancedValue);if(!advanced.enabled)return;url.searchParams.set("advsearch","1");if(advanced.searchName)url.searchParams.set("f_sname","on");if(advanced.searchTags)url.searchParams.set("f_stags","on");if(advanced.searchDescription)url.searchParams.set("f_sdesc","on");if(advanced.minimumRating)url.searchParams.set("f_srdd",advanced.minimumRating);if(advanced.pageFrom)url.searchParams.set("f_spf",advanced.pageFrom);if(advanced.pageTo)url.searchParams.set("f_spt",advanced.pageTo);if(advanced.searchTorrents)url.searchParams.set("f_sto","on");if(advanced.showExpunged)url.searchParams.set("f_sh","on");if(advanced.searchTorrentFilenames)url.searchParams.set("f_storr","on");if(advanced.searchLowPowerTags)url.searchParams.set("f_sdt1","on");if(advanced.searchDownvotedTags)url.searchParams.set("f_sdt2","on");if(advanced.disableLanguageFilter)url.searchParams.set("f_sfl","on");if(advanced.disableUploaderFilter)url.searchParams.set("f_sfu","on");if(advanced.disableTagFilter)url.searchParams.set("f_sft","on")}
export function buildGallerySearchUrl(baseUrl:string,state:GallerySearchState):string{let url:URL;if(state.mode==="uploader"&&state.keyword.trim())url=new URL(`/uploader/${encodeURIComponent(state.keyword.trim())}/`,baseUrl);else if(state.mode==="popular")url=new URL("popular",baseUrl);else if(state.sourceUrl)url=new URL(state.sourceUrl,baseUrl);else url=new URL(baseUrl);applyCategory(url,state.excludedCategoryMask);if(state.mode!=="uploader"&&state.mode!=="popular"){const existing=String(url.searchParams.get("f_search")||"").trim(),primary=state.rawQuery.trim()||existing||state.keyword.trim(),quick=getQuickFilter(state.quickFilter).query,query=[primary,quick].filter(Boolean).join(" ");if(query)url.searchParams.set("f_search",query);else url.searchParams.delete("f_search")}applyAdvanced(url,state.advanced);return url.toString()}
export function buildTouristBrowseUrl(baseUrl:string,keyword:string,category:GalleryCategoryKey="all",quick:QuickFilterKey="none"){return buildGallerySearchUrl(baseUrl,createHomeSearchState(keyword,category,quick))}
export function excludedCategoryLabels(mask:number){const value=normalizeExcludedCategoryMask(mask);return GALLERY_CATEGORIES.filter(item=>item.bit&&(value&item.bit)!==0).map(item=>item.label)}
export function categoryExclusionSummary(mask:number){const labels=excludedCategoryLabels(mask);return labels.length?`排除 ${labels.join("、")}`:"全部分类"}
export function onlyIncludedCategory(mask:number){const value=normalizeExcludedCategoryMask(mask);return GALLERY_CATEGORIES.find(item=>item.bit&&(ALL_CATEGORY_MASK&~item.bit)===value)||null}
export function searchTitle(state:GallerySearchState){if(state.displayQuery.trim())return state.displayQuery.trim();if(state.keyword.trim())return state.keyword.trim();const only=onlyIncludedCategory(state.excludedCategoryMask),quick=getQuickFilter(state.quickFilter);if(only&&state.quickFilter!=="none")return`${only.label} · ${quick.label}`;if(only)return only.label;if(state.quickFilter!=="none")return quick.label;return"画廊搜索"}
export function searchRawQuery(state:GallerySearchState){if(state.mode==="popular")return"";if(state.mode==="uploader")return state.keyword.trim()?`uploader:${state.keyword.trim()}`:"";return state.rawQuery.trim()||state.keyword.trim()}
export function browseSummary(keyword:string,category:GalleryCategoryKey,quick:QuickFilterKey){const parts:string[]=[];if(category!=="all")parts.push(getCategoryOption(category).label);if(quick!=="none")parts.push(getQuickFilter(quick).label);if(String(keyword||"").trim())parts.push(`“${String(keyword).trim()}”`);return parts.length?parts.join(" · "):"最新公开画廊"}
