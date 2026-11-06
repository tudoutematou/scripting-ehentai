# 客户端模块化记录

## 当前结论（2026-11-06）

**客户端功能模块化审查快照：同步至 `review/client-modularization`，未合并 main，等待独立审查。**

范围包括原 GalleryFlow 的图片基础层、恢复策略、在线/连续/离线阅读、作品呈现、发现与搜索、账号和诊断、详情/预览/资源，以及 LibraryScene 的导航循环与 selfTest 聚合耦合。不是把整个后端 API/存储体系重写；既有 ehentai/libraryStore/favorites/account 已有领域模块继续复用。没有增加框架、依赖、数据库或全局路由注册表。

本分支基线为 main `55d49ed8f630ea25206ab30c0730e8af6e9f9000`，保留该基线的 `src/assistant_tool.json`。未合入 PR #32 的独立重构实现。本机 script.json 固定导入配置不改，旧 DEV 不改。

## 模块地图

| 责任 | 文件 |
|---|---|
| 装配与兼容入口 | GalleryFlow.tsx（54行，仅工厂装配及兼容导出）、LibraryScene.tsx（3行兼容导出） |
| 明确导航目标契约 | sceneDestinations.ts |
| 图片队列/缓存/进度/请求 | imageLoader.ts、imageStorage.ts |
| 错误分类与恢复 | networkErrors.ts、readerRecovery.ts |
| 性能记录/实验编排 | imagePerformance.ts、imagePerformanceRunner.ts、ImagePerformanceUI.tsx |
| Reader 模型与共享呈现 | readerModel.ts、ReaderUI.tsx、ReaderImages.tsx |
| 在线/连续/离线/续读 | OnlineReader.tsx、ReaderImages.tsx、OfflineReader.tsx、ContinueReader.tsx |
| 会话及页面推入所有权 | viewScope.ts |
| 作品身份、文案、模型、生命周期 | galleryIdentity.ts、galleryCopy.ts、galleryModel.ts、galleryLifecycle.ts |
| 作品图片和纯卡片 | GalleryImages.tsx、GalleryCards.tsx |
| 带导航的作品网格 | GalleryNavigation.tsx |
| 搜索与发现 | SearchScenes.tsx、searchModel.ts、searchBookmarks.ts、DiscoverScene.tsx、discoverModel.ts |
| 详情与预览 | GalleryDetailScene.tsx、GalleryDetailUI.tsx、GalleryPreviews.tsx、previewModel.ts |
| 评论/种子/归档 | GalleryResources.tsx |
| 账号与图片诊断页 | AccountScene.tsx、ImageDiagnosticsScene.tsx、diagnosticReport.ts |
| 书库场景与收藏分类模型 | LibraryScenes.tsx、favoriteCategoryModel.ts |
| 根导航及纯契约 | appV2.tsx、appNavigationModel.ts |
| 测试聚合与支持 | selfTest.ts、selfTestSupport.ts |
| 分领域回归 | accountChecks.ts、imageChecks.ts、applicationChecks.ts、discoveryChecks.ts、galleryChecks.ts、readerChecks.ts、libraryChecks.ts |

原GalleryFlow约651行的超长混合实现已经移走；行数仅为原格式计数，不用于衡量复杂度。部分搬迁的组件仍是超长行，本轮刻意不混入大面积格式化或行为重写。

## 依赖与导航决定

### 为什么不是简单拆文件

原 Search/Detail/Grid/Library 都需要打开彼此页面。直接各自import会把大文件内耦合改成跨文件循环。现在五个场景模块通过明确的 `Pick<SceneDestinations,...>` 声明自己需要的导航目标，由 GalleryFlow 装配一次：

- createGalleryNavigation
- createSearchScenes
- createDiscoverScene
- createGalleryDetailScene
- createLibraryScenes

它们只是定义稳定组件，不在工厂构造期间调用目标、发请求、写存储。装配根使用稳定的 JSX 转发组件在渲染时解析相互导航；**不得直接调用含 Hooks 的组件函数，也不得在render中重新创建这些工厂。** 类型化props来自原接口，无新增万能事件总线、全局注册表、Context或服务容器。

功能模块不能import GalleryFlow/LibraryScene。LibraryScene只为旧入口保留同一装配实例的导出；不再有GalleryFlow↔LibraryScene运行时循环。共享作品呈现不依赖详情或发现，Reader入口不依赖搜索/书库UI。测试直接导入所有者模块；GalleryGrid契约用真实工厂和最小无IO目标，不为了测它初始化整个客户端。

运行时依赖扫描无环。原detailHtml↔extractors存在双向**纯类型**引用，本轮保留，不错误宣传连类型图也无环。

## 行为保护

### 图片与恢复（前两轮）

- networkErrors按取消→明确HTTP状态→明确超时/网络类型和错误码→文字兜底分类；TypeError不是无条件网络故障。
- HTTP包装保留status/code；图片HTTP抛结构化status。
- readerRecovery统一后台失败提升与当前图恢复的决策入口，但保留job与page+quality两个不同生命周期预算。手动重试不消耗自动预算。
- 当前页恢复记录仍有界150，淘汰后旧页可再恢复一次，与原语义一致。
- 图片全局8、慢主机2、Reader后台3，普通图15s/Reader20s，内存300。Reader key仍generation|URL，其余URL-only。
- Promise身份清理、epoch、最后消费者abort owner、真正工作结算才释放槽位、账号失效hook、失败地址定点失效保持。
- imageStorage的校验和目录实现来自原libraryStore，不复制；libraryStore为旧调用者保留导出。
- 性能编排通过公开只读正常请求计数判断干扰；统计口径历史问题不在这轮修改。

### 后续功能搬迁

187个声明实现按原文校验（只允许export修饰符/工厂闭包变化）。两项无语义常量调整：拆开预览宽高与eager常量、eagerHomeThumb直接使用原数值6。

Reader会话取消、翻页不abort在途、首次后台失败提升、有限网络恢复、离线增量、当前实际页索引、自动播放、预览选择/分页、详情收藏下载和导航所有权均保留。账号、下载schema、Photos不可逆保存与确认机制未改。

本轮所有存量150测试体逐字保留，执行顺序保持。selfTest按名称注册并检查缺失/重复，不能悄悄漏掉领域集合。七组数量：账号27、图片9、应用13、发现14、画廊32、Reader19、书库36。

## 验证结果

| 检查 | 结果 |
|---|---|
| 完整自测精确统计 | 150/150，failed=[] |
| 预加载专项 | 21/21 |
| 公共页面入口 | 22入口可加载 |
| 五个工厂构造 | 5/5，目标调用0，无初始化导航副作用 |
| 运行时依赖图 | 82个TS/TSX文件，无循环 |
| 搬迁实现等价性 | 187声明通过 |
| 测试保全 | 150测试体及原顺序一致，无skip或阈值降低 |
| 图片原文虚拟IO（前轮，生产实现本轮未变） | 7/7，取消保护负对照能失败 |
| 实际Reader模块原生挂载 | 500→100→500、一次TLS恢复、两次失败不循环、首20库存续读500、连续阅读、离线增量props挂载通过 |
| Reader固定key负对照 | 明确失败，证明指定页测试可发现复用旧实例 |
| 场景原生装配 | 发现、详情、全部预览、搜索、书库、ResponsiveShell通过 |
| 全项目TypeScript | 83条，与前轮一致；原问题随实现迁移，未添加忽略 |

Reader与场景原生验证使用实际模块原文，替换网络/文件/账号等适配层，不发真实网络、不保存Photos、不改真实阅读进度或下载清单。没有请求截图；挂载和回调验证不等于实体触摸/键盘/所有iPad导航/所有H@H节点端到端验收。

校准记录：Reader恢复测试最初把保留上一页的预取算入当前页，校准后按p500计两次；详情fixture遗漏relations导致装配异常，补齐fixture后无异常；单批预览fixture触发既有Slider max=min告警，多批fixture验证正常。**单批预览Slider告警是发现的既有边界问题，未在无行为重构中顺带修改，后续如处理应单独测试/修复。**

独立子代理因会话上限无法启动，没有声称获得独立代理审查。

## 证据与回滚

workspace目录：

- reader-modularization-before / reader-modularization.diff：第一轮
- image-layer-before / image-layer.diff / image-layer-verification.json：第二轮
- full-modularization-before：本轮前完整源码快照，包含前两轮成果
- full-module-map.json：声明归属及场景端口
- domain-check-map.json：测试分组及原顺序
- full-modularization-static.json：依赖和实现等价性证据
- full-modularization-verification.json：最终验证汇总及源码SHA256
- full-modularization.diff：本轮完整差异
- full-modularization-reviewed：审查源码快照，不含本机script.json/缓存/QA
- modular-reader-native：实际Reader模块原生隔离
- modular-scene-native：实际装配及场景原生隔离

一次性迁移脚本不可盲目重跑。临时验证入口均移出DEV。回滚当前轮只恢复full-modularization-before中原文件并删除本轮新增源码，不覆盖真实缓存/下载/账号数据；前两轮需按各自快照单独处理。

## 不属于本次完成承诺

未发布或推送；未修复既有83条类型问题、硬件键盘、iPad系统锁定下强转、历史性能统计口径、单批Slider告警。未另行重构既有API和存储后端；本次完成的是约定的客户端功能职责与依赖模块化，不是无限拆分所有文件。
