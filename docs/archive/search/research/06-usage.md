# 06 — Usage Guide

> 本章面向想在自己的 Cline 环境中应用本研究产物的开发者。
>
> 完整安装步骤见 [skills/search-orchestrator/references/web-search-setup.md](../../skills/search-orchestrator/references/web-search-setup.md)。本文件是浓缩版 + 选择指引。

---

## 1. 三种使用形态

| 形态 | 包含 | 适用 |
|------|------|------|
| **A 仅 SKILL** | search-orchestrator skill（6 个 P 级机制） | 只想用提示词层强化，不在意 BOT_DETECTED |
| **B 仅 wrapper** | search-mcp-wrapper（节流） | 已有自己的 search skill，只想加节流 |
| **C 完整** | SKILL + wrapper（推荐） | 复现本研究栈 |

---

## 2. 前置依赖

| 依赖 | 版本 | 检查 |
|------|------|------|
| Node.js | ≥ 18 | `node -v` |
| Cline | 任意支持 MCP 的版本 | VS Code 扩展市场安装 |
| DuckDuckGo MCP（直连）或 wrapper | — | 见下文 |

无 API key、无付费后端、无需 Docker。

---

## 3. 形态 A：仅 SKILL

### 3.1 复制 skill

```
把 skills/search-orchestrator/ 整个目录复制到 Cline 的 skill 加载路径
（默认：~/.cline/skills/ 或项目内 .cline/skills/）
```

### 3.2 配置 DDG MCP（直连 npx）

编辑 Cline 的 MCP 配置文件（`cline_mcp_settings.json`）：

```json
{
  "mcpServers": {
    "duckduckgo": {
      "autoApprove": ["search"],
      "disabled": false,
      "timeout": 60,
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "duckduckgo-websearch"]
    }
  }
}
```

### 3.3 验证

重启 Cline 后跑一次测试：

```
请用 duckduckgo MCP 搜索 "model context protocol"，返回前 3 条结果。
```

预期：3 条结果，每条含 title / url / snippet。

---

## 4. 形态 B：仅 wrapper

### 4.1 安装

```bash
cd search-mcp-wrapper
npm install
npm run build
```

### 4.2 配置

编辑 `cline_mcp_settings.json`：

```json
{
  "mcpServers": {
    "duckduckgo": {
      "autoApprove": ["search"],
      "disabled": false,
      "timeout": 60,
      "type": "stdio",
      "command": "node",
      "args": ["<path-to-search-mcp-wrapper>/build/index.js"]
    }
  }
}
```

> ⚠️ **路径用正斜杠 `/`**（Cline JSON 兼容）。`<path-to-search-mcp-wrapper>` 替换为你的实际绝对路径或项目相对路径。

### 4.3 验证

```bash
cd search-mcp-wrapper
npm test
```

预期：11/11 集成测试通过。

### 4.4 wrapper 行为速查

| 行为 | 说明 |
|------|------|
| 强制 `max_results ≤ 10` | 禁分页，从根上消除 vqd 翻页连击 |
| 3 次失败阈值熔断 | 1h 滑动窗口内 3 次 `BOT_DETECTED` 触发 |
| 指数退避 | 30s → 2min → 10min（封顶） |
| 跨调用状态 | wrapper 进程内持久（重启 Cline 才清） |
| 成功完全恢复 | 一次成功调用清空所有失败状态 |
| fetch_content 透传 | 不加节流（与 search 反爬正交） |

---

## 5. 形态 C：完整（推荐）

### 5.1 步骤

1. 复制 `skills/search-orchestrator/` 到 Cline skill 加载路径
2. `cd search-mcp-wrapper && npm install && npm run build`
3. 配置 `cline_mcp_settings.json` 用 wrapper 路径（见 §4.2）
4. 重启 Cline

### 5.2 三层职责图

```
┌─────────────────────────────────────────┐
│  Skill 层（search-orchestrator/SKILL.md）│
│  ├─ P1 Goggles / P1.5 FinalScore        │
│  ├─ P3 三档 Citation                    │
│  ├─ P4 同源合并                         │
│  ├─ P5 Gap Ledger                       │
│  └─ P6 Highlights                       │
└────────────────┬────────────────────────┘
                 │ 调用 search / fetch_content
                 ↓
┌─────────────────────────────────────────┐
│  Wrapper 层（search-mcp-wrapper）         │
│  ├─ 强制 max_results ≤ 10               │
│  ├─ 3 次熔断 + 指数退避                  │
│  ├─ 串行化链防并发穿透                   │
│  └─ fetch_content 透传                   │
└────────────────┬────────────────────────┘
                 │ stdio
                 ↓
┌─────────────────────────────────────────┐
│  上游（duckduckgo-websearch）             │
│  └─ DDG 后端（基于 Bing）                │
└─────────────────────────────────────────┘
```

**职责边界**：
- Skill 层做方法论（Goggle 过滤 / Citation 强制 / 去重 / Gap 枚举 / highlights 抽取）
- Wrapper 层做反-bot 节流（基础设施）
- 上游做实际 search / fetch
- 三层互不替代

---

## 6. 验证装机

重启 Cline 后跑一次完整流程：

```
请用 search-orchestrator skill 调研：PostgreSQL 17 vs MySQL 8.4 在 MVCC 实现上的差异。

要求：
1. 走完整 Plan → Search → Evaluate → Synthesize 四阶段
2. 用 zh-tech goggle（中文技术调研）
3. 每条 Claim 必须有 Quote + Source（P3 三档模式）
4. 合成前先产出 Gap Ledger（P5）
5. fetch 后先做 highlights ≤500 token（P6）
```

### 预期看到

- Phase 0：Plan（sub-Q 分解 + L2 复杂度档位）
- Phase 1：Search + fetch + **P6 Highlights**（每条 ≤500 token verbatim）
- Phase 1.4.5：**P4 同源合并**（标注 [同源合并]）
- Phase 3.5：**P1 Goggle**（BOOST/DOWNRANK/DISCARD 打标）+ **P1.5 FinalScore** 重排
- Phase 4.1：**P5 Gap Ledger**（强制枚举证据缺口）
- Phase 4.3：**P3 三档 Citation**（Claim / Quote / Source 三元组）

### 故障排查

| 现象 | 排查 |
|------|------|
| `npx not found` | Node.js 未安装或未加入 PATH |
| `MCP server failed to start` | 检查 JSON 语法 |
| `BOT_DETECTED` | DDG 反爬触发，等几分钟再试；或切到 wrapper 形态 |
| `CIRCUIT_OPEN` | wrapper 熔断中，看 `blockedUntil` 时间 |
| SKILL 未加载 | 检查 skill 目录路径；Cline skill 通常需 symlink |
| fetch 中文站点失败 | 永久 Tier C（Run #4/6 已确认），不阻塞机制 |
| `site:` 触发 BOT_DETECTED | SKILL §1.4.2.ter R2 降级为自然语言关键词 |

---

## 7. 机制选择指引（按场景）

### 7.1 中文技术调研

```
Goggle: zh-tech
强制动作：
  - DISCARD toutiao / bjh / 360doc / csdn 农场
  - DOWNRANK 转载站（segmentfault 等）
  - BOOST juejin / 官方文档 / *.dev
fetch 期望：Tier C（1/10 成功）
P3 模式：降级模式（[P3 Coverage Low]）
P4：verbatim 同源合并为主
```

### 7.2 英文技术调研

```
Goggle: general-tech
fetch 期望：Tier A（5/5 成功）
P3 模式：完整 P3（Claim / Quote / Source 三元组）
P4：translation / summary / rewrite 子类均可能触发
P6：跨语言归纳倾向（标注置信度 Low）
```

### 7.3 学术 / 论文

```
Goggle: academic
强制动作：
  - BOOST arxiv / *.edu / semanticscholar / openreview
  - DOWNRANK medium / dev.to
  - DISCARD pinterest / quora
P5 Gap Ledger：必查"证据过时"（学术论文有时效）
```

### 7.4 安全审计

```
Goggle: security
强制动作：
  - BOOST CVE 数据库 / vendor security advisory
  - DISCARD 教程站
P5 Gap Ledger：必查"缺反证"（仅 vendor advisory 无第三方证实）
```

### 7.5 产品选型

```
Goggle: product-research
强制动作：
  - BOOST 官方文档 / GitHub repo
  - DISCARD 商业广告页
P5 Gap Ledger：必查"范围外推"（仅一个版本验证，外推到全版本）
```

---

## 8. 反模式（避免）

| 反模式 | 为什么不用 | 替代 |
|--------|-----------|------|
| 不跑 A/B 就改 SKILL.md | 违反 [ab-test-template.md §6](../../skills/search-orchestrator/examples/ab-test-template.md) | 用模板做一次 A/B |
| 用人造 query 测试 | 看不见真实污染 | 用真实场景里最近会问的问题 |
| 同一 query 反复跑求平均 | 浪费搜索配额，不增加信息 | 跑一次，存档，下次改进对照 |
| 用 BOOST 命中率作指标 | 偏向扩白名单陷阱 | 用垃圾清除率 + Top-5 权威度变化 |
| 不存档结果 | 下次改进无对照基线 | 每次跑完存 `run-N-*.md` |
| 在 SKILL 层做基础设施层的事 | 用提示词解决运行时问题；提示词无法根治执行层缺陷 | 下沉到代码（如 #24 wrapper） |
| 在 wrapper 层做 SKILL 层的事 | 节流不应做 Goggle 过滤；filter 不应做反-bot | 严守三层职责分离 |

---

## 9. 扩展机制（候选未落地）

下列机制目前未 active，按需启动：

| 候选 | 触发条件 | 启动建议 |
|------|---------|---------|
| #20 反证检索 | 需要负向 query 召回时 | 分拆负向短语单发；不指望 DDG 理解否定 |
| #21 多样性排序 | 需要数值排序时 | 算分必须出 LLM 进代码层；LLM 只做语义判断 |
| #22 Browser Fetch | Tier C snippet-only 严重影响答案质量时 | 多层叠加方案（住宅代理 + 真实浏览器 + solver），非裸 Playwright |
| P2 fanout | 多路 query 检索 | 用 Cline 原生 subagent，不在 skill 内建 |
| P5 完整 Evidence Map | 不再推进 | 两代双盲证伪；只 Gap Ledger 最小机制升级 active |

---

## 10. 升级与回滚

### 10.1 wrapper 升级路径

- 当前方案 C（薄 wrapper + 禁分页）覆盖 #24 ①②③
- 若需要 >10 结果或 backend 切换 → 升级方案 A（fork 上游）
- C 是 A 的子集，升级无沉没成本

### 10.2 回滚配置

若 wrapper 引入新问题需回滚：

```json
{
  "mcpServers": {
    "duckduckgo": {
      "autoApprove": ["search"],
      "disabled": false,
      "timeout": 60,
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "duckduckgo-websearch"]
    }
  }
}
```

回滚动作：

1. MCP 配置切回 `npx -y duckduckgo-websearch` 直连
2. #24 回退到「候选」
3. 决策 status 改为 `rolled-back`
4. 实验 Run 回退到人工节流 workaround

---

## 11. 维护

### 11.1 wrapper 维护

- 上游 `duckduckgo-websearch` 升级时跑一次 `npm test` 验证兼容性
- DDG 后端策略变更（如重新支持 `site:`）时，移除 SKILL §1.4.2.ter R2 降级方案
- Cline MCP 协议升级时，检查 `@modelcontextprotocol/sdk` 版本

### 11.2 SKILL 维护

- 修改任意 Phase 硬性流程 → 必跑 A/B（见 [ab-test-template.md](../../skills/search-orchestrator/examples/ab-test-template.md)）
- 调整预置 Goggle / 权威分级 → 必跑 A/B
- 仅修文字 / 排版 / 注释 → 不用跑
- 验证不通过 → 改造回退或回炉

### 11.3 决策与实验同步

按 [project-rules.md](../project-rules.md) 五条防漂移约束：

| 触发 | 同步动作 |
|------|---------|
| 落地新决策 | survey.md §9.1 决策表加一行 |
| 决策 status 变更 | survey.md §9.1 同步 + mechanism-candidates 对应条状态改 |
| 完成 A/B 实验 | survey.md §9.2 实验表加一行 |

详见 [02-methodology.md §5](02-methodology.md)。
