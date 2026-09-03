import { Script } from "scripting"

const fileManager: any = (globalThis as any).FileManager
const TRANSLATION_URL = "https://raw.githubusercontent.com/xiaojieonly/EhTagTranslation/main/tag-translations/tag-translations-zh-rCN.json"
const CACHE_DIRECTORY = `${Script.directory}/.tag-cache`
const CACHE_PATH = `${CACHE_DIRECTORY}/tag-translations-zh-rCN.bin`
const CACHE_TEMP_PATH = `${CACHE_PATH}.tmp`
const MIN_FULL_DATABASE_COUNT = 10_000

const PREFIX_BY_NAMESPACE: Record<string, string> = {
  rows: "n", artist: "a", cosplayer: "cos", character: "c", female: "f", group: "g",
  language: "l", male: "m", mixed: "x", other: "o", parody: "p", reclass: "r",
}
const NAMESPACE_BY_PREFIX: Record<string, string> = Object.fromEntries(Object.entries(PREFIX_BY_NAMESPACE).map(([namespace, prefix]) => [prefix, namespace]))

export type LocalTagSuggestion = { namespace: string; tag: string; translated: string }
type IndexedSuggestion = LocalTagSuggestion & { englishSearch: string; translatedSearch: string }

let translations = new Map<string, string>()
let suggestionIndex: IndexedSuggestion[] = []
let loadTask: Promise<number> | null = null
let source: "none" | "cache" | "network" = "none"
let lastError = ""
let generation = 0

function canonicalIdentity(value: string): string {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ")
}
function normalizeSearchText(value: string): string {
  return canonicalIdentity(value).replace(/[_-]+/g, " ")
}
function ascii(bytes: Uint8Array, start: number, end: number): string {
  let out = ""
  for (let i = start; i < end; i += 1) {
    if (bytes[i] > 0x7f) throw new Error("标签翻译库 key 不是 ASCII。")
    out += String.fromCharCode(bytes[i])
  }
  return out
}

/** Parse EhTagTranslation's 4-byte length header + key CR Base64 LF binary format. */
export function parseTagTranslationDatabaseBytes(bytes: Uint8Array): Map<string, string> {
  if (!(bytes instanceof Uint8Array) || bytes.length < 5) throw new Error("标签翻译库数据过短。")
  const declared = (((bytes[0] << 24) >>> 0) + (bytes[1] << 16) + (bytes[2] << 8) + bytes[3]) >>> 0
  if (declared !== bytes.length - 4) throw new Error("标签翻译库长度校验失败。")
  const map = new Map<string, string>()
  let lineStart = 4
  for (let i = 4; i <= bytes.length; i += 1) {
    if (i < bytes.length && bytes[i] !== 0x0a) continue
    if (i === lineStart) { lineStart = i + 1; continue }
    let separator = -1
    for (let cursor = lineStart; cursor < i; cursor += 1) if (bytes[cursor] === 0x0d) { separator = cursor; break }
    if (separator <= lineStart || separator >= i - 1) throw new Error("标签翻译库记录结构无效。")
    const key = canonicalIdentity(ascii(bytes, lineStart, separator))
    const encoded = ascii(bytes, separator + 1, i)
    if (!/^[a-z0-9]+(?:\.[a-z0-9]+)*:[a-z0-9 .:'"_\-/]+$/.test(key) || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error("标签翻译库记录内容无效。")
    const decoded = Data.fromBase64String(encoded)
    const translated = decoded?.toDecodedString("utf8") || ""
    if (!translated || translated.includes("�")) throw new Error("标签翻译库译文解码失败。")
    map.set(key, translated)
    lineStart = i + 1
  }
  if (!map.size) throw new Error("标签翻译库没有有效记录。")
  return map
}

function buildSuggestionIndex(map: ReadonlyMap<string, string>): IndexedSuggestion[] {
  const values: IndexedSuggestion[] = []
  const seen = new Set<string>()
  for (const [key, translated] of map) {
    const split = key.indexOf(":")
    if (split <= 0) continue
    const namespace = NAMESPACE_BY_PREFIX[key.slice(0, split)]
    const tag = key.slice(split + 1).trim()
    const identity = `${namespace}:${tag}`
    if (!namespace || !tag || seen.has(identity)) continue
    seen.add(identity)
    values.push({ namespace, tag, translated, englishSearch: normalizeSearchText(`${namespace}:${tag} ${tag}`), translatedSearch: normalizeSearchText(translated) })
  }
  return values
}

function searchIndex(index: readonly IndexedSuggestion[], input: string, limit = 12): LocalTagSuggestion[] {
  const query = normalizeSearchText(input)
  if (!query) return []
  return index.map(item => {
    const exact = item.englishSearch === query || item.translatedSearch === query
    const prefix = item.englishSearch.startsWith(query) || item.translatedSearch.startsWith(query)
    const contains = item.englishSearch.includes(query) || item.translatedSearch.includes(query)
    return { item, score: exact ? 0 : prefix ? 1 : contains ? 2 : 99 }
  }).filter(value => value.score < 99).sort((a, b) => a.score - b.score || a.item.namespace.localeCompare(b.item.namespace) || a.item.tag.localeCompare(b.item.tag)).slice(0, Math.max(1, limit)).map(({ item }) => ({ namespace: item.namespace, tag: item.tag, translated: item.translated }))
}

export function searchTagSuggestionsInMap(map: ReadonlyMap<string, string>, input: string, limit = 12): LocalTagSuggestion[] {
  return searchIndex(buildSuggestionIndex(map), input, limit)
}
export function searchLocalTagSuggestions(input: string, limit = 12): LocalTagSuggestion[] {
  return searchIndex(suggestionIndex, input, limit)
}

function publish(map: Map<string, string>, nextSource: "cache" | "network") {
  if (map.size < MIN_FULL_DATABASE_COUNT) throw new Error(`标签翻译库记录不完整（${map.size} 条）。`)
  const index = buildSuggestionIndex(map)
  if (index.length < MIN_FULL_DATABASE_COUNT) throw new Error(`标签建议索引不完整（${index.length} 条）。`)
  translations = map
  suggestionIndex = index
  source = nextSource
  generation += 1
}

async function readCache(): Promise<Uint8Array | null> {
  try {
    if (!await fileManager.exists(CACHE_PATH)) return null
    const bytes = await fileManager.readAsBytes(CACHE_PATH)
    return bytes instanceof Uint8Array ? bytes : null
  } catch { return null }
}
async function writeCache(bytes: Uint8Array) {
  await fileManager.createDirectory(CACHE_DIRECTORY, true)
  try { if (await fileManager.exists(CACHE_TEMP_PATH)) await fileManager.remove(CACHE_TEMP_PATH) } catch {}
  await fileManager.writeAsBytes(CACHE_TEMP_PATH, bytes)
  const verified = parseTagTranslationDatabaseBytes(await fileManager.readAsBytes(CACHE_TEMP_PATH))
  if (verified.size < MIN_FULL_DATABASE_COUNT) throw new Error("标签翻译库临时缓存验证失败。")
  try { if (await fileManager.exists(CACHE_PATH)) await fileManager.remove(CACHE_PATH) } catch {}
  await fileManager.rename(CACHE_TEMP_PATH, CACHE_PATH)
}
async function downloadDatabase(): Promise<Uint8Array> {
  const response = await fetch(TRANSLATION_URL, { signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`标签翻译库下载失败：HTTP ${response.status}`)
  const data = await response.data()
  const bytes = data?.toUint8Array()
  if (!(bytes instanceof Uint8Array)) throw new Error("标签翻译库响应没有二进制数据。")
  return bytes
}

export async function ensureTagTranslations(forceRefresh = false): Promise<number> {
  if (!forceRefresh && translations.size >= MIN_FULL_DATABASE_COUNT) return translations.size
  if (!forceRefresh && loadTask) return await loadTask
  loadTask = (async () => {
    lastError = ""
    if (!forceRefresh) {
      const cached = await readCache()
      if (cached) {
        try { const parsed = parseTagTranslationDatabaseBytes(cached); publish(parsed, "cache"); return translations.size }
        catch { /* invalid/legacy partial cache falls through to a fresh download */ }
      }
    }
    try {
      const bytes = await downloadDatabase()
      const parsed = parseTagTranslationDatabaseBytes(bytes)
      publish(parsed, "network")
      await writeCache(bytes)
      return translations.size
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      if (translations.size < MIN_FULL_DATABASE_COUNT) { translations = new Map(); suggestionIndex = []; source = "none" }
      return translations.size
    }
  })()
  try { return await loadTask } finally { loadTask = null }
}

export function translateTag(namespace: string, rawTag: string): string {
  const prefix = PREFIX_BY_NAMESPACE[canonicalIdentity(namespace).replace(/:$/, "")]
  const key = prefix ? `${prefix}:${canonicalIdentity(rawTag)}` : canonicalIdentity(rawTag)
  return translations.get(key) || ""
}
export function getTagTranslationStatus() {
  return { count: translations.size, suggestionCount: suggestionIndex.length, source, error: lastError, generation, fullDatabaseLoaded: translations.size >= MIN_FULL_DATABASE_COUNT, cachedPath: ".tag-cache/tag-translations-zh-rCN.bin" }
}
