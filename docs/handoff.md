# Handoff — 经验管线设计讨论 + Handoff Plugin Phase 1 代码实现 + 推送

## 本会话决策

| 决策 | 状态 |
|------|------|
| `docs/handoff-v2-design.md` → `docs/design-handoff-plugin.md` | ✅ 已修正 |
| GPT 五层经验漏斗 → 采纳为晋升门控，DEV_NOTES 保持低阻尼入口 | ✅ 已采纳 |
| mechanism-candidates.md 状态枚举 5→7（o/p/r/d/e/m/x + k） | ✅ 已落地 |
| 新增 `k`（Killed）状态 + Gate 0.5（是否系统问题） | ✅ 已落地 |
| 退休机制：`m → x` 需 30 天验证 + 对应规则删除 | ✅ 已落地 |
| v1.0 收敛范围：Handoff Plugin + Resume + Terminal Watchdog + ADR/Probe 文档 | ✅ 已定义 |
| GPT 三层模型（Experience/Mechanism/Implementation）→ 不拆文件，单表+类型列+80条阈值 | ✅ 已达成共识 |
| Handoff Plugin 独立仓库：`github.com/zk-0808/cline-plugin-install` | ✅ 已推送 |
| Phase 1 代码：`src/index.ts` + `src/compaction.ts` + `package.json` + `tsconfig.json` | ✅ 已完成 |

## 本会话净变化

### 1. mechanism-candidates.md 状态枚举重构

状态从 5 种扩展到 8 种，新增 `k`（Killed）+ 保留原有映射：

| 简写 | 状态 | 触发条件 |
|------|------|---------|
| o | 观察中 | 首次移入表时自动标注 |
| p | 模式 | 审查时主动标注 |
| r | 规则 | 显著影响工作流 |
| d | 决策 | 有 Runtime Event 接入点（Gate 0）+ 是系统问题（Gate 0.5） |
| e | 实验中 | 有 run-N-*.md 实验计划 |
| k | 已终止 | 有明确实验结论（非前置条件变化） |
| m | 已机制化 | 双盲验证或等价实证通过 |
| x | 已退休 | 规则删除确认 + 30 天倒计时 |

### 2. design-handoff-plugin.md 完成

9 章设计文档：功能设计、触发条件、双产物 schema（handoff.md + index.jsonl）、存储路径、降级行为、与 #6 关系、Plugin 架构、实现分阶段 Plan（Phase 1~4）、Risk、Open Questions。

### 3. Handoff Plugin Phase 1 代码 + 推送

- `handoff-plugin/src/index.ts`：AgentPlugin 入口，`setup()` + `registerMessageBuilder({ name, build })`
- `handoff-plugin/src/compaction.ts`：从 custom-compaction.ts 移植的完整压缩逻辑（token 估算、阈值判定、摘要生成）
- `handoff-plugin/src/types.ts`：HandoffEntry / IndexEntry / Message 类型
- 推送到 `https://github.com/zk-0808/cline-plugin-install`（main，3ac9335→eedc141）

### 4. VS Code 扩展安装验证

- Customize 面板显示 `handoff-plugin` 已安装（路径：`installed/local/auto-handoff/`）
- `console.log` 日志未出现在 VS Code 开发者 Console 中（sandbox 子进程，日志走内部 bridge）
- `setup()` 的 `fs.writeFileSync` 写入 `~/.cline/data/handoff/` 被 sandbox 静默拦截（非流程文件路径不在白名单内）
- Plugin 确认可用方式：长对话触发 compact 后检查 `~/.cline/data/handoff/` 产物

### 5. 两轮子代理讨论

**第一轮**（2 subagent 并行）：模板分析（SE 视角）+ 可靠性工程（Dev 视角），对比项目 A 与项目 B 的治理哲学

**第二轮**（2 subagent 交换意见）：对 GPT 三层模型（Experience/Mechanism/Implementation）的交叉检验，达成"单表+类型列+80条拆文件阈值"共识

### 6. 经验矿脉图（35 条经验回顾性分类）

- **已代码化**：4（11.4%），含 #24 反-bot 节流
- **适合 Mechanism Candidate**：5（14.3%），含 terminal-watchdog
- **止于 Rule**：8（22.9%）
- **永久 C 类**：18（51.4%）——证据治理、执行主体、决策治理类

## 未完成项 / 后续动作

| 方向 | 说明 | 优先级 |
|------|------|--------|
| **Handoff Plugin 安装修复** | VS Code 扩展端 Plugin 加载后 `fs.writeFileSync` 被 sandbox 静默拦截，需在 Cline 内诊断或改 `--cwd` 参数重试 `cline plugin install` | **高** |
| **Phase 2 handoff.md 内容完善** | 从 messages 提取决策、文件改动、权威源引用 | 中 |
| **Phase 3 index.jsonl 字段补齐** | summary + key_terms + decision_count | 中 |
| **Terminal Watchdog 实现** | `tool_call_after` hook 检测超时 + 自动切兜底，v0.2.0 | 中 |
| **Resume Plugin（#6）** | `session_start` hook 读取 index.jsonl → 注入 handoff，依赖 #5 产出数据 | 低 |
| **README.md 完善** | 安装依赖声明、验证步骤、项目故事线 | 低 |
| **clone 主仓** | `e:\cline-repo`（18.22 MiB），已 clone，未做深度分析 | 低 |

## 权威源

[evidence-governance.md](evidence-governance.md)、[dev-rules.md](dev-rules.md)、[design-handoff-plugin.md](design-handoff-plugin.md)、[mechanism-candidates.md](mechanism-candidates.md)、[reviewer-personas.md](reviewer-personas.md)、[ADR-001](decisions/ADR-001-handoff-compact-memory.md)、[ADR-004](decisions/ADR-004-p5-spike-pause.md)、[project-rules-search-orchestrator.md](project-rules-search-orchestrator.md)、[handoff.md](handoff.md)、[investigation-note-probe-5.md](decisions/investigation-note-probe-5.md)、[github.com/zk-0808/cline-plugin-install](https://github.com/zk-0808/cline-plugin-install)

---

## Handoff（下次会话第一句话建议）

```text
先读 docs/dev-rules.md（注意 §1.5-§1.14 执行门控）与 docs/project-rules-search-orchestrator.md 各一次，遵守三份文档职责划分与防漂移约束。
然后读 docs/handoff.md，按下面的工作内容继续。
```

接续上下文：本会话完成 **经验管线设计 + Handoff Plugin Phase 1 代码实现 + 推送独立仓库**。mechanism-candidates.md 状态枚举重构为 7+1 态（o/p/r/d/e/m/k/x），新增 Gate 0.5 和退休 30 天倒计时。design-handoff-plugin.md 完成全部 9 章。两轮子代理讨论确认 GPT 三层模型方向但不拆文件。

**最大转折点**：GPT 建议从"完善方法论"转向"v1.0 收敛"——收缩到 Handoff Plugin + Resume + Terminal Watchdog + 文档四条故事线，作为面试项目。Plugin 代码已推送、已安装，但 VS Code 扩展端 `fs.writeFileSync` 在 sandbox 中被拦截，产物写入尚未验证。

**下次首要动作（按顺序）**：
1. 在 Cline 内诊断/修复 Plugin sandbox 写文件路径白名单问题
2. 触发一次 compact 验证 `~/.cline/data/handoff/` 是否产出产物
3. Phase 2 handoff.md 内容完善
4. README.md 完善项目故事线
