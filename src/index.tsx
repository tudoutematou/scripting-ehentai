import {
  FavoriteCategory,
  loadFavorites,
  updateFavorite,
} from "./favorites"
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
  readSetupRules,
  reportDiagnostic,
} from "./githubBridge"
import {
  AccountStatus,
  getAccountDiagnostic,
  probeSafariBridge,
  hasSafariLoginCapture,
  importSafariLogin,
  openSafariLogin,
  getAccountStatus,
  getBaseUrl,
  refreshAccountStatus,
  setActiveSite,
  signInWithWebView,
  signOut,
  CookieLoginInput,
  getCookieCopyText,
  getMaskedCookies,
  inspectCookieLogin,
  parseCookieLogin,
  saveManualCookieLogin,
} from "./account"

const fileManager: any = (globalThis as any).FileManager
const spritePathCache = new Map<string, Promise<string>>()
const PREVIEW_WIDTH = 96
const PREVIEW_HEIGHT = 128

function ErrorText({ message }: { message: string }) {
  if (!message) return null
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
    <VStack alignment="leading" spacing={6}>
      <Text font="headline" lineLimit={3}>{item.title || "未命名画廊"}</Text>
      {item.category
        ? <Text
            font="caption"
            padding={{ horizontal: 7, vertical: 3 }}
            background="secondarySystemBackground"
            cornerRadius={6}
          >{item.category}</Text>
        : null}
      <Text font="caption" foregroundStyle="secondaryLabel">
        {[item.uploader, item.pages ? `${item.pages} 页` : "", item.posted].filter(Boolean).join(" · ")}
      </Text>
    </VStack>
    <Spacer />
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
  const [accountBusy, setAccountBusy] = useState(false)
  const [accountMode, setAccountMode] = useState<"normal" | "form" | "clipboard" | "cookies">("normal")
  const [cookieLogin, setCookieLogin] = useState<CookieLoginInput>({ memberId: "", passHash: "", igneous: "" })
  const [cookieReveal, setCookieReveal] = useState(false)
  const [account, setAccount] = useState<AccountStatus>(getAccountStatus())

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
    const requestUrl = directUrl || `${getBaseUrl()}?f_search=${encodeURIComponent(keyword)}`
    setLoading(true)
    setError("")
    try {
      const page = await searchGalleries(keyword, directUrl)
      setItems(page.items)
      setResultCount(page.resultCount)
      setPrevHref(page.prevHref)
      setNextHref(page.nextHref)

      const first = page.items[0]
      await reportWithoutBreakingUI({
        stage,
        ok: true,
        request: { url: page.url || requestUrl },
        notes: `items=${page.items.length}; firstTitleLen=${first?.title?.length || 0}; firstCategoryLen=${first?.category?.length || 0}; firstUploaderLen=${first?.uploader?.length || 0}`,
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

  const resetListAndSearch = async () => {
    setPrevHref("")
    setNextHref("")
    await runSearch()
  }

  const importClipboardCookies = async () => {
    const pasteboard: any = (globalThis as any).Pasteboard
    if (!pasteboard?.getString) throw new Error("当前 Scripting 运行时未提供 Pasteboard API。")
    const text = await pasteboard.getString()
    const parsed = parseCookieLogin(String(text || ""))
    const preview = inspectCookieLogin(parsed)
    if (!preview.memberIdPresent || !preview.passHashPresent) throw new Error("剪贴板中没有识别到完整的 ipb_member_id 与 ipb_pass_hash。")
    setCookieLogin(parsed)
    setAccountMode("clipboard")
  }

  const saveCookieLogin = async (clearClipboard: boolean) => {
    const preview = inspectCookieLogin(cookieLogin)
    if (!preview.memberIdPresent || !preview.passHashPresent) throw new Error("请填写 ipb_member_id 和 ipb_pass_hash。")
    if (preview.warnings.length) {
      const confirmed = await (globalThis as any).confirm({ title: "Cookie 格式异常", message: `${preview.warnings.join("；")}。仍要保存吗？`, cancelLabel: "取消", confirmLabel: "仍然保存" })
      if (!confirmed) return
    }
    const status = saveManualCookieLogin(cookieLogin)
    setAccount(status)
    setAccountMode("normal")
    setCookieLogin({ memberId: "", passHash: "", igneous: "" })
    if (clearClipboard) await (globalThis as any).Pasteboard?.setString?.(null)
    await reportWithoutBreakingUI({ stage: "account-manual-cookie-login", ok: true, notes: `loggedIn=${status.loggedIn}; memberIdPresent=${status.memberIdPresent}; passHashPresent=${status.passHashPresent}; igneousPresent=${status.igneousPresent}` })
    await resetListAndSearch()
  }

  const copyMaskedCookies = async () => {
    const pasteboard: any = (globalThis as any).Pasteboard
    if (!pasteboard?.setString) throw new Error("当前 Scripting 运行时未提供 Pasteboard API。")
    await pasteboard.setString(getCookieCopyText())
    setError("Cookie 已复制到剪贴板；请在使用后尽快清除。")
  }

  const clearClipboard = async () => {
    const pasteboard: any = (globalThis as any).Pasteboard
    if (!pasteboard?.setString) throw new Error("当前 Scripting 运行时未提供 Pasteboard API。")
    await pasteboard.setString(null)
    setError("已清除剪贴板敏感信息。")
  }

  const runAccountAction = async (action: "open-login" | "import-login" | "refresh" | "logout" | "site-e" | "site-ex") => {
    if (accountBusy) return
    setAccountBusy(true)
    setError("")
    try {
      if (action === "open-login") {
        await openSafariLogin()
        setError("已打开 Safari 登录页。请在 Safari 刷新已登录的 E-Hentai 页面，看到绿色捕获提示后返回并点“导入 Safari 登录”。")
      } else if (action === "import-login") {
        const status = await importSafariLogin()
        setAccount(status)
        await reportWithoutBreakingUI({ stage: "account-safari-import", ok: status.loggedIn, notes: JSON.stringify(getAccountDiagnostic()) })
        await resetListAndSearch()
      } else if (action === "refresh") {
        const status = await refreshAccountStatus()
        setAccount(status)
        await reportWithoutBreakingUI({
          stage: "account-status",
          ok: true,
          notes: `loggedIn=${status.loggedIn}; eHentaiReachable=${String(status.eHentaiReachable)}; exAvailable=${String(status.exAvailable)}; site=${status.site}`,
        })
      } else if (action === "logout") {
        signOut()
        const status = getAccountStatus()
        setAccount(status)
        await reportWithoutBreakingUI({ stage: "account-logout", ok: true, notes: "local session cleared" })
        await resetListAndSearch()
      } else {
        const site = action === "site-ex" ? "ex" : "e"
        if (site === "ex" && account.exAvailable !== true) {
          throw new Error("当前账号尚未验证可访问 ExHentai。")
        }
        setActiveSite(site)
        setAccount({ ...account, site })
        await reportWithoutBreakingUI({ stage: "account-site", ok: true, notes: `site=${site}` })
        await resetListAndSearch()
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      setError(message)
      const stage = action === "import-login" ? "account-safari-import" : "account-action"
      await reportWithoutBreakingUI({ stage, ok: false, error: e, notes: action === "import-login" ? JSON.stringify(getAccountDiagnostic()) : undefined })
    } finally {
      setAccountBusy(false)
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
        let status = getAccountStatus()
        const probe = await probeSafariBridge()
        await reportWithoutBreakingUI({ stage: "account-safari-bridge-probe", ok: true, notes: JSON.stringify(getAccountDiagnostic()) })
        if (!status.loggedIn && probe.loginCaptured) {
          status = await importSafariLogin()
          await reportWithoutBreakingUI({ stage: "account-auto-import", ok: status.loggedIn, notes: JSON.stringify(getAccountDiagnostic()) })
        }
        if (status.loggedIn) status = await refreshAccountStatus()
        setAccount(status)
      } catch (e) {
        const value = e as { message?: unknown; stack?: unknown }
        setBridgeStatus(`账号初始化/自动导入失败：${String(value?.message || e)}\n${String(value?.stack || "")}`)
        await reportWithoutBreakingUI({ stage: "account-auto-import", ok: false, error: e, notes: JSON.stringify(getAccountDiagnostic()) })
      }
    })()
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

  const siteLabel = account.site === "ex" ? "exhentai.org" : "e-hentai.org"

  return <List
    navigationTitle="E-Hentai 浏览器"
    navigationBarTitleDisplayMode="inline"
    refreshable={async () => { await runSearch() }}
    toolbar={{ cancellationAction: <Button title="关闭" action={dismiss} /> }}
    overlay={loading && items.length === 0
      ? <ProgressView title="正在加载…" progressViewStyle="circular" />
      : undefined}
  >
    <Section header={<Text textCase={null}>账户</Text>}>
      <VStack alignment="leading" spacing={8}>
        <HStack>
          <Text font="headline">{account.loggedIn ? "已登录" : "游客模式"}</Text>
          <Spacer />
          <Text font="caption" foregroundStyle="secondaryLabel">{siteLabel}</Text>
        </HStack>
        <Text font="caption" foregroundStyle="secondaryLabel">
          {account.loggedIn
            ? `登录 Cookie 仅保存在本机 Keychain · E-Hentai：${account.eHentaiReachable === true ? "可访问" : account.eHentaiReachable === false ? "不可访问" : "待检测"} · ExHentai：${account.exAvailable === true ? "可用" : account.exAvailable === false ? "不可用" : "待检测"}`
            : "可手动输入或从剪贴板导入 Cookie；Safari 登录桥保留为实验功能。"}
        </Text>
        {accountMode === "form" || accountMode === "clipboard"
          ? <VStack alignment="leading" spacing={8} frame={{ maxWidth: "infinity" }}>
              <Text font="headline">{accountMode === "clipboard" ? "确认剪贴板 Cookie" : "Cookie 登录"}</Text>
              <TextField title="ipb_member_id" value={cookieLogin.memberId} onChanged={(value: string) => setCookieLogin({ ...cookieLogin, memberId: value })} prompt="必填，通常为数字" />
              <TextField title="ipb_pass_hash" value={cookieLogin.passHash} onChanged={(value: string) => setCookieLogin({ ...cookieLogin, passHash: value })} prompt="必填，通常为 32 位" />
              <TextField title="igneous（可选）" value={cookieLogin.igneous} onChanged={(value: string) => setCookieLogin({ ...cookieLogin, igneous: value })} prompt="ExHentai 常需要" />
              <Text font="caption" foregroundStyle="secondaryLabel">
                {(() => { const p = inspectCookieLogin(cookieLogin); return `检测到：member_id ${p.memberIdPresent ? "✅" : "❌"} · pass_hash ${p.passHashPresent ? "✅" : "❌"} · igneous ${p.igneousPresent ? "✅" : "未提供"}${p.warnings.length ? ` · 提示：${p.warnings.join("；")}` : ""}` })()}
              </Text>
              <HStack spacing={8}>
                <Button title="保存到 Keychain" buttonStyle="borderedProminent" disabled={accountBusy} action={() => { void (async () => { setAccountBusy(true); try { await saveCookieLogin(accountMode === "clipboard") } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setAccountBusy(false) } })() }} />
                <Button title="取消" disabled={accountBusy} action={() => { setAccountMode("normal"); setCookieLogin({ memberId: "", passHash: "", igneous: "" }) }} />
                {accountMode === "clipboard" ? <Button title="保留剪贴板" disabled={accountBusy} action={() => { void (async () => { setAccountBusy(true); try { await saveCookieLogin(false) } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setAccountBusy(false) } })() }} /> : null}
              </HStack>
            </VStack>
          : accountMode === "cookies"
            ? <VStack alignment="leading" spacing={7} frame={{ maxWidth: "infinity" }}>
                <Text font="headline">Cookie（{cookieReveal ? "已显示" : "已遮罩"}）</Text>
                {getMaskedCookies(cookieReveal).map(cookie => <Text key={cookie.name} font="caption">{cookie.name}: {cookie.value}</Text>)}
                <HStack spacing={8}>
                  <Button title={cookieReveal ? "隐藏" : "显示"} action={() => setCookieReveal(value => !value)} />
                  <Button title="复制" action={() => { void copyMaskedCookies().catch(e => setError(e instanceof Error ? e.message : String(e))) }} />
                  <Button title="清除剪贴板" action={() => { void clearClipboard().catch(e => setError(e instanceof Error ? e.message : String(e))) }} />
                  <Button title="完成" action={() => { setCookieReveal(false); setAccountMode("normal") }} />
                </HStack>
              </VStack>
            : <HStack spacing={8}>
                {!account.loggedIn
                  ? <>
                      <Button title={accountBusy ? "正在打开…" : "用 Safari 登录（实验）"} systemImage="safari" buttonStyle="bordered" disabled={accountBusy} action={() => { void runAccountAction("open-login") }} />
                      <Button title="Cookie 登录" systemImage="key" buttonStyle="borderedProminent" disabled={accountBusy} action={() => setAccountMode("form")} />
                      <Button title="从剪贴板导入" systemImage="doc.on.clipboard" disabled={accountBusy} action={() => { void (async () => { setAccountBusy(true); try { await importClipboardCookies() } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setAccountBusy(false) } })() }} />
                      <Button title="导入 Safari 登录" systemImage="square.and.arrow.down" disabled={accountBusy} action={() => { void runAccountAction("import-login") }} />
                    </>
                  : <>
                      <NavigationLink destination={<FavoritesView />}>
                        <Button title="我的收藏" systemImage="heart" disabled={accountBusy} />
                      </NavigationLink>
                      <Button title="查看 Cookie" systemImage="key" disabled={accountBusy} action={() => setAccountMode("cookies")} />
                      <Button title="刷新状态" systemImage="arrow.clockwise" disabled={accountBusy} action={() => { void runAccountAction("refresh") }} />
                      <Button title="退出脚本账号" systemImage="rectangle.portrait.and.arrow.right" disabled={accountBusy} action={() => { void runAccountAction("logout") }} />
                    </>}
              </HStack>}
        {account.loggedIn && accountMode === "normal"
          ? <HStack spacing={8}>
              <Button title="E-Hentai" buttonStyle={account.site === "e" ? "borderedProminent" : "bordered"} disabled={accountBusy || account.site === "e"} action={() => { void runAccountAction("site-e") }} />
              <Button title="ExHentai" buttonStyle={account.site === "ex" ? "borderedProminent" : "bordered"} disabled={accountBusy || account.site === "ex" || account.exAvailable !== true} action={() => { void runAccountAction("site-ex") }} />
            </HStack>
          : null}
        {accountBusy ? <ProgressView title="正在处理账号状态…" progressViewStyle="circular" /> : null}
      </VStack>
    </Section>

    <Section header={<Text textCase={null}>{account.loggedIn ? "账号浏览" : "游客模式"} · {siteLabel}</Text>}>
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
        <NavigationLink key={item.id} destination={<GalleryDetailView summary={item} />}>
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

function FavoritesView() {
  const [categories, setCategories] = useState<FavoriteCategory[]>([])
  const [items, setItems] = useState<GallerySummary[]>([])
  const [selected, setSelected] = useState("all")
  const [prevHref, setPrevHref] = useState("")
  const [nextHref, setNextHref] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const reload = async (category = selected, directUrl?: string) => {
    setLoading(true); setError("")
    try { const page = await loadFavorites(category, 0, directUrl); setCategories(page.categories); setItems(page.items); setPrevHref(page.prevHref); setNextHref(page.nextHref) }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); setItems([]) }
    finally { setLoading(false) }
  }
  useEffect(() => { void reload("all") }, [])
  return <List navigationTitle="我的收藏" navigationBarTitleDisplayMode="inline" refreshable={async () => { await reload() }} overlay={loading ? <ProgressView title="正在加载收藏…" progressViewStyle="circular" /> : undefined}>
    <Section header={<Text textCase={null}>收藏夹</Text>}>
      <HStack spacing={7}><Button title="全部" buttonStyle={selected === "all" ? "borderedProminent" : "bordered"} disabled={loading || selected === "all"} action={() => { setSelected("all"); void reload("all") }} />{categories.slice(0, 5).map(category => <Button key={category.slot} title={`${category.name} (${category.count})`} buttonStyle={selected === String(category.slot) ? "borderedProminent" : "bordered"} disabled={loading || selected === String(category.slot)} action={() => { setSelected(String(category.slot)); void reload(String(category.slot)) }} />)}</HStack>
      {categories.slice(5).map(category => <Button key={category.slot} title={`${category.name} · ${category.count}`} disabled={loading || selected === String(category.slot)} action={() => { setSelected(String(category.slot)); void reload(String(category.slot)) }} />)}
      <ErrorText message={error} />
    </Section>
    <Section header={<Text textCase={null}>画廊 · {items.length}</Text>}>
      {items.map(item => <NavigationLink key={item.id} destination={<GalleryDetailView summary={item} />}><GalleryRow item={item} /></NavigationLink>)}
      {!loading && !error && !items.length ? <Text foregroundStyle="secondaryLabel">此收藏夹没有画廊</Text> : null}
    </Section>
    {(prevHref || nextHref) ? <Section><HStack><Button title="上一页" disabled={!prevHref || loading} action={() => { if (prevHref) void reload(selected, prevHref) }} /><Spacer /><Button title="下一页" disabled={!nextHref || loading} action={() => { if (nextHref) void reload(selected, nextHref) }} /></HStack></Section> : null}
  </List>
}

function GalleryDetailView({ summary }: { summary: GallerySummary }) {
  const [detail, setDetail] = useState<GalleryDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [favoriteBusy, setFavoriteBusy] = useState(false)
  const [favoriteNote, setFavoriteNote] = useState("")
  const [favoriteStatus, setFavoriteStatus] = useState("")
  const changeFavorite = async (category: number | -1) => {
    setFavoriteBusy(true); setFavoriteStatus("")
    try { await updateFavorite(summary.gid, summary.token, category, favoriteNote); setFavoriteStatus(category === -1 ? "已取消收藏" : `已保存到收藏夹 ${category}`) }
    catch (e) { setFavoriteStatus(e instanceof Error ? e.message : String(e)) }
    finally { setFavoriteBusy(false) }
  }

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
              frame={{ maxWidth: "infinity", height: 260 }}
              cornerRadius={10}
              placeholder={<ProgressView progressViewStyle="circular" />}
            />
          : null}
        <Text font="title3">{detail?.title || summary.title}</Text>
        {detail?.titleJpn ? <Text font="subheadline" foregroundStyle="secondaryLabel">{detail.titleJpn}</Text> : null}
        <Text font="caption" foregroundStyle="secondaryLabel">
          {[detail?.category || summary.category, detail?.uploader || summary.uploader].filter(Boolean).join(" · ")}
        </Text>
        {getAccountStatus().loggedIn ? <VStack alignment="leading" spacing={6} frame={{ maxWidth: "infinity" }}>
          <TextField title="收藏备注（可选）" value={favoriteNote} onChanged={(value: string) => setFavoriteNote(value)} prompt="最多 250 字" />
          <HStack spacing={6}>{[0, 1, 2, 3, 4].map(slot => <Button key={slot} title={`收藏夹 ${slot}`} disabled={favoriteBusy} action={() => { void changeFavorite(slot) }} />)}</HStack>
          <HStack spacing={6}>{[5, 6, 7, 8, 9].map(slot => <Button key={slot} title={`${slot}`} disabled={favoriteBusy} action={() => { void changeFavorite(slot) }} />)}<Button title="取消收藏" systemImage="heart.slash" disabled={favoriteBusy} action={() => { void changeFavorite(-1) }} /></HStack>
          {favoriteBusy ? <ProgressView title="正在更新收藏…" progressViewStyle="circular" /> : null}
          {favoriteStatus ? <Text font="caption" foregroundStyle={favoriteStatus.startsWith("已") ? "systemGreen" : "systemRed"}>{favoriteStatus}</Text> : null}
        </VStack> : null}
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
                <Text foregroundStyle="secondaryLabel">{key}</Text>
                <Spacer />
                <Text>{value}</Text>
              </HStack>
            )}
          </VStack>
        : null}

      {detail && detail.tags.length
        ? <VStack alignment="leading" spacing={8} frame={{ maxWidth: "infinity" }}>
            <Text font="headline">标签</Text>
            {detail.tags.map(group =>
              <VStack key={group.namespace} alignment="leading" spacing={3}>
                <Text font="caption" foregroundStyle="secondaryLabel">{group.namespace}</Text>
                <Text>{group.tags.join(" · ")}</Text>
              </VStack>
            )}
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
              ? <Text foregroundStyle="systemOrange" font="caption">画廊预览分页过多，第一版最多读取前 50 个预览分页。</Text>
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
      {!loading && !error && imageUrl
        ? <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={2}>{imageUrl}</Text>
        : null}
      {originalUrl
        ? <Text font="caption2" foregroundStyle="secondaryLabel">检测到原图链接（后续加入原图切换/下载）</Text>
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