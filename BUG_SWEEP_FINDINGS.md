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
| BS-14 | S1 | 用户在真实 iPad DEV 中搜索一个标签、只点开一条搜索结果；返回时却连续退过十余个不同画廊详情后才回到搜索/主页。42 秒录屏直接证明多个 GalleryDetail 被叠入同一 NavigationStack | 动态集合逐项创建 `NavigationLink` / destination 型 action，批量 link activation/重绘可叠入同一 NavigationStack | needs user gesture/visual test：已将搜索、图片搜索、封面搜索、继续阅读、Discovery、历史、MyTags、搜索书签、本地书签、详情标签和关联画廊统一为 Button + 单一 selected + 单一 `navigationDestination`；静态专项审计与完整 deterministic harness 均通过，DEV 启动保持交互。当前环境没有 App 内 UI 自动化，不能把“一次点击/一次返回”标为 runtime checked；需在最终 DEV 对每个指定场景实点确认 |
| BS-15 | S1 | 用户在搜索框输入中文标签提示词并从本地标签建议中选择精确标签后，搜索结果只有几十条且大量标题直接含该中文词；从任一详情页点击同一个真实标签却能得到数万条结果 | `SearchComposer.select()` 在把建议转换为 `GallerySearchTag` 时仍调用 `composeGallerySearchState(current,inputRef.current,[...tags,tag])`，先把用于找建议的中文草稿保存为普通 `keyword/rawQuery`，然后才清空输入框；因此 UI 看似只剩 tag chip，实际请求是“中文普通关键词 + 精确标签”。`composeGallerySearchState()` 明确把 plainText 与 `galleryExactTagTerm()` 同时拼进 `rawQuery` | runtime checked（搜索核心）· needs user gesture/visual test：选择建议现通过共享状态转换显式清空 keyword，不依赖 mutable-ref 时序；focused regression 覆盖“选中→纯 exact term、后输普通文本→组合、移除 tag→不复活草稿”。真实 DEV 当前 E 会话对同一 exact tag 的建议路径/详情标签路径均返回 25 条、首页条目一致。仍需用户在 UI 实点一次确认 chip/返回体验 |
| BS-16 | S1 | 用户打开 1323 页超长画廊时，详情页先在后台持续抓取预览库存，页面预览最终停在 1000；“查看全部/开始阅读”受完整库存门控，导致必须等大量预览分页加载，且超过上限的画廊永远无法被视为完整。录屏明确显示基本信息 1323 页但预览库存固定停在 1000 | 当前详情 mount 后只要 `core.previewPages>1` 就立即 `loadRemainingPreviewPages()`；该函数把所有预览分页一次性并发扫到 `MAX_PREVIEW_LIST_PAGES=50`，而当前服务器每预览分页约 20 个页面链接，因此形成约 1000 页硬上限。`hasCompletePreviewInventory()` 又要求 `!truncatedPreviewPages`，`inventoryReady` 同时要求 `!previewsLoading`，把预览、Reader 和下载错误地绑定到“先把整个画廊库存抓全” | open：重构为增量/按需 preview inventory。详情初次只使用 core 首批预览并立即可展示；预览浏览器向下接近末尾时再加载下一 preview page（小批次预取即可），不得 mount 即扫完整画廊。显示总页数使用服务器已知 page-count/metadata，而非 `pageLinks.length`。Reader 应能从已知起点开始并按接近库存边界继续加载页面链接；“查看全部”应进入可无限增量加载的预览场景，而不是要求全库存 ready。下载若确实需要完整库存，可在用户开始下载后单独逐批补全，并显示进度；不要让下载完整性要求阻塞普通预览/阅读。移除 50-preview-page 作为用户功能上限，只可保留合理并发/内存窗口。需用 100+、1000+ 真实画廊做 runtime smoke，确认首屏快速可用、滚动时继续加载、1323 页不再停在 1000 |
| BS-17 | S2 | 用户从脚本内“AI 助手”要求寻找并推荐某类画廊，实际得到的是通用聊天模型给出的关键词/标签建议，没有真实执行站内搜索，也没有返回候选画廊。截图中“帮我搜索 VR 有关的本子”被回答为一串 VRMMO/フルダイブ 等建议词 | `presentManagedAssistant()` 仅启动/展示 Scripting 通用 Conversation；是否调用 Assistant Tool 完全由模型自行决定。当前 Assistant Tool 虽支持 search/detail/favorites/history，但 `search` 只暴露 query/category/language，没有精确 include/exclude tags、页数、评分等搜索状态；脚本也没有“先真实搜索→取候选安全元数据→AI 排序推荐”的强制编排。因此前台“AI 助手”承诺感强于真实能力 | open：删除/隐藏当前前台 `💬 AI 助手` 通用聊天入口及容易产生同样误解的泛化 `问 AI` 行为；保留底层 Assistant Tool 作为 Scripting Agent 兼容能力。前台改为确定性的 `✨ AI 推荐`：用户自然语言→复用 `requestAISearch()` 生成并本地校验 SearchState→真实 `searchGalleries()` 获取候选→对有限候选（建议 8–12）仅加载轻量安全 metadata（标题/分类/页数/评分/上传者/标签，不得为了 AI 推荐枚举完整 preview inventory）→用当前 Scripting Assistant 对候选排序并返回 3–5 个真实推荐及理由→原生结果卡可直接打开 Gallery Detail。若没有足够候选，明确返回无结果/建议调整条件，禁止退化成只给关键词。Assistant Tool 仍可从 Scripting Agent 界面调用，但不再作为脚本内主要推荐 UX。需真实 DEV 输入自然语言条件，最终屏幕必须出现实际搜索得到的画廊候选，而非纯文字搜索建议 |

Status values:
- `open`
- `fixing`
- `runtime checked`
- `blocked`
- `needs user gesture/visual test`

Keep entries compact. Update an existing row instead of appending narrative progress logs.
