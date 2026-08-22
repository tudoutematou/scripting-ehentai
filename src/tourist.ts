export type GalleryCategoryKey =
  | "all"
  | "doujinshi"
  | "manga"
  | "artistcg"
  | "gamecg"
  | "western"
  | "non-h"
  | "imageset"
  | "cosplay"
  | "asianporn"
  | "misc"

export type GalleryCategoryOption = {
  key: GalleryCategoryKey
  label: string
  shortLabel: string
  rawLabel: string
  bit: number
}

// E-Hentai / Ehviewer category bit values. f_cats is an exclusion mask,
// so selecting one category means excluding every other category bit.
export const ALL_CATEGORY_MASK = 0x3ff

export const GALLERY_CATEGORIES: GalleryCategoryOption[] = [
  { key: "all", label: "全部分类", shortLabel: "全部", rawLabel: "All", bit: 0 },
  { key: "doujinshi", label: "同人志", shortLabel: "同人", rawLabel: "Doujinshi", bit: 0x2 },
  { key: "manga", label: "漫画", shortLabel: "漫画", rawLabel: "Manga", bit: 0x4 },
  { key: "artistcg", label: "画师 CG", shortLabel: "画师 CG", rawLabel: "Artist CG", bit: 0x8 },
  { key: "gamecg", label: "游戏 CG", shortLabel: "游戏 CG", rawLabel: "Game CG", bit: 0x10 },
  { key: "western", label: "欧美", shortLabel: "欧美", rawLabel: "Western", bit: 0x200 },
  { key: "non-h", label: "全年龄", shortLabel: "全年龄", rawLabel: "Non-H", bit: 0x100 },
  { key: "imageset", label: "图集", shortLabel: "图集", rawLabel: "Image Set", bit: 0x20 },
  { key: "cosplay", label: "Cosplay", shortLabel: "Cosplay", rawLabel: "Cosplay", bit: 0x40 },
  { key: "asianporn", label: "亚洲真人", shortLabel: "亚洲真人", rawLabel: "Asian Porn", bit: 0x80 },
  { key: "misc", label: "其他", shortLabel: "其他", rawLabel: "Misc", bit: 0x1 },
]

export type QuickFilterKey = "none" | "chinese" | "japanese" | "english" | "translated" | "speechless"

export type QuickFilterOption = {
  key: QuickFilterKey
  label: string
  query: string
}

export const QUICK_FILTERS: QuickFilterOption[] = [
  { key: "none", label: "不限语言", query: "" },
  { key: "chinese", label: "中文", query: "language:chinese" },
  { key: "japanese", label: "日文", query: "language:japanese" },
  { key: "english", label: "英文", query: "language:english" },
  { key: "translated", label: "翻译本", query: "language:translated" },
  { key: "speechless", label: "无对白", query: "language:speechless" },
]

const CATEGORY_ZH: Record<string, string> = {
  doujinshi: "同人志",
  manga: "漫画",
  "artist cg": "画师 CG",
  "game cg": "游戏 CG",
  western: "欧美",
  "non-h": "全年龄",
  "image set": "图集",
  cosplay: "Cosplay",
  "asian porn": "亚洲真人",
  misc: "其他",
  private: "私有",
}

const NAMESPACE_ZH: Record<string, string> = {
  reclass: "重分类",
  language: "语言",
  parody: "原作",
  character: "角色",
  group: "社团",
  artist: "画师",
  male: "男性",
  female: "女性",
  mixed: "混合",
  other: "其他",
  cosplayer: "Coser",
  location: "地点",
  temp: "临时标签",
}

const METADATA_ZH: Record<string, string> = {
  posted: "发布时间",
  parent: "父画廊",
  visible: "可见性",
  language: "语言",
  "file size": "文件大小",
  length: "页数",
  favorited: "收藏",
  rating: "评分",
  uploader: "上传者",
}

const COMMON_TAG_ZH: Record<string, string> = {
  "language:chinese": "汉语",
  "language:japanese": "日语",
  "language:english": "英语",
  "language:korean": "韩语",
  "language:french": "法语",
  "language:german": "德语",
  "language:spanish": "西班牙语",
  "language:russian": "俄语",
  "language:thai": "泰语",
  "language:vietnamese": "越南语",
  "language:translated": "翻译",
  "language:rewrite": "改写",
  "language:speechless": "无言 / 无对白",
  "other:full color": "全彩",
  "other:anthology": "选集",
  "other:story arc": "剧情连续",
  "other:uncensored": "无修正",
  "other:censored": "有修正",
  "reclass:non-h": "全年龄",
}

function normalize(value: string): string {
  return String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ")
}

export function getCategoryOption(key: GalleryCategoryKey): GalleryCategoryOption {
  return GALLERY_CATEGORIES.find(item => item.key === key) || GALLERY_CATEGORIES[0]
}

export function getQuickFilter(key: QuickFilterKey): QuickFilterOption {
  return QUICK_FILTERS.find(item => item.key === key) || QUICK_FILTERS[0]
}

export function localizeCategory(value: string): string {
  const raw = String(value || "").trim()
  return CATEGORY_ZH[normalize(raw)] || raw
}

export function localizeTagNamespace(value: string): string {
  const raw = String(value || "").trim().replace(/:$/, "")
  return NAMESPACE_ZH[normalize(raw)] || raw
}

export function localizeMetadataKey(value: string): string {
  const raw = String(value || "").trim().replace(/:$/, "")
  return METADATA_ZH[normalize(raw)] || raw
}

export function localizeCommonTag(namespace: string, tag: string): string {
  const key = `${normalize(namespace)}:${normalize(tag)}`
  return COMMON_TAG_ZH[key] || ""
}

export function buildTouristBrowseUrl(
  baseUrl: string,
  keyword: string,
  categoryKey: GalleryCategoryKey = "all",
  quickFilterKey: QuickFilterKey = "none",
): string {
  const url = new URL(baseUrl)
  const category = getCategoryOption(categoryKey)
  const quick = getQuickFilter(quickFilterKey)
  const search = [String(keyword || "").trim(), quick.query].filter(Boolean).join(" ")

  if (category.bit) {
    url.searchParams.set("f_cats", String(ALL_CATEGORY_MASK & ~category.bit))
  }
  if (search) {
    url.searchParams.set("f_search", search)
  }
  return url.toString()
}

export function browseSummary(
  keyword: string,
  categoryKey: GalleryCategoryKey,
  quickFilterKey: QuickFilterKey,
): string {
  const parts: string[] = []
  const category = getCategoryOption(categoryKey)
  const quick = getQuickFilter(quickFilterKey)
  if (categoryKey !== "all") parts.push(category.label)
  if (quickFilterKey !== "none") parts.push(quick.label)
  if (String(keyword || "").trim()) parts.push(`“${String(keyword).trim()}”`)
  return parts.length ? parts.join(" · ") : "最新公开画廊"
}
