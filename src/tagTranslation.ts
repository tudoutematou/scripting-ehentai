import { Script } from "scripting"

const fileManager: any = (globalThis as any).FileManager
const TRANSLATION_URL = "https://raw.githubusercontent.com/xiaojieonly/EhTagTranslation/main/tag-translations/tag-translations-zh-rCN.json"
const CACHE_DIRECTORY = `${Script.directory}/.tag-cache`
const CACHE_PATH = `${CACHE_DIRECTORY}/tag-translations-zh-rCN.txt`

const PREFIX_BY_NAMESPACE: Record<string, string> = {
  rows: "n",
  artist: "a",
  cosplayer: "cos",
  character: "c",
  female: "f",
  group: "g",
  language: "l",
  male: "m",
  mixed: "x",
  other: "o",
  parody: "p",
  reclass: "r",
}

const NAMESPACE_BY_PREFIX:Record<string,string>=Object.fromEntries(Object.entries(PREFIX_BY_NAMESPACE).map(([namespace,prefix])=>[prefix,namespace]))
export type LocalTagSuggestion={namespace:string;tag:string;translated:string}
const BUILTIN_SUGGESTIONS:LocalTagSuggestion[]=[{namespace:"language",tag:"chinese",translated:"汉语"},{namespace:"female",tag:"big breasts",translated:"巨乳"}]
let suggestionIndex:LocalTagSuggestion[]=[...BUILTIN_SUGGESTIONS]
function rebuildSuggestionIndex(){const values=[...BUILTIN_SUGGESTIONS],seen=new Set(values.map(item=>`${item.namespace}:${item.tag}`));for(const[key,translated]of translations){const split=key.indexOf(":");if(split<=0)continue;const namespace=NAMESPACE_BY_PREFIX[key.slice(0,split)],tag=key.slice(split+1).trim();if(!namespace||!tag||seen.has(`${namespace}:${tag}`))continue;seen.add(`${namespace}:${tag}`);values.push({namespace,tag,translated})}suggestionIndex=values}
export function searchLocalTagSuggestions(input:string,limit=12):LocalTagSuggestion[]{const query=normalize(input);if(!query)return[];return suggestionIndex.map(item=>{const english=normalize(`${item.namespace}:${item.tag} ${item.tag}`),translated=normalize(item.translated),score=english===query||translated===query?0:english.startsWith(query)||translated.startsWith(query)?1:english.includes(query)||translated.includes(query)?2:99;return{item,score}}).filter(value=>value.score<99).sort((a,b)=>a.score-b.score||a.item.tag.localeCompare(b.item.tag)).slice(0,Math.max(1,limit)).map(value=>value.item)}

let translations = new Map<string, string>()
let loadTask: Promise<number> | null = null
let source: "none" | "cache" | "network" = "none"
let lastError = ""

function normalize(value: string): string {
  return String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ")
}

function decodeBase64Utf8(value: string): string {
  try {
    const atobFn = (globalThis as any).atob
    const Decoder = (globalThis as any).TextDecoder
    if (typeof atobFn !== "function" || typeof Decoder !== "function") return ""
    const binary = atobFn(value)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
    return new Decoder("utf-8").decode(bytes)
  } catch {
    return ""
  }
}

function parseDatabase(text: string): Map<string, string> {
  const map = new Map<string, string>()
  // EhViewer CN's file is a tiny binary header followed by UTF-8 keys + CR + Base64 Chinese + LF.
  // Regex intentionally skips the first four binary bytes instead of depending on Data byte APIs.
  const pattern = /(?:^|\n)([a-z0-9.: -]+)\r([A-Za-z0-9+/=]+)(?=\n|$)/g
  for (const match of String(text || "").matchAll(pattern)) {
    const key = String(match[1] || "").trim().toLowerCase()
    const translated = decodeBase64Utf8(String(match[2] || ""))
    if (key && translated) map.set(key, translated)
  }
  return map
}

async function readCache(): Promise<string> {
  try {
    if (await fileManager.exists(CACHE_PATH)) {
      const text = await fileManager.readAsString(CACHE_PATH)
      if (text) return String(text)
    }
  } catch {
    // Cache failure must never block browsing.
  }
  return ""
}

async function writeCache(text: string) {
  try {
    await fileManager.createDirectory(CACHE_DIRECTORY, true)
    await fileManager.writeAsString(CACHE_PATH, text)
  } catch {
    // Cache is an optimization only.
  }
}

async function downloadDatabase(): Promise<string> {
  const response = await fetch(TRANSLATION_URL)
  if (!response.ok) throw new Error(`标签翻译库下载失败：HTTP ${response.status}`)
  return await response.text()
}

export async function ensureTagTranslations(forceRefresh = false): Promise<number> {
  if (!forceRefresh && translations.size > 0) return translations.size
  if (!forceRefresh && loadTask) return await loadTask

  loadTask = (async () => {
    lastError = ""
    if (!forceRefresh) {
      const cached = await readCache()
      if (cached) {
        const parsed = parseDatabase(cached)
        if (parsed.size > 100) {
          translations = parsed
          rebuildSuggestionIndex()
          source = "cache"
          return translations.size
        }
      }
    }

    try {
      const downloaded = await downloadDatabase()
      const parsed = parseDatabase(downloaded)
      if (parsed.size <= 100) throw new Error("标签翻译库格式无法识别")
      translations = parsed
      rebuildSuggestionIndex()
      source = "network"
      await writeCache(downloaded)
      return translations.size
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      return translations.size
    }
  })()

  try {
    return await loadTask
  } finally {
    loadTask = null
  }
}

export function translateTag(namespace: string, rawTag: string): string {
  const ns = normalize(namespace)
  const tag = normalize(rawTag)
  const prefix = PREFIX_BY_NAMESPACE[ns]
  const key = prefix != null && prefix !== "" ? `${prefix}:${tag}` : tag
  return translations.get(key) || ""
}

export function getTagTranslationStatus() {
  return {
    count: translations.size,
    source,
    error: lastError,
    cachedPath: ".tag-cache/tag-translations-zh-rCN.txt",
  }
}
