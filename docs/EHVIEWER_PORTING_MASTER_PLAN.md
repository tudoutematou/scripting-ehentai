# EhViewer → Scripting 完整功能移植总计划

> 状态：长期主规格（Master Specification）  
> 参考实现：`xiaojieonly/Ehviewer_CN_SXJ` / `BiLi_PC_Gamer`（审阅基线：V2.1.4.0，2026-08-14）  
> 目标项目：`tudoutematou/scripting-ehentai`  
> 平台：iPhone / iPad 的 Scripting App  
> 目标：在 Scripting 能力边界内实现一个真正可长期使用的 E-Hentai / ExHentai 原生客户端，而不是网页壳。

---

## 1. 这份文档解决什么问题

从本文件生效开始，项目不再采用“一个小改动 → 停止 → 用户测试 → 再改一个小点”的开发节奏。

本文件一次性定义：

- EhViewer 的主要用户功能；
- Scripting 版本需要实现的对应能力；
- Android 专属能力如何改造或明确不移植；
- 当前完成度；
- 功能依赖和开发顺序；
- Scripting Agent 的自主开发、自测、自修规则；
- ChatGPT 技术负责人的 Review 边界；
- 用户只需要参与的里程碑验收。

项目后续以“功能包 / Milestone”为最小交付单位，不以单个按钮、单个 API、单个报错为交付单位。

---

## 2. 新的开发职责

### 2.1 Scripting Agent：主要实现者，也是第一运行时调试者

Scripting Agent 与真实 Scripting 环境最近，因此默认拥有运行时问题的第一判断权。

一个功能包开始后，Agent 应连续完成：

1. 阅读本总计划、当前目标分支和相关 EhViewer 源码；
2. 搜索项目已有实现，禁止重复造轮子；
3. 查当前 Scripting typings / 官方 API；
4. 完成功能实现；
5. 自己运行 diagnostics / parser fixture / 本地运行；
6. 在可操作的实际 Scripting 环境中自行测试；
7. 出现普通编译、运行、布局、网络或解析错误时自行定位并修复；
8. 在同一个功能包内允许多轮自修，不需要每个小修复都向用户或技术负责人申请；
9. 完成功能包后统一上传并输出一次报告。

**普通 bug 不是“硬阻塞”。** Agent 不得因为一个圆角、一个 timeout、一个组件报错、一个请求失败就立即停止并把测试工作转交给用户。

只有以下情况才需要中途上报：

- 需要用户输入真实账号凭据、Cookie、验证码或系统权限；
- 需要用户做只有人能判断的视觉、手势、主观体验确认；
- Scripting 平台能力不确定，且查 typings/docs + 真机最小复现后仍无法判断；
- 涉及删除/迁移用户数据等不可逆操作；
- 参考 EhViewer 与当前 E-Hentai 行为冲突，需要产品决策；
- 同一问题经过实质性定位仍无法继续，而不是仅仅第一次运行失败。

### 2.2 ChatGPT：技术负责人，不做远程“逐像素驾驶”

负责：

- 完整功能规格和优先级；
- 架构与数据契约；
- 对照 EhViewer 的业务语义；
- 每个 Milestone / 功能包的范围；
- 远端 GitHub diff / PR Review；
- 安全、隐私、数据迁移、兼容性检查；
- 发现架构性问题时退回功能包；
- 决定下一功能包。

默认不再：

- 为 Agent 每一个运行时报错逐步下指令；
- 每个小改动后要求用户重新跑完整 Smoke；
- 把本地 runner 与真实 iOS Scripting 行为混为一谈；
- 在 Agent 已能直接观察真机运行环境时替它猜 UI 行为。

### 2.3 用户：产品验收者，而不是人工测试机器人

用户默认只参与：

- Milestone 完成后的整体验收；
- 登录/Cookie/验证码等需要本人操作的流程；
- 真机手势、视觉、阅读体验；
- iOS 前后台、文件分享等必须真人触发的系统交互；
- 高风险操作确认。

**目标：一个 Milestone 原则上只需要一次用户集中验收，而不是每个小功能一次。**

---

## 3. 状态标记

- ✅ DONE：已有可工作的用户功能，后续只做正常维护。
- 🟡 PARTIAL：已有核心能力，但 UI、错误处理、持久化或完整语义尚未完成。
- ⬜ TODO：尚未开发。
- 🔧 ADAPT：EhViewer 有该能力，但 Scripting 需要按 iOS 能力重新设计。
- 🚫 N/A：Android 专属或不适合 Scripting，不做 1:1 移植。

状态必须以当前目标分支源码为准，不以旧聊天记录为准。

---

## 4. 完整功能地图

### 4.1 基础设施与应用壳

| 功能 | EhViewer 语义 | Scripting 目标 | 当前 |
|---|---|---|---|
| 应用导航 | GalleryList / Detail / Reader / Account 等 Scene | 原生 NavigationStack 多页面客户端 | 🟡 |
| E-Hentai / ExHentai | 双站点、登录后 Ex 可用性 | activeSite 与 reachability 分离 | ✅ |
| 统一网络层 | EhEngine / CookieStore | EhHttpClient：Cookie、Referer、timeout、错误映射 | 🟡 |
| URL Builder | EhUrl / ListUrlBuilder | endpoint/query 集中构造 | 🟡 |
| HTML Parser | 多页面解析 | fetch → pure parser → typed model | 🟡 |
| Keychain | 登录 Cookie | `ipb_member_id` / `ipb_pass_hash` / `igneous` | ✅ |
| 本地业务存储 | DB / preferences | versioned LocalStore + atomic write | ⬜ |
| 图片缓存 | 图片缓存 | 有界缓存、清理、失败恢复 | 🟡 |
| Diagnostics | 错误信息 | 本地脱敏诊断，不泄露 token/Cookie | ✅ |
| 标签翻译库 | EhTagDatabase | EhTagTranslation runtime cache / 更新 | 🟡 |
| Settings 基础 | Preferences | 统一 settings schema | ⬜ |

### 4.2 首页、浏览与搜索

需要完整覆盖：

- ✅ / 🟡 首页最新画廊列表；
- ✅ 普通关键词搜索；
- ✅ 十大分类过滤：Misc / Doujinshi / Manga / Artist CG / Game CG / Image Set / Cosplay / Asian Porn / Non-H / Western；
- ✅ 中文 / 日文 / 英文 / 翻译本 / 无对白等快捷语言筛选；
- 🟡 高级搜索；
- ✅ 上一页 / 下一页；
- ✅ raw tag href 直接标签检索，不把标签退化为纯字符串；
- 🟡 中文标签显示；
- ⬜ uploader 搜索 / 可点击作者入口；
- ⬜ 搜索历史；
- ⬜ 收藏搜索 / watched 等特殊列表模式；
- ⬜ 多标签 AND / OR 组合检索；
- ⬜ Toplists / 排行入口（若当前 EhViewer/E-Hentai 支持）；
- ⬜ 图片搜索（高级可选功能，后置）。

完成定义：用户可以从 Home、关键词、分类、语言、标签、作者等主要入口稳定进入 GalleryList，并保持分页与搜索状态。

### 4.3 Gallery Detail / 画廊详情

需要完整覆盖：

- ✅ Core-first：标题/封面/metadata/tag 先显示，不能等待全部 preview；
- ✅ 标题 / 日文标题；
- ✅ 分类 / uploader / 页数 / 发布时间等 metadata；
- ✅ 评分展示；
- ✅ 标签分组、本地化、raw tag navigation；
- ✅ Preview 分页后台补齐；
- 🟡 Preview 图片加载与缓存；
- ⬜ 收藏 / 修改收藏分类 / 取消收藏；
- ⬜ 收藏备注；
- ⬜ 提交评分 / 修改评分；
- ⬜ 评论列表；
- ⬜ 发表评论；
- ⬜ 编辑/删除自己的评论（当前站点允许时）；
- ⬜ Torrent 列表与 `.torrent` 文件获取；
- ⬜ Archive 下载选项 / 原生归档下载；
- ⬜ 父版本 / 子版本 / 新版本等关联入口（站点存在时）；
- ⬜ 分享 / 浏览器打开等辅助操作。

### 4.4 Reader / 阅读器

需要完整覆盖：

- ✅ 图片页解析；
- ✅ 当前页 / 总页数；
- ✅ 上一页 / 下一页；
- 🟡 图片本体受控下载与缓存；
- 🟡 Reader 请求优先级高于缩略图；
- ⬜ 跳转指定页；
- ⬜ 加载失败一键重试；
- ⬜ 前后页预取；
- ⬜ 自动保存阅读进度；
- ⬜ 再次打开自动续读；
- ⬜ 重置阅读进度；
- ⬜ 原图 / 重采样图策略；
- ⬜ fit width / fit screen 等显示模式；
- ⬜ 阅读方向 / 单页或连续模式（以 Scripting 可实现能力为准）；
- 🔧 缩放 / 手势：按 Scripting 原生能力适配，不复制 Android GL 手势实现；
- ⬜ 保存图片 / 分享图片（平台允许时）；
- ⬜ 离线 Reader。

### 4.5 Account / 登录与账号

- ✅ 手工 Cookie 导入；
- ✅ Keychain 保存；
- ✅ `loggedIn` 只由本地核心 Cookie 决定；
- ✅ E-Hentai reachability 与 Ex availability 独立；
- ✅ E / Ex 切换；
- ✅ 刷新状态；
- ✅ 退出；
- 🔧 Safari 登录桥：Experimental，不作为核心登录路径；
- ⬜ 账号信息 / image limits 等有价值信息（若 endpoint 稳定）。

### 4.6 Favorites / 收藏夹

EhViewer 的 Favorites 是第一批高优先级用户功能。

Scripting 需要：

- 🟡 Favorites 后端：读取收藏页、10 个分类、mutation 已存在基础实现；
- ⬜ FavoritesScene 原生 UI；
- ⬜ 10 个分类切换；
- ⬜ 收藏分页；
- ⬜ 从 Detail 添加收藏；
- ⬜ 修改收藏分类；
- ⬜ 取消收藏；
- ⬜ 收藏备注（最多按当前站点限制）；
- ⬜ mutation 后正确失效 list/detail cache；
- ⬜ 空状态、未登录状态、网络失败状态；
- ⬜ 收藏搜索（若当前 endpoint 支持）。

### 4.7 Watched / 关注

- ⬜ Watched Gallery 列表；
- ⬜ 分页 / 刷新；
- ⬜ 从 watched 项进入 Detail；
- ⬜ 与 My Tags / watched tag 规则联动；
- 🔧 Android 后台通知不做 1:1 移植；可在打开页面时刷新。

### 4.8 My Tags / 我的标签

- ⬜ 读取当前账号的 My Tags；
- ⬜ watched / hidden 等语义；
- ⬜ 权重 /颜色 /分组等当前站点仍支持的字段；
- ⬜ 修改并提交；
- ⬜ 与搜索/Watched 联动；
- 🔧 EhViewer Android WebView CookieManager 流程不照搬，优先使用已有 Cookie 网络层或最小受控 WebView。

### 4.9 History / 阅读历史与进度

必须作为本地一级业务数据实现，而不是临时 cache。

- ⬜ Gallery 阅读历史；
- ⬜ 最近打开时间；
- ⬜ 当前页 / 总页数；
- ⬜ Reader 自动保存；
- ⬜ Detail/List 显示进度；
- ⬜ 续读；
- ⬜ 重置单本进度；
- ⬜ 删除单条历史；
- ⬜ 清空历史；
- ⬜ schemaVersion + migration + corruption recovery；
- ⬜ 可选搜索 / 排序。

### 4.10 Downloads / 离线下载

这是大功能包，Scripting 版按 iOS/Scripting 生命周期重新设计。

- ⬜ 下载任务模型；
- ⬜ Gallery 下载队列；
- ⬜ 最大并发设置；
- ⬜ 开始 / 暂停 / 恢复 / 取消 / 重试；
- ⬜ 每页下载状态与总体进度；
- ⬜ 中断后恢复；
- ⬜ gallery manifest；
- ⬜ 元数据 / tags / artists / 页数；
- ⬜ 已下载页精确计数；
- ⬜ 离线库列表；
- ⬜ 离线进入 Detail / Reader；
- ⬜ 删除下载 / 清理孤儿文件；
- ⬜ 下载设置；
- ⬜ 可选“边下载边阅读”。

限制：

- 🔧 允许前台或 Scripting 能力允许的有限生命周期队列；
- 🚫 不宣称 Android Foreground Service 等价后台持续下载；
- 🚫 不移植 Android 通知服务实现；
- 🚫 不复制 Android 存储权限/SAF 结构。

### 4.11 Comments / Rating

- ⬜ 评论列表；
- ⬜ 分页/更多评论（站点需要时）；
- ⬜ 发表评论；
- ⬜ 编辑自己的评论；
- ⬜ 删除自己的评论；
- ⬜ 登录状态 gating；
- ⬜ 提交评分；
- ⬜ 更新已有评分；
- ⬜ 写操作错误必须显式反馈，默认不自动重试。

### 4.12 Torrent / Archive

- ⬜ Torrent 元信息 / 列表；
- ⬜ 获取 `.torrent` 文件并通过 iOS 分享/文件流程交给外部客户端；
- ⬜ Archive 选项；
- ⬜ Archive 下载；
- ⬜ 下载进度 / 失败提示；
- 🚫 不内置完整 BT 下载引擎；
- 🚫 不移植 H@H 客户端。

### 4.13 Settings / Cache / 数据维护

- ⬜ SettingsScene；
- ⬜ 默认 E/Ex；
- ⬜ 图片请求并发/timeout（高级设置）；
- ⬜ Reader 习惯；
- ⬜ 下载并发；
- ⬜ 缓存大小统计；
- ⬜ 清理图片缓存；
- ⬜ 清理临时文件；
- ⬜ EhTagTranslation 状态与手动刷新；
- ⬜ diagnostics 开关 / 导出脱敏诊断；
- ⬜ 历史/下载等用户数据的独立清理入口；
- ⬜ settings schemaVersion。

### 4.14 EhViewer 新版增强能力（后置）

根据当前 EhViewer 新版功能方向，后续评估：

- ⬜ 多标签 AND / OR；
- ⬜ 我的画廊 / My Galleries；
- ⬜ 图片搜索 / 图像识别入口；
- ⬜ 下载列表展示更完整 tags / artists / page count / downloaded count；
- ⬜ 长按重置阅读进度等快捷交互；
- ⬜ 更丰富的阅读器 UX；
- 🔧 Android 专属通知/窗口效果只迁移业务价值，不复制平台实现。

---

## 5. 明确不做 1:1 移植的 Android 能力

以下不是“功能缺失”，而是平台适配：

- 🚫 Android Activity / Fragment / Scene 生命周期；
- 🚫 Android CookieManager + 内嵌 WebView 登录假设；
- 🚫 Foreground Service；
- 🚫 Android notification channel；
- 🚫 Room / Parcelable / DAO 具体实现；
- 🚫 Android SAF / 权限系统；
- 🚫 APK 自更新 / 安装；
- 🚫 H@H 客户端；
- 🚫 内置完整 Torrent Engine；
- 🚫 OpenGL/Android 专属 Reader 手势实现。

我们迁移的是**用户业务能力和数据语义**，不是 Android 类结构。

---

## 6. Milestone 开发顺序

### 0.2.9 — Stabilization Baseline

当前 PR #19。目标只是形成可继续开发的稳定基线。除真正阻断后续开发的问题外，不再无限循环微修。

### 0.3 — Library（下一功能包，最高优先级）

一次连续开发完成：

1. FavoritesScene；
2. Favorites 10 分类 / 分页；
3. Detail 收藏 / 移动 / 取消 / 备注；
4. HistoryScene；
5. ReadingProgress 数据模型与持久化；
6. Reader 自动保存进度 / 自动续读；
7. 重置 / 删除历史。

Agent 自己完成开发、自测、自修后，统一提交。用户只做一次 0.3 里程碑体验验收。

### 0.4 — Interaction

一次连续开发：

- 评论列表；
- 发表评论；
- 编辑/删除自己的评论；
- Rating；
- Torrent 列表 / 文件获取；
- Archive 选项 / 下载。

### 0.5 — Account Lists & Search Power

- Watched；
- My Tags；
- uploader 搜索；
- 搜索历史；
- 多标签 AND / OR；
- 其他账号列表能力。

### 0.6 — Offline Library

- 下载队列；
- pause/resume/retry；
- manifest；
- 精确页进度；
- 离线库；
- Offline Reader；
- 删除/清理/恢复。

### 0.7 — Reader & UX

- jump；
- prefetch；
- retry；
- 原图策略；
- fit/layout/direction；
- 缓存设置；
- 分享/保存；
- iPad 布局优化。

### 0.8+ — Advanced

- Toplists；
- My Galleries；
- 图片搜索；
- 其它新版 EhViewer 有价值且 Scripting 可实现的增强。

### 1.0 RC

完整回归、数据迁移验证、隐私检查、License/third-party attribution、文档与发布准备。

---

## 7. 功能包的自测标准

Agent 不需要为每个子项停下来等用户。

每个功能包内部自行循环：

`实现 → diagnostics → fixture/静态检查 → 实际运行 → 修复 → 再运行 → 下一子项`

功能包完成前至少覆盖：

- happy path；
- 未登录；
- HTTP 非 2xx；
- timeout / 取消；
- 空数据；
- parser 缺字段；
- 重启后的持久化；
- 写操作后的 cache invalidation；
- Cookie/token/URL diagnostics 隐私；
- 与本功能包直接相关的已有功能回归。

**不要求每新增一个按钮就跑全项目回归。**

推荐节奏：

- 子功能：Agent 自测；
- 3–6 个相关子功能形成一个功能包：Agent 做一次集成回归；
- Milestone：用户做一次集中真机验收；
- Release：做完整回归。

---

## 8. Agent 功能包完成报告格式

功能包完成后一次性报告：

```text
Milestone / 功能包：
目标分支 / Head SHA：

Completed:
- ...

Self-tested by Scripting Agent:
- diagnostics: ...
- runtime: ...
- fixtures: ...
- persistence: ...
- network/error paths: ...

Regression checked:
- ...

Privacy:
- ...

Known remaining issues:
- ...

Human-only acceptance needed:
- 仅列真正必须用户操作的 2~5 项，不得把普通调试转嫁给用户。
```

如果没有硬阻塞，Agent 完成一个功能包后才停止等待 Review。

---

## 9. 数据、安全与长期约束

任何 Milestone 都不能为了开发速度破坏以下底线：

- Cookie/password/token 只进 Keychain 或受控内存；
- diagnostics 永不记录 Cookie value、完整敏感 URL、gallery/page token、搜索词、评论正文；
- History / Progress / Downloads / Settings 必须有 `schemaVersion`；
- 用户数据与 cache 分开；
- 用户数据写入需要原子化/恢复策略；
- 写操作默认不自动重试；
- Detail 继续 Core-first，不得退回“等全部 preview 再显示”；
- TagRef 保留 namespace/raw/searchUrl，不退化为 `string[]`；
- `loggedIn / eHentaiReachable / exAvailable` 保持分离；
- 不把 full EhTagTranslation DB 直接硬塞进源码包；
- 功能 PR 不提交 runtime event 噪音；
- 不因为单文件 diagnostics 的环境缺失而堆大量 `any` / fake typings。

---

## 10. 当前项目大致状态（2026-08-23）

当前已经不是“什么都没有”的原型：Home / Search / Filter / Detail / Preview / Reader / Account / TagTranslation 的主链路已经存在；0.2.9 主要在稳定这些基础。

但离完整 EhViewer 体验仍有明显距离，用户价值最高、尚缺的部分集中在：

1. Favorites UI + Detail 收藏动作；
2. History + Reading Progress；
3. Comments / Rating；
4. Watched / My Tags；
5. Downloads / Offline；
6. Torrent / Archive；
7. Reader 完整体验；
8. Settings / Cache 管理。

因此从 0.3 开始，衡量进度的核心指标改为：**完成了多少完整用户功能包，而不是关闭了多少小 bug。**

---

## 11. 下一步固定指令

当 0.2.9 被确定为开发基线后，技术负责人应直接创建/指定 `0.3 Library` 功能分支与任务。

Scripting Agent 获得任务后：

- 不为普通运行时报错停下来询问；
- 不要求用户逐项做开发期测试；
- 连续完成 Favorites + History + Progress 功能包；
- 自己测试、自己修复；
- 一次性上传；
- 等待技术负责人 Review；
- 通过后再由用户做一次集中真机体验验收。

这份规则优先于此前“每轮小任务完成后立即停止”的旧节奏。