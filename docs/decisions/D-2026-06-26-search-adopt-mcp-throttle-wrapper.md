---
id: D-2026-06-26-search-adopt-mcp-throttle-wrapper
date: 2026-06-26
topic: search-orchestrator
status: active
supersedes: []
superseded_by: []
evidence:
  - file: mechanism-candidates.md
    section: "#24 搜索 MCP 自适应反-bot 节流 / 退避"
  - file: search-orchestrator/experiments/run-14-p5-gap-ledger.md
    section: "Phase 0b DDG BOT_DETECTED 运行时故障"
  - file: search-orchestrator/experiments/run-14-phase0-evidence.md
    section: "§3 反证不足汇总 — DDG bot detection 根本原因"
  - file: skills/search-orchestrator/references/web-search-setup.md
    section: "§七 与本项目 search-orchestrator Skill 的关系"
  - file: https://github.com/HeiSir2014/duckduckgo-mcp-server/blob/main/src/duckduckgoSearcher.ts
    section: "search() 分页循环 + 3 次线性重试 + 无跨调用状态"
  - file: https://github.com/HeiSir2014/duckduckgo-mcp-server/blob/main/src/rateLimiter.ts
    section: "sliding window 限速 + 无 jitter"
  - file: https://github.com/HeiSir2014/duckduckgo-mcp-server/blob/main/src/cookieJar.ts
    section: "进程级单例 cookieJar — 被封 cookie 持续携带直到重启"
---

# D-2026-06-26 — 采纳 MCP 反-bot 节流 wrapper（方案 C：强制 max_results≤10 + 跨调用状态 + 指数退避）

## 决策

将 mechanism-candidates #24（搜索 MCP 自适应反-bot 节流/退避）落地为**薄 wrapper MCP**，包裹上游 `duckduckgo-websearch`，实现：

1. **强制 `max_results ≤ 10`**——从根上消除 vqd 翻页连击（#24 理想机制 ② 的彻底替代）
2. **跨调用状态记忆**——wrapper 实例维护 `blockedUntil` + `recentFailures`，被封后主动降速
3. **指数退避**——捕获 `BOT_DETECTED` 后 `[30s, 2min, 10min]` 重试（替代内部线性 `[1s, 2s]`）
4. **会话级熔断**——连续 N 次失败后设 `blockedUntil = now + 5min`，期间拒绝 search 调用并返回结构化错误

不在本决策范围（V2 工作）：④ 回退 lite/bing backend（需另接 Brave/Bing MCP）。

## 一句话理由

源码评估证明 `search()` 方法是黑盒，wrapper 无法干预内部分页循环；而 SKILL §1.4 的 R1/R2/R3 三路 fanout 每轮 `max_results=10`，项目从不使用 >10 的分页能力——**禁分页零损失且根治 vqd 连击**，是覆盖 #24 四点理想机制中三点（①②③）的最低成本路径。

## 三方案对比（评估结论）

| 方案 | 实现成本 | #24 覆盖 | 维护成本 | 风险 |
|------|---------|----------|----------|------|
| **A Fork 上游** | 中（~100-150 行） | ①②③④ 全覆盖 | 高（上游 21 commits behind，长期维护分支） | 低 |
| **B 薄 wrapper 不禁分页** | 低-中（~80-120 行） | ①✅ ②❌ ③⚠️ ④⚠️ | 低 | 中（vqd 连击改不了，双重重试放大延迟） |
| **C 薄 wrapper + 禁分页** ★ | **极低（~30-50 行）** | ①✅ ②✅（禁分页彻底消除） ③✅ ④⚠️（V2） | **最低** | 低 |

选 C 的核心理由：

1. **SKILL 实际使用零损失**：[SKILL.md §1.4.1](../../skills/search-orchestrator/SKILL.md) 规定 R1/R2/R3 每路 `max_results=10`，项目从不分页
2. **#24 覆盖度最高且成本最低**：禁分页比 jitter 更彻底地消除 vqd 连击
3. **立即解除 Run #14 阻塞**：1 个会话内可落地
4. **可升级路径**：C 是 A 的子集，后续需要 >10 结果或 backend 切换时升级到 A，无沉没成本

## 证据链

| 证据 | 说明 |
|------|------|
| Run #14 Phase 0b DDG `BOT_DETECTED` | Q1-R1 成功后 Q2-Q8 全链路不可用，证据池严重不达 gap 密集要求 |
| [duckduckgoSearcher.ts 源码](https://github.com/HeiSir2014/duckduckgo-mcp-server/blob/main/src/duckduckgoSearcher.ts) | `search()` 内部 `MAX_ATTEMPTS=3` + `RETRY_DELAYS=[1000,2000]` 线性重试，失败后不记忆状态；分页循环 `while (allResults.length < maxResults && nextParams)` 无延迟无 jitter |
| [rateLimiter.ts 源码](https://github.com/HeiSir2014/duckduckgo-mcp-server/blob/main/src/rateLimiter.ts) | sliding window 限速（非 token-bucket），无 jitter，并发调用同步唤醒 |
| [cookieJar.ts 源码](https://github.com/HeiSir2014/duckduckgo-mcp-server/blob/main/src/cookieJar.ts) | `export const cookieJar = new CookieJar()` 进程级单例，被封 cookie 持续携带直到重启进程 |
| [index.ts 源码](https://github.com/HeiSir2014/duckduckgo-mcp-server/blob/main/src/index.ts) | `export { DuckDuckGoSearcher as WebSearch }` —— library export 已就绪，wrapper 可直接 import |
| SKILL.md §1.4.1 | R1/R2/R3 三路 fanout 每路 max_results=10，禁分页零损失 |
| web-search-setup.md §七 | 两层职责分离：Skill 层（方法论）/ MCP 层（实现）；wrapper 属 MCP 层，Skill 层不动 |

## 推理链

```
Run #14 Phase 0b: DDG BOT_DETECTED 触发
        ↓
根因分析（handoff #24）:
   vqd 翻页连击放大 + 同 IP 高频 → 越过 DDG 反爬阈值
        ↓
源码验证:
   ① search() 内部分页循环无 jitter（vqd 连击根因）
   ② 3 次线性重试，失败后不记忆状态（无跨调用降速）
   ③ cookieJar 单例，被封 cookie 持续携带
   ④ search() 是黑盒，外部无法干预内部重试/分页
        ↓
方案筛选:
   A Fork: 能改内部但维护成本高
   B Wrapper 不禁分页: vqd 连击改不了（② 缺失）
   C Wrapper + 禁分页: ② 通过禁分页彻底消除，且 SKILL 实际使用零损失
        ↓
判定: 方案 C
   覆盖 #24 ①②③，成本最低，立即解除阻塞
   ④ backend 切换留 V2
```

## 实现规格（已落地于 search-mcp-wrapper/，11/11 集成测试通过，子代理两轮 code review 通过）

### 文件结构

```
search-mcp-wrapper/
├── package.json          # 依赖 duckduckgo-websearch + @modelcontextprotocol/sdk
├── src/
│   └── index.ts          # wrapper MCP server（~50 行）
└── README.md             # 配置说明
```

### wrapper 行为规约（已实现，对应 search-mcp-wrapper/src/index.ts）

```typescript
// 实际实现（已落地）
class ThrottledSearchWrapper {
  private static readonly MAX_RESULTS_CAP = 10;
  private static readonly BACKOFF_DELAYS = [30_000, 120_000, 600_000]; // 30s, 2min, 10min
  private static readonly FAILURE_THRESHOLD = 3;
  private static readonly FAILURE_WINDOW_MS = 3600_000;

  private recentFailures: Date[] = [];      // 1h 滑动窗口
  private blockedUntil: Date | null = null;
  private circuitBreakCount = 0;            // 熔断次数（指数退避递增，成功清零）
  private chain: Promise<void> = Promise.resolve();  // 串行化链（防并发穿透）

  // search 串行化排队 → _searchImpl（避免并发请求同时穿透熔断检查）
  async search(query, maxResults = 10) { /* 排到 chain */ }

  private async _searchImpl(query, maxResults) {
    // 1. 熔断检查
    if (this.blockedUntil && now < this.blockedUntil) {
      throw new SearchError(`Circuit open: blocked until ${this.blockedUntil}`, 'CIRCUIT_OPEN');
    }
    // 2. 强制 cap
    const capped = Math.min(maxResults, MAX_RESULTS_CAP);
    // 3. 调用上游（内部已有 3 次重试）
    try {
      const results = await upstream.search(query, { maxResults: capped });
      // 成功 → 完全恢复
      this.recentFailures = [];
      this.blockedUntil = null;
      this.circuitBreakCount = 0;
      return results;
    } catch (e) {
      if (e.code === 'BOT_DETECTED') this.recordFailure();
      throw e;  // 不做同步重试（避免双重重试放大延迟）
    }
  }

  private recordFailure() {
    this.recentFailures.push(now);
    this.recentFailures = this.recentFailures.filter(t => now - t < FAILURE_WINDOW_MS);
    if (this.recentFailures.length < FAILURE_THRESHOLD) return;  // 未达阈值不熔断
    // 触发熔断：清空 recentFailures + circuitBreakCount++（指数退避）
    this.recentFailures = [];
    this.circuitBreakCount++;
    const idx = Math.min(this.circuitBreakCount - 1, BACKOFF_DELAYS.length - 1);
    this.blockedUntil = now + BACKOFF_DELAYS[idx];
  }
}
```

**设计修正说明（相对初版伪代码）**：初版伪代码"3 次失败 → 5min 熔断"与 §决策第 3 点"指数退避 [30s,2min,10min]"表述差异。实现整合为：3 次失败触发熔断（符合伪代码阈值），熔断时长按 circuitBreakCount 指数递增 30s/2min/10min（符合 §决策第 3 点），熔断后清空 recentFailures + circuitBreakCount++，成功清空所有状态。

### MCP 配置切换

```json
{
  "mcpServers": {
    "duckduckgo": {
      "autoApprove": ["search"],
      "disabled": false,
      "timeout": 60,
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/search-mcp-wrapper/build/index.js"]
    }
  }
}
```

## 验证计划

### 集成测试（功能性）

| 场景 | 预期行为 | 通过条件 |
|------|----------|----------|
| 正常 search（max_results=10） | 返回 ≤10 条结果 | 与直连 npx 行为一致 |
| max_results=50 | wrapper cap 到 10，不分页 | 返回 ≤10 条，无 vqd 翻页请求 |
| 连续 3 次 BOT_DETECTED | 第 3 次后设 blockedUntil | 第 4 次调用立即抛 CIRCUIT_OPEN |
| 熔断期间调用 | 立即抛 CIRCUIT_OPEN，不发起 HTTP | 错误信息含 blockedUntil 时间 |
| 熔断过期后调用 | 正常发起 search | 行为恢复正常 |

### Run #14 Phase 0b 续跑（功能性验证）

wrapper 落地后，用于 Run #14 Phase 0b 续跑。若能完成 Q2-Q8 采集且不再触发全链路阻塞，视为功能性通过。

### 验证结果（2026-06-26）

| 验证项 | 结果 | 证据 |
|--------|------|------|
| 集成测试 5 场景 | ✅ 11/11 通过 | `npm test`（test/integration.ts）|
| 子代理 code review | ✅ 两轮通过 | 第一轮发现 2 严重问题（N=2 早熔断 vs 决策文档 3 次阈值），修正后复审 0 严重 0 建议 |
| Run #14 Phase 0b 功能性 | ✅ 通过 | 3 次熔断正确触发指数退避（30s/2min/10min），fetch_content 独立通道不受影响，降级规约正确执行 |
| 暴露的上游特性（非 wrapper bug） | ⚠️ 记录 | DDG 后端对 `site:` 100% 触发 BOT_DETECTED、`OR` 部分触发、单引号最稳定——需 SKILL 层调整 R2 策略（不用 `site:`），非 wrapper 职责 |

## 潜在影响

- **解除 Run #14 阻塞**：Phase 0b 续跑不再依赖人工节流 workaround
- **#24 状态升级**：候选 → 已机制化（Run #14 功能性验证通过）
- **SKILL 层零改动**：[SKILL.md](../../skills/search-orchestrator/SKILL.md) 不动，符合 web-search-setup.md §七 两层职责分离
- **web-search-setup.md 更新**：推荐配置已从 `npx -y duckduckgo-websearch` 改为 wrapper 路径
- **不影响 #22 Browser Fetch**：#22 是 fetch 层反爬，#24 是 search 层反爬，正交

## 回滚动作

若 wrapper 引入新问题（如 cap 误伤、熔断误触发）：

1. MCP 配置切回 `npx -y duckduckgo-websearch` 直连
2. #24 回退到「候选」
3. 本决策 status 改为 `rolled-back`
4. Run #14 Phase 0b 回退到人工节流 workaround

## 共识来源

- 用户判断：方案 C（薄 wrapper + 禁分页），先写决策文档再实现
- 源码评估证明 search() 黑盒 + SKILL 实际使用 max_results=10，禁分页零损失
- 与 #21 同理：确定性运行时节流应交给代码而非提示词

## 与现有决策的关系

- **不 supersede 任何决策**：D-2026-06-24-search-infra-mcp-upgrade（rolled-back）是 fetch 层 TLS 指纹问题，本决策是 search 层反爬节流，正交
- **不 supersede #22 Browser Fetch**：#22 是 fetch 层 JS Challenge，本决策是 search 层 bot detection，正交
- **对应 mechanism-candidates #24**：已机制化（方案 C 落地于 search-mcp-wrapper/，Run #14 Phase 0b 功能性验证通过：3 次熔断正确触发指数退避，fetch 独立通道不受影响）
