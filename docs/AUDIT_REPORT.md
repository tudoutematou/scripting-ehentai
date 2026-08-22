# scripting-ehentai 全面审计报告

> 审计日期：2026-08-23  
> 项目仓库：`tudoutematou/scripting-ehentai`  
> 对标仓库：`xiaojieonly/Ehviewer_CN_SXJ`  
> 标签数据库：`xiaojieonly/EhTagTranslation`  
> 本文档已获确认并归档到 `docs/project-governance` 分支；合并 `main` 前仍应通过正常 Review。

## 0. 审计快照

- `main`：`13544409a691de65687859989be1e38a7c008681`
- `main` 脚本版本：`0.2.8`
- `feat/tourist-home-search-ui`：`da38425b4e2814381866cb5671c080039b9e106c`
- 功能分支脚本版本：`0.2.9`
- PR：`#17 feat: 优化游客首页、分类搜索与中文标签`
- PR 状态：Open、Draft、GitHub 判定不可直接合并
- PR 规模：64 commits、47 changed files、+812/-1364
- 当前分支关系：功能分支领先 `main` 64 个提交、落后 12 个提交
- `main` 落后的 12 个提交均为 `runtime/events` 与 `runtime/latest.json` 诊断数据，没有新的业务源码提交。

## 1. 执行摘要

### 1.1 结论

用户给出的长期接管方案方向正确，可以作为项目治理框架，但还缺少一个必须先执行的阶段：**0.2.9 稳定化与工程基线**。

在继续做 Favorites、Reader、History 等业务前，必须先完成：

1. 将 PR #17 的源码变更从大量 runtime 事件中分离；
2. 修复当前功能分支已确认的 UI 回归；
3. 恢复账号和站点切换入口；
4. 建立可复现 TypeScript 检查、Parser fixture 和最小 CI；
5. 修复 diagnostics 隐私与 Source Sync 事务性问题；
6. 明确 UI、Use Case、Network、Parser、Storage、Diagnostics 的边界。

### 1.2 当前项目真实阶段

项目已经不是“概念验证”，但也还不是“可持续功能开发基线”。当前处于：

> **游客核心链路已打通，但分支治理、架构边界、测试基线和隐私治理仍处于实验阶段。**

### 1.3 完成度重新估计

以下数字是按“最终目标模块”加权后的工程判断，不是代码行数统计：

| 口径 | 当前估计 | 说明 |
|---|---:|---|
| `main` 当前可交付能力 | 20%～25% | `main` 仍是 0.2.8，未包含 PR #17 的新游客 UI 架构 |
| PR #17 Head 的整体目标覆盖 | 30%～35% | 游客链路、账号后端、Favorites 后端已有基础，但大型模块多数缺失 |
| 游客核心路径“能否走通” | 70%～75% | 首页、搜索、Detail、Preview、基础 Reader 已有真机证据 |
| 游客体验“可作为稳定版本发布” | 60%～65% | 仍有筛选回归、竞态、缓存、Reader、测试与隐私问题 |
| 完整 EhViewer 核心体验 | 约 30%～35% | 原先 35%～40% 略偏乐观，但并非严重高估 |

### 1.4 最重要的积极成果

- Gallery Detail 已从阻塞式“全部 Preview 加载完再显示”改为 Core 先显示、剩余 Preview 后台加载；方向正确，禁止回退。
- Detail 和 Preview 已有内存缓存，并采用约 3 路并发补齐 Preview。
- 标签模型已开始保存原始搜索 URL，不再只保留字符串。
- EhTagTranslation 已接入运行时下载和本地缓存路径。
- Cookie 登录后端使用 Keychain，并将本地登录状态与网络可达状态分离。
- 最新真机事件可证明标签搜索、详情核心解析、图片页解析均实际跑通过。
- Favorites 并非完全未实现：已有网络和 Parser 后端，只是没有接入新 UI，也缺少完整真机验收。

### 1.5 当前最大的判断修正

PR #17 不是普通“游客首页 UI PR”，而是一次入口和页面组织方式迁移：

- `main`：`index.tsx` 仍承担大量 UI、导航、账号、Reader、开发工具逻辑；
- PR #17：`index.tsx` 只启动 `appV2.tsx`，主要 UI 和状态转移到新入口；
- 账号、站点切换、退出登录、GitHub 联调入口没有同步迁移完整；
- 因此不能按 PR 描述中的“不改账号主线”理解，也不能原样 merge。

## 2. 当前架构图

### 2.1 当前实际架构

```text
main / 0.2.8
└── index.tsx（单体 UI + 导航 + 账号 + Reader + DevTools）
    ├── ehentai.ts（请求、详情、图片页）
    ├── account.ts（Keychain Cookie、站点、网络验证）
    ├── favorites.ts（收藏网络与解析后端）
    ├── githubBridge.ts（源码同步 + diagnostics）
    ├── searchHtml.ts / detailHtml.ts / pure.ts
    └── extractors.ts（另一套 DOM 提取逻辑）

PR #17 / 0.2.9
└── index.tsx
    └── runAppV2(appV2.tsx)
        ├── Home / Search / Filter / Results / Detail / Reader
        ├── tourist.ts（搜索状态、分类和 URL 构造）
        ├── ehentai.ts
        │   ├── HTTP 请求
        │   ├── account.ts 注入 Cookie
        │   ├── Detail Core Cache
        │   ├── Preview Page Cache
        │   └── Reader 图片页解析
        ├── tagTranslation.ts
        │   ├── EhTagTranslation 远端数据
        │   └── 本地文件缓存
        └── githubBridge.ts
            ├── GitHub 源码同步
            └── runtime/events diagnostics

未接入 appV2 主流程：
├── favorites.ts
├── main 中的完整账号操作入口
└── browser.tsx Safari bridge（实验性）
```

### 2.2 建议目标架构

```text
Presentation / Scenes
├── HomeScene
├── SearchScene
├── GalleryListScene
├── GalleryDetailScene
├── ReaderScene
├── AccountScene
├── FavoritesScene
└── SettingsScene
        │
        ▼
Application / Use Cases
├── SearchGalleries
├── LoadGalleryDetail
├── LoadPreviewPage
├── ResolveReaderPage
├── ManageAccount
├── ManageFavorites
├── SaveReadingProgress
└── ManageDownloads
        │
        ▼
Domain Models
├── GallerySummary
├── GalleryDetail
├── TagRef { raw, namespace, name, searchUrl, translation? }
├── SearchQuery
├── AccountState
├── ReaderSession
├── ReadingProgress
└── DownloadTask
        │
        ▼
Infrastructure
├── EhHttpClient
│   ├── EhUrlBuilder / Endpoint definitions
│   ├── CookieProvider
│   ├── timeout / retry / cancellation
│   └── typed error
├── Parsers（纯函数 + fixtures）
├── KeychainStore
├── FileCache / LocalStore
├── DiagnosticReporter + Sanitizer
└── SourceSync（开发工具，和业务完全隔离）

Experimental
└── Safari Cookie Bridge（默认关闭，不参与核心登录）
```

### 2.3 架构原则

- UI 不直接拼 URL、不直接读取 Cookie、不直接解析 HTML。
- URL 构造集中到一个模块，避免参数逻辑分散。
- Parser 尽量是无副作用纯函数，并由固定 HTML fixtures 验证。
- AccountState、NetworkStatus、ActiveSite 分离，不互相覆盖。
- Diagnostics 和 Source Sync 属于开发工具，不得成为业务模块依赖。
- 不为了形式引入复杂框架；先用清晰的小模块和显式接口完成分层。

## 3. 功能完成度矩阵

### 3.1 状态定义

- ✅：代码存在，并有当前或近期真机证据/用户确认
- 🟡：已有实现，但验证、边界或 UI 集成不完整
- ⚠️：存在确认 Bug、回归、隐私或架构阻塞
- ❌：当前源码中没有可用实现
- 🧪：实验性方案，不应作为正式主流程

### 3.2 功能矩阵

| 模块 | 状态 | 当前事实 | 下一步 |
|---|---|---|---|
| App 启动 / appV2 入口 | ✅ | 0.2.9 已有真机 manual-operation 事件 | 建立干净集成分支 |
| E-Hentai 首页列表 | ✅ | 真机事件存在，游客首页可用 | 增加回归用例 |
| 普通关键词搜索 | ✅ | 搜索结果链路已跑通 | 加竞态取消和历史 |
| 分类 `f_cats` 掩码 | 🟡 | 10 分类与排除掩码已实现 | 对每类做 URL/真机矩阵测试 |
| 快速语言筛选 | 🟡 | 中/日/英/翻译本/无对白已实现 | 验证组合条件 |
| 首页“筛选”入口 | ⚠️ | appV2 当前 `onApply` 为空，应用后不会打开结果 | PR 合并前修复 |
| 搜索结果页筛选 | ✅/🟡 | 最新 `gallery-search-filter` 事件成功 | 验证返回、重复应用、空结果 |
| 高级搜索 | 🟡 | 数据结构和基础参数存在，但未覆盖 EhViewer 全部能力 | 统一 SearchQuery 后补齐 |
| 搜索分页 / 连续加载 | 🟡 | 有结果状态与页面 URL，但缺少系统性验收 | 增加首/前/后页测试 |
| Gallery List 元信息中文化 | ✅/🟡 | 分类和部分字段已中文化 | 用真实样本覆盖缺失字段 |
| Gallery Detail Core | ✅ | 最新真机事件约 1.4 秒完成核心解析 | 保持非阻塞架构 |
| Preview 首屏 | ✅ | Detail Core 提供首批链接 | 验证不同缩略图布局 |
| Preview 后台分页 | ✅/🟡 | 3 worker 并发和缓存已实现 | 加失败重试、取消、错误详情 |
| Detail/Preview Cache | 🟡 | 内存缓存存在 | 加容量、TTL、失效和清理 |
| 标签点击搜索 | ✅ | 使用原始 tag href，最新真机事件成功 | 保持 TagRef 结构 |
| Namespace 中文化 | ✅ | 已实现 | 作为 fallback 保留 |
| 完整标签中文数据库 | 🟡 | 已接 EhTagTranslation 并本地缓存 | 加 SHA1、临时文件替换、版本状态和建议搜索 |
| 基础 Reader | ✅ | 前后页解析与图片加载有真机证据 | 建立 ReaderSession |
| Reader 预取 / 缓冲 | ❌ | 当前无稳定实现 | 0.4.x |
| Reader 阅读进度 | ❌ | 当前无持久化 | 0.5.x |
| Reader 恢复 / 跳页 / 方向 / 缩放设置 | ❌ | 当前仅基础前后页 | 0.4.x |
| Keychain Cookie 存储 | ✅ | `ipb_member_id`、`ipb_pass_hash` 使用 Keychain | 保持不变 |
| 本地登录状态 | ✅ | 由核心 Cookie 判断，网络失败不覆盖本地登录 | 保持状态分离 |
| E / Ex 网络状态 | 🟡 | 已有 Reachable/Available 思路和验证 | 改为并行、无副作用验证 |
| Cookie 手工导入 | ✅/⚠️ | 后端和 main UI 可用，但 appV2 未迁移入口 | 0.2.9 稳定化恢复 |
| 退出登录 / 站点切换 | ✅/⚠️ | main 有，appV2 缺失 | 0.2.9 稳定化恢复 |
| Safari FileManager Bridge | 🧪 | 真机反复证明不可稳定共享 | 标为 Experimental，默认隐藏 |
| Embedded WebView 登录 | 🧪 | Cloudflare 易循环 | 不再作为主方案 |
| Favorites 网络/Parser 后端 | 🟡 | `favorites.ts` 已支持列表和修改类操作 | 接入 UI、补 fixture 和真机验证 |
| Favorites UI | ❌ | appV2 无入口 | 0.3.1 |
| Watched | ❌ | 无完整实现 | 0.3.2 |
| My Tags | ❌/🧪 | 无原生实现；Safari/WebView 路线不适合作核心 | 0.3.2 先做能力验证 |
| History | ❌ | 无持久化模型和 UI | 0.5.0 |
| Search History / Suggestions | ❌ | 无持久化和建议服务 | 0.5.0 / 0.8.0 |
| Downloads | ❌ | 无任务模型、队列、文件清单 | 0.6.0 |
| Offline Reader | ❌ | 无离线 manifest | 0.6.1 |
| Comments | ❌ | 无接口/UI | 0.7.0 |
| Rating | ❌ | 无 API 身份和 UI | 0.7.0 |
| Torrent | ❌ | 无列表/打开逻辑 | 0.7.1，优先做链接能力而非内置客户端 |
| Archive | ❌ | 无列表/下载逻辑 | 0.7.1 |
| Settings | ❌/🟡 | 仅零散站点状态和缓存，没有统一设置层 | 0.8.0 |
| Cache Management | 🟡 | 有内部缓存，无管理、配额、统计 | 0.8.0 |
| Diagnostics | 🟡/⚠️ | events 可用，但完整 tag/g/s 路径形成阅读轨迹 | 立即脱敏与限期保留 |
| Source Sync | 🟡/⚠️ | 已先下载后覆盖，但写入阶段无回滚，旧文件不清理 | 加 staging、manifest、hash、rollback |
| TypeScript 基线 | ⚠️ | 无 package/CI；tsconfig 引用缺失的 typings | 建立可复现检查 |
| Parser Tests | ❌ | 无 fixtures/test 目录 | 建立最小测试集 |

## 4. 架构问题与技术债

### P0：阻塞合并或涉及隐私

1. **PR #17 与 `main` 分叉且不可直接合并。**
2. **PR 将 35 个 runtime event 文件和业务代码混在一起。**
3. **Diagnostics 暴露完整 `/tag/`、`/g/`、`/s/` 路径，形成可回溯阅读轨迹。**
4. **appV2 的首页筛选回调为空，是确认的功能 Bug。**
5. **appV2 迁移时隐藏了账号导入、退出、站点切换等现有能力。**

### P1：可持续开发阻塞

6. `appV2.tsx`、`ehentai.ts`、多个 Parser 被压缩成极少长行，Review 和定位错误困难。
7. `NavigationStack` 通过全局变量和 ambient `any` 暴露，类型安全和依赖关系不清晰。
8. `searchHtml.ts`、`detailHtml.ts`、`pure.ts`、`extractors.ts` 存在重复 HTML decode、清理和解析路径。
9. 同时存在 Regex Parser 和 DOM extractor，但没有明确主实现和弃用计划。
10. 网络调用、Cookie 注入、错误转换、diagnostics 分散，缺少统一 `EhHttpClient`。
11. 搜索 `sequence` 递增但未真正用于丢弃过期响应，快速操作可能被旧请求覆盖。
12. 缓存没有容量、TTL、LRU、版本和手动清理策略。
13. Preview 并发失败只保留页码，缺少统一 `stage/message/stack`。
14. Account 网络验证串行时最坏可能等待较长时间；Ex 失败还可能修改用户当前站点偏好。
15. Safari bridge 仍和正式账号模块混合，且实验阶段曾把原始 Cookie 写入普通 JSON 桥文件。

### P2：工程治理与发布风险

16. 仓库无 `.github/workflows`、无可复现 package/lockfile、无有效 tests typings。
17. `tsconfig.test.json` 引用不存在的 `tests/scripting.d.ts`，且未覆盖全部模块。
18. PR Head 无 status checks，也没有 review 记录。
19. README 只有项目标题；旧 `bridge/HANDOFF.md` 与现状冲突。
20. `bridge/SCRIPTING_SETUP.md` 仍描述早期 Issue 评论和第一轮首页调试流程，已不是当前事实来源。
21. Source Sync 虽已“全部下载后再写入”，但写入失败仍可能半更新；远端删除文件不会清理本地旧副本。
22. Source Sync / diagnostics 使用硬编码分支，容易把开发事件和代码推到错误分支。
23. 每个文件单独 GitHub commit 会造成中间状态和大量噪声历史。
24. 尚无本地数据 schema/version/migration 设计，直接做 History 或 Downloads 会产生后续迁移债务。
25. 第三方许可未登记：EhViewer 代码不可直接随手复制；EhTagTranslation 数据有独立 CC-BY-NC-SA-3.0 条款。

## 5. PR #17 是否适合 merge

### 结论

**不适合原样 merge。**

这不是否定分支成果。分支中以下工作应保留：

- appV2 游客信息架构；
- SearchState / 分类掩码；
- Detail Core 先显示；
- Preview 后台并发；
- TagRef 原始搜索 URL；
- EhTagTranslation 接入；
- 最新 Reader 链路修复。

### 合并阻塞项

- GitHub 当前判定不可直接合并；
- 47 个文件中混有 35 个 runtime events 和 latest 镜像；
- PR 描述称“不改账号主线”，但入口迁移实际隐藏了账号操作；
- 首页筛选确认无效；
- 代码格式和 `any` 全局依赖不利于 Review；
- 无 CI、无 parser fixture、无稳定 TypeScript 基线；
- diagnostics 仍存在隐私泄漏风险。

### 建议处理方式

不要在原 PR 上无限追加修复提交。建议：

1. 从最新 `main` 新建 `fix/0.2.9-stabilization`；
2. 只移植 PR #17 的 `src/` 业务变更，不移植 runtime 事件差异；
3. 修复首页筛选与账号入口回归；
4. 格式化新文件，但不进行无关重构；
5. 完成 TypeScript 检查和最小真机 smoke test；
6. 新开一个干净的替代 PR；
7. 新 PR Review 通过后，关闭 PR #17，并在关闭说明中链接替代 PR。

## 6. 当前最应该优先修的 5 个问题

### 1. 建立 0.2.9 干净稳定化分支

目标：把源码价值从 runtime 噪声和历史试错中抽出来，得到可 Review、可回滚、可继续开发的基线。

### 2. Diagnostics 隐私与通道治理

目标：统一 sanitizer；不上传 Cookie、搜索词、完整 tag/g/s 路径、密码、token、完整 HTML；增加保留数量和清理策略；runtime 与功能 PR 分离。

### 3. 可复现 TypeScript 与 Parser 测试基线

目标：补齐真实 Scripting typings 或官方可引用 typings；覆盖全部源码；建立 list/detail/page/favorites/tag DB fixtures；新增最小 CI。

### 4. 收敛 Network / URL / Parser / Cache 边界

目标：借鉴 EhViewer 的 `EhUrl`、`ListUrlBuilder`、`EhEngine` 分层，但用适合 Scripting 的轻量 TypeScript 模块实现；不复制 Android 架构。

### 5. 完成 Account → Favorites 第一条登录功能纵切

目标：先恢复账号入口和站点状态，再把已有 Favorites 后端接入 UI、错误处理、缓存和真机验收；不要直接跳到 Downloads。

## 7. 与 EhViewer 的真实差距

### 7.1 已完成或方向正确

- Gallery List 基础浏览与搜索；
- `f_cats` 分类掩码和常用语言过滤；
- Detail 页面核心数据；
- Preview 首屏与后台分页；
- Tag 点击搜索和中文翻译基础；
- 基础 Reader 图片页解析；
- Keychain Cookie 登录后端；
- E/Ex 基础状态模型；
- Favorites 网络/Parser 初始后端；
- 真机 diagnostics；
- Source Sync 的“先下载、后覆盖”第一步修复。

### 7.2 仍缺少的核心能力

- 稳定账号 UI、登录状态刷新和站点切换；
- Favorites 完整 UI、分类、搜索、批量操作；
- Watched / Subscriptions；
- My Tags；
- Reader Session、预取、跳页、方向、恢复、错误重试；
- History、Reading Progress、Search History；
- Download Queue、暂停/继续、manifest、离线 Reader；
- Comments、Rating、Comment Vote；
- Torrent / Archive；
- Settings、Cache quota、清理、迁移；
- 自动化测试、CI、发布流程。

### 7.3 不值得 1:1 移植的 EhViewer 能力

以下应理解业务行为，不移植 Android 实现：

- Activity / Fragment / Scene 生命周期；
- Android `CookieManager` 与 OkHttp CookieStore 同进程同步；
- Android WebView 登录流程；
- Foreground `DownloadService`、通知渠道和长期后台下载；
- Android SAF、外部存储权限、媒体扫描；
- APK 更新器；
- 状态栏、导航栏、硬件音量键翻页等 Android 专属交互；
- H@H 客户端相关后台能力；
- 内置长期运行 Torrent 客户端；
- Room/GreenDAO/Parcelable 等 Android 数据实现细节。

### 7.4 值得做“简化实现”的能力

- Downloads：只承诺 Scripting 允许范围内的前台/短时队列和断点状态，不承诺 Android 后台服务等价体验；
- Torrent：展示种子列表、元信息、复制/打开链接，不内置持续做种客户端；
- Archive：展示可选档位和获取下载链接，明确额度和错误；
- My Tags：优先原生 Parser/API；若只能网页打开，明确标注外部 Safari，而不是伪装为完整内置功能；
- Settings：只实现会影响 Scripting 客户端行为的选项。

## 8. 方案需要补充的治理机制

### 8.1 三层事实来源

1. **代码事实**：GitHub 当前目标分支和 SHA；
2. **运行事实**：对应版本、设备、时间的真机诊断；
3. **完成事实**：验收矩阵全部通过。

代码存在不等于功能完成；单次真机成功也不等于完成回归。

### 8.2 每个任务必须带快照

任务开头记录：

- base branch / SHA；
- target branch；
- script version；
- 相关 runtime event 时间范围；
- 允许修改文件；
- 明确不修改范围。

### 8.3 ADR（Architecture Decision Record）

建议新增 `docs/adr/`，关键决定独立记录，例如：

- ADR-001：Cookie 只存 Keychain；
- ADR-002：Safari bridge 仅实验性；
- ADR-003：Detail Core 非阻塞加载；
- ADR-004：TagRef 保存原始 href；
- ADR-005：runtime events 与功能 PR 分离；
- ADR-006：本地数据 schema 和迁移策略。

### 8.4 Definition of Ready / Done

任务进入开发前必须具备接口、验收、真机步骤和不修改范围；任务完成必须同时满足静态检查、fixture、真机验收、diagnostics 安全和提交说明。

### 8.5 Scripting 能力矩阵

在 `docs/SCRIPTING_CAPABILITIES.md` 记录经过真机验证的能力：

- Keychain；
- FileManager 路径和作用域；
- WebView / Safari / Browser Script；
- GitHub API；
- HTTP timeout / response types；
- 图片和文件持久化；
- 后台执行限制；
- 可用 UI 组件和导航行为。

禁止 Agent 仅凭记忆猜 API。

### 8.6 第三方许可清单

新增 `THIRD_PARTY_NOTICES.md`，记录：

- 仅参考行为的上游项目；
- 直接复用的代码；
- 运行时下载的数据；
- 数据许可、署名、非商业和相同方式共享要求；
- 是否允许打包发布。

## 9. 建议的近期执行顺序

1. TASK-001：0.2.9 稳定化集成分支；
2. TASK-002：diagnostics sanitizer、retention、运行通道隔离；
3. TASK-003：TypeScript/fixtures/CI 基线；
4. TASK-004：统一 URL/Network/Parser 最小边界；
5. TASK-005：Account UI + Favorites 纵切；
6. 之后进入 Reader、History、Downloads 等 milestone。
