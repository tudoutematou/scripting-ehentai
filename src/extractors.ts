export type GallerySummary = {
  id: string
  gid: string
  token: string
  title: string
  category: string
  thumb: string
  posted: string
  uploader: string
  pages: number
  url: string
}

export type SearchExtractData = {
  items: GallerySummary[]
  resultCount: string
  prevHref: string
  nextHref: string
  error: string
}

export type GalleryTag = {
  name: string
  searchUrl: string
}

export type TagGroup = {
  namespace: string
  tags: GalleryTag[]
}

export type PreviewPageLink = {
  index: number
  pageUrl: string
  thumb: string
  thumbX?: number
  thumbY?: number
  thumbWidth?: number
  thumbHeight?: number
}

export type DetailExtractData = {
  title: string
  titleJpn: string
  cover: string
  category: string
  uploader: string
  rating: number | null
  ratingCount: number
  metadata: Record<string, string>
  tags: TagGroup[]
  previewPages: number
  pageLinks: PreviewPageLink[]
  error: string
}

export type PageExtractData = {
  imageUrl: string
  originalUrl: string
  error: string
}

export const SEARCH_EXTRACT_SCRIPT = String.raw`
const clean = (value) => (value || "").replace(/\s+/g, " ").trim()
const abs = (value) => {
  if (!value) return ""
  try { return new URL(value, location.href).href } catch { return String(value) }
}
const parseRef = (href) => {
  const m = String(href || "").match(/\/g\/(\d+)\/([a-f0-9]+)\/?/i)
  return m ? { gid: m[1], token: m[2] } : null
}
const root = document.querySelector(".itg")
let rows = []
if (root) {
  if (root.tagName.toLowerCase() === "table") rows = Array.from(root.querySelectorAll(":scope > tbody > tr"))
  else rows = Array.from(root.children)
}
const items = []
for (const row of rows) {
  const nameNode = row.querySelector(".glname")
  if (!nameNode) continue
  let anchor = nameNode.querySelector('a[href*="/g/"]')
  if (!anchor && nameNode.parentElement && nameNode.parentElement.matches('a[href*="/g/"]')) anchor = nameNode.parentElement
  if (!anchor) continue
  const url = abs(anchor.getAttribute("href"))
  const ref = parseRef(url)
  if (!ref) continue
  const thumbNode = row.querySelector(".glthumb img, .gl1e img, .gl3t img")
  const thumb = abs(thumbNode && (thumbNode.getAttribute("data-src") || thumbNode.getAttribute("src")))
  const categoryNode = row.querySelector(".cn, .cs")
  const uploaderNode = row.querySelector('.glhide a[href*="/uploader/"], .gl3e a[href*="/uploader/"], a[href*="/uploader/"]')
  const rowText = clean(row.textContent)
  const pagesMatch = rowText.match(/(\d[\d,]*)\s+pages?/i)
  const posted = clean((document.getElementById("posted_" + ref.gid) || {}).textContent)
  let titleNode = nameNode
  while (titleNode && titleNode.firstElementChild) titleNode = titleNode.firstElementChild
  const title = clean((titleNode && titleNode.textContent) || nameNode.textContent)
  items.push({ id: ref.gid + ":" + ref.token, gid: ref.gid, token: ref.token, title, category: clean(categoryNode && categoryNode.textContent), thumb, posted, uploader: clean(uploaderNode && uploaderNode.textContent), pages: pagesMatch ? Number(pagesMatch[1].replace(/,/g, "")) : 0, url })
}
const pagerAnchors = Array.from(document.querySelectorAll(".ptt a"))
const oldPrev = pagerAnchors.find(a => ["<", "‹", "prev", "previous"].includes(clean(a.textContent).toLowerCase()))
const oldNext = pagerAnchors.find(a => [">", "›", "next"].includes(clean(a.textContent).toLowerCase()))
const searchText = clean((document.querySelector(".searchtext") || {}).textContent)
const resultMatch = searchText.match(/Found\s+(.+?)\s+results/i)
const bodyText = clean(document.body && document.body.textContent)
return { items, resultCount: resultMatch ? resultMatch[1] : "", prevHref: abs((document.querySelector("#uprev") || oldPrev || {}).getAttribute && (document.querySelector("#uprev") || oldPrev || {}).getAttribute("href")), nextHref: abs((document.querySelector("#unext") || oldNext || {}).getAttribute && (document.querySelector("#unext") || oldNext || {}).getAttribute("href")), error: /No hits found/i.test(bodyText) ? "" : (items.length === 0 ? "没有解析到画廊列表，页面结构可能已变化。" : "") }
`

const PAGE_LINK_EXTRACTOR_BODY = String.raw`
const anchors = Array.from(document.querySelectorAll('#gdt a[href*="/s/"], a[href*="/s/"]'))
const seen = new Set()
const pageLinks = []
for (let i = 0; i < anchors.length; i++) {
  const a = anchors[i]
  const pageUrl = abs(a.getAttribute("href"))
  if (!pageUrl || seen.has(pageUrl)) continue
  seen.add(pageUrl)
  const titled = a.querySelector('[title*="Page "]') || a
  const title = titled.getAttribute("title") || ""
  const img = a.querySelector("img")
  const alt = (img && img.getAttribute("alt")) || ""
  const m = (title + " " + alt).match(/(?:Page\s+)?(\d+)/i)
  const styleNode = a.querySelector('[style*="url("]')
  const style = (styleNode && styleNode.getAttribute("style")) || ""
  const thumb = abs(img && (img.getAttribute("data-src") || img.getAttribute("src"))) || cssUrl(style)
  const widthMatch = style.match(/(?:^|;)\s*width\s*:\s*(\d+)px/i)
  const heightMatch = style.match(/(?:^|;)\s*height\s*:\s*(\d+)px/i)
  const posMatch = style.match(/background(?:-position)?\s*:[^;]*?(-?\d+)px\s+(-?\d+)px/i) || style.match(/\)\s*(-?\d+)px\s+(-?\d+)px/i)
  pageLinks.push({ index: m ? Number(m[1].replace(/,/g, "")) : 0, pageUrl, thumb, thumbX: posMatch ? Math.abs(Number(posMatch[1])) : 0, thumbY: posMatch ? Math.abs(Number(posMatch[2])) : 0, thumbWidth: widthMatch ? Number(widthMatch[1]) : 0, thumbHeight: heightMatch ? Number(heightMatch[1]) : 0 })
}
`

export const DETAIL_EXTRACT_SCRIPT = String.raw`
const clean = (value) => (value || "").replace(/\s+/g, " ").trim()
const abs = (value) => { if (!value) return ""; try { return new URL(value, location.href).href } catch { return String(value) } }
const cssUrl = (style) => { const m = String(style || "").match(/url\((['"]?)(.*?)\1\)/i); return m ? abs(m[2]) : "" }
const bodyText = clean(document.body && document.body.textContent)
let pageError = ""
if (/This gallery is unavailable/i.test(bodyText)) pageError = "该画廊不可用。"
else if (/pining for the fjords/i.test(bodyText)) pageError = "该画廊已被移除。"
else if (/And if you choose to ignore this warning/i.test(bodyText)) pageError = "该画廊需要先在网页端确认警告。"
const metadata = {}
for (const tr of Array.from(document.querySelectorAll("#gdd tr"))) { const cells = tr.querySelectorAll("td"); if (cells.length < 2) continue; const key = clean(cells[0].textContent).replace(/:$/, ""); const value = clean(cells[1].textContent); if (key && value) metadata[key] = value }
const tags = []
for (const tr of Array.from(document.querySelectorAll("#taglist tr"))) {
  const cells = tr.querySelectorAll("td")
  if (cells.length < 2) continue
  const namespace = clean(cells[0].textContent).replace(/:$/, "")
  const values = Array.from(cells[1].querySelectorAll("a")).map(a => ({ name: clean(a.textContent).split("|")[0].trim(), searchUrl: abs(a.getAttribute("href")) })).filter(tag => tag.name)
  if (namespace && values.length) tags.push({ namespace, tags: values })
}
const ratingLabel = clean((document.querySelector("#rating_label") || {}).textContent)
const ratingMatch = ratingLabel.match(/([0-9]+(?:\.[0-9]+)?)/)
const ratingCountText = clean((document.querySelector("#rating_count") || {}).textContent).replace(/,/g, "")
const ptt = document.querySelector(".ptt")
let previewPages = 1
if (ptt) { const nums = Array.from(ptt.querySelectorAll("td, a")).map(el => Number(clean(el.textContent).replace(/,/g, ""))).filter(n => Number.isFinite(n) && n > 0); if (nums.length) previewPages = Math.max(...nums) }
${PAGE_LINK_EXTRACTOR_BODY}
const coverContainer = document.querySelector("#gd1")
const coverStyleNode = coverContainer && (coverContainer.firstElementChild || coverContainer)
return { title: clean((document.querySelector("#gn") || {}).textContent), titleJpn: clean((document.querySelector("#gj") || {}).textContent), cover: cssUrl(coverStyleNode && coverStyleNode.getAttribute("style")), category: clean((document.querySelector("#gdc .cn, #gdc .cs") || {}).textContent), uploader: clean((document.querySelector("#gdn") || {}).textContent), rating: ratingMatch ? Number(ratingMatch[1]) : null, ratingCount: Number(ratingCountText) || 0, metadata, tags, previewPages, pageLinks, error: pageError || (!document.querySelector("#gn") ? "没有识别到画廊详情，页面结构可能已变化。" : "") }
`

export const PREVIEW_EXTRACT_SCRIPT = String.raw`
const abs = (value) => { if (!value) return ""; try { return new URL(value, location.href).href } catch { return String(value) } }
const cssUrl = (style) => { const m = String(style || "").match(/url\((['"]?)(.*?)\1\)/i); return m ? abs(m[2]) : "" }
${PAGE_LINK_EXTRACTOR_BODY}
return { pageLinks }
`

export const PAGE_EXTRACT_SCRIPT = String.raw`
const abs = (value) => { if (!value) return ""; try { return new URL(value, location.href).href } catch { return String(value) } }
const image = document.querySelector("#img") || document.querySelector('img[src][style]')
let originalUrl = ""
const originalAnchor = document.querySelector('a[href*="fullimg"]')
if (originalAnchor) originalUrl = abs(originalAnchor.getAttribute("href"))
if (!originalUrl) { const candidates = Array.from(document.querySelectorAll("a[onclick]")); for (const a of candidates) { const onclick = a.getAttribute("onclick") || ""; const m = onclick.match(/prompt\([^,]+,\s*['"]([^'"]+)['"]\)/i); if (m) { originalUrl = abs(m[1]); break } } }
const imageUrl = abs(image && image.getAttribute("src"))
return { imageUrl, originalUrl, error: imageUrl ? "" : "没有解析到图片地址，图片页结构可能已变化。" }
`
