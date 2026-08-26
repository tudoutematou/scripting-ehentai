# DEV_PROGRESS — 1.0 Release Prep

Branch: `release/1.0`

## Real-device Hotfix Pass — 2026-08-26

真实 iPad 横屏录像确认了 Release Prep 后仍存在 Safari Bridge、下载即时状态、详情宽度和提示语义问题。本轮仅修复这些复现的 release blockers；未开始新功能或全项目审计。

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
- A-28 and A-09 remain post-1.0; A-30 is now code-fixed from the supplied iPad landscape evidence.
