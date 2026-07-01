# Handoff — A1/A2 完成 + F1 发现

> **生命周期**：每次覆写，无归档——会话交接文件。

## 本会话决策

| 决策 | 状态 |
|------|------|
| A1：修复 beforeModel content 类型（string → ContentBlock[]）| ✅ index.ts 两处修改 + context-snapshot 子模块提交 |
| A2：V2-A 静态审计 | ✅ tsc --noEmit 零错误，5 步骤全部通过 |
| F1 发现：compaction.ts buildCompactionSummary 同样返回 string content | ⚠️ 记录（非 A1 范围），当前受 §1.15 阻塞不会触发 |

## 本会话净变化

### 1. handoff 机制化规划盘点

梳理出 7 层规划现状：
- **术语分层**（ADR-005 已决）：context snapshot（plugin 自动）vs handoff（人工撰写）
- **写入触发**（dev-rules §2）：触发器 a（用户指令）+ c（长会话+话题跳+70% 上下文）
- **文档模板**（snapshot-writer.ts）：5 节结构，基于简单正则（v0.7.0 待升级）
- **周边机制**（mechanism-candidates）：#5 实验中、#6 候选
- **索引层**：ADR-005 已废弃 index.jsonl
- **实现状态**：v0.6.0 六项核心功能实测通过
- **规划缺口**：触发器不全 / 模板精度 / #5#6 停滞 / design.md 未标废弃（已修复）

### 2. 外部评审交互（3 轮）

| 轮次 | 内容 | 产出 |
|------|------|------|
| 第 1 轮 | 外部评审指出三大特色 + 三大隐患 + 最小一步建议 | external-review-handoff-foundation.md |
| 项目方回应 | 提出对象边界问题 + 8 个待回答问题 | response-to-external-review-handoff.md |
| 第 2 轮 | 评审反提议"单一语义对象模型 + 双投影" + Q1-Q8 逐条回答 | external-review-round2-handoff.md |

**关键结论**：评审指出 handoff.md 和 context snapshot 是同一语义对象模型的两种投影（机械投影 vs 叙事投影），应共享 ID 空间和 confidence 词汇表。项目方接受此视角，但决定正式开发时持续改进，不预生成 schema 草案。

### 3. v0.6.x 收尾

| 项目 | 变更 |
|------|------|
| [README.md](context-snapshot/README.md) | 全面重写：handoff → Context Snapshot，路径更新，version 0.5.0→0.6.0，新增 §1.15 声明 |
| [design.md](plugin/design.md) | 7 处修正：§3.3.1 模板标题、§3.3.2 index.jsonl DEPRECATED、§3.3.3 路径、§3.4 降级表、§3.5 #6 关系、Phase 3 取消、Q3 移除 |
| 目录重命名 | handoff-plugin/ → context-snapshot/，.gitmodules + 10 个文档引用更新，安装脚本修正 |
| [snapshot-extractor-design.md](plugin/snapshot-extractor-design.md) | v0.7.0 设计：SnapshotData 数据模型 + Extractor<T> 接口 + 4 提取器 + 4 阶段实施 |

### 4. Claude 深度研究 + 评审闭环

**任务书**：[cline-plus-deep-research-brief.md](plugin/cline-plus-deep-research-brief.md) — 5 任务优化方案（从"从零探查"改为"补缺整合"）

**Claude 产出 6 份**（[claude-external-review/](plugin/claude-external-review/)）：
- task-1：5 模块源码四问矩阵（Plan/Act、Subagents、Focus Chain、Memory Bank、Workflows）
- task-2：3 条绕 codec bug 降级路径
- task-3：8 组件映射表
- task-4：W1-W14 四维优先级矩阵
- task-5：L1 Plugin 层 + L2 Runtime 层两层路线图
- summary：跨任务关键发现 + 3 点核心技术结论

**3 轮子代理并行审查**（[review-closure-report.md](plugin/claude-external-review/review-closure-report.md)）：
- 审查 A（事实声明）：F7/F8 Confirmed，F4/F6 Consistent，F1-F3/F5 Unverified（4 项需源码验证）
- 审查 B（扩展路径）：P3/P4/P6 完全可行，P2/P5/P7 降级可行，P1 阻塞（采纳 V6 替代）
- 审查 C（验证路径）：V3/V5/V6 Sound，V1/V2/V4 对 codec bug 触发条件理解有误

### 5. O8 发现（本会话最重要增量）

**子代理审查 C 发现**：[index.ts:146](context-snapshot/src/index.ts#L146) beforeModel 注入的消息 content 为 **string 类型**，codec `Nd` 函数调用 `n.content.map(eK)` 必崩——**string 无 `.map()` 方法**。

**关键含义**：
- beforeModel 注入本身就是 codec bug 的触发条件，与消息数量/token 总量无关
- 原根因链（H1）仅覆盖 MCP tool_result 路径（Hypothetical），O8 补充 beforeModel 注入路径（Verified）
- V1-A（梯度阈值）和 V2-B（低 message 数）的崩溃边界假设都是错误的——崩溃边界是 content 类型维度
- 即使 codec bug 修复后，string content 仍可能导致序列化异常

**Verified 依据**（4 来源）：源码直接证据 + codec 行为（O3）+ 实测吻合（handoff §4）+ 子代理审查独立发现

### 6. 决策文档同步更新

| 文档 | 更新内容 |
|------|---------|
| [investigation-note](decisions/investigation-note-cli-codec-content-map-bug.md) | 补充 O8 + H1 升级 4 来源 + 双触发路径根因链 + D3 新增跟进项 |
| [mechanism-landing-assessment](plugin/mechanism-landing-assessment.md) | Q2 结论 + Phase 3 补充 V6 替代路径 + §5 关键结论 #4 落地路径更新 |
| [mechanism-candidates](mechanism-candidates.md) | #4 状态 → "候选（设计调整）"，说明 V6 替代实现 |
| [dev-rules §1.15](dev-rules.md) | codec bug 影响范围补充 O8 双触发路径 + Loop Guard 注入层分级 🟡→🔴 |
| [handoff.md](handoff.md) | 本文件（本次重写）|

## 产出文件

| 文件 | 变更 |
|------|------|
| `docs/plugin/external-review-handoff-foundation.md` | 🆕 第 1 轮外部评审输入 |
| `docs/plugin/response-to-external-review-handoff.md` | 🆕 项目方第 1 轮回应 |
| `docs/plugin/external-review-round2-handoff.md` | 🆕 第 2 轮评审回复 |
| `context-snapshot/README.md` | 全面重写 |
| `context-snapshot/package.json` | version 0.5.0→0.6.0 |
| `docs/plugin/design.md` | 7 处一致性修正 |
| `docs/plugin/snapshot-extractor-design.md` | 🆕 v0.7.0 提取器设计 |
| `docs/plugin/cline-plus-deep-research-brief.md` | 🆕 深度研究任务书 |
| `docs/plugin/claude-external-review/` | 🆕 6 份 Claude 产出 + 闭环报告 |
| `docs/plugin/gpt-external-review/` | 🆕 GPT 整合版 |
| `docs/decisions/investigation-note-cli-codec-content-map-bug.md` | 补充 O8 + H1 升级 |
| `docs/plugin/mechanism-landing-assessment.md` | V6 替代路径 |
| `docs/mechanism-candidates.md` | #4 状态更新 |
| `docs/dev-rules.md` | §1.15 O8 补充 |
| `.gitmodules` + 10 个文档 | 目录重命名引用更新 |
| `scripts/cleanup-and-reinstall-plugin.ps1` | 路径 + version 检查更新 |
| `docs/handoff.md` | 本文件 |

## Commits

### 本会话新增

| Hash | Repo | Message |
|------|------|---------|
| `24225e0` | context-snapshot | docs: remove directory name note after rename |
| `0b0a0fd` | context-snapshot | docs: v0.6.x cleanup - README rewrite + version bump |
| `7a0280b` | cline++ | refactor: rename handoff-plugin/ to context-snapshot/ + v0.6.x doc cleanup |
| `42125cf` | cline++ | docs: integrate Claude review closure + O8 finding (beforeModel content type Verified) |
| `51d2a32` | cline++ | docs: archive external reviews (Claude 6 files + GPT 1 file + research brief) |

## 未完成项 / 后续动作

| 方向 | 说明 | 优先级 |
|------|------|--------|
| **A1 修复 beforeModel content 类型** | ✅ 已完成。content string → ContentBlock[]，META_MARKER 检查适配 array。审计报告：[v2a-static-audit-report.md](plugin/v2a-static-audit-report.md) | ~~🔴 P0~~ ✅ |
| **A2 V2-A 静态审计** | ✅ 已完成。tsc --noEmit 零错误，5 步骤全部通过。发现 F1（compaction.ts 同类问题，非阻塞）| ~~🔴 P0~~ ✅ |
| **A5 V6 替代实现** | afterTool 检测循环 + registerRule 动态更新 rule 内容，绕过 codec bug 路径 | 🟡 P1 |
| **A3 W2 handoff.md schema 化** | 三字段（id/confidence/depends_on）升级，详见 [external-review-round2-handoff.md](plugin/external-review-round2-handoff.md) | 🟡 P1 |
| **A4 W1 v0.7.0 提取器** | 结构化提取替代简单正则，详见 [snapshot-extractor-design.md](plugin/snapshot-extractor-design.md) | 🟡 P1 |
| **提交 cline/cline issue** | codec bug issue 草稿已就绪（[draft-issue-cli-codec-content-map-bug.md](decisions/draft-issue-cli-codec-content-map-bug.md)）| 🟡 中 |
| **GitHub issue #11944 跟进** | 等作者回复 SDK 迁移时间线 | 🟡 中 |
| **补证 H2/H3** | image 分支 undefined 丢弃 + 下游连锁风险（Hypothetical，待交叉验证）| 🟢 低 |
| **监控 VS Code 扩展后续 release** | 关键词 `Plugins` / `Customize marketplace` / `registerMessageBuilder` | 🟢 低 |

## 权威源

[dev-rules.md](dev-rules.md) · [design.md](plugin/design.md) · [ADR-005](decisions/ADR-005-split-compact-from-handoff.md) · [mechanism-landing-assessment.md](plugin/mechanism-landing-assessment.md) · [investigation-note-cli-codec-content-map-bug.md](decisions/investigation-note-cli-codec-content-map-bug.md) · [review-closure-report.md](plugin/claude-external-review/review-closure-report.md) · [external-review-round2-handoff.md](plugin/external-review-round2-handoff.md)

---

## Handoff（下次会话第一句话建议）

```text
先读 docs/dev-rules.md（注意 §1.15 不可抗力门控 + O8 双触发路径）与 docs/handoff.md，按下面的工作内容继续。
```

接续上下文：v0.6.x 收尾完成（README/design.md/目录重命名/提取器设计归档）+ Claude 深度研究评审闭环完成（25 条意见全部处理，3 轮子代理审查）+ O8 Verified 发现（beforeModel 注入 content 为 string 类型，codec bug 双触发路径确认）+ 5 个决策文档同步更新（证据链一致）。本会话最大增量是 O8 发现——它修正了原 codec bug 影响范围判断（Loop Guard 注入层 🟡→🔴），并确认 V6（afterTool + registerRule）是唯一可行的替代路径。

**下次首要动作**（按优先级）：
1. **🟡 P1：A5 V6 替代实现**（afterTool + registerRule 绕过 codec bug 路径）
2. **🟡 P1：A3 W2 handoff.md schema 化**（三字段升级，详见 [external-review-round2-handoff.md](plugin/external-review-round2-handoff.md)）
3. **🟡 P1：A4 W1 v0.7.0 提取器**（详见 [snapshot-extractor-design.md](plugin/snapshot-extractor-design.md)）
4. **🟡 中：跟进已提交的 codec bug issue + GitHub issue #11944**
5. **🟡 中：F1 compaction.ts buildCompactionSummary string content 修复**（同类 bug，受 §1.15 阻塞）
6. **🟢 低：监控 VS Code 扩展后续 release**（关键词 `Plugins` / `Customize marketplace` / `registerMessageBuilder`）
