# Project Governance

本目录是 `scripting-ehentai` 的长期项目治理入口。

## 必读顺序

1. [`PROJECT_HANDOFF.md`](./PROJECT_HANDOFF.md) — 当前事实、架构、功能状态、关键技术决定与废弃方案。
2. [`DEVELOPMENT_RULES.md`](./DEVELOPMENT_RULES.md) — ChatGPT 技术负责人、Scripting Agent 与 Reviewer 的长期开发规则。
3. [`ROADMAP.md`](./ROADMAP.md) — 从 0.2.9 稳定化到 1.0 RC 的可执行里程碑。
4. [`AUDIT_REPORT.md`](./AUDIT_REPORT.md) — 2026-08-23 全面 Audit 的证据与结论。
5. [`tasks/TASK-001-STABILIZATION.md`](./tasks/TASK-001-STABILIZATION.md) — 给 Scripting Agent 的第一份开发任务。

## 当前基线

- `main`: `13544409a691de65687859989be1e38a7c008681`
- `feat/tourist-home-search-ui`: `da38425b4e2814381866cb5671c080039b9e106c`
- PR #17: Draft，当前不建议原样合并。

## 工作方式

GitHub 当前目标分支源码是代码事实来源；历史聊天只用于决策背景。代码写完不等于功能完成，关键功能必须通过 TypeScript check、fixture 与真机验证。Cookie value、密码、Token、完整敏感 URL 与 HTML 永远不得进入 diagnostics。

本目录本身只存治理文档，不包含运行时 Cookie、用户数据或完整 EhTagTranslation 数据库。
