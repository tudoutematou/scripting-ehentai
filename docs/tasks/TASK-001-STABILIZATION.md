# TASK-001 — 建立 0.2.9 稳定化集成分支

> 类型：Stabilization / Integration  
> 优先级：P0  
> 本任务不新增 Favorites、History、Downloads 等业务能力。  
> 执行者：Scripting App 内置 AI Agent  
> Review：ChatGPT 技术负责人 + 用户真机验收

## 1. 背景

当前 `main` 仍为 0.2.8 单体入口；`feat/tourist-home-search-ui` 已发展为 0.2.9 appV2 架构，并包含大量游客首页、搜索、Detail、Preview、Reader 和标签翻译改动。

当前 PR #17 不能原样合并：

- GitHub 判定 mergeable=false；
- 功能分支相对 main ahead 64 / behind 12；
- PR 有 47 个 changed files；
- 其中包含 35 个 `runtime/events` 文件和 `runtime/latest.json`；
- PR 描述称“不改账号主线”，但 appV2 入口实际隐藏了 main 中账号导入、退出、站点切换和部分开发操作；
- appV2 首页“筛选”页面的 apply 回调当前为空；
- 新源码被压缩成长行，Review 困难；
- 没有可复现 CI/TypeScript 基线。

本任务的目的，是把已有成果沉淀为一个干净、可 Review、可真机验收的 0.2.9 基线。

## 2. 开始前快照

执行前必须重新读取远端，确认以下 SHA 是否仍为当前值：

- repository：`tudoutematou/scripting-ehentai`
- base branch：`main`
- 审计时 base SHA：`13544409a691de65687859989be1e38a7c008681`
- source branch：`feat/tourist-home-search-ui`
- 审计时 source SHA：`da38425b4e2814381866cb5671c080039b9e106c`
- PR：#17

若 SHA 已变化：

1. 停止应用旧 diff；
2. 记录新 SHA；
3. 重新比较 `main...feat/tourist-home-search-ui`；
4. 报告变化后再按相同目标继续。

不要基于本地可能过期的文件直接覆盖远端。

## 3. 目标

创建一个新的稳定化分支，例如：

```text
fix/0.2.9-stabilization
```

从最新 `main` 开始，仅迁移 PR #17 中需要保留的 `src/` 业务变更，并完成以下最小修复：

1. appV2 游客入口正常启动；
2. 首页“筛选”应用后打开独立结果页；
3. 搜索、分类、快速筛选不回退；
4. Detail Core 继续立即显示；
5. Preview 继续后台约 3 路并发补齐；
6. 标签继续使用页面原始 href 搜索；
7. Reader 基础前后页继续工作；
8. 恢复 main 已有的账号状态、手工 Cookie 导入、刷新、退出和 E/Ex 切换入口；
9. Safari bridge 仅作为 Experimental 入口，不是默认登录；
10. 新 PR 不包含新增 runtime event 差异；
11. 源码格式可 Review；
12. 完成 TypeScript 检查和真机 smoke test。

## 4. 明确不做

本任务禁止：

- 实现 Favorites UI；
- 实现 Watched、My Tags；
- 重写 Reader；
- 实现 History/Reading Progress；
- 实现 Downloads；
- 实现 Comments/Rating/Torrent/Archive；
- 全面重写 Parser；
- 更换 UI 框架；
- 引入新的状态管理框架；
- 全仓库大改文件名；
- 删除历史分支；
- 直接 merge 到 main；
- 重写 `account.ts` 的 Keychain 逻辑；
- 恢复阻塞式 Detail；
- 把 Tag 退回 `string[]`；
- 将完整 EhTagTranslation 数据提交进本仓库；
- 使用普通 JSON 长期保存 Cookie；
- 为通过 TypeScript 随意添加大量 `any` typings。

## 5. 需要先检查的当前文件

必须逐个读取并理解：

### main

- `src/index.tsx`
- `src/account.ts`
- `src/favorites.ts`
- `src/githubBridge.ts`
- `src/script.json`

### feat/tourist-home-search-ui

- `src/index.tsx`
- `src/appV2.tsx`
- `src/appV2-globals.d.ts`
- `src/tourist.ts`
- `src/ehentai.ts`
- `src/tagTranslation.ts`
- `src/detailHtml.ts`
- `src/searchHtml.ts`
- `src/extractors.ts`
- `src/pure.ts`
- `src/account.ts`
- `src/browser.tsx`
- `src/githubBridge.ts`
- `src/script.json`

还要读取：

- PR #17 changed files；
- 最新 `runtime/events`，只用于理解真机状态，不复制到新分支；
- 当前 Scripting typings 中 NavigationStack、Keychain、FileManager、HTTP、GitHub API 的真实声明。

## 6. 参考 EhViewer 文件

本任务只用于核对现有行为，不新增功能：

- `GalleryListScene.java`
- `GalleryDetailScene.java`
- `GalleryPreviewsScene.java`
- `GalleryActivity.java`
- `ListUrlBuilder.java`
- `EhUrl.java`
- `EhCookieStore.java`

需要确认：

- `f_cats` 为排除掩码；
- tag 原始 href 的语义；
- Detail 与 Preview 是可分阶段加载的；
- 登录状态由核心 Cookie 存在决定；
- Android CookieManager/WebView 方案不应用于本任务。

## 7. 分支和迁移要求

### 7.1 新建分支

从最新 `main` 新建：

```text
fix/0.2.9-stabilization
```

不要继续直接在 PR #17 分支追加所有修复。

### 7.2 只迁移源码

从功能分支迁移以下业务文件的有效变化：

- `src/appV2-globals.d.ts`
- `src/appV2.tsx`
- `src/browser.tsx`
- `src/detailHtml.ts`
- `src/ehentai.ts`
- `src/extractors.ts`
- `src/githubBridge.ts`
- `src/index.tsx`
- `src/script.json`
- `src/tagTranslation.ts`
- `src/tourist.ts`

不要迁移 PR #17 新增的 runtime event 文件。

### 7.3 保留 main 账号能力

迁移入口时，必须检查 main `index.tsx` 中以下能力：

- 账号状态展示；
- 手工 Cookie 导入；
- 刷新网络状态；
- E/Ex 切换；
- 退出登录；
- Experimental Safari bridge 入口；
- GitHub 联调/源码同步入口。

产品主界面可以重新组织，但不能无说明地删除已有能力。

开发工具可以放在折叠区域或设置/开发区，不必占用游客首页主要空间。

## 8. 确认并修复的 Bug

### BUG-001：首页筛选 Apply 无动作

当前 appV2 首页打开筛选页时，`onApply` 是空回调。

正确行为：

1. 用户从首页打开筛选；
2. 修改分类/快速筛选/高级选项；
3. 点击应用；
4. 创建新的 SearchQuery/SearchState；
5. 打开独立 ResultsView；
6. ResultsView 使用该状态构造 URL；
7. 返回时首页本身不被错误替换；
8. 取消时不触发请求。

不得在 Filter 页面直接复制一份网络请求。

### BUG-002：账号主线入口回归

appV2 只显示简单“已登录/游客”状态，缺少操作入口。

正确行为：

- 未登录：显示安全的 Cookie 导入入口；
- 已登录：显示站点、网络状态、刷新、切站、退出；
- 网络验证失败但本地 Cookie 存在：仍显示已登录；
- Safari bridge：标为 Experimental，并折叠；
- UI 只调用 `account.ts` 现有接口，不重新处理 Cookie value。

### BUG-003：PR 功能描述与实际范围不一致

新 PR 描述必须写明：

- 这是 appV2 入口迁移和游客基线稳定化；
- 恢复账号操作入口；
- 不实现 Favorites UI；
- Detail/Preview 采用渐进加载；
- runtime events 不属于 PR diff。

## 9. 数据模型要求

继续使用现有 `TouristSearchState` 或等价模型，禁止 Filter、Home、Results 各自拥有不兼容状态。

建议最小接口：

```ts
type SearchQuery = TouristSearchState;

type TagRef = {
  raw: string;
  namespace: string;
  name: string;
  searchUrl: string;
  translatedName?: string;
};

type AccountDisplayState = {
  loggedIn: boolean;
  activeSite: "e-hentai" | "exhentai";
  eHentaiReachable: boolean | null;
  exAvailable: boolean | null;
  validating: boolean;
};
```

不要为本任务新建最终大而全 domain 层；只避免继续扩散重复状态。

## 10. 网络要求

- 复用现有 `ehentai.ts` 和 `account.ts`；
- 不在 `appV2.tsx` 新增直接 Cookie header；
- 不在 Filter/Results 中各写一套 URL；
- 保持 Detail Core 和 Preview 后台加载；
- Preview 并发上限继续约 3；
- 页面切换后旧请求不得覆盖新页面状态；
- 如果已有 `sequence`，必须真正检查 request id，或删除无效变量并采用当前 Scripting 支持的取消方式；
- 本任务不全面重构网络层，但不得增加新债务。

## 11. Parser 要求

- 不全面重写 Parser；
- 保持当前可用 list/detail/page parser；
- 明确 `searchHtml.ts` / `detailHtml.ts` 是当前主路径；
- 若 `extractors.ts` 当前未被主路径使用，在代码或结果报告中说明，不要同时修改两套实现以“保持一致”；
- 不复制 decode/clean helper；
- 若修改 Parser，至少添加一个最小脱敏 fixture 或可重复的纯函数测试。

## 12. 标签翻译要求

- 保留 EhTagTranslation 运行时加载；
- 保留小型 namespace/COMMON_TAG fallback；
- 不扩充大规模手工翻译表；
- 不提交完整 1.4 MB 数据文件；
- 不在本任务全面实现 SHA1 更新器，但结果报告必须将其列为下一任务；
- 标签点击必须继续使用原始 `searchUrl`。

## 13. UI 要求

首页优先级：

1. 搜索；
2. 分类/快速筛选；
3. 内容列表；
4. 账号状态入口；
5. 开发工具折叠区。

不得让 GitHub Source Sync、diagnostics 按钮占据主要用户路径。

所有页面必须有：

- loading；
- empty；
- error；
- retry（适用时）；
- 返回行为。

不要求本任务美化全部 UI，只要求结构清楚且不回归。

## 14. Cache 要求

- 保留 `detailCoreCache`；
- 保留 `previewPageCache`；
- 本任务不全面实现 LRU/TTL；
- 不新增无限增长的新 cache；
- 在结果报告中记录当前 key、value 和失效缺口；
- 切站时不得错误复用另一个站点缓存；如 key 当前未包含 site，应做最小修复。

## 15. 安全要求

严格禁止：

- Cookie value 进入源码、commit、console、diagnostics、error message、stack、notes；
- 原始登录输入落盘；
- 完整 HTML 上传；
- 新增普通 JSON Cookie bridge；
- 在 PR 中提交用户历史数据；
- 提交完整 `/g/{gid}/{token}`、`/s/{ptoken}`、`/tag/{tag}` 的新 diagnostics 文件。

本任务若暂不修改 diagnostics sanitizer，真机测试结果只使用本地 pass/fail 表或已脱敏摘要，不新增 runtime 文件到功能 PR。

## 16. Diagnostics 要求

本任务允许的 stage：

```text
startup
gallery.home
gallery.search
gallery.filter
gallery.detail.core
gallery.detail.previews
reader.page
account.local-state
account.validate
```

记录：

- scriptVersion；
- commit；
- stage；
- ok；
- duration；
- status；
- 无敏感 metrics。

不记录：

- 搜索词；
- tag 文本；
- gid/token/ptoken；
- Cookie；
- 完整 URL；
- 完整 HTML。

## 17. Source Sync 要求

本任务不重写 Source Sync，但必须：

- 保留“远端文件全部下载成功后再开始覆盖”；
- 不恢复边下载边覆盖；
- 不把 source branch 永久硬编码成旧 feature branch；
- 对稳定化分支使用明确配置；
- 失败时不删除当前可运行源码；
- 在结果报告中列出尚未完成的 staging/hash/rollback/旧文件清理问题。

## 18. TypeScript 检查

必须使用 Scripting 当前真实提供的检查能力和 typings。

执行要求：

1. 检查所有本任务涉及的 `.ts/.tsx` 文件；
2. 检查 `script.json`；
3. 不使用不存在的 `tests/scripting.d.ts` 假装通过；
4. 不新增大范围 `declare ...: any`；
5. `appV2-globals.d.ts` 若保留，说明为什么当前运行时必须使用；
6. 输出完整的错误数量和最终结果；
7. 任何忽略项必须逐条说明。

若无法在仓库环境复现 TypeScript check：

- 使用 Scripting 内置 check；
- 记录工具名称和结果；
- 把“建立仓库 CI”列入 TASK-003；
- 不声称 CI 已通过。

## 19. 真机测试步骤

由用户在稳定化分支对应版本执行：

### 启动

1. 冷启动；
2. 确认无 RuntimeImportError；
3. 确认 appV2 首页显示。

### 游客首页与搜索

4. 等待首页列表；
5. 普通关键词搜索；
6. 清空关键词搜索；
7. 单分类；
8. 两分类组合；
9. 中文/日文/英文/翻译本/无对白各至少一次；
10. 首页“筛选”应用，确认进入结果页；
11. 在结果页再次修改筛选；
12. 快速连续发起两个不同搜索，确认旧结果不会覆盖新结果。

### Detail / Preview

13. 打开一个多 Preview 页画廊；
14. 确认标题、封面、元信息、标签先显示；
15. 确认剩余 Preview 逐渐补齐；
16. 返回再进入，确认 cache 不破坏内容；
17. 点击标签进入搜索结果。

### Reader

18. 打开 Reader；
19. 连续前进 5 页；
20. 后退 2 页；
21. 快速返回 Detail；
22. 再次进入 Reader；
23. 验证没有旧请求覆盖当前页。

### Account

24. 未登录状态显示；
25. 手工导入有效 Cookie；
26. 刷新网络状态；
27. 切 E/Ex；
28. 临时断网刷新，确认仍保持本地已登录；
29. 退出；
30. 重启确认退出状态。

### Diagnostics / Privacy

31. 检查本地/远端诊断；
32. 确认没有 Cookie value；
33. 确认没有搜索词；
34. 确认没有完整 tag/g/s URL；
35. 确认功能 PR diff 没有新增 runtime 文件。

## 20. 提交要求

建议提交拆分：

1. `chore: create clean 0.2.9 appV2 integration baseline`
2. `fix: wire home filters to independent search results`
3. `fix: restore account and site controls in appV2`
4. `chore: format appV2 sources and update script metadata`

不得把全部内容压成一个无法 Review 的大提交，也不得制造几十个试错提交后不整理。

## 21. PR 要求

新 PR 标题建议：

```text
fix: establish reviewable 0.2.9 appV2 stabilization baseline
```

PR 描述必须包含：

- base/head SHA；
- 从 PR #17 保留了什么；
- 没有迁移哪些 runtime 文件；
- 修复的两个确认回归；
- Detail/Preview 架构不回退说明；
- TypeScript 结果；
- 真机测试表；
- diagnostics 隐私检查；
- Known limitations；
- rollback；
- 下一任务不是自动开始 Favorites，而是等待 Review。

PR 只能保持 Draft，直到用户真机验证和技术负责人 Review 完成。

## 22. 完成定义

任务只有满足全部条件才算完成：

- [ ] 新分支从最新 main 建立；
- [ ] 只迁移需要的 src 业务变化；
- [ ] PR diff 无新增 runtime events；
- [ ] appV2 启动；
- [ ] 首页筛选可打开结果；
- [ ] 账号操作入口恢复；
- [ ] Safari bridge 标为 Experimental；
- [ ] Detail Core 非阻塞；
- [ ] Preview 后台补齐；
- [ ] Tag 原始 href 可搜索；
- [ ] Reader 基础链路可用；
- [ ] TypeScript check 通过或唯一真实阻塞已明确；
- [ ] 真机 smoke test 完成；
- [ ] diagnostics 无敏感信息；
- [ ] 新 PR 可 Review；
- [ ] 未新增任务外功能；
- [ ] Agent 已提交完成报告并停止。

## 23. 完成报告格式

```md
# TASK-001 Result

## Snapshot
- Main SHA:
- Source branch SHA:
- Stabilization branch:
- Head SHA:
- Script version:

## Source Migration
- Migrated files:
- Excluded runtime files:

## Fixed
- BUG-001:
- BUG-002:
- Other task-scoped fixes:

## Reused Existing Code
- Account:
- Network:
- Parser:
- Cache:

## TypeScript
- Tool/check:
- Result:
- Remaining warnings:

## Device Test Matrix
| Case | Result | Evidence |
|---|---|---|

## Privacy Check
- Cookie value present: no
- Search text present: no
- Full tag/g/s URL present: no
- Full HTML present: no

## Known Limitations
- ...

## Follow-up
- Diagnostics sanitizer
- CI/fixtures
- Network/parser boundary

## Rollback
- ...
```

完成后停止，等待技术负责人 Review，不自动开始下一任务。
