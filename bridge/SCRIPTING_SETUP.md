# Scripting 端联调接入说明

目标：让当前本地脚本“E-Hentai 浏览器”把运行错误、测试状态和当前源码快照同步到本仓库，供 ChatGPT 直接读取和修复。

## 固定参数

- owner: `tudoutematou`
- repo: `scripting-ehentai`
- issueNumber: `1`
- source root: `src/`

## 第一次接入

在当前脚本中新增一个很小的诊断模块，不要重写业务逻辑。

启动时一次性请求 GitHub 权限：

- `read_contents`
- `write_contents`
- `read_issues`
- `write_issues`

使用 Scripting 当前运行时真实提供的 GitHub API/type definitions，不要凭记忆猜 API 名称。

## 必须实现的函数

### `reportDiagnostic(payload)`

将诊断信息用 `GitHub.createIssueComment(...)` 追加到 Issue #1。

评论正文用 JSON code block，字段至少包含：

- `time`
- `scriptVersion`
- `stage`
- `ok`
- `error.name`
- `error.message`
- `error.stack`
- `request.url`
- `request.status`
- `request.statusText`
- `notes`

不得上传 Cookie、Authorization、GitHub token、密码、账户信息或完整 HTML。

### `syncSourceSnapshot()`

读取 `Script.directory` 下当前脚本的文本源码，将文件按原相对路径同步到本仓库 `src/` 下。

优先同步：

- `index.tsx`
- `script.json`
- 当前项目中业务相关 `.ts` / `.tsx` / `.json` 文件

跳过二进制资源、缓存、临时文件。

更新 GitHub 已存在文件时先读取当前 content/sha，再调用 `GitHub.putContent`；新文件直接创建。

## 当前第一轮需要包裹诊断的阶段

1. `startup`
2. `gallery-home`
3. `gallery-search`

当前只修“启动 + 首页列表 + 搜索”，不要扩展详情/阅读器/登录。

每个异步入口使用 try/catch：发生异常时先保留本地错误显示，同时调用 `reportDiagnostic` 上传真实 error message + stack。

如果 HTTP 请求成功但解析失败，诊断里记录 status 和简短 notes；不要上传完整响应 HTML。

## UI

临时增加一个“同步诊断”按钮，用于手动执行：

1. `syncSourceSnapshot()`
2. 上传一条 `stage: manual-sync, ok: true` 的诊断评论

这样即使业务请求失败，也能确认 GitHub 联调链路是否可用。

## 完成标准

第一次运行时允许 GitHub 权限弹窗后：

- 点击“同步诊断”后，Issue #1 出现一条新评论；
- 仓库 `src/` 出现当前脚本源码；
- 再运行首页/搜索，任何错误都自动追加到 Issue #1；
- 不要调用子智能体，不要并行工具调用。
