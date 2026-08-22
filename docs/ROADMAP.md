# ROADMAP.md

> 状态：已确认，作为当前项目路线图；后续按里程碑持续维护  
> 原则：Milestone 完成以“代码 + 静态检查 + fixture + 真机验收”为准，不以代码已提交为准。

## 1. 路线图原则

1. 先稳定当前 0.2.9 游客链路，再新增账号功能。
2. 先建立数据模型和接口，再实现页面按钮。
3. 每个 milestone 只解决一组高度相关问题。
4. 不在功能任务中顺手大改无关架构。
5. EhViewer 用于确认业务语义和 endpoint，不照搬 Android 架构。
6. Scripting API 不确定时先查官方 docs / 当前 typings，不猜。
7. 所有 milestone 必须明确 rollback。
8. runtime diagnostics 与功能 PR 分离。

## 2. 版本总览

| 版本 | 主题 | 主要结果 |
|---|---|---|
| 0.2.9 | Stabilization Foundation | 形成干净、可检查、可真机回归的游客基线 |
| 0.3.0 | Account & Site State | 恢复并稳定账号、E/Ex 状态和站点入口 |
| 0.3.1 | Favorites | 把已有 Favorites 后端做成完整纵切 |
| 0.3.2 | Watched & My Tags | 完成登录后的第二批账户能力 |
| 0.4.0 | Reader Core | 建立 ReaderSession、预取、错误恢复和跳页 |
| 0.4.1 | Reader UX | 阅读方向、模式、缩放、原图和体验完善 |
| 0.5.0 | Local Library | History、Reading Progress、Search History、迁移 |
| 0.6.0 | Download Engine | 前台下载队列、持久化、恢复和空间治理 |
| 0.6.1 | Offline Reader | 离线 manifest、完整性校验和离线阅读 |
| 0.7.0 | Comments & Rating | 评论、编辑、投票和评分 |
| 0.7.1 | Torrent & Archive | 元信息、链接和受控下载能力 |
| 0.8.0 | Settings / Cache / Search | 统一设置、缓存管理、建议和高级搜索 |
| 0.9.0 | Hardening | 稳定性、性能、隐私、兼容、可维护性 |
| 1.0.0-rc | Release Candidate | 全量回归、文档、迁移、发布候选 |

---

# 0.2.9 — Stabilization Foundation

## 目标

把 PR #17 中有价值的游客模式源码迁移到一个干净、可 Review、可回滚的新基线，修复已确认回归，不新增新的业务模块。

## 依赖

- 最新 `main`；
- `feat/tourist-home-search-ui` 当前 head；
- 当前 Scripting typings；
- 用户可进行 iPhone/iPad 真机 smoke test。

## 参考 EhViewer 文件

- `GalleryListScene.java`
- `GalleryDetailScene.java`
- `GalleryPreviewsScene.java`
- `GalleryActivity.java`
- `ListUrlBuilder.java`
- `EhUrl.java`

本阶段只用于核对已实现行为，不扩展新功能。

## 预计修改模块

- `src/index.tsx`
- `src/appV2.tsx`
- `src/appV2-globals.d.ts`
- `src/tourist.ts`
- `src/ehentai.ts`
- `src/searchHtml.ts`
- `src/detailHtml.ts`
- `src/tagTranslation.ts`
- `src/account.ts`（仅恢复 UI 所需接口，避免重写）
- `src/githubBridge.ts`（只做分支配置和阻止 runtime 污染所需最小修改）
- `src/script.json`
- TypeScript 检查配置

## 关键接口

```ts
type SearchQuery = TouristSearchState;

type AppNavigation = {
  openResults(query: SearchQuery): void;
  openDetail(url: string): void;
  openReader(input: ReaderOpenInput): void;
};
```

本阶段不强制完成最终分层，但不得继续增加新的 UI 直连网络逻辑。

## 验收条件

- 从最新 `main` 新建稳定化分支；
- PR diff 不包含新 runtime event 文件；
- 首页筛选应用后能进入独立结果页；
- 搜索、分类、快速筛选行为不回退；
- 账号状态、Cookie 导入、退出和 E/Ex 切换入口恢复；
- Safari bridge 明确标为 Experimental，不是默认入口；
- Detail Core 继续先显示，Preview 继续后台补齐；
- Tag 点击继续使用原始 href；
- Reader 前后页继续可用；
- 新增代码已格式化，禁止一整文件一行；
- TypeScript 检查通过，或明确列出真实 Scripting typings 导致的唯一阻塞；
- 无 Cookie value、完整搜索词、完整 gallery/page token URL 出现在提交中。

## 真机测试步骤

1. 冷启动应用；
2. 游客首页确认列表加载；
3. 普通关键词搜索；
4. 选择单一分类搜索；
5. 组合两个分类搜索；
6. 首页打开筛选并应用；
7. 结果页再次修改筛选；
8. 打开 Detail，确认标题/封面/标签先出现；
9. 等待剩余 Preview 增量补齐；
10. 点击标签进入标签结果；
11. 打开 Reader，连续前后翻 5 页；
12. 返回 Detail 和结果页，确认导航状态；
13. 查看账号状态；
14. 切换 E/Ex；
15. 退出后确认本地状态变化；
16. 所有 diagnostics 只记录脱敏摘要。

## 风险

- `appV2` 迁移可能遗漏 main 中的旧入口；
- Scripting NavigationStack 类型和生命周期行为与静态推断不同；
- 真机测试期间自动上传 runtime 可能再次污染分支；
- 格式化时可能产生过大 diff。

## Rollback

- 保留 `main` 0.2.8；
- 稳定化分支不直接覆盖 main；
- 合并前以 PR 为唯一入口；
- 真机失败时回退到稳定化分支前一提交。

---

# 0.3.0 — Account & Site State

## 目标

建立稳定的账号状态、站点状态和用户操作入口，为 Favorites、Watched、My Tags 提供可靠依赖。

## 依赖

- 0.2.9 稳定化完成；
- Keychain 已验证；
- diagnostics sanitizer 已启用；
- E-Hentai/ExHentai 当前页面和 Cookie 行为已重新核对。

## 参考 EhViewer 文件

- `EhCookieStore.java`
- `EhUrl.java`
- `SignInScene.java`
- `CookieSignInScene.java`
- `SelectSiteScene.java`

只参考 Cookie 名称、站点语义和登录状态，不移植 Android CookieManager。

## 预计修改模块

- `src/account.ts`
- `src/appV2.tsx` 或拆出的 `accountScene.tsx`
- `src/ehHttpClient.ts`（若已建立）
- `src/settingsStore.ts`（最小站点设置）
- account parser fixtures

## 数据模型

```ts
type AccountState = {
  loggedIn: boolean;
  activeSite: "e-hentai" | "exhentai";
  eHentaiReachable: boolean | null;
  exAvailable: boolean | null;
  validating: boolean;
  lastValidatedAt?: string;
  lastValidationError?: string;
};
```

## 网络接口

```ts
interface AccountService {
  importCookieHeader(input: string): Promise<AccountState>;
  getLocalState(): Promise<AccountState>;
  validateNetwork(signal?: CancelSignal): Promise<AccountState>;
  setActiveSite(site: Site): Promise<AccountState>;
  signOut(): Promise<void>;
}
```

## UI

- 账号状态卡；
- 手工 Cookie 导入；
- 刷新网络状态；
- E/Ex 切换；
- 退出登录；
- Experimental Safari 捕获入口折叠隐藏。

## 错误处理

- 本地 Cookie 齐全时，网络失败仍显示“已登录，网络验证失败”；
- 验证取消不显示为登录失效；
- Ex 暂时不可用不擅自修改 activeSite；
- 错误不得包含 Cookie value。

## 缓存与安全

- 敏感 Cookie 只在 Keychain；
- 普通设置可使用非敏感本地存储；
- 不保留原始导入文本；
- diagnostics 只记录 Cookie 名称存在状态。

## 验收条件

- 冷启动可从 Keychain恢复登录；
- 离线启动不丢失 loggedIn；
- E 可达、Ex 可达、Ex 不可达三种状态可区分；
- 切站不会因一次网络失败被覆盖；
- 退出清除核心 Cookie；
- 导入错误有清晰提示；
- 不依赖 Safari bridge。

## 真机测试步骤

1. 无 Cookie 冷启动；
2. 导入有效核心 Cookie；
3. 重启 Scripting；
4. 断网启动；
5. 恢复网络并刷新；
6. 切换 E/Ex；
7. 模拟 Ex 不可达；
8. 退出并重启；
9. 检查 Keychain/diagnostics 无明文 Cookie。

## 风险

- Cookie 过期与网络异常难以区分；
- ExHentai 对 `igneous` 的实际要求可能变化；
- Scripting 请求层的重定向和 Cookie header 行为需真机确认。

---

# 0.3.1 — Favorites

## 目标

复用现有 `favorites.ts`，实现登录用户可查看、搜索、分类、添加、移动和删除 Favorites 的完整纵切。

## 依赖

- 0.3.0 AccountState；
- 统一 HTTP client；
- GallerySummary 数据模型；
- Favorites HTML fixtures；
- 账号和站点真机验证通过。

## 参考 EhViewer 文件

- `FavoritesScene.kt`
- `FavListUrlBuilder.java`
- `EhEngine.java` 中 Favorites 方法
- `FavoritesParser.java`
- `CommonOperations`

## 预计修改模块

- `src/favorites.ts`
- `src/favoritesHtml.ts` 或统一 parser
- `src/favoritesScene.tsx`
- `src/appV2.tsx` 导航入口
- `src/ehUrl.ts`
- fixtures/tests

## 数据模型

```ts
type FavoriteCategory = {
  index: number;
  name: string;
  count?: number;
};

type FavoriteQuery = {
  category?: number;
  keyword?: string;
  pageUrl?: string;
};

type FavoriteMutation = {
  galleryId: string;
  galleryToken: string;
  destination: number | "remove";
  note?: string;
};
```

## 网络 API

- GET Favorites 页面；
- 解析分类名称、数量、列表和分页；
- POST 添加/移动/删除；
- 写操作不得自动盲重试；
- 操作完成后按服务端结果刷新局部状态。

## UI

- Favorites 入口；
- 分类切换；
- 搜索；
- 列表和分页；
- 从 Detail 添加/修改收藏；
- 删除确认；
- 空状态、登录失效状态。

## 错误处理

- 401/登录页返回 → `AuthRequiredError`；
- Parser 变化 → `ParseError`，保留 marker；
- 写操作结果不确定 → 提示刷新确认，不自动重复提交；
- Detail 添加后 UI 与 Favorites 列表一致。

## 缓存

- 分类信息短期缓存；
- 列表可按 query 缓存，但写操作后必须失效；
- 不缓存敏感表单字段。

## 验收条件

- 查看全部分类；
- 分类数量和名称正确；
- 搜索和分页工作；
- 从 Detail 添加到指定分类；
- 移动收藏；
- 删除收藏；
- 退出登录后入口进入登录提示；
- E/Ex 对应站点行为正确；
- 所有写操作有明确结果。

## 真机测试步骤

1. 登录后打开 Favorites；
2. 依次打开至少两个分类；
3. 搜索一个已收藏条目；
4. 打开详情；
5. 添加一个新画廊；
6. 修改分类；
7. 删除；
8. 刷新确认服务端状态；
9. 断网执行写操作，确认不会重复；
10. 退出登录后验证入口。

## 风险

- 服务端表单字段可能随页面改变；
- E 和 Ex Favorites 页面可能存在差异；
- 批量操作会放大误操作风险，首版不做批量或必须二次确认。

---

# 0.3.2 — Watched & My Tags

## 目标

完成登录后的 Watched 列表，并为 My Tags 选择适合 Scripting 的实现方式。

## 依赖

- 0.3.0；
- Gallery List 通用列表组件；
- URL builder；
- My Tags endpoint 能力验证。

## 参考 EhViewer 文件

- `SubscriptionsScene.java`
- `ListUrlBuilder.java` 的 subscription mode
- `MyTagsActivity.java`
- `EhUrl.java`
- `EhEngine.java` 中 user tag 相关方法

## 预计修改模块

- `src/watched.ts`
- `src/watchedScene.tsx`
- `src/myTags.ts`
- `src/myTagsScene.tsx` 或外部 Safari adapter
- parsers/tests

## 接口

```ts
interface WatchedService {
  load(query: GalleryListQuery): Promise<GalleryListPage>;
}

interface MyTagsCapability {
  mode: "native" | "external-safari" | "unsupported";
  reason?: string;
}
```

## UI

- Watched 列表复用 GalleryList；
- My Tags 若可原生解析，则实现列表和编辑；
- 若只能网页操作，明确显示“在 Safari 打开”，不伪装为内置能力。

## 验收条件

- Watched 列表和分页可用；
- 未登录有明确提示；
- My Tags 的实现模式有真机验证记录；
- 不依赖不可稳定共享的 Safari FileManager bridge。

## 真机测试步骤

1. 登录后打开 Watched；
2. 验证空/非空和分页；
3. 切换站点；
4. 打开 My Tags；
5. 根据 capability 执行原生或 Safari 流程；
6. 退出后验证权限状态。

## 风险

- EhViewer 的 My Tags 当前本身使用 Android WebView 和 CookieManager，该实现不能直接移植；
- 原生编辑 API/表单可能复杂，必要时先做只读或外部 Safari。

---

# 0.4.0 — Reader Core

## 目标

把当前“前后翻页”升级为稳定的 ReaderSession：支持页状态、邻页预取、跳页、失败重试和恢复接口。

## 依赖

- 0.2.9 稳定基线；
- 统一 HTTP client；
- Reader page parser fixtures；
- 文件/内存缓存接口；
- 页面离开时可取消请求。

## 参考 EhViewer 文件

- `GalleryActivity.java`
- `EhGalleryProvider`
- Gallery Provider / Spider 相关实现
- `GalleryPageApiParser`
- `GalleryPageParser`

## 预计修改模块

- `src/reader/readerSession.ts`
- `src/reader/readerService.ts`
- `src/reader/readerScene.tsx`
- `src/reader/pageCache.ts`
- `src/ehentai.ts`（迁移旧 Reader 请求）
- parser fixtures

## 数据模型

```ts
type ReaderPageState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ready"; imageUrl: string; localPath?: string }
  | { state: "error"; error: ReaderError };

type ReaderSession = {
  galleryId: string;
  galleryToken: string;
  pageCount: number;
  currentIndex: number;
  pages: ReaderPageRef[];
};
```

## 网络接口

- resolve page URL；
- fetch page HTML/API；
- fetch image binary；
- 请求取消；
- 并发上限；
- 当前页优先，邻页次优先；
- GET 可有限重试。

## UI

- 当前页；
- 前/后页；
- 跳页；
- 页码；
- loading/error/retry；
- 点击显示/隐藏控制层；
- 返回时保留当前页。

## 缓存

- 当前页和邻页内存缓存；
- 图片缓存通过统一接口；
- page token 不进入 diagnostics；
- 缓存失败不阻止在线阅读。

## 验收条件

- 连续阅读至少 30 页无状态错乱；
- 快速连续翻页不会被旧请求覆盖；
- 返回上一页使用缓存；
- 单页失败可重试；
- 跳页正确；
- 离开 Reader 后请求取消；
- 不发生重复下载风暴。

## 真机测试步骤

1. 打开 50 页以上画廊；
2. 连续前翻 10 页；
3. 快速跳到中间页；
4. 连续后退；
5. 断网后重试；
6. 恢复网络；
7. 返回 Detail 后再次进入；
8. 检查缓存和 diagnostics。

## 风险

- Scripting 图片组件和文件读取行为可能限制预取；
- 页面 token 失效；
- 过度预取导致内存压力和流量浪费。

---

# 0.4.1 — Reader UX

## 目标

在稳定 ReaderSession 上完善阅读体验，而不是继续堆网络逻辑。

## 依赖

- 0.4.0；
- SettingsStore；
- 真机确认可用的手势和图片组件能力。

## 参考 EhViewer 文件

- `GalleryActivity.java`
- Reader settings 相关类

## 预计修改模块

- `readerScene.tsx`
- `readerSettings.ts`
- `settingsStore.ts`

## 功能

- 阅读方向 LTR/RTL；
- 分页/连续模式（以 Scripting 能力为准）；
- 适应宽度/高度；
- 缩放；
- 原图/普通图；
- 控制层；
- 自动隐藏；
- 屏幕常亮（仅在 API 明确支持时）；
- 阅读状态提示。

## 验收条件

- 设置即时生效且重启后恢复；
- 方向切换不破坏页索引；
- 原图失败可退回普通图；
- 长图、横图、低分辨率图显示合理；
- iPhone 和 iPad 均通过基础矩阵。

## 真机测试步骤

- iPhone / iPad；
- 横图、竖图、超长图；
- LTR/RTL；
- 原图/普通图；
- 旋转设备（若 Scripting 支持）；
- 重启恢复设置。

## 风险

- Scripting UI 能力可能不支持 EhViewer 同等级手势；
- 连续模式可能造成内存压力，必要时延后或限制窗口。

---

# 0.5.0 — Local Library：History / Reading Progress / Search History

## 目标

建立版本化本地数据层，并实现历史、阅读进度、继续阅读和搜索历史。

## 依赖

- ReaderSession；
- 明确的 FileManager/本地数据库能力；
- Source Sync 不覆盖用户数据目录；
- schema migration 机制。

## 参考 EhViewer 文件

- `HistoryScene.java`
- `EhDB.java`
- `GalleryActivity.java`
- History/QuickSearch DAO

## 预计修改模块

- `src/storage/schema.ts`
- `src/storage/localStore.ts`
- `src/history/historyService.ts`
- `src/history/historyScene.tsx`
- `src/search/searchHistory.ts`
- Reader/Detail 写入点

## 数据模型

```ts
type LocalDatabase = {
  schemaVersion: number;
  history: HistoryEntry[];
  progress: ReadingProgress[];
  searchHistory: SearchHistoryEntry[];
};

type ReadingProgress = {
  galleryId: string;
  galleryTokenHash?: string;
  pageIndex: number;
  pageCount: number;
  updatedAt: string;
  completed: boolean;
};
```

## 接口

```ts
interface LocalLibrary {
  recordVisit(gallery: GallerySummary): Promise<void>;
  saveProgress(progress: ReadingProgress): Promise<void>;
  getProgress(galleryId: string): Promise<ReadingProgress | null>;
  listHistory(query?: HistoryQuery): Promise<HistoryEntry[]>;
  removeHistory(galleryId: string): Promise<void>;
  clearHistory(): Promise<void>;
}
```

## UI

- History 列表；
- 最近阅读；
- 继续阅读；
- 完成标记；
- 单条删除/清空；
- 搜索历史建议和清理。

## 安全与隐私

- 本地历史默认不上传 GitHub；
- diagnostics 不包含标题、搜索词或完整 gallery URL；
- 提供清空历史和搜索历史入口；
- 数据目录与源码同步目录完全分离。

## 验收条件

- 打开 Detail 写入历史；
- 阅读进度按节流策略保存；
- 崩溃/退出后恢复；
- 清空不影响收藏和下载；
- schemaVersion 可迁移；
- 损坏文件有备份和降级，不直接清空全部数据。

## 真机测试步骤

1. 连续打开 3 个画廊；
2. 每个阅读不同页数；
3. 强制关闭并重启；
4. 从 History 继续阅读；
5. 删除单条；
6. 清空历史；
7. 制造旧 schema fixture，测试迁移；
8. 制造损坏文件副本，测试恢复。

## 风险

- 直接用单一大 JSON 可能在频繁写入时损坏；
- 进度保存过于频繁会影响性能；
- gallery token 变化和隐私存储需权衡。

---

# 0.6.0 — Download Engine

## 目标

在 Scripting 允许的范围内实现可恢复的前台下载队列，不承诺 Android Foreground Service 等价能力。

## 依赖

- 0.5.0 本地 schema；
- Reader page/image service；
- 文件空间和路径能力真机验证；
- Cache/Download 目录分离。

## 参考 EhViewer 文件

- `DownloadsScene.java`
- `DownloadManager.java`
- `DownloadService`
- Spider/SpiderInfo/SpiderDen 相关文件

参考任务状态、清单和恢复逻辑，不复制 Android Service。

## 预计修改模块

- `src/downloads/downloadManager.ts`
- `src/downloads/downloadTask.ts`
- `src/downloads/downloadStore.ts`
- `src/downloads/downloadScene.tsx`
- `src/storage/fileStore.ts`

## 数据模型

```ts
type DownloadStatus =
  | "queued"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

type DownloadTask = {
  id: string;
  gallery: GallerySummary;
  status: DownloadStatus;
  pageCount: number;
  completedPages: number[];
  failedPages: number[];
  createdAt: string;
  updatedAt: string;
};
```

## 网络与队列

- 明确并发上限；
- 当前任务内页并发限制；
- 暂停/继续；
- 单页重试；
- 应用重新打开后恢复；
- Scripting 被系统挂起时保持状态一致；
- 不宣称后台持续下载。

## UI

- 下载队列；
- 进度；
- 暂停/继续/取消；
- 失败页；
- 空间占用；
- 打开离线内容；
- 删除确认。

## 验收条件

- 10 页、50 页、100+ 页画廊可下载；
- 中断后重新打开可恢复；
- 单页失败不丢失已完成页；
- 取消不会误删其他任务；
- 文件名和目录安全；
- 空间不足有明确错误；
- 下载记录和文件一致。

## 真机测试步骤

1. 下载小画廊；
2. 下载中暂停；
3. 关闭 Scripting；
4. 重开继续；
5. 断网再恢复；
6. 删除任务但保留文件/删除文件两种选项（若需要）；
7. 检查磁盘占用和目录。

## 风险

- iOS/Scripting 后台限制；
- 大量文件和 FileManager 性能；
- 网络限流；
- 页面 token 失效；
- 原图流量和空间极大。

---

# 0.6.1 — Offline Reader

## 目标

使用下载 manifest 离线阅读，并保证文件完整性、顺序和损坏恢复。

## 依赖

- 0.6.0；
- ReaderSession 支持 online/offline source；
- manifest schema。

## 预计修改模块

- `offlineManifest.ts`
- `offlineGalleryProvider.ts`
- Reader source adapter
- Downloads UI

## 接口

```ts
interface ReaderSource {
  getPageCount(): Promise<number>;
  getPage(index: number): Promise<ReaderPageAsset>;
}
```

在线与离线 Reader 使用同一接口。

## 验收条件

- 飞行模式可完整阅读已下载画廊；
- 缺页时明确提示；
- manifest 和文件不一致可修复或重新下载；
- 删除下载不会删除 History/Favorites；
- 在线/离线进度统一。

## 真机测试步骤

1. 完成下载；
2. 开启飞行模式；
3. 阅读首、中、末页；
4. 删除一个页面文件；
5. 验证缺页提示和修复；
6. 恢复网络后补齐。

## 风险

- 文件路径变化；
- manifest 损坏；
- 不同图片格式和解码限制。

---

# 0.7.0 — Comments & Rating

## 目标

实现详情页评论读取、发表/编辑、评论投票和画廊评分。

## 依赖

- 稳定账号；
- Detail 模型可承载评论、评分和 API 身份；
- 写操作的幂等性和确认策略；
- 当前 endpoint 核对。

## 参考 EhViewer 文件

- `GalleryDetailScene.java`
- `EhEngine.java`：`commentGallery`、`getEditComment`、`voteComment`、`rateGallery`
- 对应 Parser

## 预计修改模块

- `comments.ts`
- `rating.ts`
- Detail UI
- parsers/tests

## 网络 API

- 获取评论；
- 展开更多评论；
- 新增/编辑评论；
- 评论投票；
- 评分 API；
- 写操作不自动重复。

## UI

- 评论列表；
- 更多评论；
- 回复/编辑（仅服务端支持范围）；
- 投票；
- 评分控件；
- 登录/权限提示。

## 验收条件

- 评论读取和分页正确；
- 新评论提交后服务端可见；
- 编辑和投票结果明确；
- 评分单位转换正确；
- 写失败不会重复提交；
- diagnostics 不记录评论正文。

## 真机测试步骤

使用专门测试画廊/测试评论：读取、提交、编辑、投票、评分、断网、重复点击保护。

## 风险

- 评论内容属于敏感用户数据；
- API 身份字段和权限；
- 重复提交；
- 页面/接口变化。

---

# 0.7.1 — Torrent & Archive

## 目标

实现 Torrent 列表和 Archive 选项，优先提供元信息、复制/打开链接和受控下载，不实现长期后台 Torrent 客户端。

## 依赖

- 稳定 Detail；
- 账号；
- 写操作和额度错误模型；
- 文件下载能力。

## 参考 EhViewer 文件

- `EhEngine.java`：Torrent、Archive 方法
- `TorrentParser.java`
- `ArchiveParser.java`
- `EhUrl.java`

## 预计修改模块

- `torrent.ts`
- `archive.ts`
- Detail actions UI
- parser fixtures

## UI

- Torrent 列表、大小、时间、做种信息；
- 复制 magnet/下载种子/外部打开（按实际 endpoint）；
- Archive 档位和费用提示；
- 获取链接；
- 错误提示。

## 验收条件

- Torrent 列表解析正确；
- 链接操作明确；
- Archive 档位、费用和下载链接正确；
- H@H/额度/权限错误有专门提示；
- 不自动消耗资源或重复提交。

## 真机测试步骤

- 有 Torrent 和无 Torrent 画廊；
- Archive 可用和不可用状态；
- 取消操作；
- 网络失败；
- 外部打开。

## 风险

- Archive 可能产生账户资源消耗；
- 链接有时效性；
- iOS 文件处理能力受限。

---

# 0.8.0 — Settings / Cache / Search Improvements

## 目标

建立统一设置和缓存治理，补齐搜索历史、标签建议和高级搜索体验。

## 依赖

- 前述模块配置稳定；
- versioned settings schema；
- TagTranslation 数据库；
- CacheManager。

## 参考 EhViewer 文件

- `SettingsActivity`
- `Settings.java`
- `SearchLayout.java`
- `EhTagDatabase.java`
- `ListUrlBuilder.java`

## 预计修改模块

- `settingsStore.ts`
- `settingsScene.tsx`
- `cacheManager.ts`
- `searchSuggestions.ts`
- `advancedSearchScene.tsx`

## 设置范围

只包含 Scripting 有意义的设置：

- 默认站点；
- 列表显示；
- Reader 行为；
- 图片质量；
- 预取数量；
- 下载并发；
- 缓存配额；
- 标签翻译；
- 历史开关和清理；
- diagnostics 开关；
- Experimental 功能。

## Cache Management

- detail/preview/image/tag cache 分类；
- 大小统计；
- TTL；
- LRU 或容量上限；
- 分类清理；
- 损坏恢复；
- 用户数据与 cache 严格分离。

## Search Improvements

- 搜索历史；
- TagTranslation suggestions；
- namespace 建议；
- 高级搜索字段；
- 快速搜索保存；
- URL 与 SearchQuery 双向转换。

## 验收条件

- 设置重启后恢复；
- schema 迁移；
- 清理 cache 不影响 History/Favorites/Downloads；
- 建议输入不卡顿；
- 高级搜索 URL 与 EhViewer/E-Hentai 当前规则一致；
- 恢复默认设置可用。

## 真机测试步骤

- 修改每类设置；
- 重启；
- 缓存填充和清理；
- 搜索建议；
- 高级搜索组合；
- 旧 schema 迁移。

## 风险

- 设置过多导致复杂度失控；
- 大标签库搜索阻塞 UI；
- 错误清理用户数据。

---

# 0.9.0 — Hardening

## 目标

停止新增大功能，集中解决稳定性、性能、隐私、兼容和可维护性。

## 依赖

- 0.8.0 前所有计划功能完成或明确延期。

## 工作项

- 全部 Parser fixture 扩充；
- iPhone / iPad 回归矩阵；
- E/Ex 双站点回归；
- 登录/游客双模式；
- 低内存和大画廊；
- 请求取消和竞态；
- cache 压力；
- storage corruption；
- migration；
- diagnostics privacy audit；
- Source Sync rollback 演练；
- 性能指标；
- 无障碍和基本 UI 一致性；
- 删除 deprecated/重复实现；
- 文档和第三方许可审计。

## 验收条件

- P0/P1 known issues 清零或明确接受；
- 关键路径连续运行无崩溃；
- 无敏感 diagnostics；
- CI 稳定；
- 无未解释的重复 Parser/Network 实现；
- 所有用户数据可备份、迁移或清理；
- 发布候选回滚可行。

## 风险

- 之前累积的隐性行为差异；
- Scripting 新版本 API 变化；
- E-Hentai 页面变化。

---

# 1.0.0-rc — Release Candidate

## 目标

形成第一个可长期使用、可维护、可回滚的发布候选。

## 必须完成

- 版本号和 changelog；
- 安装/更新/回滚说明；
- Cookie 安全说明；
- 隐私说明；
- 第三方许可；
- 支持能力和已知限制；
- 全量真机矩阵；
- 数据迁移测试；
- Source Sync 事务测试；
- E/Ex 登录和游客测试；
- 核心模块验收；
- 无阻塞 P0/P1；
- docs 与代码一致。

## Release Gate

```text
TypeScript Check       PASS
Parser Fixtures        PASS
Storage Migration      PASS
Privacy Audit          PASS
iPhone Smoke           PASS
iPad Smoke             PASS
E-Hentai               PASS
ExHentai               PASS or documented limitation
Rollback               PASS
Reviewer Approval      PASS
```

## 延期规则

无法在 Scripting 稳定实现的功能必须明确标为：

- Unsupported；
- External Safari；
- Foreground only；
- Experimental；
- Deferred。

禁止用不可靠实验方案填充 1.0 功能列表。
