import {
  Button,
  Canvas,
  HStack,
  Image,
  LazyVGrid,
  List,
  Navigation,
  NavigationLink,
  NavigationStack,
  ProgressView,
  Script,
  ScrollView,
  Section,
  Spacer,
  Text,
  TextField,
  VStack,
  useEffect,
  useState,
} from "scripting"

import {
  GalleryDetail,
  GalleryPageLink,
  GallerySummary,
  loadGalleryDetail,
  resolveImagePage,
  searchGalleries,
} from "./ehentai"
import {
  pullSourceFromGitHub,
  pushSourceToGitHub,
  reportDiagnostic,
} from "./githubBridge"
import {
  getAccountStatus,
  getBaseUrl,
} from "./account"
import {
  GalleryCategoryKey,
  QuickFilterKey,
  GALLERY_CATEGORIES,
  QUICK_FILTERS,
  browseSummary,
  buildTouristBrowseUrl,
  getCategoryOption,
  getQuickFilter,
  localizeCategory,
  localizeCommonTag,
  localizeMetadataKey,
  localizeTagNamespace,
} from "./tourist"

const fileManager: any = (globalThis as any).FileManager
const spritePathCache = new Map<string, Promise<string>>()
const PREVIEW_WIDTH = 96
const PREVIEW_HEIGHT = 128

function ErrorText({ message }: { message: string }) {
  return <Text foregroundStyle="systemRed" font="caption">{message}</Text>
}

function hashText(value: string): string {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}

async function cachedSpritePath(url: string): Promise<string> {
  const existing = spritePathCache.get(url)
  if (existing) return existing

  const task = (async () => {
    const directory = `${Script.directory}/.preview-cache`
    await fileManager.createDirectory(directory, true)
    const extensionMatch = new URL(url).pathname.match(/\.(jpg|jpeg|png|webp)$/i)
    const extension = extensionMatch ? extensionMatch[1].toLowerCase() : "jpg"
    const path = `${directory}/${hashText(url)}.${extension}`

    try {
      if (await fileManager.isFile(path)) return path
    } catch {
      // 不影响首次下载。
    }

    const response = await fetch(url)
    if (!response.ok) throw new Error(`预览雪碧图请求失败：HTTP ${response.status}`)
    const data = await response.data()
    await fileManager.writeAsData(path, data)
    return path
  })()

  spritePathCache.set(url, task)
  return task
}

function PreviewThumbnail({ page }: { page: GalleryPageLink }) {
  const [filePath, setFilePath] = useState("")
  const [error, setError] = useState("")
  const isSprite = Boolean(page.thumb && page.thumbWidth > 0 && page.thumbHeight > 0)

  useEffect(() => {
    if (!isSprite) return
    let cancelled = false
    ;(async () => {
      try {
        const path = await cachedSpritePath(page.thumb)
        if (!cancelled) setFilePath(path)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => { cancelled = true }
  }, [page.thumb, page.thumbX, page.thumbY, page.thumbWidth, page.thumbHeight])

  if (!page.thumb) {
    return <Image
      systemName="photo"
      frame={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
      foregroundStyle="secondaryLabel"
    />
  }

  if (!isSprite) {
    return <Image
      imageUrl={page.thumb}
      resizable
      scaleToFill
      frame={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
      cornerRadius={7}
      placeholder={<ProgressView progressViewStyle="circular" />}
    />
  }

  if (error) {
    return <Image
      systemName="exclamationmark.triangle"
      frame={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
      foregroundStyle="systemOrange"
    />
  }

  if (!filePath) {
    return <ProgressView
      progressViewStyle="circular"
      frame={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
    />
  }

  return <Canvas
    frame={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
    draw={(ctx: any, size: any) => {
      ctx.fillStyle = "systemGray6"
      ctx.fillRect(0, 0, size.width, size.height)

      const sourceWidth = Math.max(1, page.thumbWidth)
      const sourceHeight = Math.max(1, page.thumbHeight)
      const scale = Math.min(size.width / sourceWidth, size.height / sourceHeight)
      const drawWidth = sourceWidth * scale
      const drawHeight = sourceHeight * scale
      const drawX = (size.width - drawWidth) / 2
      const drawY = (size.height - drawHeight) / 2

      ctx.drawImage(
        { filePath },
        page.thumbX,
        page.thumbY,
        sourceWidth,
        sourceHeight,
        drawX,
        drawY,
        drawWidth,
        drawHeight,
      )
    }}
  />
}

function GalleryRow({ item }: { item: GallerySummary }) {
  const category = localizeCategory(item.category)
  return <HStack spacing={12}>
    {item.thumb
      ? <Image
          imageUrl={item.thumb}
          resizable
          scaleToFill
          frame={{ width: 82, height: 112 }}
          cornerRadius={9}
          placeholder={<ProgressView progressViewStyle="circular" />}
        />
      : <Image
          systemName="photo"
          frame={{ width: 82, height: 112 }}
          foregroundStyle="secondaryLabel"
        />}
    <VStack alignment="leading" spacing={7} frame={{ maxWidth: "infinity" }}>
      <Text font="headline" lineLimit={3}>{item.title || "未命名画廊"}</Text>
      {category
        ? <Text
            font="caption"
            padding={{ horizontal: 8, vertical: 3 }}
            background="secondarySystemBackground"
            cornerRadius={7}
          >{category}</Text>
        : null}
      <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={2}>
        {[item.uploader, item.pages ? `${item.pages} 页` : "", item.posted].filter(Boolean).join(" · ")}
      </Text>
    </VStack>
  </HStack>
}

function HomeView() {
  const dismiss = Navigation.useDismiss()
  const [keyword, setKeyword] = useState("")
  const [category, setCategory] = useState<GalleryCategoryKey>("all")
  const [quickFilter, setQuickFilter] = useState<QuickFilterKey>("none")
  const [items, setItems] = useState<GallerySummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resultCount, setResultCount] = useState("")
  const [prevHref, setPrevHref] = useState("")
  const [nextHref, setNextHref] = useState("")
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState("")

  const account = getAccountStatus()
  const siteLabel = account.site === "ex" ? "ExHentai" : "E-Hentai"

  const reportWithoutBreakingUI = async (input: Parameters<typeof reportDiagnostic>[0]) => {
    try { await reportDiagnostic(input) } catch { /* 联调诊断不阻断游客浏览 */ }
  }

  const loadBrowse = async (
    directUrl?: string,
    nextCategory: GalleryCategoryKey = category,
    nextQuickFilter: QuickFilterKey = quickFilter,
    nextKeyword: string = keyword,
  ) => {
    if (loading) return
    const requestUrl = directUrl || buildTouristBrowseUrl(getBaseUrl(), nextKeyword, nextCategory, nextQuickFilter)
    const stage = directUrl ? "gallery-page" : (nextKeyword.trim() || nextCategory !== "all" || nextQuickFilter !== "none" ? "gallery-search" : "gallery-home")
    setLoading(true)
    setError("")
    try {
      const page = await searchGalleries("", requestUrl)
      setItems(page.items)
      setResultCount(page.resultCount)
      setPrevHref(page.prevHref)
      setNextHref(page.nextHref)
      await reportWithoutBreakingUI({
        stage,
        ok: true,
        request: { url: page.url || requestUrl },
        notes: `items=${page.items.length}; category=${nextCategory}; quick=${nextQuickFilter}; keywordPresent=${Boolean(nextKeyword.trim())}`,
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      setError(message)
      setItems([])
      setResultCount("")
      setPrevHref("")
      setNextHref("")
      await reportWithoutBreakingUI({ stage, ok: false, error: e, request: { url: requestUrl } })
    } finally {
      setLoading(false)
    }
  }

  const chooseCategory = (value: GalleryCategoryKey) => {
    setCategory(value)
    setPrevHref("")
    setNextHref("")
    void loadBrowse(undefined, value, quickFilter, keyword)
  }

  const chooseQuickFilter = (value: QuickFilterKey) => {
    setQuickFilter(value)
    setPrevHref("")
    setNextHref("")
    void loadBrowse(undefined, category, value, keyword)
  }

  const clearSearch = () => {
    setKeyword("")
    setCategory("all")
    setQuickFilter("none")
    setPrevHref("")
    setNextHref("")
    void loadBrowse(undefined, "all", "none", "")
  }

  const runBridgeAction = async (action: "push" | "pull" | "diagnostic") => {
    if (syncing) return
    setSyncing(true)
    setSyncMessage("")
    try {
      if (action === "push") {
        const files = await pushSourceToGitHub()
        setSyncMessage(`已推送 ${files.length} 个源码文件。`)
      } else if (action === "pull") {
        const files = await pullSourceFromGitHub()
        setSyncMessage(`已拉取 ${files.length} 个源码文件，重新运行后生效。`)
      } else {
        await reportDiagnostic({ stage: "manual-diagnostic", ok: true, notes: "用户手动上传诊断" })
        setSyncMessage("诊断已上传。")
      }
    } catch (e) {
      setSyncMessage(e instanceof Error ? e.message : String(e))
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => { void loadBrowse(undefined, "all", "none", "") }, [])

  const browseTitle = browseSummary(keyword, category, quickFilter)
  const categoryName = getCategoryOption(category).label
  const filterName = getQuickFilter(quickFilter).label

  return <List
    navigationTitle="E-Hentai"
    navigationBarTitleDisplayMode="inline"
    refreshable={async () => { await loadBrowse() }}
    toolbar={{ cancellationAction: <Button title="关闭" action={dismiss} /> }}
    overlay={loading && items.length === 0
      ? <ProgressView title="正在加载画廊…" progressViewStyle="circular" />
      : undefined}
  >
    <Section>
      <VStack alignment="leading" spacing={10}>
        <HStack>
          <VStack alignment="leading" spacing={2}>
            <Text font="title3">发现画廊</Text>
            <Text font="caption" foregroundStyle="secondaryLabel">
              {account.loggedIn ? `已登录 · ${siteLabel}` : `游客浏览 · ${siteLabel}`}
            </Text>
          </VStack>
          <Spacer />
          <Button title="重置" disabled={loading && !items.length} action={clearSearch} />
        </HStack>
        <TextField
          title="搜索画廊"
          value={keyword}
          onChanged={setKeyword}
          prompt="标题、作者、标签，例如：artist:xxx"
          submitLabel="search"
        />
        <Button
          title={loading ? "搜索中…" : "搜索"}
          systemImage="magnifyingglass"
          buttonStyle="borderedProminent"
          disabled={loading}
          action={() => { void loadBrowse() }}
        />
        <Text font="caption" foregroundStyle="secondaryLabel">
          当前：{categoryName} · {filterName}
        </Text>
      </VStack>
    </Section>

    <Section header={<Text textCase={null}>分类</Text>}>
      <VStack alignment="leading" spacing={7}>
        <HStack spacing={7}>
          {GALLERY_CATEGORIES.slice(0, 4).map(item => <Button
            key={item.key}
            title={item.shortLabel}
            buttonStyle={category === item.key ? "borderedProminent" : "bordered"}
            disabled={loading && category === item.key}
            action={() => chooseCategory(item.key)}
          />)}
        </HStack>
        <HStack spacing={7}>
          {GALLERY_CATEGORIES.slice(4, 8).map(item => <Button
            key={item.key}
            title={item.shortLabel}
            buttonStyle={category === item.key ? "borderedProminent" : "bordered"}
            disabled={loading && category === item.key}
            action={() => chooseCategory(item.key)}
          />)}
        </HStack>
        <HStack spacing={7}>
          {GALLERY_CATEGORIES.slice(8).map(item => <Button
            key={item.key}
            title={item.shortLabel}
            buttonStyle={category === item.key ? "borderedProminent" : "bordered"}
            disabled={loading && category === item.key}
            action={() => chooseCategory(item.key)}
          />)}
        </HStack>
      </VStack>
    </Section>

    <Section header={<Text textCase={null}>快速筛选</Text>}>
      <VStack alignment="leading" spacing={7}>
        <HStack spacing={7}>
          {QUICK_FILTERS.slice(0, 3).map(item => <Button
            key={item.key}
            title={item.label}
            buttonStyle={quickFilter === item.key ? "borderedProminent" : "bordered"}
            disabled={loading && quickFilter === item.key}
            action={() => chooseQuickFilter(item.key)}
          />)}
        </HStack>
        <HStack spacing={7}>
          {QUICK_FILTERS.slice(3).map(item => <Button
            key={item.key}
            title={item.label}
            buttonStyle={quickFilter === item.key ? "borderedProminent" : "bordered"}
            disabled={loading && quickFilter === item.key}
            action={() => chooseQuickFilter(item.key)}
          />)}
        </HStack>
      </VStack>
    </Section>

    <Section header={<Text textCase={null}>{browseTitle}</Text>}>
      <VStack alignment="leading" spacing={3}>
        <Text font="caption" foregroundStyle="secondaryLabel">
          {[resultCount ? `结果 ${resultCount}` : "", items.length ? `本页 ${items.length} 条` : ""].filter(Boolean).join(" · ") || "最新公开内容"}
        </Text>
        <ErrorText message={error} />
      </VStack>
      {items.map(item =>
        <NavigationLink key={item.id} destination={<GalleryDetailView summary={item} />}>
          <GalleryRow item={item} />
        </NavigationLink>
      )}
      {!loading && !error && items.length === 0
        ? <VStack alignment="center" spacing={6} frame={{ maxWidth: "infinity" }}>
            <Image systemName="magnifyingglass" foregroundStyle="secondaryLabel" />
            <Text foregroundStyle="secondaryLabel">没有找到符合条件的画廊</Text>
          </VStack>
        : null}
    </Section>

    {(prevHref || nextHref) ? <Section>
      <HStack>
        <Button
          title="上一页"
          systemImage="chevron.left"
          disabled={!prevHref || loading}
          action={() => { if (prevHref) void loadBrowse(prevHref) }}
        />
        <Spacer />
        <Button
          title="下一页"
          systemImage="chevron.right"
          disabled={!nextHref || loading}
          action={() => { if (nextHref) void loadBrowse(nextHref) }}
        />
      </HStack>
    </Section> : null}

    <Section header={<Text textCase={null}>开发工具</Text>}>
      <VStack alignment="leading" spacing={7}>
        <Text font="caption" foregroundStyle="secondaryLabel">联调功能已移到页面底部，不干扰日常浏览。</Text>
        <HStack spacing={8}>
          <Button title="上传诊断" disabled={syncing} action={() => { void runBridgeAction("diagnostic") }} />
          <Button title="拉取源码" disabled={syncing} action={() => { void runBridgeAction("pull") }} />
          <Button title="推送源码" disabled={syncing} action={() => { void runBridgeAction("push") }} />
        </HStack>
        {syncing ? <ProgressView title="正在同步…" progressViewStyle="circular" /> : null}
        {syncMessage ? <Text font="caption" foregroundStyle="secondaryLabel">{syncMessage}</Text> : null}
      </VStack>
    </Section>
  </List>
}

function GalleryDetailView({ summary }: { summary: GallerySummary }) {
  const [detail, setDetail] = useState<GalleryDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError("")
      try {
        const value = await loadGalleryDetail(summary.url)
        if (!cancelled) setDetail(value)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [summary.url])

  return <ScrollView
    navigationTitle="画廊详情"
    navigationBarTitleDisplayMode="inline"
    overlay={loading ? <ProgressView title="读取详情与图片列表…" progressViewStyle="circular" /> : undefined}
  >
    <VStack alignment="leading" spacing={18} padding={{ horizontal: 16, vertical: 12 }}>
      <VStack alignment="leading" spacing={8} frame={{ maxWidth: "infinity" }}>
        {(detail?.cover || summary.thumb)
          ? <Image
              imageUrl={detail?.cover || summary.thumb}
              resizable
              scaleToFit
              frame={{ maxWidth: "infinity", height: 280 }}
              cornerRadius={12}
              placeholder={<ProgressView progressViewStyle="circular" />}
            />
          : null}
        <Text font="title3">{detail?.title || summary.title}</Text>
        {detail?.titleJpn ? <Text font="subheadline" foregroundStyle="secondaryLabel">{detail.titleJpn}</Text> : null}
        <Text font="caption" foregroundStyle="secondaryLabel">
          {[localizeCategory(detail?.category || summary.category), detail?.uploader || summary.uploader].filter(Boolean).join(" · ")}
        </Text>
        {detail?.rating != null
          ? <Text font="caption">评分 {detail.rating.toFixed(2)} · {detail.ratingCount} 次</Text>
          : null}
        <ErrorText message={error} />
      </VStack>

      {detail && Object.keys(detail.metadata).length
        ? <VStack alignment="leading" spacing={7} frame={{ maxWidth: "infinity" }}>
            <Text font="headline">信息</Text>
            {Object.entries(detail.metadata).map(([key, value]) =>
              <HStack key={key} frame={{ maxWidth: "infinity" }}>
                <Text foregroundStyle="secondaryLabel">{localizeMetadataKey(key)}</Text>
                <Spacer />
                <Text>{value}</Text>
              </HStack>
            )}
          </VStack>
        : null}

      {detail && detail.tags.length
        ? <VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity" }}>
            <Text font="headline">标签</Text>
            {detail.tags.map(group =>
              <VStack key={group.namespace} alignment="leading" spacing={4}>
                <Text font="caption" foregroundStyle="secondaryLabel">{localizeTagNamespace(group.namespace)}</Text>
                <Text>
                  {group.tags.map(tag => {
                    const translated = localizeCommonTag(group.namespace, tag)
                    return translated ? `${translated}（${tag}）` : tag
                  }).join(" · ")}
                </Text>
              </VStack>
            )}
            <Text font="caption2" foregroundStyle="secondaryLabel">常见标签已中文化；完整标签库后续接入 EhTagTranslation。</Text>
          </VStack>
        : null}

      {detail
        ? <VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity" }}>
            <HStack frame={{ maxWidth: "infinity" }}>
              <Text font="headline">图片 · {detail.pageLinks.length}</Text>
              <Spacer />
              <Text font="caption" foregroundStyle="secondaryLabel">点击缩略图阅读</Text>
            </HStack>
            {detail.truncatedPreviewPages
              ? <Text foregroundStyle="systemOrange" font="caption">预览分页较多，目前最多读取前 50 个预览分页。</Text>
              : null}
            <LazyVGrid
              columns={[{ size: { type: "adaptive", min: 112, max: 150 } }]}
              alignment="leading"
              spacing={12}
            >
              {detail.pageLinks.map((page, index) =>
                <NavigationLink
                  key={page.id}
                  destination={<ReaderView pages={detail.pageLinks} startIndex={index} />}
                >
                  <VStack spacing={6} frame={{ maxWidth: "infinity" }}>
                    <PreviewThumbnail page={page} />
                    <Text font="caption" foregroundStyle="secondaryLabel">第 {page.index} 页</Text>
                  </VStack>
                </NavigationLink>
              )}
            </LazyVGrid>
          </VStack>
        : null}
    </VStack>
  </ScrollView>
}

function ReaderView({ pages, startIndex }: { pages: GalleryPageLink[]; startIndex: number }) {
  const [index, setIndex] = useState(startIndex)
  const [imageUrl, setImageUrl] = useState("")
  const [originalUrl, setOriginalUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const current = pages[index]

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!current) return
      setLoading(true)
      setImageUrl("")
      setOriginalUrl("")
      setError("")
      try {
        const resolved = await resolveImagePage(current.pageUrl)
        if (cancelled) return
        setImageUrl(resolved.imageUrl)
        setOriginalUrl(resolved.originalUrl)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [index, current?.pageUrl])

  return <ScrollView
    navigationTitle={`${index + 1} / ${pages.length}`}
    navigationBarTitleDisplayMode="inline"
  >
    <VStack alignment="center" spacing={14} padding>
      {loading ? <ProgressView title="解析图片地址…" progressViewStyle="circular" /> : null}
      {imageUrl
        ? <Image
            imageUrl={imageUrl}
            resizable
            scaleToFit
            frame={{ maxWidth: "infinity" }}
            placeholder={<ProgressView title="加载图片…" progressViewStyle="circular" />}
          />
        : null}
      <ErrorText message={error} />
      {originalUrl
        ? <Text font="caption2" foregroundStyle="secondaryLabel">检测到原图链接</Text>
        : null}
      <HStack spacing={18}>
        <Button
          title="上一页"
          systemImage="chevron.left"
          disabled={index <= 0 || loading}
          action={() => setIndex(value => Math.max(0, value - 1))}
        />
        <Text>{current ? `第 ${current.index} 页` : ""}</Text>
        <Button
          title="下一页"
          systemImage="chevron.right"
          disabled={index >= pages.length - 1 || loading}
          action={() => setIndex(value => Math.min(pages.length - 1, value + 1))}
        />
      </HStack>
    </VStack>
  </ScrollView>
}

async function run() {
  await Navigation.present({ element: <NavigationStack><HomeView /></NavigationStack> })
  Script.exit()
}

run()
