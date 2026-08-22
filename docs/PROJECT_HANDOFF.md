# PROJECT_HANDOFF.md

> 状态：已确认，作为当前技术交接基线；后续随代码事实持续维护  
> 最后审计：2026-08-23  
> 目标仓库：`tudoutematou/scripting-ehentai`

## 1. 文档用途

本文件是新 Agent、开发者或 Reviewer 接手 `scripting-ehentai` 时必须先阅读的项目入口。

阅读顺序：

1. `docs/PROJECT_HANDOFF.md`
2. `docs/DEVELOPMENT_RULES.md`
3. `docs/ROADMAP.md`
4. 当前任务单
5. 当前目标分支源码
6. 与任务相关的最新真机 diagnostics

本文记录项目目标、当前架构、真实功能状态、关键技术决定、废弃方案和 Scripting 运行时限制。

## 2. 项目目标

在 iPhone / iPad 的 Scripting App 中开发一个 E-Hentai / ExHentai 客户端。

项目不是简单网页壳。目标是在 Scripting 能力允许的范围内，实现接近 `xiaojieonly/Ehviewer_CN_SXJ` 的核心体验，包括：

- E-Hentai 浏览；
- ExHentai；
- 搜索、分类筛选、高级筛选；
- 标签搜索和标签中文化；
- Gallery Detail；
- Preview；
- Reader；
- Cookie 登录；
- Favorites；
- Watched；
- My Tags；
- History、阅读进度；
- Downloads、离线阅读；
- Comments、Rating；
- Torrent、Archive；
- Settings、Cache Management；
- Search History、Suggestions。

## 3. 非目标

项目不追求 Android EhViewer 的逐行、逐页面或逐交互复制。

不应为 1:1 模仿而实现：

- Android Activity / Fragment / Service 生命周期；
- Android WebView、CookieManager、OkHttp 同进程登录架构；
- Android Foreground Service 和通知渠道；
- Android 外部存储、SAF、媒体扫描；
- APK 更新；
- Android 状态栏、导航栏、硬件键专属行为；
- 长期后台 Torrent/H@H 客户端。

## 4. 事实来源优先级

发生冲突时按以下顺序判断：

1. 当前 GitHub 目标分支源码和精确 SHA；
2. 与该版本匹配的最新 `runtime/events` 真机记录；
3. 当前任务验收结果；
4. 本文档和 ROADMAP；
5. 历史聊天、旧 Issue、旧说明文档。

历史聊天只用于理解决策背景，不能覆盖当前代码事实。

## 5. 当前审计快照

### 5.1 main

- Branch：`main`
- SHA：`13544409a691de65687859989be1e38a7c008681`
- Script version：`0.2.8`
- 入口：大型单体 `src/index.tsx`
- 状态：当前正式基线，但游客新版架构尚未合入

### 5.2 游客功能分支

- Branch：`feat/tourist-home-search-ui`
- SHA：`da38425b4e2814381866cb5671c080039b9e106c`
- Script version：`0.2.9`
- 入口：`index.tsx` → `runAppV2()`
- 状态：核心游客链路已真机运行，但尚未形成可合并基线

### 5.3 PR #17

- State：Open / Draft
- GitHub mergeable：false
- Commits：64
- Changed files：47
- 当前相对 `main`：ahead 64 / behind 12
- 业务源码变更与 35 个 runtime event 文件混在同一 PR
- 不应原样 merge

## 6. 当前总体判断

- 完整项目目标覆盖：约 30%～35%；
- 游客核心链路可走通程度：约 70%～75%；
- 游客链路稳定发布准备度：约 60%～65%；
- 当前阶段：从实验原型向可持续开发基线过渡。

下一阶段不是新增大模块，而是建立 `0.2.9-stabilization`。

## 7. 当前架构

```text
index.tsx
└── appV2.tsx
    ├── Home / Search / Filter / Results
    ├── Gallery Detail / Preview
    ├── Reader
    ├── tourist.ts
    ├── ehentai.ts
    │   ├── account.ts
    │   ├── searchHtml.ts
    │   ├── detailHtml.ts
    │   ├── pure.ts
    │   └── extractors.ts
    ├── tagTranslation.ts
    └── githubBridge.ts

未接入 appV2：
├── favorites.ts
├── main 中的账号操作 UI
└── browser.tsx Safari bridge（实验性）
```

## 8. 建议目标分层

### 8.1 Presentation

只负责页面、用户事件和显示状态：

- HomeScene
- SearchScene
- GalleryListScene
- GalleryDetailScene
- ReaderScene
- AccountScene
- FavoritesScene
- SettingsScene

Presentation 不直接拼 URL、不读 Cookie、不解析 HTML。

### 8.2 Application / Use Cases

负责业务流程：

- SearchGalleries
- LoadGalleryDetail
- LoadPreviewPage
- ResolveReaderPage
- ManageAccount
- ManageFavorites
- SaveReadingProgress
- ManageDownloads

### 8.3 Domain

核心类型：

```ts
type Site = "e-hentai" | "exhentai";

type TagRef = {
  raw: string;
  namespace: string;
  name: string;
  searchUrl: string;
  translatedName?: string;
};

type AccountState = {
  loggedIn: boolean;
  eHentaiReachable: boolean | null;
  exAvailable: boolean | null;
  activeSite: Site;
};
```

后续还需要：`GallerySummary`、`GalleryDetail`、`SearchQuery`、`ReaderSession`、`ReadingProgress`、`DownloadTask`。

### 8.4 Infrastructure

- `EhHttpClient`：请求、超时、重试、取消、Cookie 注入、错误转换；
- `EhUrlBuilder`：全部 endpoint 和 query；
- Parsers：纯函数和 fixture；
- `KeychainStore`：敏感凭证；
- `FileCache` / `LocalStore`：非敏感持久化；
- `DiagnosticReporter` + `DiagnosticSanitizer`；
- `SourceSync`：仅开发工具。

## 9. 文件职责

| 文件 | 当前职责 | 处置方向 |
|---|---|---|
| `src/index.tsx` | main 中是单体应用；PR 中只启动 appV2 | 保持极薄入口，不再放业务 |
| `src/appV2.tsx` | 新游客 UI、导航、状态、Detail、Reader | 格式化并逐步拆 Scene；短期不大重构 |
| `src/appV2-globals.d.ts` | 为全局 NavigationStack 提供 `any` 声明 | 临时兼容；后续改显式依赖或 typed adapter |
| `src/tourist.ts` | 分类、快速筛选、SearchState、URL 构造 | 保留；演化为统一 SearchQuery / URL builder |
| `src/ehentai.ts` | HTTP、列表、Detail、Preview、Reader、缓存 | 逐步拆成 client/use case/cache，不允许 UI 再加直连请求 |
| `src/searchHtml.ts` | Gallery List Regex Parser | 保留一个主 Parser，补 fixture |
| `src/detailHtml.ts` | Detail / Preview Regex Parser | 保留并补 fixture；禁止重新阻塞加载 |
| `src/extractors.ts` | DOM 注入式提取器和类型 | 明确保留场景，否则删除重复实现 |
| `src/pure.ts` | 通用纯函数和旧 parser helper | 去重 helper，保持无副作用 |
| `src/account.ts` | Keychain Cookie、站点、登录和网络状态 | 核心模块，优先复用，不在 UI 重写 Cookie 逻辑 |
| `src/browser.tsx` | Safari userscript / 文件桥实验 | 移到 Experimental，默认关闭 |
| `src/favorites.ts` | Favorites 请求与解析后端 | 复用并补 UI、fixture、诊断和真机验收 |
| `src/tagTranslation.ts` | 下载、解析和缓存 EhTagTranslation | 加 SHA1、临时替换、版本、suggest |
| `src/githubBridge.ts` | GitHub diagnostics 和 Source Sync | 拆分成两个模块，统一脱敏和事务同步 |
| `src/script.json` | Scripting 脚本元数据和权限 | 每次版本更新必须同步检查 |
| `src/tsconfig.test.json` | 当前尝试的 TypeScript 检查配置 | 修复缺失 typings，覆盖全部源码 |
| `runtime/events/` | 真机事件事实记录 | 与功能 PR 分离、脱敏、限期保留 |
| `runtime/latest.json` | 最新事件便利镜像 | 仅镜像，绝不是唯一事实来源 |
| `bridge/HANDOFF.md` | 早期联调说明 | 被本文件替代，迁移后标记 Deprecated |
| `bridge/SCRIPTING_SETUP.md` | 早期 Issue/源码同步接入说明 | 标记 Deprecated，仅保留历史用途 |

## 10. 当前功能状态

### ✅ 已完成并有真机证据

- E-Hentai 首页列表；
- 普通搜索；
- Search → Detail → Reader 基础链路；
- Gallery Detail Core 解析；
- 图片页解析；
- 标签原始 href 点击搜索；
- Detail Core 先显示；
- Preview 后台补齐的主流程；
- Keychain 保存核心 Cookie；
- 本地 Cookie 判断登录状态；
- diagnostics 基础链路。

### 🟡 已实现但还需验证

- 全部分类和组合筛选；
- 高级搜索；
- 搜索分页和竞态处理；
- Preview 大画廊、失败页和重试；
- EhTagTranslation 完整翻译加载；
- ExHentai 可用性和站点切换；
- Favorites 后端；
- Detail/Preview cache；
- Source Sync 的完整事务性。

### ⚠️ 确认问题

- PR #17 不可直接合并；
- appV2 首页筛选 `onApply` 为空；
- appV2 隐藏账号导入、退出和站点切换入口；
- diagnostics 暴露 tag/g/s 完整路径；
- 代码压缩成长行，Review 困难；
- `NavigationStack` 使用全局 `any`；
- Parser 重复且无 fixture；
- TypeScript 配置不可复现；
- cache 无配额、TTL 和清理；
- Account 网络验证存在串行等待和偏好副作用；
- Source Sync 写入阶段无 rollback。

### ❌ 尚未实现

- Favorites UI；
- Watched；
- My Tags 原生能力；
- Reader 完整体验；
- History；
- Reading Progress；
- Search History；
- Downloads；
- Offline Reader；
- Comments；
- Rating；
- Torrent；
- Archive；
- Settings；
- Cache Management UI；
- CI 和 Parser fixture suite。

### 🧪 实验性

- Embedded WebView 登录；
- Safari Browser Script + GM.cookie + FileManager bridge；
- 普通 JSON 临时保存原始 Cookie；
- 任何依赖 Safari extension 与 Scripting 共享文件容器的主登录方案。

## 11. 关键技术决定

### 11.1 GitHub 当前源码是代码事实来源

聊天、旧文档和 Issue 只提供背景。任务开始前必须记录目标分支和 SHA。

### 11.2 Cookie 只存 Keychain

核心 Cookie：

- `ipb_member_id`
- `ipb_pass_hash`
- `igneous`（可选）

禁止写入普通 JSON、diagnostics、console、GitHub、错误文本或完整 URL。

### 11.3 登录状态与网络状态分离

```text
loggedIn        = 本地核心 Cookie 是否存在
eHentaiReachable = 当前网络是否可访问 E-Hentai
exAvailable      = 当前账号/网络是否可访问 ExHentai
activeSite       = 用户选择的站点
```

网络失败不能把 `loggedIn` 改为 false；临时 Ex 失败不能擅自永久切换用户站点。

### 11.4 Detail 必须非阻塞

正确顺序：

```text
加载 Detail Core
→ 立即显示标题、封面、元信息、标签、首屏 Preview
→ 后台并发加载剩余 Preview 页
→ 增量刷新 UI
```

禁止恢复“全部 Preview 完成后才显示 Detail”的旧方案。

### 11.5 TagRef 必须保存搜索语义

禁止把标签退化为 `string[]`。至少保存：

- raw；
- namespace；
- name；
- searchUrl；
- translation（可选）。

点击标签优先使用页面原始 href，不重新猜 URL 编码规则。

### 11.6 标签翻译采用完整数据库 + 小型 fallback

- 主来源：EhTagTranslation；
- fallback：namespace 翻译和极少数 `COMMON_TAG_ZH`；
- 不继续手工维护大规模标签字典；
- 下载必须校验 SHA1，并使用 `.tmp` 后原子替换；
- 数据许可必须记录。

### 11.7 runtime/events 是诊断事实，latest 只是镜像

错误分析优先读取与版本匹配的最新 events。`runtime/latest.json` 不能替代历史事件。

### 11.8 Source Sync 必须事务化

最低目标：

```text
下载 manifest
→ 下载全部文件到 staging
→ 校验 path / size / hash
→ 完整成功后备份当前源码
→ 统一替换
→ 删除 manifest 中已不存在的旧文件
→ 失败时 rollback
```

## 12. 已废弃方案

以下方案不得重新作为正式主线提出：

1. Embedded WebView 直接登录并期待稳定通过 Cloudflare；
2. Safari Extension 和 Scripting 通过 FileManager 文件自然共享；
3. 将 Safari bridge 作为唯一或默认登录方案；
4. 把敏感 Cookie 保存到普通 JSON；
5. 仅用 `runtime/latest.json` 分析错误；
6. 边下载远端源码边覆盖当前本地文件；
7. Detail 等待全部 Preview 页面后再显示；
8. Tag 只保存字符串；
9. 靠持续增加 `COMMON_TAG_ZH` 完成中文化；
10. 为一个按钮重新写一套请求、Cookie 或 Parser。

## 13. 登录方案

### 13.1 正式方案

Cookie 手工导入或其他安全输入方式：

1. 用户提供 Cookie 文本；
2. 仅解析所需 Cookie；
3. 立即写入 Keychain；
4. 输入文本不保留、不上传；
5. 本地核心 Cookie 齐全时 `loggedIn = true`；
6. 网络验证独立更新 reachability；
7. 用户可手动刷新状态、切站、退出。

### 13.2 Experimental

Safari Browser Script 可保留用于研究 Cookie 捕获，但：

- 默认隐藏；
- 不保证共享文件可见；
- 不允许成为完成登录的必要步骤；
- 不允许在普通文件中长期保存 Cookie；
- 相关失败不得阻塞正式登录。

## 14. Cookie 安全

任何日志、事件和异常上报前必须经过统一 sanitizer。

禁止字段和内容：

- Cookie value；
- `Authorization`；
- GitHub token；
- 密码；
- 原始登录输入；
- 完整账户信息；
- 完整 HTML；
- 含查询词、gallery token、page token 的完整 URL。

允许记录：

- Cookie 名称是否存在；
- site；
- HTTP status；
- stage；
- 错误类型；
- 已脱敏路径类型，例如 `gallery-detail:{hash}`；
- 响应体长度和 parser marker，不记录正文。

## 15. 网络层

当前网络调用分散在 `ehentai.ts`、`account.ts`、`favorites.ts` 等文件。

目标 `EhHttpClient` 应统一：

- site host；
- Cookie header；
- referer/origin；
- timeout；
- cancellation；
- retry policy；
- HTTP status 映射；
- Cloudflare/Sad Panda/登录失效识别；
- diagnostics；
- response 类型。

重试只用于幂等 GET 或明确安全的请求；收藏、评论、评分等写操作不得盲目自动重试。

## 16. Parser

### 16.1 当前问题

- Regex Parser 和 DOM extractor 并存；
- decode/clean helper 重复；
- 无固定 HTML fixtures；
- 页面变化后只能靠真机发现；
- parser error 结构不统一。

### 16.2 目标

每个 Parser：

- 输入字符串；
- 输出 typed result；
- 无网络、无 UI、无 Keychain；
- 对缺失字段给出可判断错误；
- 由脱敏 fixture 测试；
- 记录 parser version 或 marker。

首批 fixture：

- E-Hentai gallery list；
- Search result；
- Gallery detail；
- Preview additional page；
- Image page；
- Favorites list；
- 登录失效页；
- 空结果页；
- Cloudflare / Sad Panda 示例。

## 17. 标签系统

### 17.1 数据模型

```ts
type TagRef = {
  raw: string;
  namespace: string;
  name: string;
  searchUrl: string;
  translatedName?: string;
};
```

### 17.2 翻译数据生命周期

1. 先读取已校验本地版本；
2. 后台读取远端 `.sha1`；
3. 相同时不下载数据；
4. 不同则下载到 `.tmp`；
5. 校验后替换；
6. 更新状态和版本；
7. 失败继续使用旧版本；
8. 无数据库时使用小型 fallback。

### 17.3 Suggestions

后续可基于标签数据库实现最多约 40 条建议，但必须延迟加载和避免每次输入全量扫描造成 UI 卡顿。

## 18. Detail / Preview

### 18.1 已确认架构

- `loadGalleryDetailCore()`；
- 首屏立即渲染；
- `loadRemainingPreviewPages()`；
- 最大约 3 worker；
- `detailCoreCache`；
- `previewPageCache`。

### 18.2 后续要求

- 请求取消；
- 并发去重；
- 缓存容量和 TTL；
- 失败页重试；
- 单页失败不清空全部 Preview；
- 页面切走后不继续更新已销毁 UI；
- diagnostics 保留 page index、stage 和错误，不保留原始 token URL。

## 19. Reader

### 19.1 当前状态

已有基础图片页解析、前后页切换和图片加载，但没有完整 Reader session。

### 19.2 目标模型

```ts
type ReaderSession = {
  galleryId: string;
  pageCount: number;
  currentIndex: number;
  pageRefs: ReaderPageRef[];
  direction: "ltr" | "rtl";
  mode: "paged" | "continuous";
  quality: "normal" | "original";
};
```

### 19.3 后续功能

- 邻页预取；
- 跳页；
- 进度保存；
- 恢复阅读；
- 单页重试；
- 原图/普通图切换；
- 缩放和适配；
- 连续阅读或分页模式；
- 错误占位；
- 离线 page source。

## 20. Diagnostics

### 20.1 建议事件结构

```ts
type DiagnosticEvent = {
  time: string;
  scriptVersion: string;
  commit?: string;
  deviceClass?: "iphone" | "ipad";
  stage: string;
  ok: boolean;
  durationMs?: number;
  request?: {
    kind: string;
    status?: number;
    pathHash?: string;
  };
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metrics?: Record<string, number | boolean | string>;
};
```

### 20.2 规则

- 所有字段统一 sanitizer；
- `notes/message/stack` 也必须脱敏；
- 不记录完整 URL；
- events 有数量或天数上限；
- latest 仅镜像；
- runtime 变更不混入功能 PR；
- parser 失败不上传完整 HTML。

## 21. GitHub Workflow

### 21.1 分支

- `main`：仅合并通过验收的版本；
- `fix/0.2.9-stabilization`：当前建议稳定化分支；
- 之后每个 milestone 使用单一目的分支；
- runtime diagnostics 使用独立通道，不污染功能 PR。

### 21.2 PR 必须包含

- base/head SHA；
- 背景和目标；
- 修改文件；
- 明确不修改范围；
- TypeScript 结果；
- fixture 结果；
- 真机测试矩阵；
- diagnostics 引用；
- 风险和 rollback；
- 截图或行为说明；
- 第三方代码/数据变化。

### 21.3 合并要求

- 无未解释的业务回归；
- 无敏感信息；
- checks 通过；
- Reviewer 确认；
- 真机关键路径通过；
- 文档同步；
- 版本号同步；
- 可回滚。

## 22. Scripting Runtime 特殊限制

- 不能假设 Safari Extension 与 Scripting 共享同一文件容器；
- 不能假设 Android WebView CookieManager 行为；
- 不确定 API 时必须查 Scripting 官方 docs 或当前 typings；
- 不得为通过 TypeScript 而随意声明大量 `any`；
- 后台执行、文件持久化、图片缓存和下载能力必须真机验证；
- Source Sync 失败时必须保留当前可运行版本；
- UI 导航和组件生命周期以 Scripting 真机为准；
- Scripting Agent 可本地查看源码和 typings，应优先由其完成具体 API 适配。

## 23. EhViewer 对标方法

实现功能前优先查看：

- List/Search：`GalleryListScene.java`、`ListUrlBuilder.java`
- Detail：`GalleryDetailScene.java`、`GalleryPreviewsScene.java`
- Reader：`GalleryActivity.java`、Gallery Provider 相关文件
- Favorites：`FavoritesScene.kt`、`FavListUrlBuilder.java`
- History：`HistoryScene.java`、`EhDB.java`
- Downloads：`DownloadsScene.java`、`DownloadManager.java`、`DownloadService`
- Watched：`SubscriptionsScene.java`
- My Tags：`MyTagsActivity.java`
- Endpoints：`EhUrl.java`
- Network/API：`EhEngine.java`
- Cookie：`EhCookieStore.java`
- Tags：`EhTagDatabase.java`
- Common actions：`CommonOperations`
- Settings：`SettingsActivity` / `Settings.java`

对标原则：

1. 理解业务语义和 endpoint；
2. 再核对 E-Hentai 当前网页；
3. 使用 Scripting 适合的架构重新实现；
4. 不直接复制 GPL 代码片段，除非完成许可评估；
5. 不移植 Android 专属实现。

## 24. Known Issues

1. PR #17 不可直接合并；
2. appV2 首页筛选无效；
3. appV2 账号操作入口回归；
4. Diagnostics 暴露阅读路径；
5. Source Sync 无完整 rollback；
6. Parser 重复；
7. TypeScript 配置缺失 typings；
8. Cache 无治理；
9. Search response 竞态；
10. Account 网络验证可能等待过长并修改偏好；
11. Safari bridge 和正式账号逻辑未完全隔离；
12. 旧 bridge 文档已过时；
13. README 为空壳；
14. 无 CI、无 fixtures；
15. 第三方许可未建立清单。

## 25. 新 Agent 接手检查表

开始任何任务前：

- [ ] 读取本文件、DEVELOPMENT_RULES、ROADMAP；
- [ ] 获取最新 branch 和 SHA；
- [ ] 查看当前 PR 和 diff；
- [ ] 搜索已有实现；
- [ ] 读取相关最新 runtime events；
- [ ] 确认允许修改文件和不修改范围；
- [ ] 查看对应 EhViewer 文件；
- [ ] 查看 Scripting 官方 docs/typings；
- [ ] 写出接口和验收条件；
- [ ] 确认 diagnostics 不含敏感信息；
- [ ] 完成后停止，不顺手扩展下一模块。

## 26. 当前下一步

第一任务：`TASK-001 — 建立 0.2.9 稳定化集成分支`。

在该任务通过前，不启动 Favorites、Reader 大改、History 或 Downloads。
