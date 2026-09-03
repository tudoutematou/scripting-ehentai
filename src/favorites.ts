import { GallerySummary } from "./extractors"
import { parseSearchHtml } from "./searchHtml"
import { fetchHtml, invalidateGalleryCaches, postForm } from "./ehentai"
import { captureAccountRequestContext, getActiveSite, getAccountSessionGeneration, getBaseUrl, getAccountStatus, isAccountRequestContextCurrent, type AccountRequestContext } from "./account"
import { reportDiagnostic } from "./githubBridge"
import { parseGalleryRef } from "./pure"

export type FavoriteCategory = { index: number; name: string; count: number }
export type FavoriteSearch = { query?: string; searchName?: boolean; searchTags?: boolean; searchNote?: boolean }
export type FavoritesPage = { categories: FavoriteCategory[]; items: GallerySummary[]; resultCount: string; prevHref: string; nextHref: string; url: string }
export type FavoriteState = { category: number | null; note: string; categories: FavoriteCategory[] }
type UConfigSnapshot = { url: string; categories: FavoriteCategory[]; fields: Record<string, string> }

let categoryRevision = 0
const categoryListeners = new Set<() => void>()
export function favoriteCategoryRevision() { return categoryRevision }
export function subscribeFavoriteCategoryChanges(listener: () => void) { categoryListeners.add(listener); return () => categoryListeners.delete(listener) }
function notifyFavoriteCategoryChanges() { categoryRevision += 1; for (const listener of [...categoryListeners]) listener() }
export function isFavoriteRequestContextCurrent(site:string,generation:number,currentSite:string,currentGeneration:number){return site===currentSite&&generation===currentGeneration}
const clean = (value: string) => String(value || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim()
const decode = (value: string) => String(value || "").replace(/&nbsp;/gi, " ").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&amp;/gi, "&").replace(/&#(x[\da-f]+|\d+);/gi, (_, code) => { const value = String(code).toLowerCase(); const number = value.startsWith("x") ? Number.parseInt(value.slice(1), 16) : Number.parseInt(value, 10); return Number.isFinite(number) ? String.fromCodePoint(number) : _ })
function attr(source: string, name: string) { const quoted = source.match(new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i")); if (quoted) return decode(quoted[2]); return decode(source.match(new RegExp(`\\b${name}\\s*=\\s*([^\\s>]+)`, "i"))?.[1] || "") }
function disabled(source: string) { return /\bdisabled(?:\s|=|>|$)/i.test(source) }
function selected(source: string) { return /\bselected(?:\s|=|>|$)/i.test(source) }
function checked(source: string) { return /\bchecked(?:\s|=|>|$)/i.test(source) }
function uconfigForms(html: string) { return [...String(html || "").matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)].map(match => ({ header: match[1], body: match[2] })).filter(form => /\bname\s*=\s*(["'])favorite_0\1/i.test(form.body)) }
export function parseUConfigFavoriteCategories(html: string): FavoriteCategory[] {
  const form = uconfigForms(html)[0]
  if (!form) throw new Error("未在服务器 UConfig 中识别到收藏分类表单。")
  const values = new Map<number, string>()
  for (const match of form.body.matchAll(/<input\b([^>]*)>/gi)) { const source = match[1], name = attr(source, "name"), index = Number(name.match(/^favorite_([0-9])$/)?.[1]); if (disabled(source) || !Number.isInteger(index) || index < 0 || index > 9) continue; const value = attr(source, "value").trim(); if (!value) throw new Error(`服务器返回的收藏分类 ${index} 为空。`); if (value.length > 20) throw new Error(`服务器返回的收藏分类 ${index} 超出允许长度。`); values.set(index, value) }
  if (values.size !== 10) throw new Error("服务器 UConfig 未返回完整的 10 个收藏分类名称。")
  return Array.from({ length: 10 }, (_, index) => ({ index, name: values.get(index) || "", count: 0 }))
}
function parseUConfigFields(html: string): Record<string, string> {
  const form = uconfigForms(html)[0]
  if (!form) throw new Error("未在服务器 UConfig 中识别到可提交的设置表单。")
  const fields: Record<string, string> = {}
  for (const match of form.body.matchAll(/<input\b([^>]*)>/gi)) {
    const source = match[1], name = attr(source, "name"), type = attr(source, "type").toLowerCase() || "text"
    if (!name || disabled(source) || /^(?:submit|button|image|reset|file)$/i.test(type) || ((type === "radio" || type === "checkbox") && !checked(source))) continue
    fields[name] = attr(source, "value")
  }
  for (const match of form.body.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)) {
    const source = match[1], name = attr(source, "name")
    if (!name || disabled(source)) continue
    const options = [...match[2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)].filter(option => !disabled(option[1]))
    const option = options.find(option => selected(option[1])) || options[0]
    if (!option) throw new Error(`服务器 UConfig 的 ${name} 缺少可提交选项。`)
    fields[name] = attr(option[1], "value") || clean(decode(option[2]))
  }
  for (const match of form.body.matchAll(/<textarea\b([^>]*)>([\s\S]*?)<\/textarea>/gi)) { const source = match[1], name = attr(source, "name"); if (name && !disabled(source)) fields[name] = decode(match[2]) }
  if (Object.keys(fields).length < 10) throw new Error("服务器 UConfig 表单不完整，未提交任何更改。")
  return fields
}
export function validateFavoriteCategoryNames(names: readonly string[]) { if (names.length !== 10) throw new Error("必须提供完整的 10 个收藏分类名称。")
  return names.map((input, index) => { const name = String(input || "").trim(); if (!name) throw new Error(`收藏分类 ${index} 不能为空。`); if (name.length > 20) throw new Error(`收藏分类 ${index} 最多 20 个字符。`); if(/[\r\n\u0000]/.test(name)) throw new Error(`收藏分类 ${index} 包含无效字符。`); return name }) }
async function loadUConfigSnapshot(context:AccountRequestContext=captureAccountRequestContext()):Promise<UConfigSnapshot>{
  if(!getAccountStatus().loggedIn)throw new Error("请先登录后管理收藏分类。")
  const result=await fetchHtml(new URL("uconfig.php",getBaseUrl(context.site)).toString(),"favorites.uconfig.read","",undefined,context)
  if(favoriteLoginError(result.html))throw new Error("收藏分类管理需要登录。")
  return{url:result.finalUrl,categories:parseUConfigFavoriteCategories(result.html),fields:parseUConfigFields(result.html)}
}
export async function loadFavoriteCategoryManagement(): Promise<FavoriteCategory[]> { const context=captureAccountRequestContext(),[config,page]=await Promise.all([loadUConfigSnapshot(context),loadFavorites(undefined,{},undefined,undefined,context).catch(()=>null)])
  return config.categories.map(category => ({ ...category, count: page?.categories.find(item => item.index === category.index)?.count || 0 }))
}
export function buildUConfigRenameSubmission(html: string, names: readonly string[]) { const expected = validateFavoriteCategoryNames(names); return { ...parseUConfigFields(html), ...Object.fromEntries(expected.map((name, index) => [`favorite_${index}`, name])), apply: "Apply" } }
export async function renameFavoriteCategories(names:readonly string[]):Promise<FavoriteCategory[]>{
  const expected=validateFavoriteCategoryNames(names),context=captureAccountRequestContext(),before=await loadUConfigSnapshot(context)
  if(!isAccountRequestContextCurrent(context))throw new Error("账号或站点已切换，未提交收藏分类更改。")
  if(before.categories.every((category,index)=>category.name===expected[index]))return before.categories
  const fields={...before.fields,...Object.fromEntries(expected.map((name,index)=>[`favorite_${index}`,name])),apply:"Apply"}
  await postForm(before.url,fields,"favorites.uconfig.rename",context)
  if(!isAccountRequestContextCurrent(context))throw new Error("账号或站点已切换，无法确认收藏分类更改。")
  const verified=await loadUConfigSnapshot(context)
  if(!isAccountRequestContextCurrent(context))throw new Error("账号或站点已切换，收藏分类结果已失效。")
  if(!verified.categories.every((category,index)=>category.name===expected[index]))throw new Error("服务器返回的收藏分类名称与请求不一致，未更新本地显示。")
  const page=await loadFavorites(undefined,{},undefined,undefined,context).catch(()=>null)
  if(!isAccountRequestContextCurrent(context))throw new Error("账号或站点已切换，收藏分类结果已失效。")
  const categories=verified.categories.map(category=>({...category,count:page?.categories.find(item=>item.index===category.index)?.count||0}))
  invalidateGalleryCaches();notifyFavoriteCategoryChanges();return categories
}
export function buildFavoritesUrl(baseUrl: string, category?: number, search: FavoriteSearch = {}): string { const url = new URL("favorites.php", baseUrl); if (category != null) url.searchParams.set("favcat", String(category)); const query = String(search.query || "").trim(); if (query) { url.searchParams.set("f_search", query); url.searchParams.set("sn", "on"); url.searchParams.set("st", "on"); url.searchParams.set("sf", "on") } return url.toString() }
export function parseFavoriteCategories(html: string): FavoriteCategory[] { const scope=html.match(/<[^>]*\bclass\s*=\s*(["'])[^"']*\bido\b[^"']*\1[^>]*>[\s\S]*/i)?.[0]||html;const matches=[...scope.matchAll(/<[^>]*\bclass\s*=\s*(["'])[^"']*\bfp\b[^"']*\1[^>]*>/gi)].slice(0,10);return Array.from({length:10},(_,index)=>{const match=matches[index];if(!match)return{index,name:`收藏夹 ${index}`,count:0};const start=(match.index||0)+match[0].length,end=index+1<matches.length?(matches[index+1].index||scope.length):scope.length,segment=scope.slice(start,end),fields=[...segment.matchAll(/<div\b[^>]*>([\s\S]*?)<\/div>/gi)].map(value=>clean(value[1]));const count=Number(String(fields[0]||"0").replace(/[^\d,]/g,"").replace(/,/g,""))||0,name=String(fields[2]||"").trim()||`收藏夹 ${index}`;return{index,name,count}}) }
export function parseFavoriteState(metadata: Record<string, string>): FavoriteState { const value = String(metadata.Favorited || metadata.favorited || ""); const category = Number(value.match(/(?:category|favcat)\s*(\d)/i)?.[1]); return { category: Number.isInteger(category) && category >= 0 && category <= 9 ? category : null, note: "", categories:[] } }
export function parseFavoritePopupHtml(html:string):FavoriteState{const source=String(html||""),options=[...source.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)].map(match=>{const attrs=String(match[1]||""),index=Number(attrs.match(/\bvalue\s*=\s*(["']?)([0-9])\1/i)?.[2]),name=clean(match[2]);return Number.isInteger(index)&&index>=0&&index<=9?{index,name:name||`收藏夹 ${index}`,count:0}:null}).filter(Boolean) as FavoriteCategory[],selected=source.match(/<option\b[^>]*\bvalue\s*=\s*(["']?)([0-9])\1[^>]*\bselected\b[^>]*>/i)||source.match(/<option\b[^>]*\bselected\b[^>]*\bvalue\s*=\s*(["']?)([0-9])\1[^>]*>/i)||source.match(/<input\b(?=[^>]*\bname\s*=\s*(["'])favcat\1)(?=[^>]*\bvalue\s*=\s*(["']?)([0-9])\2)(?=[^>]*\bchecked\b)[^>]*>/i),category=Number(selected?.[3]??selected?.[2]),input=source.match(/<input\b[^>]*\bname\s*=\s*(["'])favnote\1[^>]*>/i)?.[0]||"",textarea=source.match(/<textarea\b[^>]*\bname\s*=\s*(["'])favnote\1[^>]*>([\s\S]*?)<\/textarea>/i),rawNote=textarea?.[2]??input.match(/\bvalue\s*=\s*(["'])(.*?)\1/i)?.[2]??"",note=String(rawNote).replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&amp;/gi,"&").trim().slice(0,200);return{category:Number.isInteger(category)&&category>=0&&category<=9?category:null,note,categories:Array.from({length:10},(_,index)=>options.find(item=>item.index===index)||{index,name:`收藏夹 ${index}`,count:0})}}
export function mergeFavoriteCategoryNames(state:FavoriteState,categories:FavoriteCategory[]):FavoriteState{return{...state,categories:Array.from({length:10},(_,index)=>categories.find(item=>item.index===index)||state.categories.find(item=>item.index===index)||{index,name:`收藏夹 ${index}`,count:0})}}
function validPageUrl(value: string): boolean { try { const url = new URL(value); const base = new URL(getBaseUrl()); return url.origin === base.origin && url.pathname.endsWith("/favorites.php") } catch { return false } }
export function favoriteLoginError(html: string) { return /requires you to log on|not logged in|please log on/i.test(html) ? "收藏需要登录；请刷新账号状态或重新导入 Cookie。" : "" }
async function report(input: Parameters<typeof reportDiagnostic>[0]) { try { await reportDiagnostic(input) } catch {} }
export async function loadFavorites(category?:number,search:FavoriteSearch={},directUrl?:string,signal?:AbortSignal,context:AccountRequestContext=captureAccountRequestContext()):Promise<FavoritesPage>{
  if(!getAccountStatus().loggedIn)throw new Error("请先登录后查看收藏。")
  if(category!=null&&(!Number.isInteger(category)||category<0||category>9))throw new Error("收藏分类必须为 0 到 9。")
  const url=directUrl&&validPageUrl(directUrl)?directUrl:buildFavoritesUrl(getBaseUrl(context.site),category,search)
  let response:any
  try{
    const result=await fetchHtml(url,"favorites.list","",signal,context);response=result.response
    if(!isAccountRequestContextCurrent(context))throw new Error("账号或站点已切换，收藏列表已失效。")
    const login=favoriteLoginError(result.html);if(login)throw new Error(login)
    const parsed=parseSearchHtml(result.html,result.finalUrl),hasGalleryRows=/\bclass\s*=\s*(["'])[^"']*\bitg\b[^"']*\1/i.test(result.html)&&/\/g\/\d+\/[a-f0-9]+/i.test(result.html)
    if((parsed.error||hasGalleryRows&&!parsed.items.length)&&!/No hits found/i.test(result.html))throw new Error("收藏列表解析失败，请稍后重试。")
    const data={categories:parseFavoriteCategories(result.html),items:parsed.items,resultCount:parsed.resultCount,prevHref:parsed.prevHref,nextHref:parsed.nextHref,url:result.finalUrl}
    await report({stage:"favorites.list",ok:true,request:{url:data.url,status:response.status},notes:`items=${data.items.length}; categories=${data.categories.length}`})
    return data
  }catch(error){await report({stage:"favorites.list",ok:false,error,request:{url,status:Number(response?.status||0)}});throw error}
}
async function loadFavoriteCategories(context:AccountRequestContext):Promise<FavoriteCategory[]>{
  const result=await fetchHtml(new URL("favorites.php",getBaseUrl(context.site)).toString(),"favorites.categories","",undefined,context),login=favoriteLoginError(result.html)
  if(login)throw new Error(login)
  return parseFavoriteCategories(result.html)
}
export async function loadFavoriteState(item:GallerySummary,context:AccountRequestContext=captureAccountRequestContext()):Promise<FavoriteState>{
  if(!getAccountStatus().loggedIn)throw new Error("请先登录后查看收藏备注。")
  const ref=parseGalleryRef(item.url)
  if(!ref)throw new Error("画廊身份无效，无法读取收藏备注。")
  const url=new URL("gallerypopups.php",getBaseUrl(context.site))
  url.searchParams.set("gid",ref.gid);url.searchParams.set("t",ref.token);url.searchParams.set("act","addfav")
  const [result,categories]=await Promise.all([fetchHtml(url.toString(),"favorites.read","",undefined,context),loadFavoriteCategories(context)])
  if(!isAccountRequestContextCurrent(context))throw new Error("账号或站点已切换，收藏状态已失效。")
  const login=favoriteLoginError(result.html)
  if(login)throw new Error(login)
  return mergeFavoriteCategoryNames(parseFavoritePopupHtml(result.html),categories)
}
export function verifyFavoriteMutationFromState(state:FavoriteState,category:number|null,note=""){if(state.category!==category)throw new Error("收藏操作未被服务器确认，请稍后刷新后重试。");if(category!=null&&String(note||"").trim()&&state.note!==String(note||"").trim().slice(0,200))throw new Error("收藏备注未被服务器确认，请稍后刷新后重试。");return state}
export function verifyFavoriteMutation(html:string,category:number|null,note=""){const login=favoriteLoginError(html);if(login)throw new Error(login);return verifyFavoriteMutationFromState(parseFavoritePopupHtml(html),category,note)}
export async function changeFavorite(item:GallerySummary,category:number|null,note=""):Promise<FavoriteState>{
  if(!getAccountStatus().loggedIn)throw new Error("请先登录后管理收藏。")
  if(category!=null&&(!Number.isInteger(category)||category<0||category>9))throw new Error("收藏分类必须为 0 到 9。")
  const context=captureAccountRequestContext(),ref=parseGalleryRef(item.url)
  if(!ref)throw new Error("画廊身份无效，无法管理收藏。")
  if(!isAccountRequestContextCurrent(context))throw new Error("账号或站点已切换，未提交收藏更改。")
  const url=new URL("gallerypopups.php",getBaseUrl(context.site))
  url.searchParams.set("gid",ref.gid);url.searchParams.set("t",ref.token);url.searchParams.set("act","addfav")
  const result=await postForm(url.toString(),{favcat:category==null?"favdel":String(category),favnote:String(note||"").slice(0,200),submit:"Apply Changes",update:"1"},"favorites.change",context)
  if(!isAccountRequestContextCurrent(context))throw new Error("账号或站点已切换，无法确认收藏更改。")
  const login=favoriteLoginError(result.html)
  if(login)throw new Error(login)
  const verified=verifyFavoriteMutationFromState(await loadFavoriteState(item,context),category,note)
  if(!isAccountRequestContextCurrent(context))throw new Error("账号或站点已切换，收藏更改结果已失效。")
  invalidateGalleryCaches();notifyFavoriteCategoryChanges()
  await report({stage:"favorites.change",ok:true,request:{url:result.finalUrl,status:Number(result.response.status||0)},notes:`operation=${category==null?"remove":"set"}`})
  return verified
}
