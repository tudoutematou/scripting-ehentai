import type { GallerySummary, SearchExtractData } from "./extractors"

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

function findElementTextById(html: string, id: string): string {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const pattern = new RegExp(`<([a-z0-9]+)\\b[^>]*\\bid\\s*=\\s*(["'])${escaped}\\2[^>]*>([\\s\\S]*?)<\\/\\1>`, "i")
  const match = html.match(pattern)
  return match ? cleanText(match[3]) : ""
}

function findAnchorHrefById(html: string, id: string, baseUrl: string): string {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const pattern = new RegExp(`<a\\b(?=[^>]*\\bid\\s*=\\s*(["'])${escaped}\\1)[^>]*>`, "i")
  const match = html.match(pattern)
  return match ? absoluteUrl(getAttribute(match[0], "href"), baseUrl) : ""
}

function findBlock(html: string, anchorIndex: number): string {
  const rowStart = html.lastIndexOf("<tr", anchorIndex)
  const rowEnd = html.indexOf("</tr>", anchorIndex)
  if (rowStart >= 0 && rowEnd > anchorIndex && anchorIndex - rowStart < 30000) {
    return html.slice(rowStart, rowEnd + 5)
  }
  const start = Math.max(0, anchorIndex - 4500)
  const end = Math.min(html.length, anchorIndex + 6500)
  return html.slice(start, end)
}

function findThumb(block: string, baseUrl: string): string {
  const images = block.match(/<img\b[^>]*>/gi) || []
  for (const image of images) {
    const value = getAttribute(image, "data-src") || getAttribute(image, "src")
    if (!value) continue
    const absolute = absoluteUrl(value, baseUrl)
    if (/^https?:\/\//i.test(absolute)) return absolute
  }
  return ""
}

function findClassText(block: string, className: string): string {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const pattern = new RegExp(`<([a-z0-9]+)\\b[^>]*class\\s*=\\s*(["'])[^"']*\\b${escaped}\\b[^"']*\\2[^>]*>([\\s\\S]*?)<\\/\\1>`, "i")
  const match = block.match(pattern)
  return match ? cleanText(match[3]) : ""
}

function findUploader(block: string): string {
  const anchors = block.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) || []
  for (const anchor of anchors) {
    const open = anchor.match(/^<a\b[^>]*>/i)?.[0] || ""
    const href = getAttribute(open, "href")
    if (/\/uploader\//i.test(href)) return cleanText(anchor)
  }
  return ""
}

function parseResultCount(html: string): string {
  const match = cleanText(html).match(/Found\s+(.+?)\s+results/i)
  return match ? match[1].trim() : ""
}

export function parseSearchHtml(html: string, baseUrl: string): SearchExtractData {
  const items: GallerySummary[] = []
  const seen = new Set<string>()
  const anchorPattern = /<a\b[^>]*\bhref\s*=\s*(["'])([^"']*\/g\/(\d+)\/([a-f0-9]+)\/?[^"']*)\1[^>]*>([\s\S]*?)<\/a>/gi

  for (const match of html.matchAll(anchorPattern)) {
    const gid = match[3]
    const token = match[4]
    const id = `${gid}:${token}`
    if (seen.has(id)) continue

    const anchorIndex = match.index || 0
    const block = findBlock(html, anchorIndex)
    let title = cleanText(match[5])
    if (!title) title = findClassText(block, "glname") || findClassText(block, "glink")
    if (!title) continue

    const rowText = cleanText(block)
    const pagesMatch = rowText.match(/(\d[\d,]*)\s+pages?/i)
    const category = findClassText(block, "cn") || findClassText(block, "cs")
    const url = absoluteUrl(match[2], baseUrl)

    items.push({
      id,
      gid,
      token,
      title,
      category,
      thumb: findThumb(block, baseUrl),
      posted: findElementTextById(block, `posted_${gid}`),
      uploader: findUploader(block),
      pages: pagesMatch ? Number(pagesMatch[1].replace(/,/g, "")) : 0,
      url,
    })
    seen.add(id)
  }

  const bodyText = cleanText(html)
  return {
    items,
    resultCount: parseResultCount(html),
    prevHref: findAnchorHrefById(html, "uprev", baseUrl),
    nextHref: findAnchorHrefById(html, "unext", baseUrl),
    error: /No hits found/i.test(bodyText)
      ? ""
      : (items.length === 0 ? "请求成功，但没有解析到画廊列表；可能是页面结构变化或站点返回了验证页。" : ""),
  }
}
