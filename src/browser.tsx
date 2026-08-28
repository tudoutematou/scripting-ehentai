// Portions adapted from Zerolost/SEhViewer browser.tsx under the MIT License.
// Copyright (c) 2024 Gandum2077 (JSEhViewer)
// Copyright (c) 2026 Zerolost (SEhViewer modifications)
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
// ==UserScript==
// @name E-Hentai 浏览器 Cookie 助手
// @namespace scripting-ehentai
// @version 1.1.0-sehviewer
// @description 在 E-Hentai / ExHentai 页面一键获取登录 Cookie，供 E-Hentai 浏览器导入。
// @match https://e-hentai.org/*
// @match https://*.e-hentai.org/*
// @match https://exhentai.org/*
// @match https://*.exhentai.org/*
// @run-at document-start
// @inject-into content
// @noframes
// @weight 900
// @grant Scripting.FileManager
// @grant GM.getValue
// @grant GM.setValue
// @grant GM.cookie
// @grant GM.registerMenuCommand
// @connect e-hentai.org
// @connect *.e-hentai.org
// @connect exhentai.org
// @connect *.exhentai.org
// ==/UserScript==

export const COOKIE_HELPER_VERSION="1.1.0-sehviewer"
export const COOKIE_HELPER_MODE="sehviewer-cookie-text"
export const COOKIE_HELPER_LOGIN_URL="https://e-hentai.org/bounce_login.php?b=d&bt=1-1"
export const COOKIE_IMPORT_FILE="ehviewer_cookie.txt"
export const COOKIE_IMPORT_GM_KEY="ehviewer_cookie"

type CookieValues={ipb_member_id:string;ipb_pass_hash:string;igneous:string}
type BrowserCookie={name:string;value:string;domain?:string;path?:string}
type Root={type:string;path:string}

const BUTTON_ID="__scripting_eh_cookie_btn"
const COOKIE_NAMES=["ipb_member_id","ipb_pass_hash","igneous"]
const COOKIE_URLS=["https://e-hentai.org/","https://exhentai.org/"]
let button:any=null,host:any=null,busy=false,mountTimer:any=null,resetTimer:any=null

function emptyCookies():CookieValues{return{ipb_member_id:"",ipb_pass_hash:"",igneous:""}}
function safeDecode(value:string){try{return decodeURIComponent(value)}catch{return value}}
function cookieValue(name:string,source:string){const match=String(source||"").match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));return match?safeDecode(match[1]):""}
function visiblePageCookies():CookieValues{const source=String(document.cookie||"");return{ipb_member_id:cookieValue("ipb_member_id",source),ipb_pass_hash:cookieValue("ipb_pass_hash",source),igneous:cookieValue("igneous",source)}}
function mergeCookie(values:CookieValues,cookie:BrowserCookie){if(!COOKIE_NAMES.includes(cookie.name)||!cookie.value)return;const name=cookie.name as keyof CookieValues;if(!values[name]||name==="igneous")values[name]=cookie.value}
async function listCookies(url:string):Promise<BrowserCookie[]>{try{const values=await GM.cookie.list({url});return Array.isArray(values)?values:[]}catch{return[]}}
async function readBrowserCookies(){const values=visiblePageCookies();for(const url of COOKIE_URLS)for(const cookie of await listCookies(url))mergeCookie(values,cookie);return values}
function loggedIn(values:CookieValues){return Boolean(values.ipb_member_id&&values.ipb_pass_hash)}
function stateText(values:CookieValues){return`${loggedIn(values)?"已登录":"未登录"}${values.igneous?" · 里站可用":""}`}
function cookieText(values:CookieValues){return COOKIE_NAMES.map(name=>values[name as keyof CookieValues]?`${name}=${values[name as keyof CookieValues]}`:"").filter(Boolean).join("; ")}
export function isValidBrowserCookieText(source:string){return Boolean(cookieValue("ipb_member_id",source)&&cookieValue("ipb_pass_hash",source))}
export function browserCookieCandidateRoots(manager:any=Scripting.FileManager):Root[]{const roots:Root[]=[];const add=(type:string,value:any)=>{const path=String(value||"").trim();if(path&&!roots.some(item=>item.path===path))roots.push({type,path})};try{add("documentsDirectory",manager.documentsDirectory)}catch{}try{add("appGroupDocumentsDirectory",manager.appGroupDocumentsDirectory)}catch{}try{add("iCloudDocumentsDirectory",manager.iCloudDocumentsDirectory)}catch{}try{add("safariBrowserDirectory",manager.safariBrowserDirectory)}catch{}return roots}
export function browserCookieCandidatePaths(manager:any=Scripting.FileManager){return browserCookieCandidateRoots(manager).map(root=>`${root.path}/${COOKIE_IMPORT_FILE}`)}
async function writeCookieTo(path:string,contents:string){try{await Scripting.FileManager.writeAsString(path,contents);if(!await Scripting.FileManager.exists(path))return false;const saved=String(await Scripting.FileManager.readAsString(path)||"");return saved.trim()===contents.trim()&&isValidBrowserCookieText(saved)}catch{return false}}
async function writeCookie(){const values=await readBrowserCookies();if(!loggedIn(values)){setButton("🔐 未登录，正在打开登录页…","#6b4e9b");setTimeout(()=>{location.href=COOKIE_HELPER_LOGIN_URL},120);return false}const contents=cookieText(values);let written=0;for(const path of browserCookieCandidatePaths())if(await writeCookieTo(path,contents))written+=1;let gmOk=false;try{await GM.setValue(COOKIE_IMPORT_GM_KEY,contents);const stored=await GM.getValue(COOKIE_IMPORT_GM_KEY);gmOk=typeof stored==="string"&&stored.trim()===contents.trim()&&isValidBrowserCookieText(stored)}catch{}if(written||gmOk){setButton(`✅ 已写入${written?`文件 ${written} 个`:" GM 存储"}，返回 App 导入`,"#1e7d32");return true}setButton("❌ Cookie 写入失败","#b3261e");return false}
function setButton(text:string,color:string){if(!button)return;button.textContent=text;button.style.background=color}
async function refreshButton(){const values=await readBrowserCookies();setButton(`🍪 ${stateText(values)} · 点此获取`,loggedIn(values)?"#1e7d32":"#1a1a1c")}
function resetButton(){if(resetTimer)clearTimeout(resetTimer);resetTimer=setTimeout(()=>{busy=false;void refreshButton()},3000)}
function mountButton(){if(!document.body)return;host=document.getElementById(`${BUTTON_ID}_host`);if(host?.isConnected){button=host.querySelector(`#${BUTTON_ID}`);if(button)return}host?.parentNode?.removeChild(host);host=document.createElement("div");host.id=`${BUTTON_ID}_host`;host.className="eh-syringe-ignore";host.setAttribute("translate","no");Object.assign(host.style,{position:"fixed",left:"0",bottom:"0",zIndex:"2147483647",pointerEvents:"none"});button=document.createElement("button");button.id=BUTTON_ID;button.type="button";button.setAttribute("translate","no");button.textContent="🍪 正在检测登录状态…";Object.assign(button.style,{position:"fixed",left:"max(12px, env(safe-area-inset-left))",bottom:"max(12px, env(safe-area-inset-bottom))",zIndex:"2147483647",pointerEvents:"auto",border:"0",background:"#1a1a1c",color:"#fff",padding:"10px 16px",borderRadius:"12px",fontSize:"14px",lineHeight:"20px",fontWeight:"600",boxShadow:"0 4px 16px rgba(0,0,0,.35)",cursor:"pointer",fontFamily:"-apple-system, BlinkMacSystemFont, sans-serif",userSelect:"none",WebkitAppearance:"none"});button.addEventListener("click",async()=>{if(busy)return;busy=true;setButton("⏳ 正在读取并写入…","#6b4e9b");await writeCookie();resetButton()});host.appendChild(button);document.body.appendChild(host);void refreshButton()}
function ensureButton(){if(!document.body)return;const current=document.getElementById(`${BUTTON_ID}_host`),currentButton=current?.querySelector(`#${BUTTON_ID}`);if(!current||!currentButton||!current.isConnected)mountButton()}
function startMountLifecycle(){ensureButton();document.addEventListener("DOMContentLoaded",ensureButton,{once:true});document.addEventListener("visibilitychange",ensureButton);window.addEventListener("pageshow",ensureButton);if(!mountTimer)mountTimer=window.setInterval(ensureButton,1500)}

if(typeof window!=="undefined"){
  GM.registerMenuCommand("🍪 获取 EH Cookie 并写入",async()=>{const values=await readBrowserCookies();if(!loggedIn(values)){location.href=COOKIE_HELPER_LOGIN_URL;return}const ok=await writeCookie();alert(ok?"✅ Cookie 已写入，返回 App 点击“导入并验证登录状态”":"❌ 未找到有效 Cookie 或候选路径无权限")})
  GM.registerMenuCommand("🔄 重新检测登录状态",async()=>{await refreshButton()})
  startMountLifecycle()
}
