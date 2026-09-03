# scripting-ehentai

适用于 **Scripting**（iOS / iPadOS）的独立第三方 E-Hentai / ExHentai 浏览客户端。它将浏览、搜索、阅读、收藏、本地资料库与前台可恢复的离线下载整合为原生脚本项目体验。

> **独立项目声明**：本项目与 E-Hentai / ExHentai 官方没有任何隶属、授权或合作关系；也与 EhViewer 及其维护者没有隶属关系。名称仅用于说明兼容的服务与参考的用户体验。

仅在你所在地法律允许、且你已满足相关站点与内容的访问条件时使用。请遵守 E-Hentai / ExHentai 的服务规则。

## 功能一览

- 浏览首页、分类、热门内容、Toplist、Watched、My Tags 与画廊详情。
- 关键词、标签与高级筛选搜索；可保存搜索条件。
- 在线单页/连续阅读、阅读进度、缩放与图片缓存。
- 服务端收藏夹、本地书签、历史记录与继续阅读。
- 整本或**部分页面**下载到离线书库、系统照片图库，或两者同时保存。
- 下载暂停、继续、失败重试、启动恢复；已保存页面可在 Offline Reader 中阅读。
- 通过 Safari Cookie 助手导入 E-Hentai / ExHentai 会话，并在应用内验证。
- 可选的 Scripting Assistant 搜索与推荐；其结果仍通过普通站内搜索流程展示。

## 截图

> 截图占位：将在不包含成人内容的前提下补充 Discover、Library、Download Manager 与 Settings 界面。

| Discover / 搜索 | 资料库 / 下载 |
| --- | --- |
| _截图占位_ | _截图占位_ |

## 安装

1. 在 iPhone 或 iPad 安装并更新 **Scripting**。
2. 从本仓库的发布页下载 v1.1.0 源码包并解压；在 Scripting 中导入其中的 **`src/` 文件夹**作为脚本项目。该文件夹包含项目所需的 `script.json` 和 `index.tsx`，不要将整个仓库根目录当作脚本项目导入。
3. 首次运行时按 Scripting 的系统提示授予所需权限。离线下载、系统图库保存、Safari 登录辅助与 AI 功能均只在你实际使用对应功能时需要相关能力。
4. 如需 Safari 一键导入登录会话，请在 Scripting 的浏览器脚本中安装并启用 `src/browser.tsx`（显示名为“E-Hentai 浏览器 Cookie 助手”）。
5. 从 Scripting 运行项目。建议先完成登录验证，再使用收藏、Watched、My Tags、ExHentai 或需要账户权限的功能。

Scripting 的导入界面可能随版本变化；核心要求是：导入 `src/` 目录，并保留其文件结构。

## 登录 E-Hentai / ExHentai

### E-Hentai

1. 在项目的账户页面选择打开 Safari 登录。
2. 在 Safari 完成 E-Hentai 登录。
3. 点击页面左下角的 Cookie 助手，或在 Scripting 浏览器扩展菜单中执行“获取 EH Cookie 并写入”。
4. 返回项目，选择导入并验证浏览器 Cookie。

项目会在保存前验证会话；验证失败不会用无效登录数据覆盖当前本机会话。

### ExHentai

ExHentai 需要有效账户权限和 ExHentai 域名下可用的会话。若 E-Hentai 登录后仍无法使用 ExHentai，请在 Safari 中打开并登录 `exhentai.org`，再次运行 Cookie 助手后返回导入；也可以使用账户页提供的手工 Cookie 导入。项目不会跨域伪造 ExHentai 凭据或绕过站点访问限制。

## 下载与离线阅读

### 完整下载

在画廊详情中选择下载。项目会在下载期间逐步获取所需预览库存，并显示准备与下载进度。完成后，可从 **书库 → 下载** 打开离线阅读。

### 部分下载

在“全部页面”中进入选择模式：可点选页面、选择已加载页面，或输入起止页选择范围；然后选择保存到：

- **离线书库**：用于项目内 Offline Reader；
- **系统图库**：写入 iOS Photos；
- **两者同时保存**。

部分下载的进度按所选页面数计算，同时保留原画廊总页数作为参考。

### 使用限制

- 下载器面向 **Scripting 前台运行**；它不是无限制后台下载服务。切到后台、系统资源回收或网络中断都可能暂停任务，回到项目后可继续或重试。
- 保存到系统图库时，如果应用在一次写入中被终止，最后一张的结果可能未知。项目会要求你明确确认后才重试，并提示重试**可能产生重复图片**。
- 删除任务或本地缓存不会删除已经写入系统 Photos 的图片；请在“照片”App 中自行管理。

## 隐私

- 登录 Cookie 存储在 Scripting 的 Keychain 边界内；项目不会把 Cookie、密码、令牌或原始页面内容提交到本仓库。
- 浏览记录、书签、阅读进度、下载清单、缓存与离线文件保存在本机的 Scripting 存储范围内。
- 项目不包含项目运营方的分析、遥测或自建服务端。
- 使用 AI 搜索或推荐时，输入内容会发送给你在 Scripting 中配置的 Assistant 提供方；请先阅读该提供方的隐私政策。

完整说明见 [PRIVACY.md](PRIVACY.md)。

## 已知限制

- E-Hentai 的匿名浏览范围、ExHentai 访问、Watched、My Tags、云端收藏等均受你的账户状态与站点规则限制。
- ExHentai 会话必须来自真实且可用的 ExHentai 登录状态；普通 E-Hentai Cookie 不保证可直接用于 ExHentai。
- 不提供 Android EhViewer 的完整功能复刻：没有后台常驻下载、H@H 客户端、Wi-Fi 传输、反向图片搜索上传等。
- 部分交互（例如 Reader 缩放手感、长按批量选择和不同尺寸 iPad 布局）仍依赖实际设备与 Scripting 版本。
- 网络服务、图片源、站点页面结构或 Scripting API 的变化可能影响功能；请先更新到最新发布版本后再报告问题。

## 反馈与支持

提交反馈前，请先搜索现有 Issue，并升级到最新版本：

- [报告 Bug](../../issues/new?template=bug_report.md)
- [提出功能建议](../../issues/new?template=feature_request.md)
- [查看更新记录](CHANGELOG.md)

**不要**在 Issue、截图或日志中发布 Cookie、账号信息、完整私密链接、带 token 的 URL、原始页面 HTML 或本地文件路径。请使用 Issue 模板提供脱敏后的复现步骤。

## 许可证与致谢

本项目以 [MIT License](LICENSE) 发布。`browser.tsx` 的 Cookie 助手基于 MIT 许可的 JSEhViewer / SEhViewer 进行适配；完整的版权与第三方声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
