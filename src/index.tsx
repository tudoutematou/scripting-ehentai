import {
  Button,
  HStack,
  Image,
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
  UIImage,
  VStack,
  useEffect,
  useState,
} from "scripting"

import {
  GalleryDetail,
  GalleryPageLink,
  GallerySummary,
  fetchPageImage,
  loadGalleryDetail,
  resolveImagePage,
  searchGalleries,
} from "./ehentai"
import {
  pullSourceFromGitHub,
  pushSourceToGitHub,
  readSetupRules,
  reportDiagnostic,
} from "./githubBridge"

function ErrorText({ message }: { message: string }) {
  if (!message) return null
  return <Text foregroundStyle="systemRed" font="caption">{message}</Text>
}

function GalleryRow({ item }: { item: GallerySummary }) {
  return <HStack spacing={12}>
    {item.thumb
      ? <Image
          imageUrl={item.thumb}
          resizable
          scaleToFill
          frame={{ width: 76, height: 106 }}
          cornerRadius={8}
          placeholder={<ProgressView progressViewStyle="circular" />}
        />
      : <Image
          systemName="photo"
          frame={{ width: 76, height: 106 }}
          foregroundStyle="secondaryLabel"
        />}
    <VStack alignment="leading" spacing={5}>
      <Text font="headline" lineLimit={3}>{item.title || "未命名画廊"}</Text>
      <Text font="caption" foregroundStyle="secondaryLabel">
        {[item.category, item.uploader].filter(Boolean).join(" · ")}
      </Text>
      <Text font="caption2" foregroundStyle="secondaryLabel">
        {[item.pages ? `${item.pages} 页` : "", item.posted].filter(Boolean).join(" · ")}
      </Text>
    </VStack>
  </HStack>
}

function HomeView() {
  const dismiss = Navigation.useDismiss()
  const [keyword, setKeyword] = useState("")
  const [items, setItems] = useState<GallerySummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resultCount, setResultCount] = useState("")
  const [prevHref, setPrevHref] = useState("")
  const [nextHref, setNextHref] = useState("")
  const [syncing, setSyncing] = useState(false)
  const [bridgeStatus, setBridgeStatus] = useState("")

  const reportWithoutBreakingUI = async (input: Parameters<typeof reportDiagnostic>[0]) => {
    try {
      await reportDiagnostic(input)
    } catch (diagnosticError) {
      const value = diagnosticError as { message?: unknown }
      setBridgeStatus(`诊断上传失败（不影响浏览）：${String(value?.message || diagnosticError)}`)
    }
  }

  const runSearch = async (directUrl?: string) => {
    if (loading) return
    const stage = directUrl ? "gallery-page" : (keyword.trim() ? "gallery-search" : "gallery-home")
    const requestUrl = directUrl || `https://e-hentai.org/?f_search=${encodeURIComponent(keyword)}`
    setLoading(true)
    setError("")
    try {
      const page = await searchGalleries(keyword, directUrl)
      setItems(page.items)
      setResultCount(page.resultCount)
      setPrevHref(page.prevHref)
      setNextHref(page.nextHref)

      // 诊断是旁路能力，绝不能因为 GitHub 写入失败把已经成功加载的画廊清空。
      await reportWithoutBreakingUI({
        stage,
        ok: true,
        request: { url: page.url || requestUrl },
        notes: `items=${page.items.length}`,
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      setError(message)
      setItems([])
      setResultCount("")
      setPrevHref("")
      setNextHref("")

      await reportWithoutBreakingUI({
        stage,
        ok: false,
        error: e,
        request: { url: requestUrl },
      })
    } finally {
      setLoading(false)
    }
  }

  const runBridgeAction = async (action: "push" | "pull" | "diagnostic") => {
    if (syncing) return
    setSyncing(true)
    setError("")
    try {
      if (action === "push") {
        const files = await pushSourceToGitHub()
        setError(`已推送 ${files.length} 个业务源码文件。`)
      } else if (action === "pull") {
        const files = await pullSourceFromGitHub()
        setError(`已拉取 ${files.length} 个业务源码文件。请重新运行脚本以加载变更。`)
      } else {
        await reportDiagnostic({ stage: "manual-diagnostic", ok: true, notes: "用户手动上传诊断" })
        setError("诊断已上传。")
      }
    } catch (e) {
      const value = e as { message?: unknown; stack?: unknown }
      setError(`${String(value?.message || e)}\n${String(value?.stack || "")}`)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    void runSearch()
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const setup = await readSetupRules()
        setBridgeStatus(`GitHub 已连接；已读取联调规则（${setup.text.length} 字符）。`)
      } catch (e) {
        const value = e as { message?: unknown; stack?: unknown }
        setBridgeStatus(`GitHub 联调初始化失败：${String(value?.message || e)}\n${String(value?.stack || "")}`)
      }
    })()
  }, [])

  return <List
    navigationTitle="E-Hentai 浏览器"
    navigationBarTitleDisplayMode="inline"
    refreshable={async () => { await runSearch() }}
    toolbar={{
      cancellationAction: <Button title="关闭" action={dismiss} />,
    }}
    overlay={loading && items.length === 0
      ? <ProgressView title="正在加载…" progressViewStyle="circular" />
      : undefined}
  >
    <Section header={<Text textCase={null}>游客模式 · e-hentai.org</Text>}>
      <VStack alignment="leading" spacing={8}>
        <TextField
          title="搜索"
          value={keyword}
          onChanged={setKeyword}
          prompt="标题、标签、作者…"
          submitLabel="search"
        />
        <Button
          title={loading ? "搜索中…" : "搜索"}
          systemImage="magnifyingglass"
          buttonStyle="borderedProminent"
          disabled={loading}
          action={() => { void runSearch() }}
        />
        <HStack spacing={8}>
          <Button title="推送源码到 GitHub" disabled={syncing} action={() => { void runBridgeAction("push") }} />
          <Button title="从 GitHub 拉取源码" disabled={syncing} action={() => { void runBridgeAction("pull") }} />
          <Button title="上传诊断" disabled={syncing} action={() => { void runBridgeAction("diagnostic") }} />
        </HStack>
        {syncing ? <ProgressView title="正在同步 GitHub…" progressViewStyle="circular" /> : null}
        {bridgeStatus ? <Text font="caption" foregroundStyle="secondaryLabel">{bridgeStatus}</Text> : null}
        <ErrorText message={error} />
        {resultCount || items.length
          ? <Text font="caption" foregroundStyle="secondaryLabel">
              {[resultCount ? `结果：${resultCount}` : "", `本页已解析：${items.length} 条`].filter(Boolean).join(" · ")}
            </Text>
          : null}
      </VStack>
    </Section>

    <Section header={<Text textCase={null}>画廊</Text>}>
      {items.map(item =>
        <NavigationLink
          key={item.id}
          destination={<GalleryDetailView summary={item} />}
        >
          <GalleryRow item={item} />
        </NavigationLink>
      )}
      {!loading && !error && items.length === 0
        ? <Text foregroundStyle="secondaryLabel">没有结果</Text>
        : null}
    </Section>

    {(prevHref || nextHref) ? <Section>
      <HStack>
        <Button
          title="上一页"
          systemImage="chevron.left"
          disabled={!prevHref || loading}
          action={() => { if (prevHref) void runSearch(prevHref) }}
        />
        <Spacer />
        <Button
          title="下一页"
          systemImage="chevron.right"
          disabled={!nextHref || loading}
          action={() => { if (nextHref) void runSearch(nextHref) }}
        />
      </HStack>
    </Section> : null}
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

  return <List
    navigationTitle="画廊详情"
    navigationBarTitleDisplayMode="inline"
    overlay={loading ? <ProgressView title="读取详情与图片列表…" progressViewStyle="circular" /> : undefined}
  >
    <Section>
      <VStack alignment="leading" spacing={8}>
        {(detail?.cover || summary.thumb)
          ? <Image
              imageUrl={detail?.cover || summary.thumb}
              resizable
              scaleToFit
              frame={{ maxWidth: "infinity", height: 260 }}
              placeholder={<ProgressView progressViewStyle="circular" />}
            />
          : null}
        <Text font="title3">{detail?.title || summary.title}</Text>
        {detail?.titleJpn ? <Text font="subheadline" foregroundStyle="secondaryLabel">{detail.titleJpn}</Text> : null}
        <Text font="caption" foregroundStyle="secondaryLabel">
          {[detail?.category || summary.category, detail?.uploader || summary.uploader].filter(Boolean).join(" · ")}
        </Text>
        {detail?.rating != null
          ? <Text font="caption">评分 {detail.rating.toFixed(2)} · {detail.ratingCount} 次</Text>
          : null}
        <ErrorText message={error} />
      </VStack>
    </Section>

    {detail ? <Section header={<Text textCase={null}>信息</Text>}>
      {Object.entries(detail.metadata).map(([key, value]) =>
        <HStack key={key}>
          <Text foregroundStyle="secondaryLabel">{key}</Text>
          <Spacer />
          <Text>{value}</Text>
        </HStack>
      )}
    </Section> : null}

    {detail && detail.tags.length ? <Section header={<Text textCase={null}>标签</Text>}>
      {detail.tags.map(group =>
        <VStack key={group.namespace} alignment="leading" spacing={3}>
          <Text font="caption" foregroundStyle="secondaryLabel">{group.namespace}</Text>
          <Text>{group.tags.join(" · ")}</Text>
        </VStack>
      )}
    </Section> : null}

    {detail ? <Section header={<Text textCase={null}>图片 · {detail.pageLinks.length}</Text>}>
      {detail.truncatedPreviewPages
        ? <Text foregroundStyle="systemOrange" font="caption">画廊预览分页过多，第一版最多读取前 50 个预览分页。</Text>
        : null}
      {detail.pageLinks.map((page, index) =>
        <NavigationLink
          key={page.id}
          destination={<ReaderView pages={detail.pageLinks} startIndex={index} />}
        >
          <HStack spacing={10}>
            {page.thumb
              ? <Image
                  imageUrl={page.thumb}
                  resizable
                  scaleToFill
                  frame={{ width: 58, height: 78 }}
                  cornerRadius={6}
                  placeholder={<ProgressView progressViewStyle="circular" />}
                />
              : <Image systemName="photo" frame={{ width: 58, height: 78 }} />}
            <Text>第 {page.index} 页</Text>
          </HStack>
        </NavigationLink>
      )}
    </Section> : null}
  </List>
}

function ReaderView({ pages, startIndex }: { pages: GalleryPageLink[]; startIndex: number }) {
  const [index, setIndex] = useState(startIndex)
  const [image, setImage] = useState<UIImage | null>(null)
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
      setImage(null)
      setImageUrl("")
      setOriginalUrl("")
      setError("")
      try {
        const resolved = await resolveImagePage(current.pageUrl)
        if (cancelled) return
        setImageUrl(resolved.imageUrl)
        setOriginalUrl(resolved.originalUrl)
        const uiImage = await fetchPageImage(resolved.imageUrl, resolved.pageUrl)
        if (!cancelled) setImage(uiImage)
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
      {loading ? <ProgressView title="读取图片…" progressViewStyle="circular" /> : null}
      {image
        ? <Image
            image={image}
            resizable
            scaleToFit
            frame={{ maxWidth: "infinity" }}
          />
        : null}
      <ErrorText message={error} />
      {!loading && !error && imageUrl
        ? <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={2}>{imageUrl}</Text>
        : null}
      {originalUrl
        ? <Text font="caption2" foregroundStyle="secondaryLabel">检测到原图链接（第二阶段再加入原图切换/下载）</Text>
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
  await Navigation.present({
    element: <NavigationStack><HomeView /></NavigationStack>,
  })
  Script.exit()
}

run()
