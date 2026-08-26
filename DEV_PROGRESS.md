# DEV_PROGRESS — 1.0 Release Prep

Branch: `release/1.0`

## Reference Alignment Pass — 2026-08-27

用户已提供真实 iPad 运行证据：A-30 不再是 evidence-deferred；Detail 的 760pt 限宽、metadata 纵向 label/value 与 adaptive `LazyVGrid` 标签布局是保留约束。本阶段获准以 Zerolost/SEhViewer 为只读参考，实施 Safari 显式 Cookie 获取和最小 Glass 视觉层。

- 允许改造 `browser.tsx`、`account.ts`、`GalleryFlow.tsx`、`LibraryScene.tsx` 和最小公共 `GlassUI.tsx`。
- 登录改为：Safari 显式点击获取 Cookie → App 只导入草稿 → 用户点击“保存并验证”后才进入现有 sanitize、Keychain、session invalidation 与 E/Ex 真实验证。
- 禁止替换或移植现有 `ehentai` 网络层、parser、`libraryStore`、下载/Reader 核心、GitHub sync、Config 或 TabView 架构。
- 实现结束必须固定最终 head 同步 DEV；`script.json` 按共享字段语义比较并忽略 Scripting 自动投影字段，其余源码逐文件一致；Account/Settings build marker 必须显示最终短 SHA。

## Sync-chain correction — 2026-08-26

此前“DEV 已同步”的结论无效：根目录 `bootstrapFromRemote.ts` 与 `readRemoteTask.ts` 实际仍指向 `feat/0.9-stabilization`，且远端 `src/script.json` 仍为 `0.9.0-rc-dev`。本轮暂停功能与实机验收，仅修正部署链路：

- 两个工具均改为 `release/1.0`。
- `bootstrapFromRemote.ts` 在写入前解析一次远端 branch head，并用该不可变 SHA 读取全量 `src/`；写完后保存本地 `sync-manifest.json`（version、branch、commit、时间、文件数）。
- 隔离 DEV 的远端 manifest 改为 `1.0.0-rc`，名称继续为 `E-Hentai 浏览器 DEV`，描述明确为 1.0 Release Candidate。
- “账号与设置”底部显示只读构建标记；实机测试前必须与同步清单/远端 head 一致。
- 修复后重新同步并逐项验证 `script.json`、`GalleryFlow.tsx`、`browser.tsx`、`libraryStore.ts` marker；未验证前不得把功能测试结果归因于 release/1.0。


## Real-device Hotfix Pass — 2026-08-26


- **Safari Login Bridge：**不再强制 `safariBrowserStorageDirectory`。候选共享 root 逐个进行目录创建、写入、存在性与读回 probe；单个 `pathDenied` 会被记录并继续探测。通过的 root 才用于 login/status 写入。
- **显式捕获：**Bridge 只在“在 Safari 登录”生成的 `scripting_eh_capture=1` 短期 URL 中启用；普通 Home 的“论坛”外部入口不会显示 badge、自动跳转 E-Hentai 或写入捕获。捕获成功、错误或过期后会关闭。
- **下载恢复：**`runDownloadWork()` 持久化 `downloading` 后立即调用 `onUpdate`，下载列表可立即显示“下载中”并启用暂停/停止，无需等待首张图片请求完成。
- **iPad 横屏 Detail：**根据真实设备证据重新打开并修复 A-30：详情内容最大宽度为 760pt 并居中；metadata 采用垂直 label/value；tags 使用 adaptive `LazyVGrid` 包装。阅读、收藏、离线和资源顺序未改变。
- **反馈语义：**账户正常说明/成功提示使用普通辅助文字或绿色 notice；真正错误才使用 `ErrorText`。删除本地书签改为 notice。

## Hotfix verification

- TypeScript diagnostics: **0**.
- `src/runSelfTests.ts`: **all executed checks passed**，含 `browser.bridge-root-fallback`、`account.safari-explicit-capture` 和 `downloads.immediate-running-state`。
- `src/runActionSmoke.ts`: passed.
- `src/runAssistantToolSmoke.ts`: passed.
- `src/runNetworkSelfTest.ts`: passed; live Search → Detail Core → Image Page.
- Isolated `E-Hentai 浏览器 DEV` launch: 25-second persistent UI observation completed with no startup exception output.

## Targeted real-device acceptance required

DEV 已同步本轮代码，仍需在同一 iPad 上依次确认：普通论坛打开不触发 Bridge；“在 Safari 登录”后可捕获并导入；下载 resume 立即显示 downloading 且可 pause；横屏 Detail 的信息/标签不再横跨画面；正常提示不显示红色。此处不把 CLI 或 deterministic tests 误记为真实交互结论。

## Preserve

- Stable local `E-Hentai 浏览器` remains untouched.
- No merge, main update, history rewrite, tag/release publication or stable-script overwrite.
- A-28 remains post-1.0; A-30 is code-fixed from supplied iPad landscape evidence and is no longer evidence-deferred.
