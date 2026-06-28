# Run #12b Ground Truth — summary/rewrite 子类标注

## 标注方法

读取 `run-12b-output.md` 的 §1 原始结果、§2 fetch_content 正文归档、§3 P4 合并决策表与 §4 False Merge 审计。主指标只统计 `semantic-summary` 与 `semantic-rewrite`，且只计 high/medium confidence。

本轮 GT 采用 Cline Phase 0 给出的候选 pair 加人工复核方式：重点复核每个 P4 合并 pair 的正文 claim / code / step 对应关系，以及 §4 中相似但不合并 pair 的独立信息是否足以支持 negative 标签。未在 §3/§4 出现的所有成功 fetch URL 组合默认不计主指标，只在有明确关系时记录。

## 成功 fetch URL 索引

| # | URL | 说明 |
|---|-----|------|
| 1 | https://nextjs.org/docs/app/guides/upgrading/version-15 | 官方升级指南 |
| 2 | https://nextjs.org/docs/messages/sync-dynamic-apis | 官方错误说明 |
| 3 | https://nextjs.org/blog/next-15 | 官方发布博客 |
| 4 | https://github.com/vercel/next.js/issues/70899 | 官方团队迁移 issue |
| 5 | https://nextjs.org/docs/app/guides/upgrading/codemods | 官方 codemod 文档 |
| 6 | https://akr.moe/blog/next-15-migrate/ | 中文迁移摘要 |
| 7 | https://segmentfault.com/a/1190000045408427 | 中文发布概述 |
| 8 | https://www.amillionmonkeys.co.uk/blog/nextjs-15-upgrade-migration-strategy | 独立迁移经验 |
| 9 | https://www.jvictor.dev/blog/asynchronous-request-apis-in-next-js-15-a-major-shift-chapter-1 | 英文教程化改写 |
| 10 | https://blog.poetries.top/2025/05/11/nextjs-15-performance-react-apps/ | 中文教程化改写 |
| 11 | https://www.owolf.com/blog/upgrading-to-async-promise-based-searchparams-in-nextjs-15/ | searchParams 专题摘要 |
| 12 | https://dev.to/mahdijazini/async-apis-in-nextjs-15-whats-the-hype-all-about-4opo | 休闲风格同主题文章 |
| 13 | https://nextjs.net.cn/docs/app/guides/upgrading/version-15 | 官方指南中文翻译 |
| 14 | https://blog.csdn.net/gitblog_00910/article/details/152346139 | AI 生成低质同主题文章 |

## 配对分类表

| #A | #B | 类别 | 置信度 | 判断依据（1 行） | 是否计入主指标 |
|----|----|------|--------|------------------|----------------|
| 1 | 6 | semantic-summary | high | #6 是 #1 的中文压缩版，集中保留 async request API、instrumentation、turbopack 等核心 claim，代码迁移模式与官方指南对应，独立新增论证很少。 | 是 |
| 1 | 10 | semantic-rewrite | high | #10 按 #1 的升级准备、React 19、Async Request APIs、fetch/cache、其他变更结构重排，并加入中文解释和升级建议。 | 是 |
| 1 | 13 | semantic-translation | high | #13 是 #1 的中文翻译，结构与代码示例对应。 | 否 |
| 1 | 9 | semantic-rewrite | high | #9 按 cookies、headers、draftMode、params、searchParams 分类逐项教程化解释，与 #1 的 API 分类和迁移代码高度对应。 | 是 |
| 1 | 11 | semantic-summary | high | #11 聚焦 searchParams/params Promise 化，claim 是 #1 Async Request APIs 章节的子集，并保留 before/after 迁移形态。 | 是 |
| 3 | 7 | semantic-summary | medium | #7 压缩复述 #3 官方发布博客中的异步 API、Turbopack、缓存语义、Server Actions 安全等发布点，但带有社区化表达。 | 是 |
| 6 | 10 | same-topic different | high | 二者都来自 #1 主题，但 #6 是短摘要，#10 是长教程化重排；不是彼此的来源关系。 | 否 |
| 9 | 11 | same-topic different | high | #9 覆盖全部 async request APIs，#11 只聚焦 searchParams/params 并加入 parallel data fetching 场景。 | 否 |
| 1 | 8 | same-topic different | high | #8 有 47 个组件迁移、耗时、生产踩坑和第三方库兼容经验，包含大量 #1 不具备的独立实战信息。 | 否 |
| 8 | 9 | same-topic different | high | #8 是生产迁移经验，#9 是 API 分类教程化说明，内容类型与信息来源不同。 | 否 |
| 1 | 12 | same-topic different | medium | #12 语言风格和组织方式独立，只共享 async APIs 基础示例与迁移工具信息。 | 否 |
| 1 | 2 | same-topic different | medium | #2 是同步访问报错说明，范围窄且用途是错误修复；与 #1 官方升级指南有交叉但不是摘要/改写关系。 | 否 |
| 1 | 4 | same-topic different | medium | #4 是 canary 迁移 issue，包含迁移背景与 issue 语境，不是 #1 的摘要或改写。 | 否 |
| 1 | 5 | same-topic different | high | #5 是 codemod 命令索引与变换说明，主题交叉但功能范围不同。 | 否 |
| 1 | 14 | different | high | #14 主要是泛化性能优化与 AIGC SEO 内容，对 async request APIs 缺乏实质对应。 | 否 |
| 3 | 10 | same-topic different | medium | #10 覆盖升级指南结构，#3 是发布博客，二者共享发布点但文本结构与主用途不同。 | 否 |
| 3 | 13 | semantic-translation | medium | #13 翻译的是升级指南而非发布博客；与 #3 有发布点重叠但非 #3 的直接翻译，只作为非主指标语义近源记录。 | 否 |

## 统计

- verbatim 对数：0
- semantic-translation 对数：2
- semantic-summary 对数：3
- semantic-rewrite 对数：2
- same-topic different 对数：9
- different 对数：1
- 主指标语义同源对数（summary + rewrite，high/medium）：5

## 样本有效性结论

满足 `run-12-p4-summary-rewrite.md` §3 / §10.3 的进入条件：

| 门槛 | 结果 |
|------|------|
| fetch 完整性 | 通过：成功 14 个 URL，§2 已补齐完整正文或合规分块 |
| 主样本量 | 通过：summary + rewrite = 5 对 |
| 子类覆盖 | 通过：summary 3 对，rewrite 2 对 |
| 高置信标注 | 通过：计入主指标的 5 对均为 high/medium |
| False Merge 审计 | 通过：P4 主指标合并 pair 均落入 GT positive |

## 用户抽检建议

建议抽检以下 4 对：

| #A | #B | 原因 |
|----|----|------|
| 1 | 6 | high confidence summary |
| 1 | 10 | high confidence rewrite |
| 3 | 7 | medium confidence summary，最需要人工确认 |
| 1 | 8 | same-topic different，检验 false merge 审计 |
