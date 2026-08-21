import type { DetailExtractData, PreviewPageLink } from "./extractors"

function decodeHtml(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  }
  return String(value || "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (all, name) => named[String(name).toLowerCase()] ?? all)
}

function cleanText(value: string): string {
  return decodeHtml(
    String(value || "")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ").trim()
}

function absoluteUrl(value: string, baseUrl: string): string {
  const decoded = decodeHtml(String(value || "").trim())
  if (!decoded) return ""
  try {
    return new URL(decoded, baseUrl).toString()
  } catch {
    return decoded
  }
}

function getAttribute(tag: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = tag.match(new RegExp(`\\b${escaped}\\s*=\\s*(["'])(.*?)\\1`, "i"))
  return match ? decodeHtml(match[2]) : ""
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function findElementInnerById(html: string, id: string): string {
  const escaped = escapeRegex(id)
  const match = html.match(new RegExp(`<([a-z0-9]+)\\b[^>]*\\bid\\s*=\\s*(["'])${escaped}\\2[^>]*>([\\s\\S]*?)<\\/\\1>`, "i"))
  return match ? match[3] : ""
}

function findElementTextById(html: string, id: string): string {
  return cleanText(findElementInnerById(html, id))
}

function findIdStart(html: string, id: string, fromIndex = 0): number {
  const escaped = escapeRegex(id)
  const pattern = new RegExp(`<[a-z0-9]+\\b[^>]*\\bid\\s*=\\s*(["'])${escaped}\\1[^>]*>`, "i")
  const match = pattern.exec(html.slice(fromIndex))
  return match ? fromIndex + (match.index || 0) : -1
}

function sliceSection(html: string, startId: string, endIds: string[]): string {
  const start = findIdStart(html, startId)
  if (start < 0) return ""
  let end = html.length
  for (const endId of endIds) {
    const candidate = findIdStart(html, endId, start + 1)
    if (candidate >= 0 && candidate < end) end = candidate
  }
  return html.slice(start, end)
}

function cssUrl(style: string, baseUrl: string): string {
  const match = String(style || "").match(/url\((['"]?)(.*?)\1\)/i)
  return match ? absoluteUrl(match[2], baseUrl) : ""
}

function findClassText(html: string, className: string): string {
  const escaped = escapeRegex(className)
  const pattern = new RegExp(`<([a-z0-9]+)\\b[^>]*class\\s*=\\s*(["'])[^"']*\\b${escaped}\\b[^"']*\\2[^>]*>([\\s\\S]*?)<\\/\\1>`, "i")
  const match = html.match(pattern)
  return match ? cleanText(match[3]) : ""
}

function parseMetadata(html: string): Record<string, string> {
  const block = sliceSection(html, "gdd", ["gdr", "gdf", "gd4"])
  const metadata: Record<string, string> = {}
  const rows = block.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || []
  for (const row of rows) {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(match => cleanText(match[1]))
    if (cells.length < 2) continue
    const key = cells[0].replace(/:$/, "").trim()
    const value = cells[1].trim()
    if (key && value) metadata[key] = value
  }
  return metadata
}

function parseTags(html: string): Array<{ namespace: string; tags: string[] }> {
  const block = sliceSection(html, "taglist", ["tagmenu_act", "tagmenu_new", "gwrd", "gd5"])
  const result: Array<{ namespace: string; tags: string[] }> = []
  const rows = block.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || []
  for (const row of rows) {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)]
    if (cells.length < 2) continue
    const namespace = cleanText(cells[0][1]).replace(/:$/, "").trim()
    const tags = [...cells[1][1].matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)]
      .map(match => cleanText(match[1]).split("|")[0].trim())
      .filter(Boolean)
    if (namespace && tags.length) result.push({ namespace, tags })
  }
  return result
}

function parsePreviewPages(html: string): number {
  let max = 1
  for (const match of html.matchAll(/<a\b[^>]*href\s*=\s*(["'])[^"']*[?&]p=(\d+)[^"']*\1[^>]*>([\s\S]*?)<\/a>/gi)) {
    const text = Number(cleanText(match[3]))
    if (Number.isFinite(text) && text > max) max = text
    else {
      const p = Number(match[2]) + 1
      if (p > max) max = p
    }
  }
  return max
}

function parsePreviewStyle(style: string, baseUrl: string) {
  const text = decodeHtml(String(style || ""))
  const widthMatch = text.match(/(?:^|;)\s*width\s*:\s*(\d+)px/i)
  const heightMatch = text.match(/(?:^|;)\s*height\s*:\s*(\d+)px/i)
  const positionMatch = text.match(/background-position\s*:\s*(-?\d+)px\s+(-?\d+)px/i)
    || text.match(/url\([^)]*\)\s*(-?\d+)px\s+(-?\d+)px/i)
    || text.match(/url\([^)]*\)[^;]*?(-?\d+)px(?:\s+(-?\d+)px)?/i)

  return {
    thumb: cssUrl(text, baseUrl),
    thumbX: positionMatch ? Math.abs(Number(positionMatch[1] || 0)) : 0,
    thumbY: positionMatch ? Math.abs(Number(positionMatch[2] || 0)) : 0,
    thumbWidth: widthMatch ? Number(widthMatch[1]) : 0,
    thumbHeight: heightMatch ? Number(heightMatch[1]) : 0,
  }
}

export function parsePreviewPageHtml(html: string, baseUrl: string): PreviewPageLink[] {
  const links: PreviewPageLink[] = []
  const seen = new Set<string>()
  const pattern = /<a\b[^>]*href\s*=\s*(["'])([^"']*\/s\/[^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi

  for (const match of html.matchAll(pattern)) {
    const pageUrl = absoluteUrl(match[2], baseUrl)
    if (!pageUrl || seen.has(pageUrl)) continue
    const inner = match[3]
    const titleMatch = inner.match(/\btitle\s*=\s*(["'])(.*?)\1/i)
    const imgMatch = inner.match(/<img\b[^>]*>/i)
    const alt = imgMatch ? getAttribute(imgMatch[0], "alt") : ""
    const indexMatch = `${titleMatch?.[2] || ""} ${alt}`.match(/(?:Page\s+)?([\d,]+)/i)

    let thumb = ""
    let thumbX = 0
    let thumbY = 0
    let thumbWidth = 0
    let thumbHeight = 0

    if (imgMatch) {
      thumb = absoluteUrl(getAttribute(imgMatch[0], "data-src") || getAttribute(imgMatch[0], "src"), baseUrl)
      const imgStyle = getAttribute(imgMatch[0], "style")
      const parsed = parsePreviewStyle(imgStyle, baseUrl)
      thumbX = parsed.thumbX
      thumbY = parsed.thumbY
      thumbWidth = parsed.thumbWidth
      thumbHeight = parsed.thumbHeight
    }

    const styled = inner.match(/<[^>]+\bstyle\s*=\s*(["'])(.*?)\1[^>]*>/i)
    if (styled) {
      const parsed = parsePreviewStyle(styled[2], baseUrl)
      if (parsed.thumb) thumb = parsed.thumb
      if (parsed.thumbWidth > 0) thumbWidth = parsed.thumbWidth
      if (parsed.thumbHeight > 0) thumbHeight = parsed.thumbHeight
      thumbX = parsed.thumbX
      thumbY = parsed.thumbY
    }

    links.push({
      index: indexMatch ? Number(indexMatch[1].replace(/,/g, "")) : 0,
      pageUrl,
      thumb,
      thumbX,
      thumbY,
      thumbWidth,
      thumbHeight,
    })
    seen.add(pageUrl)
  }
  return links
}

function parseCover(html: string, baseUrl: string): string {
  const block = sliceSection(html, "gd1", ["gd2", "gmid"])
  const styled = block.match(/<[^>]+\bstyle\s*=\s*(["'])(.*?)\1[^>]*>/i)
  return styled ? cssUrl(styled[2], baseUrl) : ""
}

function parseCategory(html: string): string {
  const block = sliceSection(html, "gdc", ["gdn", "gdd"])
  return findClassText(block, "cn") || findClassText(block, "cs")
}

function detectPageError(bodyText: string): string {
  if (/This gallery is unavailable/i.test(bodyText)) return "该画廊不可用。"
  if (/pining for the fjords/i.test(bodyText)) return "该画廊已被移除。"
  if (/And if you choose to ignore this warning/i.test(bodyText)) return "该画廊需要先在网页端确认警告。"
  return ""
}

export function parseDetailHtml(html: string, baseUrl: string): DetailExtractData {
  const bodyText = cleanText(html)
  const title = findElementTextById(html, "gn")
  const ratingLabel = findElementTextById(html, "rating_label")
  const ratingMatch = ratingLabel.match(/([0-9]+(?:\.[0-9]+)?)/)
  const ratingCount = Number(findElementTextById(html, "rating_count").replace(/,/g, "")) || 0

  return {
    title,
    titleJpn: findElementTextById(html, "gj"),
    cover: parseCover(html, baseUrl),
    category: parseCategory(html),
    uploader: findElementTextById(html, "gdn"),
    rating: ratingMatch ? Number(ratingMatch[1]) : null,
    ratingCount,
    metadata: parseMetadata(html),
    tags: parseTags(html),
    previewPages: parsePreviewPages(html),
    pageLinks: parsePreviewPageHtml(html, baseUrl),
    error: detectPageError(bodyText) || (!title ? "没有识别到画廊详情，页面结构可能已变化。" : ""),
  }
}
