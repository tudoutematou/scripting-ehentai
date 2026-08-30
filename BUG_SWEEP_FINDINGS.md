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
| BS-11 | S1 | 浏览器 Cookie 导入并验证成功后账号页被踢回“发现”；返回账号页时 E-Hentai 明明显示可用却与不可用的 ExHentai 一样呈灰色、无法区分当前选中与真正不可用 | account generation 刷新与根导航选中状态耦合；站点 UI 用 disabled 同时表达当前与不可用 | needs user gesture/visual test：导入/切站保留 root，当前站显示蓝色“当前”，未验证 Ex 单独灰显；需真机点按确认 |
| BS-12 | S1 | 同一账号在 Android EhViewer 可进入 ExHentai，但从普通 E-Hentai Safari 页面获取并导入 Cookie 后，本 App 只验证到 E 可用、Ex 不可用 | 实测真实 Safari Ex 页可写入捕获，但当前捕获 Ex `igneous` 仍无效；GM 跨域结果不可当作真实 Ex 会话。现支持真实 Ex 当前页优先捕获、优先导入 Ex 草稿，以及按 Ex 域手工粘贴并与现有 E 会话合并验证 | needs user test：Safari Ex 页仍白屏；请从已登录客户端使用“手工导入 ExHentai Cookie”粘贴真实 Ex Cookie，生产验证成功后再启用切换；不跨域伪造 Cookie |
| BS-13 | S1 | 独立脚本曾显示自定义分类 21 条，但用户真实 DEV 书库持续显示默认分类 7 条 | 真实项目核对证明两者是不同账号身份：standalone 与 DEV 的不可逆身份指纹不同；DEV 内 E/Ex 身份相同，且两站 uconfig.php、favorites.php 均明确返回默认分类和总 7 条。另补齐 EhViewer 等价统一 CookieJar、响应 Cookie 回写、AbortController 和当前任务提交检查 | blocked by account state：代码无法把另一个隔离脚本账号的服务器收藏伪装到 DEV；需在 DEV 重新导入拥有自定义分类的正确账号 Cookie。当前 DEV 服务端/UI 均一致为 7 条；统一会话架构与旧任务取消已实现 |

Status values:
- `open`
- `fixing`
- `runtime checked`
- `blocked`
- `needs user gesture/visual test`

Keep entries compact. Update an existing row instead of appending narrative progress logs.
