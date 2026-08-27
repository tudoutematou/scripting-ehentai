// ==UserScript==
// @name E-Hentai Cookie 助手
// @namespace scripting-ehentai
// @version 1.0.3-injection
// @description 在 E-Hentai / ExHentai 页面显式获取登录 Cookie，供 E-Hentai 浏览器 DEV 导入。
// @match https://e-hentai.org/*
// @match https://*.e-hentai.org/*
// @match https://exhentai.org/*
// @match https://*.exhentai.org/*
// @connect e-hentai.org
// @connect exhentai.org
// @grant GM.cookie
// @grant GM.log
// @grant GM.registerMenuCommand
// @grant Scripting.FileManager
// @run-at document-idle
// @inject-into content
// @noframes
// ==/UserScript==

export const COOKIE_HELPER_VERSION="1.0.3-injection"
export const COOKIE_HELPER_MODE="explicit-acquisition"
export const COOKIE_HELPER_LOGIN_URL="https://e-hentai.org/bounce_login.php?b=d&bt=1-1"
const REQUIRED = new Set(["ipb_member_id", "ipb_pass_hash"])
const WANTED = new Set(["ipb_member_id", "ipb_pass_hash", "ipb_session_id", "igneous"])
const URLS = ["https://e-hentai.org/", "https://exhentai.org/"]
const DIRECTORY = "ehentai-cookie-import"
const FILE = "cookies.json"

type Root = { type: string; path: string }
function roots(): Root[] { const fm:any=Scripting.FileManager; const all=[{type:"safariBrowserDirectory",path:String(fm.safariBrowserDirectory||"")},{type:"appGroupDocumentsDirectory",path:String(fm.appGroupDocumentsDirectory||"")},{type:"documentsDirectory",path:String(fm.documentsDirectory||"")},{type:"safariBrowserStorageDirectory",path:String(fm.safariBrowserStorageDirectory||"")}]; const seen=new Set<string>(); return all.filter(root=>root.path&& !seen.has(root.path)&&Boolean(seen.add(root.path))) }
function expiry(raw:any){const value=raw?.expirationDate??raw?.expiresDate??null;if(value==null||value==="")return null;const numeric=typeof value==="number"?value:Number(value),date=Number.isFinite(numeric)?new Date(numeric<1e12?numeric*1000:numeric):new Date(value);return Number.isNaN(date.getTime())?null:date.toISOString()}
function normalize(raw:any, fallback:string){return {name:String(raw?.name||""),value:String(raw?.value||""),domain:String(raw?.domain||fallback),path:String(raw?.path||"/"),hostOnly:Boolean(raw?.hostOnly),secure:Boolean(raw?.secure??raw?.isSecure),httpOnly:Boolean(raw?.httpOnly??raw?.isHTTPOnly),session:Boolean(raw?.session??raw?.isSessionOnly),expirationDate:expiry(raw)}}
function valid(cookies:any[]){const now=Date.now(),names=new Set(cookies.filter(cookie=>!cookie.expirationDate||Date.parse(cookie.expirationDate)>now).map(cookie=>cookie.name));return [...REQUIRED].every(name=>names.has(name))}
async function readCookies(){const found=new Map<string,any>();for(const url of URLS){try{for(const raw of await GM.cookie.list({url})){const cookie=normalize(raw,new URL(url).hostname);if(WANTED.has(cookie.name)&&cookie.value)found.set(`${cookie.name}|${cookie.domain}|${cookie.path}`,cookie)}}catch(error){GM.log("E-Hentai Cookie 助手读取失败",String(error))}}return [...found.values()]}
export async function probeWritableCookieRoots(fileManager:any,candidates:Root[]){const verified:Root[]=[];for(const root of candidates){const dir=`${root.path}/${DIRECTORY}`,path=`${dir}/.probe-${Date.now()}-${Math.random().toString(36).slice(2)}`;try{await fileManager.createDirectory(dir,true);await fileManager.writeAsString(path,"ok");if(!await fileManager.exists(path))throw new Error("write missing");if(String(await fileManager.readAsString(path))!=="ok")throw new Error("readback mismatch");await fileManager.remove(path);verified.push(root)}catch(error){try{GM.log(`Cookie shared path unavailable: ${root.type}`,String(error))}catch{}}}return verified}
async function writeCookies(cookies:any[]){const payload=JSON.stringify({time:new Date().toISOString(),source:location.hostname,cookies});const writable=await probeWritableCookieRoots(Scripting.FileManager,roots());const written:string[]=[];for(const root of writable){try{const path=`${root.path}/${DIRECTORY}/${FILE}`;await Scripting.FileManager.writeAsString(path,payload);if(!await Scripting.FileManager.exists(path))throw new Error("write missing");const reread=JSON.parse(String(await Scripting.FileManager.readAsString(path)));if(!valid(reread?.cookies||[]))throw new Error("readback invalid");written.push(root.type)}catch(error){try{GM.log(`Cookie write failed: ${root.type}`,String(error))}catch{}}}if(!written.length)throw new Error("没有可用的 Scripting 共享路径") ;return written}
let button:any
function setButton(text:string,color:string){if(!button)return;button.textContent=text;button.style.background=color}
async function refresh(){const cookies=await readCookies();setButton(valid(cookies)?"🍪 已登录 · 获取 Cookie":"🍪 未登录 · 前往登录","#242426");return cookies}
async function acquire(){const cookies=await refresh();if(!valid(cookies)){location.href=COOKIE_HELPER_LOGIN_URL;return}setButton("🍪 正在写入…","#6b4e9b");try{const written=await writeCookies(cookies);setButton(`✓ 已写入 ${written.length} 个路径 · 返回 App 导入`,"#1e7d32")}catch{setButton("✕ 写入失败 · 检查扩展权限","#b3261e")}}
function mount(){if(button||!document.body)return;button=document.createElement("button");Object.assign(button,{id:"scripting-eh-cookie-button",type:"button",textContent:"🍪 正在检测…"});Object.assign(button.style,{position:"fixed",left:"max(12px, env(safe-area-inset-left))",bottom:"max(12px, env(safe-area-inset-bottom))",zIndex:"2147483647",border:"0",borderRadius:"12px",padding:"10px 16px",color:"#fff",fontSize:"14px",fontWeight:"600",fontFamily:"-apple-system, BlinkMacSystemFont, sans-serif",boxShadow:"0 4px 16px rgba(0,0,0,.35)"});button.onclick=()=>void acquire();document.body.appendChild(button);void refresh()}
if(typeof window!=="undefined"){if(document.body)mount();else document.addEventListener("DOMContentLoaded",mount,{once:true});GM.registerMenuCommand?.("🍪 获取 E-Hentai Cookie",acquire)}
