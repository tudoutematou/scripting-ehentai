# CURRENT_TASK — 1.0 Reference Alignment Pass

Branch: `release/1.0`  
Starting immutable head: `ad91b2e2232ef51f2e40172e1184dfe9c051cd72`  
PR #29 remains Draft; do not merge.

## Evidence and acceptance

- 用户已提供真实 iPad 运行证据；A-30 不再是 evidence-deferred，现有 Detail 的 `maxWidth: 760`、metadata 纵向布局与 adaptive 标签网格必须保留。
- 实现后必须从最终 immutable `release/1.0` head 重新 bootstrap DEV；除 `script.json` 的 Scripting 自动投影字段外，逐文件源码必须一致。
- Account/Settings 必须显示 `1.0.0-rc · <short SHA>` build marker 后才允许实机验收。

## Allowed scope

- 以 Zerolost/SEhViewer 为只读参考，简化 Safari Cookie 获取与改善视觉层级。
- Cookie 流程：Safari 显式获取 → App 导入草稿 → 保存并验证 → 现有 sanitize / Keychain / session invalidation。
- 可新增最小 `GlassUI.tsx`，仅含真正跨页面复用的视觉 primitive。

## Frozen scope

- 不替换或移植 `ehentai` 网络层、parser、`libraryStore`、下载核心、Reader、GitHub sync、Config 或 TabView 架构。
- 不覆盖稳定 `E-Hentai 浏览器`，不 merge、不更新 `main`、不 tag/release、不 rewrite history。
- 若直接采用 substantial SEhViewer source，加入 MIT attribution：Copyright (c) 2024 Gandum2077；Copyright (c) 2026 Zerolost。
