# 第三方项目与版权声明

本文件列出 v1.1.0 发布树中实际适用的第三方代码归属。

## JSEhViewer / SEhViewer

仓库中的 `src/browser.tsx`（E-Hentai 浏览器 Cookie 助手）基于以下 MIT 许可项目进行适配：

- JSEhViewer — Copyright (c) 2024 Gandum2077 (JSEhViewer)
- SEhViewer modifications — Copyright (c) 2026 Zerolost (SEhViewer modifications)
- 上游项目与许可证：<https://github.com/Zerolost/SEhViewer>

该文件保留来源和版权说明。其余 `scripting-ehentai` 代码不复制 EhViewer 的 Android 架构；项目与 EhViewer 没有隶属或合作关系。

## EhTagTranslation 运行时数据

`src/tagTranslation.ts` 是独立编写的 TypeScript 读取、校验、缓存和建议索引实现；它不包含或复制 `xiaojieonly/EhTagTranslation` 的 Python 生成器源码。

该模块在用户启用标签翻译时，会从下列公开上游地址按需下载中文标签翻译数据并仅在本地缓存：

- 数据分发仓库：<https://github.com/xiaojieonly/EhTagTranslation>
- 数据原始来源：<https://github.com/EhTagTranslation/Database>
- 数据许可证：<https://creativecommons.org/licenses/by-nc-sa/3.0/>

上游 README 明确说明该 `tag-translations-zh-rCN` 数据修改自 `EhTagTranslation/Database`，适用 **CC BY-NC-SA 3.0**；它不是 Apache-2.0 或本项目 MIT License 的一部分。本仓库未提交、打包或再分发该数据库。任何未来将该数据纳入源码包、发行附件或内置资源的变更，必须先按 CC BY-NC-SA 3.0 单独履行署名、非商业和相同方式共享要求，并更新本 Notice。

### 上游 MIT License

```text
MIT License

Copyright (c) 2024 Gandum2077 (JSEhViewer)
Copyright (c) 2026 Zerolost (SEhViewer modifications)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 平台与服务名称

Scripting、E-Hentai、ExHentai、EhViewer 及其相关名称、商标和服务标识归各自权利人所有。本项目是独立第三方客户端，不获得这些权利人背书，也不代表其立场。

## 本项目许可证

`scripting-ehentai` 自有代码及本 Notice 所列 MIT 许可适配代码以仓库根目录的 [MIT License](LICENSE) 发布。第三方运行时数据仍按其单独许可证提供；MIT License 不会重新授权该数据。若未来引入新的第三方代码、素材或依赖，应在发布前更新本文件并保留其要求的许可证文本与版权声明。
