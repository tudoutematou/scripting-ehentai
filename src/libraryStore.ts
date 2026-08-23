import type { GallerySummary } from "./extractors"
import { parseGalleryRef, galleryDetailUrl } from "./pure"

export type HistoryRecordV1 = { gid: string; token: string; title: string; titleJpn?: string; thumb?: string; category?: string; uploader?: string; pages?: number; lastPageIndex?: number; viewedAt: number; updatedAt: number }
type HistoryDatabaseV1 = { schemaVersion: 1; history: HistoryRecordV1[] }
export type HistoryStore = { read(): Promise<string | null>; write(value: string): Promise<void> }

const MAX_HISTORY = 200
const fileManager: any = (globalThis as any).FileManager
function defaultStore(): HistoryStore {
  const path = `${String(fileManager?.documentsDirectory || "")}/ehentai-library/history-v1.json`
  return {
    async read() { try { return await fileManager.readAsString(path) } catch { return null } },
    async write(value) { const temp = `${path}.tmp`; await fileManager.createDirectory(path.split("/").slice(0, -1).join("/"), true); await fileManager.writeAsString(temp, value); await fileManager.move(temp, path) },
  }
}
function empty(): HistoryDatabaseV1 { return { schemaVersion: 1, history: [] } }
function parse(raw: string | null): HistoryDatabaseV1 { if (!raw) return empty(); const value = JSON.parse(raw); if (value?.schemaVersion !== 1 || !Array.isArray(value.history)) throw new Error("本地历史数据无法读取；原文件未被覆盖。"); return { schemaVersion: 1, history: value.history.filter((x: any) => x && /^\d+$/.test(String(x.gid)) && /^[a-f0-9]+$/i.test(String(x.token))) } }
export async function loadHistory(store: HistoryStore = defaultStore()): Promise<HistoryRecordV1[]> { return (await parse(await store.read())).history.sort((a,b) => b.updatedAt - a.updatedAt) }
async function save(history: HistoryRecordV1[], store: HistoryStore) { await store.write(JSON.stringify({ schemaVersion: 1, history: history.slice(0, MAX_HISTORY) })) }
export async function recordHistory(item: GallerySummary, store: HistoryStore = defaultStore()): Promise<void> { const ref = parseGalleryRef(item.url); if (!ref) return; const history = await loadHistory(store); const prior = history.find(x => x.gid === ref.gid && x.token === ref.token); const now = Date.now(); const record: HistoryRecordV1 = { gid: ref.gid, token: ref.token, title: item.title, thumb: item.thumb, category: item.category, uploader: item.uploader, pages: item.pages, lastPageIndex: prior?.lastPageIndex, viewedAt: prior?.viewedAt || now, updatedAt: now }; await save([record, ...history.filter(x => x.gid !== ref.gid || x.token !== ref.token)], store) }
export async function updateReadingProgress(item: GallerySummary, pageIndex: number, store: HistoryStore = defaultStore()): Promise<void> { if (!Number.isInteger(pageIndex) || pageIndex < 0) return; await recordHistory(item, store); const history = await loadHistory(store); const ref = parseGalleryRef(item.url); const record = ref && history.find(x => x.gid === ref.gid && x.token === ref.token); if (!record) return; record.lastPageIndex = record.pages && pageIndex >= record.pages ? record.pages - 1 : pageIndex; record.updatedAt = Date.now(); await save(history, store) }
export function resumeIndex(record: Pick<HistoryRecordV1, "lastPageIndex" | "pages">, pageCount: number): number | null { const index = Number(record.lastPageIndex); return Number.isInteger(index) && index >= 0 && index < pageCount && (!record.pages || index < record.pages) ? index : null }
export function historySummary(record: HistoryRecordV1): GallerySummary { return { id: `${record.gid}:${record.token}`, gid: record.gid, token: record.token, title: record.title, category: record.category || "", thumb: record.thumb || "", posted: "", uploader: record.uploader || "", pages: record.pages || 0, url: galleryDetailUrl(record.gid, record.token) } }
export async function deleteHistory(gid: string, token: string, store: HistoryStore = defaultStore()) { const history = await loadHistory(store); await save(history.filter(x => x.gid !== gid || x.token !== token), store) }
export async function clearHistory(store: HistoryStore = defaultStore()) { await save([], store) }
