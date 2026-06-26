# Handoff — Run #14 闭环（P5 Gap Ledger 升级 active）+ #24 wrapper 落地 + 准备项目化发布

## 本会话决策

| 决策 | 状态 |
|------|------|
| Run #14 Phase 0b 续跑（wrapper 落地后） → 18 条 P3 evidence + 9 gap + 5 relation 的 gap 密集证据池 | ✅ 完成 |
| Run #14 Phase 0c GT 密封（9 gap = 4 显性 + 5 隐性，5 material relation） | ✅ 完成 |
| Run #14 Phase 1a/1b 盲态双轨（Run A 自由文本 / Run B Gap Ledger + 自由文本） | ✅ 用户在 Cline 跑完 |
| Run #14 Phase 2 评分 4/5 → **P5 Gap Ledger 升级 active**（进入 SKILL.md §4.1） | ✅ 完成 |
| #24 wrapper 实现（方案 C：强制 max_results≤10 + 3 次失败熔断 30s/2min/10min 指数退避 + fetch 独立通道） | ✅ 落地，11/11 测试 + 子代理两轮 review + Run #14 功能性验证通过 |
| #24 决策文档 status: proposed → active | ✅ 完成 |
| SKILL.md §1.4.2.ter 新增 R2 降级方案（site: 不可用时降级为自然语言关键词） | ✅ 完成 |
| 准备项目化发布 GitHub（整理全部文档） | ⏳ 下一步 |
| 写 handoff | ✅ 用户口头要求 + 主题切换（实验 → 项目发布），触发 project-rules.md 4.a + 4.c |

---

## 本会话净变化

### 1. Run #14 闭环（P5 Gap Ledger 最小机制双盲验证，4/5 升级 active）

权威文件：[run-14-p5-gap-ledger.md](search-orchestrator/experiments/run-14-p5-gap-ledger.md)

**实验设计**：单变量隔离（Run B 只追加 Gap Ledger 一步，不做节点-边/Conflict Ledger），gap 密集证据集（GT 9 gap = 4 显性 + 5 隐性 + 5 material relation），query 锚定 Cloudflare 反爬方案选型（#22 范畴，天然 gap 密集）。

**结果**：

| 指标 | Run A | Run B | Δ |
|------|------:|------:|--:|
| Gap Detection Recall | 3/9 = 33.3% | 8/9 = 88.9% | **+55.6%** |
| Implicit Gap Recall | 2/5 = 40% | 4/5 = 80% | +40% |
| Material Relation Recall | 5/5 = 100% | 5/5 = 100% | 0 |
| Traceability Rate | ~100% | ~100% | 0 |
| False Gap Count | 0 | 1 | +1 |
| Unsupported Relation Count | 0 | 0 | 0 |
| Information Loss Count | 0 | 0 | 0 |
| Answer Verbosity Delta | 基准 | +36% | +36% |

**评分 4/5**：Gap Δ +55.6% 远超 4/5 阈值 +20%（接近 5/5 阈值 +30%），Implicit Δ +40% 满足 5/5 隐性要求，安全指标全部不退化。未达 5/5 的唯一原因：False Gap = 1（Run B G15 把 cloudscraper"已淘汰"误标为"侦察用途待评估"）。

**落地**：[SKILL.md §4.1](../skills/search-orchestrator/SKILL.md) 新增 Gap Ledger 章节（强制证据缺口枚举，合成前必做），含输出格式 / gap 类型枚举（缺反证 / 无直接对比 / 单一来源 / 证据过时 / 范围外推）/ 5 项隐性缺口必查清单 / Iron Law 边界 / false gap 失败模式警示。原 4.1-4.4 递增为 4.2-4.5。

**P5 路线终态**：完整 Evidence Map / Claim Graph 保持 proposed，不再推进（Run #9c / Run #13 两代结构化中间表示双盲证伪）。仅 Gap Ledger 最小机制升级 active。

### 2. #24 MCP 反-bot 节流 wrapper 落地（方案 C）

权威文件：[D-2026-06-26-search-adopt-mcp-throttle-wrapper.md](decisions/D-2026-06-26-search-adopt-mcp-throttle-wrapper.md)（status: active）

代码：[search-mcp-wrapper/](../search-mcp-wrapper/) — 4 文件（package.json / tsconfig.json / src/index.ts / src/test/integration.ts）

**设计**：薄 wrapper 包 duckduckgo-websearch 上游，强制 cap max_results≤10（禁分页，消除 vqd 连击）+ 3 次 BOT_DETECTED 触发熔断（30s/2min/10min 指数退避，circuitBreakCount 递增）+ 串行化链防并发穿透 + fetch_content 独立通道（与 search 反爬正交，熔断期可正常调用）。

**验证**：
- 11/11 集成测试通过
- 子代理两轮 code review 通过（第一轮发现 2 严重问题：N=2 早熔断 vs 决策文档 3 次阈值，修正后复审 0 严重 0 建议）
- Run #14 Phase 0b 功能性验证通过：3 次熔断正确触发指数退避，fetch 独立通道不受影响，降级规约正确执行

**暴露的上游特性（非 wrapper bug）**：DDG 后端对 `site:` 100% 触发 BOT_DETECTED、`OR` 部分触发、单引号最稳定。需 SKILL 层调整 R2 策略（已落地 §1.4.2.ter）。

**V2 可选扩展（暂缓）**：④ backend 切换（Brave/Bing MCP），触发条件为 DDG 持续不可用。

### 3. SKILL.md §1.4.2.ter R2 降级方案

[SKILL.md §1.4.2.ter](../skills/search-orchestrator/SKILL.md)：site: 不可用时降级为自然语言关键词（如 `reddit` / `hacker news`），单站点单 query 避免 OR 复合触发检测，连续 2 次失败跳过 R2 并在 Gap Ledger 标注。Run #14 实测有效。

---

## 本会话新增文件

| 文件 | 说明 |
|------|------|
| `search-mcp-wrapper/package.json` | wrapper 包定义 |
| `search-mcp-wrapper/tsconfig.json` | TS 配置（rootDir: ./src） |
| `search-mcp-wrapper/src/index.ts` | wrapper 实现（ThrottledSearchWrapper + 串行化链 + 熔断器） |
| `search-mcp-wrapper/src/test/integration.ts` | 11 场景集成测试 |
| `search-mcp-wrapper/.gitignore` | 排除 node_modules / .npm-cache / build |
| `docs/decisions/D-2026-06-26-search-adopt-mcp-throttle-wrapper.md` | #24 决策文档（active） |
| `docs/search-orchestrator/experiments/run-14-ground-truth-sealed.md` | Run #14 GT 密封（9 gap + 5 relation） |
| `docs/search-orchestrator/experiments/run-14-run-a-output.md` | Run A 输出（自由文本，~3300 字） |
| `docs/search-orchestrator/experiments/run-14-run-b-output.md` | Run B 输出（Gap Ledger 32 项 + Final Answer，~4500 字） |

## 本会话修改文件

| 文件 | 改动 |
|------|------|
| `docs/search-orchestrator/experiments/run-14-p5-gap-ledger.md` | §5.2/§5.3 提示词补全 evidence pool 路径声明（盲态约束）+ §6 填入结果记录 + 状态行改为已完成 |
| `docs/search-orchestrator/experiments/run-14-phase0-evidence.md` | 用户在 Cline 续跑追加 §5（续跑采集 18 条 P3 evidence）+ §6（wrapper 行为日志） |
| `docs/search-orchestrator/survey.md` | §9.1 加 #24 决策行 / §9.2 加 Run #14 行 / §9.3 P5 Gap Ledger 升级 active 行 |
| `docs/mechanism-candidates.md` | #16 部分已机制化（Gap Ledger）/ #24 已机制化（wrapper） |
| `docs/decisions/README.md` | 索引表 #24 状态 proposed → active + 加验证证据 |
| `skills/search-orchestrator/SKILL.md` | §4.1 新增 Gap Ledger 章节 + 原 4.1-4.4 递增为 4.2-4.5 + §1.4.2.ter 新增 R2 降级方案 |
| `skills/search-orchestrator/references/web-search-setup.md` | 推荐配置改 wrapper（§2.1）+ 回滚配置（§2.2）+ 三层职责图 + wrapper 维护说明 |
| `docs/handoff.md` | 覆盖为本交接 |

---

## 当前路线图

权威源：

- [survey.md §9.3 最终路线状态](search-orchestrator/survey.md)
- [mechanism-candidates.md](mechanism-candidates.md)

本会话净变化：

- **P5 Gap Ledger：active**（Run #14 4/5，进入 SKILL.md §4.1）。P5 完整 Evidence Map / Claim Graph 保持 proposed，不再推进。
- **#24 搜索 MCP 反-bot 节流 wrapper：已机制化**（方案 C 落地，Run #14 功能性验证通过）。

P 级机制总览（active）：

- P1 Domain Goggles：active
- P1.5 FinalScore 联动：active
- P3 Evidence-bound Citation：active（三档模式）
- P4 Evidence Deduplication：active（逐字 + translation + summary/rewrite）
- **P5 Gap Ledger：active**（本会话新增）
- P6 Highlights / Relevance Compression：active

---

## 未完成项 / 后续动作

| 方向 | 说明 | 优先级 |
|------|------|--------|
| **项目化发布 GitHub**（下一步主任务） | 整理全部文档，写成项目提交 GitHub。需考虑：README 重写 / 文档结构梳理 / 敏感信息清理 / .gitignore 审查 / license / 仓库命名 | **高** |
| #22 Browser Fetch 启动评估 | 候选（暂缓）。仅当 Tier C snippet-only 被证明严重影响答案质量才启动 | 低 |
| #24 V2 backend 切换 | 暂缓。DDG 持续不可用时启动 | 低 |

---

## Handoff（下次会话第一句话建议）

首句话提示词：

```text
先读 docs/project-rules.md 一次，遵守里面的三份文档职责划分与五条防漂移约束。
然后读 docs/handoff.md，按下面的工作内容继续。
```

接续上下文：本会话完成两项主线收尾——① Run #14 P5 Gap Ledger 最小机制双盲验证 4/5 升级 active，Gap Detection Recall Δ=+55.6%，已写入 SKILL.md §4.1；② #24 搜索 MCP 反-bot 节流 wrapper 落地（方案 C，11/11 测试 + 子代理两轮 review + Run #14 功能性验证通过），决策文档 active。P5 完整 Evidence Map 保持 proposed 不再推进。下一步是**项目化发布 GitHub**：整理全部文档，写成项目提交。需考虑 README 重写 / 文档结构梳理 / 敏感信息清理 / .gitignore 审查 / license / 仓库命名。注意执行边界：项目发布涉及全局文档整理，TRAE agent 可直接推进（非 Cline+SKILL 职责）。
