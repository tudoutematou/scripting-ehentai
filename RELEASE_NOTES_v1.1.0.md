# v1.1.0 Release Notes

## 首个公开版本

`scripting-ehentai` 是面向 Scripting（iOS / iPadOS）的独立第三方 E-Hentai / ExHentai 浏览客户端。v1.1.0 提供从发现、搜索、详情和阅读，到资料库、收藏与前台可恢复离线下载的完整基础体验。

> 本项目与 E-Hentai / ExHentai 官方及 EhViewer 无隶属、授权或合作关系。

## 主要内容

- 浏览首页、热门、Toplist、Watched、My Tags、画廊详情与预览。
- 关键词、标签和高级筛选搜索；可保存搜索条件。
- 在线单页/连续阅读、阅读进度、图片缓存和原生缩放/平移。
- 云端收藏、本地书签、历史记录、继续阅读与收藏分类管理。
- 整本下载和按页选择的部分下载；可保存到离线书库、系统图库或两者。
- 下载暂停、继续、失败重试和启动恢复；已保存页面支持 Offline Reader。
- Safari Cookie 助手导入 E-Hentai / ExHentai 会话，并在应用内验证。
- 可选 Scripting Assistant 搜索与推荐，结果通过常规站内搜索流程呈现。

## 下载与隐私说明

- 下载依赖 Scripting 前台运行，不是无限制后台下载服务。
- 系统图库写入若在中断时结果未知，重试前会明确提示“可能重复”。
- 登录 Cookie 在 Scripting Keychain 边界内处理；项目不含项目运营方的遥测、分析或自建后端。
- AI 搜索与推荐会使用你在 Scripting 中配置的 Assistant 提供方；详见 [PRIVACY.md](PRIVACY.md)。

## 开始使用

安装、登录、ExHentai、部分下载和已知限制请阅读 [README.md](README.md)。提交反馈时请勿附上 Cookie、账号信息、带 token 的完整链接、原始 HTML 或本地路径。

## 已知限制

- ExHentai 可用性取决于真实 ExHentai 会话及账户权限。
- 不提供 Android EhViewer 的完整功能复刻、后台常驻下载或 H@H 客户端。
- Reader 手势、长按选择和不同尺寸 iPad 布局仍建议在实际设备上验证。

## 致谢

项目以 MIT License 发布。Cookie 助手包含基于 MIT 许可 JSEhViewer / SEhViewer 的适配代码；详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
