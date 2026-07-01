# 验证方案：绕过 Codec Bug 的替代验证路径

**文件**: `docs/plugin/deep-research-task-2-verification-paths.md`
**状态**: active
**生命周期**: 任务绑定——深度研究评审闭环后归档。
**evidence_as_of**: 2026-07-01
**背景依据**: `docs/handoff.md §4`（已实测 6 项核心功能）、`docs/decisions/investigation-note-cli-codec-content-map-bug.md`（codec bug 完整证据链）、`docs/dev-rules.md §1.15`（不可抗力约束）

---

## 前置：已验证状态（不重新验证）

根据 `handoff.md §4`，以下验证已通过，本文件**不重新验证**：

| 验证项 | 状态 |
|--------|------|
| setup() 执行 | ✅ Verified |
| messageBuilder.build() 调用 | ✅ Verified |
| compact 检测（shouldCompact）| ✅ Verified |
| rules 注入（XYZ789 标记注入 + Cline 正确回答）| ✅ Verified |
| snapshot 文件写入（workaround 验证，降阈值到 1000 tokens）| ✅ Verified（workaround 路径）|
| Loop Guard 检测层（detectRepetition，history=15，repeating=true）| ✅ Verified |

---

## 受阻塞的两项验证

### V1：真实 90K+ token 长对话触发 compact

**阻塞原因**：codec bug（`n.content.map is not a function`）在长消息序列下崩溃。详见 `investigation-note-cli-codec-content-map-bug.md`。

**当前状态**：workaround 路径已验证（降阈值到 1000 tokens），但与真实 90K+ 路径存在差异。

### V2：Loop Guard 注入层端到端

**阻塞原因**：`beforeModel` hook 返回修改后的 `messages` 触发 codec 路径，在步骤 15 后立即崩溃。

**当前状态**：检测层（detectRepetition 识别 `repeating=true, count=4`）已 Verified；注入层（`messages.push + return`）因 codec bug 无法到达。

---

## 验证方案一：V1 替代路径

### 方案 V1-A：梯度阈值验证（推荐）

**设计思路**：codec bug 的触发与消息序列**长度**和**消息中是否含 tool_result array 类型**相关。从已验证的 1000 tokens workaround 出发，梯度抬升阈值，找到崩溃边界，通过边界定位证明功能在"无 bug 干扰范围内"可用。

**可执行步骤**：

```
1. 保持 compact 阈值在已验证的 1000 tokens 基线
2. 设计一个对话场景：只使用 read_file 工具（无 MCP，避免复杂 tool_result 结构）
3. 发送文本类消息，使用 read_file 多次读取大文件（每次约 5000 tokens 输出）
4. 在 ~10000 tokens 时触发 compact，观察 snapshot 写入是否成功
5. 抬升阈值到 5000 tokens，重复步骤 3-4
6. 抬升阈值到 20000 tokens，重复（若无崩溃，继续）
7. 记录崩溃出现的阈值 X_crash
```

**退出标准**：在某个阈值 X_stable（X_stable < X_crash）下，compact 正确触发并写入 snapshot → 功能可用性 Verified at X_stable。

**局限性声明**：
- 与真实 90K+ 路径的差异：消息数量少（~20条 vs 真实场景可能 100+ 条），tool_result 结构简单
- 无法证明在 90K+ 场景下的完整可用性
- 梯度上升可能在 ~30K tokens 处仍受 codec bug 影响（codec bug 根因未修复时）
- **本方案不等同真实场景验证**

### 方案 V1-B：Mock 消息注入（降级方案）

**设计思路**：绕开 codec bug 的根本方法是避免经过 codec 路径。通过 Plugin 的 `messageBuilder` hook 在每 turn 开始时**注入一个足够大的 fake context marker**，快速填满 token 计数达到 compact 阈值，但 messages 总数保持极少（避免 codec 处理长 array）。

**可执行步骤**：

```typescript
// 在 messageBuilder 中注入大块 fake context
api.registerMessageBuilder({
    build: async (ctx) => {
        if (triggerCompactTest) {
            return [{
                role: "user",
                content: "[COMPACT_TEST_PADDING] " + "x".repeat(100000)
            }];
        }
        return [];
    }
});
```

**局限性声明**：
- **严重偏离真实路径**：真实场景中 tokens 来自对话历史，不是单条大消息
- 仅验证了 compact observer 的 token 计数逻辑，不验证序列化处理
- codec bug 的根本路径（长消息数组中的 tool_result 处理）完全未触及
- **置信度极低，不建议作为主要验证路径**

### 方案 V1-C：等待 codec bug 修复（最终路径）

**前置条件**：cline/cline codec bug issue 已提交（`draft-issue-cli-codec-content-map-bug.md`）。

**步骤**：
1. 监控 cline/cline issue 状态
2. 当官方发布修复版本（patch release）后，升级 CLI
3. 执行原始真实场景：90K+ token 对话（使用大型代码库，多次 read_file + 代码生成）
4. 记录 compact 触发时的 tokens 数、snapshot 写入时间、5 节模板完整性

**局限性声明**：取决于外部时间线（官方修复 ETA 未知）。这是唯一能完整验证真实路径的方案。

### 推荐组合

| 时间节点 | 推荐方案 | 期望结论 |
|---------|---------|---------|
| 立即 | V1-A（梯度阈值）| 功能在 X_stable 阈值下 Verified，记录边界 |
| 短期 | 继续监控 bug issue | — |
| 修复后 | V1-C（真实路径）| 升级到 Verified（真实场景） |

---

## 验证方案二：V2 替代路径（Loop Guard 注入层）

### 方案 V2-A：静态代码审计（推荐）

**设计思路**：注入层逻辑极简（`messages.push(warningMessage); return { messages }`），codec bug 是在 CLI 序列化 messages 时崩溃，而非在 Plugin 逻辑执行时崩溃。通过静态代码审计证明注入逻辑本身正确，加上已 Verified 的检测层，可以推导出"注入逻辑本身无 bug"的结论。

**可执行步骤**：

```
1. 读取 handoff-plugin/src/index.ts 的 beforeModel hook 实现
2. 验证：
   a. detectRepetition 返回 repeating=true 后，是否进入注入分支（已 Verified）
   b. messages.push 的消息格式是否符合 @cline/shared AgentMessageParam schema
   c. return { messages } 是否与 beforeModel hook 的返回类型契约一致
   d. MAX_LOOP_WARNINGS 兜底逻辑是否正确（上一轮已修复）
3. 对照 @cline/shared/dist/agent.d.ts 的 BeforeModelHookContext 定义核验返回类型
4. 在 tsc --noEmit 通过的前提下，标注为"代码逻辑 Verified，运行时路径受 codec bug 阻塞"
```

**证据文件**：
- `handoff-plugin/src/index.ts`（beforeModel 实现）
- `@cline/shared/dist/agent.d.ts`（BeforeModelHookContext 契约）

**局限性声明**：
- 静态审计**不等同**运行时端到端验证
- 无法证明注入后 Cline 模型是否真正受到警告影响（模型行为层不可静态验证）
- 中间层（CLI 消息序列化 → 发送给模型）有可能对注入消息做额外处理

### 方案 V2-B：低 message 数量场景（降级方案）

**设计思路**：codec bug 在步骤 15 后触发，意味着 Loop Guard 场景设计需要在步骤 15 之前**更早**触发重复检测。减少每次工具调用的输出体量，使重复模式在步骤 <10 时即被检测到，在 codec bug 边界之前完成注入。

**可执行步骤**：

```
1. 设计一个"极速 loop"场景：
   - 工具只调用 list_files（输出小，不触发 codec）
   - 重复模式：list_files → list_files → list_files → list_files（4次，pattern 长度满足 detectRepetition 条件）
   - 目标：在步骤 8 即达到 repeating=true（history=8，count=2+）
2. 触发 Loop Guard 注入（beforeModel 返回修改后的 messages）
3. 观察：CLI 是否崩溃？若不崩溃，注入消息是否出现在下一次 model call 的 context 中？
4. 若成功：记录为 Verified at low-message-count（并注明 codec bug 边界约束）
5. 若崩溃：记录 codec bug 在 <15 步的低体量场景下同样触发，升级为阻塞类型
```

**局限性声明**：
- 缩小了场景规模，不能代表真实 loop（真实 loop 通常在 10-20 步，工具调用有真实输出）
- 若低体量场景也崩溃，说明 codec bug 触发条件更底层（消息数量而非内容体量）

### 方案 V2-C：等待 codec bug 修复（最终路径）

同 V1-C，修复后执行原始场景 B（loop-guard-scenario-design.md v2）走完 beforeModel 返回路径。

### 推荐组合

| 时间节点 | 推荐方案 | 期望结论 |
|---------|---------|---------|
| 立即 | V2-A（静态代码审计）| 注入逻辑代码层 Verified，运行时受阻有记录 |
| 尝试 | V2-B（低 message 数量）| 若通过：运行时部分 Verified；若崩溃：升级 bug 记录 |
| 修复后 | V2-C（真实路径）| 升级到完整 Verified |

---

## 降级验证策略总结

当 codec bug 在未修复期间，两项验证的**最终状态建议**：

| 验证项 | 当前状态 | 建议最终状态（codec bug 修复前）| 依据 |
|--------|---------|-------------------------------|------|
| V1：真实 compact | Verified（workaround）| `Verified-Workaround`：功能代码正确，受外部环境限制 | V1-A 梯度验证补充边界数据 |
| V2：Loop Guard 注入层 | 检测层 Verified；注入层 Blocked | `Code-Verified`：代码逻辑经静态审计通过，运行时路径待 bug 修复后验证 | V2-A 静态审计 |

**注意**：两种降级状态均**不等同**完整的端到端 Verified。最终升级到 Verified 需要在 codec bug 修复后，在真实场景中通过 V1-C / V2-C 完成验证。

---

## 技术论证：为何注入层无法绕过 codec bug

根据 `investigation-note-cli-codec-content-map-bug.md` 的根因分析：

codec bug 触发条件：CLI 在序列化 messages 数组时，对 `content` 字段调用 `.map()`，而 `content` 可能是 `string` 类型（而非 array）→ `string.map is not a function`。

Loop Guard 的 `beforeModel` hook **必须**返回修改后的 `messages` → CLI 必须序列化这个 messages 数组 → 序列化路径与 codec bug 路径**完全重合**。

因此，**不修改 Cline 源码的前提下，Loop Guard 注入层无法绕过 codec bug**。这是技术性不可绕过，而非设计缺陷。

唯一绕过路径：
1. 修复 codec bug（官方修复或 fork 修复）
2. 将注入逻辑改为不经过 `beforeModel` 返回路径的等效实现（如通过 `rules` 注入固定警告，而非动态修改 messages——但这会损失"精确感知当前 loop 状态"的能力）

**替代实现思路**（不等同原始设计）：
- 在 `afterTool` hook 中检测到循环后，通过 `api.registerRule()` **动态更新** rule 内容（注入循环警告），在下一次 `messageBuilder` 时将警告注入 context
- 代价：延迟一个 turn，且注入的是静态警告而非实时 messages 修改
