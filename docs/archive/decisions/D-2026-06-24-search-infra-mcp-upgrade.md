---
id: D-2026-06-24-search-infra-mcp-upgrade
date: 2026-06-24
topic: search-orchestrator
status: rolled-back
supersedes: []
superseded_by: []
evidence:
  - file: search/search-orchestrator/experiments/run-4-p3-evidence-bound-citation.md
    section: "fetch 成功率"
  - file: search/search-orchestrator/experiments/run-6-p3-zh-retry.md
    section: "fetch 成功率"
  - file: search/search-orchestrator/experiments/run-8a-mcp-backend.md
    section: "结果记录"
  - file: decisions/D-2026-06-24-search-adopt-p3.md
    section: "对路线图的隐含影响"
  - file: search/search-orchestrator/references/web-search-setup.md
    section: "推荐方案 / 备选方案"
---

# D-2026-06-24 — 启动 MCP 基础设施升级验证（中文 fetch 覆盖率）

## ⚠️ 状态：rolled-back（2026-06-24 当日否决）

**Run #8a 实测否决了本决策的核心假设。** 详见文末「Run #8a 验证结果」与 [experiments/run-8a-mcp-backend.md](../search/search-orchestrator/experiments/run-8a-mcp-backend.md)。

简要：将 MCP 后端切换为 Python `curl_cffi auto`（Chrome TLS 指纹模拟）后，10 个中文 URL 的 fetch 覆盖率 = **0/10**（与 Node.js 基线持平），预测 7~8/10 完全落空。原假设「TLS 指纹是中文 fetch 失败的主因」被否决。

**当前最强解释已转为**：Cloudflare JS Challenge（juejin 全部返回 "Please wait..." 假页面）+ 可能的 IP Reputation。新机制候选见 [mechanism-candidates.md](../mechanism-candidates.md) M-22 Browser-backed Fetch。

**已执行回滚动作**：MCP 配置切回 `npx duckduckgo-websearch`（Node.js），中文场景在当前 MCP 生态下永久 Tier C（snippet-only）。

---

## 决策（原文，已 rolled-back）

**待验证决策**。将中文 fetch 覆盖率低的问题分类为 **A 类（机制/基础设施问题）**，不在 SKILL/Prompt 层继续优化。启动 **Run #8a** 验证 MCP 后端切换方案。

## 一句话理由

两轮 A/B 实验（Run #4 fetch 1/5、Run #6 fetch 1/10）加上源码检查（Node.js 原生 fetch() 的 TLS 指纹无法模拟浏览器）与 upstream 能力确认（Python 版支持 `curl_cffi` Chrome TLS 指纹模拟）共同指向根因：**TLS 指纹被识别，而非 HTTP Header 不足**。此问题不在 SKILL 治理范围内。

## 实验现象到根因的推理链

```
Run #4: 中文 fetch 1/5  (≈20%)          ← 观测
Run #6: 中文 fetch 1/10 (≈10%)          ← 复现确认
        ↑
源码检查: webContentFetcher.ts 中       ← 机制检查
   headers 已模拟 Chrome 140
   底层 Node.js fetch() TLS 指纹不匹配
        ↑
upstream 确认:                            ← 社区已有方案
   Python 版 v0.4.0 
   `--fetch-backend auto`
   先用 httpx，403/Cloudflare 则 curl_cffi 重试
        ↓
假设: 中文 fetch 失败 ≈ TLS 指纹被识别
     而非 HTTP Header 不够像浏览器
        ↓
类别判定: A 类（机制/基础设施）
         不在 SKILL/Prompt 层治理
```

## 证据链

| 证据 | 说明 |
|------|------|
| Run #4（中文 query，首轮 P3）| fetch 1/5 = 20%，P3 机制本身正常 |
| Run #6（中文 query，P3 复测）| fetch 1/10 = 10%，P3 机制零误引用 |
| D-2026-06-24-search-adopt-p3 §"对路线图的隐含影响" | 首次指出中文/英文 fetch 覆盖差距是 infrastructure 层问题，非 SKILL 层 |
| webContentFetcher.ts 源码 | Headers 模拟 Chrome 140，底层为 Node.js fetch() |
| upstream README（nickclyde/duckduckgo-mcp-server v0.4.0）| `--fetch-backend curl` / `auto` 通过 curl_cffi 模拟 Chrome 131 TLS 指纹 |
| web-search-setup.md §六 | 已记录备选方案含 upstream Python 版 |

## 验证计划

### Run #8a（优先）

**单变量验证**：MCP 后端切换（Node.js fetch → Python curl_cffi auto），不混入 P3 或任何 SKILL 层改动。

| 维度 | Control | Treatment |
|------|---------|-----------|
| MCP 后端 | `npx duckduckgo-websearch`（Node.js） | `uvx "duckduckgo-mcp-server[browser]" --fetch-backend auto` |
| 测试集 | 10 中文 URL（5 事实型 + 5 分析型） | 同一份 |
| SKILL 层 | 不动 | 不动 |
| 核心指标 | fetch 覆盖率 | fetch 覆盖率 |

成功标准：

| 指标 | 当前基线 | 目标 |
|------|---------|------|
| 中文 URL fetch 成功率 | 1/10 (≈10%) | ≥ 7/10 |
| Cloudflare 保护站点成功率 | 基本失败 | 显著提升 |

### Run #8b（次级，仅在 Run #8a 通过后）

验证 snippet fallback 作为兜底路径，但定位发生根本变化：
- 原来：fallback 是主路径（fetch 10%）
- 升级后：fallback 是兜底路径（fetch 预期 ≥ 70%）

## 潜在影响

- 如 Run #8a 成功（1/10 → ≥ 7/10），此前 Run #4/Run #6 的 80%~90% Drop Rate 将被重新归因为**基础设施缺陷**，而非 P3 不适合中文场景
- P6 Highlights 的可行性也随之改变——fetch 覆盖率不再是瓶颈
- 运行时从 Node.js 切换到 Python/uv，需确保 `uvx` 可用

## 回滚动作

Run #8a 验证不通过（fetch 覆盖无显著改善）→ 退回 Node.js 版，接受中文场景永久 Tier C；再评估 P5 Output Schema 是否有独立价值。

## 共识来源

- 用户判断：归类为 A 类（机制/基础设施），不在 SKILL/Prompt 层优化
- 两轮实验一致证明 P3 机制零误引用，瓶颈在 fetch 层
- upstream 已提供原生方案，非自行造轮子

---

## Run #8a 验证结果（2026-06-24 当日补记）

### 实测数据

| 指标 | 原预测 | Run A (Node.js) 实测 | Run B (Python curl_cffi auto) 实测 |
|------|--------|--------------------|----------------------------------|
| Fetch Coverage | Treatment ≥ 7/10 | 0/10 | **0/10** |
| 假设状态 | 待验证 | — | **disproven** |

### 否决理由

1. **TLS 指纹模拟无任何提升**：curl_cffi auto 模式 0/10，与 Node.js 基线 0/10 完全一致。
2. **HTTP Success ≠ Content Success**：juejin 5 个 URL 在两轮中都返回 HTTP 200 + "Please wait..."（12/14 字符），暴露了原指标设计未区分「HTTP 层失败」与「Cloudflare JS Challenge 假页面」。
3. **12 vs 14 字符差异**佐证 Python MCP 确实被加载并运行，curl_cffi 路径生效——但**对 JS Challenge 无效**。

### 新假设接管

| 假设 | 置信度变化 |
|------|-----------|
| H1 TLS 指纹是主因 | proposed → **disproven** |
| H2 Cloudflare JS Challenge | 新增，**高置信** |
| H3 IP Reputation / Datacenter Ban | 新增，中置信 |

H2/H3 不在本决策的解决方案空间内（TLS 模拟解不了 JS Challenge），因此本决策整体 rolled-back。新路径见 `mechanism-candidates.md` M-22 Browser-backed Fetch（Playwright / Headless Chromium）。

### 回滚动作执行情况

| 动作 | 状态 |
|------|------|
| MCP `cline_mcp_settings.json` 切回 `npx duckduckgo-websearch` | ✅ 已执行 |
| 接受中文场景永久 Tier C（snippet-only） | ✅ 已写入 survey/handoff |
| 评估 P5 Output Schema 是否有独立价值 | 待 V2 路线决策 |
| 评估 M-22 Browser-backed Fetch 是否启动 | 待 V2 路线决策 |
