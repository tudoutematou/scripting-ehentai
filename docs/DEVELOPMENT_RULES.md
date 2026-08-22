# DEVELOPMENT_RULES.md

> 状态：已确认，作为当前项目开发与 Review 规则  
> 适用对象：ChatGPT 技术负责人、Scripting Agent、人工开发者、Reviewer

## 1. 核心原则

1. GitHub 当前目标分支源码是代码事实来源。
2. 历史聊天和旧文档只提供背景，不能覆盖当前源码。
3. 修改前先搜索已有实现，禁止重复造轮子。
4. 优先复用现有 `account`、network、parser、cache 和 domain model。
5. 不确定 Scripting API 时先查官方 docs 或当前 typings，禁止猜 API。
6. 代码写完不等于功能完成。
7. 每轮任务完成后停止，由技术负责人决定下一步。
8. 不为了“看起来更先进”引入复杂框架或无意义重构。
9. 任何高风险、不可逆或可能丢失用户数据的操作必须先说明风险并等待确认。
10. 任何 Cookie、密码、token 和用户内容都不得进入 GitHub diagnostics。

## 2. 角色分工

### 2.1 技术负责人 / ChatGPT

负责：

- 项目审计；
- 架构方向；
- Roadmap；
- 任务拆解；
- EhViewer 对标；
- PR Review；
- diagnostics 分析；
- 验收判断；
- 技术债排序；
- 合并/回滚建议。

默认不承担大量具体 UI 试错和主代码实现。

### 2.2 Scripting Agent

负责：

- 本地读取实际源码；
- 搜索已有实现；
- 查看 Scripting API/typings；
- 完成明确任务内的 TypeScript 实现；
- 本地静态检查；
- Parser fixture；
- 真机调试；
- 修复运行时错误；
- 按要求提交 GitHub。

### 2.3 用户

负责：

- 必要真机交互；
- 高风险操作确认；
- 提供无法自动获得的页面状态；
- 验收产品行为。

## 3. 任务开始前必须完成

每个任务开始前，Agent 必须输出或记录：

- 当前日期；
- repository；
- base branch；
- base SHA；
- target branch；
- script version；
- 相关 PR；
- 允许修改文件；
- 明确不修改文件/模块；
- 相关最新 runtime events；
- 相关 EhViewer 文件；
- 相关 Scripting docs/typings；
- 验收条件；
- rollback 方式。

如果目标分支或 SHA 已变化，必须先重新审查 diff，不能继续使用旧任务假设。

## 4. 修改前搜索规则

在新增函数、类型、Parser、网络请求、缓存或 UI 组件前，必须搜索：

1. 当前文件；
2. `src/` 全局；
3. 旧入口 `index.tsx`；
4. 新入口 `appV2.tsx`；
5. `account.ts`；
6. `ehentai.ts`；
7. `favorites.ts`；
8. `tourist.ts`；
9. `searchHtml.ts` / `detailHtml.ts` / `pure.ts` / `extractors.ts`；
10. 当前分支和 main 的差异。

搜索结果中已有等价能力时，应复用或迁移；不得复制一份改名后并存。

## 5. 不重复造轮子

禁止以下行为：

- 在 UI 事件中重新拼 E-Hentai URL；
- 为新页面重新写 Cookie header；
- 为同一 HTML 页面新增第二套未经说明的 Parser；
- 为单个功能创建另一个 Keychain schema；
- 为每个页面创建独立 diagnostics 结构；
- 重新实现已有缓存；
- 为方便绕过现有 domain model；
- 复制 EhViewer Android 类结构到 TypeScript。

允许新增实现的条件：

- 已证明现有实现不满足需求；
- 写明为什么不能复用；
- 有迁移/删除旧实现计划；
- 不造成长期双轨。

## 6. Scope Control

### 6.1 一轮任务只解决一组相关问题

例如：

- “恢复账号入口并稳定 AccountState”可以是一轮；
- “同时重写 Reader、Favorites、Source Sync”不可以是一轮。

### 6.2 禁止顺手重构

除非任务明确要求，不得：

- 改名大量文件；
- 全局换 UI 风格；
- 更换状态管理方案；
- 重写全部 Parser；
- 更换存储格式；
- 修改无关网络接口；
- 删除历史分支；
- 修改 main。

### 6.3 发现无关问题

记录到任务结果的 `Follow-up`，不要顺手修改。

## 7. 架构边界

### 7.1 UI / Presentation

UI 可以：

- 读取 typed state；
- 触发 use case；
- 显示 loading/success/error；
- 处理导航。

UI 不可以：

- 直接读取 Keychain；
- 直接拼 Cookie；
- 直接解析 HTML；
- 直接写 diagnostics JSON；
- 直接操作 GitHub Source Sync；
- 随手持久化业务数据。

### 7.2 Application / Use Case

Use Case 负责：

- 业务流程；
- 调用 service；
- 组合结果；
- 决定缓存失效；
- 映射业务错误；
- 产生可显示状态。

### 7.3 Network

所有 E-Hentai/ExHentai 请求逐步收敛到统一 client：

- host/site；
- Cookie；
- referer/origin；
- timeout；
- cancellation；
- retry；
- status/error；
- diagnostics。

写操作默认不自动重试。

### 7.4 URL Builder

所有 endpoint 和 query 参数集中管理。

禁止在 Scene 中手写：

- `f_cats`；
- `f_search`；
- gallery detail；
- image page；
- favorites；
- watched；
- archive；
- torrent；
- comment/rating API。

页面提供原始 href 时优先保存并使用原始 href。

### 7.5 Parser

Parser 必须：

- 输入明确；
- 输出 typed result；
- 无网络；
- 无 UI；
- 无 Keychain；
- 无 GitHub；
- 无隐藏全局状态；
- 错误可判断；
- 有 fixture。

### 7.6 Storage

- 敏感凭证：Keychain；
- 用户历史/进度/下载：版本化 LocalStore；
- 可再生成数据：Cache；
- 源码：Source Sync 目录；
- diagnostics：独立通道。

这些目录不得混用。

## 8. Cookie 与安全

### 8.1 允许保存

Keychain 中允许保存：

- `ipb_member_id`；
- `ipb_pass_hash`；
- `igneous`；
- 其他经技术负责人确认的必要敏感值。

### 8.2 永久禁止进入 diagnostics

- Cookie value；
- Cookie header；
- Authorization；
- GitHub token；
- 密码；
- 原始登录输入；
- API secret；
- 完整账户信息；
- 完整 HTML；
- 评论正文；
- 搜索词；
- 完整 `/tag/`、`/g/`、`/s/` 路径；
- gallery token / page token。

### 8.3 统一 Sanitizer

所有 diagnostics 字段必须经过统一 sanitizer，包括：

- `request.url`；
- `message`；
- `stack`；
- `notes`；
- 自定义 metrics；
- 第三方异常文本。

禁止只清理 URL，而让 token 通过 message 或 stack 泄漏。

### 8.4 本地登录状态

`loggedIn` 只由本地核心 Cookie 是否存在决定。

网络验证失败：

- 不得清除 Cookie；
- 不得覆盖 `loggedIn`；
- 不得擅自切换 activeSite；
- 应单独更新 reachability/error。

## 9. Diagnostics 规则

### 9.1 必须记录

失败事件至少记录：

- `time`；
- `scriptVersion`；
- `commit`（可获得时）；
- `stage`；
- `ok`；
- `error.name`；
- `error.message`；
- `error.stack`（脱敏后）；
- HTTP status（如有）；
- duration；
- 必要的无敏感 metrics。

### 9.2 不得记录

见 Cookie 与安全章节。

### 9.3 Stage 命名

使用稳定的层级名称，例如：

```text
startup
account.local-state
account.validate.e
account.validate.ex
gallery.list.fetch
gallery.list.parse
gallery.detail.core
gallery.detail.previews
reader.page.resolve
reader.image.fetch
favorites.list
favorites.mutate
storage.migrate
source-sync.download
source-sync.apply
```

禁止随意创造无法聚合的随机 stage。

### 9.4 Events 与 latest

- `runtime/events` 是事实记录；
- `runtime/latest.json` 只是便利镜像；
- 分析失败优先按版本和时间读取 events；
- latest 不得覆盖历史证据。

### 9.5 Retention

应设置：

- 最大事件数量；或
- 最大保留天数；或
- 每个版本最多 N 条成功事件，失败事件单独保留。

功能 PR 不得混入大量 runtime event 文件。

## 10. Source Sync 规则

### 10.1 禁止边下载边覆盖

正确流程：

1. 获取 manifest；
2. 下载全部文件到 staging；
3. 校验文件 path、size、hash；
4. 全部成功后备份当前源码；
5. 统一替换；
6. 清理 manifest 中已删除的旧文件；
7. 任一步失败 rollback。

### 10.2 防止路径问题

- 禁止 `../`；
- 禁止绝对路径；
- 限制到允许的源码根目录；
- 跳过 cache、runtime、用户数据和二进制临时文件。

### 10.3 GitHub 写入

- 不进行每个文件一个永久中间状态的无计划推送；
- 能批量提交时使用单一原子提交；
- 不能批量时必须有 manifest 和恢复策略；
- 不得把开发分支硬编码后忘记恢复；
- 推送前比较 SHA，防止覆盖他人更新。

## 11. Cache 规则

每个 cache 必须定义：

- key；
- value；
- 最大容量；
- TTL；
- 命中策略；
- 失效条件；
- 写失败行为；
- 清理方式；
- 是否含敏感信息。

禁止无限增长的 `Map` 或缓存目录。

写操作后必须失效相关读 cache，例如 Favorites mutation 后失效 Favorites list。

## 12. 本地数据与迁移

History、Progress、Downloads、Settings 进入开发前必须先定义：

- `schemaVersion`；
- 数据模型；
- 原子写入；
- 备份；
- migration；
- corruption recovery；
- 清理；
- 用户数据和 cache 的边界。

禁止在多个页面各自维护 JSON 文件而没有统一 schema。

## 13. EhViewer 对标规则

### 13.1 必须做

开发新功能前：

1. 搜索对应 EhViewer Scene/Activity；
2. 搜索 `EhEngine` endpoint；
3. 搜索 `EhUrl` / URL Builder；
4. 搜索对应 Parser 和 data model；
5. 核对当前 E-Hentai 页面/endpoint；
6. 再设计 Scripting 版本。

### 13.2 禁止做

- 不复制 Android 生命周期；
- 不复制 CookieManager 假设；
- 不复制 Foreground Service；
- 不复制 Parcelable/DAO/Room 细节；
- 不直接粘贴 GPL 代码而不做许可评估；
- 不把 EhViewer 的当前实现当作 E-Hentai 永久协议。

### 13.3 参考结果必须写入任务

任务单中列出：

- 参考文件；
- 参考的业务行为；
- 不移植的 Android 部分；
- 当前网页验证结果。

## 14. Scripting API 规则

不确定以下内容时必须查 docs/typings：

- NavigationStack；
- FileManager 作用域；
- Keychain；
- WebView；
- Safari Browser Script；
- GitHub API；
- HTTP request/response；
- 图片加载和二进制写入；
- 后台任务；
- UI 生命周期。

禁止：

- 凭记忆写 API；
- 用大量 `declare const ...: any` 掩盖不确定性；
- 为通过 TypeScript 随意扩充 fake typings；
- 只在模拟环境通过而不真机验证。

若官方 docs 与真机行为冲突，以真机最小复现为准，并记录到 `docs/SCRIPTING_CAPABILITIES.md`。

## 15. TypeScript 和代码质量

### 15.1 必须通过

- TypeScript check；
- 所有目标文件纳入检查；
- 不新增未解释 `any`；
- 无未使用的临时兼容变量；
- 无整文件一行；
- 无 Cookie/Token 硬编码；
- 无被注释掉的大块旧实现。

### 15.2 格式

- 保持可 Review；
- 函数职责单一；
- 错误路径明确；
- 避免深层嵌套；
- 避免复制 helper；
- 注释解释“为什么”，不复述代码。

### 15.3 不为了数字拆文件

文件拆分由职责决定，不追求固定行数。小项目也不应创建几十个只有一两个函数的抽象层。

## 16. Parser Fixture 规则

关键 HTML Parser 必须有脱敏 fixture。

Fixture 不得包含：

- Cookie；
- 登录账户；
- 用户评论正文；
- 私密 gallery token；
- 完整敏感页面。

Fixture 应保留最小必要结构，并覆盖：

- 正常；
- 空结果；
- 缺字段；
- 登录失效；
- 页面变化；
- Cloudflare/Sad Panda；
- 多页；
- 特殊编码。

Parser 变更必须更新或新增 fixture，而不是只靠真机点击。

## 17. 错误处理

### 17.1 统一错误类型

建议逐步统一：

```ts
type AppError =
  | NetworkError
  | HttpError
  | AuthRequiredError
  | ParseError
  | CancelledError
  | StorageError
  | CapabilityError;
```

### 17.2 取消不是失败

用户离开页面或新请求替代旧请求时，取消事件不得显示为错误弹窗，也不得污染失败统计。

### 17.3 写操作

Favorites、Comments、Rating、Archive 等写操作：

- 禁止盲目自动重试；
- 禁止重复点击；
- 结果不确定时要求刷新确认；
- diagnostics 不记录用户正文。

### 17.4 Parser 失败

记录：

- stage；
- parser name/version；
- status；
- body length；
- marker presence；
- 脱敏 stack。

不上传完整 HTML。

## 18. 并发与竞态

- 新请求开始时取消旧请求，或使用 request id 丢弃过期结果；
- 仅递增 `sequence` 但不检查无效；
- 页面销毁后不得更新 UI；
- Preview/Reader 并发必须有上限；
- 同一 cache key 的并发请求应去重；
- 用户快速返回/重进必须保持状态一致。

## 19. 真机验证

### 19.1 代码完成后必须真机

关键功能至少验证：

- iPhone；
- iPad（影响布局/导航时）；
- E-Hentai；
- ExHentai（相关功能）；
- 游客；
- 登录；
- 正常网络；
- 网络失败；
- 返回/重进；
- 冷启动。

### 19.2 测试证据

证据包括：

- 版本；
- commit；
- 设备类别；
- 步骤；
- 结果；
- 脱敏 diagnostics event id；
- 截图（不含敏感信息，必要时）。

### 19.3 不允许的完成表述

禁止仅写：

- “应该可以”；
- “TypeScript 没报错”；
- “逻辑看起来正确”；
- “EhViewer 就是这样”；
- “已提交”。

## 20. 功能状态定义

### ✅ 完成

必须同时满足：

- 代码已实现；
- TypeScript 通过；
- fixtures 通过；
- 真机通过；
- diagnostics 安全；
- 文档同步；
- Review 通过。

### 🟡 已实现待验证

代码存在，但缺 fixture、真机、边界或 UI 集成。

### ⚠️ Bug / 回归

有明确失败证据、错误代码或风险。

### ❌ 未实现

没有可用业务实现。

### 🧪 Experimental

不承诺稳定性，不得作为核心流程依赖。

## 21. Git 和 PR 规则

### 21.1 分支

- 不直接在 `main` 开发；
- 分支名反映单一目的；
- 任务开始前从最新 base 建立；
- 不在旧实验分支持续堆叠所有功能。

### 21.2 Commit

Commit 应：

- 单一目的；
- 描述行为；
- 不包含 Cookie/runtime 噪声；
- 不混入格式化整个仓库；
- 不包含生成 cache；
- 可以独立回滚。

### 21.3 PR

PR 描述必须与实际 diff 一致。

必须写：

- 背景；
- 目标；
- 不修改范围；
- 架构影响；
- 文件变化；
- 测试；
- 真机；
- 风险；
- rollback；
- Follow-up。

### 21.4 PR 不得包含

- 大量 runtime event；
- Cookie；
- cache；
- 本地用户数据；
- 不相关重构；
- 无解释的生成文件；
- 旧方案残留副本。

## 22. Review Checklist

Reviewer 必须检查：

- [ ] PR 基于正确 SHA；
- [ ] PR 描述和 diff 一致；
- [ ] 未重复实现；
- [ ] UI 无直连 Cookie/HTML；
- [ ] Network/Parser 边界清晰；
- [ ] 错误可诊断；
- [ ] diagnostics 已脱敏；
- [ ] 无完整 URL token；
- [ ] cache 有边界；
- [ ] 并发可取消/去重；
- [ ] 写操作无盲重试；
- [ ] TypeScript/fixtures 通过；
- [ ] 真机步骤完整；
- [ ] 旧方案已删除或明确 deprecated；
- [ ] 文档更新；
- [ ] 第三方许可检查；
- [ ] rollback 可行。

## 23. Definition of Ready

任务可以交给 Scripting Agent 前必须有：

- 背景；
- 明确目标；
- 不修改什么；
- 参考 EhViewer 文件；
- 当前需检查文件；
- 数据模型；
- 网络 API；
- UI；
- 错误处理；
- 缓存；
- 安全；
- diagnostics；
- TypeScript 要求；
- 真机测试步骤；
- 提交要求；
- 完成定义；
- rollback。

缺少关键内容时，由技术负责人补齐，不让 Agent 猜产品方向。

## 24. Definition of Done

任务只有同时满足以下条件才完成：

- [ ] 目标行为实现；
- [ ] 未修改禁止范围；
- [ ] 旧重复实现已处理；
- [ ] TypeScript check 通过；
- [ ] Parser fixtures 通过；
- [ ] 真机验证通过；
- [ ] 错误路径验证；
- [ ] diagnostics 无敏感信息；
- [ ] cache/storage 有边界；
- [ ] PR 可 Review；
- [ ] 文档同步；
- [ ] rollback 已说明；
- [ ] Agent 已停止，没有自动开始下一模块。

## 25. 第三方代码和数据

### 25.1 EhViewer

- 主要用于业务行为和 endpoint 对标；
- 不直接粘贴代码，除非完成 GPL 等许可兼容评估；
- 任何直接复用必须记录来源、文件、commit 和许可。

### 25.2 EhTagTranslation

- 代码和数据许可不同；
- 数据包含 CC-BY-NC-SA-3.0 条款；
- 运行时下载、缓存和打包发布必须分别评估；
- 必须保留 attribution 和第三方清单；
- 未确认前不要把完整数据库直接提交到项目仓库。

## 26. Deprecated 规则

废弃方案处理方式：

1. 在文档中写明原因；
2. 从主流程移除；
3. 若保留实验入口，放入 `experimental/` 或显式 feature flag；
4. 禁止新代码依赖；
5. 确认无引用后删除；
6. 不保留大块注释代码作为“备份”，Git 历史已经是备份。

当前明确 Deprecated/Experimental：

- Embedded WebView 登录；
- Safari FileManager Bridge 主登录；
- 普通 JSON 长期保存 Cookie；
- 阻塞式 Detail；
- string-only Tag；
- 大量手工标签字典；
- latest-only diagnostics；
- 边下载边覆盖 Source Sync。

## 27. Agent 完成报告模板

```md
# Task Result

## Snapshot
- Base:
- Base SHA:
- Branch:
- Head SHA:
- Script version:

## Changed
- ...

## Not Changed
- ...

## Reused Existing Code
- ...

## TypeScript
- Command/check:
- Result:

## Fixtures
- Result:

## Device Tests
- Device:
- Steps:
- Result:

## Diagnostics
- Event ids:
- Sanitization check:

## Known Limitations
- ...

## Follow-up
- ...

## Rollback
- ...
```

报告完成后停止，等待技术负责人 Review。
