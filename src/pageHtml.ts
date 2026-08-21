import type { PageExtractData } from "./extractors"

function decodeHtml(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    '#039': "'",
  }
  return String(value || "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&([a-z]+|#039);/gi, (all, name) => named[String(name).toLowerCase()] ?? all)
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

function findImageTag(html: string): string {
  // E-Hentai 常规图片页使用 <img id="img" src="...">。
  const byId = html.match(/<img\b(?=[^>]*\bid\s*=\s*(["'])img\1)[^>]*>/i)
  if (byId) return byId[0]

  // 页面结构小幅变化时，优先找图片区附近带 src 的图片。
  const imageBlock = html.match(/<div\b[^>]*\bid\s*=\s*(["'])i3\1[^>]*>([\s\S]*?)<\/div>/i)
  if (imageBlock) {
    const image = imageBlock[2].match(/<img\b[^>]*\bsrc\s*=\s*(["']).*?\1[^>]*>/i)
    if (image) return image[0]
  }

  return ""
}

function findOriginalUrl(html: string, baseUrl: string): string {
  // 常见：<a href="https://...fullimg...">Download original ...</a>
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const href = getAttribute(match[0], "href")
    if (href && /fullimg/i.test(href)) return absoluteUrl(href, baseUrl)
  }

  // Ehviewer 兼容逻辑：部分页面把原图地址放在 onclick prompt(...) 中。
  for (const match of html.matchAll(/<a\b[^>]*\bonclick\s*=\s*(["'])(.*?)\1[^>]*>/gi)) {
    const onclick = decodeHtml(match[2])
    const promptMatch = onclick.match(/prompt\([^,]+,\s*['"]([^'"]+)['"]\)/i)
    if (promptMatch) return absoluteUrl(promptMatch[1], baseUrl)
  }

  return ""
}

function detectPageError(html: string): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")
  if (/This gallery is unavailable/i.test(text)) return "该画廊不可用。"
  if (/pining for the fjords/i.test(text)) return "该画廊已被移除。"
  if (/exceeded your image viewing limits/i.test(text)) return "已达到 E-Hentai 图片浏览额度限制。"
  return ""
}

export function parseImagePageHtml(html: string, baseUrl: string): PageExtractData {
  const imageTag = findImageTag(html)
  const imageUrl = imageTag
    ? absoluteUrl(getAttribute(imageTag, "src") || getAttribute(imageTag, "data-src"), baseUrl)
    : ""
  const originalUrl = findOriginalUrl(html, baseUrl)

  return {
    imageUrl,
    originalUrl,
    error: detectPageError(html) || (!imageUrl ? "没有解析到图片地址，图片页结构可能已变化。" : ""),
  }
}
