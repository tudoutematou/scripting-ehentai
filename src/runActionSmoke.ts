import { Script } from "scripting"
import { runEhAction } from "./ehAction"

void (async () => {
  const search = await runEhAction({ type: "search", query: "test" })
  if (!search.ok || search.type !== "search" || !search.items.length) throw new Error("action search failed")
  const serializedSearch = JSON.stringify(search)
  if (/https?:|\/g\/|token/i.test(serializedSearch) || !search.items.every(item => /^gallery_[a-z0-9]+_[a-z0-9]+$/i.test(item.galleryRef))) throw new Error("action search leaked URL or omitted opaque galleryRef")
  const detail = await runEhAction({ type: "gallery.detail", galleryRef: search.items[0].galleryRef })
  const invalid = await runEhAction({ type: "gallery.detail", galleryRef: "https://e-hentai.org/g/1/token/" })
  console.log(JSON.stringify({ search: { ok: search.ok, itemCount: search.items.length, first: search.items[0] }, detail: detail.ok ? { ok: true, type: detail.type, title: detail.detail.title } : detail, invalid }))
  if (!detail.ok || detail.type !== "gallery.detail" || invalid.ok || invalid.code !== "INVALID_GALLERY_REF") throw new Error("action galleryRef chain smoke failed")
})().catch(error => { console.error(error); throw error }).finally(() => Script.exit())
