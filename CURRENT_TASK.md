# CURRENT_TASK — Local DEV landed on main

Branch: `main`  
HEAD at last code sync: `3b045efec733737be531dfc8320b82a6e7231065`

## Status

2026-09-13 之后的本地 DEV 改动已写入 `main`（2026-09-22）：原生 UI 统一、收藏搜索、账户概览、阅读器真实加载进度、回车搜索、保存书签与导航抢点击修复。Do not start P3.

## Device QA

- 保存搜索应弹出命名框并留在当前页，不应跳进搜索书签列表。
- 大 GIF 阅读页应显示真实下载进度。
- 发现页回车搜索应进入结果页。
- iPad 侧栏收放、详情返回、预览点指定页、继续阅读跨首批仍需真机确认。

## Out of scope

Redux, EventBus, Repository/Factory, SQLite, download rewrite, Navigation rewrite, splitting GalleryFlow because it is long, background downloads, H@H, Wi-Fi transfer, DoH.
