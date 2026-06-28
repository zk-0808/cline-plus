# Run #8a: MCP 后端切换验证（Node.js fetch → Python curl_cffi auto）

- **日期**: 2026-06-24（已执行，结论：否决 TLS 指纹假设）
- **主题**: MCP 基础设施层验证
- **改造项**: MCP 后端从 `npx duckduckgo-websearch`（Node.js）切换为 `uvx duckduckgo-mcp-server[browser] --fetch-backend auto`（Python + curl_cffi）
- **背景决策**: [D-2026-06-24-search-infra-mcp-upgrade.md](../../decisions/D-2026-06-24-search-infra-mcp-upgrade.md)（已 rolled-back）
- **触发条件**: Run #4（中文 query fetch 1/5）+ Run #6（中文 query fetch 1/10）共同确认中文 fetch 覆盖率低是基础设施瓶颈

---

## 实验设计

### 严格单变量

| 维度 | Control | Treatment |
|------|---------|-----------|
| MCP server | `npx -y duckduckgo-websearch`（Node.js） | `uvx "duckduckgo-mcp-server[browser]" --fetch-backend auto`（Python） |
| 测试 URL 集 | 同一份 10 个中文 URL | 同一份 |
| SKILL.md | 不动 | 不动 |
| P3/P4/Goggle | 不激活 | 不激活 |

### 测试 URL 集

10 个中文 URL，前 5 个来自技术事实型查询，后 5 个来自技术分析型查询：

| # | 类型 | URL | 站点 |
|---|------|-----|------|
| 1 | 事实 | https://blog.csdn.net/No_Game_No_Life_/article/details/108889042 | CSDN |
| 2 | 事实 | https://juejin.cn/post/7603688142005354505 | 掘金 |
| 3 | 事实 | https://blog.51cto.com/u_16175476/10344781 | 51CTO |
| 4 | 事实 | https://juejin.cn/post/7530958619598651401 | 掘金 |
| 5 | 事实 | https://blog.csdn.net/2402_89042144/article/details/156241667 | CSDN |
| 6 | 分析 | https://juejin.cn/post/7541313943647043610 | 掘金 |
| 7 | 分析 | https://www.cnblogs.com/softidea/p/19000896 | 博客园 |
| 8 | 分析 | https://blog.csdn.net/Lvyizhuo/article/details/161186063 | CSDN |
| 9 | 分析 | https://juejin.cn/post/7536094921498378278 | 掘金 |
| 10 | 分析 | https://juejin.cn/post/7540104329606709284 | 掘金

### 核心指标

| 指标 | 计算方式 | 当前基线 | 成功目标 |
|------|---------|---------|---------|
| **Fetch Coverage** | 成功返回页面的 URL 数 / 总 URL 数 | 1/10 (≈10%) | ≥ 7/10 |
| **Cloudflare 站点通过率** | 通过 Cloudflare 防爬的 URL 数 / 被 Cloudflare 保护的 URL 数 | 基本为 0 | ≥ 4/5 |

### 评分尺度

| 分数 | 条件 |
|------|------|
| 5/5 | Fetch Coverage ≥ 8/10 且 Cloudflare 通过率 ≥ 4/5 |
| 4/5 | Fetch Coverage ≥ 7/10 且 Cloudflare 通过率 ≥ 3/5 |
| 3/5 | Fetch Coverage ≥ 5/10 |
| 2/5 | Fetch Coverage ≥ 3/10 但 < 5/10 |
| 1/5 | Fetch Coverage < 3/10（无显著改善） |

---

## 执行提示词（复制到 Cline 执行）

### Run A（Control）—— 用当前 Node.js MCP 抓取

把以下内容复制到 Cline 对话框执行：

````
注意：不激活 search-orchestrator SKILL.md 中的任何 Goggle/P3/P4 规则，只做裸 fetch。

请用 duckduckgo MCP 的 fetch_content 工具，依次抓取以下 10 个中文 URL，记录每个的返回状态。

URL 列表：
1. https://blog.csdn.net/No_Game_No_Life_/article/details/108889042
2. https://juejin.cn/post/7603688142005354505
3. https://blog.51cto.com/u_16175476/10344781
4. https://juejin.cn/post/7530958619598651401
5. https://blog.csdn.net/2402_89042144/article/details/156241667
6. https://juejin.cn/post/7541313943647043610
7. https://www.cnblogs.com/softidea/p/19000896
8. https://blog.csdn.net/Lvyizhuo/article/details/161186063
9. https://juejin.cn/post/7536094921498378278
10. https://juejin.cn/post/7540104329606709284

对每个 URL，判断：
- 成功：返回清洗文本正文，长度 > 100 字符
- 失败：返回 Error，空内容，或 < 100 字符

输出表格：

| # | URL | 状态 | 返回长度 | 备注 |
|---|-----|------|---------|------|

只输出表格，不需要额外分析。
````

### Run B（Treatment）—— 切换 MCP 后端后用 Python curl_cffi 抓取

**先修改 MCP 配置**：把 `npx duckduckgo-websearch` 替换为 `uvx "duckduckgo-mcp-server[browser]" --fetch-backend auto`。

确认配置生效后，把以下内容复制到 Cline 执行：

````
注意：不激活 search-orchestrator SKILL.md 中的任何 Goggle/P3/P4 规则，只做裸 fetch。

请用 duckduckgo MCP 的 fetch_content 工具，依次抓取以下 10 个中文 URL，记录每个的返回状态。

URL 列表（同 Run A）：
1. https://blog.csdn.net/No_Game_No_Life_/article/details/108889042
2. https://juejin.cn/post/7603688142005354505
3. https://blog.51cto.com/u_16175476/10344781
4. https://juejin.cn/post/7530958619598651401
5. https://blog.csdn.net/2402_89042144/article/details/156241667
6. https://juejin.cn/post/7541313943647043610
7. https://www.cnblogs.com/softidea/p/19000896
8. https://blog.csdn.net/Lvyizhuo/article/details/161186063
9. https://juejin.cn/post/7536094921498378278
10. https://juejin.cn/post/7540104329606709284

对每个 URL，判断：
- 成功：返回清洗文本正文，长度 > 100 字符
- 失败：返回 Error，空内容，或 < 100 字符

输出表格：

| # | URL | 状态 | 返回长度 | 备注 |
|---|-----|------|---------|------|

只输出表格，不需要额外分析。
````

---

## 结果记录

### 实测数据

| 指标 | Run A (Node.js fetch) | Run B (Python curl_cffi auto) |
|------|----------------------|------------------------------|
| Fetch Coverage（旧定义：清洗正文 >100 字符） | 0/10 | 0/10 |
| HTTP Success Rate（**新指标**：HTTP 层返回 200） | ~5/10（juejin × 5） | ~5/10（juejin × 5） |
| Content Success Rate（**新指标**：拿到目标正文） | 0/10 | 0/10 |
| Cloudflare 通过率 | 0/5 | 0/5 |
| 评分 | 1/5 | 1/5 |

### 失败模式分布

| 站点类型 | 站点 | Run A 表现 | Run B 表现 |
|---------|------|-----------|-----------|
| 反爬一刀切 | CSDN（× 3）、51CTO（× 1）、cnblogs（× 1） | `Error: fetch failed` | `Error: Could not access` |
| Cloudflare JS Challenge | juejin（× 5） | "Please wait..."（12 字符） | "Please wait..."（14 字符） |

### 关键观察

1. **TLS 指纹模拟未带来任何提升**：Run B 切换到 Chrome TLS 指纹后，10/10 仍然失败。原决策预测 7~8/10，实测 0/10，差距巨大。
2. **Fetch Success ≠ Content Success**：juejin 在两轮中都返回了 HTTP 200 + "Please wait..." 假页面（典型 Cloudflare JS Challenge），说明 HTTP 层成功但内容层失败。旧指标 Fetch Coverage 把两类失败混在一起，需要拆分。
3. **12 vs 14 字符的差异**佐证 Run B 确实跑了不同的 MCP server（不是缓存），即 Python curl_cffi 路径确实被加载，只是它解决不了 JS Challenge 这层防护。

### 结论

**假设 disproven**：「仅靠 TLS 指纹模拟即可解决中文 fetch 覆盖率」这一命题已被否决。

### 当前最强解释（新假设）

| 假设 | 证据 | 置信度 |
|------|------|--------|
| H1 TLS 指纹是主因 | Run #8a 0 提升 | **低（已否决）** |
| H2 Cloudflare JS Challenge | juejin 全部返回 "Please wait..." | **高** |
| H3 IP Reputation / Datacenter Ban | CSDN/51CTO/cnblogs 直接拒绝；具体 HTTP 状态未捕获 | 中 |

H2 不可能用 TLS 模拟解决——需要真正的 JavaScript 引擎执行 Cloudflare 的挑战脚本并取回 cookie。这指向新的机制候选 **M-22 Browser-backed Fetch**（Playwright / Headless Chromium）。

H3 需要外部验证（如本地 `curl` 同样 URL，对比 HTTP 状态码），但不影响本次否决结论。

### 后续动作

| 动作 | 状态 |
|------|------|
| MCP 配置切回 `npx duckduckgo-websearch` | ✅ 切回 |
| D-2026-06-24-search-infra-mcp-upgrade 决策状态 | rolled-back |
| 新增 M-22 Browser-backed Fetch 候选 | 已写入 `mechanism-candidates.md` |
| Run #8b（snippet fallback）是否启动 | 解耦，由 V2 路线另行决定 |

**决策**：☑ 退回 Node.js 版，中文场景在当前 MCP 生态下永久 Tier C（snippet-only）；如需提升 fetch 覆盖率，后续走 M-22 Browser-backed Fetch。

---

## 参考

- [D-2026-06-24-search-infra-mcp-upgrade.md](../../decisions/D-2026-06-24-search-infra-mcp-upgrade.md)
- [web-search-setup.md](../../references/web-search-setup.md)
- upstream README: [nickclyde/duckduckgo-mcp-server](https://github.com/nickclyde/duckduckgo-mcp-server)
