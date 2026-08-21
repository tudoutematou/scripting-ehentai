# Scripting ↔ ChatGPT 联调桥

本仓库作为 Scripting 中 E-Hentai 浏览器脚本的唯一联调中转站。

## 数据流

1. Scripting 本地运行脚本。
2. 发生错误或完成一次验证后，将诊断信息追加到固定的“联调通道” Issue。
3. ChatGPT 读取 Issue 评论和仓库源码，分析并提交修复。
4. Scripting 再把仓库中的最新源码同步回当前本地脚本并验证。

## 诊断报告格式

请尽量提交 JSON，至少包含：

```json
{
  "time": "ISO-8601",
  "scriptVersion": "0.1.0",
  "stage": "startup | gallery-home | gallery-search | detail | preview | reader",
  "ok": false,
  "error": {
    "name": "TypeError",
    "message": "...",
    "stack": "..."
  },
  "request": {
    "url": "https://e-hentai.org/...",
    "status": 0,
    "statusText": ""
  },
  "notes": ""
}
```

## 隐私规则

禁止上传：Cookie、Authorization、密码、Token、完整账户信息、完整 HTML 页面。

搜索关键词默认可以省略；如果确实需要复现，只记录测试关键词，例如 `naruto`。

## 源码目录

当前 Scripting 项目源码同步到：

- `src/index.tsx`
- `src/script.json`
- 其他本地模块按原目录结构放入 `src/`

不要在 `bridge/` 中放业务源码。
