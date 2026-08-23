# Project Governance

本目录是 `scripting-ehentai` 的长期项目治理入口。

## 必读顺序

1. [`EHVIEWER_PORTING_MASTER_PLAN.md`](./EHVIEWER_PORTING_MASTER_PLAN.md) — EhViewer 完整功能地图、Scripting 移植范围、里程碑和新的“功能包自主开发”模式。
2. [`PROJECT_HANDOFF.md`](./PROJECT_HANDOFF.md) — 当前事实、架构、功能状态、关键技术决定与废弃方案。
3. [`DEVELOPMENT_RULES.md`](./DEVELOPMENT_RULES.md) — ChatGPT 技术负责人、Scripting Agent 与 Reviewer 的长期开发规则。
4. [`ROADMAP.md`](./ROADMAP.md) — 从 0.2.9 稳定化到 1.0 RC 的可执行里程碑。
5. [`AUDIT_REPORT.md`](./AUDIT_REPORT.md) — 2026-08-23 全面 Audit 的证据与结论。
6. [`tasks/TASK-001-STABILIZATION.md`](./tasks/TASK-001-STABILIZATION.md) — 0.2.9 稳定化历史任务。

## 当前基线

- `main`: `13544409a691de65687859989be1e38a7c008681`
- `fix/0.2.9-stabilization`: PR #19 当前稳定化基线
- `feat/tourist-home-search-ui`: `da38425b4e2814381866cb5671c080039b9e106c`
- PR #17: Draft，当前不建议原样合并。

## 当前开发模式

从 `EHVIEWER_PORTING_MASTER_PLAN.md` 生效后，项目以 **Milestone / 功能包** 为最小交付单位：

- Scripting Agent 连续实现、自测、自修一个完整功能包；
- 普通编译、运行、布局、网络和解析错误由 Agent 自行处理；
- ChatGPT 负责规格、架构、远端 Review 和里程碑决策；
- 用户只做少量真正必须的人机交互和 Milestone 集中验收；
- 不再为每个按钮或小修复反复要求用户真机测试。

GitHub 当前目标分支源码是代码事实来源；历史聊天只用于决策背景。Cookie value、密码、Token、完整敏感 URL 与 HTML 永远不得进入 diagnostics。

本目录本身只存治理文档，不包含运行时 Cookie、用户数据或完整 EhTagTranslation 数据库。
