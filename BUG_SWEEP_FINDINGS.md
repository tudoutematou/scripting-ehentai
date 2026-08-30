# BUG_SWEEP_FINDINGS — active registry

Use only during the `BUG_SWEEP_1_1` stabilization task.

Record **only reproduced/proven findings**. Do not record speculative code smells.
Do not include Cookie values, URLs/tokens, HTML, private paths, search text, favorite notes or other sensitive data.

| ID | Severity | Symptom / reproduction | Root cause | Status / runtime evidence |
|---|---|---|---|---|
| BS-01 | S1 | 当前配置 Provider 执行 AI Search 时稳定返回 `Stream must be set to true`，普通流式请求可用 | `requestStructuredData()` 与当前 Provider 的流式约束不兼容，且无原生 streaming 兼容回退 | runtime checked：同一 Provider 已输出结构化 intent 并进入真实普通搜索 |
| BS-02 | S1 | 真实“仅含种子”画廊的种子入口打开成普通画廊列表，解析结果为 0 | 详情误选全站 Torrents 导航；真实 popup 中 parser 又只检查首个 `colspan=5` 单元格 | runtime checked：同一 known-positive 画廊解析到 1 个真实 Torrent |
| BS-03 | S1 | 已收藏画廊在权威收藏状态尚未返回时仍可提交分类，并以空值覆盖现有备注 | 详情收藏 chooser 使用虚构默认分类，mutation 未等待 `loadFavoriteState()` | needs user gesture/visual test：真实收藏状态读取通过；未为 QA 修改云端备注 |
| BS-04 | S2 | 图片搜索并发请求可由旧 completion 覆盖最后一次选择及 loading 状态 | `ImageSearchScene.run()` 无 request epoch，loading 时两个入口仍可再次触发 | needs user gesture/visual test：入口已互斥并加 epoch；照片选择交互不可自动化 |
| BS-05 | S2 | Reader 缩回 1x 后再次放大拖动会沿用上一轮平移基准并跳动 | 缩放 state 归零时未同步清零 `offsetBase` | needs user gesture/visual test：基准同步清零；缩放手感不可自动化 |
| BS-06 | S2 | Assistant Tool 对标题中普通 `token` 等词误判为泄密并拒绝整个合法结果 | 隐私门对完整 JSON 文本做无字段语义的关键词正则 | runtime checked：真实 wrapper search/detail/Favorites/History 脱敏通过，合法关键词回归通过 |
| BS-07 | S2 | Assistant Tool 多预览分页详情把首批预览数量作为总 `pageCount` | `gallery.detail` 只读 core 首批，却返回 `detail.pageLinks.length` | runtime checked：wrapper detail 已加载完整多分页库存 |
| BS-08 | S2 | 从书库管理删除/重置本地记录后返回书库，根列表仍显示进入管理前快照 | Library 仅首次挂载 load，管理 destination 关闭时不刷新 | needs user gesture/visual test：返回回调已重载三个 store；导航生命周期需真机点击确认 |
| BS-09 | S3 | 保存搜索/打开 Assistant 失败仍显示绿色成功提示；详情可同时显示旧 success 与新 error | success notice 与 error 共用/未互斥清理 | needs user gesture/visual test：状态已互斥；提示颜色需 UI 观察 |
| BS-10 | S2 | 连续在线/离线 Reader 加载页面后不写入阅读进度，返回详情仍停在旧页 | 连续分支未调用共享 `updateReadingProgress()`，且离线 effect 显式排除 continuous | needs user gesture/visual test：连续页面接入共享进度提交；滚动可见性需真机确认 |
| BS-11 | S1 | 浏览器 Cookie 导入并验证成功后账号页被踢回“发现”；返回账号页时 E-Hentai 明明显示可用却与不可用的 ExHentai 一样呈灰色、无法区分当前选中与真正不可用 | `saveAndValidateCookieDraft()` 无条件 `setActiveSite("e")`，触发全局 account generation 使 `ResponsiveShell` remount，iPad `RegularShell.selected` 重置为 `discover`；站点 UI 又把“当前选中”通过 `disabled` 表达，和真正不可用共用灰态 | open：用户 2026-08-30 iPad 实机截图/复现；需修后重跑 导入→仍留在账号页→E 可识别为当前站→切换行为 |
| BS-12 | S1 | 同一账号在 Android EhViewer 可进入 ExHentai，但从普通 E-Hentai Safari 页面获取并导入 Cookie 后，本 App 只验证到 E 可用、Ex 不可用 | 当前 Browser Cookie 助手只有当前页面 `document.cookie` 是可靠同域来源；跨 E/Ex 的读取依赖 `GM.cookie.list({url})`。若该能力在当前 Safari/Scripting 环境不可用或不能返回 Ex host Cookie，则一次 E 页面捕获不会得到真实 Ex 域 `ipb_member_id`/`ipb_pass_hash`/有效 `igneous`；现有“同步里站登录”是第二段流程但用户路径仍未闭环 | open：用户 2026-08-30 实机确认 Android 账号可进 Ex、Scripting 导入后 Ex 不可用；必须在真实 Safari Ex 页面/GM Cookie 能力上诊断，禁止跨域伪造 Cookie |

Status values:
- `open`
- `fixing`
- `runtime checked`
- `blocked`
- `needs user gesture/visual test`

Keep entries compact. Update an existing row instead of appending narrative progress logs.
